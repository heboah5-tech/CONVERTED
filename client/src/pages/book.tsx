import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Train,
  Calendar,
  ArrowLeftRight,
  Search,
  User,
  MoreHorizontal,
  Baby,
  Ticket,
  UserCircle2,
  Plus,
  Minus,
  X,
  MapPin,
  Check,
} from "lucide-react";
import { addData, handleCurrentPage } from "@/lib/firebase";
import SiteTopHeader from "@/components/site-top-header";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const STATIONS = [
  { id: "1", name: "مكة المكرمة" },
  { id: "2", name: "السليمانية - جدة" },
  { id: "3", name: "المطار- جدة" },
  { id: "4", name: "مدينة الملك عبدالله الاقتصادية" },
  { id: "5", name: "المدينة المنورة" },
];

type Station = (typeof STATIONS)[number];

const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const todayIso = () => new Date().toISOString().split("T")[0];
const tomorrowIso = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
};

export default function Book() {
  const [location, setLocation] = useLocation();
  const [tripType, setTripType] = useState<"oneWay" | "roundTrip">("roundTrip");
  const [from, setFrom] = useState<Station | null>(STATIONS[4]);
  const [to, setTo] = useState<Station | null>(STATIONS[1]);
  const [picker, setPicker] = useState<null | "from" | "to">(null);
  const [departDate, setDepartDate] = useState<string>(todayIso());
  const [returnDate, setReturnDate] = useState<string>(tomorrowIso());
  const [paxOpen, setPaxOpen] = useState(false);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);

  useEffect(() => {
    void handleCurrentPage("book");
  }, []);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const pick = (s: Station) => {
    if (picker === "from") setFrom(s);
    if (picker === "to") setTo(s);
    setPicker(null);
  };

  const onSearch = () => {
    if (!from || !to || from.id === to.id) return;
    sessionStorage.setItem(
      "searchPassengers",
      JSON.stringify({ adults, children, infants, special: 0, student: 0 }),
    );
    void addData({
      from: from.name,
      to: to.name,
      tripType,
      bookingDate: fmtDate(departDate),
      returnDate: tripType === "roundTrip" ? fmtDate(returnDate) : "",
      ticketQuantity: adults + children + infants,
      currentPage: "book",
    });
    const params = new URLSearchParams({
      from: from.name,
      to: to.name,
      fromId: from.id,
      toId: to.id,
      date: departDate,
      adults: String(adults),
      children: String(children),
      infants: String(infants),
    });
    setLocation(`/schedule?${params.toString()}`);
  };

  const canSearch =
    !!from && !!to && from.id !== to.id && adults + children + infants > 0;

  return (
    <motion.div
      dir="rtl"
      className="min-h-screen header-gradient flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      data-testid="page-book"
    >
      <SiteTopHeader />
      <div className="flex-1 overflow-y-auto pb-28 no-scrollbar">
        <div className="flex items-center justify-between px-5 pt-4 pb-4 max-w-md mx-auto w-full">
          <button
            className="p-1.5 rounded-full hover:bg-white/30 transition"
            data-testid="button-globe"
          >
            <Globe className="w-6 h-6 text-foreground" />
          </button>
          <h1
            className="text-lg sm:text-xl font-extrabold text-foreground"
            data-testid="text-title"
          >
            احجز رحلتك
          </h1>
          <div className="w-9" />
        </div>

        <div className="px-5 mb-5 max-w-md mx-auto w-full">
          <div className="bg-[hsl(var(--gold-400))]/80 p-1 rounded-full flex relative h-12 shadow-inner">
            <div
              className="absolute top-1 bottom-1 bg-white rounded-full shadow-md transition-transform duration-300 ease-out"
              style={{
                width: "calc(50% - 4px)",
                right: 4,
                transform:
                  tripType === "roundTrip"
                    ? "translateX(0)"
                    : "translateX(-100%)",
              }}
            />
            <button
              onClick={() => setTripType("roundTrip")}
              className={`flex-1 text-sm font-bold rounded-full z-10 transition-colors ${
                tripType === "roundTrip" ? "text-foreground" : "text-white/95"
              }`}
              data-testid="button-roundtrip"
            >
              ذهاب و عودة
            </button>
            <button
              onClick={() => setTripType("oneWay")}
              className={`flex-1 text-sm font-bold rounded-full z-10 transition-colors ${
                tripType === "oneWay" ? "text-foreground" : "text-white/95"
              }`}
              data-testid="button-oneway"
            >
              ذهاب فقط
            </button>
          </div>
        </div>

        <div className="bg-white mx-auto max-w-md w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] rounded-3xl card-elevated px-3 sm:px-4 py-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2.5 relative">
            <FieldCard
              label="من"
              placeholder="نقطة الإنطلاق"
              value={from?.name}
              onClick={() => setPicker("from")}
              testid="card-from"
            >
              <Train className="w-5 h-5 text-[hsl(var(--gold-600))] -scale-x-100" />
            </FieldCard>

            <button
              onClick={swap}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 gold-gradient rounded-full flex items-center justify-center shadow-lg z-20 active:scale-95 transition border-2 border-white"
              data-testid="button-swap"
            >
              <ArrowLeftRight className="w-4 h-4 text-white" />
            </button>

            <FieldCard
              label="إلى"
              placeholder="نقطة الوصول"
              value={to?.name}
              onClick={() => setPicker("to")}
              testid="card-to"
            >
              <Train className="w-5 h-5 text-[hsl(var(--gold-600))]" />
            </FieldCard>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <DateField
              label="تاريخ المغادرة"
              value={departDate}
              min={todayIso()}
              onChange={setDepartDate}
              testid="card-departure-date"
            />
            <div
              className={`transition-opacity ${
                tripType === "oneWay" ? "opacity-40 pointer-events-none" : ""
              }`}
            >
              <DateField
                label="تاريخ العودة"
                value={returnDate}
                min={departDate}
                onChange={setReturnDate}
                testid="card-return-date"
              />
            </div>
          </div>

          <div className="bg-[hsl(var(--gold-50))] rounded-2xl p-4 border border-[hsl(var(--gold-200))]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                إضافة مسافرين
              </h3>
              <button
                onClick={() => setPaxOpen((v) => !v)}
                className="flex items-center gap-1 text-xs text-[hsl(var(--gold-700))] font-semibold"
                data-testid="button-toggle-passengers"
              >
                <span>{paxOpen ? "إغلاق" : "إضافة مسافرين"}</span>
                {paxOpen ? (
                  <Minus className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="flex justify-around items-center pt-1">
              <PassengerCount
                icon={<Baby className="w-6 h-6" />}
                count={infants}
                label="رضيع"
                active={infants > 0}
              />
              <PassengerCount
                icon={<UserCircle2 className="w-6 h-6" />}
                count={children}
                label="طفل"
                active={children > 0}
              />
              <PassengerCount
                icon={<User className="w-6 h-6" />}
                count={adults}
                label="بالغ"
                active={adults > 0}
              />
            </div>
            <AnimatePresence initial={false}>
              {paxOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 space-y-2">
                    <PaxRow label="بالغ" value={adults} setValue={setAdults} min={1} />
                    <PaxRow label="طفل" value={children} setValue={setChildren} min={0} />
                    <PaxRow label="رضيع" value={infants} setValue={setInfants} min={0} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="px-4 mt-7 max-w-md mx-auto w-full">
          <button
            onClick={onSearch}
            disabled={!canSearch}
            className={`w-full text-white py-4 rounded-2xl font-bold text-lg shadow-xl active:scale-[0.99] transition tap-shrink ${
              canSearch
                ? "gold-gradient"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
            data-testid="button-search"
          >
            <span className="inline-flex items-center gap-2 justify-center">
              <Search className="w-5 h-5" strokeWidth={2.5} />
              بحث
            </span>
          </button>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border px-1 pt-1 pb-2 sm:pb-3 grid grid-cols-5 z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <BottomNavItem icon={<MoreHorizontal className="w-5 h-5" />} label="للمزيد" />
        <BottomNavItem icon={<User className="w-5 h-5" />} label="ملفي الشخصي" />
        <BottomNavItem icon={<Search className="w-5 h-5" />} label="البحث عن التذاكر" />
        <BottomNavItem icon={<Ticket className="w-5 h-5" />} label="رحلاتي" />
        <BottomNavItem
          icon={<Train className="w-5 h-5" />}
          label="احجز رحلتك"
          onClick={() => setLocation("/")}
          active={location === "/" || location === "/book"}
        />
      </div>

      <StationPicker
        open={picker !== null}
        title={picker === "from" ? "من" : "إلى"}
        selected={picker === "from" ? from : to}
        excluded={picker === "from" ? to : from}
        onClose={() => setPicker(null)}
        onPick={pick}
      />
    </motion.div>
  );
}

function FieldCard({
  label,
  placeholder,
  value,
  onClick,
  children,
  small = false,
  testid,
}: {
  label: string;
  placeholder: string;
  value?: string;
  onClick?: () => void;
  children?: React.ReactNode;
  small?: boolean;
  testid?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-end w-full bg-white rounded-2xl p-3 border border-border shadow-sm tap-shrink hover:border-[hsl(var(--gold-300))] transition"
      data-testid={testid}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <h3 className={`${small ? "text-sm" : "text-base"} font-bold text-foreground`}>
          {label}
        </h3>
        {children}
      </div>
      <div className="border-b-2 border-dashed border-border pb-1 min-h-[20px]">
        {value ? (
          <p className="text-xs sm:text-sm font-semibold text-foreground text-end truncate">
            {value}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground text-end">{placeholder}</p>
        )}
      </div>
    </button>
  );
}

function DateField({
  label,
  value,
  min,
  onChange,
  testid,
}: {
  label: string;
  value: string;
  min?: string;
  onChange: (v: string) => void;
  testid?: string;
}) {
  const minDate = min ? new Date(min) : undefined;
  const selected = value ? new Date(value) : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-end w-full bg-white rounded-2xl p-3 border border-border shadow-sm hover:border-[hsl(var(--gold-300))] transition block"
          data-testid={testid}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <h3 className="text-sm font-bold text-foreground">{label}</h3>
            <Calendar className="w-4 h-4 text-[hsl(var(--gold-600))]" />
          </div>
          <div className="border-b-2 border-dashed border-border pb-1 min-h-[20px]">
            <span className="text-xs sm:text-sm font-semibold text-foreground text-end block truncate">
              {fmtDate(value)}
            </span>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <CalendarPicker
          mode="single"
          selected={selected}
          onSelect={(d) => {
            if (d) {
              const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
              onChange(iso);
            }
          }}
          disabled={minDate ? { before: minDate } : undefined}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function PassengerCount({
  icon,
  count,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  count: number;
  label: string;
  active?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center ${
          active
            ? "bg-[hsl(var(--gold-500))] text-white"
            : "bg-white text-muted-foreground border border-border"
        }`}
      >
        {icon}
      </div>
      <div className="flex flex-col items-center">
        <span
          className={`text-sm font-bold ${
            active ? "text-[hsl(var(--gold-700))]" : "text-foreground"
          }`}
        >
          {count}
        </span>
        <span className="text-[9px] text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

function PaxRow({
  label,
  value,
  setValue,
  min = 0,
  max = 9,
}: {
  label: string;
  value: number;
  setValue: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center justify-between bg-white rounded-xl border border-border px-3 py-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setValue(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-foreground disabled:opacity-30 hover:bg-muted"
          data-testid={`button-pax-minus-${label}`}
        >
          <Minus className="w-4 h-4" />
        </button>
        <span
          className="w-6 text-center font-bold text-foreground tabular-nums"
          data-testid={`text-pax-count-${label}`}
        >
          {value}
        </span>
        <button
          onClick={() => setValue(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-8 h-8 rounded-full border border-[hsl(var(--gold-400))] text-[hsl(var(--gold-700))] flex items-center justify-center disabled:opacity-30 hover:bg-[hsl(var(--gold-50))]"
          data-testid={`button-pax-plus-${label}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <span className="text-sm font-semibold text-foreground">{label}</span>
    </div>
  );
}

function BottomNavItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 py-2 rounded-2xl transition relative tap-shrink active:scale-[0.96] ${
        active ? "text-[hsl(var(--gold-700))]" : "text-muted-foreground hover:text-[hsl(var(--gold-700))]"
      }`}
      data-testid={`nav-${label}`}
    >
      {active && (
        <span className="absolute top-0 right-1/2 translate-x-1/2 w-8 h-1 bg-[hsl(var(--gold-500))] rounded-b-full" />
      )}
      {icon}
      <span
        className={`text-[9px] leading-tight text-center px-1 ${
          active ? "font-bold" : "font-medium"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

function StationPicker({
  open,
  title,
  selected,
  excluded,
  onClose,
  onPick,
}: {
  open: boolean;
  title: string;
  selected: Station | null;
  excluded: Station | null;
  onClose: () => void;
  onPick: (s: Station) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed left-0 right-0 bottom-0 bg-white z-50 rounded-t-3xl shadow-2xl overflow-hidden max-w-md mx-auto"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            data-testid="station-picker"
          >
            <div className="flex justify-center pt-2 pb-1">
              <span className="w-10 h-1 bg-border rounded-full" />
            </div>
            <div className="px-5 pt-2 pb-3 flex items-center justify-between border-b border-border">
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-muted transition"
                data-testid="picker-close"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
              <h2 className="text-base font-extrabold text-foreground">
                اختر المحطة — {title}
              </h2>
              <div className="w-7" />
            </div>
            <ul className="max-h-[60vh] overflow-y-auto py-2">
              {STATIONS.map((s) => {
                const isSelected = selected?.id === s.id;
                const isExcluded = excluded?.id === s.id;
                return (
                  <li key={s.id}>
                    <button
                      disabled={isExcluded}
                      onClick={() => onPick(s)}
                      className={`w-full flex items-center justify-between gap-3 px-5 py-3.5 text-end transition ${
                        isExcluded
                          ? "opacity-40 cursor-not-allowed"
                          : isSelected
                            ? "bg-[hsl(var(--gold-50))]"
                            : "hover:bg-muted active:bg-muted"
                      }`}
                      data-testid={`station-${s.id}`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <span
                          className={`w-9 h-9 rounded-full flex items-center justify-center ${
                            isSelected
                              ? "bg-[hsl(var(--gold-500))] text-white"
                              : "bg-[hsl(var(--gold-50))] text-[hsl(var(--gold-700))]"
                          }`}
                        >
                          <MapPin className="w-4 h-4" />
                        </span>
                        <span className="text-sm font-semibold text-foreground flex-1 text-end">
                          {s.name}
                        </span>
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-[hsl(var(--gold-700))]" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="safe-bottom" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
