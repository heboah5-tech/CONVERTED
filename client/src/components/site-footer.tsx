import { Link } from "wouter";
import { MapPin, Phone, Mail } from "lucide-react";

const FOOTER_LOGO =
  "https://satrans.com.sa/_next/static/media/sat-logo.0_9_-ihlb~um..svg";

const APP_STORE_BADGE =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Download_on_the_App_Store_Badge.svg/1280px-Download_on_the_App_Store_Badge.svg.png";
const GOOGLE_PLAY_BADGE =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Google_Play_Store_badge_EN.svg/2560px-Google_Play_Store_badge_EN.svg.png";

const VISION_2030 =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Saudi_Vision_2030_logo.svg/640px-Saudi_Vision_2030_logo.svg.png";
const EXPO_2030 =
  "https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Expo_2030_Riyadh_logo.svg/220px-Expo_2030_Riyadh_logo.svg.png";

const SOCIALS = [
  {
    href: "https://www.instagram.com/saptcosa",
    label: "Instagram",
    icon: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/24bb854e8_saptco_com_sa_instagram-icon_b8498055.png",
  },
  {
    href: "https://twitter.com/saptcoSA",
    label: "X",
    icon: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/0dca8103e_saptco_com_sa_twitter-x-icon_927d527d.png",
  },
  {
    href: "https://www.facebook.com/saptcoSA",
    label: "Facebook",
    icon: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/706a5a00b_saptco_com_sa_facebook-icon_20fa65a0.png",
  },
  {
    href: "https://www.linkedin.com/company/saptcosa/",
    label: "LinkedIn",
    icon: "https://media.base44.com/images/public/6a00b83e06bb9dc7138987a2/d841a7a06_saptco_com_sa_linkedin-icon_7c457505.png",
  },
];

const SUPPORT_LINKS = [
  { label: "الأسئلة الشائعة", href: "#" },
  { label: "إلغاء التذاكر", href: "#" },
  { label: "التغييرات والاسترجاع", href: "#" },
  { label: "إدارة التذاكر", href: "#" },
  { label: "رحلات بطاقة سوا", href: "#" },
  { label: "سياسة الخصوصية", href: "#" },
];

const SERVICE_LINKS = [
  { label: "حجز التذاكر", href: "/" },
  { label: "رحلاتنا", href: "#" },
  { label: "العروض", href: "#" },
  { label: "شحن البضائع", href: "#" },
  { label: "تتبع الباصات", href: "#" },
  { label: "حجز رحلة كاملة", href: "#" },
];

export default function SiteFooter() {
  return (
    <footer
      className="bg-white text-foreground border-t border-border"
      dir="rtl"
      data-testid="site-footer"
    >
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="flex flex-col gap-4">
            <Link href="/" data-testid="link-footer-logo">
              <img
                src={FOOTER_LOGO}
                alt="قطار الحرمين"
                onError={(e) => {
                  const t = e.currentTarget;
                  t.style.display = "none";
                  const next = t.nextElementSibling as HTMLElement | null;
                  if (next) next.style.display = "inline";
                }}
                className="h-14 w-auto object-contain"
              />
              <span
                className="font-bold text-2xl text-foreground"
                style={{ display: "none" }}
              >
                قطار الحرمين
              </span>
            </Link>
            <p className="text-sm font-bold text-foreground/80">
              قطار الحرمين السريع
            </p>
            <p className="text-xs text-muted-foreground tracking-wide">
              HARAMAIN HIGH SPEED RAILWAY
            </p>

            <div className="flex flex-col gap-2 mt-2 text-xs text-muted-foreground">
              <span className="inline-flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <span className="leading-relaxed">
                  مركز جرير، الرياض، المملكة العربية السعودية
                  <br />
                  الرمز البريدي: ١٢٣٨٣
                  <br />
                  الرقم الإضافي: ٤٢٦٢
                </span>
              </span>
              <a
                href="tel:920000877"
                className="inline-flex items-center gap-2 hover:text-foreground transition-colors"
                data-testid="link-phone"
              >
                <Phone className="w-3.5 h-3.5 text-primary" />
                920000877
              </a>
              <a
                href="mailto:info@saptco-alsa.sa"
                className="inline-flex items-center gap-2 hover:text-foreground transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-primary" />
                info@saptco-alsa.sa
              </a>
            </div>

            <div className="flex gap-3 mt-3">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full border border-border bg-muted/40 hover:bg-primary hover:border-primary flex items-center justify-center transition-all duration-300 group"
                  data-testid={`link-social-${s.label}`}
                >
                  <img
                    src={s.icon}
                    alt={s.label}
                    className="w-4 h-4 object-contain group-hover:brightness-0 group-hover:invert transition"
                  />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-primary mb-4 text-sm relative pb-2 after:content-[''] after:absolute after:bottom-0 after:right-0 after:w-10 after:h-0.5 after:bg-primary">
              الدعم
            </h4>
            <ul className="flex flex-col gap-2.5">
              {SUPPORT_LINKS.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    data-testid={`link-support-${l.label}`}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-primary mb-4 text-sm relative pb-2 after:content-[''] after:absolute after:bottom-0 after:right-0 after:w-10 after:h-0.5 after:bg-primary">
              حلول السفر
            </h4>
            <ul className="flex flex-col gap-2.5">
              {SERVICE_LINKS.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    data-testid={`link-service-${l.label}`}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-primary mb-4 text-sm relative pb-2 after:content-[''] after:absolute after:bottom-0 after:right-0 after:w-10 after:h-0.5 after:bg-primary">
              حمل تطبيقنا
            </h4>
            <div className="flex flex-col gap-3">
              <a
                href="#"
                className="hover:opacity-80 transition-opacity"
                data-testid="link-app-store"
              >
                <img
                  src={APP_STORE_BADGE}
                  alt="Download on the App Store"
                  className="h-11 w-auto object-contain"
                />
              </a>
              <a
                href="#"
                className="hover:opacity-80 transition-opacity"
                data-testid="link-google-play"
              >
                <img
                  src={GOOGLE_PLAY_BADGE}
                  alt="Get it on Google Play"
                  className="h-11 w-auto object-contain"
                />
              </a>
            </div>

            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-border">
              <img
                src={EXPO_2030}
                alt="Expo 2030 Riyadh"
                className="h-12 w-auto object-contain"
                data-testid="img-expo-2030"
              />
              <img
                src={VISION_2030}
                alt="Saudi Vision 2030"
                className="h-10 w-auto object-contain"
                data-testid="img-vision-2030"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            © 2026 جميع الحقوق محفوظة - سابتكو السا للنقل
          </p>
        </div>
      </div>
    </footer>
  );
}
