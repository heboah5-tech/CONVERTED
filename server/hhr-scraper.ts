import { chromium, type Browser, type Page } from "playwright-core";
import fs from "node:fs";

const HHR_HOME = "https://sar.hhr.sa/ar/web/booking/home";
const CAPSOLVER_API = "https://api.capsolver.com";
const CAPSOLVER_KEY = process.env.CAPSOLVER_API_KEY || "";
const RECAPTCHA_SITEKEY = "6LeUqS8sAAAAAJZ6Jv0NW2z1vPUrBmCgYvXEXiRS";

const FORM_PREFIX = "_ossportlet_WAR_ossliferay_:formSearchTravel:";

export interface HhrTrip {
  train: string;
  departure: string;
  arrival: string;
  duration: string;
  priceBusiness: number;
  priceEconomy: number;
  stops: number;
}

export interface HhrSearchInput {
  fromId: string;
  toId: string;
  date: string;
  adults: number;
  children?: number;
  infants?: number;
}

let cachedBrowser: Browser | null = null;
async function getBrowser(): Promise<Browser> {
  if (cachedBrowser && cachedBrowser.isConnected()) return cachedBrowser;
  const candidates = [
    process.env.CHROMIUM_PATH,
    "/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean) as string[];
  let executablePath = "";
  for (const p of candidates) {
    if (fs.existsSync(p)) { executablePath = p; break; }
  }
  if (!executablePath) {
    try {
      const out = (await import("node:child_process")).execSync("which chromium 2>/dev/null || true").toString().trim();
      if (out && fs.existsSync(out)) executablePath = out;
    } catch {}
  }
  if (!executablePath) throw new Error("Chromium binary not found");
  cachedBrowser = await chromium.launch({
    executablePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-zygote",
      "--single-process",
      "--ignore-certificate-errors",
    ],
  });
  return cachedBrowser;
}

async function solveRecaptcha(sitekey: string, pageUrl: string): Promise<string> {
  if (!CAPSOLVER_KEY) throw new Error("CAPSOLVER_API_KEY not set");
  const createResp = await fetch(`${CAPSOLVER_API}/createTask`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clientKey: CAPSOLVER_KEY,
      task: {
        type: "ReCaptchaV2TaskProxyLess",
        websiteURL: pageUrl,
        websiteKey: sitekey,
      },
    }),
  });
  const created = (await createResp.json()) as {
    errorId?: number; errorDescription?: string; taskId?: string;
  };
  if (created.errorId || !created.taskId) {
    throw new Error(`CapSolver createTask failed: ${created.errorDescription || "unknown"}`);
  }
  const taskId = created.taskId;
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    const resR = await fetch(`${CAPSOLVER_API}/getTaskResult`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientKey: CAPSOLVER_KEY, taskId }),
    });
    const r = (await resR.json()) as {
      status?: string; errorId?: number; errorDescription?: string;
      solution?: { gRecaptchaResponse?: string };
    };
    if (r.errorId) throw new Error(`CapSolver error: ${r.errorDescription}`);
    if (r.status === "ready" && r.solution?.gRecaptchaResponse) {
      return r.solution.gRecaptchaResponse;
    }
  }
  throw new Error("CapSolver timed out");
}

function isoToHhrDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function parseDuration(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const h = cleaned.match(/(\d+)\s*(?:س|ساعة|ساعات|h)/);
  const mn = cleaned.match(/(\d+)\s*(?:د|دقيقة|دقائق|m|min)/);
  if (h || mn) return `${h ? h[1] : "0"}س ${mn ? mn[1] : "0"}د`;
  return cleaned;
}

async function selectNative(page: Page, fieldId: string, value: string): Promise<void> {
  const sel = `select[id="${FORM_PREFIX}${fieldId}"]`;
  await page.waitForSelector(sel, { timeout: 30000 });
  // Wait until it's not disabled
  await page.waitForFunction(
    (s) => {
      const el = document.querySelector(s) as HTMLSelectElement | null;
      return !!el && !el.disabled;
    },
    sel,
    { timeout: 20000 },
  );
  await page.selectOption(sel, value);
  // Mojarra.ab fires automatically via inline onchange; wait a beat for AJAX to settle
  await page.waitForTimeout(900);
}

async function extractTrips(page: Page): Promise<HhrTrip[]> {
  const raw = await page.evaluate(() => {
    const norm = (s: string | null | undefined) => (s || "").replace(/\s+/g, " ").trim();
    const rows = Array.from(document.querySelectorAll("tr[data-rk], tr[data-ri], tbody.ui-datatable-data > tr"));
    const out: any[] = [];
    for (const row of rows) {
      const txt = norm((row as HTMLElement).innerText || row.textContent || "");
      const times = (txt.match(/\b\d{1,2}:\d{2}\b/g) || []).slice(0, 2);
      if (times.length < 2) continue;
      const trainMatch = txt.match(/\b(8\d{4}|HHR\s*\d+)\b/);
      const durMatch = txt.match(/(\d+\s*(?:س|ساعة|ساعات)[\s\d]*?(?:د|دقيقة|دقائق)?)/);
      const priceMatches = txt.match(/\d{2,4}[.,]\d{2}/g) || [];
      const stopsMatch = txt.match(/توقف\s*(\d+)/);
      out.push({
        rk: row.getAttribute("data-rk") || row.getAttribute("data-ri") || "",
        train: trainMatch ? trainMatch[1] : "",
        departure: times[0],
        arrival: times[1],
        duration: durMatch ? durMatch[1] : "",
        prices: priceMatches.slice(0, 6),
        stops: stopsMatch ? parseInt(stopsMatch[1], 10) : 0,
      });
    }
    return out;
  });
  const trips: HhrTrip[] = [];
  for (const r of raw) {
    const prices = (r.prices as string[])
      .map((p) => parseFloat(p.replace(/,/g, "")))
      .filter((n) => Number.isFinite(n) && n > 0);
    prices.sort((a, b) => a - b);
    const economy = prices[0] || 0;
    const business = prices[prices.length - 1] || economy;
    if (!r.departure || !r.arrival) continue;
    trips.push({
      train: r.train || `8${r.rk}`,
      departure: r.departure,
      arrival: r.arrival,
      duration: parseDuration(r.duration),
      priceBusiness: business,
      priceEconomy: economy,
      stops: r.stops,
    });
  }
  const seen = new Set<string>();
  return trips.filter((t) => {
    const k = `${t.departure}|${t.train}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function scrapeHhr(input: HhrSearchInput): Promise<HhrTrip[]> {
  const browser = await getBrowser();
  const ctx = await browser.newContext({
    locale: "ar-SA",
    viewport: { width: 1366, height: 800 },
    ignoreHTTPSErrors: true,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
  });
  // Block non-essential heavy resources to speed page load
  await ctx.route("**/*", (route) => {
    const t = route.request().resourceType();
    if (t === "image" || t === "font" || t === "media") return route.abort();
    const u = route.request().url();
    if (/google-analytics|googletagmanager|doubleclick|hotjar|facebook|gstatic\.com\/ea\//.test(u)) {
      return route.abort();
    }
    return route.continue();
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(45_000);
  // Start CapSolver in parallel as soon as we begin loading the page.
  const solveTokenP = solveRecaptcha(RECAPTCHA_SITEKEY, HHR_HOME);
  // Swallow rejection so it never becomes unhandled if scraping aborts early.
  solveTokenP.catch(() => {});
  try {
    await page.goto(HHR_HOME, { waitUntil: "commit", timeout: 60_000 });
    await page.waitForSelector(`select[id="${FORM_PREFIX}comboStationFrom"]`, { timeout: 30_000 });

    await selectNative(page, "comboStationFrom", input.fromId);
    await selectNative(page, "comboStationTo", input.toId);

    const dateStr = isoToHhrDate(input.date);
    await page.evaluate(
      ({ id, d }) => {
        const inp = document.getElementById(id) as HTMLInputElement | null;
        if (inp) {
          inp.removeAttribute("readonly");
          inp.value = d;
          inp.dispatchEvent(new Event("input", { bubbles: true }));
          inp.dispatchEvent(new Event("change", { bubbles: true }));
          inp.dispatchEvent(new Event("blur", { bubbles: true }));
        }
      },
      { id: `${FORM_PREFIX}calendar`, d: dateStr },
    );
    await page.waitForTimeout(700);

    if (input.adults && input.adults !== 1) {
      await selectNative(page, "adults", String(Math.max(1, Math.min(input.adults, 9))));
    }
    if (input.children && input.children > 0) {
      await selectNative(page, "children", String(Math.min(input.children, 9)));
    }
    if (input.infants && input.infants > 0) {
      await selectNative(page, "infants", String(Math.min(input.infants, 9)));
    }

    // Wait for CapSolver token, inject into g-recaptcha-response, then submit.
    const token = await solveTokenP;
    await page.evaluate((tok) => {
      document.querySelectorAll('textarea[id^="g-recaptcha-response"]').forEach((el) => {
        const t = el as HTMLTextAreaElement;
        t.style.display = "block";
        t.value = tok;
      });
      const ta = document.getElementById("g-recaptcha-response") as HTMLTextAreaElement | null;
      if (ta) {
        ta.style.display = "block";
        ta.value = tok;
      }
      // Walk grecaptcha config for callback (in case site relies on it)
      const cfg = (window as any).___grecaptcha_cfg;
      if (cfg?.clients) {
        const stack: any[] = Object.values(cfg.clients);
        const seen = new Set<any>();
        while (stack.length) {
          const n = stack.pop();
          if (!n || typeof n !== "object" || seen.has(n)) continue;
          seen.add(n);
          for (const k of Object.keys(n)) {
            const v = (n as any)[k];
            if (typeof v === "function" && (k === "callback" || k.startsWith("callback"))) {
              try { v(tok); } catch {}
            }
            if (v && typeof v === "object") stack.push(v);
          }
        }
      }
    }, token);

    await page.click(`button[id="${FORM_PREFIX}search"]`);

    // Wait for results (rows in datatable) or a "no results" message.
    await page.waitForFunction(
      () =>
        document.querySelectorAll("tbody.ui-datatable-data > tr, tr[data-rk], tr[data-ri]").length > 0
          || /لا توجد|no results|sin resultados|لا تتوفر/i.test(document.body.innerText || ""),
      undefined,
      { timeout: 60_000 },
    );

    return await extractTrips(page);
  } finally {
    await ctx.close().catch(() => {});
  }
}
