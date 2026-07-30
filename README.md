# Smart Hostel Management System

A full-stack hostel management web application built with **Node.js**, **Express**, and **Vanilla JavaScript**, featuring a dark Nevermore-themed UI.

## Features

- **Block-Based Login** — Students select their block (GH1/GH2/BH1/BH2) before logging in. Backend validates the block matches their registered record.
- **Excel User Sync** — Admin uploads `.xlsx` to create/update student and admin accounts instantly.
- **Mess Menu Management** — Weekly menu uploaded via Excel or edited manually. Students see today's menu highlighted.
- **Complaint System** — Students submit complaints with type, priority (1–5), and description. Admin assigns assurance dates and updates status. Overdue complaints are auto-escalated via email.
- **Gate Pass with IVR** — Students apply for gate passes. Admin initiates a simulated IVR call for parent verification. Approved passes generate a QR code.
- **Parent Email Approval** — Approve/reject links sent to parent email for gate pass and leave requests.
- **Leave Requests** — Students apply for leave with date range. Requires parent + admin approval.
- **Room Swap** — Students request room changes. Admin approves/rejects.
- **Holiday Calendar** — Admin manages holiday list. Students view dynamically.
- **Food Feedback** — Star ratings and comments. Admin views all feedback.
- **Admin Dashboard** — Clickable stat cards with detail modals, charts (Chart.js), recent activity log, and Excel export for all data.
- **Data Export** — Download Users, Complaints, Gate Pass, or Full Report as `.xlsx`.

## Tech Stack

| Layer    | Technology |
|----------|------------|
| Backend  | Node.js, Express.js |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Storage  | JSON flat-file store (`store.json`) |
| Excel    | xlsx (SheetJS) |
| QR Code  | qrcode |
| Email    | Nodemailer |
| Scheduler| node-cron |
| Charts   | Chart.js (CDN) |

## Getting Started

### Prerequisites
- Node.js v18+

### Installation

```bash
git clone https://github.com/Pavithra406/Smart-Hostel.git
cd Smart-Hostel
npm install
```

### Configuration

Copy `.env.example` to `.env` and fill in your SMTP details:

```env
PORT=3000
APP_BASE_URL=http://localhost:3000
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=yourpassword
ESCALATION_EMAIL=warden@example.com
```

### Run

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000)

## Demo Credentials

| Role    | User ID  | Password      | Block |
|---------|----------|---------------|-------|
| Student | STU1001  | nevermore123  | GH1   |
| Student | STU1002  | pass123       | GH1   |
| Admin   | ADMIN01  | ravens@123    | —     |

> Admin login: click **"Admin Login →"** on the home page (no block selection needed).

## Project Structure

```
Smart-Hostel/
├── backend/
│   ├── server.js          # Express server + all API routes
│   ├── escalation.js      # Cron-based complaint escalation
│   ├── mailer.js          # Nodemailer transporter
│   └── data/
│       └── store.json     # JSON data store
├── frontend/
│   ├── index.html         # Landing page (block selection)
│   ├── login.html         # Login page
│   ├── dashboard.html     # Student dashboard
│   ├── admin.html         # Admin dashboard
│   ├── complaint.html     # Complaint form + history
│   ├── gatepass.html      # Gate pass application
│   ├── leave.html         # Leave request form
│   ├── roomswap.html      # Room swap request
│   ├── mess-menu.html     # Weekly mess menu
│   ├── holidays.html      # Holiday calendar
│   ├── feedback.html      # Food feedback
│   ├── parent-approval.html        # Parent approval page
│   ├── parent-approval-confirm.html # Post-approval confirmation
│   ├── admin-*.html       # Admin management pages
│   ├── css/style.css      # Global dark theme stylesheet
│   └── js/script.js       # All frontend logic
└── package.json
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | Authenticate user |
| GET | `/api/me/:userId` | Get user profile |
| GET | `/api/mess-menu` | Get weekly menu |
| POST | `/api/complaints` | Submit complaint |
| PATCH | `/api/complaints/:id` | Update complaint status/date |
| GET | `/api/gatepass` | List gate passes |
| POST | `/api/gatepass` | Submit gate pass |
| POST | `/api/gatepass/:id/ivr` | IVR keypress (approve/reject) |
| GET | `/api/leave` | List leave requests |
| POST | `/api/leave` | Submit leave request |
| GET | `/api/holidays` | List holidays |
| POST | `/api/holidays` | Add holiday |
| GET | `/api/export/users` | Export students as Excel |
| GET | `/api/export/complaints` | Export complaints as Excel |
| GET | `/api/export/full-report` | Export full report (6 sheets) |
| GET | `/api/admin/stats` | Dashboard statistics |
| GET | `/api/admin/overview` | Full data overview |

## License

MIT
