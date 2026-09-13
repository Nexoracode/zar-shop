import { Bell, Clock3, Gift, Headset, Heart, MapPin, MessageCircle, ShoppingBag, Undo2, UserRound, type LucideIcon } from "lucide-react";

export type AccountNavItem = { href: string; label: string; icon: LucideIcon };

// Shared by AccountSidebar (the actual menu rows) and AccountMobileTopBar (sub-page title
// lookup by longest-matching href prefix) so the two never drift out of sync.
export function getAccountNavItems(showReferral: boolean): AccountNavItem[] {
  return [
    { href: "/account/notifications", label: "اعلان‌ها", icon: Bell },
    { href: "/account/orders", label: "سفارش‌ها", icon: ShoppingBag },
    { href: "/account/returns", label: "مرجوعی‌ها", icon: Undo2 },
    { href: "/account/tickets", label: "تیکت‌های من", icon: Headset },
    { href: "/account/favorites", label: "لیست‌های من", icon: Heart },
    { href: "/account/reviews", label: "دیدگاه‌ها و پرسش‌ها", icon: MessageCircle },
    ...(showReferral ? [{ href: "/account/referral", label: "دعوت دوستان", icon: Gift }] : []),
    { href: "/account/recent-visits", label: "بازدیدهای اخیر", icon: Clock3 },
    { href: "/account/addresses", label: "آدرس‌ها", icon: MapPin },
    { href: "/account/profile", label: "اطلاعات حساب", icon: UserRound },
  ];
}
