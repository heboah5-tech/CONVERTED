import { Link, useLocation } from "wouter";
import { Home, Bus, Calendar, Grid3x3, User } from "lucide-react";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  { label: "الرئيسية", href: "/", icon: <Home className="w-5 h-5" /> },
  { label: "الرحلات", href: "/trips", icon: <Bus className="w-5 h-5" /> },
  { label: "حجوزاتي", href: "/bookings", icon: <Calendar className="w-5 h-5" /> },
  { label: "خدماتنا", href: "/services", icon: <Grid3x3 className="w-5 h-5" /> },
  { label: "التسجيل", href: "/register", icon: <User className="w-5 h-5" /> },
];

export function BottomNav({ active }: { active?: string }) {
  const [location] = useLocation();
  return (
    <nav
      dir="rtl"
      className="sticky bottom-0 inset-x-0 bg-card border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-40"
      data-testid="bottom-nav"
    >
      <div className="max-w-2xl mx-auto flex items-stretch justify-around">
        {navItems.map((item) => {
          const isActive = active
            ? item.label === active
            : location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`bottom-nav-${item.href.replace("/", "") || "home"}`}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-bold transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

const services = [
  {
    title: "تأجير الحافلات للحج والعمرة",
    desc: "حلول النقل لزوار الحرمين الشريفين",
    url: "https://saptco-specialized.com/",
    icon: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/e1bd69f0f_saptco_com_sa_001_30142239.png",
  },
  {
    title: "مشغل شبكة حافلات الرياض",
    desc: "خدمات النقل العام داخل مدينة الرياض",
    url: "https://www.ptco.com.sa/ar/",
    icon: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/95c81e311_saptco_com_sa_002_dbdaafe8.png",
  },
  {
    title: "مشغل شبكات المترو",
    desc: "تشغيل وصيانة شبكات النقل بالقطارات",
    url: "https://www.camco.com.sa/?lang=ar",
    icon: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/3ce2cebf8_saptco_com_sa_003_9a6303b1.png",
  },
  {
    title: "النقل بين المدن",
    desc: "رحلات منتظمة تربط بين مدن المملكة",
    url: "https://satrans.com.sa/ar/",
    icon: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/fc28c419e_saptco_com_sa_004_226268a4.png",
  },
  {
    title: "حلول النقل التعليمي",
    desc: "خدمات نقل الطلاب الآمنة",
    url: "https://seitco.com.sa/",
    icon: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/1d8acaa3c_saptco_com_sa_005_04c8ccfc.png",
  },
  {
    title: "حلول التنقل الرقمي",
    desc: "منصات وتطبيقات النقل الذكي",
    url: "https://dmsventures.sa/?lang=ar",
    icon: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/bdb951bb1_saptco_com_sa_006_148bfd9b.png",
  },
  {
    title: "رائد النقل التشاركي الذكي",
    desc: "حلول التنقل التشاركي للأعمال",
    url: "https://rekab.sa/b2b/",
    icon: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/d5d69b220_saptco_com_sa_007_e2da9ac1.png",
  },
  {
    title: "الحلول السياحية",
    desc: "باقات سياحية ورحلات منظمة",
    url: "https://ejourney.com.sa/ar/",
    icon: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/acd8e25f6_saptco_com_sa_008_0916a63a.png",
  },
];

export default function Services() {
  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      dir="rtl"
      data-testid="page-services"
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
            <h1 className="text-xl font-bold text-foreground">خدماتنا</h1>
            <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center">
              <Grid3x3 className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {services.map((s, i) => (
            <a
              key={i}
              href={s.url}
              target={s.url !== "#" ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-primary/40 hover:shadow-md transition-all duration-300 group"
              data-testid={`card-service-${i}`}
            >
              <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                <img
                  src={s.icon}
                  alt={s.title}
                  className="w-10 h-10 object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground text-sm line-clamp-1">
                  {s.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {s.desc}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>

      <SiteFooter />
      <BottomNav active="خدماتنا" />
    </div>
  );
}
