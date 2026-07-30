# 🏰 Smart Hostel Management System

A full-stack hostel management web application built with **Node.js**, **Express**, and **vanilla JavaScript**. Features block-based login, Excel data sync, complaint escalation, gate pass QR codes, parent email/IVR verification, and an admin analytics dashboard.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start
```

Open **http://localhost:3000** in your browser.

---

## 🔑 Demo Credentials

| Role    | User ID   | Password      | Block |
|---------|-----------|---------------|-------|
| Student | STU1001   | nevermore123  | GH1   |
| Student | STU1002   | pass123       | GH1   |
| Admin   | ADMIN01   | ravens@123    | —     |

---

## ✨ Features

### 🏢 Block-Based Login
- Home page shows hostel blocks: **GH1, GH2, BH1, BH2**
- Students must select their block before logging in
- Backend validates `user.block === selectedBlock`
- Admins bypass block check via dedicated "Admin Login" link

### 📊 Excel Integration
- Upload student/admin credentials via `.xlsx` — creates or updates users instantly
- Upload mess menu via Excel — full weekly replace
- Export data to Excel: Users, Complaints, Gate Pass, Full Report (6 sheets)

### 🛠 Complaint Management
- Priority levels 1–5 with color coding
- Admin assigns assurance dates per complaint
- **Escalation cron job** (runs hourly) — emails higher authority when assurance date passes and complaint is unresolved
- Search and filter complaints by room, student, type

### 🚪 Gate Pass with Parent Verification
- Student submits gate pass request
- Admin initiates **simulated IVR call** (or real Twilio in production)
- Parent presses 1 (approve) or 2 (reject) on call screen
- Also supports **email-based approval** with approve/reject links
- Approved passes generate a **QR code** digital gate pass

### 🗓 Leave Management
- Student submits leave with from/to dates
- Parent approves via link, admin gives final approval
- Date validation (to ≥ from) on both client and server

### 🛏 Room Swap
- Students request room changes with reason
- Admin approves/rejects with search and status filter

### 🍽 Mess Menu
- Weekly schedule displayed in table format with today's row highlighted
- Admin can update individual days or replace full week via Excel upload
- Today's menu preview shown on student dashboard

### 📅 Holidays
- Admin adds/edits/deletes holiday notices
- Students view in card grid and table format

### ⭐ Food Feedback
- Star rating (1–5) + comment system
- Admin view with rating filter and average score summary
- Feedback wall for students

### 📊 Admin Dashboard
- **Clickable stat cards** — opens detail modal with full data table
- **Export buttons** — download any dataset as Excel
- Analytics charts: complaint mix (pie), monthly leave (bar), rating distribution (bar)
- Recent activity feed across all modules

---

## 🗂 Project Structure

```
Smart Hostel/
├── backend/
│   ├── server.js          # Express API + all routes
│   ├── escalation.js      # Cron-based complaint escalation
│   ├── mailer.js          # Nodemailer transport
│   ├── data/store.json    # JSON data store
│   └── uploads/           # Temp folder for Excel uploads
├── frontend/
│   ├── index.html         # Landing / block selection
│   ├── login.html         # Login page
│   ├── dashboard.html     # Student dashboard
│   ├── admin.html         # Admin dashboard
│   ├── complaint.html     # Complaint form + history
│   ├── gatepass.html      # Gate pass form + status
│   ├── leave.html         # Leave request form
│   ├── roomswap.html      # Room swap form
│   ├── mess-menu.html     # Weekly menu table
│   ├── holidays.html      # Holiday calendar
│   ├── feedback.html      # Food feedback
│   ├── parent-approval.html          # Parent approve/reject page
│   ├── parent-approval-confirm.html  # Confirmation after email link click
│   ├── admin-*.html       # All admin management pages
│   ├── css/style.css      # Nevermore dark theme
│   └── js/script.js       # All frontend logic
├── package.json
└── README.md
```

---

## ⚙️ Configuration

Copy `backend/.env.example` to `backend/.env` and fill in your values:

```env
PORT=3000
APP_BASE_URL=http://localhost:3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_app_password
ESCALATION_EMAIL=warden@hostel.edu
```

### Optional — Real Twilio IVR
Add to `.env` to enable real phone calls for gate pass verification:
```env
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

---

## 📡 API Reference

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/login` | Login with block validation |
| GET | `/api/me/:userId` | Get user profile |
| GET | `/api/mess-menu` | Weekly mess menu |
| PUT | `/api/mess-menu/:day` | Update one day |
| POST | `/api/mess-menu/upload` | Excel upload (full replace) |
| POST | `/api/users/upload` | Excel upload for users |
| GET/POST | `/api/complaints` | List / submit complaint |
| PATCH | `/api/complaints/:id` | Update status / assurance date |
| GET/POST | `/api/gatepass` | List / submit gate pass |
| POST | `/api/gatepass/:id/ivr` | IVR keypress (approve/reject) |
| POST | `/api/gatepass/:id/call` | Initiate parent call |
| GET/POST | `/api/leave` | List / submit leave request |
| PATCH | `/api/leave/:id` | Admin approve/reject leave |
| GET/POST | `/api/room-swap` | List / submit room swap |
| GET/POST | `/api/feedback` | List / submit feedback |
| GET/POST | `/api/holidays` | List / add holiday |
| PUT/DELETE | `/api/holidays/:id` | Edit / delete holiday |
| GET | `/api/parent-approval/:type/:token` | Parent approval page data |
| POST | `/api/parent-approval/:type/:token` | Record parent decision |
| GET | `/api/admin/stats` | Dashboard statistics |
| GET | `/api/admin/overview` | All data for admin pages |
| GET | `/api/export/users` | Download users Excel |
| GET | `/api/export/complaints` | Download complaints Excel |
| GET | `/api/export/gatepass` | Download gate pass Excel |
| GET | `/api/export/full-report` | Download full report (6 sheets) |
| GET | `/api/health` | Server health check |

---

## 🛠 Tech Stack

- **Backend:** Node.js, Express.js
- **Data:** JSON flat-file store (`store.json`)
- **Excel:** `xlsx` (SheetJS)
- **QR Code:** `qrcode`
- **Email:** `nodemailer`
- **Scheduling:** `node-cron`
- **File Upload:** `multer`
- **Frontend:** Vanilla HTML/CSS/JS
- **Charts:** Chart.js (CDN)
- **Theme:** Nevermore dark UI

---

## 📸 Pages

| Page | Description |
|------|-------------|
| `/` | Block selection portal with animated door |
| `/login.html` | Login with block badge |
| `/dashboard.html` | Student home with live clock + today's menu |
| `/complaint.html` | Submit & track complaints |
| `/gatepass.html` | Gate pass request + QR code display |
| `/leave.html` | Leave application + history table |
| `/roomswap.html` | Room change request |
| `/mess-menu.html` | Weekly menu with today highlight |
| `/holidays.html` | Holiday calendar (grid + table) |
| `/feedback.html` | Star rating + feedback wall |
| `/admin.html` | Dashboard with charts, stats, export |
| `/admin-complaints.html` | Manage complaints with search + escalation |
| `/admin-gatepass.html` | Gate pass queue with IVR call screen |
| `/admin-leave.html` | Leave approval with search + filter |
| `/admin-roomswap.html` | Room swap management |
| `/admin-holidays.html` | Add/edit/delete holidays |
| `/admin-mess.html` | Menu update + Excel upload |
| `/admin-feedback.html` | Reviews with rating filter |
| `/parent-approval.html` | Parent approve/reject via email link |

---

## 📄 License

MIT
