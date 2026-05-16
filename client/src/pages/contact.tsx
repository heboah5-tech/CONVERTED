import { useEffect } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, Clock, MessageCircle } from "lucide-react";
import { BottomNav } from "./services";
import { handleCurrentPage } from "@/lib/firebase";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

const channels = [
  {
    icon: Phone,
    title: "خدمة العملاء",
    value: "8001247000",
    href: "tel:8001247000",
    note: "اتصال مجاني داخل المملكة",
  },
  {
    icon: MessageCircle,
    title: "واتساب",
    value: "+966 11 454 5000",
    href: "https://wa.me/966114545000",
    note: "متاح 24/7",
  },
  {
    icon: Mail,
    title: "البريد الإلكتروني",
    value: "info@saptco.com.sa",
    href: "mailto:info@saptco.com.sa",
    note: "نرد خلال 24 ساعة",
  },
  {
    icon: MapPin,
    title: "المقر الرئيسي",
    value: "طريق الملك فهد، الرياض",
    href: "#",
    note: "المملكة العربية السعودية",
  },
];

const hours = [
  { day: "الأحد - الخميس", time: "07:00 - 22:00" },
  { day: "الجمعة", time: "14:00 - 22:00" },
  { day: "السبت", time: "08:00 - 22:00" },
];

export default function Contact() {
  useEffect(() => {
    void handleCurrentPage("contact");
  }, []);

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      dir="rtl"
      data-testid="page-contact"
    >
      <SiteHeader />
      <div className="relative h-44 overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-muted" />
        <div
          className="absolute inset-0 bg-primary"
          style={{ clipPath: "polygon(0 40%, 100% 0, 100% 100%, 0 100%)" }}
        />
        <div className="relative z-10 h-full flex items-end px-6 pb-4">
          <h1
            className="text-2xl font-bold text-primary-foreground"
            data-testid="text-contact-title"
          >
            تواصل معنا
          </h1>
        </div>
      </div>

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {channels.map((c) => (
            <a
              key={c.title}
              href={c.href}
              target={c.href.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
              className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3 hover-elevate transition-all"
              data-testid={`card-channel-${c.title}`}
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <c.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">{c.title}</p>
                <p
                  className="text-sm font-bold text-foreground truncate"
                  data-testid={`text-channel-${c.title}`}
                >
                  {c.value}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {c.note}
                </p>
              </div>
            </a>
          ))}
        </motion.section>

        <section className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              ساعات العمل
            </h2>
          </div>
          <ul className="divide-y divide-border">
            {hours.map((h) => (
              <li
                key={h.day}
                className="flex items-center justify-between py-2.5 text-sm"
                data-testid={`row-hours-${h.day}`}
              >
                <span className="text-muted-foreground">{h.day}</span>
                <span className="font-bold text-foreground">{h.time}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-primary text-primary-foreground rounded-2xl p-5">
          <h2 className="text-base font-bold mb-2">شكاوى ومقترحات</h2>
          <p className="text-xs opacity-90 leading-relaxed mb-4">
            نهتم برأيك. شاركنا ملاحظاتك لتحسين خدماتنا عبر القنوات الرسمية أو
            بزيارة أقرب فرع.
          </p>
          <a
            href="mailto:complaints@saptco.com.sa"
            className="inline-flex items-center gap-2 bg-card text-foreground px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
            data-testid="button-send-feedback"
          >
            <Mail className="w-4 h-4" />
            إرسال ملاحظة
          </a>
        </section>
      </main>

      <SiteFooter />
      <BottomNav />
    </div>
  );
}
