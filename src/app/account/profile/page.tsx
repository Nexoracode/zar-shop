import { ProfileEditor } from "@/components/profile-editor";
import { ChangePasswordForm } from "@/components/change-password-form";
import { RefundSettings } from "@/components/refund-settings";
import { SmsConsentPreference } from "@/components/sms-consent-preference";
import { InlineAlert } from "@/components/inline-alert";
import { requireUser } from "@/modules/auth/session";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function ProfilePage() {
  const user = await requireUser();
  if (user.isGuest) {
    return <InlineAlert status="warning">ویرایش پروفایل برای حساب مهمان در دسترس نیست؛ ابتدا ثبت‌نام را کامل کنید.</InlineAlert>;
  }
  return (
    <>
      <ProfileEditor initialProfile={{ firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone, nationalId: user.nationalId }} />
      <ChangePasswordForm />
      <RefundSettings initial={{ refundMethod: user.refundMethod, bankCardNumber: user.bankCardNumber, bankCardHolder: user.bankCardHolder, bankCardSheba: user.bankCardSheba }} />
      <SmsConsentPreference initialValue={user.smsMarketingConsent} />
    </>
  );
}
