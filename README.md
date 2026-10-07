# 🧭 Odyssey Scheduler

**Odyssey Scheduler — Task Management & WhatsApp Reminders**

An in-office task scheduler and automated WhatsApp reminder system for
**Odyssey Educational Foundation**. Administrators assign tasks to staff and the
system automatically sends WhatsApp notifications and reminders throughout each
task's lifecycle.

The only external communication service is **UltraMsg** (WhatsApp). There is **no
Google login, Google OAuth, Google Calendar, Gmail, email, or any other external
account** requirement anywhere in the system.

```
Admin → Odyssey Scheduler → UltraMsg → WhatsApp
```

---

## ✨ Features

- **Local admin authentication** — WhatsApp number + passcode (bcrypt-hashed), secure httpOnly cookie sessions. No external identity provider.
- **Admin dashboard** — Total, In Progress, Pending Approval, Completed, Overdue, Due Today, Due Soon and Assigned Today statistics, plus active tasks and recent activity.
- **Unlimited task creation** — assign any number of tasks; duration is auto-calculated from start and deadline.
- **Exactly three WhatsApp reminders per task**, each sent to **both** the task handler and the administrator:
  1. **On assignment** — immediately when the task is created.
  2. **One day before** the deadline (skipped for tasks shorter than 24 hours).
  3. **On the deadline**.
- **Background reminder engine** (node-cron, every minute) that runs on the server — independent of the browser.
- **Duplicate protection** — reminder flags are stored in the database, so notifications are sent **exactly once**, even across server restarts.
- **Completion workflow** — In Progress → Pending Approval → Completed. Approving a task permanently stops all its reminders.
- **Team management** — add, edit, activate/deactivate handlers. Historical tasks are always preserved.
- **Notification history** — every WhatsApp attempt is logged with delivery status (`SENT` / `FAILED` / `PENDING`), filterable by type and status.
- **Audit log** — logins, task lifecycle events, team changes, settings changes and WhatsApp outcomes.
- **Settings** — edit admin name, login WhatsApp number and passcode; configure the reminder interval; test the WhatsApp connection.
- **Africa/Lagos timezone** — all task times, deadlines and progress are computed in the configured timezone, regardless of the server's local timezone.
- **Responsive UI** — professional, lightweight Tailwind interface for desktop, tablet and mobile.
- **Installable PWA** — add Odyssey Scheduler to a phone or desktop home screen with an app icon, splash screen and full-screen (standalone) window. No app store required.
- **PostgreSQL database** — works with a free Neon database or local Docker; no paid hosting required.
- **Login rate-limiting** — repeated failed attempts are throttled to slow brute-force attacks.
- **Optional external cron endpoint** — `/api/cron/run` (secret-guarded) lets reminders run on hosts without a long-running process.
- **Database backup script** — `npm run db:backup` writes rotating timestamped PostgreSQL dumps.

---

## 🏗️ Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | Next.js 14 (App Router) + React 18 + Tailwind CSS |
| Backend    | Next.js API Routes (Node.js)            |
| Scheduler  | node-cron (started via `instrumentation.ts`) |
| Database   | PostgreSQL via Prisma ORM               |
| WhatsApp   | UltraMsg API (the only external service)|
| Auth       | bcryptjs + DB-backed httpOnly sessions  |

---

## 📁 Project Structure

```
odyssey-scheduler/
├── prisma/
│   ├── schema.prisma          # Settings, User, Session, Task, NotificationLog, AuditLog
│   └── seed.ts                # Seeds admin + 6 task handlers
├── scripts/
│   ├── smoke.ts               # End-to-end HTTP smoke test
│   ├── backup-db.ts           # PostgreSQL backup (pg_dump)
│   └── run-scheduler-once.ts  # One-off scheduler pass (external cron)
├── src/
│   ├── instrumentation.ts     # Boots bootstrap + cron scheduler with the server
│   ├── services/
│   │   └── ultramsgService.ts # UltraMsg WhatsApp service (send + retry)
│   ├── lib/
│   │   ├── auth.ts            # Sessions (httpOnly cookies)
│   │   ├── passwords.ts       # bcrypt hashing / credential checks
│   │   ├── api.ts             # Admin route guard
│   │   ├── audit.ts           # Audit log helper
│   │   ├── bootstrap.ts       # Idempotent first-boot seeding
│   │   ├── notifications.ts   # Message templates + logged sends
│   │   ├── scheduler.ts       # Reminder engine (pure planning + IO)
│   │   ├── serialize.ts       # Task serialization (progress/time remaining)
│   │   ├── taskService.ts     # Assignment notification helper
│   │   ├── time.ts            # Africa/Lagos timezone utilities
│   │   └── validation.ts      # Input validation
│   ├── components/
│   │   ├── AppShell.tsx / AppContext.tsx
│   │   ├── LoginForm.tsx
│   │   ├── dashboard/  tasks/  team/  notifications/  settings/  ui/
│   └── app/
│       ├── login/
│       ├── (app)/             # Authenticated shell: dashboard, tasks, team, notifications, settings
│       └── api/               # REST endpoints
├── tests/                     # Vitest unit tests
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── render.yaml
└── README.md
```

---

## ✅ Requirements

- **Node.js 18+** (Node 20 recommended)
- **npm**
- An **UltraMsg** account (free tier available) — [ultramsg.com](https://ultramsg.com)
- A **PostgreSQL database** — free at [neon.tech](https://neon.tech) (no card required) or via local Docker
- No Google account and no email account required.

---

## 🚀 Installation

```bash
npm install
```

## 🔧 Environment Configuration

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

```env
# Application
NODE_ENV=development
PORT=3000

# Database (PostgreSQL)
# Free cloud: Neon (https://neon.tech). Local Docker: the URL below.
DATABASE_URL="postgresql://odyssey:odyssey@localhost:5432/odyssey"

# Authentication (optional — sessions are random DB-backed tokens)
SESSION_SECRET="change-me-to-a-long-random-string"

# UltraMsg WhatsApp (the ONLY external integration)
ULTR_INSTANCE_ID=""
ULTRA_TOKEN=""

# Scheduler / timezone
TASK_REMINDER_INTERVAL_MINUTES=30
APP_TIMEZONE="Africa/Lagos"

# Optional: enable the /api/cron/run endpoint for external crons on
# hosts where the in-process scheduler cannot run continuously.
CRON_SECRET=""
```

> **Credentials are never exposed to the browser.** UltraMsg values are only read
> server-side. The `/api/whatsapp/status` endpoint returns a masked token.

## 🗄️ Database Setup

Point `DATABASE_URL` at a PostgreSQL database, then create the schema and seed the
default admin and task handlers:

```bash
npm run db:setup      # prisma db push + seed
```

Or separately:

```bash
npm run db:push       # apply the schema
npm run db:seed       # seed admin + handlers
npm run migrate       # create a migration during development
npm run db:backup     # dump the database (requires pg_dump)
```

### Seeded accounts

| Role          | Name                | WhatsApp          | Passcode    |
|---------------|---------------------|-------------------|-------------|
| Administrator | Engr. Mrs. Stella   | `+2348133226669`  | `Engstella` |
| Task handlers | Miss. Areta, Fortune, Emmanuel, Godwin, Stanley, Onyinye | *(seeded numbers)* | — |

## ▶️ Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the admin
credentials above. The reminder engine starts automatically with the server and
checks tasks every minute.

## 🧪 Testing

```bash
npm test              # unit tests (time, validation, auth, messages, scheduler)
```

End-to-end smoke test (start the server first):

```bash
npm start
npx tsx scripts/smoke.ts
```

The smoke test covers authentication, task creation, filtering, the reminder
engine, milestone/deadline duplicate protection, completion, approval, and logs.

## 🏭 Production

```bash
npm run build
npm start
```

### Docker (self-contained: app + PostgreSQL)

```bash
docker compose up --build
```

The database is persisted in the `odyssey-pgdata` Docker volume.

### Render (free tier + free Neon PostgreSQL)

`render.yaml` is included. It deploys the app on Render's **free** web service and
uses an **external PostgreSQL** database, so no paid disk or card is required.

1. Create a free PostgreSQL database at [neon.tech](https://neon.tech) (no card).
2. Copy its connection string (it looks like
   `postgresql://user:pass@ep-xxx.aws.neon.tech/neondb?sslmode=require`).
3. In Render, create a **Blueprint** from this repo and supply the prompts:

   | Variable           | Value                                   |
   |--------------------|-----------------------------------------|
   | `DATABASE_URL`     | Your Neon connection string             |
   | `ULTR_INSTANCE_ID` | UltraMsg instance ID                    |
   | `ULTRA_TOKEN`      | UltraMsg token                          |

   `CRON_SECRET` is generated automatically by the blueprint.

4. Deploy. The build pushes the schema, seeds the admin + handlers, then starts
   the server.

> **Free tier note:** Render's free service spins down when idle, which pauses the
> in-process scheduler. Keep it awake with a free uptime monitor (e.g.
> UptimeRobot) pinging `/api/health` every 5 minutes, or call the secret-guarded
> endpoint `/api/cron/run?secret=YOUR_CRON_SECRET` every minute from an external
> cron. The database itself is hosted on Neon, so data persists regardless.

---

## 📱 UltraMsg Setup

1. Create an account at [ultramsg.com](https://ultramsg.com).
2. Create an instance and link your WhatsApp number (scan the QR code).
3. Open the instance and copy the **Instance ID** and **Token**.
4. Put them in `.env`:

   ```env
   ULTR_INSTANCE_ID="your_instance_id"
   ULTRA_TOKEN="your_token"
   ```

5. In the app, go to **Settings → WhatsApp Integration → Send Test WhatsApp** to
   verify the connection. A test message is sent to the admin's WhatsApp number.

No Google or email account is needed at any point.

---

## 📲 Installing as an App (PWA)

Odyssey Scheduler is an installable Progressive Web App. Install it from the
browser on any device — no app store required.

**Android (Chrome):** open the site → tap the **Install** banner, or ⋮ menu →
**Add to Home screen**.

**iPhone / iPad (Safari):** open the site → **Share** → **Add to Home Screen**.

**Windows / macOS / Linux (Chrome/Edge):** click the **install** icon in the
address bar, or the **Install** banner.

Once installed it opens in its own full-screen window with the Odyssey icon, a
splash screen, and an offline notice if the connection drops. Tasks, approvals
and WhatsApp reminders all continue to work exactly as before.

- **Manifest:** `/manifest.webmanifest` (`src/app/manifest.ts`)
- **Service worker:** `/sw.js` (static asset caching + offline page)
- **Icons:** `public/icons/*` (regenerate with `scripts/generate-icons.ps1`)

---

## 🤖 How the Reminder Engine Works

`src/lib/scheduler.ts` runs every minute (node-cron, started by
`src/instrumentation.ts`). For every task with status **IN_PROGRESS** or
**OVERDUE**, exactly **three** automated notifications are sent — always to
**both** the assigned task handler and the administrator:

1. **On assignment** — sent immediately when the task is created.
2. **One day before the deadline** — sent once the task is within 24 hours of its
   deadline. This is **skipped automatically for tasks shorter than 24 hours**.
3. **On the deadline** — sent once when the deadline is reached; the task is then
   marked **OVERDUE**.

Duplicate protection uses the `dayBeforeReminderSent` and
`deadlineNotificationSent` flags on the task row. Because this state lives in the
database, **restarting the server never resends a notification** and the engine
resumes monitoring all active tasks automatically.

Approving a task sets it to **COMPLETED**, which removes it from the scheduler's
query and permanently stops all reminders.

### Progress & time remaining

```
Progress % = Elapsed Time / Total Task Duration × 100     (clamped to 0–100)
```

- Time remaining: `2 hours 15 minutes remaining`
- At the deadline: `Deadline reached`
- Past the deadline: `Overdue by 35 minutes`

---

## 🌍 Timezone

`APP_TIMEZONE` defaults to **Africa/Lagos**. Task start times and deadlines are
interpreted in this timezone (never the server's local timezone), and all display
and scheduling calculations use it. To change it, update `APP_TIMEZONE` and the
`timezone` value in the `Settings` row (seeded to `Africa/Lagos`).

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/api/auth/login` | Authenticate the administrator |
| POST   | `/api/auth/logout` | End the session |
| GET    | `/api/auth/session` | Current session |
| GET    | `/api/dashboard/stats` | Dashboard statistics + activity |
| GET    | `/api/tasks` | List/filter/paginate tasks |
| POST   | `/api/tasks` | Create + assign a task (sends WhatsApp) |
| GET    | `/api/tasks/:id` | Task detail |
| PATCH  | `/api/tasks/:id` | Edit, or action `complete`/`approve`/`cancel`/`reopen` |
| DELETE | `/api/tasks/:id` | Delete a task |
| POST   | `/api/tasks/:id/complete` | Mark finished → pending approval |
| POST   | `/api/tasks/:id/approve` | Approve → completed (stops reminders) |
| POST   | `/api/tasks/:id/cancel` | Cancel a task |
| GET    | `/api/team` | List task handlers |
| POST   | `/api/team` | Add a task handler |
| PATCH  | `/api/team/:id` | Edit / activate / deactivate a handler |
| DELETE | `/api/team/:id` | Remove or deactivate a handler |
| GET    | `/api/notifications` | Notification history (filters) |
| GET    | `/api/logs` | Audit log |
| GET    | `/api/settings` | Settings + WhatsApp status |
| PATCH  | `/api/settings` | Update admin profile / reminder interval |
| POST   | `/api/whatsapp/test` | Send a test WhatsApp |
| GET    | `/api/whatsapp/status` | UltraMsg integration status |
| GET    | `/api/cron/run` | Run one scheduler pass (requires `CRON_SECRET`) |
| GET    | `/api/health` | Health check |

---

## 🔐 Security

- Passcodes are hashed with **bcrypt**; the plaintext is never stored.
- Sessions use **httpOnly, sameSite=lax** cookies with 7-day expiry, backed by the database.
- All API routes require an authenticated, active administrator (except login/health).
- UltraMsg credentials are read only from environment variables and never sent to the browser.
- `.env` is git-ignored — never commit real credentials.

---

## 💰 Cost

| Service | Cost |
|---------|------|
| PostgreSQL database (Neon free tier) | Free |
| UltraMsg WhatsApp | Free tier available |
| Hosting | Your choice (Render free tier, Docker, VPS, …) |

---

## 📄 License

Built for Odyssey Educational Foundation. Internal use.
