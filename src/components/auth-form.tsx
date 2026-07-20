"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error,setError]=useState(""); const [loading,setLoading]=useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setError(""); const form=new FormData(event.currentTarget); const body=Object.fromEntries(form); const response=await fetch(`/api/auth/${mode}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}); const result=await response.json(); if(!response.ok){setError(result.message ?? "خطایی رخ داد.");setLoading(false);return;} router.push(mode==="login"?"/account":"/");router.refresh(); }
  return <form className="form" onSubmit={submit}>
    {mode==="register"&&<div className="form-row"><div className="field"><label htmlFor="firstName">نام</label><input id="firstName" name="firstName" required minLength={2}/></div><div className="field"><label htmlFor="lastName">نام خانوادگی</label><input id="lastName" name="lastName" required minLength={2}/></div></div>}
    <div className="field"><label htmlFor="email">ایمیل</label><input id="email" name="email" type="email" dir="ltr" required/></div>
    {mode==="register"&&<div className="field"><label htmlFor="phone">شماره موبایل</label><input id="phone" name="phone" inputMode="tel" dir="ltr" placeholder="09123456789" required/></div>}
    <div className="field"><label htmlFor="password">رمز عبور</label><input id="password" name="password" type="password" dir="ltr" minLength={8} required/></div>
    {error&&<div className="error">{error}</div>}<button className="btn btn-primary" disabled={loading}>{loading?"در حال بررسی...":mode==="login"?"ورود امن":"ساخت حساب"}</button>
  </form>;
}
