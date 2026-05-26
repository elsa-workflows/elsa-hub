import { Briefcase, GitBranch, Bot, Plug, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type UseCase = {
  value: string;
  icon: typeof Briefcase;
  label: string;
  headline: string;
  description: string;
  bullets: string[];
  code: string;
};

const useCases: UseCase[] = [
  {
    value: "background",
    icon: Briefcase,
    label: "Background jobs",
    headline: "Reliable background processing",
    description:
      "Replace ad-hoc Hangfire or hosted services with durable, observable workflows that survive restarts and retry on failure.",
    bullets: ["Automatic retries & checkpoints", "Cron & interval triggers", "Per-step observability"],
    code: `var workflow = new WorkflowBuilder()
    .StartWith<FetchInvoices>()
    .Then<GenerateReport>()
    .Then<SendEmail>(send =>
        send.WithRetry(3));`,
  },
  {
    value: "approval",
    icon: GitBranch,
    label: "Approval flows",
    headline: "Human-in-the-loop approvals",
    description:
      "Model multi-step approvals that pause for days or weeks and resume from any signal — email click, API call, or UI action.",
    bullets: ["Suspends on bookmarks", "Resumes via HTTP, queue, or event", "Built-in audit trail"],
    code: `workflow
    .StartWith<SubmitRequest>()
    .Then<NotifyApprover>()
    .WaitFor<ApprovalSignal>()
    .If(ctx => ctx.Approved,
        ifTrue => ifTrue.Then<Provision>(),
        ifFalse => ifFalse.Then<Reject>());`,
  },
  {
    value: "ai",
    icon: Bot,
    label: "AI agents",
    headline: "Composable AI agent workflows",
    description:
      "Orchestrate LLM calls, tool invocations, and human review with full visibility — no opaque agent loops, no lost state.",
    bullets: ["Deterministic step graph", "Mix code, prompts, and tools", "Replay & inspect any run"],
    code: `workflow
    .StartWith<ClassifyIntent>()
    .Switch(branch => branch
        .Case("billing", b => b.Then<BillingAgent>())
        .Case("support", b => b.Then<SupportAgent>())
        .Default(b => b.Then<FallbackToHuman>()));`,
  },
  {
    value: "integrations",
    icon: Plug,
    label: "Integrations",
    headline: "Glue systems together — your way",
    description:
      "Webhook in, transform, fan out to APIs and queues. Write activities in C# instead of fighting a node-based UI.",
    bullets: ["HTTP, MassTransit, MQTT triggers", "Custom activities in pure C#", "Designer-friendly outputs"],
    code: `workflow
    .StartWith<HttpEndpoint>(e => e.Path = "/orders")
    .Then<ValidateOrder>()
    .Parallel(
        b => b.Then<PostToErp>(),
        b => b.Then<PublishToBus>());`,
  },
  {
    value: "long-running",
    icon: Clock,
    label: "Long-running",
    headline: "Processes that run for weeks",
    description:
      "Onboarding journeys, billing cycles, SLAs. Persist state safely and pick up where you left off after deploys.",
    bullets: ["Durable persistence", "Versioned workflow definitions", "Scheduled timers & timeouts"],
    code: `workflow
    .StartWith<UserSignedUp>()
    .Delay(TimeSpan.FromDays(3))
    .Then<SendOnboardingTips>()
    .Delay(TimeSpan.FromDays(7))
    .Then<RequestFeedback>();`,
  },
];

export function UseCaseSwitcher() {
  return (
    <section className="py-20 md:py-28">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            What teams build with Elsa
          </h2>
          <p className="text-muted-foreground text-lg">
            From background jobs to long-running orchestration — one engine, many shapes.
          </p>
        </div>

        <Tabs defaultValue="background" className="max-w-5xl mx-auto">
          <TabsList className="flex flex-wrap h-auto justify-center gap-1 bg-muted/40 p-1 mb-8">
            {useCases.map((uc) => (
              <TabsTrigger key={uc.value} value={uc.value} className="gap-2 data-[state=active]:bg-background">
                <uc.icon className="h-3.5 w-3.5" />
                {uc.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {useCases.map((uc) => (
            <TabsContent key={uc.value} value={uc.value} className="mt-0">
              <div className="grid md:grid-cols-2 gap-6 items-stretch">
                <div className="rounded-xl border border-border bg-background p-6 md:p-8 flex flex-col">
                  <div className="inline-flex items-center gap-2 text-xs font-medium text-primary mb-3">
                    <uc.icon className="h-3.5 w-3.5" />
                    {uc.label}
                  </div>
                  <h3 className="text-2xl font-semibold tracking-tight mb-3">{uc.headline}</h3>
                  <p className="text-muted-foreground mb-5">{uc.description}</p>
                  <ul className="space-y-2 mt-auto">
                    {uc.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-border bg-muted/30 overflow-hidden flex flex-col">
                  <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-surface-subtle/60">
                    <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                    <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                    <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                    <span className="ml-2 text-xs font-mono text-muted-foreground">workflow.cs</span>
                  </div>
                  <pre className="p-4 md:p-5 text-xs md:text-sm font-mono leading-relaxed overflow-x-auto flex-1">
                    <code>{uc.code}</code>
                  </pre>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
