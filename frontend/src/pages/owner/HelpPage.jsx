import { useState } from 'react';

const sections = [
  {
    id: 'dashboard',
    icon: 'fas fa-chart-pie',
    color: '#14B8A6',
    title: 'Dashboard',
    description: 'Your daily overview at a glance.',
    details: [
      'See today\'s total sales, order count, and expenses.',
      'View a chart of sales vs expenses over time.',
      'Check today\'s staff activity — who clocked in/out.',
      'Low stock alerts appear here automatically.',
    ],
  },
  {
    id: 'sales',
    icon: 'fas fa-receipt',
    color: '#10B981',
    title: 'Sales',
    description: 'Record and manage all sales transactions.',
    details: [
      'Add new sales by selecting items, sizes, extras, and payment method.',
      'Supports Cash, MoMo, Bolt Food, and Delivery payments.',
      'Sales automatically deduct ingredients from inventory.',
      'Edit or delete sales — inventory is adjusted automatically.',
      'Filter and search sales by date, staff, item, or payment type.',
      'Export sales data to Excel.',
    ],
  },
  {
    id: 'expenses',
    icon: 'fas fa-wallet',
    color: '#F59E0B',
    title: 'Expenses',
    description: 'Track all business expenses.',
    details: [
      'Log expenses with categories: Rent, Utilities, Ingredients, Staff, Transport, Other.',
      'Record the amount, payment method, and optional notes.',
      'Filter expenses by date, category, or payment method.',
      'Export expenses to Excel for accounting.',
    ],
  },
  {
    id: 'staff-log',
    icon: 'fas fa-clock',
    color: '#3B82F6',
    title: 'Staff Log',
    description: 'Track employee work hours.',
    details: [
      'Staff clock in at the start of their shift and clock out at the end.',
      'Hours are calculated automatically.',
      'View daily, weekly, or filtered logs.',
      'Morning and evening shifts are tracked separately.',
    ],
  },
  {
    id: 'inventory',
    icon: 'fas fa-boxes-stacked',
    color: '#8B5CF6',
    title: 'Inventory',
    description: 'Manage ingredients and stock levels.',
    details: [
      'Add new ingredients with name, stock quantity, unit, and reorder level.',
      'Record stock IN (deliveries) and stock OUT (usage/waste).',
      'When stock drops below the reorder level, a notification is triggered.',
      'Sales automatically deduct ingredients based on recipes.',
      'Edit or delete ingredients as needed.',
    ],
  },
  {
    id: 'low-stock',
    icon: 'fas fa-triangle-exclamation',
    color: '#EF4444',
    title: 'Low Stock Alerts',
    description: 'Get notified when ingredients are running low.',
    details: [
      'Alerts appear automatically when stock drops to or below the reorder level.',
      'Click the bell icon in the top-right to see notifications.',
      'Each alert shows the ingredient name, current stock, and reorder level.',
      'Mark notifications as read or clear them when done.',
    ],
  },
  {
    id: 'menu-manager',
    icon: 'fas fa-utensils',
    color: '#EC4899',
    title: 'Menu Manager',
    description: 'Set up your menu items, recipes, and extras.',
    details: [
      'Menu tab: Add items with different sizes and prices (e.g., Jollof Rice — Small: 25, Medium: 35, Large: 50).',
      'Recipes tab: Link menu items to ingredients with exact quantities. This is what makes inventory deduction automatic.',
      'Extras tab: Add optional add-ons like Extra Chicken, Egg, Pepper Sauce with prices.',
      'Ingredients tab: Manage your raw ingredients list.',
      'Changes here affect sales and inventory calculations.',
    ],
  },
  {
    id: 'staff-manager',
    icon: 'fas fa-users-gear',
    color: '#06B6D4',
    title: 'Staff Manager',
    description: 'Manage staff accounts and access.',
    details: [
      'Add new staff members with a username and password.',
      'Staff accounts have limited access — they can record sales, expenses, and clock in/out.',
      'Only the owner can access the full dashboard, inventory management, reports, and settings.',
      'Reset a staff member\'s password if they forget it.',
      'Staff can be deactivated without deleting their records.',
    ],
  },
  {
    id: 'weekly-profit',
    icon: 'fas fa-chart-line',
    color: '#22C55E',
    title: 'Weekly Profit',
    description: 'See your weekly profit and loss breakdown.',
    details: [
      'Automatically calculates: Profit = Total Sales - Total Expenses.',
      'View day-by-day breakdown for the current week.',
      'See which days are most profitable.',
      'Identifies patterns — slow days vs busy days.',
    ],
  },
  {
    id: 'reports',
    icon: 'fas fa-chart-bar',
    color: '#A855F7',
    title: 'Reports',
    description: 'Detailed analytics and insights.',
    details: [
      'View sales breakdown by item, staff, payment method, and time period.',
      'See expense breakdown by category.',
      'Track inventory usage and waste.',
      'Filter by date range to compare periods.',
    ],
  },
  {
    id: 'purchase-orders',
    icon: 'fas fa-truck',
    color: '#F97316',
    title: 'Purchase Orders',
    description: 'Track orders from suppliers.',
    details: [
      'Create purchase orders for ingredients you need to restock.',
      'Track order status: Pending, Delivered, Cancelled.',
      'Link orders to specific suppliers.',
      'Mark orders as received when stock arrives.',
    ],
  },
  {
    id: 'suppliers',
    icon: 'fas fa-people-arrows',
    color: '#14B8A6',
    title: 'Suppliers',
    description: 'Keep a directory of your suppliers.',
    details: [
      'Add supplier names, contact info, and what they provide.',
      'Use this when creating purchase orders.',
      'Keep track of who supplies what.',
    ],
  },
  {
    id: 'customers',
    icon: 'fas fa-address-book',
    color: '#3B82F6',
    title: 'Customers',
    description: 'Keep a directory of your regular customers.',
    details: [
      'Add customer names and contact details.',
      'Track customer preferences.',
      'Useful for delivery orders and regular clients.',
    ],
  },
  {
    id: 'import-export',
    icon: 'fas fa-file-import',
    color: '#6366F1',
    title: 'Import / Export',
    description: 'Back up and restore your data.',
    details: [
      'Export all data to Excel files — sales, expenses, inventory, everything.',
      'Download a full backup (JSON) of your entire database.',
      'Import data from Excel files with column mapping.',
      'Restore from a backup file — review before confirming.',
      'Use factory reset in Settings to start fresh (careful — this is permanent!).',
    ],
  },
  {
    id: 'settings',
    icon: 'fas fa-gear',
    color: '#64748B',
    title: 'Settings',
    description: 'Configure your system.',
    details: [
      'Set your business name, currency, and other preferences.',
      'Change your password.',
      'Danger Zone: Clear specific data or factory reset everything.',
      'Toggle between light and dark theme.',
    ],
  },
  {
    id: 'audit-log',
    icon: 'fas fa-history',
    color: '#EF4444',
    title: 'Audit Log',
    description: 'See who did what and when.',
    details: [
      'Every action (create, update, delete) is recorded.',
      'See before/after values for changes.',
      'Filter by action type, table, user, or date.',
      'Export audit logs for compliance.',
    ],
  },
  {
    id: 'notifications',
    icon: 'fas fa-bell',
    color: '#F59E0B',
    title: 'Notifications',
    description: 'Stay informed about important events.',
    details: [
      'The bell icon shows unread notification count.',
      'Click to see a dropdown of recent notifications.',
      'Currently used for low stock alerts.',
      'Mark individual notifications as read or clear all.',
    ],
  },
];

export default function HelpPage() {
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Help Guide</h1>
        <p style={{ color: 'var(--text-secondary)' }} className="text-sm mt-1">
          Everything you need to know about using Chef Jhamin's Kitchen Management System.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setExpanded(expanded === section.id ? null : section.id)}
            className="glass-card p-5 text-left transition-all duration-200 cursor-pointer hover:scale-[1.01]"
            style={{
              border: expanded === section.id ? `1px solid ${section.color}40` : '1px solid var(--border-color)',
              background: expanded === section.id ? `${section.color}08` : undefined,
            }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${section.color}15` }}
              >
                <i className={section.icon} style={{ color: section.color, fontSize: 16 }} />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{section.title}</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{section.description}</p>
              </div>
            </div>

            {expanded === section.id && (
              <div className="mt-3 pt-3 anim-fade-in" style={{ borderTop: '1px solid var(--border-color)' }}>
                <ul className="space-y-2">
                  {section.details.map((detail, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <i className="fas fa-check mt-0.5 shrink-0" style={{ color: section.color, fontSize: 10 }} />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-3 flex justify-end">
              <i
                className="fas fa-chevron-down text-xs transition-transform duration-200"
                style={{
                  color: 'var(--text-muted)',
                  transform: expanded === section.id ? 'rotate(180deg)' : 'rotate(0)',
                }}
              />
            </div>
          </button>
        ))}
      </div>

      <div className="glass-card p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <i className="fas fa-key" style={{ color: '#14B8A6' }} /> Default Login Credentials
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="p-3 rounded-xl" style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)' }}>
            <div className="font-semibold" style={{ color: '#14B8A6' }}>Owner</div>
            <div style={{ color: 'var(--text-secondary)' }}>Username: <span className="font-mono">admin</span></div>
            <div style={{ color: 'var(--text-secondary)' }}>Password: <span className="font-mono">admin123</span></div>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <div className="font-semibold" style={{ color: '#F59E0B' }}>Staff</div>
            <div style={{ color: 'var(--text-secondary)' }}>Username: <span className="font-mono">staff</span></div>
            <div style={{ color: 'var(--text-secondary)' }}>Password: <span className="font-mono">staff123</span></div>
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <i className="fas fa-lightbulb" style={{ color: '#F59E0B' }} /> Quick Tips
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex items-start gap-2">
            <i className="fas fa-arrow-right mt-1 shrink-0" style={{ color: '#14B8A6', fontSize: 10 }} />
            <span>Set up your <strong>Menu Manager</strong> first — add items, sizes, recipes, and extras before recording sales.</span>
          </div>
          <div className="flex items-start gap-2">
            <i className="fas fa-arrow-right mt-1 shrink-0" style={{ color: '#14B8A6', fontSize: 10 }} />
            <span>Link ingredients to menu items via <strong>Recipes</strong> so inventory deducts automatically when you make a sale.</span>
          </div>
          <div className="flex items-start gap-2">
            <i className="fas fa-arrow-right mt-1 shrink-0" style={{ color: '#14B8A6', fontSize: 10 }} />
            <span>Set <strong>Reorder Levels</strong> on ingredients so you get alerts before running out.</span>
          </div>
          <div className="flex items-start gap-2">
            <i className="fas fa-arrow-right mt-1 shrink-0" style={{ color: '#14B8A6', fontSize: 10 }} />
            <span>Use <strong>Import/Export</strong> to back up your data regularly.</span>
          </div>
          <div className="flex items-start gap-2">
            <i className="fas fa-arrow-right mt-1 shrink-0" style={{ color: '#14B8A6', fontSize: 10 }} />
            <span>Add staff in <strong>Staff Manager</strong> so they can record sales and clock in/out.</span>
          </div>
          <div className="flex items-start gap-2">
            <i className="fas fa-arrow-right mt-1 shrink-0" style={{ color: '#14B8A6', fontSize: 10 }} />
            <span>Check the <strong>Audit Log</strong> to see all changes made by any user.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
