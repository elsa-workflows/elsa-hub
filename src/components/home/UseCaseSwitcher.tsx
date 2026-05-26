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

// Code samples mirror the real Elsa 3 builder API:
//   public class MyWorkflow : WorkflowBase {
//     protected override void Build(IWorkflowBuilder builder) {
//       builder.Root = new Sequence { Activities = { ... } };
//     }
//   }
// Verified against elsa-workflows/elsa-core via DeepWiki.

const useCases: UseCase[] = [
  {
    value: "background",
    icon: Briefcase,
    label: "Background jobs",
    headline: "Reliable background processing",
    description:
      "Replace ad-hoc Hangfire or hosted services with durable, observable workflows that survive restarts and resume from checkpoints.",
    bullets: ["Durable persistence across restarts", "Schedule with Cron / Timer triggers", "Per-activity observability"],
    code: `public class NightlyReportWorkflow : WorkflowBase
{
    protected override void Build(IWorkflowBuilder builder)
    {
        builder.Root = new Sequence
        {
            Activities =
            {
                new WriteLine("Fetching invoices..."),
                new SendHttpRequest
                {
                    Url = new("https://api.example.com/invoices"),
                    Method = new("GET")
                },
                new WriteLine("Report generated.")
            }
        };
    }
}`,
  },
  {
    value: "approval",
    icon: GitBranch,
    label: "Approval flows",
    headline: "Human-in-the-loop approvals",
    description:
      "Model approvals that pause for days or weeks and resume when an external signal arrives — an HTTP callback, an event, or a UI action.",
    bullets: ["Suspends via bookmarks", "Resumes via HTTP, events, or signals", "Built-in audit trail of every step"],
    code: `public class ApprovalWorkflow : WorkflowBase
{
    protected override void Build(IWorkflowBuilder builder)
    {
        builder.Root = new Sequence
        {
            Activities =
            {
                new WriteLine("Waiting for approval..."),
                new HttpEndpoint
                {
                    Path = new("/approve/{workflowInstanceId}"),
                    SupportedMethods = new(new[] { HttpMethods.Post })
                },
                new WriteLine("Approved. Provisioning..."),
                new WriteHttpResponse { Content = new("Done") }
            }
        };
    }
}`,
  },
  {
    value: "ai",
    icon: Bot,
    label: "AI agents",
    headline: "Composable AI agent workflows",
    description:
      "Orchestrate LLM calls, tool invocations, and human review as explicit activities — no opaque agent loops, no lost state.",
    bullets: ["Deterministic, replayable step graph", "Mix C# activities, prompts, and tools", "Inspect any past run"],
    code: `public class TriageAgentWorkflow : WorkflowBase
{
    protected override void Build(IWorkflowBuilder builder)
    {
        var intent = builder.WithVariable<string>("Intent", "");

        builder.Root = new Sequence
        {
            Activities =
            {
                new ClassifyIntent { Result = new(intent) },
                new If
                {
                    Condition = new JavaScriptExpression<bool>(
                        "getIntent() === 'billing'"),
                    Then = new BillingAgent(),
                    Else = new SupportAgent()
                }
            }
        };
    }
}`,
  },
  {
    value: "integrations",
    icon: Plug,
    label: "Integrations",
    headline: "Glue systems together — your way",
    description:
      "Webhook in, transform, fan out to APIs and queues. Write activities in pure C# instead of fighting a node-based UI.",
    bullets: ["HTTP, MassTransit, MQTT triggers", "Custom activities in pure C#", "First-class designer support"],
    code: `public class OrderWebhookWorkflow : WorkflowBase
{
    protected override void Build(IWorkflowBuilder builder)
    {
        builder.Root = new Sequence
        {
            Activities =
            {
                new HttpEndpoint
                {
                    Path = new("/orders"),
                    SupportedMethods = new(new[] { HttpMethods.Post }),
                    CanStartWorkflow = true
                },
                new SendHttpRequest
                {
                    Url = new("https://erp.internal/api/orders"),
                    Method = new("POST")
                },
                new WriteHttpResponse { Content = new("Accepted") }
            }
        };
    }
}`,
  },
  {
    value: "long-running",
    icon: Clock,
    label: "Long-running",
    headline: "Processes that run for weeks",
    description:
      "Onboarding journeys, billing cycles, SLAs. State is persisted safely and resumes where it left off — even across deploys.",
    bullets: ["Durable persistence", "Versioned workflow definitions", "Scheduled timers and timeouts"],
    code: `public class OnboardingWorkflow : WorkflowBase
{
    protected override void Build(IWorkflowBuilder builder)
    {
        builder.Root = new Sequence
        {
            Activities =
            {
                new WriteLine("User signed up."),
                new Delay { Timeout = new(TimeSpan.FromDays(3)) },
                new WriteLine("Sending onboarding tips..."),
                new Delay { Timeout = new(TimeSpan.FromDays(7)) },
                new WriteLine("Requesting feedback...")
            }
        };
    }
}`,
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
                    <span className="ml-2 text-xs font-mono text-muted-foreground">Workflow.cs</span>
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
