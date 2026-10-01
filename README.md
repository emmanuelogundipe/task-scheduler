# 📋 OfficeTask — In-Office Task Scheduler & Automated Reminder System

A production-ready, lightweight web application for assigning in-office tasks to team
handlers and automatically reminding everyone until work is approved.

## ✨ Features

- **Admin login** — passcode + WhatsApp verification (default: `Engstella` / `+2348133226669`)
- **Unlimited task creation** — assign any number of tasks to any active handler
- **Instant WhatsApp notification** to the handler the moment a task is assigned
- **Google Calendar events** created automatically for every task
- **Background cron engine (every minute)** that:
  - Sends periodic WhatsApp status reminders to the handler
  - Alerts the admin at **50%** and **70%** of elapsed task duration
  - At **100% deadline**: sends the admin a WhatsApp alert **+ email** (Nodemailer) **+ Google Calendar alert event**
- **Approval workflow** — In Progress → Pending Approval → Completed; approving a task instantly halts all its reminders
- **Settings module** — manage handlers (add/edit/delete), update admin profile, link/relink Google Calendar
- **Full notification audit log** (every WhatsApp/email/calendar call is recorded)

## 🏗️ Tech Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | Next.js 14 (App Router) + React 18 + Tailwind CSS |
| Backend   | Next.js API Routes (Node.js) |
| Scheduler | node-cron (started via `instrumentation.ts`) |
| Database  | SQLite via Prisma ORM |
| WhatsApp  | UltraMsg API (swap-ready for Twilio / WhatsApp Business API) |
| Email     | Nodemailer (SMTP) |
| Calendar  | Google Calendar API (`googleapis`, OAuth2) |

## 📁 Project Structure

```
task-scheduler/
├── .env.example                  # Environment variable template
├── src/
│   ├── instrumentation.ts       # Starts the cron scheduler with the server
├── prisma/
│   ├── schema.prisma            # Admin, Session, Handler, Task, Log tables
│   └── seed.ts                  # Seeds admin + 6 task handlers
├── src/
│   ├── instrumentation.ts       # Starts the cron scheduler with the server
│   ├── app/
│   │   ├── page.tsx             # Landing screen (admin login)
│   │   ├── layout.tsx / globals.css
│   │   ├── dashboard/page.tsx   # Admin dashboard
│   │   ├── settings/page.tsx    # Settings page
│   │   └── api/
│   │       ├── auth/login|logout
│   │       ├── tasks/           # GET list, POST create (WhatsApp + Calendar)
│   │       ├── tasks/[id]/      # PATCH submit / approve
│   │       ├── handlers/        # GET, POST
│   │       ├── handlers/[id]/   # PUT, DELETE
│   │       ├── settings/        # GET, PUT admin profile
│   │       ├── google/auth|callback|status
│   │       └── test/whatsapp|email
│   ├── components/              # LoginForm, DashboardClient, TaskForm,
│   │                            # TaskCard, SettingsClient
│   └── lib/
│       ├── prisma.ts            # Prisma singleton
│       ├── auth.ts              # Session management (httpOnly cookie)
│       ├── whatsapp.ts          # UltraMsg service
│       ├── email.ts             # Nodemailer service
│       ├── googleCalendar.ts    # OAuth2 + event creation
│       ├── notifications.ts     # Logged notification helpers
│       └── scheduler.ts         # node-cron engine (50%/70%/100% logic)
```

## 🚀 Local Deployment — Step by Step

### 1. Install & configure

```bash
cd task-scheduler
npm install          # also runs `prisma generate` automatically
cp .env.example .env # then edit .env with your credentials
```

### 2. Create the database & seed it

```bash
npm run db:setup     # prisma db push + seed (admin + 6 handlers)
```

### 3. Run

```bash
npm run dev          # http://localhost:3000
```

Log in with the seeded admin credentials:

| Field    | Value            |
|----------|------------------|
| Passcode | `Engstella`      |
| WhatsApp | `+2348133226669` |

### 4. Production

```bash
npm run build
npm start
```

---

## 🔌 Integration Setup

### WhatsApp — UltraMsg

1. Create an account at [ultramsg.com](https://ultramsg.com).
2. Add an instance and link a WhatsApp number (QR scan).
3. Copy the **Instance ID** and **Token** from the dashboard.
4. Set `ULTRA_INSTANCE_ID` and `ULTRA_TOKEN` in `.env`.
5. Verify with **Settings → Send Test WhatsApp**.

> To use Twilio / WhatsApp Business API instead, replace the body of
> `src/lib/whatsapp.ts` — keep the `sendWhatsApp(to, body)` signature.

### Email — Nodemailer SMTP

1. For Gmail: enable 2FA and create an **App Password** at myaccount.google.com/apppasswords.
2. Set in `.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=you@gmail.com
   SMTP_PASS=your-app-password
   EMAIL_FROM="Task Scheduler <you@gmail.com>"
   ```
3. Verify with **Settings → Send Test Email**.

### Google Calendar — OAuth2

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create a project.
2. **APIs & Services → Library → enable "Google Calendar API"**.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** (Web application).
4. Add an **Authorized redirect URI** matching `GOOGLE_REDIRECT_URI` in `.env`
   (default: `http://localhost:3000/api/google/callback`).
5. Copy the **Client ID** and **Client Secret** into `.env`.
6. In the app: **Settings → Connect Google Calendar** → approve consent.
7. Use **Re-link Account** any time to refresh tokens.

---

## 🔐 Changing the Admin Passcode

**Settings → Admin Profile → New Passcode → Save Profile.**
The next login requires the new passcode together with the admin WhatsApp number.

## ⚙️ How the Reminder Engine Works

`src/lib/scheduler.ts` runs every minute (node-cron, started by `instrumentation.ts`):

1. Fetches all `IN_PROGRESS` tasks.
2. Every `REMINDER_INTERVAL_MIN` (default 30) minutes → WhatsApp reminder to the handler.
3. At ≥50% elapsed → WhatsApp alert to admin (`milestone50` flag prevents duplicates).
4. At ≥70% elapsed → WhatsApp alert to admin (`milestone70` flag).
5. At ≥100% → WhatsApp + email + calendar alert to admin (`deadlineNotified` flag).
6. Clicking **Done / Approved** sets the task to `COMPLETED`, removing it from the
   scheduler's query — all future reminders stop immediately.

Every notification is recorded in the `Log` table for auditing.

## 🛡️ Security Notes

- Sessions use `httpOnly`, `sameSite=lax` cookies with 7-day expiry.
- All API routes require an authenticated admin session.
- Store real credentials in `.env` (never committed — see `.gitignore`).
- For production, serve over HTTPS and set a strong admin passcode.
