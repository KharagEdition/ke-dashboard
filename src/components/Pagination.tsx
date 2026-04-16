import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Pagination } from "../lib/types";

interface PaginationProps {
  pagination: Pagination;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export default function PaginationBar({
  pagination,
  onPageChange,
  loading = false,
}: PaginationProps) {
  const { currentPage, totalPages, totalUsers, usersPerPage } = pagination;

  const start = (currentPage - 1) * usersPerPage + 1;
  const end = Math.min(currentPage * usersPerPage, totalUsers);

  const getPageNumbers = (): number[] => {
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
      <p className="text-sm text-gray-500">
        Showing <span className="font-medium text-gray-900">{start}–{end}</span> of{" "}
        <span className="font-medium text-gray-900">{totalUsers.toLocaleString()}</span>
      </p>

      <nav className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!pagination.hasPrevPage || loading}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {getPageNumbers().map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            disabled={loading}
            className={`min-w-[32px] h-8 px-2 text-sm rounded-md font-medium transition-colors ${
              page === currentPage
                ? "bg-indigo-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            } disabled:cursor-not-allowed`}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!pagination.hasNextPage || loading}
          className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}
