import { inflateRawSync } from "node:zlib";
import "server-only";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_UNCOMPRESSED_SIZE = 300 * 1024 * 1024;
const MAX_ENTRIES = 10000;

export type ApkgValidationResult =
  | {
      valid: true;
      format: "legacy" | "modern";
      fileCount: number;
    }
  | {
      valid: false;
      reason: string;
    };

function reject(reason: string): ApkgValidationResult {
  return { valid: false, reason };
}
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;

  for (const byte of data) {
    crc ^= byte;

    for (let i = 0; i < 8; i++) {
      crc =
        (crc >>> 1) ^
        ((crc & 1) !== 0 ? 0xedb88320 : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}
export function validateApkg(
  bytes: Buffer,
  fileName: string
): ApkgValidationResult {
  if (
    !fileName.toLowerCase().endsWith(".apkg") ||
    fileName.toLowerCase() === "collection.apkg"
  ) {
    return reject("안키 덱(.apkg) 파일을 선택해 주세요.");
  }

  if (bytes.length < 22 || bytes.length > MAX_FILE_SIZE) {
    return reject("파일 크기가 올바르지 않습니다. 최대 50MB입니다.");
  }

  // 일반 ZIP 파일의 시작 부분 확인
  if (bytes.readUInt32LE(0) !== 0x04034b50) {
    return reject("올바른 ZIP 형식이 아닙니다.");
  }

  // ZIP 끝부분의 중앙 디렉터리 위치 찾기
  let end = -1;
  const start = Math.max(0, bytes.length - 22 - 65535);

  for (let i = bytes.length - 22; i >= start; i--) {
    if (
      bytes.readUInt32LE(i) === 0x06054b50 &&
      i + 22 + bytes.readUInt16LE(i + 20) === bytes.length
    ) {
      end = i;
      break;
    }
  }

  if (end === -1) {
    return reject("ZIP 파일의 끝부분이 손상되었습니다.");
  }

  // 분할 ZIP 파일은 허용하지 않음
  if (
    bytes.readUInt16LE(end + 4) !== 0 ||
    bytes.readUInt16LE(end + 6) !== 0
  ) {
    return reject("분할 ZIP 파일은 지원하지 않습니다.");
  }

  const diskCount = bytes.readUInt16LE(end + 8);
  const fileCount = bytes.readUInt16LE(end + 10);
  const directorySize = bytes.readUInt32LE(end + 12);
  const directoryOffset = bytes.readUInt32LE(end + 16);

  if (
    diskCount !== fileCount ||
    fileCount === 0 ||
    fileCount > MAX_ENTRIES ||
    fileCount === 0xffff ||
    directorySize === 0xffffffff ||
    directoryOffset === 0xffffffff
  ) {
    return reject("지원하지 않는 ZIP 구조입니다.");
  }

  if (directoryOffset + directorySize !== end) {
    return reject("ZIP 디렉터리 정보가 올바르지 않습니다.");
  }

  let position = directoryOffset;
  let totalUncompressed = 0;

  const names = new Set<string>();
  const sizes = new Map<string, number>();

  for (let i = 0; i < fileCount; i++) {
    if (
      position + 46 > end ||
      bytes.readUInt32LE(position) !== 0x02014b50
    ) {
      return reject("ZIP 파일 목록이 손상되었습니다.");
    }

    const flags = bytes.readUInt16LE(position + 8);
    const method = bytes.readUInt16LE(position + 10);
    const compressed = bytes.readUInt32LE(position + 20);
    const uncompressed = bytes.readUInt32LE(position + 24);
    const nameLength = bytes.readUInt16LE(position + 28);
    const extraLength = bytes.readUInt16LE(position + 30);
    const commentLength = bytes.readUInt16LE(position + 32);
    const localOffset = bytes.readUInt32LE(position + 42);

    const next =
      position + 46 + nameLength + extraLength + commentLength;

    if (next > end || nameLength === 0) {
      return reject("ZIP 파일 목록이 올바르지 않습니다.");
    }

    const name = bytes
      .subarray(position + 46, position + 46 + nameLength)
      .toString("utf8");

    // Anki 덱은 ZIP 내부 루트에 파일을 보관함
    if (
      name.includes("/") ||
      name.includes("\\") ||
      name.includes("\0") ||
      names.has(name)
    ) {
      return reject("ZIP 내부 파일 경로가 허용되지 않습니다.");
    }

    if ((flags & 1) !== 0 || (method !== 0 && method !== 8)) {
      return reject("암호화 또는 지원하지 않는 압축 방식입니다.");
    }

    if (
      uncompressed === 0xffffffff ||
      compressed === 0xffffffff ||
      (uncompressed > 0 && compressed === 0) ||
      (compressed > 0 && uncompressed / compressed > 1000)
    ) {
      return reject("비정상적인 압축 크기가 발견되었습니다.");
    }

    totalUncompressed += uncompressed;

    if (totalUncompressed > MAX_UNCOMPRESSED_SIZE) {
      return reject("압축 해제 예상 크기가 너무 큽니다.");
    }

    // 각 파일의 실제 ZIP 헤더 위치 확인
    if (
      localOffset + 30 > directoryOffset ||
      bytes.readUInt32LE(localOffset) !== 0x04034b50
    ) {
      return reject("ZIP 파일 헤더가 손상되었습니다.");
    }

    const localNameLength = bytes.readUInt16LE(localOffset + 26);
    const localExtraLength = bytes.readUInt16LE(localOffset + 28);

    const dataStart =
      localOffset + 30 + localNameLength + localExtraLength;

    if (
      dataStart + compressed > directoryOffset ||
      bytes.readUInt16LE(localOffset + 8) !== method
    ) {
      return reject("ZIP 파일 내용이 올바르지 않습니다.");
    }

    const localName = bytes
      .subarray(localOffset + 30, localOffset + 30 + localNameLength)
      .toString("utf8");

    if (localName !== name) {
      return reject("ZIP 내부 파일명이 일치하지 않습니다.");
    }
   // 압축 데이터를 실제로 해제하고 CRC32 검사
    const expectedCrc = bytes.readUInt32LE(position + 16);

    const compressedData = bytes.subarray(
      dataStart,
      dataStart + compressed
    );

    let actualData: Buffer;

    try {
      if (method === 0) {
        if (compressed !== uncompressed) {
          return reject("ZIP 파일 크기가 일치하지 않습니다.");
        }

        actualData = compressedData;
      } else {
        actualData = inflateRawSync(compressedData, {
          maxOutputLength: uncompressed + 1,
        });
      }
    } catch {
      return reject("ZIP 압축 데이터가 손상되었습니다.");
    }

    if (
      actualData.length !== uncompressed ||
      crc32(actualData) !== expectedCrc
    ) {
      return reject("ZIP 데이터 무결성 검사에 실패했습니다.");
    }
    names.add(name);
    sizes.set(name, uncompressed);
    position = next;
  }

  if (position !== end) {
    return reject("ZIP 파일 목록의 크기가 일치하지 않습니다.");
  }

  // 구형 및 최신 Anki 데이터 파일 지원
  const collectionNames = [
    "collection.anki21b",
    "collection.anki21",
    "collection.anki2",
  ];

  const collection = collectionNames.find(
    (name) => names.has(name) && (sizes.get(name) ?? 0) > 0
  );

  if (!collection || !names.has("media")) {
    return reject("Anki 덱에 필요한 데이터 파일이 없습니다.");
  }

  return {
    valid: true,
    format: collection === "collection.anki21b" ? "modern" : "legacy",
    fileCount,
  };
}
