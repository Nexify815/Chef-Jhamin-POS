import { useState, useCallback } from 'react';

export default function useTableSelection() {
  const [selectedIds, setSelectedIds] = useState([]);

  const toggleSelection = useCallback((id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const toggleAll = useCallback((ids) => {
    setSelectedIds(prev =>
      prev.length === ids.length ? [] : [...ids]
    );
  }, []);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  return { selectedIds, toggleSelection, toggleAll, clearSelection };
}
