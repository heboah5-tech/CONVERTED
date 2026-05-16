import { useEffect, useState } from "react";
import { Clock, ChevronLeft, ChevronRight, Accessibility, Train } from "lucide-react";
import { Link, useLocation } from "wouter";
import { addData, handleCurrentPage } from "@/lib/firebase";
import BookingStepBar from "@/components/booking-step-bar";

type SeatStatus = "available" | "taken" | "selected";
type Seat = { id: number; status: SeatStatus } | null;

const generateSeats = (): Seat[][] => {
  const taken = new Set([10, 11, 13, 14]);
  const aisle = new Set([16, 17, 18]);
  return Array.from({ length: 8 }, (_, rowIdx) => {
    const base = rowIdx * 3;
    return [base + 1, base + 2, base + 3].map<Seat>((n) => {
      if (aisle.has(n)) return null;
      return { id: n, status: taken.has(n) ? "taken" : "available" };
    });
  });
};

type PaxCounts = {
  adults: number;
  children: number;
  infants: number;
  special: number;
  student: number;
};

function readPax(): PaxCounts {
  const fb: PaxCounts = { adults: 1, children: 0, infants: 0, special: 0, student: 0 };
  try {
    const raw = sessionStorage.getItem("searchPassengers");
    if (!raw) return fb;
    return { ...fb, ...(JSON.parse(raw) as Partial<PaxCounts>) };
  } catch {
    return fb;
  }
}

function readSelectedTrip(): {
  className: string;
  from: string;
  to: string;
  date: string;
  time: string;
} {
  try {
    const raw = sessionStorage.getItem("selectedTrip");
    if (!raw) return { className: "الأعمال", from: "", to: "", date: "", time: "" };
    const t = JSON.parse(raw);
    const idx = typeof t.selectedClassIndex === "number" ? t.selectedClassIndex : 0;
    const cls = t.classes?.[idx];
    return {
      className: cls?.name || "الأعمال",
      from: t.from || "",
      to: t.to || "",
      date: t.date || "",
      time: t.time_depart || "",
    };
  } catch {
    return { className: "الأعمال", from: "", to: "", date: "", time: "" };
  }
}

function ChairSeat({
  seat,
  onClick,
}: {
  seat: NonNullable<Seat>;
  onClick: () => void;
}) {
  const cls =
    seat.status === "selected"
      ? "is-selected"
      : seat.status === "taken"
        ? "is-taken"
        : "";
  return (
    <button
      onClick={onClick}
      disabled={seat.status === "taken"}
      className={`hhsr-seat ${cls}`}
      data-testid={`seat-${seat.id}`}
      aria-label={`المقعد ${seat.id}`}
    >
      <span className="hhsr-seat__shape" aria-hidden="true" />
      <span className="absolute inset-0 flex items-end justify-center pb-1.5 text-[11px] font-extrabold pointer-events-none"
            style={{ color: seat.status === "available" ? "hsl(var(--foreground))" : "#fff" }}>
        {seat.id}
      </span>
    </button>
  );
}

export default function SeatSelection() {
  const [, setLocation] = useLocation();
  const [seats, setSeats] = useState<Seat[][]>(generateSeats);
  const [selected, setSelected] = useState<number[]>([]);
  const [coach, setCoach] = useState(1);
  const trip = readSelectedTrip();
  const _pax = readPax();
  const adultsCount =
    (_pax.adults || 0) +
      (_pax.children || 0) +
      (_pax.special || 0) +
      (_pax.student || 0) || 1;

  useEffect(() => {
    void handleCurrentPage("seat_selection");
  }, []);

  const toggleSeat = (rowIdx: number, colIdx: number) => {
    const seat = seats[rowIdx][colIdx];
    if (!seat || seat.status === "taken") return;

    setSeats((prev) => {
      const next: Seat[][] = prev.map((r) => r.map((s) => (s ? { ...s } : null)));
      const s = next[rowIdx][colIdx]!;
      if (s.status === "selected") {
        s.status = "available";
        setSelected((sel) => sel.filter((id) => id !== s.id));
      } else if (selected.length < adultsCount) {
        s.status = "selected";
        setSelected((sel) => [...sel, s.id]);
      }
      return next;
    });
  };

  const onContinue = () => {
    if (selected.length !== adultsCount) return;
    sessionStorage.setItem("selectedSeats", JSON.stringify(selected));
    void addData({ seats: selected, currentPage: "seat_selection" });
    setLocation("/passenger-details");
  };

  const coachLabel = String(coach).padStart(3, "0");

  return (
    <div className="min-h-screen" dir="rtl" data-testid="page-seat-selection">
      <BookingStepBar current={1} title="أختر المقعد" backHref="/schedule" />

      <div className="max-w-md mx-auto px-3 sm:px-4 py-4">
        {/* Trip summary card */}
        <div className="hhsr-card p-4 mb-4 text-start">
          <div className="flex items-center justify-end gap-2 mb-2">
            <h3 className="font-extrabold text-foreground text-base">المغادرة</h3>
          </div>
          <div className="flex items-center justify-end gap-2 text-sm">
            <span className="text-foreground">
              {trip.from || "المدينة المنورة"} ← {trip.to || "السليمانية - جدة"}
            </span>
            <Train className="w-4 h-4 text-[hsl(var(--gold-600))]" />
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
            <span className="tabular-nums">
              {trip.date || "13/05/2026"} - {trip.time || "15:50h"}
            </span>
            <span>{trip.className || "الأعمال"}</span>
          </div>
        </div>

        {/* Seat picker + legend */}
        <div className="flex gap-3">
          {/* Seat grid card */}
          <div className="hhsr-card flex-1 p-3 sm:p-4">
            {/* Direction arrow */}
            <div className="flex justify-center mb-3 text-[hsl(var(--gold-600))]">
              <svg width="20" height="28" viewBox="0 0 20 28" fill="currentColor" aria-hidden="true">
                <path d="M10 0 L18 12 L13 12 L13 28 L7 28 L7 12 L2 12 Z" />
              </svg>
            </div>
            <p className="text-center text-xs text-muted-foreground mb-3">
              وجهة السفر
            </p>

            {/* Coach navigator */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <button
                onClick={() => setCoach((c) => Math.max(1, c - 1))}
                className="w-8 h-8 rounded-full bg-[hsl(var(--gold-400))] text-white flex items-center justify-center hover:bg-[hsl(var(--gold-500))] transition-colors"
                data-testid="button-coach-prev"
                aria-label="العربة السابقة"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="font-bold text-foreground tabular-nums">
                العربة: {coachLabel}
              </div>
              <button
                onClick={() => setCoach((c) => c + 1)}
                className="w-8 h-8 rounded-full bg-[hsl(var(--gold-400))] text-white flex items-center justify-center hover:bg-[hsl(var(--gold-500))] transition-colors"
                data-testid="button-coach-next"
                aria-label="العربة التالية"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Seat grid */}
            <div className="flex flex-col items-center gap-3 pb-2">
              {seats.map((row, rowIdx) => (
                <div
                  key={rowIdx}
                  className="grid grid-cols-3 gap-2 sm:gap-3 place-items-center w-full max-w-[16rem]"
                >
                  {row.map((seat, colIdx) =>
                    seat === null ? (
                      <div
                        key={colIdx}
                        className="h-2 w-12 rounded-full bg-[hsl(var(--gold-100))]"
                      />
                    ) : (
                      <ChairSeat
                        key={colIdx}
                        seat={seat}
                        onClick={() => toggleSeat(rowIdx, colIdx)}
                      />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right legend column */}
          <div className="flex flex-col items-center gap-4 w-20 pt-2">
            <LegendItem state="selected" label={`المقعد ${selected[0] || ""}`.trim()} />
            <div className="flex flex-col items-center gap-1">
              <Accessibility className="w-7 h-7 text-[#1e88e5]" />
              <span className="text-[10px] text-foreground text-center leading-tight">
                ركاب ذوي الإعاقة أو ذوي ال...
              </span>
            </div>
            <LegendItem state="available" label="متاح" />
            <LegendItem state="taken" label="غير متاح" />
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={onContinue}
          disabled={selected.length !== adultsCount}
          className="btn-gold w-full mt-5"
          data-testid="button-continue-payment"
        >
          {selected.length === adultsCount
            ? "التالي"
            : `اختر ${adultsCount - selected.length} مقعد إضافي`}
        </button>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground px-1">
          <Link
            href="/schedule"
            className="text-[hsl(var(--gold-700))] font-medium hover:underline flex items-center gap-1"
          >
            <ChevronLeft className="w-3 h-3 rotate-180" />
            رجوع
          </Link>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>14:24 دقيقة متبقية</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ state, label }: { state: SeatStatus; label: string }) {
  const cls =
    state === "selected" ? "is-selected" : state === "taken" ? "is-taken" : "";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`hhsr-seat ${cls}`}>
        <span className="hhsr-seat__shape" aria-hidden="true" />
      </div>
      <span className="text-[10px] text-foreground text-center leading-tight">
        {label}
      </span>
    </div>
  );
}
