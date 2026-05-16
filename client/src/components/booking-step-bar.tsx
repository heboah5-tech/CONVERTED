import { Check, ChevronLeft } from "lucide-react";
import { Link } from "wouter";

export const BOOKING_STEPS = [
  { label: "الجدول الزمني" },
  { label: "أختر المقعد" },
  { label: "المعلومات الشخصية" },
  { label: "الدفع" },
];

type Props = {
  current: number;
  steps?: { label: string }[];
  title?: string;
  backHref?: string;
};

export default function BookingStepBar({
  current,
  steps = BOOKING_STEPS,
  title,
  backHref,
}: Props) {
  return (
    <div className="sticky top-0 z-30" dir="rtl">
      {title && (
        <div className="hhsr-page-header">
          {backHref ? (
            <Link href={backHref} className="hhsr-page-header__back" aria-label="رجوع">
              <ChevronLeft className="w-5 h-5 -scale-x-100" />
            </Link>
          ) : (
            <span className="hhsr-page-header__back opacity-0">
              <ChevronLeft className="w-5 h-5" />
            </span>
          )}
          <span className="hhsr-page-header__title">{title}</span>
          <span className="hhsr-page-header__back opacity-0">
            <ChevronLeft className="w-5 h-5" />
          </span>
        </div>
      )}

      <div className="hhsr-stepper">
        <div className="hhsr-stepper__inner">
          {steps.map((step, i) => {
            const stepNum = i + 1;
            const done = i < current;
            const active = i === current;
            return (
              <div
                key={i}
                className="hhsr-step"
                data-testid={`step-${i}`}
              >
                <div
                  className={`hhsr-step__dot ${
                    done ? "is-done" : active ? "is-active" : ""
                  }`}
                >
                  {done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : stepNum}
                </div>
                <span
                  className={`hhsr-step__label ${
                    active ? "is-active" : done ? "is-done" : ""
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
          <div className="hhsr-stepper__line" aria-hidden="true">
            <div
              className="hhsr-stepper__line-fill"
              style={{
                width: `${(current / Math.max(steps.length - 1, 1)) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
