import { useState, useEffect, useCallback } from 'react';
import { getQueue, removeFromQueue } from '../utils/offlineQueue';
import api from '../api';

export default function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);

  const syncQueue = useCallback(async () => {
    const queue = getQueue();
    if (queue.length === 0) return;

    setPendingSync(queue.length);
    const failed = [];

    for (const item of queue) {
      try {
        await api.post(item.endpoint, item.body);
        removeFromQueue(item.id);
      } catch {
        failed.push(item);
      }
    }

    setPendingSync(failed.length);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncQueue();
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setPendingSync(getQueue().length);

    if (navigator.onLine) syncQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncQueue]);

  return { isOnline, pendingSync, syncQueue };
}
