import { useEffect } from 'react';

export default function KeyboardShortcuts() {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        document.dispatchEvent(new CustomEvent('modal-close'));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  return null;
}
