import type { CompatibilityRule } from "@/lib/runtime-builder/types";

export const compatibilityRules: CompatibilityRule[] = [
  {
    code: "AI_REQUIRES_PRO",
    level: "error",
    ifAll: ["ai-agents"],
    forImages: ["elsa-oss", "elsa-minimal", "elsa-developer"],
    message:
      "AI Agents require an Elsa Pro or AI Runtime image. Switch the runtime image to enable this capability.",
  },
  {
    code: "VECTOR_REQUIRES_AGENTS",
    level: "error",
    ifAll: ["ai-vector-store"],
    ifMissing: ["ai-agents"],
    message: "Vector Store needs AI Agents enabled.",
  },
  {
    code: "RECOMMEND_OBSERVABILITY",
    level: "warning",
    ifMissing: ["open-telemetry"],
    message: "Enable OpenTelemetry to collect traces and metrics in production.",
  },
  {
    code: "RECOMMEND_PERSISTENCE",
    level: "warning",
    ifMissing: [
      "postgresql-persistence",
      "sqlserver-persistence",
      "sqlite-persistence",
    ],
    message:
      "No persistence capability selected. Workflow state will not survive restarts.",
  },
  {
    code: "RECOMMEND_MESSAGING",
    level: "info",
    ifMissing: ["rabbitmq-messaging", "azure-servicebus-messaging"],
    message:
      "Distributed messaging is recommended for multi-node deployments.",
  },
  {
    code: "REDIS_AND_INMEMORY",
    level: "error",
    ifAll: ["redis-cache", "in-memory-runtime"],
    message:
      "Redis Cache conflicts with the In-Memory Runtime. Pick one cache strategy.",
  },
];
