import { useCallback, useState } from "react";
import { isAcademyPaymentSuccess } from "@/lib/academyCopy";
import { academyPaymentPollInterval } from "@/lib/academyPaymentPoll";

/**
 * Returns a refetchInterval helper: while the page was opened with ?payment=success and the
 * caller's query has not settled, recheck every few seconds for a short while, then stop.
 */
export function useAcademyPaymentPoll(): (settled: boolean) => number | false {
  const [startedAt] = useState<number | null>(() =>
    typeof window !== "undefined" && isAcademyPaymentSuccess(window.location.search) ? Date.now() : null,
  );
  return useCallback((settled: boolean) => academyPaymentPollInterval(startedAt, settled), [startedAt]);
}
