# Smart Hostel Management System
Hostel management system built with HTML, CSS, JavaScript, and Node.js/Express.

## Features

- Gothic landing page with animated portal entry
- Student login with admin-provisioned credentials
- Student dashboard for mess menu, complaints, gate pass, leave, room swap, and food feedback
- Admin dashboard for approvals, complaint handling, menu management, and analytics
- Parent approval links for gate pass and leave requests
- QR-enabled gate pass generation after full approval
- Food feedback page with embedded Google Form links
- SQL schema included in `database/schema.sql`

## Run

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
npm start
```

3. Open `http://localhost:3000`

## Optional Environment

Create `backend/.env` if you want to configure a custom port or public base URL:

```env
PORT=3000
APP_BASE_URL=http://localhost:3000
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

## Demo Credentials

- Student: `STU1001` / `nevermore123`
- Admin: `ADMIN01` / `ravens@123`

## Notes

- The app uses `backend/data/store.json` so it works immediately without a database server.
- `database/schema.sql` contains the requested MySQL schema for production migration.
- The live application currently uses Express plus a JSON datastore for local execution and includes a MySQL schema for database integration.
- Parent approval is implemented through secure approval links at `parent-approval.html`.
- `TWILIO_*` values can be stored in `backend/.env` for future voice-call integration, but the current workflow uses approval links rather than automated calls.
"# Smart-Hostel" 
"# Wings" 
