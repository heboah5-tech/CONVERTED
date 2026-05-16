import { useEffect } from "react";
import { motion } from "framer-motion";
import { Truck, Globe2, ShieldCheck, Users, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { BottomNav } from "./services";
import { handleCurrentPage } from "@/lib/firebase";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

const features = [
  {
    icon: Truck,
    title: "أسطول حديث",
    desc: "حافلات مجهزة بأحدث وسائل الراحة والسلامة",
  },
  {
    icon: Globe2,
    title: "تغطية واسعة",
    desc: "شبكة تربط مدن المملكة ودول الخليج",
  },
  {
    icon: ShieldCheck,
    title: "سلامة مضمونة",
    desc: "سائقون مدربون وأنظمة تتبع لحظية",
  },
  {
    icon: Users,
    title: "خدمة متميزة",
    desc: "فريق دعم متاح على مدار الساعة",
  },
];

const stats = [
  { value: "+50", label: "مدينة مخدومة" },
  { value: "+1500", label: "حافلة في الأسطول" },
  { value: "+2M", label: "راكب سنوياً" },
];

export default function SATrans() {
  useEffect(() => {
    void handleCurrentPage("satrans");
  }, []);

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      dir="rtl"
      data-testid="page-satrans"
    >
      <SiteHeader />
      <div className="relative h-52 overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-muted" />
        <div
          className="absolute inset-0 bg-primary"
          style={{ clipPath: "polygon(0 40%, 100% 0, 100% 100%, 0 100%)" }}
        />
        <div className="relative z-10 h-full flex flex-col justify-end px-6 pb-5">
          <p className="text-xs text-primary-foreground/80 mb-1">
            SAPTCO Transport
          </p>
          <h1
            className="text-2xl font-bold text-primary-foreground"
            data-testid="text-satrans-title"
          >
            سابتكو ترانس
          </h1>
        </div>
      </div>

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="bg-card border border-border rounded-2xl p-5"
        >
          <h2 className="text-base font-bold text-foreground mb-2">
            عن سابتكو ترانس
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            ذراع النقل البري التابع للشركة السعودية للنقل الجماعي، نقدم خدمات
            نقل المسافرين بين المدن داخل المملكة العربية السعودية وإلى دول
            الخليج، عبر أسطول حديث وفروع منتشرة في جميع المناطق.
          </p>
        </motion.section>

        <section className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-primary text-primary-foreground rounded-2xl p-4 text-center"
              data-testid={`stat-${s.label}`}
            >
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-[11px] opacity-90 mt-1">{s.label}</p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3 hover-elevate transition-all"
              data-testid={`card-feature-${f.title}`}
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <f.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground mb-1">
                  {f.title}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </section>

        <section className="bg-card border border-border rounded-2xl p-5 text-center">
          <h2 className="text-base font-bold text-foreground mb-2">
            احجز رحلتك الآن
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            استكشف الوجهات وقم بحجز تذكرتك في خطوات بسيطة
          </p>
          <Link
            href="/schedule"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
            data-testid="button-book-trip"
          >
            ابدأ الحجز
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </section>
      </main>

      <SiteFooter />
      <BottomNav />
    </div>
  );
}
