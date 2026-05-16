import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, Calendar, ArrowLeft } from "lucide-react";
import { BottomNav } from "./services";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

type NewsItem = {
  title: string;
  excerpt: string;
  date: string;
  url: string;
  image_url: string;
};

const NEWS_IMAGE =
  "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/411b66b33_saptco_com_sa_saptco_default_news_7bfc2a45.png";

const staticNews: NewsItem[] = [
  {
    title:
      "تعلن الشركة السعودية للنقل الجماعي – سابتكو عن النتائج المالية الأولية الموحدة للفترة المنتهية في 31 مارس 2026م (ثلاثة أشهر)",
    excerpt:
      "تعلن الشركة السعودية للنقل الجماعي – سابتكو عن النتائج المالية الأولية الموحدة للفترة المنتهية في 31 مارس 2026م (ثلاثة أشهر) ...",
    date: "07-05-2026",
    url: "#",
    image_url: NEWS_IMAGE,
  },
  {
    title:
      "يدعو مجلس إدارة الشركة السعودية للنقل الجماعي – سابتكو المساهمين إلى حضور اجتماع الجمعية العامة العادية (الاجتماع الأول)",
    excerpt:
      "يدعو مجلس إدارة الشركة السعودية للنقل الجماعي – سابتكو المساهمين إلى حضور اجتماع الجمعية العامة العادية ...",
    date: "22-04-2026",
    url: "#",
    image_url: NEWS_IMAGE,
  },
  {
    title: "سابتكو تشارك في اليوم الدولي للنقل",
    excerpt:
      "شاركت سابتكو في فعاليات اليوم الدولي للنقل وأبرزت دورها في تطوير منظومة النقل العام بالمملكة ...",
    date: "17-04-2026",
    url: "#",
    image_url: NEWS_IMAGE,
  },
  {
    title: "سابتكو تنال شهادة «Great Place to Work» لعام 2026م",
    excerpt:
      "حصلت سابتكو على شهادة Great Place to Work لعام 2026م تقديراً لبيئة العمل المتميزة التي توفرها للموظفين ...",
    date: "06-04-2026",
    url: "#",
    image_url: NEWS_IMAGE,
  },
];

function AnimatedElement({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
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
      className={`transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className || ""}`}
    >
      {children}
    </div>
  );
}

export default function MediaCenter() {
  const [search, setSearch] = useState("");

  const filtered = staticNews.filter(
    (item) =>
      !search ||
      item.title.includes(search) ||
      item.excerpt.includes(search),
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl" data-testid="page-media-center">
      <SiteHeader />
      <section className="relative bg-gradient-to-bl from-primary to-primary/70 overflow-hidden min-h-[40vh] flex items-center">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")',
          }}
        />
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-16 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <p className="text-primary-foreground/70 text-sm mb-2">سابتكو</p>
            <h1
              className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-4"
              data-testid="text-title"
            >
              المركز الإعلامي
            </h1>
            <p className="text-primary-foreground/80 max-w-xl">
              تابع آخر أخبار ومستجدات الشركة السعودية للنقل الجماعي
            </p>
          </motion.div>
        </div>
      </section>

      <section className="bg-secondary border-b border-border py-6">
        <div className="max-w-7xl mx-auto px-4">
          <AnimatedElement>
            <div className="relative max-w-lg">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="ابحث في الأخبار..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-card border border-border rounded-lg pr-10 pl-4 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                data-testid="input-search"
              />
            </div>
          </AnimatedElement>
        </div>
      </section>

      <section className="bg-background py-12">
        <div className="max-w-7xl mx-auto px-4">
          <AnimatedElement>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((item, i) => (
                <div
                  key={i}
                  className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 group"
                  style={{ transitionDelay: `${i * 60}ms` }}
                  data-testid={`card-news-${i}`}
                >
                  <div className="aspect-[16/9] overflow-hidden bg-secondary">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {item.date}
                      </span>
                    </div>
                    <h3 className="font-semibold text-foreground text-sm leading-relaxed mb-2 line-clamp-3 group-hover:text-primary transition-colors">
                      <a href={item.url}>{item.title}</a>
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                      {item.excerpt}
                    </p>
                    <a
                      href={item.url}
                      className="inline-flex items-center gap-1 text-primary text-xs font-medium hover:gap-2 transition-all duration-300"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      قراءة المزيد
                    </a>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  لا توجد نتائج مطابقة لبحثك
                </div>
              )}
            </div>
          </AnimatedElement>
        </div>
      </section>

      <section className="bg-primary py-12 pb-24">
        <div className="max-w-7xl mx-auto px-4">
          <AnimatedElement>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
              {[
                { number: "50+", label: "سنة من الخبرة" },
                { number: "11", label: "مدينة سعودية" },
                { number: "5000+", label: "موظف" },
                { number: "10", label: "شركات تابعة" },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-1"
                  data-testid={`stat-${i}`}
                >
                  <span className="text-3xl font-bold text-primary-foreground">
                    {stat.number}
                  </span>
                  <span className="text-sm text-primary-foreground/80">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </AnimatedElement>
        </div>
      </section>

      <SiteFooter />
      <BottomNav active="" />
    </div>
  );
}
