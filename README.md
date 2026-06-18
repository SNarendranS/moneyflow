# MoneyFlow — Personal Financial Operating System

A full-stack personal finance app: income → transfers → savings → investments → expenses → goals.

## Structure

```
moneyflow/
├── backend/    # Node.js + Express + MongoDB API
└── frontend/   # React + Vite + TailwindCSS SPA
```

---

## Quick Start

### 1. Backend

```bash
cd backend
cp .env.example .env          # fill in your MongoDB URI and JWT secrets
npm install
npm run dev                   # runs on http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env          # set VITE_API_URL=http://localhost:5000/api
npm install
npm run dev                   # runs on http://localhost:5173
```

---

## Environment Variables

### Backend `.env`

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_ACCESS_SECRET` | Secret for access tokens (min 32 chars) |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens (min 32 chars) |
| `JWT_ACCESS_EXPIRES_IN` | e.g. `15m` |
| `JWT_REFRESH_EXPIRES_IN` | e.g. `7d` |
| `FRONTEND_URL` | CORS origin, e.g. `http://localhost:5173` |
| `PORT` | API port (default `5000`) |

### Frontend `.env`

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API URL, e.g. `http://localhost:5000/api` |

---

## Features

- **Auth** — JWT access + refresh token rotation, register/login/logout
- **Accounts** — Salary, Savings, Cash, Wallet, Credit Card; balance auto-updates on every transaction
- **Transactions** — Income, Expense, Transfer (internal & external), Investment; full pagination & filtering
- **Categories** — Hierarchical (category + subcategory); 8 default categories seeded on registration
- **Tags** — Attach multiple tags to any transaction
- **Recurring** — Daily / Weekly / Monthly / Yearly / Custom (X days); overdue/due-soon tracking
- **Goals** — Target amount + date; contribution tracking; monthly-needed forecast
- **Analytics** — Income vs Expenses bar chart, Category pie chart, Savings rate trend, Family support stats
- **Insights** — Auto-generated insights (spending changes, savings rate, top category)
- **Search** — Global search across transactions, accounts, goals, tags
- **Dark UI** — Fully dark, responsive, mobile-first design

---

## Deployment

### Backend → Render / Railway

1. Push `backend/` to its own repo or use monorepo root dir setting
2. Set all env vars in the platform dashboard
3. Build command: `npm install && npm run build`
4. Start command: `node dist/index.js`

### Frontend → Vercel

1. Import `frontend/` folder (set root directory to `frontend`)
2. Set `VITE_API_URL` to your deployed backend URL
3. Build command: `npm run build`
4. Output dir: `dist`

### MongoDB Atlas

1. Create free cluster at [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Add your backend server IP to the allowlist (or `0.0.0.0/0` for dev)
3. Copy the connection string into `MONGODB_URI`

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, TanStack Query, React Hook Form, Zod, Recharts |
| Backend | Node.js, Express, TypeScript, Mongoose |
| Database | MongoDB Atlas |
| Auth | JWT (access + refresh), bcryptjs |
| Deployment | Vercel (FE), Render/Railway (BE), MongoDB Atlas |
