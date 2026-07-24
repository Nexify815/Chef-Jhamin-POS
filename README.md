# Chef Jhamin's Kitchen Management System

A full-stack restaurant management platform built with React, Express.js, and PostgreSQL. Designed to run Chef Jhamin's Kitchen — handling sales tracking, inventory, staff scheduling, expenses, customers, suppliers, and purchase orders in one place.

**Live:** [chef-jhamin-pos.onrender.com](https://chef-jhamin-pos.onrender.com)

## Features

- **Point of Sale** — Fast order entry with menu grid, size selection, extras, and multiple payment methods (Cash, Mobile Money, Card)
- **Sales Tracking** — Real-time daily/weekly sales dashboard with revenue charts, category breakdown, and payment method stats
- **Inventory Management** — Ingredient stock levels with low-stock alerts, automatic deduction on sales, and adjustment logging
- **Staff Management** — Shift scheduling, task assignment, time tracking, and closing cash reconciliation
- **Expense Tracking** — Categorized expenses with payment method tracking and budget alerts
- **Customer & Supplier CRM** — Contact directory with purchase orders to suppliers
- **Full Audit Trail** — Every create, update, and delete is logged with who did it and when
- **Backup & Restore** — Export/import full database as JSON for portability
- **Role-Based Access** — Owner (full access) and Staff (sales + limited features) roles
- **PWA Support** — Installable on mobile devices, works offline with service worker caching
- **Dark Theme** — Navy/teal glass-panel UI with responsive design

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Express.js, Node.js |
| Database | PostgreSQL (production) / SQLite (local) |
| Auth | JWT (httpOnly cookies), bcryptjs |
| Security | Helmet, express-rate-limit, CORS, CSRF double-submit cookie |
| Deployment | Render (backend), Neon (PostgreSQL) |

## Quick Start (Local)

```bash
# Clone the repo
git clone https://github.com/Nexify815/Chef-Jhamin-POS.git
cd Chef-Jhamin-POS

# Create .env
cp .env.example .env
# Edit .env — just set SECRET_KEY (SQLite used automatically without DATABASE_URL)

# Install and build
npm install
cd frontend && npm install && npm run build && cd ..

# Start
npm start
```

Open `http://localhost:3000`. Data saves to `kitchen.db` (SQLite).

**Default Login:**
| Role | Username | Password |
|------|----------|----------|
| Owner | `admin` | `admin123` |
| Staff | `staff` | `staff123` |

> Default passwords are for development only. Change them on first login.

## Production (PostgreSQL + Render)

1. Create a [Neon](https://neon.tech) PostgreSQL database
2. Create a [Render](https://render.com) web service, connect your GitHub repo
3. Set environment variables in Render:
   - `DATABASE_URL` — your Neon connection string
   - `SECRET_KEY` — a long random string
   - `NODE_ENV` — `production`
4. Render runs `npm install && cd frontend && npm install --include=dev && npm run build` automatically
5. Server starts with `node server.js`

## Project Structure

```
ChefJhamin V.1.0/
├── server.js          # Express API (all routes)
├── db.js              # Database adapter (PostgreSQL / SQLite)
├── .env.example       # Environment template
├── render.yaml        # Render deployment config
└── frontend/
    ├── src/
    │   ├── App.jsx              # Router with lazy-loaded layouts
    │   ├── api.js               # API client with CSRF + timeout
    │   ├── context/             # Auth context with JWT
    │   ├── pages/
    │   │   ├── owner/           # Dashboard, Sales, Inventory, Staff, Expenses, etc.
    │   │   ├── staff/           # Staff home, sales entry, logs
    │   │   └── LoginPage.jsx
    │   ├── components/          # Sidebar, Modal, CustomSelect, StaffTour
    │   └── modals/              # All modal dialogs
    └── public/
        ├── manifest.json        # PWA manifest
        └── sw.js                # Service worker
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | Authenticate user |
| GET | `/api/menu` | List menu items |
| POST | `/api/menu` | Create menu item |
| PUT | `/api/menu/:id` | Update menu item |
| GET | `/api/sales` | List sales (date filtered) |
| POST | `/api/sales` | Record a sale |
| GET | `/api/sales/summary` | Sales summary stats |
| GET | `/api/ingredients` | List ingredients |
| POST | `/api/ingredients` | Add ingredient |
| PUT | `/api/ingredients/:id` | Update ingredient |
| GET | `/api/staff-logs` | List staff logs |
| POST | `/api/staff-logs` | Create staff log |
| GET | `/api/expenses` | List expenses |
| POST | `/api/expenses` | Create expense |
| GET | `/api/users` | List users (owner) |
| POST | `/api/users` | Create user (owner) |
| GET | `/api/customers` | List customers |
| GET | `/api/suppliers` | List suppliers |
| GET | `/api/purchase-orders` | List purchase orders |
| GET | `/api/audit-log` | View audit trail |
| GET | `/api/backup/full` | Export full database |
| POST | `/api/backup/full` | Restore from backup |
| GET | `/api/clock-status` | Check clock-in status |
| POST | `/api/danger/*` | Factory reset endpoints |

## License

Private — Built by [James Kissi](https://github.com/Nexify815)
