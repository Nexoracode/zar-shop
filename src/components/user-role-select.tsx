"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@heroui/react";
import type { UserRole } from "@generated/prisma/enums";
import { HeroSelectField } from "@/components/hero-select-field";
import { userRoleLabels } from "@/modules/admin/labels";

type Props = {
  userId: string;
  value: UserRole;
  roles: UserRole[];
  disabled?: boolean;
};

export function UserRoleSelect({ userId, value, roles, disabled = false }: Props) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(value);
  const [loading, setLoading] = useState(false);

  async function change(role: string) {
    if (disabled || loading || role === selectedRole) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "تغییر نقش کاربر انجام نشد.");
      setSelectedRole(result.role);
      toast.success("نقش کاربر تغییر کرد", { description: `نقش جدید: ${userRoleLabels[result.role as UserRole]}`, timeout: 4000 });
      router.refresh();
    } catch (reason) {
      toast.danger("تغییر نقش انجام نشد", { description: reason instanceof Error ? reason.message : "ارتباط با سرور برقرار نشد.", timeout: 5000 });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={loading ? "pointer-events-none opacity-60" : disabled ? "opacity-60" : ""}>
      <HeroSelectField
        name={`role-${userId}`}
        ariaLabel="نقش کاربر"
        value={selectedRole}
        disabled={disabled || loading}
        includeEmptyOption={false}
        options={roles.map((role) => ({ value: role, label: userRoleLabels[role] }))}
        onValueChange={(role) => void change(role)}
        className="w-full min-w-40 sm:w-48"
      />
    </div>
  );
}
