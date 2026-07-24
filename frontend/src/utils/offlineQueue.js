const QUEUE_KEY = 'offline_queue';

export function enqueue(item) {
  const queue = getQueue();
  queue.push({ ...item, id: Date.now() + Math.random(), queuedAt: new Date().toISOString() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
  } catch {
    return [];
  }
}

export function removeFromQueue(id) {
  const queue = getQueue().filter((i) => i.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

export function queueLength() {
  return getQueue().length;
}
