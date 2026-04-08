# Implementation Plan: Excel Dynamic Sync

## Overview

Implement two Excel-driven sync capabilities: a `POST /api/users/upload` endpoint for bulk-upserting user credentials, and enhancements to the mess menu upload/display flow to include a `lastUpdated` timestamp. All changes are within the existing Node.js + Express + JSON-file-store architecture.

## Tasks

- [x] 1. Add `generatePassword()` helper and `POST /api/users/upload` endpoint in `backend/server.js`
  - Add `generatePassword()` using `crypto.randomBytes(8)` mapped over the alphanumeric charset (design §Auto-password generation)
  - Register `upload.single("usersFile")` multer middleware on the new route
  - Guard: no file → 400 `"No file uploaded"` (Req 1.4)
  - Parse first worksheet with `XLSX.readFile` + `sheet_to_json({ defval: "" })` (Req 1.5)
  - Normalise column names via case-insensitive `.find()` for `role`, `name`, `userId`, `password`, `roomNumber`, `parentPhone`
  - Skip rows with blank `userId` (Req 1.6); skip rows with unknown `role` (Req 1.10)
  - Assign `generatePassword()` when `password` is blank (Req 1.7)
  - Strip `roomNumber`/`parentPhone` from admin rows before upsert (Req 4.2)
  - Upsert into `store.students` or `store.admins` by `userId` — create if absent, merge if present (Req 1.8, 1.9, 1.11, 1.12)
  - If zero processable rows → 400 `"No valid rows found in the uploaded file"` (Req 4.3)
  - `writeStore(store)` then `fs.unlinkSync` in all code paths via `finally` block (Req 1.13, 1.15)
  - Return 200 `Upload_Summary` with `created`/`updated`/`skipped` per role (Req 1.14)
  - _Requirements: 1.1–1.15, 4.2–4.5_

  - [ ]* 1.1 Write property test — Property 1: upsert creates new records
    - Use fast-check to generate random `userId` not in store and assert record exists post-upsert
    - **Property 1: Upsert creates new records**
    - **Validates: Requirements 1.11**

  - [ ]* 1.2 Write property test — Property 2: upsert updates without clobbering
    - Generate existing record with extra fields, row with subset; assert extra fields unchanged
    - **Property 2: Upsert updates existing records without clobbering unrelated fields**
    - **Validates: Requirements 1.12**

  - [ ]* 1.3 Write property test — Property 3: blank passwords replaced with 8-char alphanumeric
    - Generate rows with blank password; assert `password.length === 8` and `/^[A-Za-z0-9]+$/`
    - **Property 3: Blank passwords are replaced with an 8-char alphanumeric auto-password**
    - **Validates: Requirements 1.7**

  - [ ]* 1.4 Write property test — Property 4: admin rows never store student-only fields
    - Generate admin rows with arbitrary `roomNumber`/`parentPhone`; assert neither field on resulting record
    - **Property 4: Admin rows never store student-only fields**
    - **Validates: Requirements 4.2**

  - [ ]* 1.5 Write property test — Property 6: Upload_Summary counts consistent with store state
    - Generate mixed Excel with new and existing userIds; assert `created + updated` equals non-skipped row count
    - **Property 6: Upload_Summary counts are consistent with store state**
    - **Validates: Requirements 1.14**

- [ ] 2. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Enhance `POST /api/mess-menu/upload` and `GET /api/mess-menu` in `backend/server.js`
  - In the upload handler, after `store.messMenu = parsed`, set `store.messMenuLastUpdated = new Date().toISOString()` (Req 3.1)
  - Add `daysImported` and `lastUpdated` fields to the upload success response (Req 3.5)
  - In `GET /api/mess-menu`, return `{ menu: store.messMenu, lastUpdated: store.messMenuLastUpdated ?? null }` instead of the bare array (Req 3.2)
  - _Requirements: 3.1, 3.2, 3.5_

  - [ ]* 3.1 Write property test — Property 5: mess menu timestamp round-trip
    - Generate valid menu payloads; assert `GET /api/mess-menu` returns non-null ISO string `lastUpdated` after upload
    - **Property 5: Mess menu timestamp round-trip**
    - **Validates: Requirements 3.1, 3.2**

- [x] 4. Fix `initMessMenu()` and `initAdminMess()` in `frontend/js/script.js` for the new response shape
  - In `initMessMenu()`: change `menu` variable to read `data.menu` instead of `data` (breaking change from step 3)
  - In `initAdminMess()`: change `overview.messMenu` reads to use `data.menu` where the admin overview still returns the array directly — verify `GET /api/admin/overview` still returns `messMenu` as an array and update any `initAdminMess` call that fetches `GET /api/mess-menu` directly
  - _Requirements: 3.2_

- [x] 5. Add users upload zone and timestamp display to `frontend/admin-mess.html`
  - Add `id="menuLastUpdated"` element below the existing mess menu upload zone; populate on page load from `GET /api/mess-menu` → `data.lastUpdated` formatted as `"Last updated: 14 Apr 2026, 10:32 AM"` or `"Never updated via Excel"` (Req 3.3, 3.4)
  - Add a second upload zone section with `id="usersUploadZone"`, file input `id="usersFile"` accepting `.xlsx,.xls`, upload button `id="usersUploadBtn"`, and message element `id="usersUploadMessage"` (Req 2.1)
  - Add column hint showing `role`, `name`, `userId`, `password`, `roomNumber`, `parentPhone` (Req 2.6)
  - Wire `onFileChosen` equivalent to enable/disable `usersUploadBtn` and show filename (Req 2.2)
  - Implement `uploadUsers()`: POST to `/api/users/upload`, disable button during request, show success message `"✅ X student(s) created, Y updated. Z admin(s) created, W updated."` or error in red (Req 2.3, 2.4, 2.5)
  - _Requirements: 2.1–2.6, 3.3, 3.4_

- [x] 6. Add `lastUpdated` display to `frontend/mess-menu.html`
  - Add an element below the table header to display the `lastUpdated` timestamp
  - Populate from `GET /api/mess-menu` → `data.lastUpdated` using the same human-readable format
  - Show `"Never updated via Excel"` when `lastUpdated` is null
  - _Requirements: 3.2, 3.3, 3.4_

- [ ] 7. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Property tests use **fast-check** as specified in the design's testing strategy
- The `GET /api/mess-menu` shape change (array → object) is a breaking change; steps 3 and 4 must be done together
- `writeStore` is synchronous; if it throws, surface as HTTP 500 and clean up the temp file in the `finally` block
