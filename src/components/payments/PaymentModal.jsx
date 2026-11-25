"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Lock,
  ShieldCheck,
  X,
} from "lucide-react";
import { FixMateSpinner } from "@/components/ui/LoadingState";

const BRAND_LABELS = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  discover: "Discover",
  unknown: "Card",
};

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function detectCardBrand(digits) {
  if (!digits) return "unknown";
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^(6011|65|64[4-9]|622)/.test(digits)) return "discover";
  return "unknown";
}

function formatCardNumber(value) {
  const digits = onlyDigits(value).slice(0, 19);
  if (/^3[47]/.test(digits)) {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)]
      .filter(Boolean)
      .join(" ");
  }
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value) {
  const digits = onlyDigits(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function passesLuhn(digits) {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

function validateExpiry(value) {
  const match = /^(\d{2})\s*\/\s*(\d{2})$/.exec(String(value || "").trim());
  if (!match) return "Enter the expiry date as MM/YY.";

  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return "Month must be between 01 and 12.";

  const now = new Date();
  const firstDayOfNextMonth = new Date(year, month, 1);
  if (firstDayOfNextMonth <= now) return "This card has expired.";
  return "";
}

function formatAmount(value) {
  const num = Number(value);
  return Number.isNaN(num) ? "0.00" : num.toFixed(2);
}

export default function CardPaymentModal({
  booking,
  amount = 0,
  loading = false,
  error = "",
  onClose,
  onPay,
}) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [holder, setHolder] = useState("");
  const [errors, setErrors] = useState({});

  const numberRef = useRef(null);
  const expiryRef = useRef(null);
  const cvcRef = useRef(null);
  const holderRef = useRef(null);

  const digits = onlyDigits(cardNumber);
  const brand = useMemo(() => detectCardBrand(digits), [digits]);
  const cvcLength = brand === "amex" ? 4 : 3;
  const displayAmount = formatAmount(amount);

  useEffect(() => {
    const timer = window.setTimeout(() => numberRef.current?.focus(), 60);

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loading) onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [loading, onClose]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (loading) return;

    const nextErrors = {};
    const trimmedHolder = holder.trim();
    const cvcDigits = onlyDigits(cvc);

    if (!digits) {
      nextErrors.cardNumber = "Enter your card number.";
    } else if (digits.length < 13 || digits.length > 19) {
      nextErrors.cardNumber = "Card number must be 13–19 digits.";
    } else if (!passesLuhn(digits)) {
      nextErrors.cardNumber = "That card number doesn't look valid.";
    }

    const expiryError = validateExpiry(expiry);
    if (expiryError) nextErrors.expiry = expiryError;

    if (!cvcDigits) {
      nextErrors.cvc = "Enter the security code.";
    } else if (cvcDigits.length !== cvcLength) {
      nextErrors.cvc = `Security code must be ${cvcLength} digits.`;
    }

    if (!trimmedHolder) {
      nextErrors.holder = "Enter the name printed on the card.";
    } else if (trimmedHolder.length < 3) {
      nextErrors.holder = "Enter the full name on the card.";
    }

    setErrors(nextErrors);

    const firstInvalid = ["cardNumber", "expiry", "cvc", "holder"].find(
      (key) => nextErrors[key]
    );
    if (firstInvalid) {
      const refs = {
        cardNumber: numberRef,
        expiry: expiryRef,
        cvc: cvcRef,
        holder: holderRef,
      };
      refs[firstInvalid]?.current?.focus();
      return;
    }

    onPay?.({
      brand: BRAND_LABELS[brand],
      last4: digits.slice(-4),
      holder: trimmedHolder,
      expiry,
    });
  };

  const inputClass = (field) =>
    `w-full rounded-xl bg-slate-50 dark:bg-slate-950 border p-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition ${
      errors[field]
        ? "border-rose-500 focus:border-rose-500"
        : "border-slate-300 dark:border-slate-800 focus:border-sky-500"
    }`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-payment-title"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                Secure card payment
              </p>
              <h2
                id="card-payment-title"
                className="text-lg font-bold text-slate-900 dark:text-white mt-0.5"
              >
                {booking?.serviceTitle || "Repair Service"}
              </h2>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => onClose?.()}
            aria-label="Close payment modal"
            className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Amount due
            </p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">
              ${displayAmount}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            One-time charge
          </span>
        </div>

        {error && (
          <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="card-number"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Card number
            </label>
            <div className="relative">
              <input
                id="card-number"
                ref={numberRef}
                type="text"
                inputMode="numeric"
                autoComplete="cc-number"
                value={cardNumber}
                onChange={(event) => {
                  setCardNumber(formatCardNumber(event.target.value));
                  if (errors.cardNumber) {
                    setErrors((prev) => ({ ...prev, cardNumber: "" }));
                  }
                }}
                placeholder="4242 4242 4242 4242"
                className={`${inputClass("cardNumber")} pr-24`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <CreditCard className="w-4 h-4" />
                {BRAND_LABELS[brand]}
              </span>
            </div>
            {errors.cardNumber && (
              <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
                {errors.cardNumber}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="card-expiry"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Expiry date
              </label>
              <input
                id="card-expiry"
                ref={expiryRef}
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                value={expiry}
                onChange={(event) => {
                  setExpiry(formatExpiry(event.target.value));
                  if (errors.expiry) {
                    setErrors((prev) => ({ ...prev, expiry: "" }));
                  }
                }}
                placeholder="MM/YY"
                className={inputClass("expiry")}
              />
              {errors.expiry && (
                <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
                  {errors.expiry}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="card-cvc"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {`CVC (${cvcLength} digits)`}
              </label>
              <input
                id="card-cvc"
                ref={cvcRef}
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
                value={cvc}
                onChange={(event) => {
                  setCvc(onlyDigits(event.target.value).slice(0, cvcLength));
                  if (errors.cvc) {
                    setErrors((prev) => ({ ...prev, cvc: "" }));
                  }
                }}
                placeholder={brand === "amex" ? "1234" : "123"}
                className={inputClass("cvc")}
              />
              {errors.cvc && (
                <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
                  {errors.cvc}
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="card-holder"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Name on card
            </label>
            <input
              id="card-holder"
              ref={holderRef}
              type="text"
              autoComplete="cc-name"
              value={holder}
              onChange={(event) => {
                setHolder(event.target.value);
                if (errors.holder) {
                  setErrors((prev) => ({ ...prev, holder: "" }));
                }
              }}
              placeholder="Full name as printed on the card"
              className={inputClass("holder")}
            />
            {errors.holder && (
              <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
                {errors.holder}
              </p>
            )}
          </div>

          <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              Card details are validated on this device. Only the card brand and
              last 4 digits are saved with your payment record.
            </span>
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              disabled={loading}
              onClick={() => onClose?.()}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-bold transition shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <FixMateSpinner compact />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{`Pay $${displayAmount}`}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
