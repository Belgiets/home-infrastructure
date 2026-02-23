"use client";

import { useEffect, useCallback, useState } from "react";
import type { CameraFile } from "@/lib/api";

interface LightboxProps {
  file: CameraFile;
  onClose: () => void;
}

export function Lightbox({ file, onClose }: LightboxProps) {
  const [imageLoading, setImageLoading] = useState(true);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const uploadDate = new Date(file.uploadedAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
        aria-label="Close lightbox"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Image Container */}
      <div
        className="flex max-h-[90vh] max-w-[90vw] flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading Spinner */}
        {imageLoading && (
          <div className="absolute flex items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent" />
          </div>
        )}

        <img
          src={file.imageUrl}
          alt={file.fileName}
          className={`max-h-[80vh] object-contain transition-opacity ${
            imageLoading ? "opacity-0" : "opacity-100"
          }`}
          onLoad={() => setImageLoading(false)}
        />

        {/* Metadata */}
        <div className="mt-4 text-center text-white">
          <p className="text-lg font-medium">{file.fileName}</p>
          <p className="text-sm text-gray-300">{uploadDate}</p>
        </div>
      </div>
    </div>
  );
}
