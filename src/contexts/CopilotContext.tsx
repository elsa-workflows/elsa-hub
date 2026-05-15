import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useOrganization } from "@/contexts/OrganizationContext";

type CopilotState = {
  open: boolean;
  threadId: string | null;
};

interface CopilotContextValue {
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

const CopilotContext = createContext<CopilotContextValue | null>(null);

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `t-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

export function CopilotProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CopilotState>({ open: false, threadId: null });
  const location = useLocation();
  const navigate = useNavigate();
  let organizationId: string | null = null;
  try {
    const org = useOrganization();
    organizationId = org?.selectedOrganization?.id ?? null;
  } catch {
    organizationId = null;
  }

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

  const value: CopilotContextValue = {
    open: state.open,
    threadId: state.threadId,
    routeContext,
    openPanel,
    closePanel,
    newThread,
    setThreadId,
    navigate: (path: string) => navigate(path),
  };

  return <CopilotContext.Provider value={value}>{children}</CopilotContext.Provider>;
}

export function useCopilot() {
  const ctx = useContext(CopilotContext);
  if (!ctx) throw new Error("useCopilot must be used within CopilotProvider");
  return ctx;
}
