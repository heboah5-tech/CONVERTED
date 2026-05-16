import { useState } from "react";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import {
  Calendar,
  Globe,
  Phone,
  Bus,
  MapPin,
  Clock,
  X,
  Edit3,
  CheckCircle,
} from "lucide-react";
import { BottomNav } from "./services";

type BookingStatus = "confirmed" | "cancelled" | "modified";

type Booking = {
  id: string;
  from: string;
  to: string;
  date: string;
  dep: string;
  arr: string;
  price: number;
  passengers: number;
  type: string;
  status: BookingStatus;
  seat: string;
};

const mockBookings: Booking[] = [
  {
    id: "SAT-20240110-001",
    from: "الرياض",
    to: "جدة",
    date: "2026-05-15",
    dep: "09:00",
    arr: "15:00",
    price: 155,
    passengers: 1,
    type: "متميزة",
    status: "confirmed",
    seat: "12A",
  },
  {
    id: "SAT-20240108-042",
    from: "الدمام",
    to: "الرياض",
    date: "2026-05-20",
    dep: "08:00",
    arr: "12:00",
    price: 95,
    passengers: 2,
    type: "اقتصادية",
    status: "confirmed",
    seat: "05B",
  },
  {
    id: "SAT-20240101-017",
    from: "جدة",
    to: "أبها",
    date: "2026-04-28",
    dep: "06:00",
    arr: "10:30",
    price: 120,
    passengers: 1,
    type: "اقتصادية",
    status: "cancelled",
    seat: "08C",
  },
];

const statusConfig: Record<
  BookingStatus,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  confirmed: {
    label: "مؤكد",
    color: "text-green-600",
    bg: "bg-green-50",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  cancelled: {
    label: "ملغي",
    color: "text-destructive",
    bg: "bg-destructive/10",
    icon: <X className="w-3.5 h-3.5" />,
  },
  modified: {
    label: "معدّل",
    color: "text-yellow-700",
    bg: "bg-yellow-50",
    icon: <Edit3 className="w-3.5 h-3.5" />,
  },
};

function BookingCard({
  booking,
  onCancel,
  onModify,
}: {
  booking: Booking;
  onCancel: (id: string) => void;
  onModify: (id: string) => void;
}) {
  const status = statusConfig[booking.status];
  const isPast = new Date(booking.date) < new Date();
  const canAct = booking.status === "confirmed" && !isPast;

  return (
    <div
      className={`bg-card border rounded-2xl p-4 shadow-sm transition-all duration-300 ${
        booking.status === "cancelled"
          ? "opacity-60 border-border"
          : "border-primary/20 hover:shadow-md"
      }`}
      data-testid={`card-booking-${booking.id}`}
    >
      <div className="flex items-start justify-between mb-3">
        <span
          className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${status.bg} ${status.color}`}
        >
          {status.icon} {status.label}
        </span>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">رقم الحجز</p>
          <p className="text-xs font-bold text-foreground">{booking.id}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 flex items-center gap-2">
          <div className="text-right flex-1">
            <p className="font-black text-foreground text-lg">{booking.dep}</p>
            <p className="text-xs text-muted-foreground">{booking.from}</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Bus className="w-4 h-4 text-primary" />
            <div className="w-12 border-t border-dashed border-border" />
          </div>
          <div className="text-left flex-1">
            <p className="font-black text-foreground text-lg">{booking.arr}</p>
            <p className="text-xs text-muted-foreground">{booking.to}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4 flex-wrap">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" /> {booking.date}
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" /> مقعد {booking.seat}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" /> {booking.type}
        </span>
        <span className="mr-auto font-bold text-primary text-sm">
          {booking.price * booking.passengers} ر.س
        </span>
      </div>

      {canAct && (
        <div className="flex gap-2 border-t border-border pt-3">
          <button
            onClick={() => onCancel(booking.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-destructive/40 text-destructive text-xs font-bold hover:bg-destructive/10 transition-colors"
            data-testid={`button-cancel-${booking.id}`}
          >
            <X className="w-3.5 h-3.5" /> إلغاء الرحلة
          </button>
          <button
            onClick={() => onModify(booking.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-primary/40 text-primary text-xs font-bold hover:bg-primary/10 transition-colors"
            data-testid={`button-modify-${booking.id}`}
          >
            <Edit3 className="w-3.5 h-3.5" /> تعديل الرحلة
          </button>
        </div>
      )}
      {!canAct && booking.status === "confirmed" && isPast && (
        <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
          رحلة منتهية
        </p>
      )}
    </div>
  );
}

function ConfirmModal({
  type,
  booking,
  onConfirm,
  onClose,
}: {
  type: "cancel" | "modify";
  booking: Booking | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const isCancel = type === "cancel";
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={onClose}
      data-testid="modal-confirm"
    >
      <div
        className="bg-card rounded-t-3xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
            isCancel ? "bg-destructive/10" : "bg-primary/10"
          }`}
        >
          {isCancel ? (
            <X className="w-6 h-6 text-destructive" />
          ) : (
            <Edit3 className="w-6 h-6 text-primary" />
          )}
        </div>
        <h3 className="text-lg font-bold text-foreground text-center mb-2">
          {isCancel ? "إلغاء الرحلة" : "تعديل الرحلة"}
        </h3>
        <p className="text-sm text-muted-foreground text-center mb-1">
          {booking?.id}
        </p>
        <p className="text-sm text-muted-foreground text-center mb-6">
          {isCancel
            ? "هل أنت متأكد من إلغاء هذه الرحلة؟ لا يمكن التراجع عن هذا الإجراء."
            : "سيتم تعديل حالة التذكرة. هل تريد المتابعة؟"}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-border text-foreground font-bold text-sm hover:bg-muted transition-colors"
            data-testid="button-modal-cancel"
          >
            تراجع
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-xl font-bold text-sm text-white transition-colors ${
              isCancel
                ? "bg-destructive hover:opacity-90"
                : "bg-primary hover:opacity-90"
            }`}
            data-testid="button-modal-confirm"
          >
            {isCancel ? "تأكيد الإلغاء" : "تأكيد التعديل"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Bookings() {
  const [activeTab, setActiveTab] = useState<"search" | "my">("search");
  const [bookingNumber, setBookingNumber] = useState("");
  const [phone, setPhone] = useState("966");
  const [bookings, setBookings] = useState<Booking[]>(mockBookings);
  const [modal, setModal] = useState<{
    type: "cancel" | "modify";
    bookingId: string;
  } | null>(null);
  const [toast, setToast] = useState<{ msg: string; success: boolean } | null>(
    null,
  );

  const showToast = (msg: string, success = true) => {
    setToast({ msg, success });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCancel = (id: string) =>
    setModal({ type: "cancel", bookingId: id });
  const handleModify = (id: string) =>
    setModal({ type: "modify", bookingId: id });

  const confirmAction = () => {
    if (!modal) return;
    const { type, bookingId } = modal;
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? { ...b, status: type === "cancel" ? "cancelled" : "modified" }
          : b,
      ),
    );
    setModal(null);
    showToast(
      type === "cancel"
        ? "تم إلغاء الرحلة بنجاح وتحديث حالة التذكرة"
        : "تم تعديل الرحلة بنجاح وتحديث حالة التذكرة",
    );
  };

  const activeBooking = modal
    ? bookings.find((b) => b.id === modal.bookingId) || null
    : null;

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      dir="rtl"
      data-testid="page-bookings"
    >
      <SiteHeader />
      <div className="relative h-48 overflow-hidden">
        <div className="absolute inset-0 bg-muted" />
        <div
          className="absolute inset-0 bg-primary"
          style={{ clipPath: "polygon(0 40%, 100% 0, 100% 100%, 0 100%)" }}
        />
        <div className="relative z-10 flex flex-col items-end px-6 pt-10 gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">إدارة الحجز</h1>
            <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-6 -mt-6 relative z-20">
        <div className="bg-card rounded-xl overflow-hidden border border-border shadow-md flex">
          <button
            onClick={() => setActiveTab("search")}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${
              activeTab === "search"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-foreground"
            }`}
            data-testid="tab-search"
          >
            بحث
          </button>
          <button
            onClick={() => setActiveTab("my")}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${
              activeTab === "my"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-foreground"
            }`}
            data-testid="tab-my"
          >
            حجوزاتي
          </button>
        </div>
      </div>

      <div className="flex-1 px-6 py-6 flex flex-col gap-4">
        {activeTab === "search" ? (
          <>
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm flex flex-col gap-4">
              <h3 className="text-center font-semibold text-foreground text-base">
                البحث في حجوزاتي
              </h3>
              <div className="border-b border-border pb-4">
                <p className="text-sm text-muted-foreground text-right mb-2">
                  رقم الحجز
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="رقم الحجز"
                    value={bookingNumber}
                    onChange={(e) => setBookingNumber(e.target.value)}
                    className="flex-1 bg-transparent border-b border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:border-primary py-1 text-right"
                    data-testid="input-booking-number"
                  />
                  <Globe className="w-5 h-5 text-primary shrink-0" />
                </div>
              </div>
              <div className="pb-2">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="رقم الهاتف"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 bg-transparent border-b border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:border-primary py-1 text-right"
                    data-testid="input-phone"
                  />
                  <Phone className="w-5 h-5 text-primary shrink-0" />
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveTab("my")}
              className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-bold text-base hover:opacity-90 transition-opacity"
              data-testid="button-search"
            >
              البحث
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground text-right">
              {bookings.filter((b) => b.status === "confirmed").length} حجوزات
              نشطة
            </p>
            <div className="flex flex-col gap-3">
              {bookings.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  onCancel={handleCancel}
                  onModify={handleModify}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {toast && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-sm font-bold text-white transition-all ${
            toast.success ? "bg-green-600" : "bg-destructive"
          }`}
          data-testid="toast"
        >
          <CheckCircle className="w-4 h-4" /> {toast.msg}
        </div>
      )}

      {modal && (
        <ConfirmModal
          type={modal.type}
          booking={activeBooking}
          onConfirm={confirmAction}
          onClose={() => setModal(null)}
        />
      )}

      <SiteFooter />
      <BottomNav active="حجوزاتي" />
    </div>
  );
}
