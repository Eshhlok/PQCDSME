
<img width="1889" height="851" alt="image" src="https://github.com/user-attachments/assets/05493666-0c1f-417f-981c-da3c60b8c79f" />

# PQCDSME Dashboard
A manufacturing intelligence platform that replaces paper-based PQCDSME tracking with a real-time digital dashboard. Plant operators enter shift data, managers monitor performance trends, and the system automatically alerts the team when entries are missed or targets are falling behind.

**Live:** [pqcdsme.vercel.app](https://pqcdsme.vercel.app)

---

## What is PQCDSME?

PQCDSME is a framework used in manufacturing to measure plant performance across 7 dimensions:

| Letter | Dimension | What it tracks |
|--------|-----------|----------------|
| **P** | Production | Output vs target |
| **Q** | Quality | Defect rates |
| **C** | Cost | Actual spend vs budget |
| **D** | Dispatch | Orders fulfilled vs planned |
| **S** | Safety | Near-miss incidents |
| **M** | Morale | Attendance and engagement |
| **E** | Environment | Energy consumption |

---

## For Managers & Stakeholders

### What this system does

- **Real-time visibility** — See today's numbers for all 7 sections the moment operators enter them
- **Trend analysis** — Track performance Today, Cumulatively, Month-on-Month, and Year-on-Year with drill-down charts
- **Automatic alerts** — Get notified when a shift entry is missed or a section falls below its monthly target
- **Manager reports** — Export a one-page PDF summary of the month's performance across all sections
- **Target setting** — Admins set monthly targets per section; red dashed lines appear on charts automatically
- **Shift management** — Configure morning, afternoon, and night shifts per plant
- **Role-based access** — Admins manage the system, operators enter data, viewers see dashboards only

### Who uses what

| Role | What they can do |
|------|-----------------|
| **Admin** | Everything — set targets, manage users, view all data, export reports |
| **Operator** | Enter shift data, view dashboards, see alerts |
| **Viewer** | View dashboards and charts only |

---

## For Developers

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS + shadcn/ui |
| Backend | Express + TypeScript |
| Database | PostgreSQL via Supabase |
| ORM | Drizzle ORM |
| Auth | Supabase Auth (email/password + JWT) |
| Package Manager | pnpm workspaces (monorepo) |
| Frontend Deploy | Vercel |
| Backend Deploy | Render |

### Project Structure

```
PQCDSME-Dashboard/
├── artifacts/
│   ├── api-server/         ← Express backend (port 3000)
│   └── pqcdsme-dashboard/  ← React frontend (port 5173)
├── lib/
│   ├── db/                 ← Drizzle schema + db client
│   ├── api-spec/           ← OpenAPI spec
│   ├── api-zod/            ← Zod validators (generated)
│   └── api-client-react/   ← React Query client (generated)
```

### Database Tables

| Table | Purpose |
|-------|---------|
| `plants` | Plant/site registry |
| `entries` | Shift data entries per section |
| `targets` | Monthly targets per section |
| `insights` | Chart annotations |
| `user_profiles` | Roles and plant assignments |
| `shifts` | Shift definitions (name, start/end time) |
| `alert_reads` | Tracks which alerts a user has dismissed |

### Local Development

**Prerequisites:** Node.js 20+, pnpm 9+

```bash
# Clone
git clone https://github.com/Eshhlok/PQCDSME.git
cd PQCDSME

# Install dependencies
pnpm install

# Set environment variables
# Frontend — artifacts/pqcdsme-dashboard/.env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3000/api

# Backend — artifacts/api-server/.env
PORT=3000
DATABASE_URL=postgresql://...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Run backend
cd artifacts/api-server
pnpm dev

# Run frontend (separate terminal)
cd artifacts/pqcdsme-dashboard
pnpm dev
```

Frontend runs at `http://localhost:5173`, backend at `http://localhost:3000`.

### Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | [pqcdsme.vercel.app](https://pqcdsme.vercel.app) |
| Backend | Render | https://pqcdsme-api.onrender.com |
| Database | Supabase | Project ID: fetknzkaoqbtjaxsmkaa |

**Backend build command:**
```
pnpm install --frozen-lockfile && pnpm --filter @workspace/db build && pnpm --filter @workspace/api-zod build && pnpm --filter @workspace/api-server build
```

**Backend start command:**
```
node --enable-source-maps ./artifacts/api-server/dist/index.mjs
```

**Required environment variables on Render:**

| Key | Description |
|-----|-------------|
| `PORT` | `3000` |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Supabase connection string |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `CORS_ORIGIN` | Vercel frontend URL |

**Required environment variables on Vercel:**

| Key | Description |
|-----|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_API_URL` | Render backend URL + `/api` |

### Key Features (Technical)

- **Auth** — Supabase email/password, JWT on all API routes, role-based access control
- **Alerts** — Polls every 15s, two alert types: `missed_entry` and `below_target`, notification sound
- **Charts** — Today / Cumulative / MoM / YoY with drill-down, target line on cumulative chart
- **PDF Export** — Manager report via html2canvas + jsPDF, A4 multi-page
- **Performance** — Lazy loaded pages, skeleton loaders, Lighthouse: Performance 60 / Accessibility 90 / Best Practices 100 / SEO 100
- **Alerts API** — Optimised from 4 serial DB queries to parallel `Promise.all` (~150ms response)

---

## Screenshots

<img width="1365" height="681" alt="image" src="https://github.com/user-attachments/assets/f12d61fd-dc82-4fc4-b6fa-4a595e9e9756" />
<img width="1365" height="682" alt="image" src="https://github.com/user-attachments/assets/1db436df-7bba-405e-93a2-6b5ccee4be4d" />
<img width="1365" height="682" alt="image" src="https://github.com/user-attachments/assets/2def3452-b8e3-4384-80f6-55b6d1327119" />
<img width="1365" height="682" alt="image" src="https://github.com/user-attachments/assets/e7bc8859-e5d6-48dd-9e55-7df7848dc7df" />
<img width="1365" height="488" alt="image" src="https://github.com/user-attachments/assets/a07ff5c0-b84c-409e-b550-4e869fd97364" />
<img width="1357" height="564" alt="image" src="https://github.com/user-attachments/assets/5f1f9f46-a9d9-4dff-8f65-5ddc89dd3209" />
<img width="1365" height="680" alt="image" src="https://github.com/user-attachments/assets/e8709df4-f3a9-49fa-a23e-937a7fa3f666" />
<img width="1365" height="682" alt="image" src="https://github.com/user-attachments/assets/58ec898f-978f-4e7e-9c65-8131b05d46d3" />
<img width="1365" height="679" alt="image" src="https://github.com/user-attachments/assets/c5f4e74f-d1da-44e2-9499-3f9085f0194a" />
<img width="1363" height="680" alt="image" src="https://github.com/user-attachments/assets/823527fc-c001-402f-8e5a-7bfcca7823c1" />
<img width="1365" height="678" alt="image" src="https://github.com/user-attachments/assets/15a60648-d1f4-4d70-b8bb-3c70a3c5cfb4" />
<img width="1365" height="682" alt="image" src="https://github.com/user-attachments/assets/840ac15c-aed6-400d-8ab1-42d01ce85797" />
<img width="1365" height="680" alt="image" src="https://github.com/user-attachments/assets/8cf91ad1-b4a7-4fbd-b768-7ffc12e29067" />
<img width="1365" height="682" alt="image" src="https://github.com/user-attachments/assets/d8034f44-bdee-4ffe-82dd-5f007bba45c2" />
<img width="1365" height="508" alt="image" src="https://github.com/user-attachments/assets/3ec954d0-dece-402e-9644-9a8b5b171d7b" />





---

## Author

**Eshlok Agarwal**  
[linkedin.com/in/eshlok-agarwal](https://www.linkedin.com/in/eshlok-agarwal-134877380/)

---

## License

MIT
