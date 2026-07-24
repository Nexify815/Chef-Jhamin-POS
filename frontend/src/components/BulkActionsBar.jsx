import { useState, useEffect } from 'react';
import { useModal } from './Modal';

export default function BulkActionsBar({ count, onClear, onDelete, label = 'items' }) {
  const { showConfirm } = useModal();
  const [deleting, setDeleting] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (count > 0) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [count]);

  if (!visible && count === 0) return null;

  const handleDelete = () => {
    showConfirm('Delete Selected', `Delete ${count} ${label}? This cannot be undone.`, async () => {
      setDeleting(true);
      try {
        await onDelete();
      } finally {
        setDeleting(false);
      }
    });
  };

  return (
    <div className="bulk-actions-bar anim-slide-down">
      <div className="flex items-center gap-3">
        <span className="w-7 h-7 rounded-lg bg-teal/20 flex items-center justify-center text-teal text-xs font-bold">
          {count}
        </span>
        <span className="text-sm text-gray-300">
          {count} {label} selected
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onClear} className="text-xs px-3 py-1.5 rounded-lg border border-white/[0.1] text-gray-400 hover:text-white hover:bg-white/[0.05] transition-all cursor-pointer">
          Clear
        </button>
        <button onClick={handleDelete} disabled={deleting} className="text-xs px-4 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 hover:text-red-300 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50">
          {deleting ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-trash" />}
          Delete
        </button>
      </div>
    </div>
  );
}
