import { NextResponse } from "next/server";
import { keepAdminSessionAlive } from "@/modules/auth/session";

// Pinged by the admin panel while the person is actually using it (typing, clicking, scrolling),
// so a long-open form doesn't lose its admin window mid-edit. A 401 tells the panel the window has
// closed and it must send the user back to /admin/login.
export async function POST() {
  if (!await keepAdminSessionAlive()) return NextResponse.json({ message: "نشست مدیریت به پایان رسیده است." }, { status: 401 });
  return NextResponse.json({ ok: true });
}
