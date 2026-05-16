import { useState, useMemo } from "react";
import {
  ArrowLeftRight,
  Calendar,
  Users,
  Search,
  Bus,
  Clock,
  ChevronLeft,
  Zap,
  Globe,
} from "lucide-react";
import { Link } from "wouter";
import { BottomNav } from "./services";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

const cities = [
  "الرياض - العزيزية",
  "جدة",
  "مكة المكرمة",
  "المدينة المنورة",
  "الدمام",
  "أبها",
  "خميس مشيط",
  "تبوك",
  "القصيم",
  "حائل",
  "جازان",
  "نجران",
  "الباحة",
];

type Trip = {
  id: number;
  from: string;
  to: string;
  dep: string;
  arr: string;
  duration: string;
  price: number;
  seats: number;
  type: string;
  company: string;
};

const mockTrips: Trip[] = [
  { id: 1, from: "الرياض - العزيزية", to: "جدة", dep: "06:00", arr: "12:00", duration: "6 ساعات", price: 130, seats: 12, type: "اقتصادية", company: "سابتكو للنقل السعودي" },
  { id: 2, from: "الرياض - العزيزية", to: "جدة", dep: "09:00", arr: "15:00", duration: "6 ساعات", price: 155, seats: 3, type: "متميزة", company: "سابتكو للنقل السعودي" },
  { id: 3, from: "الرياض - العزيزية", to: "جدة", dep: "12:00", arr: "18:00", duration: "6 ساعات", price: 130, seats: 20, type: "اقتصادية", company: "سابتكو للنقل السعودي" },
  { id: 4, from: "الرياض - العزيزية", to: "جدة", dep: "15:00", arr: "21:00", duration: "6 ساعات", price: 180, seats: 8, type: "متميزة", company: "سابتكو للنقل السعودي" },
  { id: 5, from: "الرياض - العزيزية", to: "خميس مشيط", dep: "07:00", arr: "14:00", duration: "7 ساعات", price: 145, seats: 15, type: "اقتصادية", company: "سابتكو للنقل السعودي" },
  { id: 6, from: "الرياض - العزيزية", to: "الدمام", dep: "08:00", arr: "12:00", duration: "4 ساعات", price: 95, seats: 22, type: "اقتصادية", company: "سابتكو للنقل السعودي" },
];

function TripCard({ trip, passengers }: { trip: Trip; passengers: number }) {
  const total = trip.price * passengers;
  const seatsColor =
    trip.seats <= 5
      ? "text-destructive"
      : trip.seats <= 10
        ? "text-yellow-600"
        : "text-green-600";

  return (
    <div
      className="bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:border-primary/40 hover:shadow-md transition-all duration-300"
      data-testid={`card-trip-${trip.id}`}
    >
      <div className="flex-1">
        <p className="text-xs text-muted-foreground mb-1">{trip.company}</p>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xl font-black text-foreground">{trip.dep}</span>
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="flex-1 border-t-2 border-dashed border-border" />
            <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {trip.duration}
            </span>
            <div className="flex-1 border-t-2 border-dashed border-border" />
          </div>
          <span className="text-xl font-black text-foreground">{trip.arr}</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <span className="font-medium text-foreground">{trip.from}</span>
          <Bus className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground">{trip.to}</span>
        </div>
      </div>

      <div className="hidden sm:block w-px h-16 bg-border" />

      <div className="flex flex-row sm:flex-col items-center sm:items-end gap-4 sm:gap-2 w-full sm:w-auto">
        <div className="flex-1 sm:flex-none text-right">
          <span className={`text-xs font-medium ${seatsColor}`}>
            {trip.seats} مقعد متاح
          </span>
          <p className="text-xs text-muted-foreground">{trip.type}</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-primary">{total}</span>
          <span className="text-sm text-muted-foreground mr-1">ر.س</span>
        </div>
        <Link
          href="/schedule"
          className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow whitespace-nowrap"
          data-testid={`button-book-trip-${trip.id}`}
        >
          احجز الآن
        </Link>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold text-foreground/70 mb-1.5 text-right">
      {children}
    </label>
  );
}

export default function Trips() {
  const [tripType, setTripType] = useState<"one" | "round">("one");
  const [transit, setTransit] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [searched, setSearched] = useState(false);

  const swapCities = () => {
    setFrom(to);
    setTo(from);
  };

  const results = useMemo(() => {
    if (!searched) return [];
    return mockTrips.filter(
      (t) => (!from || t.from === from) && (!to || t.to === to),
    );
  }, [searched, from, to]);

  const handleSearch = () => setSearched(true);

  const fieldCls =
    "w-full bg-white border border-border rounded-xl px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none cursor-pointer";

  return (
    <div className="min-h-screen bg-background" dir="rtl" data-testid="page-trips">
      <SiteHeader />

      {/* SEARCH PANEL — booking.satrans.com.sa style */}
      <div className="bg-muted/40 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-5 sm:p-6">
            {/* Top row — transit checkbox + trip type radios */}
            <div className="flex items-center justify-between flex-wrap gap-3 mb-5 pb-5 border-b border-border/60">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={transit}
                  onChange={(e) => setTransit(e.target.checked)}
                  className="w-4 h-4 accent-primary cursor-pointer"
                  data-testid="checkbox-transit"
                />
                <span className="text-sm font-medium text-foreground">
                  البحث في رحلات الترانزيت
                </span>
              </label>

              <div className="flex items-center gap-5">
                {[
                  { val: "one" as const, label: "ذهاب فقط" },
                  { val: "round" as const, label: "ذهاب وعودة" },
                ].map((opt) => (
                  <label
                    key={opt.val}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {opt.label}
                    </span>
                    <span
                      onClick={() => setTripType(opt.val)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        tripType === opt.val
                          ? "border-primary"
                          : "border-muted-foreground/40"
                      }`}
                      data-testid={`radio-trip-${opt.val}`}
                    >
                      {tripType === opt.val && (
                        <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Row 1 — from / swap / to */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-end mb-4">
              <div>
                <FieldLabel>من</FieldLabel>
                <select
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setSearched(false);
                  }}
                  className={`${fieldCls} text-right`}
                  data-testid="select-from"
                >
                  <option value="">حدد محطة الذهاب ...</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-center md:pb-1">
                <button
                  onClick={swapCities}
                  className="w-11 h-11 rounded-full bg-[#3CB4D8] text-white flex items-center justify-center shadow-md hover:scale-110 hover:shadow-lg transition-all"
                  data-testid="button-swap"
                  aria-label="تبديل"
                >
                  <ArrowLeftRight className="w-5 h-5" />
                </button>
              </div>

              <div>
                <FieldLabel>إلى</FieldLabel>
                <select
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setSearched(false);
                  }}
                  className={`${fieldCls} text-right disabled:opacity-60 disabled:cursor-not-allowed`}
                  disabled={!from}
                  data-testid="select-to"
                >
                  <option value="">حدد الذهاب أولاً ...</option>
                  {cities
                    .filter((c) => c !== from)
                    .map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Row 2 — date / passengers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div>
                <FieldLabel>موعد المغادرة</FieldLabel>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`${fieldCls} text-right`}
                    placeholder="اختر تاريخ"
                    data-testid="input-date"
                  />
                </div>
              </div>

              <div>
                <FieldLabel>المسافرين ونوع التذكرة</FieldLabel>
                <div className="relative">
                  <Users className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <select
                    value={passengers}
                    onChange={(e) => setPassengers(Number(e.target.value))}
                    className={`${fieldCls} text-right`}
                    data-testid="select-passengers"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n === 1 ? "راكب واحد" : `${n} ركاب`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Bottom row — search + international link */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <button
                onClick={handleSearch}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                data-testid="button-search-trips"
              >
                <Search className="w-4 h-4" />
                البحث
              </button>

              <a
                href="#"
                className="text-primary text-sm font-medium hover:underline flex items-center gap-1.5"
              >
                <Globe className="w-4 h-4" />
                مسافر للخارج؟ احجز رحلتك الدولية الآن
                <ChevronLeft className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* RESULTS / EMPTY STATE */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        {!searched ? (
          <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
            <div className="relative">
              <div
                className="absolute inset-0 -m-6 rounded-[2.5rem] blur-2xl opacity-50 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle, #3CB4D8 0%, transparent 70%)",
                }}
              />
              <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-[#3CB4D8] to-[#2a8ba8] flex items-center justify-center shadow-2xl shadow-[#3CB4D8]/30 ring-4 ring-white">
                <Search className="w-11 h-11 text-white" />
                <span className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg ring-2 ring-white">
                  <Zap className="w-4 h-4 text-primary-foreground fill-primary-foreground" />
                </span>
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-foreground mt-3">
              مستعد للسفر؟
            </h2>
            <p className="text-muted-foreground text-sm max-w-md">
              ابدأ رحلتك بالبحث عن الرحلات المتاحة
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <Bus className="w-16 h-16 text-muted-foreground/40" />
            <h2 className="text-xl font-bold text-foreground">
              لا توجد رحلات متاحة
            </h2>
            <p className="text-muted-foreground text-sm">
              حاول تغيير المحطات أو التاريخ
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-sm">
                <span className="font-bold text-foreground">رحلات المغادرة</span>
                <span className="text-muted-foreground mr-2">
                  • عرض {results.length} من {results.length} رحلة
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">ترتيب حسب:</span>
                <select className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:border-primary">
                  <option>افتراضي</option>
                  <option>السعر</option>
                  <option>الوقت</option>
                </select>
              </div>
            </div>
            {results.map((trip) => (
              <TripCard key={trip.id} trip={trip} passengers={passengers} />
            ))}
          </div>
        )}
      </div>

      <SiteFooter />
      <BottomNav active="الرحلات" />
    </div>
  );
}
