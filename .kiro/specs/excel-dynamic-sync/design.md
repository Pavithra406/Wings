# Design Document: Excel Dynamic Sync

## Overview

This feature adds two Excel-driven sync capabilities to the Smart Hostel Management System:

1. **User Credentials Upload** — A new `POST /api/users/upload` endpoint lets admins bulk-upsert student and admin records from an `.xlsx`/`.xls` file. Rows are matched by `userId`; new records are inserted, existing ones are updated in-place. Blank passwords trigger auto-generation of an 8-character alphanumeric string.

2. **Mess Menu Timestamp Enhancement** — The existing `POST /api/mess-menu/upload` endpoint is extended to record a `messMenuLastUpdated` ISO timestamp in `store.json`. `GET /api/mess-menu` is updated to return this timestamp. The admin UI shows the timestamp and a day-count confirmation after upload.

Both features operate entirely within the existing Node.js + Express + JSON-file-store architecture. No new dependencies are required — `multer` and `xlsx` are already installed.

---

## Architecture

The system follows a single-process, file-backed architecture. All state lives in `backend/data/store.json`. Writes are synchronous (`fs.writeFileSync`) which provides atomic replacement on most OS/filesystem combinations.

```mermaid
flowchart LR
    Browser -->|multipart/form-data| Multer
    Multer -->|temp file path| RouteHandler
    RouteHandler -->|XLSX.readFile| Parser
    Parser -->|rows[]| UpsertLogic
    UpsertLogic -->|mutated store| writeStore
    writeStore -->|store.json| Disk
    RouteHandler -->|fs.unlinkSync| TempFile
    RouteHandler -->|Upload_Summary JSON| Browser
```

The mess menu timestamp flow is simpler — the existing upload handler is patched to set `store.messMenuLastUpdated` before calling `writeStore`, and `GET /api/mess-menu` is patched to include it in the response.

---

## Components and Interfaces

### 1. `POST /api/users/upload`

**Multer config** — reuses the existing `upload` middleware (already configured for `.xlsx`/`.xls` filter and 5 MB limit, field name `usersFile`).

**Request**: `multipart/form-data`, field `usersFile`, `.xlsx` or `.xls`, max 5 MB.

**Processing pipeline**:
1. Guard: no file → 400 `"No file uploaded"`
2. `XLSX.readFile(req.file.path)` → first worksheet → `sheet_to_json({ defval: "" })`
3. For each row, normalise column names (case-insensitive `.find()`)
4. Skip rows where `userId` is blank/missing
5. Skip rows where `role` is not `"student"` or `"admin"` (case-insensitive)
6. For `"admin"` rows, strip `roomNumber` and `parentPhone` before upsert
7. If `password` is blank, generate 8-char alphanumeric via `crypto.randomBytes`
8. Upsert into `store.students` or `store.admins`
9. If zero processable rows → 400 `"No valid rows found in the uploaded file"`
10. `writeStore(store)` → `fs.unlinkSync(req.file.path)`
11. Return 200 `Upload_Summary`

**Response shape** (`Upload_Summary`):
```json
{
  "message": "Upload complete.",
  "summary": {
    "students": { "created": 2, "updated": 1, "skipped": 0 },
    "admins":   { "created": 0, "updated": 1, "skipped": 0 }
  }
}
```

### 2. `GET /api/mess-menu` — enhanced

Returns the existing array plus a `lastUpdated` field:
```json
{
  "menu": [...],
  "lastUpdated": "2026-04-14T10:32:00.000Z"
}
```
`lastUpdated` is `null` when `store.messMenuLastUpdated` is absent.

> **Breaking-change note**: The response shape changes from an array to an object. The existing `initMessMenu()` in `script.js` reads `menu` directly — it must be updated to read `data.menu` instead of `data`.

### 3. `POST /api/mess-menu/upload` — enhanced

After writing the new menu, also sets:
```js
store.messMenuLastUpdated = new Date().toISOString();
```
Response gains a `daysImported` field:
```json
{
  "message": "Mess menu updated from Excel — 7 day(s) imported.",
  "daysImported": 7,
  "lastUpdated": "2026-04-14T10:32:00.000Z",
  "menu": [...]
}
```

### 4. Admin UI — `admin-mess.html`

A second upload zone is added below the existing mess menu upload zone (or in a new panel section). It mirrors the existing zone's structure and wiring.

**New elements**:
- Upload zone with `id="usersUploadZone"`, file input `id="usersFile"` accepting `.xlsx,.xls`
- Column hint: `role`, `name`, `userId`, `password`, `roomNumber`, `parentPhone`
- Upload button `id="usersUploadBtn"`
- Message element `id="usersUploadMessage"`

**Timestamp display** (mess menu panel):
- Element `id="menuLastUpdated"` rendered below the upload zone
- Populated on page load from `GET /api/mess-menu` → `data.lastUpdated`
- Format: `"Last updated: 14 Apr 2026, 10:32 AM"` or `"Never updated via Excel"`

---

## Data Models

### `store.json` additions

```jsonc
{
  // existing fields unchanged
  "messMenuLastUpdated": "2026-04-14T10:32:00.000Z",  // new — ISO 8601 UTC string or absent

  "students": [
    {
      "userId": "STU1001",
      "password": "nevermore123",
      "role": "student",
      "name": "Aarav D'Souza",
      "roomNumber": "A-204",
      "parentPhone": "+919876543210"
    }
  ],
  "admins": [
    {
      "userId": "ADMIN01",
      "password": "ravens@123",
      "role": "admin",
      "name": "Warden Ophelia"
      // roomNumber and parentPhone are NOT stored for admins
    }
  ]
}
```

### Credentials Excel schema

| Column | Required | Notes |
|---|---|---|
| `role` | yes | `"student"` or `"admin"` (case-insensitive); other values → row skipped |
| `name` | yes | Display name |
| `userId` | yes | Primary key for upsert; blank → row skipped |
| `password` | no | Blank → auto-generated 8-char alphanumeric |
| `roomNumber` | no | Students only; blank → stored as `""` |
| `parentPhone` | no | Students only; ignored for admins |

### Auto-password generation

```js
function generatePassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.randomBytes(8);
  return Array.from(bytes).map(b => chars[b % chars.length]).join("");
}
```

This uses the already-imported `crypto` module and produces exactly 8 alphanumeric characters with uniform distribution.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Upsert creates new records

*For any* valid Credentials_Excel row whose `userId` does not exist in the target collection, after processing the upload the target collection SHALL contain a record with that `userId` and all provided fields.

**Validates: Requirements 1.11**

### Property 2: Upsert updates existing records without clobbering unrelated fields

*For any* valid Credentials_Excel row whose `userId` already exists in the target collection, after processing the upload the record's fields present in the row SHALL be updated, and fields absent from the row SHALL remain unchanged.

**Validates: Requirements 1.12**

### Property 3: Blank passwords are replaced with an 8-char alphanumeric auto-password

*For any* Credentials_Excel row with a blank `password` column, the resulting record in the store SHALL have a `password` field of exactly 8 characters, each of which is alphanumeric (`[A-Za-z0-9]`).

**Validates: Requirements 1.7**

### Property 4: Admin rows never store student-only fields

*For any* Credentials_Excel row with `role = "admin"`, regardless of what values appear in the `roomNumber` and `parentPhone` columns, the resulting admin record in `store.admins` SHALL NOT contain `roomNumber` or `parentPhone` fields.

**Validates: Requirements 4.2**

### Property 5: Mess menu timestamp round-trip

*For any* successful mess menu Excel upload, calling `GET /api/mess-menu` immediately after SHALL return a `lastUpdated` value that is a valid ISO 8601 datetime string and is not `null`.

**Validates: Requirements 3.1, 3.2**

### Property 6: Upload_Summary counts are consistent with store state

*For any* Credentials_Excel upload, the `created + updated` count returned in the Upload_Summary for each role SHALL equal the number of rows with that role that were not skipped, and the store SHALL contain exactly those records.

**Validates: Requirements 1.14**

---

## Error Handling

| Scenario | HTTP | Response body |
|---|---|---|
| No file attached | 400 | `{ "message": "No file uploaded" }` |
| Wrong file type (caught by multer fileFilter) | 400 | `{ "message": "Only .xlsx / .xls files are allowed" }` |
| File exceeds 5 MB (caught by multer limits) | 400 | multer error message |
| Zero processable rows | 400 | `{ "message": "No valid rows found in the uploaded file" }` |
| XLSX parse error | 500 | `{ "message": "Failed to parse Excel file: <detail>" }` |
| `writeStore` filesystem error | 500 | `{ "message": "Failed to write store: <detail>" }` |
| Any unhandled exception | 500 | `{ "message": "<detail>" }` |

In all error paths the temp file is deleted via `fs.unlinkSync` inside a `finally` block (or a `catch` that checks `fs.existsSync` before unlinking, matching the existing pattern in the mess menu upload handler).

The `writeStore` call is synchronous and replaces the file atomically on POSIX systems. No partial-write state is possible under normal conditions. If `writeStore` throws, the in-memory `store` object has already been mutated but the file has not been written — the error is surfaced as HTTP 500 and the temp file is cleaned up.

---

## Testing Strategy

### Unit tests (example-based)

- `generatePassword()` returns exactly 8 alphanumeric characters
- Upsert logic: new `userId` → record added; existing `userId` → only provided fields updated
- Admin row stripping: `roomNumber`/`parentPhone` not written to `store.admins`
- Row skipping: blank `userId`, unknown `role`, all-blank meal fields
- `GET /api/mess-menu` returns `lastUpdated: null` when `messMenuLastUpdated` is absent from store
- `GET /api/mess-menu` returns correct `lastUpdated` after a successful upload

### Property-based tests

Using **fast-check** (JavaScript PBT library). Each test runs a minimum of 100 iterations.

**Property 1 — Upsert creates new records**
Tag: `Feature: excel-dynamic-sync, Property 1: upsert creates new records`
Generate: random `userId` not in store, random valid row. Assert record exists post-upload.

**Property 2 — Upsert updates without clobbering**
Tag: `Feature: excel-dynamic-sync, Property 2: upsert updates existing records without clobbering unrelated fields`
Generate: existing record with extra fields, row with subset of fields. Assert extra fields unchanged.

**Property 3 — Auto-password format**
Tag: `Feature: excel-dynamic-sync, Property 3: blank passwords are replaced with 8-char alphanumeric auto-password`
Generate: rows with blank password. Assert `password.length === 8` and `/^[A-Za-z0-9]+$/` matches.

**Property 4 — Admin field stripping**
Tag: `Feature: excel-dynamic-sync, Property 4: admin rows never store student-only fields`
Generate: admin rows with arbitrary `roomNumber`/`parentPhone`. Assert neither field on resulting record.

**Property 5 — Mess menu timestamp round-trip**
Tag: `Feature: excel-dynamic-sync, Property 5: mess menu timestamp round-trip`
Generate: valid menu Excel payloads. Assert `lastUpdated` is non-null ISO string after upload.

**Property 6 — Upload_Summary consistency**
Tag: `Feature: excel-dynamic-sync, Property 6: upload summary counts are consistent with store state`
Generate: mixed Excel with new and existing userIds. Assert `created + updated` matches non-skipped row count and store contents match.

### Integration tests

- `POST /api/users/upload` with a real `.xlsx` file returns 200 and correct summary
- `POST /api/users/upload` with a non-Excel file returns 400
- `POST /api/users/upload` with no file returns 400
- `POST /api/mess-menu/upload` sets `messMenuLastUpdated` in store and returns it in response
- `GET /api/mess-menu` returns `lastUpdated` field after a menu upload
