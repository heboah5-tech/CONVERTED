import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const LOGO =
  "https://satrans.com.sa/_next/static/media/sat-logo.0_9_-ihlb~um..svg";

const NAV_ITEMS: { label: string; href: string }[] = [
  { label: "الرئيسية", href: "/" },
  { label: "رحلاتنا", href: "#" },
  { label: "من نحن", href: "#" },
  { label: "خيارات التذاكر", href: "#" },
  { label: "العروض", href: "#" },
  { label: "المركز الإعلامي", href: "/MediaCenter" },
  { label: "الأسئلة الشائعة", href: "#" },
  { label: "تواصل معنا", href: "#" },
];

export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-card/95 backdrop-blur-md shadow-md" : "bg-card"
      } border-b border-border`}
      dir="rtl"
      data-testid="site-header"
    >
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          <Link
            href="/"
            className="shrink-0 flex items-center gap-2"
            data-testid="link-logo"
          >
            <img
              src={LOGO}
              alt="SAPTCO ALSA"
              className="h-12 w-auto object-contain"
            />
          </Link>

          <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
            {NAV_ITEMS.map((item) =>
              item.href.startsWith("/") ? (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-[15px] font-medium text-foreground hover:text-primary transition-colors px-3 py-2 rounded-lg hover:bg-secondary/50 whitespace-nowrap"
                  data-testid={`link-nav-${item.label}`}
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-[15px] font-medium text-foreground hover:text-primary transition-colors px-3 py-2 rounded-lg hover:bg-secondary/50 whitespace-nowrap"
                  data-testid={`link-nav-${item.label}`}
                >
                  {item.label}
                </a>
              ),
            )}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href="#"
              className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-full bg-muted/40 border border-border hover:bg-muted/70 transition-colors"
              data-testid="link-language"
            >
              <span className="text-sm font-semibold text-foreground">
                العربية
              </span>
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Flag_of_Saudi_Arabia.svg/40px-Flag_of_Saudi_Arabia.svg.png"
                alt="KSA"
                className="w-5 h-3.5 object-cover rounded-sm"
              />
            </a>

            <a
              href="#"
              className="hidden sm:inline-flex items-center justify-center px-5 py-2.5 text-sm font-bold text-white rounded-full hover:opacity-90 transition-all duration-300 shadow-md"
              style={{ backgroundColor: "#3CB4D8" }}
              data-testid="link-login"
            >
              الدخول/التسجيل
            </a>

            <Sheet>
              <SheetTrigger asChild className="lg:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-secondary"
                  data-testid="button-mobile-menu"
                >
                  <Menu className="h-6 w-6 text-foreground" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="bg-card border-l border-border w-80"
                dir="rtl"
              >
                <div className="flex items-center mb-8 mt-4">
                  <Link href="/">
                    <img
                      src={LOGO}
                      alt="SAPTCO ALSA"
                      className="h-10 w-auto object-contain"
                    />
                  </Link>
                </div>
                <nav className="flex flex-col gap-1">
                  {NAV_ITEMS.map((item) =>
                    item.href.startsWith("/") ? (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="text-foreground hover:text-primary hover:bg-secondary rounded-lg px-4 py-3 text-base font-medium transition-colors"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <a
                        key={item.label}
                        href={item.href}
                        className="text-foreground hover:text-primary hover:bg-secondary rounded-lg px-4 py-3 text-base font-medium transition-colors"
                      >
                        {item.label}
                      </a>
                    ),
                  )}
                  <div className="mt-6 pt-6 border-t border-border flex flex-col gap-3">
                    <a
                      href="#"
                      className="inline-flex items-center justify-center px-5 py-3 text-sm font-bold text-white rounded-full"
                      style={{ backgroundColor: "#3CB4D8" }}
                    >
                      الدخول/التسجيل
                    </a>
                    <a
                      href="#"
                      className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full bg-muted/40 border border-border"
                    >
                      <span className="text-sm font-semibold text-foreground">
                        العربية
                      </span>
                      <img
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Flag_of_Saudi_Arabia.svg/40px-Flag_of_Saudi_Arabia.svg.png"
                        alt="KSA"
                        className="w-5 h-3.5 object-cover rounded-sm"
                      />
                    </a>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
