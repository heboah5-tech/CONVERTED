import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Phone,
  Mail,
  ChevronDown,
  ChevronLeft,
  Clock,
  Check,
  AlertCircle,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { addData, handleCurrentPage } from "@/lib/firebase";

const STEPS = [
  { label: "التذاكر", done: true, active: false },
  { label: "التفاصيل", done: false, active: true },
  { label: "الشراء", done: false, active: false },
  { label: "الدفع", done: false, active: false },
];

const NATIONALITIES = [
  "سعودي",
  "مصري",
  "أردني",
  "إماراتي",
  "كويتي",
  "بحريني",
  "عراقي",
  "يمني",
  "سوري",
  "أخرى",
];
const ID_TYPES = ["الهوية الوطنية / الإقامة", "جواز السفر"];

const COUNTRY_CODES: { code: string; flag: string; label: string }[] = [
  { code: "+966", flag: "🇸🇦", label: "السعودية" },
  { code: "+971", flag: "🇦🇪", label: "الإمارات" },
  { code: "+973", flag: "🇧🇭", label: "البحرين" },
  { code: "+974", flag: "🇶🇦", label: "قطر" },
  { code: "+965", flag: "🇰🇼", label: "الكويت" },
  { code: "+968", flag: "🇴🇲", label: "عُمان" },
  { code: "+962", flag: "🇯🇴", label: "الأردن" },
  { code: "+961", flag: "🇱🇧", label: "لبنان" },
  { code: "+963", flag: "🇸🇾", label: "سوريا" },
  { code: "+964", flag: "🇮🇶", label: "العراق" },
  { code: "+967", flag: "🇾🇪", label: "اليمن" },
  { code: "+20", flag: "🇪🇬", label: "مصر" },
  { code: "+212", flag: "🇲🇦", label: "المغرب" },
  { code: "+216", flag: "🇹🇳", label: "تونس" },
  { code: "+213", flag: "🇩🇿", label: "الجزائر" },
  { code: "+249", flag: "🇸🇩", label: "السودان" },
  { code: "+1", flag: "🇺🇸", label: "أمريكا" },
  { code: "+44", flag: "🇬🇧", label: "بريطانيا" },
  { code: "+33", flag: "🇫🇷", label: "فرنسا" },
  { code: "+49", flag: "🇩🇪", label: "ألمانيا" },
  { code: "+90", flag: "🇹🇷", label: "تركيا" },
  { code: "+92", flag: "🇵🇰", label: "باكستان" },
  { code: "+91", flag: "🇮🇳", label: "الهند" },
];

type PassengerData = {
  title: string;
  firstName: string;
  lastName: string;
  dob: string;
  nationality: string;
  idType: string;
  idNumber: string;
  countryCode: string;
  phone: string;
  email: string;
};

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
              {step.done ? (
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              ) : (
                i + 1
              )}
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
            <div
              className={`w-6 sm:w-12 h-0.5 mb-4 ${i === 0 ? "bg-primary" : "bg-border"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function PassengerForm({
  index,
  label,
  data,
  onChange,
  showErrors = false,
}: {
  index: number;
  label: string;
  data: PassengerData;
  onChange: (next: PassengerData) => void;
  showErrors?: boolean;
}) {
  const set = <K extends keyof PassengerData>(key: K, val: PassengerData[K]) =>
    onChange({ ...data, [key]: val });
  const missing = (v: string) => showErrors && !v.trim();
  const errClass = (v: string) =>
    missing(v)
      ? "border-destructive focus:ring-destructive/30"
      : "border-border focus:ring-primary/30";
  const ErrText = ({
    v,
    msg = "هذا الحقل مطلوب",
  }: {
    v: string;
    msg?: string;
  }) =>
    missing(v) ? (
      <p className="text-[11px] text-destructive mt-1 text-start">{msg}</p>
    ) : null;

  return (
    <div className="bg-background border border-border rounded-2xl overflow-hidden mb-4">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
        <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
          {index}
        </div>
        <h3 className="font-bold text-foreground text-base">{label}</h3>
      </div>

      <div className="p-5 space-y-5">
        <div>
          <p className="text-xs font-bold text-muted-foreground mb-3 text-start">
            • المعلومات الشخصية
          </p>
          <div>
            <label className="text-xs text-muted-foreground block mb-1 text-start">
              اللقب *
            </label>
            <div className="relative">
              <select
                value={data.title}
                onChange={(e) => set("title", e.target.value)}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm text-start focus:outline-none focus:ring-2 bg-background appearance-none cursor-pointer ${errClass(data.title === "اختار" ? "" : data.title)}`}
                data-testid={`select-title-${index}`}
              >
                <option value="">السيد أو السيدة</option>
                <option value="السيد">السيد</option>
                <option value="السيدة">السيدة</option>
                <option value="الآنسة">الآنسة</option>
              </select>
              <ChevronDown className="absolute end-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
            <ErrText
              v={data.title === "اختار" ? "" : data.title}
              msg="الرجاء اختيار اللقب"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1 text-start">
                الاسم الأول *
              </label>
              <input
                value={data.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                placeholder="أدخل الاسم الأول"
                className={`w-full border rounded-xl px-3 py-2.5 text-sm text-start focus:outline-none focus:ring-2 bg-background ${errClass(data.firstName)}`}
                data-testid={`input-firstname-${index}`}
              />
              <ErrText v={data.firstName} />
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1 text-start">
                اسم العائلة *
              </label>
              <input
                value={data.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                placeholder="أدخل اسم العائلة"
                className={`w-full border rounded-xl px-3 py-2.5 text-sm text-start focus:outline-none focus:ring-2 bg-background ${errClass(data.lastName)}`}
                data-testid={`input-lastname-${index}`}
              />
              <ErrText v={data.lastName} />
            </div>
          </div>

          <div className="mb-3">
            <label className="text-xs text-muted-foreground block mb-1 text-start">
              تاريخ الميلاد *
            </label>
            <p className="text-xs text-muted-foreground text-start mb-1.5 flex items-center justify-end gap-1">
              <span>(12+) ألا يقل عن 12 أو أكثر</span>
              <AlertCircle className="w-3 h-3 text-primary" />
            </p>
            <input
              type="date"
              value={data.dob}
              onChange={(e) => set("dob", e.target.value)}
              className={`w-full border rounded-xl px-3 py-2.5 text-sm text-start focus:outline-none focus:ring-2 bg-background ${errClass(data.dob)}`}
              data-testid={`input-dob-${index}`}
            />
            <ErrText v={data.dob} />
          </div>

          <div className="mb-3">
            <label className="text-xs text-muted-foreground block mb-1 text-start">
              الجنسية *
            </label>
            <div className="relative">
              <select
                value={data.nationality}
                onChange={(e) => set("nationality", e.target.value)}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm text-start focus:outline-none focus:ring-2 bg-background appearance-none cursor-pointer ${errClass(data.nationality)}`}
                data-testid={`select-nationality-${index}`}
              >
                <option value="">اختار الجنسية</option>
                {NATIONALITIES.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
              <ChevronDown className="absolute end-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
            <ErrText v={data.nationality} msg="الرجاء اختيار الجنسية" />
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-muted-foreground mb-3 text-start">
            • وثيقة الهوية
          </p>

          <div className="mb-3">
            <label className="text-xs text-muted-foreground block mb-1.5 text-start">
              نوع وثيقة الهوية
            </label>
            <div className="flex rounded-xl border border-border overflow-hidden">
              {ID_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => set("idType", type)}
                  className={`flex-1 py-2.5 text-xs font-semibold transition-all ${
                    data.idType === type
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1 text-start">
              {data.idType === "جواز السفر"
                ? "رقم جواز السفر *"
                : "الهوية الوطنية / الإقامة الرقم *"}
            </label>
            {(() => {
              const isPassport = data.idType === "جواز السفر";
              const v = data.idNumber;
              let err = "";
              if (!v) {
                if (showErrors) err = "هذا الحقل مطلوب";
              } else if (!isPassport) {
                if (!/^\d+$/.test(v)) err = "يجب أن يحتوي على أرقام فقط";
                else if (v.length !== 10) err = "يجب أن يتكون من 10 أرقام";
                else if (!/^[12]/.test(v))
                  err = "يجب أن يبدأ بالرقم 1 (مواطن) أو 2 (مقيم)";
              }
              return (
                <>
                  <input
                    value={v}
                    onChange={(e) => {
                      const next = isPassport
                        ? e.target.value.toUpperCase().slice(0, 12)
                        : e.target.value.replace(/\D/g, "").slice(0, 10);
                      set("idNumber", next);
                    }}
                    inputMode={isPassport ? "text" : "numeric"}
                    maxLength={isPassport ? 12 : 10}
                    placeholder={
                      isPassport
                        ? "مثال: A1234567"
                        : "مثال: 1XXXXXXXXX أو 2XXXXXXXXX"
                    }
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm text-start focus:outline-none focus:ring-2 bg-background tabular-nums ${
                      err
                        ? "border-destructive focus:ring-destructive/30"
                        : "border-border focus:ring-primary/30"
                    }`}
                    dir="ltr"
                    data-testid={`input-idnumber-${index}`}
                  />
                  {err && (
                    <p
                      className="text-[11px] text-destructive mt-1 text-start"
                      data-testid={`error-idnumber-${index}`}
                    >
                      {err}
                    </p>
                  )}
                  {!isPassport && !err && v.length === 10 && (
                    <p className="text-[11px] text-emerald-600 mt-1 text-start">
                      ✓ رقم هوية صحيح
                    </p>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-muted-foreground mb-3 text-start">
            • معلومات الاتصال
          </p>
          <div className="flex items-center gap-2" dir="ltr">
            <div className="w-10 h-10 rounded-xl border border-border bg-muted/30 flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="relative">
              <select
                value={data.countryCode}
                onChange={(e) => set("countryCode", e.target.value)}
                className="appearance-none border border-border rounded-xl pl-3 pr-7 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium"
                data-testid={`select-country-code-${index}`}
                dir="ltr"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <input
              value={data.phone}
              maxLength={12}
              onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))}
              placeholder="5XXXXXXXX"
              inputMode="numeric"
              className="flex-1 border border-border rounded-xl px-3 py-2.5 text-sm text-start focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
              dir="ltr"
              data-testid={`input-phone-${index}`}
            />
          </div>
          <div className="flex items-center gap-2 mt-3" dir="ltr">
            <div className="w-10 h-10 rounded-xl border border-border bg-muted/30 flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-muted-foreground" />
            </div>
            <input
              type="email"
              value={data.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="example@email.com"
              inputMode="email"
              autoComplete="email"
              className="flex-1 border border-border rounded-xl px-3 py-2.5 text-sm text-start focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
              dir="ltr"
              data-testid={`input-email-${index}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
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
  const fb: PaxCounts = {
    adults: 1,
    children: 0,
    infants: 0,
    special: 0,
    student: 0,
  };
  try {
    const raw = sessionStorage.getItem("searchPassengers");
    if (!raw) return fb;
    return { ...fb, ...(JSON.parse(raw) as Partial<PaxCounts>) };
  } catch {
    return fb;
  }
}

function readSelectedTrip(): { unit: number; className: string } {
  try {
    const raw = sessionStorage.getItem("selectedTrip");
    if (!raw) return { unit: 0, className: "الأساسية" };
    const t = JSON.parse(raw);
    const idx =
      typeof t.selectedClassIndex === "number" ? t.selectedClassIndex : 0;
    const cls = t.classes?.[idx];
    const className = cls?.name || "الأساسية";
    const unit =
      idx === 1
        ? Math.max(85, Math.round((t.price ?? 0) * 0.78))
        : (t.price ?? 0);
    return { unit, className };
  } catch {
    return { unit: 0, className: "الأساسية" };
  }
}

function BookingSummary() {
  const pax = readPax();
  const { unit, className } = readSelectedTrip();
  const lines = PAX_META.filter((c) => pax[c.key] > 0).map((c) => {
    const ppu = Math.round(unit * c.factor);
    const lineTotal = ppu * pax[c.key];
    return { label: c.label, qty: pax[c.key], ppu, lineTotal };
  });
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const tax = Math.round(subtotal * 0.15 * 100) / 100;
  const grandTotal = Math.round((subtotal + tax) * 100) / 100;

  return (
    <div
      className="bg-background border border-border rounded-2xl p-5 mt-4"
      dir="rtl"
    >
      <h3 className="font-bold text-foreground text-base mb-4 text-start">
        ملخص الحجز
      </h3>

      <div className="mb-3 pb-3 border-b border-border/50">
        <p className="text-xs text-muted-foreground text-start mb-3">
          رحلة المغادرة
        </p>
        {lines.length === 0 ? (
          <p className="text-xs text-muted-foreground">لا توجد بيانات تذاكر</p>
        ) : (
          lines.map((l) => (
            <div key={l.label} className="mb-2 last:mb-0">
              <div className="flex justify-between text-sm">
                <span className="font-bold tabular-nums">
                  {l.lineTotal.toFixed(2)} ر.س
                </span>
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
          <span className="font-semibold tabular-nums">
            {subtotal.toFixed(2)} ر.س
          </span>
          <span className="text-muted-foreground">الإجمالي قبل الضريبة</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold tabular-nums">
            {tax.toFixed(2)} ر.س
          </span>
          <span className="text-muted-foreground">الضريبة (15٪)</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold tabular-nums">0.00 ر.س</span>
          <span className="text-muted-foreground">الخصم</span>
        </div>
        <div className="flex justify-between border-t border-border pt-2 mt-2">
          <span className="font-extrabold text-base text-primary tabular-nums">
            {grandTotal.toFixed(2)} ر.س
          </span>
          <span className="font-bold text-foreground">الإجمالي</span>
        </div>
      </div>
    </div>
  );
}

const emptyPassenger: PassengerData = {
  title: "اختار",
  firstName: "",
  lastName: "",
  dob: "",
  nationality: "",
  idType: ID_TYPES[0],
  idNumber: "",
  countryCode: "+966",
  phone: "",
  email: "",
};

export default function PassengerDetails() {
  const [, setLocation] = useLocation();
  const [passenger, setPassenger] = useState<PassengerData>(emptyPassenger);

  useEffect(() => {
    void handleCurrentPage("passenger_details");
  }, []);

  const onContinue = () => {
    sessionStorage.setItem("passenger", JSON.stringify(passenger));
    const fullName = [passenger.firstName, passenger.lastName]
      .filter(Boolean)
      .join(" ");
    void addData({
      name: fullName,
      passengerTitle: passenger.title,
      passengerFirstName: passenger.firstName,
      passengerLastName: passenger.lastName,
      passengerDob: passenger.dob,
      nationality: passenger.nationality,
      idType: passenger.idType,
      saudiId: passenger.idNumber,
      countryCode: passenger.countryCode,
      phone: `${passenger.countryCode}${passenger.phone.replace(/^0+/, "")}`,
      email: passenger.email,
      currentPage: "passenger_details",
    });
    setLocation("/seat-selection");
  };

  return (
    <div
      className="min-h-screen bg-muted/30"
      dir="rtl"
      data-testid="page-passenger-details"
    >
      <StepBar />

      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-background border border-border rounded-2xl p-5 mb-4"
        >
          <div className="flex gap-4">
            <div className="text-start">
              <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center mb-2">
                <div className="text-center">
                  <div className="text-xs font-bold text-foreground">0/1</div>
                  <div className="text-[9px] text-muted-foreground">مسافر</div>
                  <div className="text-[9px] text-muted-foreground">كاملة</div>
                </div>
              </div>
            </div>
            <div className="flex-1 text-start">
              <div className="flex items-center justify-end gap-2 mb-2">
                <h2 className="text-lg font-extrabold text-foreground">
                  تفاصيل المسافرين
                </h2>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                أكمل تفاصيل جميع المسافرين قبل المتابعة للدفع.
              </p>
            </div>
          </div>
        </motion.div>

        <PassengerForm
          index={1}
          label="المسافر الأول (البالغين)"
          data={passenger}
          onChange={setPassenger}
        />

        <BookingSummary />

        <button
          onClick={onContinue}
          className="w-full mt-4 py-4 rounded-xl font-bold text-base bg-emerald-600 text-white hover:bg-emerald-700 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
          data-testid="button-continue-to-seats"
        >
          <ChevronLeft className="w-5 h-5" />
          متابعة لاختيار المقعد
        </button>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground px-1">
          <Link
            href="/search-results"
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
