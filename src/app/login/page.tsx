import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
export default function LoginPage(){return <main className="auth-shell"><section className="auth-card"><h1>خوش آمدید</h1><p>برای مشاهده سفارش‌ها و ادامه خرید وارد شوید.</p><AuthForm mode="login"/><p style={{marginTop:18}}>حساب ندارید؟ <Link href="/register" style={{color:"var(--gold-dark)"}}>ثبت‌نام کنید</Link></p></section></main>}
