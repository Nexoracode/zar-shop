import { z } from "zod";

export const gatewayProviderSchema = z.enum(["ZARINPAL", "ZIBAL", "ASAN_PARDAKHT", "TOOMAN"]);
export type GatewayProviderId = z.infer<typeof gatewayProviderSchema>;

export type GatewayProviderInfo = {
  id: GatewayProviderId;
  name: string;
  credentialLabel: string;
  credentialPlaceholder: string;
  signupUrl: string;
  steps: string[];
};

export const gatewayProviders: GatewayProviderInfo[] = [
  { id: "ZARINPAL", name: "زرین‌پال", credentialLabel: "Merchant ID", credentialPlaceholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", signupUrl: "https://www.zarinpal.com/", steps: ["در زرین‌پال ثبت‌نام و احراز هویت را کامل کنید.", "از بخش درگاه‌های پرداخت، یک درگاه برای دامنه فروشگاه بسازید.", "Merchant ID صادرشده را کپی و در کادر زیر وارد کنید."] },
  { id: "ZIBAL", name: "زیبال", credentialLabel: "کد Merchant", credentialPlaceholder: "کد Merchant درگاه زیبال", signupUrl: "https://zibal.ir/", steps: ["در زیبال حساب بسازید و اطلاعات کسب‌وکار را تکمیل کنید.", "در پنل، درخواست ساخت درگاه برای دامنه فروشگاه ثبت کنید.", "پس از تأیید، کد Merchant را از تنظیمات درگاه کپی کنید."] },
  { id: "ASAN_PARDAKHT", name: "آسان پرداخت", credentialLabel: "کد پذیرنده / ترمینال", credentialPlaceholder: "شناسه‌ای که آسان پرداخت صادر کرده است", signupUrl: "https://asanpardakht.ir/", steps: ["درخواست پذیرندگی اینترنتی را در آسان پرداخت ثبت کنید.", "مدارک، دامنه و اطلاعات حساب تسویه را برای تأیید ارائه دهید.", "کد پذیرنده یا ترمینال صادرشده را در کادر زیر وارد کنید."] },
  { id: "TOOMAN", name: "تومن", credentialLabel: "کد درگاه / API Key", credentialPlaceholder: "شناسه صادرشده در پنل تومن", signupUrl: "https://tomanpay.com/", steps: ["در پنل تومن ثبت‌نام و احراز هویت کسب‌وکار را تکمیل کنید.", "برای دامنه فروشگاه درخواست درگاه پرداخت بدهید.", "کد درگاه یا API Key صادرشده را از پنل کپی کنید."] },
];
