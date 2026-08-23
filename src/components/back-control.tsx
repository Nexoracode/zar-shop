"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Button } from "@heroui/react";

// href="back" uses the browser's own history instead of a fixed destination — for pages like
// auth where "back" should return wherever the visitor actually came from, not one hardcoded
// route. Anything else renders as a normal link (e.g. checkout always wants "back to cart").
export function BackControl({ href, label, className }: { href: string; label: string; className: string }) {
  const router = useRouter();
  if (href === "back") {
    return <Button type="button" variant="ghost" onPress={() => router.back()} className={className}><ChevronRight size={17} />{label}</Button>;
  }
  return <Link href={href} className={className}><ChevronRight size={17} />{label}</Link>;
}
