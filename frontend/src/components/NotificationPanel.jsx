import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../api';

export default function NotificationPanel({ onUnreadCountChange }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [btnPos, setBtnPos] = useState({ top: 0, left: 0 });
  const panelRef = useRef(null);
  const btnRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const [notifs, countRes] = await Promise.all([
        api.get('notifications'),
        api.get('notifications/unread-count'),
      ]);
      setNotifications(notifs || []);
      const count = countRes?.count || 0;
      setUnreadCount(count);
      onUnreadCountChange?.(count);
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && btnRef.current && !btnRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateBtnPos = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const dropW = Math.min(380, window.innerWidth - 32);
      const left = Math.max(16, Math.min(rect.left, window.innerWidth - dropW - 16));
      setBtnPos({ top: rect.bottom + 8, left });
    }
  };

  useEffect(() => {
    if (!open) return;
    updateBtnPos();
    const onMove = () => updateBtnPos();
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open]);

  const markAsRead = async (id) => {
    try {
      await api.put(`notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => {
        const next = Math.max(0, prev - 1);
        onUnreadCountChange?.(next);
        return next;
      });
    } catch (e) {
      console.error('Failed to mark as read:', e);
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
      onUnreadCountChange?.(0);
    } catch (e) {
      console.error('Failed to mark all as read:', e);
    }
  };

  const deleteNotification = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`notifications/${id}`);
      const wasUnread = notifications.find(n => n.id === id && !n.is_read);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (wasUnread) {
        setUnreadCount(prev => {
          const next = Math.max(0, prev - 1);
          onUnreadCountChange?.(next);
          return next;
        });
      }
    } catch (e) {
      console.error('Failed to delete notification:', e);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
  };

  const dropdown = open ? createPortal(
    <div
      ref={panelRef}
      className="rounded-2xl shadow-2xl z-[9999] overflow-hidden animate-modal-in"
      style={{
        position: 'fixed',
        top: btnPos.top,
        left: btnPos.left,
        background: 'var(--navy-panel)',
        border: '1px solid var(--border-color)',
        backdropFilter: 'blur(24px)',
        width: 'min(380px, calc(100vw - 2rem))',
      }}
    >
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Notifications</h3>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs transition-colors cursor-pointer"
            style={{ color: 'var(--teal)' }}
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="overflow-y-auto max-h-[380px]">
        {notifications.length === 0 ? (
          <div className="py-12 text-center">
            <i className="fas fa-bell-slash text-2xl mb-3 block" style={{ color: 'var(--text-dim)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No notifications</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              onClick={() => !n.is_read && markAsRead(n.id)}
              className="flex items-start gap-3 px-5 py-3.5 transition-colors cursor-pointer"
              style={{
                borderBottom: '1px solid var(--border-color)',
                background: !n.is_read ? 'rgba(20,184,166,0.04)' : 'transparent',
              }}
              onMouseEnter={e => { if (n.is_read) e.currentTarget.style.background = 'var(--table-hover)'; }}
              onMouseLeave={e => { if (n.is_read) e.currentTarget.style.background = 'transparent'; }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: !n.is_read ? 'rgba(249,115,22,0.15)' : 'var(--table-hover)' }}
              >
                <i className="fas fa-exclamation-triangle text-xs" style={{ color: !n.is_read ? '#F97316' : 'var(--text-dim)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate" style={{ color: !n.is_read ? 'var(--text-primary)' : 'var(--text-muted)' }}>{n.title}</p>
                  {!n.is_read && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--teal)' }} />}
                </div>
                <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{n.message}</p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-dim)' }}>{formatTime(n.created_at)}</p>
              </div>
              <button
                onClick={(e) => deleteNotification(n.id, e)}
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg transition-all cursor-pointer"
                style={{ color: 'var(--text-dim)' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#F87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.10)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.background = 'transparent'; }}
              >
                <i className="fas fa-times text-[10px]" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl transition-all cursor-pointer"
        style={{
          background: unreadCount > 0 ? 'rgba(239,68,68,0.1)' : 'var(--table-hover)',
          color: unreadCount > 0 ? '#F87171' : 'var(--text-muted)',
          border: unreadCount > 0 ? '2px solid rgba(239,68,68,0.8)' : '1px solid var(--border-color)',
          boxShadow: unreadCount > 0 ? '0 0 8px rgba(239,68,68,0.4), 0 0 0 2px rgba(239,68,68,0.2)' : 'none',
          animation: unreadCount > 0 ? 'bell-pulse 2s ease-in-out infinite' : 'none',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--border-glow)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = unreadCount > 0 ? 'rgba(239,68,68,0.1)' : 'var(--table-hover)'; e.currentTarget.style.color = unreadCount > 0 ? '#F87171' : 'var(--text-muted)'; }}
      >
        <i className="fas fa-bell text-sm" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none" style={{ boxShadow: '0 0 6px rgba(239,68,68,0.6)' }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {dropdown}
    </div>
  );
}
