export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <i className="fas fa-chevron-left" />
      </button>

      {start > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            1
          </button>
          {start > 2 && <span className="text-gray-500 text-xs">...</span>}
        </>
      )}

      {pages.map(p => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            p === page
              ? 'bg-[var(--teal)] text-white border-none'
              : 'btn-secondary'
          }`}
        >
          {p}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="text-gray-500 text-xs">...</span>}
          <button
            onClick={() => onPageChange(totalPages)}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <i className="fas fa-chevron-right" />
      </button>
    </div>
  );
}
