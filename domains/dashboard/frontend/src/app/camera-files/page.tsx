"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, type CameraFile, type CameraFilesResponse } from "@/lib/api";
import { ImageCard } from "@/components/ImageCard";
import { Lightbox } from "@/components/Lightbox";
import { Pagination } from "@/components/Pagination";
import { DateFilter } from "@/components/DateFilter";

const ITEMS_PER_PAGE = 20;

export default function CameraFilesPage() {
  const router = useRouter();
  const [files, setFiles] = useState<CameraFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFiles, setTotalFiles] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedFile, setSelectedFile] = useState<CameraFile | null>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response: CameraFilesResponse = await api.cameraFiles.list({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        dateFrom: startDate || undefined,
        dateTo: endDate || undefined,
      });

      setFiles(response.data);
      setTotalPages(response.totalPages);
      setTotalFiles(response.total);
    } catch (err) {
      if (err instanceof Error && err.message === "Unauthorized") {
        router.push("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load camera files");
    } finally {
      setLoading(false);
    }
  }, [currentPage, startDate, endDate, router]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDateFilter = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleClearFilter = () => {
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/")}
                className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Back to dashboard"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Camera Files Gallery
                </h1>
                <p className="text-sm text-gray-500">
                  {totalFiles.toLocaleString()} files total
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Date Filter */}
        <DateFilter
          startDate={startDate}
          endDate={endDate}
          onFilter={handleDateFilter}
          onClear={handleClearFilter}
        />

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="rounded-lg bg-red-50 p-6 text-center">
            <svg
              className="mx-auto h-12 w-12 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-red-800">
              Error loading files
            </h3>
            <p className="mt-2 text-red-600">{error}</p>
            <button
              onClick={fetchFiles}
              className="mt-4 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && files.length === 0 && (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm">
            <svg
              className="mx-auto h-16 w-16 text-gray-300"
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
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No files found
            </h3>
            <p className="mt-2 text-gray-500">
              {startDate || endDate
                ? "No files match your date filter. Try adjusting the date range."
                : "No camera files have been uploaded yet."}
            </p>
            {(startDate || endDate) && (
              <button
                onClick={handleClearFilter}
                className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Clear Filter
              </button>
            )}
          </div>
        )}

        {/* Image Grid */}
        {!loading && !error && files.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {files.map((file) => (
                <ImageCard
                  key={file.id}
                  file={file}
                  onClick={() => setSelectedFile(file)}
                />
              ))}
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </main>

      {/* Lightbox Modal */}
      {selectedFile && (
        <Lightbox file={selectedFile} onClose={() => setSelectedFile(null)} />
      )}
    </div>
  );
}
