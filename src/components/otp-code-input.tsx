"use client";

import { InputOTP, REGEXP_ONLY_DIGITS } from "@heroui/react";

const OTP_LENGTH = 6;

const slotClass =
  "grid h-12 w-11 place-items-center rounded-sm border border-[#e7e6e2] bg-white text-lg font-bold outline-none data-[active=true]:border-[var(--brand-accent)] data-[active=true]:ring-2 data-[active=true]:ring-[var(--brand-accent)]/20";

export function OtpCodeInput({
  value,
  onChange,
  isDisabled = false,
  autoFocus = true,
}: {
  value: string;
  onChange: (value: string) => void;
  isDisabled?: boolean;
  autoFocus?: boolean;
}) {
  return (
    // The slots must render left-to-right regardless of the page's RTL direction, since the
    // code itself is a left-to-right digit sequence (same rule as phone numbers, SKUs, etc).
    <div dir="ltr" className="flex justify-center">
      <InputOTP.Root maxLength={OTP_LENGTH} value={value} onChange={onChange} pattern={REGEXP_ONLY_DIGITS} isDisabled={isDisabled} autoFocus={autoFocus}>
        <InputOTP.Group className="gap-2">
          {Array.from({ length: OTP_LENGTH }).map((_, index) => (
            <InputOTP.Slot key={index} index={index} className={slotClass} />
          ))}
        </InputOTP.Group>
      </InputOTP.Root>
    </div>
  );
}
