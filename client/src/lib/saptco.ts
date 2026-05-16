import { useSyncExternalStore } from "react";

export type SaptcoPassengers = {
  adults: number;
  children?: number;
  infants?: number;
};

export const SAPTCO_STOPS: Record<string, number> = {
  "الرياض": 10,
  "الرياض - العزيزية": 10,
  "Riyadh -AL Azziziya": 10,
  "جدة": 121,
  "Jeddah": 121,
};

export type SaptcoTrip = {
  id: number;
  trip_code: string;
  departure_date: string;
  type: string;
  lowest_price: number;
  duration: number;
  distance: number;
  stops: {
    id: number;
    stop_name: string;
    departure_time?: string;
    arrival_time?: string;
    next_day?: boolean;
  }[];
  price: {
    base_fare_option?: SaptcoFareOption;
    minimum_option?: SaptcoFareOption;
    reduced_option?: SaptcoFareOption;
    flexable_option?: SaptcoFareOption;
  };
};

export type SaptcoFareOption = {
  fare_category: string;
  available_seats: number;
  hide_fare?: boolean;
  total: number;
  subtotal: number;
  vat_value: number;
  tickets: { price_of_ticket: string; total: number; count: string }[];
};

export type SaptcoApiResponse = {
  data: SaptcoTrip[];
};

function normalize(s: string): string {
  return s
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\s\-_/\\.,;:()[\]'"`]+/g, "")
    .toLowerCase()
    .trim();
}

export function lookupStopId(name: string): number | null {
  if (!name) return null;
  if (SAPTCO_STOPS[name] != null) return SAPTCO_STOPS[name];
  const n = normalize(name);
  let best: number | null = null;
  let bestLen = 0;
  for (const [k, v] of Object.entries(SAPTCO_STOPS)) {
    const kn = normalize(k);
    if (!kn) continue;
    if (kn === n) return v;
    if (kn.includes(n) || n.includes(kn)) {
      if (kn.length > bestLen) {
        best = v;
        bestLen = kn.length;
      }
    }
  }
  return best;
}

const STOPS_CACHE_KEY = "saptco_stops_v1";
const STOPS_TTL_MS = 24 * 60 * 60 * 1000;

let stopsReadyTick = 0;
const stopsListeners = new Set<() => void>();

function emitStopsChange() {
  stopsReadyTick += 1;
  stopsListeners.forEach((l) => l());
}

function getStopsTick() {
  return stopsReadyTick;
}

function subscribeStops(cb: () => void) {
  stopsListeners.add(cb);
  return () => {
    stopsListeners.delete(cb);
  };
}

export function useSaptcoStopsTick(): number {
  return useSyncExternalStore(subscribeStops, getStopsTick, getStopsTick);
}

function mergeStopsFromApi(arr: any[]): number {
  let added = 0;
  for (const s of arr) {
    const id = Number(s?.id ?? s?.stop_id);
    if (!id) continue;
    const names: string[] = [];
    for (const key of [
      "name_ar",
      "stop_name_ar",
      "ar_name",
      "name",
      "stop_name",
      "name_en",
      "stop_name_en",
      "en_name",
    ]) {
      const v = s?.[key];
      if (typeof v === "string" && v.trim()) names.push(v.trim());
    }
    const city = s?.city;
    if (city && typeof city === "object") {
      for (const key of ["name_ar", "ar_name", "name", "name_en", "en_name"]) {
        const v = (city as any)[key];
        if (typeof v === "string" && v.trim()) names.push(v.trim());
      }
    }
    for (const n of names) {
      if (SAPTCO_STOPS[n] == null) {
        SAPTCO_STOPS[n] = id;
        added += 1;
      }
    }
  }
  return added;
}

let inflightStopsLoad: Promise<void> | null = null;
let lastStopsLoadAt = 0;
let stopsLoadedFromApi = false;
const STOPS_RETRY_COOLDOWN_MS = 60 * 1000;

export function ensureSaptcoStops(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (inflightStopsLoad) return inflightStopsLoad;
  if (stopsLoadedFromApi) return Promise.resolve();
  if (lastStopsLoadAt && Date.now() - lastStopsLoadAt < STOPS_RETRY_COOLDOWN_MS) {
    return Promise.resolve();
  }

  try {
    const cached = localStorage.getItem(STOPS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as {
        t?: number;
        map?: Record<string, number>;
      };
      if (
        parsed?.t &&
        parsed?.map &&
        Date.now() - parsed.t < STOPS_TTL_MS &&
        Object.keys(parsed.map).length > 0
      ) {
        for (const [k, v] of Object.entries(parsed.map)) {
          if (SAPTCO_STOPS[k] == null) SAPTCO_STOPS[k] = v;
        }
        emitStopsChange();
      }
    }
  } catch {
    /* ignore cache errors */
  }

  inflightStopsLoad = (async () => {
    const endpoints = [
      "https://api.satrans.com.sa/api/v1/web/stops?per_page=1000",
      "https://api.satrans.com.sa/api/v1/web/stops",
      "https://api.satrans.com.sa/api/v1/web/lookup/stops",
    ];
    try {
      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: "GET",
            headers: { Accept: "application/json" },
          });
          if (!res.ok) continue;
          const json: any = await res.json();
          const arr: any[] = Array.isArray(json?.data)
            ? json.data
            : Array.isArray(json?.data?.data)
              ? json.data.data
              : Array.isArray(json)
                ? json
                : [];
          if (!arr.length) continue;
          const added = mergeStopsFromApi(arr);
          if (added > 0) {
            try {
              const snapshot: Record<string, number> = { ...SAPTCO_STOPS };
              localStorage.setItem(
                STOPS_CACHE_KEY,
                JSON.stringify({ t: Date.now(), map: snapshot }),
              );
            } catch {
              /* ignore quota errors */
            }
            emitStopsChange();
          }
          stopsLoadedFromApi = true;
          return;
        } catch {
          /* try next endpoint */
        }
      }
    } finally {
      lastStopsLoadAt = Date.now();
      inflightStopsLoad = null;
    }
  })();

  return inflightStopsLoad;
}

export async function fetchSaptcoTrips(args: {
  fromCity: string;
  toCity: string;
  isoDate: string;
  passengers: SaptcoPassengers;
  isTransit?: boolean;
}): Promise<SaptcoTrip[]> {
  await ensureSaptcoStops();
  const departureId = lookupStopId(args.fromCity);
  const arrivalId = lookupStopId(args.toCity);
  if (!departureId || !arrivalId) {
    throw new Error("STOP_NOT_MAPPED");
  }
  const qs = new URLSearchParams({
    departure_stop_id: String(departureId),
    arrival_stop_id: String(arrivalId),
    departure_date: args.isoDate,
    is_transit: args.isTransit ? "1" : "0",
    page: "1",
    per_page: "10",
  });
  qs.append("passengers[Adult]", String(Math.max(1, args.passengers.adults)));
  if (args.passengers.children && args.passengers.children > 0) {
    qs.append("passengers[Child]", String(args.passengers.children));
  }
  if (args.passengers.infants && args.passengers.infants > 0) {
    qs.append("passengers[Infant]", String(args.passengers.infants));
  }
  const url = `https://api.satrans.com.sa/api/v1/web/trips/filter?${qs.toString()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`SAPTCO ${res.status}`);
  const json = (await res.json()) as SaptcoApiResponse;
  return Array.isArray(json?.data) ? json.data : [];
}
