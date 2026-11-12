import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

// 실제 검사기 코드를 불러와 테스트합니다.
// server-only 제한은 테스트 환경에서만 제거합니다.
const original = readFileSync(
  new URL("../lib/validateApkg.ts", import.meta.url),
  "utf8"
);

const source = original.replace(
  /^import\s+["']server-only["'];?\s*$/m,
  ""
);

assert.notEqual(
  source,
  original,
  "server-only import를 찾지 못했습니다."
);

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
}).outputText;

const { validateApkg } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

// ZIP 파일의 CRC32 계산
function crc32(bytes) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc ^= byte;

    for (let i = 0; i < 8; i++) {
      crc = (crc >>> 1) ^
        ((crc & 1) ? 0xedb88320 : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

// 테스트용 ZIP 파일 생성
function makeZip(files) {
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  for (const [filename, raw] of files) {
    const name = Buffer.from(filename, "utf8");

    const contents = Buffer.isBuffer(raw)
      ? raw
      : Buffer.from(raw, "utf8");

    const checksum = crc32(contents);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(contents.length, 18);
    local.writeUInt32LE(contents.length, 22);
    local.writeUInt16LE(name.length, 26);

    localParts.push(local, name, contents);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(contents.length, 20);
    central.writeUInt32LE(contents.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(localOffset, 42);

    centralParts.push(central, name);

    localOffset +=
      local.length + name.length + contents.length;
  }

  const centralData = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);

  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralData.length, 12);
  end.writeUInt32LE(localOffset, 16);

  return Buffer.concat([
    ...localParts,
    centralData,
    end,
  ]);
}

const standard = () => makeZip([
  ["collection.anki2", Buffer.from("SQLite format 3\0")],
  ["media", "{}"],
]);

function expectedReject(
  bytes,
  fileName = "test.apkg"
) {
  assert.equal(
    validateApkg(bytes, fileName).valid,
    false
  );
}

test("구형 덱 ZIP 구조 통과", () => {
  assert.deepEqual(
    validateApkg(standard(), "test.apkg"),
    {
      valid: true,
      format: "legacy",
      fileCount: 2,
    }
  );
});

test("최신 덱 ZIP 구조 통과", () => {
  const modern = makeZip([
    ["collection.anki21b", "example"],
    ["media", "{}"],
  ]);

  assert.deepEqual(
    validateApkg(modern, "test.apkg"),
    {
      valid: true,
      format: "modern",
      fileCount: 2,
    }
  );
});

test(".apkg가 아닌 확장자 거부", () => {
  expectedReject(standard(), "test.zip");
});

test("ZIP이 아닌 가짜 파일 거부", () => {
  expectedReject(Buffer.alloc(100, 0x41));
});

test("ZIP 끝부분 손상 거부", () => {
  const damaged = Buffer.from(standard());

  damaged.writeUInt32LE(
    0,
    damaged.length - 22
  );

  expectedReject(damaged);
});

test("media 항목 없는 ZIP 거부", () => {
  expectedReject(
    makeZip([
      ["collection.anki2", "SQLite format 3"],
    ])
  );
});

test("상위 폴더 경로 포함 ZIP 거부", () => {
  expectedReject(
    makeZip([
      ["../collection.anki2", "example"],
      ["media", "{}"],
    ])
  );
});

test("중복된 파일명 거부", () => {
  expectedReject(
    makeZip([
      ["collection.anki2", "example"],
      ["media", "{}"],
      ["media", "{}"],
    ])
  );
});

test("비정상적인 압축 크기 거부", () => {
  const altered = Buffer.from(standard());

  const end = altered.length - 22;
  const centralOffset =
    altered.readUInt32LE(end + 16);

  altered.writeUInt32LE(
    301 * 1024 * 1024,
    centralOffset + 24
  );

  expectedReject(altered);
});

// 실제 데이터 무결성 및 악성 파일 검사는
// 후속 단계에서 추가할 예정입니다.
//
// 실제 MyAnki 테스트 덱 검사
//

const realApkg = readFileSync(
  new URL(
    "./myanki_english_test_10%20(1).apkg",
    import.meta.url
  )
);

test("실제 MyAnki 영단어 덱 통과", () => {
  const result = validateApkg(
    realApkg,
    "myanki_english_test_10 (1).apkg"
  );

  assert.deepEqual(result, {
    valid: true,
    format: "legacy",
    fileCount: 2,
  });
});

test("실제 덱의 ZIP 끝부분 손상 거부", () => {
  const damaged = Buffer.from(realApkg);

  damaged.writeUInt32LE(
    0,
    damaged.length - 22
  );

  expectedReject(
    damaged,
    "myanki_english_test_10 (1).apkg"
  );
});
//
// ZIP 내부 데이터 무결성 테스트
//

test("ZIP 내부 데이터 변조 거부", () => {
  const damaged = Buffer.from(standard());

  // media 파일의 실제 데이터 위치 찾기
  const mediaDataPosition = damaged.indexOf(
    Buffer.from("{}")
  );

  assert.notEqual(
    mediaDataPosition,
    -1,
    "테스트용 media 데이터를 찾을 수 없습니다."
  );

  // ZIP 헤더는 유지하고 실제 데이터만 변경
  damaged[mediaDataPosition] ^= 0x01;

  // CRC32가 일치하지 않으므로 거부해야 함
  expectedReject(damaged);
});
