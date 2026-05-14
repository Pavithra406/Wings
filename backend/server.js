const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const QRCode = require("qrcode");
const multer = require("multer");
const XLSX = require("xlsx");
const nodemailer = require("nodemailer");

loadEnvFile(path.join(__dirname, ".env"));

const app = express();
const PORT = process.env.PORT || 3000;
const STORE_PATH = path.join(__dirname, "data", "store.json");
const FRONTEND_DIR = path.join(__dirname, "..", "frontend");
const UPLOAD_DIR = path.join(__dirname, "uploads");

app.use(express.json());
app.use(express.static(FRONTEND_DIR));

/* ── Multer — Excel upload ── */
const upload = multer({
  dest: UPLOAD_DIR,
  fileFilter: (req, file, cb) => {
    const ok = /\.(xlsx|xls)$/i.test(file.originalname);
    cb(ok ? null : new Error("Only .xlsx / .xls files are allowed"), ok);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

/* ── Env loader ── */
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  fs.readFileSync(filePath, "utf8").split(/\r?\n/).forEach((line) => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return;
    const i = t.indexOf("=");
    if (i === -1) return;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^"(.*)"$/, "$1");
    if (!process.env[k]) process.env[k] = v;
  });
}

/* ── Store helpers ── */
function createToken() { return crypto.randomBytes(16).toString("hex"); }

function getBaseUrl(req) {
  return process.env.APP_BASE_URL || `${req.protocol}://${req.get("host")}`;
}

function createParentApprovalLink(req, type, token) {
  return `${getBaseUrl(req)}/parent-approval.html?type=${type}&token=${token}`;
}

function withApprovalDefaults(item, type) {
  const tok = item.approvalToken || createToken();
  return {
    ...item,
    parentApproval: item.parentApproval || "Pending",
    adminApproval: item.adminApproval || "Pending",
    parentVerification: item.parentVerification || "Pending",
    approvalToken: tok,
    approvalLink: item.approvalLink || `/parent-approval.html?type=${type}&token=${tok}`,
  };
}

function readStore() {
  const raw = fs.readFileSync(STORE_PATH, "utf8").replace(/^\uFEFF/, "");
  const store = JSON.parse(raw);
  store.holidays = store.holidays || [];
  store.gatePasses = (store.gatePasses || []).map((i) => withApprovalDefaults(i, "gatepass"));
  store.leaveRequests = (store.leaveRequests || []).map((i) => withApprovalDefaults(i, "leave"));
  return store;
}

function writeStore(store) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), { encoding: "utf8" });
}

function nextId(prefix, collection) {
  const max = collection.reduce((acc, item) => {
    const m = String(item.id || "").match(/(\d+)$/);
    return m ? Math.max(acc, Number(m[1])) : acc;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

function sanitizeUser(user) {
  const { password, ...safe } = user;
  return safe;
}

function finalStatus(parentApproval, adminApproval) {
  if (parentApproval === "Rejected" || adminApproval === "Rejected") return "Rejected";
  if (parentApproval === "Approved" && adminApproval === "Approved") return "Approved";
  return "Pending";
}

function findStudent(store, body) {
  return store.students.find(
    (s) => s.name === body.studentName || s.roomNumber === body.roomNumber || s.userId === body.userId
  );
}

/* ══════════════════════════════════════════════════════════════
   MODULAR CALL SERVICE
   Swap callService.initiateCall() with a real Twilio call in
   production — the rest of the system stays unchanged.
══════════════════════════════════════════════════════════════ */
const callService = {
  /**
   * Initiate a parent verification call.
   * In production: replace this with a Twilio Programmable Voice call.
   * @param {string} toPhone  - Parent phone number
   * @param {object} gatePass - Gate pass record
   * @returns {{ callSid: string, mode: string }}
   */
  async initiateCall(toPhone, gatePass) {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      // ── PRODUCTION: Real Twilio call ──────────────────────────
      // const twilio = require("twilio");
      // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      // const twimlUrl = `${process.env.APP_BASE_URL}/api/twiml/gatepass/${gatePass.id}`;
      // const call = await client.calls.create({
      //   url: twimlUrl,
      //   to: toPhone,
      //   from: process.env.TWILIO_PHONE_NUMBER,
      // });
      // return { callSid: call.sid, mode: "twilio" };
    }
    // ── SIMULATION: No external API needed ───────────────────────
    return { callSid: `SIM-${Date.now()}`, mode: "simulation" };
  },

  /**
   * TwiML response for Twilio to read aloud and capture DTMF.
   * Called by Twilio when the parent answers.
   */
  twiml(gatePassId, baseUrl) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="${baseUrl}/api/twiml/gatepass/${gatePassId}/dtmf" method="POST">
    <Say voice="alice">
      Hello. This is an automated message from Nevermore Hostel.
      Your child has requested permission to leave the hostel premises.
      Press 1 to approve the gate pass.
      Press 2 to reject the gate pass.
    </Say>
  </Gather>
  <Say>We did not receive your input. Goodbye.</Say>
</Response>`;
  },
};

/* ══════════════════════════════════════════════════════════════
   ROUTES
══════════════════════════════════════════════════════════════ */

/* ── Auth ── */
app.post("/api/login", (req, res) => {
  const { userId, password, selectedBlock } = req.body;
  const store = readStore();
  const user = [...store.students, ...store.admins].find(
    (e) => e.userId === userId && e.password === password
  );
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  // Block check: students must match selected block; admins bypass
  if (user.role === "student" && selectedBlock && user.block && user.block !== selectedBlock) {
    return res.status(401).json({ message: `You are not registered in block ${selectedBlock}` });
  }
  return res.json({ message: "Login successful", role: user.role, user: sanitizeUser(user) });
});

app.get("/api/me/:userId", (req, res) => {
  const store = readStore();
  const user = [...store.students, ...store.admins].find((e) => e.userId === req.params.userId);
  if (!user) return res.status(404).json({ message: "User not found" });
  return res.json(sanitizeUser(user));
});

/* ── Mess Menu ── */
app.get("/api/mess-menu", (req, res) => {
  const store = readStore();
  res.json({ menu: store.messMenu, lastUpdated: store.messMenuLastUpdated ?? null });
});

app.put("/api/mess-menu/:day", (req, res) => {
  const store = readStore();
  const item = store.messMenu.find((m) => m.day.toLowerCase() === req.params.day.toLowerCase());
  if (!item) return res.status(404).json({ message: "Menu entry not found" });
  Object.assign(item, { breakfast: req.body.breakfast, lunch: req.body.lunch, dinner: req.body.dinner });
  writeStore(store);
  res.json({ message: "Mess menu updated", item });
});

/* ── Auto-password generator ── */
function generatePassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(crypto.randomBytes(8)).map(b => chars[b % chars.length]).join("");
}

/* ── Excel Users Upload (students + admins) ── */
const VALID_BLOCKS = ["GH1", "GH2", "BH1", "BH2"];

app.post("/api/users/upload", upload.single("usersFile"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  const summary = {
    students: { created: 0, updated: 0, skipped: 0, skippedRows: [] },
    admins:   { created: 0, updated: 0, skipped: 0 },
  };

  try {
    const wb = XLSX.readFile(req.file.path);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

    const store = readStore();
    let processable = 0;

    for (const row of rows) {
      const keys = Object.keys(row);
      const get = (name) => {
        const k = keys.find(k => k.toLowerCase().trim() === name.toLowerCase());
        return k ? String(row[k]).trim() : "";
      };
      const has = (name) => keys.some(k => k.toLowerCase().trim() === name.toLowerCase());

      const userId      = get("userId");
      const role        = get("role").toLowerCase();
      const name        = get("name");
      const password    = get("password") || generatePassword();
      const roomNumber  = get("roomNumber");
      const block       = get("block");
      const parentPhone = get("parentPhone");
      const parentEmail = get("parentEmail");

      if (!userId) continue;
      if (role !== "student" && role !== "admin") continue;

      processable++;

      if (role === "student") {
        if (has("block") && block !== "" && !VALID_BLOCKS.includes(block)) {
          summary.students.skipped++;
          summary.students.skippedRows.push({ userId, reason: "Invalid block value." });
          continue;
        }
        const idx = store.students.findIndex(s => s.userId === userId);
        const updates = { name, password, roomNumber, parentPhone };
        if (has("block") && block !== "") updates.block = block;
        if (has("parentEmail") && parentEmail !== "") updates.parentEmail = parentEmail;
        if (idx === -1) {
          store.students.push({ userId, role: "student", ...updates });
          summary.students.created++;
        } else {
          Object.assign(store.students[idx], updates);
          summary.students.updated++;
        }
      } else {
        const idx = store.admins.findIndex(a => a.userId === userId);
        if (idx === -1) {
          store.admins.push({ userId, password, role: "admin", name });
          summary.admins.created++;
        } else {
          Object.assign(store.admins[idx], { name, password });
          summary.admins.updated++;
        }
      }
    }

    if (processable === 0) {
      return res.status(400).json({ message: "No valid rows found in the uploaded file" });
    }

    writeStore(store);
    res.json({ message: "Upload complete.", summary });
  } catch (err) {
    res.status(500).json({ message: "Failed to parse Excel file: " + err.message });
  } finally {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
  }
});

/* ── Excel Mess Menu Upload ── */
app.post("/api/mess-menu/upload", upload.single("menuFile"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  try {
    const wb = XLSX.readFile(req.file.path);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

    const VALID_DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
    const parsed = [];

    for (const row of rows) {
      // Normalise column names — case-insensitive
      const keys = Object.keys(row);
      const get = (name) => {
        const k = keys.find((k) => k.toLowerCase().trim() === name.toLowerCase());
        return k ? String(row[k]).trim() : "";
      };

      const day = get("day");
      const breakfast = get("breakfast");
      const lunch = get("lunch");
      const dinner = get("dinner");

      if (!day || !VALID_DAYS.includes(day)) continue;
      if (!breakfast && !lunch && !dinner) continue;
      parsed.push({ day, breakfast, lunch, dinner });
    }

    if (parsed.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "No valid rows found. Columns must be: day, breakfast, lunch, dinner" });
    }

    const store = readStore();
    // FULL REPLACE — clear old menu, insert new data from Excel
    store.messMenu = parsed;
    store.messMenuLastUpdated = new Date().toISOString();
    writeStore(store);
    fs.unlinkSync(req.file.path);

    res.json({
      message: `Mess menu updated from Excel — ${parsed.length} day(s) imported.`,
      daysImported: parsed.length,
      lastUpdated: store.messMenuLastUpdated,
      menu: store.messMenu,
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: "Failed to parse Excel file: " + err.message });
  }
});

/* ── Complaints ── */
app.get("/api/complaints", (req, res) => res.json(readStore().complaints));

app.post("/api/complaints", (req, res) => {
  const store = readStore();
  const complaint = {
    id: nextId("CMP", store.complaints),
    studentName: req.body.studentName || "",
    roomNumber: req.body.roomNumber,
    complaintType: req.body.complaintType,
    issueDescription: req.body.issueDescription,
    priority: Number(req.body.priority) || 3,
    status: "Pending",
    resolved: false,
    assuranceDate: null,
    escalated: false,
    createdAt: new Date().toISOString(),
  };
  store.complaints.unshift(complaint);
  writeStore(store);
  res.status(201).json({ message: "Complaint successfully submitted.", complaint });
});

app.patch("/api/complaints/:id", (req, res) => {
  const store = readStore();
  const item = store.complaints.find((c) => c.id === req.params.id);
  if (!item) return res.status(404).json({ message: "Complaint not found" });
  if (req.body.status !== undefined) item.status = req.body.status;
  if (req.body.assuranceDate !== undefined) item.assuranceDate = req.body.assuranceDate;
  if (item.status === "Resolved") item.resolved = true;
  writeStore(store);
  res.json({ message: "Complaint updated", complaint: item });
});

/* ── Gate Pass ── */
app.get("/api/gatepass", (req, res) => {
  const store = readStore();
  res.json(store.gatePasses.map((i) => ({ ...i, approvalLink: createParentApprovalLink(req, "gatepass", i.approvalToken) })));
});

app.post("/api/gatepass", (req, res) => {
  const store = readStore();
  const student = findStudent(store, req.body);
  const approvalToken = createToken();
  const gatePass = {
    id: nextId("GP", store.gatePasses),
    studentName: req.body.studentName,
    roomNumber: req.body.roomNumber,
    outTime: req.body.outTime,
    returnTime: req.body.returnTime,
    reason: req.body.reason,
    parentPhone: req.body.parentPhone || student?.parentPhone || "",
    status: "Pending",
    parentApproval: "Pending",
    parentVerification: "Pending",
    adminApproval: "Pending",
    approvalToken,
    approvalLink: createParentApprovalLink(req, "gatepass", approvalToken),
    qrCode: "",
    createdAt: new Date().toISOString(),
  };
  store.gatePasses.unshift(gatePass);
  writeStore(store);
  res.status(201).json({ message: "Gate pass submitted. Admin will initiate parent verification.", gatePass });
});

/* ── IVR: GET gate pass for call screen ── */
app.get("/api/gatepass/:id/ivr", (req, res) => {
  const store = readStore();
  const gp = store.gatePasses.find((i) => i.id === req.params.id);
  if (!gp) return res.status(404).json({ message: "Gate pass not found" });

  // Auto-populate parentPhone from student record if missing
  if (!gp.parentPhone) {
    const student = store.students.find(
      (s) => s.name === gp.studentName || s.roomNumber === gp.roomNumber
    );
    if (student?.parentPhone) gp.parentPhone = student.parentPhone;
  }
  res.json(gp);
});

/* ── IVR: Initiate simulated/real call ── */
app.post("/api/gatepass/:id/call", async (req, res) => {
  const store = readStore();
  const gp = store.gatePasses.find((i) => i.id === req.params.id);
  if (!gp) return res.status(404).json({ message: "Gate pass not found" });

  // Resolve parent phone from student record if not on gate pass
  if (!gp.parentPhone) {
    const student = store.students.find(
      (s) => s.name === gp.studentName || s.roomNumber === gp.roomNumber
    );
    if (student?.parentPhone) gp.parentPhone = student.parentPhone;
  }

  if (!gp.parentPhone) {
    return res.status(400).json({ message: "No parent phone number found for this student." });
  }

  try {
    const result = await callService.initiateCall(gp.parentPhone, gp);
    gp.callSid = result.callSid;
    gp.callMode = result.mode;
    gp.parentVerification = "Call Initiated";
    writeStore(store);
    res.json({ message: `Parent call initiated (${result.mode}).`, callSid: result.callSid, mode: result.mode, gatePass: gp });
  } catch (err) {
    res.status(500).json({ message: "Call failed: " + err.message });
  }
});

/* ── IVR: Parent presses keypad (simulated or Twilio DTMF webhook) ── */
async function processIvrKey(gp, key, store) {
  gp.parentApproval = key === "1" ? "Approved" : "Rejected";
  gp.parentVerification = key === "1" ? "Accepted" : "Rejected";
  gp.status = finalStatus(gp.parentApproval, gp.adminApproval);

  if (gp.status === "Approved") {
    gp.qrCode = await QRCode.toDataURL(JSON.stringify({
      id: gp.id, studentName: gp.studentName, roomNumber: gp.roomNumber,
      outTime: gp.outTime, returnTime: gp.returnTime, status: gp.status,
    }));
  } else {
    gp.qrCode = "";
  }
  writeStore(store);
}

// Simulated IVR keypress from the in-browser call screen
app.post("/api/gatepass/:id/ivr", async (req, res) => {
  const store = readStore();
  const gp = store.gatePasses.find((i) => i.id === req.params.id);
  if (!gp) return res.status(404).json({ message: "Gate pass not found" });

  const key = req.body.key;
  if (key !== "1" && key !== "2") return res.status(400).json({ message: "Press 1 to approve or 2 to reject." });

  await processIvrKey(gp, key, store);
  res.json({ message: key === "1" ? "Parent verified. Gate pass approved." : "Parent rejected the gate pass.", gatePass: gp });
});

// Twilio DTMF webhook — called by Twilio when parent presses a key on real call
app.post("/api/twiml/gatepass/:id/dtmf", async (req, res) => {
  const store = readStore();
  const gp = store.gatePasses.find((i) => i.id === req.params.id);
  const digit = req.body.Digits;

  res.set("Content-Type", "text/xml");

  if (!gp) {
    return res.send(`<?xml version="1.0"?><Response><Say>Gate pass not found. Goodbye.</Say></Response>`);
  }

  if (digit === "1" || digit === "2") {
    await processIvrKey(gp, digit, store);
    const msg = digit === "1" ? "Thank you. The gate pass has been approved." : "The gate pass has been rejected. Goodbye.";
    return res.send(`<?xml version="1.0"?><Response><Say voice="alice">${msg}</Say></Response>`);
  }

  return res.send(`<?xml version="1.0"?><Response><Say>Invalid input. Goodbye.</Say></Response>`);
});

// Twilio TwiML — served when Twilio calls the parent
app.get("/api/twiml/gatepass/:id", (req, res) => {
  res.set("Content-Type", "text/xml");
  res.send(callService.twiml(req.params.id, getBaseUrl(req)));
});

/* ── Admin: update gate pass status ── */
app.patch("/api/gatepass/:id/status", async (req, res) => {
  const store = readStore();
  const gp = store.gatePasses.find((i) => i.id === req.params.id);
  if (!gp) return res.status(404).json({ message: "Gate pass not found" });

  gp.adminApproval = req.body.status === "Approved" ? "Approved" : "Rejected";
  gp.status = finalStatus(gp.parentApproval, gp.adminApproval);

  if (gp.status === "Approved") {
    gp.qrCode = await QRCode.toDataURL(JSON.stringify({
      id: gp.id, studentName: gp.studentName, roomNumber: gp.roomNumber,
      outTime: gp.outTime, returnTime: gp.returnTime, status: gp.status,
    }));
  } else {
    gp.qrCode = "";
  }
  writeStore(store);
  res.json({ message: "Gate pass updated", gatePass: gp });
});

/* ── Leave ── */
app.get("/api/leave", (req, res) => {
  const store = readStore();
  res.json(store.leaveRequests.map((i) => ({ ...i, approvalLink: createParentApprovalLink(req, "leave", i.approvalToken) })));
});

app.post("/api/leave", (req, res) => {
  const store = readStore();
  const student = findStudent(store, req.body);
  const approvalToken = createToken();
  const leave = {
    id: nextId("LV", store.leaveRequests),
    studentName: req.body.studentName,
    roomNumber: req.body.roomNumber,
    fromDate: req.body.fromDate,
    toDate: req.body.toDate,
    reason: req.body.reason,
    parentPhone: student?.parentPhone || "",
    status: "Pending",
    parentApproval: "Pending",
    adminApproval: "Pending",
    approvalToken,
    approvalLink: createParentApprovalLink(req, "leave", approvalToken),
    createdAt: new Date().toISOString(),
  };
  store.leaveRequests.unshift(leave);
  writeStore(store);
  res.status(201).json({ message: "Leave request submitted. Parent approval required.", leave });
});

app.patch("/api/leave/:id", (req, res) => {
  const store = readStore();
  const leave = store.leaveRequests.find((i) => i.id === req.params.id);
  if (!leave) return res.status(404).json({ message: "Leave request not found" });
  leave.adminApproval = req.body.status === "Approved" ? "Approved" : "Rejected";
  leave.status = finalStatus(leave.parentApproval, leave.adminApproval);
  writeStore(store);
  res.json({ message: "Leave request updated", leave });
});

/* ── Room Swap ── */
app.get("/api/room-swap", (req, res) => res.json(readStore().roomSwaps));

app.post("/api/room-swap", (req, res) => {
  const store = readStore();
  const roomSwap = {
    id: nextId("RS", store.roomSwaps),
    currentRoomNumber: req.body.currentRoomNumber,
    requestedRoomNumber: req.body.requestedRoomNumber,
    reason: req.body.reason,
    status: "Pending",
    createdAt: new Date().toISOString(),
  };
  store.roomSwaps.unshift(roomSwap);
  writeStore(store);
  res.status(201).json({ message: "Room swap request submitted", roomSwap });
});

app.patch("/api/room-swap/:id", (req, res) => {
  const store = readStore();
  const item = store.roomSwaps.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).json({ message: "Room swap not found" });
  item.status = req.body.status || item.status;
  writeStore(store);
  res.json({ message: "Room swap updated", roomSwap: item });
});

/* ── Feedback ── */
app.get("/api/feedback", (req, res) => res.json(readStore().feedback));

app.post("/api/feedback", (req, res) => {
  const store = readStore();
  const feedback = {
    id: nextId("FDB", store.feedback),
    rating: Number(req.body.rating),
    comment: req.body.comment,
    createdAt: new Date().toISOString(),
  };
  store.feedback.unshift(feedback);
  writeStore(store);
  res.status(201).json({ message: "Feedback submitted", feedback });
});

/* ── Holidays ── */
app.get("/api/holidays", (req, res) => {
  const holidays = [...readStore().holidays].sort((a, b) => a.holidayDate.localeCompare(b.holidayDate));
  res.json(holidays);
});

app.post("/api/holidays", (req, res) => {
  const store = readStore();
  const holiday = {
    id: nextId("HOL", store.holidays),
    holidayName: req.body.holidayName,
    holidayDate: req.body.holidayDate,
    description: req.body.description,
  };
  store.holidays.unshift(holiday);
  writeStore(store);
  res.status(201).json({ message: "Holiday added", holiday });
});

app.put("/api/holidays/:id", (req, res) => {
  const store = readStore();
  const holiday = store.holidays.find((i) => i.id === req.params.id);
  if (!holiday) return res.status(404).json({ message: "Holiday not found" });
  holiday.holidayName = req.body.holidayName ?? holiday.holidayName;
  holiday.holidayDate = req.body.holidayDate ?? holiday.holidayDate;
  holiday.description = req.body.description ?? holiday.description;
  writeStore(store);
  res.json({ message: "Holiday updated", holiday });
});

app.delete("/api/holidays/:id", (req, res) => {
  const store = readStore();
  const idx = store.holidays.findIndex((i) => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: "Holiday not found" });
  const [holiday] = store.holidays.splice(idx, 1);
  writeStore(store);
  res.json({ message: "Holiday deleted", holiday });
});

/* ── Parent Approval (link-based) ── */
app.get("/api/parent-approval/:type/:token", (req, res) => {
  const store = readStore();
  const col = req.params.type === "gatepass" ? store.gatePasses : req.params.type === "leave" ? store.leaveRequests : null;
  if (!col) return res.status(404).json({ message: "Invalid type" });
  const item = col.find((i) => i.approvalToken === req.params.token);
  if (!item) return res.status(404).json({ message: "Approval request not found" });
  res.json({ type: req.params.type, request: { ...item, approvalLink: createParentApprovalLink(req, req.params.type, item.approvalToken) } });
});

app.post("/api/parent-approval/:type/:token", async (req, res) => {
  const store = readStore();
  const col = req.params.type === "gatepass" ? store.gatePasses : req.params.type === "leave" ? store.leaveRequests : null;
  if (!col) return res.status(404).json({ message: "Invalid type" });
  const item = col.find((i) => i.approvalToken === req.params.token);
  if (!item) return res.status(404).json({ message: "Approval request not found" });

  item.parentApproval = req.body.action === "approve" ? "Approved" : "Rejected";
  item.status = finalStatus(item.parentApproval, item.adminApproval);

  if (req.params.type === "gatepass" && item.status === "Approved") {
    item.qrCode = await QRCode.toDataURL(JSON.stringify({
      id: item.id, studentName: item.studentName, roomNumber: item.roomNumber,
      outTime: item.outTime, returnTime: item.returnTime, status: item.status,
    }));
  }
  writeStore(store);
  res.json({ message: req.body.action === "approve" ? "Parent approval recorded." : "Parent rejection recorded.", request: item });
});

/* ── Admin Stats & Overview ── */
app.get("/api/admin/stats", (req, res) => {
  const store = readStore();
  const resolved = store.complaints.filter((i) => i.status === "Resolved").length;
  const avgRating = store.feedback.length
    ? (store.feedback.reduce((s, i) => s + Number(i.rating || 0), 0) / store.feedback.length).toFixed(1)
    : "0.0";
  res.json({
    totalStudents: store.students.length,
    totalComplaints: store.complaints.length,
    resolvedComplaints: resolved,
    complaintStatus: {
      pending: store.complaints.filter((i) => i.status === "Pending").length,
      inProgress: store.complaints.filter((i) => i.status === "In Progress").length,
      resolved,
    },
    leaveRequests: store.leaveRequests.length,
    leaveByMonth: store.leaveRequests.reduce((acc, i) => {
      const k = new Date(i.fromDate).toLocaleString("en-US", { month: "short" });
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {}),
    feedbackRatings: store.feedback.reduce((acc, i) => {
      const k = String(i.rating);
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {}),
    foodRatings: avgRating,
    pendingGatePass: store.gatePasses.filter((i) => i.status === "Pending").length,
  });
});

app.get("/api/admin/overview", (req, res) => {
  const store = readStore();
  res.json({
    complaints: store.complaints,
    gatePasses: store.gatePasses.map((i) => ({ ...i, approvalLink: createParentApprovalLink(req, "gatepass", i.approvalToken) })),
    leaveRequests: store.leaveRequests.map((i) => ({ ...i, approvalLink: createParentApprovalLink(req, "leave", i.approvalToken) })),
    roomSwaps: store.roomSwaps,
    feedback: store.feedback,
    messMenu: store.messMenu,
    holidays: store.holidays,
  });
});

app.get("/", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "index.html")));

/* ══════════════════════════════════════════════════════════════
   EXPORT ROUTES
══════════════════════════════════════════════════════════════ */

/* helper — build xlsx buffer from array of objects */
function buildXlsx(sheetsMap) {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheetsMap)) {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  }
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

function sendXlsx(res, filename, sheetsMap) {
  const buf = buildXlsx(sheetsMap);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buf);
}

/* GET /api/export/users */
app.get("/api/export/users", (req, res) => {
  const store = readStore();
  const rows = store.students.map(s => ({
    "User ID": s.userId,
    "Name": s.name,
    "Role": s.role,
    "Room Number": s.roomNumber || "",
    "Block": s.block || "",
    "Parent Phone": s.parentPhone || "",
    "Parent Email": s.parentEmail || "",
  }));
  sendXlsx(res, "users.xlsx", { "Students": rows });
});

/* GET /api/export/complaints */
app.get("/api/export/complaints", (req, res) => {
  const store = readStore();
  const rows = store.complaints.map(c => ({
    "ID": c.id,
    "Student Name": c.studentName || "",
    "Room": c.roomNumber,
    "Type": c.complaintType,
    "Description": c.issueDescription,
    "Priority": c.priority || "",
    "Status": c.status,
    "Assurance Date": c.assuranceDate || "",
    "Escalated": c.escalated ? "Yes" : "No",
    "Created At": c.createdAt,
  }));
  sendXlsx(res, "complaints.xlsx", { "Complaints": rows });
});

/* GET /api/export/gatepass */
app.get("/api/export/gatepass", (req, res) => {
  const store = readStore();
  const rows = store.gatePasses.map(g => ({
    "ID": g.id,
    "Student Name": g.studentName,
    "Room": g.roomNumber,
    "Out Time": g.outTime,
    "Return Time": g.returnTime,
    "Reason": g.reason,
    "Parent Phone": g.parentPhone || "",
    "Parent Approval": g.parentApproval,
    "Admin Approval": g.adminApproval,
    "Status": g.status,
    "Created At": g.createdAt,
  }));
  sendXlsx(res, "gatepass.xlsx", { "Gate Passes": rows });
});

/* GET /api/export/full-report */
app.get("/api/export/full-report", (req, res) => {
  const store = readStore();
  const students = store.students.map(s => ({
    "User ID": s.userId, "Name": s.name, "Room": s.roomNumber || "",
    "Block": s.block || "", "Parent Phone": s.parentPhone || "", "Parent Email": s.parentEmail || "",
  }));
  const complaints = store.complaints.map(c => ({
    "ID": c.id, "Student": c.studentName || "", "Room": c.roomNumber,
    "Type": c.complaintType, "Priority": c.priority || "", "Status": c.status,
    "Assurance Date": c.assuranceDate || "", "Created": c.createdAt,
  }));
  const gatePasses = store.gatePasses.map(g => ({
    "ID": g.id, "Student": g.studentName, "Room": g.roomNumber,
    "Out": g.outTime, "Return": g.returnTime, "Status": g.status, "Created": g.createdAt,
  }));
  const leaves = store.leaveRequests.map(l => ({
    "ID": l.id, "Student": l.studentName, "Room": l.roomNumber,
    "From": l.fromDate, "To": l.toDate, "Reason": l.reason,
    "Parent": l.parentApproval, "Admin": l.adminApproval, "Status": l.status,
  }));
  const roomSwaps = store.roomSwaps.map(r => ({
    "ID": r.id, "From Room": r.currentRoomNumber, "To Room": r.requestedRoomNumber,
    "Reason": r.reason, "Status": r.status,
  }));
  const feedback = store.feedback.map(f => ({
    "ID": f.id, "Rating": f.rating, "Comment": f.comment, "Date": f.createdAt,
  }));
  sendXlsx(res, "full-report.xlsx", {
    "Students": students,
    "Complaints": complaints,
    "Gate Passes": gatePasses,
    "Leave Requests": leaves,
    "Room Swaps": roomSwaps,
    "Feedback": feedback,
  });
});

/* GET /api/users — for dashboard modal */
app.get("/api/users", (req, res) => {
  const store = readStore();
  res.json(store.students.map(s => sanitizeUser(s)));
});

/* ── Mailer ── */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

app.listen(PORT, () => console.log(`Smart Hostel server running on http://localhost:${PORT}`));

/* ── Escalation job ── */
const cron = require("node-cron");
cron.schedule("0 * * * *", async () => {
  const escalationEmail = process.env.ESCALATION_EMAIL;
  if (!escalationEmail) return;
  const store = readStore();
  const now = new Date();
  let changed = false;
  for (const c of store.complaints) {
    if (c.status !== "Resolved" && c.assuranceDate && new Date(c.assuranceDate) < now && !c.escalated) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: escalationEmail,
          subject: `[Escalation] Complaint ${c.id} overdue`,
          text: `Complaint ID: ${c.id}\nType: ${c.complaintType}\nRoom: ${c.roomNumber}\nDescription: ${c.issueDescription}\nAssurance Date (missed): ${c.assuranceDate}`,
        });
        c.escalated = true;
        changed = true;
      } catch (err) {
        console.error("[Escalation] Failed for", c.id, err.message);
      }
    }
  }
  if (changed) writeStore(store);
});
