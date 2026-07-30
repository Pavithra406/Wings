<div align="center">

<h1>🏰 Smart Hostel Management System</h1>

<p>A full-stack hostel management web application with block-based login, Excel data sync, complaint escalation, gate pass QR codes, parent IVR/email verification, and an admin analytics dashboard.</p>

<p>
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express.js-4.x-000000?style=flat-square&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?style=flat-square&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/License-MIT-purple?style=flat-square" />
  <img src="https://img.shields.io/badge/Theme-Nevermore%20Dark-7c3aed?style=flat-square" />
</p>

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Screenshots / Pages](#-pages)
- [Quick Start](#-quick-start)
- [Demo Credentials](#-demo-credentials)
- [Project Structure](#-project-structure)
- [Configuration](#-configuration)
- [API Reference](#-api-reference)
- [Tech Stack](#-tech-stack)
- [Workflows](#-workflows)
- [Excel Formats](#-excel-formats)
- [License](#-license)

---

## 🎯 Overview

The Smart Hostel Management System is a complete web-based solution for managing hostel operations. It covers everything from student authentication by hostel block, daily mess menu display, complaint tracking with automated escalation, gate pass requests with parent verification, leave management, room swap requests, and holiday notices — all under a single admin dashboard.

**Key highlights:**
- 🔐 Block-based login — students can only log in to their registered block (GH1/GH2/BH1/BH2)
- 📊 Excel import/export — manage users and menus via spreadsheet, export reports anytime
- 📞 IVR simulation — admin initiates a phone verification call, parent presses 1/2 to approve/reject
- 📧 Email approval — parent receives approve/reject links via email
- 🎫 QR code gate pass — approved gate passes generate a scannable digital pass
- ⚠️ Auto escalation — unresolved overdue complaints trigger automatic email to higher authority
- 📈 Analytics dashboard — charts, clickable stat cards, and full data export

---

## ✨ Features

### 🏢 Block-Based Login System
- Landing page with an animated door opens to a **block selector** (GH1, GH2, BH1, BH2)
- Selected block is stored in `localStorage` and shown on the login page
- Backend validates that `student.block === selectedBlock` — mismatch denies login
- Admin login bypasses block check via a dedicated "Admin Login →" link

### 👥 Excel-Based User Management
- Admin uploads `.xlsx` file with columns: `role`, `name`, `userId`, `password`, `roomNumber`, `block`, `parentPhone`, `parentEmail`
- Existing users (matched by `userId`) are updated; new ones are created
- Block values are validated against the allowed list — invalid rows are skipped with a report
- Passwords are auto-generated if not provided

### 📝 Auto-Fill Forms
- After login, student data is stored in `localStorage`
- Complaint, Gate Pass, Leave, and Room Swap forms auto-fill name and room number (read-only)
- No manual re-entry needed across any page

### 🛠 Complaint Management
| Feature | Detail |
|---------|--------|
| Complaint types | Electrical, Plumbing, Furniture, Water, Other |
| Priority | 1 (Low) → 5 (Critical), color-coded |
| Status flow | Pending → In Progress → Resolved |
| Assurance date | Admin sets deadline per complaint |
| Escalation | Hourly cron job emails higher authority for overdue unresolved complaints |
| Admin search | Live search by room, student name, or type |
| Overdue badge | Complaints past assurance date are marked ⚠ Overdue in red |

### 🚪 Gate Pass with Dual Verification
**Flow:**
1. Student submits gate pass (name, room, out time, return time, reason)
2. Admin opens the gate pass queue
3. Admin clicks **Send Parent Verification** → simulated IVR call opens
4. Parent presses `1` to approve or `2` to reject
5. Alternatively, admin can send an **email** with approve/reject links
6. Once parent approves, admin gives final approval
7. Approved gate pass generates a **QR code** digital pass

> 💡 To enable real Twilio phone calls, add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` to `.env`

### 🗓 Leave Management
- Students apply for leave with from/to dates and reason
- Date validation enforced on both client and server (to ≥ from)
- Parent approval via link, then admin final approval
- Admin queue with live search and status filter (Pending/Approved/Rejected)

### 🛏 Room Swap
- Students request room change with reason
- Admin approves/rejects
- Search by room number + status filter

### 🍽 Mess Menu
- Weekly schedule in a styled table — today's row is highlighted automatically
- Admin updates individual days or uploads a full Excel replacement
- Student dashboard shows **today's menu preview** at the top
- Last updated timestamp shown

### 📅 Holidays
- Admin adds, edits, and deletes holiday entries
- Students see a card grid + sortable table view
- Sorted by date automatically

### ⭐ Food Feedback
- Star rating (1–5) with comment
- Student feedback wall showing all reviews
- Admin view with **rating filter** and **average score display**
- Google Form links for official detailed feedback

### 📊 Admin Dashboard
- **5 clickable stat cards** — each opens a modal with the full data table
- **4 export buttons** — download Users, Complaints, Gate Pass, or Full Report (6-sheet Excel)
- **3 analytics charts** — complaint status pie, monthly leave bar, rating distribution bar
- **Recent activity feed** — last 10 operations across all modules, sorted by time

---

## 📸 Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing | Animated door + block selector (GH1/GH2/BH1/BH2) |
| `/login.html` | Login | Login form with selected block badge |
| `/dashboard.html` | Student Home | Live clock, today's menu, quick access cards |
| `/complaint.html` | Complaints | Submit + track with priority and assurance date |
| `/gatepass.html` | Gate Pass | Request form + QR code digital pass |
| `/leave.html` | Leave | Application form + history table |
| `/roomswap.html` | Room Swap | Change room request |
| `/mess-menu.html` | Mess Menu | Weekly schedule with today highlighted |
| `/holidays.html` | Holidays | Card grid + sortable table |
| `/feedback.html` | Feedback | Star rating, feedback wall, Google Forms |
| `/parent-approval.html` | Parent Portal | Approve/reject gate pass or leave via email link |
| `/parent-approval-confirm.html` | Confirmed | Result page after parent clicks email link |
| `/admin.html` | Admin Dashboard | Stats, charts, export, activity feed |
| `/admin-complaints.html` | Manage Complaints | Search, assurance dates, escalation indicators |
| `/admin-gatepass.html` | Gate Pass Queue | IVR call screen, approval timeline |
| `/admin-leave.html` | Leave Queue | Search + status filter, approve/reject |
| `/admin-roomswap.html` | Room Swaps | Search + status filter |
| `/admin-mess.html` | Mess Menu | Day editor + Excel upload |
| `/admin-holidays.html` | Holidays | Add/edit/delete notices |
| `/admin-feedback.html` | Feedback | Rating filter, average score summary |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Pavithra406/Smart-Hostel.git
cd Smart-Hostel

# 2. Install dependencies
npm install

# 3. Configure environment
copy backend\.env.example backend\.env
# Edit backend/.env with your SMTP and app settings

# 4. Start the server
npm start
```

Open **http://localhost:3000** in your browser.

For development with auto-restart:
```bash
npm run dev
```

---

## 🔑 Demo Credentials

| Role    | User ID  | Password     | Block | Notes |
|---------|----------|--------------|-------|-------|
| Student | STU1001  | nevermore123 | GH1   | Full profile with parent info |
| Student | STU1002  | pass123      | GH1   | Pavithra |
| Student | STU1003  | pass456      | GH1   | Subitha |
| Admin   | ADMIN01  | ravens@123   | —     | Use "Admin Login →" link on home page |

> **Note:** Select block **GH1** on the home page before logging in as a student.

---

## 🗂 Project Structure

```
Smart-Hostel/
│
├── backend/
│   ├── server.js              # Express app — all API routes, export, IVR, escalation
│   ├── escalation.js          # node-cron job for overdue complaint emails
│   ├── mailer.js              # Nodemailer SMTP transport
│   ├── .env                   # ⚠ Local only — not committed
│   ├── .env.example           # Template for environment variables
│   ├── data/
│   │   └── store.json         # ⚠ Local only — JSON flat-file database
│   └── uploads/               # Temp storage for Excel uploads (auto-cleared)
│
├── frontend/
│   ├── css/
│   │   └── style.css          # Nevermore dark theme — all styles
│   ├── js/
│   │   └── script.js          # All frontend logic — page router, API calls, UI
│   │
│   ├── index.html             # Landing — animated door + block selection
│   ├── login.html             # Login with block badge
│   ├── dashboard.html         # Student dashboard — clock, menu preview, cards
│   ├── complaint.html         # Complaint form + history list
│   ├── gatepass.html          # Gate pass form + QR code display
│   ├── leave.html             # Leave request + history table
│   ├── roomswap.html          # Room swap request
│   ├── mess-menu.html         # Weekly menu table
│   ├── holidays.html          # Holiday grid + table
│   ├── feedback.html          # Star rating + feedback wall + Google Forms
│   ├── parent-approval.html          # Parent approval portal (email link)
│   ├── parent-approval-confirm.html  # Post-approval confirmation
│   │
│   ├── admin.html             # Admin dashboard — stats, charts, export
│   ├── admin-complaints.html  # Complaint management
│   ├── admin-gatepass.html    # Gate pass queue + IVR call screen
│   ├── admin-leave.html       # Leave approval queue
│   ├── admin-roomswap.html    # Room swap queue
│   ├── admin-mess.html        # Mess menu editor + Excel upload
│   ├── admin-holidays.html    # Holiday management
│   └── admin-feedback.html    # Feedback review
│
├── package.json
├── package-lock.json
└── README.md
```

---

## ⚙️ Configuration

Copy the example file and fill in your values:

```bash
copy backend\.env.example backend\.env
```

```env
# Server
PORT=3000
APP_BASE_URL=http://localhost:3000

# Email (SMTP) — required for parent verification emails and escalation alerts
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password        # Use a Gmail App Password, not your main password
ESCALATION_EMAIL=warden@hostel.edu # Gets emailed when complaints are overdue
```

### Gmail Setup
1. Enable 2-Factor Authentication on your Google account
2. Go to **Google Account → Security → App Passwords**
3. Generate a password for "Mail" and paste it as `SMTP_PASS`

### Optional — Real Twilio IVR Calls
When these are set, the system makes actual phone calls to parents instead of simulating:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

---

## 📡 API Reference

### Authentication
| Method | Route | Body | Description |
|--------|-------|------|-------------|
| `POST` | `/api/login` | `{ userId, password, selectedBlock }` | Login — validates block for students |
| `GET` | `/api/me/:userId` | — | Get user profile (no password) |

### Mess Menu
| Method | Route | Body | Description |
|--------|-------|------|-------------|
| `GET` | `/api/mess-menu` | — | Get full weekly menu + last updated |
| `PUT` | `/api/mess-menu/:day` | `{ breakfast, lunch, dinner }` | Update one day |
| `POST` | `/api/mess-menu/upload` | FormData (`menuFile`) | Excel upload — full replace |

### Users
| Method | Route | Body | Description |
|--------|-------|------|-------------|
| `POST` | `/api/users/upload` | FormData (`usersFile`) | Excel upload — create/update users |
| `GET` | `/api/users` | — | List all students (for dashboard modal) |

### Complaints
| Method | Route | Body | Description |
|--------|-------|------|-------------|
| `GET` | `/api/complaints` | — | List all complaints |
| `POST` | `/api/complaints` | `{ studentName, roomNumber, complaintType, issueDescription, priority }` | Submit complaint |
| `PATCH` | `/api/complaints/:id` | `{ status?, assuranceDate? }` | Update status or assurance date |

### Gate Pass
| Method | Route | Body | Description |
|--------|-------|------|-------------|
| `GET` | `/api/gatepass` | — | List all gate passes |
| `POST` | `/api/gatepass` | `{ studentName, roomNumber, outTime, returnTime, reason, parentPhone }` | Submit gate pass |
| `GET` | `/api/gatepass/:id/ivr` | — | Get gate pass data for IVR screen |
| `POST` | `/api/gatepass/:id/call` | — | Initiate parent call (simulated or Twilio) |
| `POST` | `/api/gatepass/:id/ivr` | `{ key: "1" or "2" }` | Record parent keypress |
| `PATCH` | `/api/gatepass/:id/status` | `{ status }` | Admin approve/reject |
| `POST` | `/api/gatepass/:id/email-verify` | — | Send parent verification email |
| `GET` | `/api/gatepass/:id/parent-action` | query: `action`, `token` | Parent clicks email link |

### Leave
| Method | Route | Body | Description |
|--------|-------|------|-------------|
| `GET` | `/api/leave` | — | List all leave requests |
| `POST` | `/api/leave` | `{ studentName, roomNumber, fromDate, toDate, reason }` | Submit leave |
| `PATCH` | `/api/leave/:id` | `{ status }` | Admin approve/reject |

### Room Swap
| Method | Route | Body | Description |
|--------|-------|------|-------------|
| `GET` | `/api/room-swap` | — | List all swap requests |
| `POST` | `/api/room-swap` | `{ currentRoomNumber, requestedRoomNumber, reason }` | Submit request |
| `PATCH` | `/api/room-swap/:id` | `{ status }` | Admin approve/reject |

### Feedback
| Method | Route | Body | Description |
|--------|-------|------|-------------|
| `GET` | `/api/feedback` | — | List all feedback |
| `POST` | `/api/feedback` | `{ rating, comment }` | Submit feedback |

### Holidays
| Method | Route | Body | Description |
|--------|-------|------|-------------|
| `GET` | `/api/holidays` | — | List all holidays (sorted by date) |
| `POST` | `/api/holidays` | `{ holidayName, holidayDate, description }` | Add holiday |
| `PUT` | `/api/holidays/:id` | `{ holidayName?, holidayDate?, description? }` | Edit holiday |
| `DELETE` | `/api/holidays/:id` | — | Delete holiday |

### Parent Approval
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/parent-approval/:type/:token` | Get request details for parent page |
| `POST` | `/api/parent-approval/:type/:token` | Record parent decision (`approve`/`reject`) |

### Admin
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/admin/stats` | Dashboard statistics (counts, charts data) |
| `GET` | `/api/admin/overview` | All data for admin management pages |

### Export
| Method | Route | Downloads |
|--------|-------|-----------|
| `GET` | `/api/export/users` | `users.xlsx` — all students |
| `GET` | `/api/export/complaints` | `complaints.xlsx` — with priority, assurance dates |
| `GET` | `/api/export/gatepass` | `gatepass.xlsx` — all gate pass records |
| `GET` | `/api/export/full-report` | `full-report.xlsx` — 6 sheets (Students, Complaints, Gate Passes, Leaves, Room Swaps, Feedback) |

### System
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/health` | Server health — uptime and timestamp |

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js 18+ | Server environment |
| Framework | Express.js 4.x | HTTP routing and middleware |
| Data Store | JSON flat-file (`store.json`) | Lightweight persistent storage |
| Excel | SheetJS (`xlsx`) | Import and export `.xlsx` files |
| QR Code | `qrcode` | Generate gate pass QR codes |
| Email | `nodemailer` | SMTP — parent verification + escalation |
| Scheduling | `node-cron` | Hourly escalation job |
| File Upload | `multer` | Handle Excel file uploads |
| IVR | Twilio Programmable Voice (optional) | Real parent phone calls |
| Frontend | Vanilla HTML / CSS / JS | No framework dependency |
| Charts | Chart.js (CDN) | Admin dashboard analytics |
| Fonts | Google Fonts (Cinzel + Manrope) | UI typography |
| Theme | Custom dark CSS | Nevermore / Wednesday aesthetic |

---

## 🔄 Workflows

### Student Gate Pass Flow
```
Student submits request
       ↓
Admin opens Gate Pass queue
       ↓
Admin clicks "Send Parent Verification"
       ↓
IVR call opens (simulated / real Twilio)
       ↓
Parent presses 1 (Approve) or 2 (Reject)
       ↓
Admin gives final admin approval
       ↓
QR Code generated → Student sees digital gate pass
```

### Complaint Escalation Flow
```
Student submits complaint
       ↓
Admin sets Assurance Date
       ↓
Cron job runs every hour
       ↓
If (status ≠ Resolved AND assuranceDate < now)
       ↓
Email sent to ESCALATION_EMAIL
complaint.escalated = true (no repeat emails)
```

### Excel User Upload Flow
```
Admin prepares .xlsx with columns:
role | name | userId | password | roomNumber | block | parentPhone | parentEmail
       ↓
Admin uploads via Admin → Mess Menu page
       ↓
Backend parses each row:
  - Validates block (GH1/GH2/BH1/BH2)
  - Creates new user OR updates existing (matched by userId)
  - Auto-generates password if blank
       ↓
Summary returned: N created, N updated, N skipped
```

---

## 📊 Excel Formats

### Users Upload (`usersFile`)
| Column | Required | Values |
|--------|----------|--------|
| `role` | ✅ | `student` or `admin` |
| `name` | ✅ | Full name |
| `userId` | ✅ | Unique ID (e.g. STU1001) |
| `password` | ❌ | Auto-generated if blank |
| `roomNumber` | ❌ | e.g. A-204 |
| `block` | ❌ | GH1, GH2, BH1, or BH2 |
| `parentPhone` | ❌ | Phone number |
| `parentEmail` | ❌ | Email for approval links |

### Mess Menu Upload (`menuFile`)
| Column | Required | Values |
|--------|----------|--------|
| `day` | ✅ | Monday, Tuesday … Sunday |
| `breakfast` | ❌ | Meal description |
| `lunch` | ❌ | Meal description |
| `dinner` | ❌ | Meal description |

---

## 🔒 Security Notes

- `.env` is gitignored — secrets never committed
- `store.json` is gitignored — student data stays local
- Passwords are stored in plain text in the JSON store — **use a proper database with bcrypt hashing for production**
- No JWT or session tokens currently — add authentication middleware before deploying publicly
- SMTP credentials should use App Passwords (not main account passwords)

---

## 🚧 Production Checklist

- [ ] Replace JSON store with MongoDB or PostgreSQL
- [ ] Hash passwords with bcrypt
- [ ] Add JWT authentication middleware on all API routes
- [ ] Set `APP_BASE_URL` to your production domain
- [ ] Configure real SMTP credentials
- [ ] Add Twilio credentials for real IVR calls
- [ ] Set `NODE_ENV=production`
- [ ] Add rate limiting (`express-rate-limit`)
- [ ] Enable HTTPS

---

## 📄 License

MIT — free to use, modify, and distribute.

---

<div align="center">
  <p>Built with ❤️ using Node.js + Express + Vanilla JS</p>
  <p>
    <a href="https://github.com/Pavithra406/Smart-Hostel">⭐ Star this repo</a> ·
    <a href="https://github.com/Pavithra406/Smart-Hostel/issues">🐛 Report a Bug</a> ·
    <a href="https://github.com/Pavithra406/Smart-Hostel/issues">💡 Request a Feature</a>
  </p>
</div>
