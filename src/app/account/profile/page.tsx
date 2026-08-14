import { AccountPageHeader } from "@/components/account-page-ui";
import { ProfileEditor } from "@/components/profile-editor";
import { SmsConsentPreference } from "@/components/sms-consent-preference";
import { AlertDescription, AlertRoot } from "@/components/hero";
import { requireUser } from "@/modules/auth/session";

export default async function ProfilePage() {
  const user = await requireUser();
  return <><AccountPageHeader title="اطلاعات حساب کاربری" description="ویرایش اطلاعات هویتی و راه‌های ارتباطی" />{user.isGuest ? <AlertRoot status="warning"><AlertDescription>ویرایش پروفایل برای حساب مهمان در دسترس نیست؛ ابتدا ثبت‌نام را کامل کنید.</AlertDescription></AlertRoot> : <><ProfileEditor initialProfile={{ firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone, nationalId: user.nationalId }} /><SmsConsentPreference initialValue={user.smsMarketingConsent} /></>}</>;
}
