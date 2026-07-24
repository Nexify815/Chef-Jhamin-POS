export default function DataTable({ columns, data, emptyMessage = 'No data available.' }) {
  return (
    <div className="glass-card overflow-x-auto border border-white/[0.06]">
      <table className="data-table w-full">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`text-xs uppercase tracking-wider text-teal font-medium px-4 py-3 ${col.align === 'right' ? 'text-right' : 'text-left'} ${col.className || ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center text-gray-500 py-12 text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={row.id || i} className="border-t border-white/[0.04] hover:bg-teal/[0.03] transition-colors">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm text-gray-300 ${col.align === 'right' ? 'text-right' : 'text-left'} ${col.className || ''}`}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
