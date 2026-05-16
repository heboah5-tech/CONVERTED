import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Phone,
  Mail,
  CalendarDays,
  Users,
  IdCard,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { addData, handleCurrentPage } from "@/lib/firebase";
import BookingStepBar from "@/components/booking-step-bar";

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
  { code: "+966", flag: "🇸🇦", label: "المملكة العربية السعودية" },
  { code: "+971", flag: "🇦🇪", label: "الإمارات" },
  { code: "+973", flag: "🇧🇭", label: "البحرين" },
  { code: "+974", flag: "🇶🇦", label: "قطر" },
  { code: "+965", flag: "🇰🇼", label: "الكويت" },
  { code: "+968", flag: "🇴🇲", label: "عُمان" },
  { code: "+962", flag: "🇯🇴", label: "الأردن" },
  { code: "+20", flag: "🇪🇬", label: "مصر" },
  { code: "+90", flag: "🇹🇷", label: "تركيا" },
  { code: "+44", flag: "🇬🇧", label: "بريطانيا" },
  { code: "+1", flag: "🇺🇸", label: "أمريكا" },
];

type PaxKind = "adult" | "child" | "infant";

type PassengerData = {
  kind: PaxKind;
  title: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dob: string;
  gender: string;
  nationality: string;
  idType: string;
  idNumber: string;
  idExpiry: string;
};

type ContactData = {
  countryCode: string;
  phone: string;
  email: string;
};

const emptyPassenger = (kind: PaxKind): PassengerData => ({
  kind,
  title: "",
  firstName: "",
  middleName: "",
  lastName: "",
  dob: "",
  gender: "",
  nationality: "",
  idType: ID_TYPES[0],
  idNumber: "",
  idExpiry: "",
});

const emptyContact: ContactData = {
  countryCode: "+966",
  phone: "",
  email: "",
};

type PaxCounts = {
  adults: number;
  children: number;
  infants: number;
};

function readPaxCounts(): PaxCounts {
  const fb: PaxCounts = { adults: 1, children: 0, infants: 0 };
  try {
    const raw = sessionStorage.getItem("searchPassengers");
    if (!raw) return fb;
    const p = JSON.parse(raw);
    return {
      adults: Math.max(1, Number(p.adults) || 1),
      children: Math.max(0, Number(p.children) || 0),
      infants: Math.max(0, Number(p.infants) || 0),
    };
  } catch {
    return fb;
  }
}

function readSelectedTrip() {
  try {
    const raw = sessionStorage.getItem("selectedTrip");
    if (!raw) return { from: "", to: "" };
    const t = JSON.parse(raw);
    return { from: t.from || "", to: t.to || "" };
  } catch {
    return { from: "", to: "" };
  }
}

function readSelectedSeats(): number[] {
  try {
    const raw = sessionStorage.getItem("selectedSeats");
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

const KIND_LABEL_AR: Record<PaxKind, string> = {
  adult: "مسافر بالغ",
  child: "طفل",
  infant: "رضيع",
};

function buildPassengerList(counts: PaxCounts): PassengerData[] {
  const list: PassengerData[] = [];
  for (let i = 0; i < counts.adults; i++) list.push(emptyPassenger("adult"));
  for (let i = 0; i < counts.children; i++) list.push(emptyPassenger("child"));
  for (let i = 0; i < counts.infants; i++) list.push(emptyPassenger("infant"));
  return list;
}

function Field({
  icon: Icon,
  label,
  required,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="hhsr-field">
      <Icon className="hhsr-field__icon" />
      <div className="hhsr-field__body">
        <label className="hhsr-field__label">
          {label}
          {required && <span className="req">*</span>}
        </label>
        {children}
      </div>
    </div>
  );
}

function PersonalInfoCard({
  data,
  onChange,
  collapsed,
  onToggle,
  title,
  subtitle,
  seatLabel,
}: {
  data: PassengerData;
  onChange: (next: PassengerData) => void;
  collapsed: boolean;
  onToggle: () => void;
  title: string;
  subtitle: string;
  seatLabel?: string;
}) {
  const set = <K extends keyof PassengerData>(key: K, val: PassengerData[K]) =>
    onChange({ ...data, [key]: val });

  return (
    <div className="hhsr-card mb-4">
      <div className="flex items-end justify-between p-4 pb-2">
        <button
          type="button"
          onClick={onToggle}
          className="w-8 h-8 rounded-full bg-[hsl(var(--gold-400))] text-white flex items-center justify-center shrink-0"
          aria-label={collapsed ? "توسيع" : "طي"}
          data-testid={`button-toggle-${title}`}
        >
          {collapsed ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </button>
        <div className="text-end flex-1 ms-3">
          <h3 className="font-extrabold text-foreground text-lg">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          {seatLabel && (
            <p className="text-xs text-muted-foreground mt-0.5">{seatLabel}</p>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 pb-4 pt-1">
          <Field icon={User} label="الأسم الأول" required>
            <input
              className="hhsr-field__input"
              value={data.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              placeholder="—"
              data-testid={`input-firstname-${title}`}
            />
          </Field>
          <Field icon={User} label="الاسم الاوسط">
            <input
              className="hhsr-field__input"
              value={data.middleName}
              onChange={(e) => set("middleName", e.target.value)}
              placeholder="—"
              data-testid={`input-middlename-${title}`}
            />
          </Field>
          <Field icon={User} label="أسم العائلة" required>
            <input
              className="hhsr-field__input"
              value={data.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              placeholder="—"
              data-testid={`input-lastname-${title}`}
            />
          </Field>
          <Field icon={CalendarDays} label="تاريخ الميلاد" required>
            <input
              type="date"
              className="hhsr-field__input"
              value={data.dob}
              onChange={(e) => set("dob", e.target.value)}
              placeholder="اختر"
              data-testid={`input-dob-${title}`}
            />
          </Field>
          <Field icon={Users} label="الجنس" required>
            <select
              className="hhsr-field__select"
              value={data.gender}
              onChange={(e) => set("gender", e.target.value)}
              data-testid={`select-gender-${title}`}
            >
              <option value="">اختر</option>
              <option value="male">ذكر</option>
              <option value="female">أنثى</option>
            </select>
          </Field>
          <Field icon={IdCard} label="نوع الوثيقة" required>
            <select
              className="hhsr-field__select"
              value={data.idType}
              onChange={(e) => set("idType", e.target.value)}
              data-testid={`select-idtype-${title}`}
            >
              {ID_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field icon={IdCard} label="رقم الوثيقة" required>
            <input
              className="hhsr-field__input"
              value={data.idNumber}
              onChange={(e) => set("idNumber", e.target.value)}
              placeholder="—"
              dir="ltr"
              data-testid={`input-idnumber-${title}`}
            />
          </Field>
          <Field icon={CalendarDays} label="تاريخ الإنتهاء">
            <input
              type="date"
              className="hhsr-field__input"
              value={data.idExpiry}
              onChange={(e) => set("idExpiry", e.target.value)}
              placeholder="اختر"
              data-testid={`input-idexpiry-${title}`}
            />
          </Field>
          <Field icon={Users} label="الجنسية" required>
            <select
              className="hhsr-field__select"
              value={data.nationality}
              onChange={(e) => set("nationality", e.target.value)}
              data-testid={`select-nationality-${title}`}
            >
              <option value="">اختر</option>
              {NATIONALITIES.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </Field>
        </div>
      )}
    </div>
  );
}

function ContactInfoCard({
  data,
  onChange,
}: {
  data: ContactData;
  onChange: (next: ContactData) => void;
}) {
  const set = <K extends keyof ContactData>(key: K, val: ContactData[K]) =>
    onChange({ ...data, [key]: val });
  return (
    <div className="hhsr-card mb-4">
      <div className="flex items-center justify-between p-4 pb-2">
        <span className="w-8 h-8 rounded-full bg-[hsl(var(--gold-400))] text-white flex items-center justify-center">
          <ChevronUp className="w-4 h-4" />
        </span>
        <h3 className="font-extrabold text-foreground text-lg">
          معلومات الاتصال
        </h3>
      </div>

      <div className="px-4 pb-4 pt-1">
        <Field icon={Phone} label="رقم الهاتف" required>
          <input
            className="hhsr-field__input"
            value={data.phone}
            onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            dir="ltr"
            placeholder="—"
            data-testid="input-phone"
          />
        </Field>
        <Field icon={Phone} label="مفتاح البلد" required>
          <select
            className="hhsr-field__select"
            value={data.countryCode}
            onChange={(e) => set("countryCode", e.target.value)}
            data-testid="select-country-code"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label} ({c.code})
              </option>
            ))}
          </select>
        </Field>
        <Field icon={Mail} label="البريد الألكتروني" required>
          <input
            type="email"
            className="hhsr-field__input"
            value={data.email}
            onChange={(e) => set("email", e.target.value)}
            inputMode="email"
            dir="ltr"
            placeholder="—"
            data-testid="input-email"
          />
        </Field>
        <p className="text-[11px] text-muted-foreground mt-2 text-end">
          * مطلوب
        </p>
      </div>
    </div>
  );
}

export default function PassengerDetails() {
  const [, setLocation] = useLocation();
  const counts = useMemo(readPaxCounts, []);
  const [passengers, setPassengers] = useState<PassengerData[]>(() =>
    buildPassengerList(counts),
  );
  const [contact, setContact] = useState<ContactData>(emptyContact);
  const [collapsed, setCollapsed] = useState<boolean[]>(() =>
    passengers.map((_, i) => i !== 0),
  );
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    void handleCurrentPage("passenger_details");
  }, []);

  const trip = readSelectedTrip();
  const seats = readSelectedSeats();
  const route =
    trip.from && trip.to
      ? `${trip.from} ← ${trip.to}`
      : "المدينة المنورة - السليمانية ← جدة";

  // Per-kind index counters for titles like "بالغ 1", "بالغ 2", "طفل 1"
  const titles = useMemo(() => {
    const counters: Record<PaxKind, number> = { adult: 0, child: 0, infant: 0 };
    return passengers.map((p) => {
      counters[p.kind] += 1;
      return `${KIND_LABEL_AR[p.kind]} ${counters[p.kind]}`;
    });
  }, [passengers]);

  const updatePassenger = (idx: number, next: PassengerData) => {
    setPassengers((prev) => prev.map((p, i) => (i === idx ? next : p)));
  };
  const toggleCollapsed = (idx: number) => {
    setCollapsed((prev) => prev.map((c, i) => (i === idx ? !c : c)));
  };

  const onContinue = () => {
    sessionStorage.setItem("passengers", JSON.stringify(passengers));
    sessionStorage.setItem("contact", JSON.stringify(contact));

    // Persist the lead passenger (first adult) into the existing flat fields so
    // the dashboard / payment flow keep working unchanged.
    const lead = passengers[0];
    const fullName = [lead.firstName, lead.middleName, lead.lastName]
      .filter(Boolean)
      .join(" ");

    void addData({
      name: fullName,
      passengerTitle: lead.title,
      passengerFirstName: lead.firstName,
      passengerMiddleName: lead.middleName,
      passengerLastName: lead.lastName,
      passengerDob: lead.dob,
      gender: lead.gender,
      nationality: lead.nationality,
      idType: lead.idType,
      saudiId: lead.idNumber,
      idExpiry: lead.idExpiry,
      countryCode: contact.countryCode,
      phone: `${contact.countryCode}${contact.phone.replace(/^0+/, "")}`,
      email: contact.email,
      passengersCount: passengers.length,
      passengers: passengers.map((p, i) => ({
        index: i + 1,
        kind: p.kind,
        title: titles[i],
        firstName: p.firstName,
        middleName: p.middleName,
        lastName: p.lastName,
        dob: p.dob,
        gender: p.gender,
        nationality: p.nationality,
        idType: p.idType,
        idNumber: p.idNumber,
        idExpiry: p.idExpiry,
      })),
      currentPage: "passenger_details",
    });
    setLocation("/payment");
  };

  return (
    <div
      className="min-h-screen"
      dir="rtl"
      data-testid="page-passenger-details"
    >
      <BookingStepBar
        current={2}
        title="المعلومات الشخصية"
        backHref="/seat-selection"
      />

      <div className="max-w-md mx-auto px-3 sm:px-4 py-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {passengers.map((p, idx) => {
            const seat = seats[idx];
            const seatLabel =
              seat !== undefined
                ? `العربة: 001 ; المقعد: ${seat}`
                : seats.length > 0
                  ? `العربة: 001 ; المقاعد: ${seats.join("، ")}`
                  : undefined;
            return (
              <PersonalInfoCard
                key={idx}
                data={p}
                onChange={(next) => updatePassenger(idx, next)}
                collapsed={collapsed[idx]}
                onToggle={() => toggleCollapsed(idx)}
                title={titles[idx]}
                subtitle={route}
                seatLabel={seatLabel}
              />
            );
          })}

          <ContactInfoCard data={contact} onChange={setContact} />
        </motion.div>

        {/* Terms checkbox */}
        <label
          className="flex items-start gap-3 px-2 py-3 cursor-pointer"
          dir="rtl"
        >
          <button
            type="button"
            onClick={() => setAgreed((a) => !a)}
            className={`w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
              agreed
                ? "bg-[hsl(var(--gold-500))] border-[hsl(var(--gold-500))]"
                : "border-[hsl(var(--gold-400))] bg-white"
            }`}
            data-testid="checkbox-terms"
            aria-checked={agreed}
            role="checkbox"
          >
            {agreed && (
              <svg
                viewBox="0 0 12 12"
                className="w-3 h-3 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  d="M2 6 L5 9 L10 3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
          <p className="text-xs text-foreground leading-relaxed text-end flex-1">
            لقد قرأت وأوافق على{" "}
            <a href="#" className="text-[hsl(var(--gold-700))] underline">
              الشروط والأحكام
            </a>{" "}
            و{" "}
            <a href="#" className="text-[hsl(var(--gold-700))] underline">
              سياسة الخصوصية
            </a>
            .
          </p>
        </label>

        <button
          onClick={onContinue}
          className="btn-gold w-full mt-2"
          data-testid="button-continue-to-payment"
        >
          احجز
        </button>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground px-1">
          <Link
            href="/seat-selection"
            className="text-[hsl(var(--gold-700))] font-medium hover:underline"
          >
            رجوع
          </Link>
        </div>
      </div>
    </div>
  );
}
