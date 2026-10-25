"use client";

import { useState } from "react";

type PreviewSliderProps = {
  images: string[];
  title?: string;
};

export default function PreviewSlider({
  images,
  title = "덱",
}: PreviewSliderProps) {
  const [index, setIndex] = useState(0);
  const slides = images.filter(Boolean).slice(0, 5);

  if (slides.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-500">
        등록된 미리보기 이미지가 아직 없어요.
      </div>
    );
  }

  const currentIndex = Math.min(index, slides.length - 1);

  const previous = () => {
    setIndex(Math.max(0, currentIndex - 1));
  };

  const next = () => {
    setIndex(Math.min(slides.length - 1, currentIndex + 1));
  };

  return (
    <div className="mt-4">
      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
        <img
          src={slides[currentIndex]}
          alt={`${title} 미리보기 ${currentIndex + 1}`}
          className="h-64 w-full object-contain sm:h-96"
          loading="lazy"
        />

        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={previous}
              disabled={currentIndex === 0}
              aria-label="이전 이미지"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-xl shadow disabled:opacity-30"
            >
              &#10094;
            </button>

            <button
              type="button"
              onClick={next}
              disabled={currentIndex === slides.length - 1}
              aria-label="다음 이미지"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-xl shadow disabled:opacity-30"
            >
              &#10095;
            </button>
          </>
        )}
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`미리보기 ${i + 1}번 보기`}
            aria-current={currentIndex === i ? "true" : undefined}
            className={`h-2.5 w-2.5 rounded-full ${
              currentIndex === i ? "bg-blue-600" : "bg-gray-300"
            }`}
          />
        ))}
      </div>

      <p className="mt-2 text-center text-xs text-gray-500">
        {currentIndex + 1} / {slides.length}
      </p>
    </div>
  );
}
