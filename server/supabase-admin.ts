import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import WebSocketImpl from "ws";

// Supabase Realtime requires a WebSocket constructor; Node < 22 has none.
// We never actually use Realtime on the server, but the SDK still tries to
// initialize a RealtimeClient when createClient() runs, so we polyfill it.
if (typeof (globalThis as any).WebSocket === "undefined") {
  (globalThis as any).WebSocket = WebSocketImpl;
}

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

let _admin: SupabaseClient | null = null;
let _anon: SupabaseClient | null = null;

/** Service-role client — bypasses RLS. Use ONLY on the server. */
export function sbAdmin(): SupabaseClient | null {
  if (_admin) return _admin;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("[supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set.");
    return null;
  }
  _admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}

/** Anon client — used only to verify admin passwords via GoTrue. */
export function sbAnon(): SupabaseClient | null {
  if (_anon) return _anon;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  _anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _anon;
}

export const SUPABASE_PUBLIC_URL = SUPABASE_URL;
export const SUPABASE_PUBLIC_ANON_KEY = SUPABASE_ANON_KEY;
