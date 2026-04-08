# Requirements Document

## Introduction

This feature adds Excel-based dynamic sync for student/admin credentials and enhances the existing mess menu upload in the Smart Hostel Management System (Nevermore theme, Node.js + Express + JSON file store).

Two upload capabilities are in scope:

1. **Student/Admin Excel Upload** — Admin uploads an Excel file to bulk-upsert user credentials into `store.json`. New users are created; existing users (matched by `userId`) are updated. Passwords left blank in the sheet are auto-generated.
2. **Mess Menu Upload Enhancements** — The existing `POST /api/mess-menu/upload` endpoint is extended to record a `lastUpdated` timestamp and return per-operation counts. The `admin-mess.html` UI is updated to display the timestamp and upload confirmation summary.

The login flow and mess menu display already read from `store.json` dynamically, so both features take effect immediately after upload with no additional wiring needed.

---

## Glossary

- **System**: The Smart Hostel Management System backend (Node.js + Express).
- **Admin**: A hostel warden with role `"admin"` stored in `store.admins`.
- **Student**: A hostel resident with role `"student"` stored in `store.students`.
- **Store**: The JSON file at `backend/data/store.json` used as the data store.
- **Uploader**: The backend route handler that processes an uploaded Excel file.
- **Credentials_Excel**: An `.xlsx` or `.xls` file with columns `role`, `name`, `userId`, `password`, `roomNumber`, `parentPhone`.
- **Menu_Excel**: An `.xlsx` or `.xls` file with columns `day`, `breakfast`, `lunch`, `dinner`.
- **Auto_Password**: A system-generated password assigned when the `password` column is blank.
- **Upsert**: Insert a new record if `userId` does not exist; update the existing record if it does.
- **Upload_Summary**: A JSON response object containing counts of created and updated records.
- **Last_Updated_Timestamp**: An ISO 8601 datetime string stored in `store.messMenuLastUpdated` and displayed on the mess menu admin page.

---

## Requirements

### Requirement 1: Student/Admin Credentials Excel Upload — Endpoint

**User Story:** As an admin, I want to upload an Excel file of student and admin credentials, so that I can bulk-manage user accounts without editing the JSON store manually.

#### Acceptance Criteria

1. THE System SHALL expose a `POST /api/users/upload` endpoint that accepts a single file field named `usersFile`.
2. WHEN a file with extension other than `.xlsx` or `.xls` is submitted, THE Uploader SHALL return HTTP 400 with a descriptive error message.
3. WHEN the uploaded file exceeds 5 MB, THE Uploader SHALL return HTTP 400 with a descriptive error message.
4. WHEN no file is attached to the request, THE Uploader SHALL return HTTP 400 with the message `"No file uploaded"`.
5. WHEN a valid Credentials_Excel is uploaded, THE Uploader SHALL parse all rows from the first worksheet using case-insensitive column name matching for `role`, `name`, `userId`, `password`, `roomNumber`, and `parentPhone`.
6. WHEN a row has a blank or missing `userId`, THE Uploader SHALL skip that row without error.
7. WHEN a row has a blank `password` column, THE Uploader SHALL assign an Auto_Password of exactly 8 alphanumeric characters to that row.
8. WHEN a parsed row has `role` equal to `"student"` (case-insensitive), THE Uploader SHALL apply Upsert logic against `store.students`.
9. WHEN a parsed row has `role` equal to `"admin"` (case-insensitive), THE Uploader SHALL apply Upsert logic against `store.admins`.
10. WHEN a parsed row has a `role` value other than `"student"` or `"admin"`, THE Uploader SHALL skip that row without error.
11. WHEN Upsert is applied and the `userId` does not exist in the target collection, THE Uploader SHALL create a new record with all provided fields.
12. WHEN Upsert is applied and the `userId` already exists in the target collection, THE Uploader SHALL update only the fields present in the Excel row, leaving unspecified fields unchanged.
13. WHEN all rows have been processed, THE Uploader SHALL write the updated Store to disk atomically and delete the temporary upload file.
14. WHEN processing completes successfully, THE Uploader SHALL return HTTP 200 with an Upload_Summary containing `created` count, `updated` count, and `skipped` count.
15. IF an unhandled exception occurs during parsing or writing, THEN THE Uploader SHALL delete the temporary upload file, and return HTTP 500 with a descriptive error message.

---

### Requirement 2: Student/Admin Credentials Excel Upload — Admin UI

**User Story:** As an admin, I want a dedicated upload section in the admin panel, so that I can upload the credentials Excel file from the browser without using API tools.

#### Acceptance Criteria

1. THE System SHALL render a file upload section on `admin-mess.html` (or a dedicated admin page) that accepts `.xlsx` and `.xls` files for user credential upload.
2. WHEN a file is selected, THE System SHALL display the chosen filename in the upload zone.
3. WHEN the upload button is clicked with a valid file selected, THE System SHALL submit the file to `POST /api/users/upload` and disable the button during the request.
4. WHEN the server returns a successful Upload_Summary, THE System SHALL display a confirmation message in the format: `"✅ X student(s) created, Y updated. Z admin(s) created, W updated."` using the counts from the response.
5. WHEN the server returns an error, THE System SHALL display the error message in a visually distinct error style without reloading the page.
6. THE System SHALL include a column hint showing the required columns: `role`, `name`, `userId`, `password`, `roomNumber`, `parentPhone`.

---

### Requirement 3: Mess Menu Upload — Timestamp and Confirmation

**User Story:** As an admin, I want to see when the mess menu was last updated and how many days were imported, so that I can confirm the upload was successful.

#### Acceptance Criteria

1. WHEN a Menu_Excel is successfully processed by `POST /api/mess-menu/upload`, THE Uploader SHALL store the current UTC datetime as `messMenuLastUpdated` in the Store.
2. WHEN `GET /api/mess-menu` is called, THE System SHALL include the `lastUpdated` field in the response, sourced from `store.messMenuLastUpdated` (or `null` if never set).
3. WHEN the mess menu admin page loads, THE System SHALL fetch and display the Last_Updated_Timestamp below the upload zone in a human-readable format (e.g., `"Last updated: 14 Apr 2026, 10:32 AM"`).
4. WHEN `messMenuLastUpdated` is `null` or absent, THE System SHALL display `"Never updated via Excel"` in place of the timestamp.
5. WHEN a Menu_Excel upload succeeds, THE System SHALL display the count of imported days in the confirmation message (e.g., `"✅ Mess menu updated — 7 day(s) imported."`).

---

### Requirement 4: Input Validation and Data Integrity

**User Story:** As an admin, I want the system to validate uploaded data before saving, so that corrupt or incomplete records do not enter the store.

#### Acceptance Criteria

1. WHEN a Credentials_Excel row has a `role` of `"student"` and a blank `roomNumber`, THE Uploader SHALL still create or update the record, storing `roomNumber` as an empty string.
2. WHEN a Credentials_Excel row has a `role` of `"admin"` and a non-blank `roomNumber` or `parentPhone`, THE Uploader SHALL ignore those fields and not store them on the admin record.
3. WHEN the Credentials_Excel contains zero processable rows (all rows skipped), THE Uploader SHALL return HTTP 400 with the message `"No valid rows found in the uploaded file"`.
4. WHEN the Store write fails due to a filesystem error, THE Uploader SHALL return HTTP 500 and not leave the Store in a partially written state.
5. THE System SHALL enforce a maximum file size of 5 MB for both `POST /api/users/upload` and `POST /api/mess-menu/upload`.
