interface TablePaginationProps {
  page: number
  pages: number
  total: number
  onPageChange: (page: number) => void
}

export function TablePagination({ page, pages, total, onPageChange }: TablePaginationProps) {
  if (pages <= 1) {
    return <p className="text-xs text-gray-500">Total records: {total}</p>
  }

  return (
    <div className="flex items-center justify-between border-t bg-white px-4 py-3">
      <p className="text-xs text-gray-500">
        Page {page} of {pages} • {total} records
      </p>
      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-md border px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-md border px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}
