const ownerTabs = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-pie' },
  { id: 'sales', label: 'Sales', icon: 'fas fa-receipt' },
  { id: 'menu-manager', label: 'Menu', icon: 'fas fa-utensils' },
  { id: 'settings', label: 'Settings', icon: 'fas fa-gear' },
];

const staffTabs = [
  { id: 'home', label: 'Home', icon: 'fas fa-house' },
  { id: 'sales', label: 'Sales', icon: 'fas fa-cart-plus' },
  { id: 'expenses', label: 'Expenses', icon: 'fas fa-wallet' },
  { id: 'inventory', label: 'Inventory', icon: 'fas fa-boxes-stacked' },
];

export default function BottomNav({ role, activePage, onNavigate }) {
  const tabs = role === 'owner' ? ownerTabs : staffTabs;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl"
      style={{
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border-color)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: '64px' }}>
        {tabs.map((tab) => {
          const active = activePage === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                flex: 1,
                height: '100%',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                transition: 'color 0.2s',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: active ? '24px' : '0px',
                  height: '3px',
                  borderRadius: '0 0 3px 3px',
                  background: 'var(--teal)',
                  transition: 'width 0.2s ease',
                }}
              />
              <i
                className={tab.icon}
                style={{
                  fontSize: '18px',
                  color: active ? 'var(--teal)' : 'var(--text-dim)',
                  transition: 'color 0.2s',
                }}
              />
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: active ? 600 : 500,
                  color: active ? 'var(--teal)' : 'var(--text-dim)',
                  transition: 'color 0.2s',
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
