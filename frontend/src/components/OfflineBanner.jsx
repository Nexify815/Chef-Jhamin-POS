export default function OfflineBanner({ isOnline, pendingSync }) {
  if (isOnline && pendingSync === 0) return null;

  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white text-center py-2 px-4 font-body text-sm font-semibold shadow-md">
        <i className="bx bx-wifi-off mr-2"></i>
        You're offline — sales will sync when connection returns
        {pendingSync > 0 && (
          <span className="ml-2 opacity-80">({pendingSync} queued)</span>
        )}
      </div>
    );
  }

  if (pendingSync > 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-blue-500 text-white text-center py-2 px-4 font-body text-sm font-semibold shadow-md animate-pulse">
        <i className="bx bx-sync mr-2"></i>
        Syncing {pendingSync} offline sale{pendingSync > 1 ? 's' : ''}...
      </div>
    );
  }

  return null;
}
