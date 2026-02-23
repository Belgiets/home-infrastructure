"use client";

import { useState } from "react";
import type { CameraFile } from "@/lib/api";

interface ImageCardProps {
  file: CameraFile;
  onClick: () => void;
}

export function ImageCard({ file, onClick }: ImageCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const uploadDate = new Date(file.uploadedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-lg bg-white shadow-md transition-shadow hover:shadow-lg"
    >
      {/* Image Container */}
      <div className="relative aspect-video bg-gray-200">
        {imageLoading && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        )}

        {imageError ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <svg
              className="h-12 w-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        ) : (
          <img
            src={file.imageUrl}
            alt={file.fileName}
            className={`h-full w-full object-cover transition-all duration-200 group-hover:scale-105 ${
              imageLoading ? "opacity-0" : "opacity-100"
            }`}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
            loading="lazy"
          />
        )}
      </div>

      {/* File Info */}
      <div className="p-3">
        <p
          className="truncate text-sm font-medium text-gray-900"
          title={file.fileName}
        >
          {file.fileName}
        </p>
        <p className="text-xs text-gray-500">{uploadDate}</p>
      </div>
    </div>
  );
}
