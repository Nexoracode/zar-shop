import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
export default function RegisterPage(){return <main className="auth-shell"><section className="auth-card"><h1>ساخت حساب زر</h1><p>اطلاعات شما برای خرید امن و صدور فاکتور استفاده می‌شود.</p><AuthForm mode="register"/><p style={{marginTop:18}}>قبلاً ثبت‌نام کرده‌اید؟ <Link href="/login" style={{color:"var(--gold-dark)"}}>وارد شوید</Link></p></section></main>}
