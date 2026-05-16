import hhrLogo from "@assets/xlayout_set_logo,qimg_id=40191841,at=1778516310060.pagespeed.i_1778640082609.png";
import sstpcLogo from "@assets/sstpc-logo_1778640082608.png";

export function Loading() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-7"
      dir="rtl"
      data-testid="app-loading"
      style={{
        background:
          "radial-gradient(1200px 600px at 50% -10%, rgba(190,154,78,0.18), transparent 60%)," +
          "radial-gradient(900px 500px at 50% 110%, rgba(190,154,78,0.12), transparent 60%)," +
          "repeating-linear-gradient(135deg, #faf6ee 0, #faf6ee 18px, #f4ecdb 18px, #f4ecdb 19px)",
      }}
    >
      <div
        className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-white/85 backdrop-blur-md shadow-[0_10px_30px_-8px_rgba(120,90,30,0.18),0_2px_6px_rgba(120,90,30,0.06)] animate-in fade-in slide-in-from-bottom-2 duration-500"
      >
        <img
          src={hhrLogo}
          alt="قطار الحرمين السريع"
          className="h-14 w-auto object-contain"
        />
        <span
          className="block w-px h-12"
          style={{
            background:
              "linear-gradient(to bottom, transparent, #d6b878, transparent)",
          }}
        />
        <img
          src={sstpcLogo}
          alt="SSTPC"
          className="h-11 w-auto object-contain"
        />
      </div>

      <div className="text-center">
        <p
          className="text-base font-extrabold tracking-wide"
          style={{ color: "#4a3a14" }}
        >
          قطار الحرمين السريع
        </p>
        <p
          className="text-[11px] font-medium mt-1"
          style={{ color: "#8b7440", letterSpacing: "1.5px" }}
        >
          HARAMAIN HIGH SPEED RAILWAY
        </p>
      </div>

      <div
        className="relative w-52 h-[3px] rounded-full overflow-hidden"
        style={{ background: "rgba(190,154,78,0.18)" }}
        role="progressbar"
        aria-busy="true"
      >
        <div className="splash-bar absolute inset-y-0 w-2/5 rounded-full" />
      </div>

      <style>{`
        .splash-bar {
          background: linear-gradient(90deg, #c69b4a, #e6c073, #c69b4a);
          animation: splashBar 1.4s ease-in-out infinite;
        }
        @keyframes splashBar {
          0% { transform: translateX(-110%); }
          100% { transform: translateX(360%); }
        }
      `}</style>
    </div>
  );
}
