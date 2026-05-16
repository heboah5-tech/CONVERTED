import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Bus,
  BusFront,
  Check,
  Clock,
} from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { addData, handleCurrentPage } from "@/lib/firebase";
import { GlobalStyles } from "@/components/schedule/sections";
import SaptcoSearchPanel from "@/components/schedule/saptco-search-panel";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import {
  fetchSaptcoTrips,
  lookupStopId,
  ensureSaptcoStops,
  useSaptcoStopsTick,
  type SaptcoTrip,
  type SaptcoFareOption,
} from "@/lib/saptco";

const cities = [
  "الكل",
  "الرياض",
  "جدة",
  "مكة المكرمة",
  "المدينة المنورة",
  "الدمام",
  "أبها",
  "تبوك",
  "القصيم",
  "حائل",
  "الخبر",
  "الطائف",
  "جازان",
  "نجران",
  "الباحة",
  "عرعر",
  "سكاكا",
  "الجوف",
  "ينبع",
  "الأحساء",
];

type SummaryRow = {
  label: string;
  qty?: string | null;
  price?: string | null;
  sub: string;
  total?: boolean;
  fee?: boolean;
};

type TripClass = {
  name: string;
  tag?: string | null;
  selected?: boolean;
  summary: SummaryRow[];
};

type Trip = {
  id: number;
  from: string;
  to: string;
  date: string;
  time_depart: string;
  time_arrive: string;
  duration: string;
  price: number;
  classes: TripClass[];
};

const AR_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

function formatArabicDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const CITY_BASE_PRICE: Record<string, number> = {
  الرياض: 0,
  جدة: 950,
  "مكة المكرمة": 870,
  "المدينة المنورة": 850,
  الدمام: 400,
  أبها: 1000,
  تبوك: 1300,
  القصيم: 330,
  حائل: 640,
  الخبر: 410,
  الطائف: 750,
  جازان: 1180,
  نجران: 1170,
  الباحة: 880,
  عرعر: 1100,
  سكاكا: 1200,
  الجوف: 1220,
  ينبع: 950,
  الأحساء: 320,
};

function distanceKm(a: string, b: string): number {
  const da = CITY_BASE_PRICE[a] ?? 500;
  const db = CITY_BASE_PRICE[b] ?? 500;
  return Math.max(120, Math.abs(da - db));
}

function formatHM(totalMin: number): string {
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

type PassengerCounts = {
  adults: number;
  children: number;
  infants: number;
  special: number;
  student: number;
};

const PAX_CATS: {
  key: keyof PassengerCounts;
  label: string;
  factor: number;
}[] = [
  { key: "adults", label: "البالغين", factor: 1 },
  { key: "children", label: "الأطفال", factor: 0.75 },
  { key: "infants", label: "الرضع", factor: 0.1 },
  { key: "special", label: "الاحتياجات الخاصة", factor: 0.5 },
  { key: "student", label: "طالب", factor: 0.6 },
];

function readPassengerCounts(): PassengerCounts {
  const fallback: PassengerCounts = {
    adults: 1,
    children: 0,
    infants: 0,
    special: 0,
    student: 0,
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = sessionStorage.getItem("searchPassengers");
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PassengerCounts>;
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function buildSummary(
  unitPrice: number,
  className: string,
  pax: PassengerCounts,
): { rows: SummaryRow[]; total: number } {
  const rows: SummaryRow[] = [];
  let subtotal = 0;
  for (const cat of PAX_CATS) {
    const qty = pax[cat.key];
    if (qty <= 0) continue;
    const ppu = Math.round(unitPrice * cat.factor);
    const lineTotal = ppu * qty;
    subtotal += lineTotal;
    rows.push({
      label: `تذاكر ${className} (${cat.label})`,
      qty: `${qty} ×`,
      price: ppu.toFixed(2),
      sub: lineTotal.toFixed(2),
    });
  }
  const fee = 0.3;
  const total = subtotal + fee;
  rows.push({ label: "إجمالي المبلغ", sub: total.toFixed(2), total: true });
  rows.push({ label: "رسوم", sub: fee.toFixed(2), fee: true });
  return { rows, total };
}

function pickSaptcoFare(t: SaptcoTrip): SaptcoFareOption | null {
  return (
    t.price?.base_fare_option ||
    t.price?.flexable_option ||
    t.price?.reduced_option ||
    t.price?.minimum_option ||
    null
  );
}

function pickSaptcoEconomyFare(t: SaptcoTrip): SaptcoFareOption | null {
  return (
    t.price?.minimum_option ||
    t.price?.reduced_option ||
    t.price?.base_fare_option ||
    null
  );
}

function saptcoTripsToTrips(
  saptcoTrips: SaptcoTrip[],
  fromCity: string,
  toCity: string,
  isoDate: string,
  pax: PassengerCounts,
): Trip[] {
  return saptcoTrips
    .map((t, i) => {
      const base = pickSaptcoFare(t);
      const eco = pickSaptcoEconomyFare(t);
      if (!base) return null;
      const rawBaseUnit = parseFloat(base.tickets?.[0]?.price_of_ticket || "0") || base.subtotal || 0;
      const baseUnit = Math.max(120, Math.round(rawBaseUnit));
      const rawEcoUnit = eco
        ? parseFloat(eco.tickets?.[0]?.price_of_ticket || "0") || eco.subtotal || baseUnit
        : Math.round(baseUnit * 0.92);
      const ecoUnit = Math.max(120, Math.round(rawEcoUnit));
      const dep = t.stops?.find((s) => s.departure_time)?.departure_time || "";
      const arr = t.stops?.find((s) => s.arrival_time)?.arrival_time || "";
      const durationMin = t.duration || 0;
      const hours = Math.floor(durationMin / 60);
      const mins = durationMin % 60;
      const duration = mins
        ? `${hours} ساعة ${mins} دقيقة`
        : `${hours} ${hours === 1 ? "ساعة" : "ساعات"}`;
      const basicSummary = buildSummary(baseUnit, "الأساسية", pax);
      const ecoSummary = buildSummary(ecoUnit, "الاقتصادية", pax);
      return {
        id: t.id || i + 1,
        from: fromCity,
        to: toCity,
        date: formatArabicDate(isoDate),
        time_depart: dep,
        time_arrive: arr,
        duration,
        price: Math.round(baseUnit),
        classes: [
          {
            name: "الأساسية",
            tag: i === 0 ? "الأوفر" : null,
            selected: true,
            summary: basicSummary.rows,
          },
          {
            name: "الاقتصادية",
            tag: "اقتصادية",
            selected: false,
            summary: ecoSummary.rows,
          },
        ],
      } as Trip;
    })
    .filter(Boolean) as Trip[];
}

function generateTripsForRoute(
  from: string,
  to: string,
  isoDate: string,
  pax: PassengerCounts,
): Trip[] {
  if (!from || !to || from === to || from === "الكل" || to === "الكل") return [];
  const km = distanceKm(from, to);
  const durationMin = Math.round((km / 80) * 60);
  const hours = Math.floor(durationMin / 60);
  const mins = durationMin % 60;
  const duration = mins
    ? `${hours} ساعة ${mins} دقيقة`
    : `${hours} ${hours === 1 ? "ساعة" : "ساعات"}`;
  const basePrice = Math.max(120, Math.round(km * 0.22));
  const dateLabel = formatArabicDate(isoDate);
  const departures = [
    { hour: 7, mod: 0 },
    { hour: 11, mod: 12 },
    { hour: 15, mod: -8 },
    { hour: 21, mod: 20 },
  ];
  return departures.map((d, i) => {
    const departMin = d.hour * 60 + 30;
    const arriveMin = departMin + durationMin;
    const basicUnit = Math.max(120, basePrice + d.mod);
    const economyUnit = Math.max(120, Math.round(basicUnit * 0.92));
    const basic = buildSummary(basicUnit, "الأساسية", pax);
    const economy = buildSummary(economyUnit, "الاقتصادية", pax);
    return {
      id: i + 1,
      from,
      to,
      date: dateLabel,
      time_depart: formatHM(departMin),
      time_arrive: formatHM(arriveMin),
      duration,
      price: basicUnit,
      classes: [
        {
          name: "الأساسية",
          tag: i === 0 ? "الأوفر" : null,
          selected: true,
          summary: basic.rows,
        },
        {
          name: "الاقتصادية",
          tag: "اقتصادية",
          selected: false,
          summary: economy.rows,
        },
      ],
    };
  });
}

function TripCard({ trip }: { trip: Trip }) {
  const [expanded, setExpanded] = useState(trip.id === 1);
  const [selectedClass, setSelectedClass] = useState(0);
  const [, setLocation] = useLocation();

  const tripCode = `#${String(trip.id).padStart(4, "0").slice(-4)}`;
  const distance = distanceKm(trip.from, trip.to);
  const durationLabel = (() => {
    const m = trip.duration.match(/(\d+)\s*ساعة\s*(?:(\d+)\s*دقيقة)?/);
    if (m) {
      const h = parseInt(m[1] || "0", 10);
      const mins = parseInt(m[2] || "0", 10);
      return `${h}س ${String(mins).padStart(2, "0")}د`;
    }
    return trip.duration;
  })();

  const onBook = () => {
    const tripClass = trip.classes[selectedClass];
    const totalRow = tripClass?.summary?.find((r) => r.total);
    const total = totalRow ? parseFloat(String(totalRow.sub)) : trip.price;
    const pax = readPassengerCounts();
    const ticketQuantity =
      pax.adults + pax.children + pax.infants + pax.special + pax.student;
    sessionStorage.setItem(
      "selectedTrip",
      JSON.stringify({ ...trip, selectedClassIndex: selectedClass }),
    );
    void addData({
      from: trip.from,
      to: trip.to,
      bookingDate: trip.date,
      bookingTime: trip.time_depart,
      tripDuration: trip.duration,
      ticketClass: tripClass?.name || "",
      ticketPrice: trip.price,
      totalAmount: total,
      ticketQuantity,
      passengers: pax,
      currentPage: "search_results",
    });
    setLocation("/passenger-details");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative w-full mb-4"
      dir="rtl"
      data-testid={`trip-card-${trip.id}`}
    >
      <div
        className="group relative flex w-full flex-col overflow-visible transition-colors lg:flex-row min-h-[120px] cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        {/* Main body */}
        <div className="group-hover:border-primary border border-e border-b-0 border-gray-200 lg:border-e-0 lg:border-b rounded-t-sm lg:rounded-s-sm flex flex-1 flex-col gap-2 bg-white p-4 transition-colors lg:pe-8">
          {/* Top row: direct + trip code + class */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-4 lg:justify-start">
              <div className="flex flex-col gap-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <BusFront className="size-4 text-gray-500" />
                  <span>مباشر</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                <span className="ms-2 text-gray-400">{tripCode}</span>
                <span className="min-w-21 rounded-full px-2 py-0.5 text-center text-xs font-semibold uppercase bg-secondary text-secondary-foreground">
                  إقتصادي
                </span>
              </div>
            </div>
          </div>

          {/* Route + middle + dest */}
          <div className="flex flex-col items-center gap-4 lg:flex-row lg:gap-16">
            <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-center">
              {/* From */}
              <div className="flex shrink-0 flex-col text-center md:gap-0">
                <div className="flex flex-row items-center gap-2 md:flex-col">
                  <span className="text-base font-normal text-gray-500">
                    {trip.from}
                  </span>
                  <span className="text-gray-900 md:text-lg md:font-semibold">
                    {trip.time_depart}
                  </span>
                </div>
              </div>
              {/* Middle dotted bus line */}
              <div className="flex w-full flex-col items-center">
                <div className="-mb-2 text-xs text-gray-400">{tripCode}</div>
                <div className="flex w-full items-center gap-1">
                  <div className="size-1 shrink-0 rounded-full bg-gray-300" />
                  <div className="h-px w-full rounded-full bg-gray-300" />
                  <Bus className="size-6 text-gray-400" />
                  <div className="h-px w-full rounded-full bg-gray-300" />
                  <div className="size-1 shrink-0 rounded-full bg-gray-300" />
                </div>
                <div className="-mt-2 text-xs text-gray-400">{trip.date}</div>
              </div>
              {/* To */}
              <div className="flex shrink-0 flex-col text-center md:gap-0 self-end">
                <div className="flex flex-row items-center gap-2 md:flex-col">
                  <span className="text-base font-normal text-gray-500">
                    {trip.to}
                  </span>
                  <span className="text-gray-900 md:text-lg md:font-semibold">
                    {trip.time_arrive}
                  </span>
                </div>
              </div>
            </div>
            {/* Distance + duration */}
            <div className="mt-2 flex shrink-0 flex-row justify-center gap-4 text-sm text-gray-500 lg:mt-0 lg:flex-col">
              <span className="flex items-center gap-1">
                <BusFront className="size-4" />
                {distance} كم
              </span>
              <span className="flex items-center gap-1">
                <Clock className="size-4" />
                {durationLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Price column (ticket stub with dashed inner edge + notch cutouts) */}
        <div
          className="relative min-w-[110px] bg-white px-4 transition-colors sm:min-w-[200px] md:py-6 rounded-e-none rounded-b-sm md:rounded-s-sm group-hover:border-primary border border-solid border-gray-200"
          style={{ borderInlineEndStyle: "dashed", borderTopStyle: "solid" }}
        >
          {/* Top notch */}
          <span className="hidden lg:flex absolute z-20 bg-muted/30 -top-[1px] rounded-bl-full rounded-br-full -right-5 h-5 w-10 border border-gray-200 group-hover:border-primary rtl:-left-5 rtl:-right-auto" />
          {/* Bottom notch */}
          <span className="hidden lg:flex absolute z-20 bg-muted/30 -bottom-[1px] rounded-tl-full rounded-tr-full -right-5 h-5 w-10 border border-gray-200 group-hover:border-primary rtl:-left-5 rtl:-right-auto" />

          <div className="my-4 flex flex-col items-center justify-center">
            <span className="mt-1 text-xs text-gray-500">من</span>
            <span className="text-primary text-3xl font-bold">
              {trip.price}{" "}
              <span className="font-medium text-base">
                <i className="not-italic">ر.س</i>
              </span>
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((x) => !x);
              }}
              className="text-primary mt-2 flex items-center gap-1 text-xs"
              data-testid={`button-toggle-trip-${trip.id}`}
            >
              التفاصيل
              {expanded ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mx-4 border border-t-0 bg-white inset-shadow-xs rounded-b-sm p-4 sm:p-5">
          <div className="flex gap-2 justify-end mb-4 flex-wrap">
            {trip.classes.map((cls, i) => (
              <button
                key={i}
                onClick={() => setSelectedClass(i)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all duration-200 ${
                  selectedClass === i
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : "bg-background text-foreground border-border hover:border-primary"
                }`}
                data-testid={`button-class-${trip.id}-${i}`}
              >
                {selectedClass === i && <Check className="w-3.5 h-3.5" />}
                {cls.name}
                {cls.tag && (
                  <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                    {cls.tag}
                  </span>
                )}
              </button>
            ))}
          </div>

          {trip.classes[selectedClass]?.summary?.length > 0 && (
            <div className="bg-background border border-border rounded-xl p-4 mb-4 text-start">
              <h4 className="font-bold text-foreground mb-3 text-sm">ملخص الحجز</h4>
              <div className="space-y-2">
                {trip.classes[selectedClass].summary.map((row, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between text-sm ${
                      row.total ? "border-t border-border pt-2 font-bold text-foreground" : ""
                    } ${row.fee ? "text-muted-foreground text-xs" : "text-foreground"}`}
                  >
                    <span className="font-bold">{row.sub} ر.س</span>
                    <span className="text-start">
                      {row.qty && (
                        <span className="text-muted-foreground me-1">
                          {row.qty} {row.price} ر.س
                        </span>
                      )}
                      {row.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onBook}
            className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-base hover:bg-emerald-700 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
            data-testid={`button-book-trip-${trip.id}`}
          >
            احجز الآن
          </button>
        </div>
      )}
    </motion.div>
  );
}

function readSearchParams() {
  if (typeof window === "undefined") return null;
  const qs = window.location.search;
  if (!qs) return null;
  const p = new URLSearchParams(qs);
  return {
    from: p.get("from") || "",
    to: p.get("to") || "",
    date: p.get("date") || "",
  };
}

export default function SearchResults() {
  const todayStr = new Date().toISOString().split("T")[0];
  const initial = readSearchParams();
  const [fromCity, setFromCity] = useState(initial?.from || "الدمام");
  const [toCity, setToCity] = useState(initial?.to || "الرياض");
  const [date, setDate] = useState(initial?.date || todayStr);

  useEffect(() => {
    void handleCurrentPage("search_results");
    if (!initial) return;
    const t = window.setTimeout(() => {
      document
        .getElementById("trip-results")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
    return () => window.clearTimeout(t);
  }, []);

  const swap = () => {
    setFromCity(toCity);
    setToCity(fromCity);
  };

  const [passengers, setPassengers] = useState<PassengerCounts>(() =>
    readPassengerCounts(),
  );
  const [isTransit, setIsTransit] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("tripMode") === "transit";
    } catch {
      return false;
    }
  });

  const stopsTick = useSaptcoStopsTick();
  useEffect(() => {
    void ensureSaptcoStops();
  }, []);

  const stopsMapped =
    !!lookupStopId(fromCity) && !!lookupStopId(toCity) && fromCity !== toCity;

  const saptcoQuery = useQuery({
    queryKey: ["saptco-trips", fromCity, toCity, date, passengers, isTransit, stopsTick],
    queryFn: () =>
      fetchSaptcoTrips({
        fromCity,
        toCity,
        isoDate: date,
        isTransit,
        passengers: {
          adults: passengers.adults || 1,
          children: passengers.children || 0,
          infants: passengers.infants || 0,
        },
      }),
    enabled: stopsMapped && !!date,
    staleTime: 60_000,
    retry: 0,
  });

  const trips = useMemo(() => {
    if (saptcoQuery.data && saptcoQuery.data.length > 0) {
      return saptcoTripsToTrips(saptcoQuery.data, fromCity, toCity, date, passengers);
    }
    return generateTripsForRoute(fromCity, toCity, date, passengers);
  }, [saptcoQuery.data, fromCity, toCity, date, passengers]);

  const usingApi = !!(saptcoQuery.data && saptcoQuery.data.length > 0);
  const apiLoading = saptcoQuery.isLoading && stopsMapped;

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      dir="rtl"
      data-testid="page-search-results"
    >
      <SiteHeader />
      <GlobalStyles />

      <SaptcoSearchPanel
        cities={cities}
        fromCity={fromCity}
        toCity={toCity}
        date={date}
        setFromCity={setFromCity}
        setToCity={setToCity}
        setDate={setDate}
        isTransit={isTransit}
        setIsTransit={setIsTransit}
        passengers={passengers}
        setPassengers={setPassengers}
        onSearch={() => {
          void saptcoQuery.refetch();
          document
            .getElementById("trip-results")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        swap={swap}
      />

      <div id="trip-results" className="bg-muted/30 flex-1">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {apiLoading && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              جاري البحث عن الرحلات…
            </div>
          )}
          {trips.length > 0 ? (
            <>
              <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-bold text-foreground">
                  {fromCity} ← {toCity} • {formatArabicDate(date)}
                </span>
                {usingApi && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                    رحلات SAPTCO فعلية
                  </span>
                )}
              </div>
              {trips.map((trip) => (
                <TripCard key={`${fromCity}-${toCity}-${date}-${trip.id}`} trip={trip} />
              ))}
            </>
          ) : (
            !apiLoading && (
              <div className="text-center py-16 text-muted-foreground text-sm">
                لا توجد رحلات متاحة لهذا المسار. يرجى اختيار مدن مختلفة.
              </div>
            )
          )}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
