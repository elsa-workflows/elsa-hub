import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useOrganization } from "@/contexts/OrganizationContext";

type WeaverState = {
  open: boolean;
  threadId: string | null;
};

interface WeaverContextValue {
  open: boolean;
  threadId: string | null;
  routeContext: {
    pathname: string;
    organizationId: string | null;
    inRuntimeBuilder: boolean;
  };
  openPanel: (threadId?: string | null) => void;
  closePanel: () => void;
  newThread: () => string;
  setThreadId: (id: string | null) => void;
  navigate: (path: string) => void;
}

const WeaverContext = createContext<WeaverContextValue | null>(null);

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `t-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

export function WeaverProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WeaverState>({ open: false, threadId: null });
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedOrganization } = useOrganization();
  const organizationId = selectedOrganization?.id ?? null;

  const routeContext = useMemo(
    () => ({
      pathname: location.pathname,
      organizationId,
      inRuntimeBuilder: location.pathname.startsWith("/elsa-plus/runtime-builder"),
    }),
    [location.pathname, organizationId],
  );

  const openPanel = useCallback((threadId?: string | null) => {
    setState((s) => ({
      open: true,
      threadId: threadId ?? s.threadId ?? newId(),
    }));
  }, []);

  const closePanel = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
  }, []);

  const newThread = useCallback(() => {
    const id = newId();
    setState({ open: true, threadId: id });
    return id;
  }, []);

  const setThreadId = useCallback((id: string | null) => {
    setState((s) => ({ ...s, threadId: id }));
  }, []);

  const value: WeaverContextValue = {
    open: state.open,
    threadId: state.threadId,
    routeContext,
    openPanel,
    closePanel,
    newThread,
    setThreadId,
    navigate: (path: string) => navigate(path),
  };

  return <WeaverContext.Provider value={value}>{children}</WeaverContext.Provider>;
}

export function useWeaver() {
  const ctx = useContext(WeaverContext);
  if (!ctx) throw new Error("useWeaver must be used within WeaverProvider");
  return ctx;
}
