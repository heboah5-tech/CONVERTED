import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithEmail } from "@/lib/firebase";
import { Lock, Mail, ShieldCheck } from "lucide-react";

const SAT_LOGO =
  "https://satrans.com.sa/_next/static/media/sat-logo.0_9_-ihlb~um..svg";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      await loginWithEmail(email, password);
      setLocation("/dashboard");
    } catch (err: any) {
      if (err.code === "auth/invalid-credential") {
        setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      } else if (err.code === "auth/user-not-found") {
        setError("المستخدم غير موجود");
      } else if (err.code === "auth/wrong-password") {
        setError("كلمة المرور غير صحيحة");
      } else {
        setError("حدث خطأ، يرجى المحاولة مرة أخرى");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden"
      dir="rtl"
    >
      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"
        style={{ animation: "floatA 14s ease-in-out infinite" }}
      />
      <div
        className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[140px] pointer-events-none"
        style={{ animation: "floatB 16s ease-in-out infinite" }}
      />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-card rounded-3xl p-8 shadow-2xl border border-border/60 backdrop-blur-sm">
          <div className="text-center mb-8">
            <img
              src={SAT_LOGO}
              alt="قطار الحرمين"
              className="h-14 w-auto object-contain mx-auto mb-6"
            />
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
              <ShieldCheck className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-extrabold text-foreground">
              تسجيل الدخول
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              لوحة التحكم
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-foreground">
                البريد الإلكتروني
              </Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.slice(0, 120))}
                  maxLength={120}
                  className="bg-background border-2 border-border text-foreground pr-10 py-6 rounded-xl focus:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 transition-all"
                  placeholder="admin@example.com"
                  required
                  autoComplete="email"
                  data-testid="input-login-email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold text-foreground">
                كلمة المرور
              </Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value.slice(0, 128))}
                  maxLength={128}
                  className="bg-background border-2 border-border text-foreground pr-10 py-6 rounded-xl focus:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 transition-all"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  data-testid="input-login-password"
                />
              </div>
            </div>

            {error && (
              <div
                className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-destructive text-sm text-center font-medium"
                data-testid="error-login"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6 rounded-xl font-bold text-base shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300"
              data-testid="button-login-submit"
            >
              {loading ? "جاري تسجيل الدخول..." : "دخول"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2026 سابتكو السا للنقل
        </p>
      </div>
    </div>
  );
}
