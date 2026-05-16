import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  ArrowLeft,
  Bus,
  Map,
  Train,
  Building2,
  CalendarCheck,
} from "lucide-react";
import { Link } from "wouter";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

const inlineStyles = `
  @keyframes marquee-rtl {
    0% { transform: translateX(0); }
    100% { transform: translateX(50%); }
  }
  @keyframes marquee-ltr {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes floatA {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-20px) rotate(3deg); }
  }
  @keyframes floatB {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-15px) rotate(-2deg); }
  }
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  .animate-marquee-rtl {
    display: flex;
    width: max-content;
    animation: marquee-rtl 30s linear infinite;
  }
  .animate-marquee-ltr {
    display: flex;
    width: max-content;
    animation: marquee-ltr 30s linear infinite;
  }
  .pause-on-hover:hover {
    animation-play-state: paused;
  }
  .hide-scrollbar::-webkit-scrollbar { display: none; }
  .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  .mask-edges {
    -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
            mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
  }
`;

type AnimatedElementProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

function AnimatedElement({ children, className, delay = 0 }: AnimatedElementProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      setIsVisible(true);
      return;
    }
    const fallback = setTimeout(() => setIsVisible(true), 800 + delay);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          clearTimeout(fallback);
          setTimeout(() => setIsVisible(true), delay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px 200px 0px" },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, [delay]);
  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ${
        isVisible
          ? "opacity-100 translate-y-0 blur-none"
          : "opacity-0 translate-y-12 blur-sm"
      } ${className || ""}`}
    >
      {children}
    </div>
  );
}

function NewsTicker() {
  const news = [
    {
      text: "تعلن الشركة السعودية للنقل الجماعي – سابتكو عن النتائج المالية الأولية الموحدة للفترة المنتهية في 31 مارس 2026م (ثلاثة أشهر)",
      url: "#",
    },
    {
      text: "يدعو مجلس إدارة الشركة السعودية للنقل الجماعي – سابتكو المساهمين إلى حضور اجتماع الجمعية العامة العادية (الاجتماع الأول)",
      url: "#",
    },
    { text: "سابتكو تشارك في اليوم الدولي للنقل", url: "#" },
    { text: "سابتكو تنال شهادة «Great Place to Work» لعام 2026م", url: "#" },
  ];
  return (
    <div
      className="bg-[#6B5A4B] border-b border-[#5a4b3f] py-2.5 relative z-40 shadow-inner"
      dir="rtl"
      data-testid="news-ticker"
    >
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 flex items-center gap-4">
        <span className="text-primary font-bold text-sm whitespace-nowrap shrink-0 drop-shadow-sm">
          الأخبار
        </span>
        <span className="text-primary/50">|</span>
        <div className="overflow-hidden flex-1 relative mask-edges">
          <div className="animate-marquee-rtl pause-on-hover gap-8">
            {[...news, ...news].map((item, i) => (
              <a
                key={i}
                href={item.url}
                className="text-white/90 hover:text-white text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 group"
                data-testid={`link-news-${i}`}
              >
                {item.text}
                <ArrowLeft className="w-3 h-3 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all text-primary" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroSection() {
  const sidebarLeft = [
    { icon: <Map className="w-5 h-5" />, label: "مشاريعنا" },
    { icon: <Bus className="w-5 h-5" />, label: "حافلاتنا" },
    { icon: <Building2 className="w-5 h-5" />, label: "المدن" },
  ];
  const sidebarRight = [
    { icon: <Bus className="w-5 h-5" />, label: "خدماتنا" },
    { icon: <Train className="w-5 h-5" />, label: "قطارات" },
    { icon: <Map className="w-5 h-5" />, label: "رحلات" },
  ];

  const services = [
    {
      icon: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/e1bd69f0f_saptco_com_sa_001_30142239.png",
      label: "تأجير الحافلات للحج والعمرة",
      url: "https://saptco-specialized.com/",
    },
    {
      icon: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/95c81e311_saptco_com_sa_002_dbdaafe8.png",
      label: "مشغل شبكة حافلات الرياض",
      url: "https://www.ptco.com.sa/ar/",
    },
    {
      icon: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/3ce2cebf8_saptco_com_sa_003_9a6303b1.png",
      label: "مشغل شبكات المترو",
      url: "https://www.camco.com.sa/?lang=ar",
    },
    {
      icon: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/fc28c419e_saptco_com_sa_004_226268a4.png",
      label: "النقل بين المدن",
      url: "https://satrans.com.sa/ar/",
    },
    {
      icon: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/1d8acaa3c_saptco_com_sa_005_04c8ccfc.png",
      label: "حلول النقل التعليمي",
      url: "https://seitco.com.sa/",
    },
    {
      icon: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/bdb951bb1_saptco_com_sa_006_148bfd9b.png",
      label: "حلول التنقل الرقمي",
      url: "https://dmsventures.sa/?lang=ar",
    },
    {
      icon: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/d5d69b220_saptco_com_sa_007_e2da9ac1.png",
      label: "رائد النقل التشاركي الذكي",
      url: "https://rekab.sa/b2b/",
    },
    {
      icon: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/acd8e25f6_saptco_com_sa_008_0916a63a.png",
      label: "الحلول السياحية",
      url: "https://ejourney.com.sa/ar/",
    },
    {
      icon: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/5d3fd0d7e_saptco_com_sa_009_46dcb5fb.png",
      label: "صيانة المركبات الخاصة",
      url: "https://merapp.com.sa/",
    },
    {
      icon: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/82e00333e_saptco_com_sa_010_e738134d.png",
      label: "التدريب الفني والسلامة",
      url: "https://artcacademy.com.sa/",
    },
    {
      icon: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/4e592272d_saptco_com_sa_011_1d58e0e2.png",
      label: "تأهيل السائقين",
      url: "#",
    },
  ];

  return (
    <section
      className="relative bg-foreground overflow-hidden min-h-[85vh] flex flex-col justify-end pb-8"
      dir="rtl"
      data-testid="section-hero"
    >
      <div className="absolute inset-0 z-0">
        <img
          src="https://saptco.com.sa/img/slides/slide01.jpg"
          alt="banner"
          className="w-full h-full object-contain object-top"
        />
        <div className="absolute inset-0 bg-foreground/50" />
      </div>
      <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-background to-transparent z-10" />

      <div className="absolute left-4 top-1/4 z-20 hidden lg:flex flex-col gap-2">
        {sidebarLeft.map((item, i) => (
          <button
            key={i}
            className="bg-background/10 backdrop-blur-md border border-white/10 text-white p-3 rounded-lg hover:bg-primary hover:text-primary-foreground transition-all duration-300 group flex flex-col items-center gap-1 shadow-xl"
            data-testid={`button-sidebar-left-${i}`}
          >
            {item.icon}
            <span className="text-[10px] font-bold opacity-0 h-0 group-hover:opacity-100 group-hover:h-auto transition-all">
              {item.label}
            </span>
          </button>
        ))}
      </div>
      <div className="absolute right-4 top-1/4 z-20 hidden lg:flex flex-col gap-2">
        {sidebarRight.map((item, i) => (
          <button
            key={i}
            className="bg-background/10 backdrop-blur-md border border-white/10 text-white p-3 rounded-lg hover:bg-primary hover:text-primary-foreground transition-all duration-300 group flex flex-col items-center gap-1 shadow-xl"
            data-testid={`button-sidebar-right-${i}`}
          >
            {item.icon}
            <span className="text-[10px] font-bold opacity-0 h-0 group-hover:opacity-100 group-hover:h-auto transition-all">
              {item.label}
            </span>
          </button>
        ))}
      </div>

      <div className="relative z-20 max-w-[1400px] mx-auto px-4 w-full flex flex-col items-center pt-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-16 max-w-4xl"
        >
          <h1
            className="text-5xl md:text-6xl lg:text-7xl font-black text-white mb-6 leading-tight drop-shadow-2xl tracking-tight"
            data-testid="text-hero-title"
          >
            وجهات عديدة{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary to-accent">
              بحلول متجددة
            </span>
          </h1>
          <p
            className="text-xl md:text-2xl text-white/90 drop-shadow-md font-medium"
            data-testid="text-hero-subtitle"
          >
            عبر شركاتنا التابعة .. نسخر كافة حلولنا لخدمتكم
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="w-full bg-background/95 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl mb-8 overflow-x-auto hide-scrollbar"
        >
          <div className="flex justify-center mb-3">
            <Link
              href="/schedule"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 hover:scale-105 transition-all duration-300 shadow-lg"
              data-testid="button-reserve-trip"
            >
              <CalendarCheck className="w-4 h-4" />
              احجز رحلتك الآن
            </Link>
          </div>
          <div className="flex items-stretch gap-3 min-w-max pb-2">
            {services.map((item, i) => (
              <a
                key={i}
                href={item.url}
                target={item.url !== "#" ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="flex-1 flex flex-col items-center justify-center gap-2 px-4 py-3 bg-muted/50 rounded-xl hover:bg-card hover:shadow-lg border border-transparent hover:border-primary/20 transition-all duration-300 group min-w-[120px]"
                data-testid={`link-service-${i}`}
              >
                <img
                  src={item.icon}
                  alt={item.label}
                  className="h-10 w-auto object-contain group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300"
                />
                <span className="text-[10px] font-semibold text-foreground text-center leading-tight line-clamp-2 w-full">
                  {item.label}
                </span>
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function ProjectsMarqueeSection() {
  const logos = [
    {
      src: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/6e5dfe47a_saptco_com_sa_taif_logo_cafbeb7f.png",
      url: "#",
    },
    {
      src: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/ec22b7e19_saptco_com_sa_qassim_logo_8709dceb.png",
      url: "#",
    },
    {
      src: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/4c7b31b07_saptco_com_sa_jazan_logo_27d2799f.png",
      url: "#",
    },
    {
      src: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/2edbaf17e_saptco_com_sa_tabuk_logo_561ec471.png",
      url: "#",
    },
    {
      src: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/958b3db05_saptco_com_sa_aseer_logo_b360c254.png",
      url: "#",
    },
    {
      src: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/f91e1032a_saptco_com_sa_ahsaa_logo_3e8c6799.png",
      url: "#",
    },
  ];

  return (
    <section
      className="bg-background py-16 relative overflow-hidden"
      dir="rtl"
      data-testid="section-projects"
    >
      <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2" />
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
        <AnimatedElement>
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-primary rounded-full" />
              <h2 className="text-3xl font-bold text-foreground">مشاريعنا</h2>
            </div>
            <div className="flex gap-2">
              <button
                className="w-10 h-10 rounded-full border border-border bg-card shadow-sm flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 group"
                data-testid="button-projects-next"
              >
                <ChevronRight className="w-5 h-5 group-hover:scale-110" />
              </button>
              <button
                className="w-10 h-10 rounded-full border border-border bg-card shadow-sm flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 group"
                data-testid="button-projects-prev"
              >
                <ChevronLeft className="w-5 h-5 group-hover:scale-110" />
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="overflow-hidden py-4 mask-edges">
              <div className="animate-marquee-rtl pause-on-hover gap-8">
                {[...logos, ...logos, ...logos].map((logo, i) => (
                  <a
                    key={i}
                    href={logo.url}
                    className="shrink-0 bg-card rounded-2xl border border-border/50 p-6 flex items-center justify-center hover:border-primary hover:shadow-xl hover:-translate-y-2 transition-all duration-500 w-56 h-32 group relative overflow-hidden"
                    data-testid={`link-project-${i}`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <img
                      src={logo.src}
                      alt="project logo"
                      className="h-14 w-auto object-contain group-hover:scale-110 transition-transform duration-500"
                    />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </AnimatedElement>
      </div>
    </section>
  );
}

function CompaniesSection() {
  const items = [
    {
      name: "شركة المواصلات العامة",
      description: "مشغل شبكة حافلات الرياض",
      url: "https://www.ptco.com.sa/ar/",
      image_url:
        "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/45ad9ad26_saptco_com_sa_ptc_card_88283fa4.jpg",
      logo: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/199f7ced3_saptco_com_sa_riyadh_logo_cc6bfeaf.png",
    },
    {
      name: "كامكو",
      description: "مشغل شبكات المترو والقطارات",
      url: "https://www.camco.com.sa/?lang=ar",
      image_url:
        "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/0d73bab6c_saptco_com_sa_ratp_card_20031a1c.jpg",
      logo: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/ce7ad1e5d_saptco_com_sa_riyadh_metro_logo_05160c75.png",
    },
    {
      name: "سيتكو",
      description: "حلول النقل التعليمي",
      url: "https://seitco.com.sa/",
      image_url:
        "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/d6ed68cc5_saptco_com_sa_seitco_card_cb07b6d2.jpg",
      logo: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/1d8acaa3c_saptco_com_sa_005_04c8ccfc.png",
    },
    {
      name: "DMS",
      description: "حلول التنقل الرقمي",
      url: "https://dmsventures.com/?lang=ar",
      image_url:
        "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/cb7c5e724_saptco_com_sa_dms_card_523073b0.jpg",
      logo: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/bdb951bb1_saptco_com_sa_006_148bfd9b.png",
    },
    {
      name: "SAT",
      description: "النقل بين المدن",
      url: "https://satrans.com.sa/ar",
      image_url:
        "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/cdbefc5d4_saptco_com_sa_sat_card_65e8ff65.jpg",
      logo: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/fc28c419e_saptco_com_sa_004_226268a4.png",
    },
  ];

  return (
    <section className="bg-secondary/40 py-20" dir="rtl" data-testid="section-companies">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
        <AnimatedElement>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-1 h-8 bg-primary rounded-full" />
            <h2 className="text-3xl font-bold text-foreground">شركاتنا</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {items.map((company, i) => (
              <AnimatedElement key={i} delay={i * 100}>
                <a
                  href={company.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm hover:shadow-2xl hover:border-primary/40 transition-all duration-500 hover:-translate-y-2 group"
                  data-testid={`link-company-${i}`}
                >
                  <div className="aspect-[4/5] overflow-hidden relative">
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors z-10" />
                    <img
                      src={company.image_url}
                      alt={company.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-background/95 backdrop-blur-md p-4 flex flex-col items-center justify-center transform group-hover:translate-y-0 transition-transform duration-500 z-20 border-t border-white/20">
                      {company.logo && (
                        <img
                          src={company.logo}
                          alt="logo"
                          className="h-10 w-auto object-contain mb-2"
                        />
                      )}
                      <p className="text-sm font-bold text-foreground text-center line-clamp-1">
                        {company.name}
                      </p>
                    </div>
                  </div>
                </a>
              </AnimatedElement>
            ))}
          </div>
        </AnimatedElement>
      </div>
    </section>
  );
}

function NewsSection() {
  const mainNews = {
    title:
      "تعلن الشركة السعودية للنقل الجماعي – سابتكو عن النتائج المالية الأولية الموحدة للفترة المنتهية في 31 مارس 2026م (ثلاثة أشهر)",
    excerpt:
      "تعلن الشركة السعودية للنقل الجماعي – سابتكو عن النتائج المالية الأولية الموحدة للفترة المنتهية في 31 مارس 2026م (ثلاثة أشهر)...",
    date: "07-05-2026",
    url: "#",
    image_url:
      "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/411b66b33_saptco_com_sa_saptco_default_news_7bfc2a45.png",
  };

  return (
    <section
      className="bg-background py-20 relative overflow-hidden"
      dir="rtl"
      data-testid="section-news"
    >
      <div className="absolute -left-32 top-32 w-96 h-96 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 relative z-10">
        <AnimatedElement>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-1 h-8 bg-primary rounded-full" />
            <h2 className="text-3xl font-bold text-foreground">جديد سابتكو</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-xl text-foreground">أحدث الأخبار</h3>
              </div>
              <div className="bg-card rounded-3xl border border-border/50 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 group">
                <div className="flex flex-col md:flex-row">
                  <a
                    href={mainNews.url}
                    className="md:w-2/5 relative overflow-hidden bg-muted flex items-center justify-center p-8"
                    data-testid="link-news-image"
                  >
                    <img
                      src={mainNews.image_url}
                      alt={mainNews.title}
                      className="w-full h-48 object-contain group-hover:scale-105 transition-transform duration-700"
                    />
                  </a>
                  <div className="p-8 md:w-3/5 flex flex-col justify-center">
                    <h4 className="font-bold text-xl text-foreground leading-snug mb-4 group-hover:text-primary transition-colors">
                      <a href={mainNews.url} data-testid="link-news-title">
                        {mainNews.title}
                      </a>
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6 line-clamp-3">
                      {mainNews.excerpt}
                    </p>
                    <div className="mt-auto">
                      <a
                        href="#"
                        className="inline-flex items-center gap-2 text-primary text-sm font-bold hover:gap-3 transition-all"
                        data-testid="link-news-more"
                      >
                        <ChevronLeft className="w-4 h-4" /> المزيد من الأخبار
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-foreground font-bold">
                  <img
                    src="https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/46d1f16e9_saptco_com_sa_x-icon_2e4215c3.png"
                    alt="X"
                    className="w-5 h-5 object-contain invert dark:invert-0"
                  />
                  @saptcoSA
                </div>
                <a
                  href="https://twitter.com/saptcoSA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary text-sm font-bold hover:underline flex items-center gap-1"
                  data-testid="link-twitter-follow"
                >
                  تابعنا <ChevronLeft className="w-4 h-4" />
                </a>
              </div>
              <div className="bg-card rounded-3xl border border-border/50 overflow-hidden shadow-sm flex-1 flex flex-col items-center justify-center p-10 relative group">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <img
                  src="https://satrans.com.sa/_next/static/media/sat-logo.0_9_-ihlb~um..svg"
                  alt="SAPTCO"
                  className="h-20 w-auto object-contain opacity-20 mb-8 transform group-hover:scale-110 group-hover:opacity-40 transition-all duration-700"
                />
                <a
                  href="https://twitter.com/saptcoSA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative z-10 inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-full text-sm font-bold hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
                  data-testid="link-twitter-cta"
                >
                  <ExternalLink className="w-4 h-4" />
                  متابعة سابتكو على X
                </a>
                <p className="text-xs text-muted-foreground mt-4 relative z-10">
                  Tweets by saptcoSA
                </p>
              </div>
            </div>
          </div>
        </AnimatedElement>
      </div>
    </section>
  );
}

function PartnersSection() {
  const partners = [
    "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/88c676ff8_saptco_com_sa_004_44f4b038.png",
    "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/3f94d6a5f_saptco_com_sa_005_f5b5f201.png",
    "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/307dfb6f3_saptco_com_sa_006_30ca31de.png",
    "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/1a7590a04_saptco_com_sa_007_efe44612.png",
    "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/511630ce0_saptco_com_sa_008_8179358d.png",
  ];

  return (
    <section
      className="bg-secondary/30 py-16 border-t border-border"
      dir="rtl"
      data-testid="section-partners"
    >
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
        <AnimatedElement>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-1 h-8 bg-primary rounded-full" />
              <h2 className="text-2xl font-bold text-foreground">شركاؤنا</h2>
            </div>

            <div className="flex-1 overflow-hidden relative mask-edges w-full">
              <div className="animate-marquee-rtl pause-on-hover gap-10 py-4">
                {[...partners, ...partners, ...partners].map((src, i) => (
                  <div
                    key={i}
                    className="shrink-0 bg-card rounded-xl border border-border/50 p-4 flex items-center justify-center hover:border-primary/40 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 w-40 h-20 group"
                    data-testid={`item-partner-${i}`}
                  >
                    <img
                      src={src}
                      alt="partner"
                      className="h-10 w-auto object-contain grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AnimatedElement>
      </div>
    </section>
  );
}

function ProfileDownloadSection() {
  return (
    <section
      className="bg-foreground py-10 relative overflow-hidden"
      dir="rtl"
      data-testid="section-profile-download"
    >
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
      <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-primary/20 to-transparent pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 relative z-10">
        <AnimatedElement delay={200}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <h3 className="text-xl md:text-2xl font-bold text-background drop-shadow-md">
              لتحميل الملف التعريفي لسابتكو
            </h3>
            <a
              href="#"
              className="relative overflow-hidden inline-flex items-center gap-3 bg-primary text-primary-foreground px-8 py-3.5 rounded-full font-bold hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-primary/30 group"
              data-testid="link-download-profile"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_ease-in-out_infinite] bg-[length:200%_100%]" />
              <Download className="w-5 h-5 group-hover:animate-bounce" />
              تحميل
            </a>
          </div>
        </AnimatedElement>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background font-sans" data-testid="page-home">
      <SiteHeader />
      <style>{inlineStyles}</style>
      <NewsTicker />
      <HeroSection />
      <ProjectsMarqueeSection />
      <CompaniesSection />
      <NewsSection />
      <PartnersSection />
      <ProfileDownloadSection />
      <SiteFooter />
    </div>
  );
}
