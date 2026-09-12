"use client";

import { InputOTP, REGEXP_ONLY_DIGITS } from "@heroui/react";
import { authFieldLimits } from "@/modules/auth/schemas";

// Read from the schema the server validates with, so the two cannot drift apart.
const OTP_LENGTH = authFieldLimits.otpCode;

// flex-1 + a max-width cap (rather than a fixed w-11) so six slots plus gaps never overflow
// the auth card on the narrowest phones (~320px) — they shrink together instead of clipping.
const slotClass =
  "grid h-12 max-w-[2.75rem] flex-1 place-items-center rounded-lg border border-[#e0dfda] bg-white text-lg font-bold outline-none transition data-[active=true]:border-[var(--brand-primary)] data-[active=true]:ring-2 data-[active=true]:ring-[var(--brand-primary)]/15 data-[filled=true]:border-[#c7c6c1]";

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
    <div dir="ltr" className="flex w-full justify-center">
      <InputOTP.Root maxLength={OTP_LENGTH} value={value} onChange={onChange} pattern={REGEXP_ONLY_DIGITS} isDisabled={isDisabled} autoFocus={autoFocus} className="w-full">
        <InputOTP.Group className="w-full justify-between gap-1.5 sm:gap-2">
          {Array.from({ length: OTP_LENGTH }).map((_, index) => (
            <InputOTP.Slot key={index} index={index} className={slotClass} />
          ))}
        </InputOTP.Group>
      </InputOTP.Root>
    </div>
  );
}
