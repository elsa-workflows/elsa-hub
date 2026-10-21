import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

/**
 * Toasts once when Stripe Checkout returns with `?payment=<payment>`, then drops
 * that param so a reload does not toast again. Success is a success toast;
 * cancelled is a neutral message.
 */
export function usePaymentReturnToast(
  payment: "success" | "cancelled",
  title: string,
  description: string,
) {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("payment") !== payment) return;
    if (payment === "success") {
      toast.success(title, { description });
    } else {
      toast.message(title, { description });
    }
    const next = new URLSearchParams(searchParams);
    next.delete("payment");
    setSearchParams(next, { replace: true });
  }, [payment, title, description, searchParams, setSearchParams]);
}
