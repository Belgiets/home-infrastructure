"use client";

import { useState, useEffect } from "react";

interface DateFilterProps {
  startDate: string;
  endDate: string;
  onFilter: (startDate: string, endDate: string) => void;
  onClear: () => void;
}

export function DateFilter({
  startDate,
  endDate,
  onFilter,
  onClear,
}: DateFilterProps) {
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);

  // Sync local state with props
  useEffect(() => {
    setLocalStartDate(startDate);
    setLocalEndDate(endDate);
  }, [startDate, endDate]);

  const handleApply = () => {
    onFilter(localStartDate, localEndDate);
  };

  const handleClear = () => {
    setLocalStartDate("");
    setLocalEndDate("");
    onClear();
  };

  // Quick filter presets
  const setToday = () => {
    const today = new Date().toISOString().split("T")[0];
    setLocalStartDate(today);
    setLocalEndDate(today);
    onFilter(today, today);
  };

  const setThisWeek = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const start = startOfWeek.toISOString().split("T")[0];
    const end = now.toISOString().split("T")[0];
    setLocalStartDate(start);
    setLocalEndDate(end);
    onFilter(start, end);
  };

  const setThisMonth = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const start = startOfMonth.toISOString().split("T")[0];
    const end = now.toISOString().split("T")[0];
    setLocalStartDate(start);
    setLocalEndDate(end);
    onFilter(start, end);
  };

  return (
    <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-4">
        {/* Date Inputs */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Start Date
          </label>
          <input
            type="date"
            value={localStartDate}
            onChange={(e) => setLocalStartDate(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            End Date
          </label>
          <input
            type="date"
            value={localEndDate}
            onChange={(e) => setLocalEndDate(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Action Buttons */}
        <button
          onClick={handleApply}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Apply
        </button>

        {(startDate || endDate) && (
          <button
            onClick={handleClear}
            className="rounded bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
          >
            Clear
          </button>
        )}

        {/* Quick Presets */}
        <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
          <span className="text-sm text-gray-500">Quick:</span>
          <button
            onClick={setToday}
            className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
          >
            Today
          </button>
          <button
            onClick={setThisWeek}
            className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
          >
            This Week
          </button>
          <button
            onClick={setThisMonth}
            className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
          >
            This Month
          </button>
        </div>
      </div>
    </div>
  );
}
