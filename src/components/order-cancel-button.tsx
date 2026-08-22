"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Modal, Spinner, toast } from "@heroui/react";
import { Ban, X } from "lucide-react";

export function OrderCancelButton({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function cancel() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "لغو سفارش انجام نشد.");
      setOpen(false);
      toast.success("سفارش لغو شد", { description: `سفارش ${orderNumber} با موفقیت لغو شد.`, timeout: 4000 });
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "لغو سفارش انجام نشد.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button type="button" variant="danger-soft" onPress={() => { setError(""); setOpen(true); }} className="min-h-10 gap-2 px-4 text-xs font-bold"><Ban size={15} />لغو سفارش</Button>
      <Modal.Backdrop isOpen={open} onOpenChange={(next) => { if (!loading) setOpen(next); }} variant="blur">
        <Modal.Container size="sm" placement="center">
          <Modal.Dialog aria-label="تأیید لغو سفارش" dir="rtl" className="mx-4 max-w-md bg-[var(--surface)] text-right">
            <Modal.Header className="flex-row items-center justify-between border-b border-[var(--border)] p-5">
              <Modal.Heading className="text-base font-bold">لغو سفارش</Modal.Heading>
              <Modal.CloseTrigger aria-label="بستن" className="grid size-9 place-items-center rounded-lg"><X size={18} /></Modal.CloseTrigger>
            </Modal.Header>
            <Modal.Body className="p-5 text-sm leading-7 text-[var(--muted)]">
              سفارش <b className="text-[var(--foreground)]" dir="ltr">{orderNumber}</b> لغو شود؟ این سفارش هنوز پرداخت نشده و پس از لغو دیگر قابل پرداخت نخواهد بود.
              {error && <Alert status="danger" className="mt-3"><Alert.Description>{error}</Alert.Description></Alert>}
            </Modal.Body>
            <Modal.Footer className="gap-2 border-t border-[var(--border)] p-4">
              <Button type="button" variant="danger" isPending={loading} onPress={() => void cancel()}>
                {({ isPending }) => <>{isPending && <Spinner color="current" size="sm" />}{isPending ? "در حال لغو..." : "لغو سفارش"}</>}
              </Button>
              <Button type="button" variant="secondary" isDisabled={loading} onPress={() => setOpen(false)}>انصراف</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
