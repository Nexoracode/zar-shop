import { ProfileEditor } from "@/components/profile-editor";
import { ChangePasswordForm } from "@/components/change-password-form";
import { RefundSettings } from "@/components/refund-settings";
import { SmsConsentPreference } from "@/components/sms-consent-preference";
import { AlertDescription, AlertRoot } from "@/components/hero";
import { requireUser } from "@/modules/auth/session";

export default async function ProfilePage() {
  const user = await requireUser();
  if (user.isGuest) {
    return <AlertRoot status="warning"><AlertDescription>ویرایش پروفایل برای حساب مهمان در دسترس نیست؛ ابتدا ثبت‌نام را کامل کنید.</AlertDescription></AlertRoot>;
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
