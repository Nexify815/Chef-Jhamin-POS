import { useAuth } from '../context/AuthContext';
import { useModal } from './Modal';
import NotificationPanel from './NotificationPanel';
import ThemeToggle from './ThemeToggle';

const ownerNav = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-pie' },
  { id: 'sales', label: 'Sales', icon: 'fas fa-receipt' },
  { id: 'expenses', label: 'Expenses', icon: 'fas fa-wallet' },
  { id: 'staff-log', label: 'Staff Log', icon: 'fas fa-clock' },
  { id: 'inventory', label: 'Inventory', icon: 'fas fa-boxes-stacked' },
  { id: 'low-stock', label: 'Low Stock Alerts', icon: 'fas fa-triangle-exclamation' },
  { id: 'menu-manager', label: 'Menu Manager', icon: 'fas fa-utensils' },
  { id: 'staff-manager', label: 'Staff Manager', icon: 'fas fa-users-gear' },
  { id: 'weekly-profit', label: 'Weekly Profit', icon: 'fas fa-chart-line' },
  { id: 'reports', label: 'Reports', icon: 'fas fa-chart-bar' },
  { id: 'inventory-log', label: 'Inventory Log', icon: 'fas fa-clock-rotate-left' },
  { id: 'purchase-orders', label: 'Purchase Orders', icon: 'fas fa-truck' },
  { id: 'suppliers', label: 'Suppliers', icon: 'fas fa-people-arrows' },
  { id: 'customers', label: 'Customers', icon: 'fas fa-address-book' },
  { id: 'settings', label: 'Settings', icon: 'fas fa-gear' },
  { id: 'audit-log', label: 'Audit Log', icon: 'fas fa-history' },
  { id: 'import-export', label: 'Import/Export', icon: 'fas fa-file-import' },
];

const staffNav = [
  { id: 'home', label: 'Home', icon: 'fas fa-house' },
  { id: 'sales', label: 'New Sale', icon: 'fas fa-cart-plus' },
  { id: 'expenses', label: 'Expenses', icon: 'fas fa-wallet' },
  { id: 'inventory', label: 'Inventory', icon: 'fas fa-boxes-stacked' },
  { id: 'time-clock', label: 'Time Clock', icon: 'fas fa-clock' },
];

export default function Sidebar({ role, activePage, onNavigate, onLogout, isOpen, onToggle, onReplayTour }) {
  const { settings } = useAuth();
  const { showConfirm } = useModal();
  const navItems = role === 'owner' ? ownerNav : staffNav;
  const businessName = settings?.businessName || "Chef Jhamin's Kitchen";

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-5" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold leading-tight tracking-tight" style={{ color: 'var(--teal)' }}>
              {businessName}
            </h1>
            <p className="text-[11px] tracking-wider uppercase mt-0.5" style={{ color: 'var(--text-dim)' }}>Management System</p>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationPanel />
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                if (onToggle) onToggle();
              }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer
                ${active
                  ? 'border-l-[3px] border-l-[var(--teal)]'
                  : 'border-l-[3px] border-transparent'
                }
              `}
              style={{
                background: active ? 'rgba(20, 184, 166, 0.10)' : 'transparent',
                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--table-hover)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; } else { e.currentTarget.style.color = 'var(--text-primary)'; } }}
            >
              <i className={`${item.icon} w-5 text-center text-xs`} style={{ color: active ? 'var(--teal)' : undefined }} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-3 py-4" style={{ borderTop: '1px solid var(--border-color)' }}>
        {role === 'staff' && onReplayTour && (
          <button
            onClick={() => { onReplayTour(); if (onToggle) onToggle(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer mb-1"
            style={{ color: 'var(--teal, #14B8A6)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(20,184,166,0.10)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <i className="fas fa-circle-question w-5 text-center text-xs" />
            <span>Replay Tutorial</span>
          </button>
        )}
        <button
          onClick={() => showConfirm('Logout', 'Are you sure you want to log out?', onLogout)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#F87171'; e.currentTarget.style.background = 'rgba(239,68,68,0.10)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <i className="fas fa-right-from-bracket w-5 text-center text-xs" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className="hidden md:flex flex-col fixed inset-y-0 left-0 w-[280px] backdrop-blur-xl z-40"
        style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border-color)' }}
      >
        {sidebarContent}
      </aside>

      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onToggle} />
          <aside
            className="absolute inset-y-0 left-0 w-[280px] backdrop-blur-xl shadow-2xl pb-20"
            style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border-color)' }}
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
