import Link from "next/link";
import { Card } from "@/components/hero";
import { AuthFlow } from "@/components/auth-flow";
import { StandaloneTopBar } from "@/components/standalone-top-bar";

export default function LoginPage() {
  return (
    <>
      <StandaloneTopBar backHref="back" backLabel="بازگشت" />
      <main className="grid min-h-[calc(100dvh-4rem)] place-items-center bg-[#f7f7f5] px-4 py-10 sm:py-14">
        <div className="w-full max-w-[420px]">
          <Card variant="secondary" className="rounded-2xl border border-[#e7e6e2] bg-white p-6 shadow-[0_22px_70px_rgba(29,49,85,0.06)] sm:p-8">
            <AuthFlow />
          </Card>
          <p className="mb-0 mt-4 text-center text-xs leading-6 text-[#9a9fa8]">
            ورود شما به معنای پذیرش <Link href="/pages/terms" className="text-[var(--brand-accent)] hover:underline">شرایط استفاده</Link> و <Link href="/pages/privacy" className="text-[var(--brand-accent)] hover:underline">حریم خصوصی</Link> است.
          </p>
        </div>
      </main>
    </>
  );
}
