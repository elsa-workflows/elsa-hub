import { Layout } from "@/components/layout/Layout";
import { ResourceCategorySection } from "@/components/resources";
import { CommunityResource } from "@/components/resources/CommunityResourceCard";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BookOpen, Zap, Bot, Puzzle, Megaphone, MessageSquare, ArrowRight } from "lucide-react";

/*
 * ============================================================================
 * URL AUDIT REPORT (Last audited: 2025-01-25)
 * ============================================================================
 * 
 * | Card Title                                      | Old URL                                                                 | New URL                                                                                                  | Reason              |
 * |-------------------------------------------------|-------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------|---------------------|
 * | Orchestrating Intelligent Agents                | medium.com/@sipke/...7a8b9c0d1e2f                                      | sipkeschoorstra.medium.com/orchestrating-intelligent-agents-with-elsa-workflows-f3346b91dc17            | Wrong Medium domain |
 * | AI Workflows in .NET with Elsa 3                | youtube.com/watch?v=ai-workflows-elsa-3 (placeholder)                  | abp.io/community/videos/ai-workflows-in-.net-elsa-3-abp-framework-integration-stepbystep-u8ownpse       | Placeholder URL     |
 * | From Text to Summary: LLaMA 3.1 + .NET          | substack.com/llama-dotnet-text-summary (placeholder)                   | engincanveske.substack.com/p/from-text-to-summary-llama-31-net                                          | Placeholder URL     |
 * | Using Elsa 3 with the ABP Framework             | abp.io/community/articles/using-elsa-3-with-abp-framework              | abp.io/community/articles/using-elsa-3-workflow-with-abp-framework-usqk8afg                             | Incomplete slug     |
 * | ABP Elsa Module Documentation                   | abp.io/docs/latest/modules/elsa                                        | abp.io/docs/latest/modules/elsa-workflow                                                                 | Path updated        |
 * | Elsa Workflows for Orchard Core                 | orcharddojo.net/blog/elsa-workflows-orchard-core-publish-unpublish     | orcharddojo.net/blog/elsa-workflows-for-orchard-core-improve-handling-of-publish-unpublish-operations-this-week-in-orchard-28-02-2025 | Incomplete slug |
 * | Elsa 3.1 – Elevating Reliability                | medium.com/@sipke/...2a3b4c5d6e7f                                      | sipkeschoorstra.medium.com/elsa-3-1-9e7a516f3f8f                                                        | Placeholder slug    |
 * | Reusing Triggers in Elsa Workflows 3.5          | medium.com/@sipke/...8g9h0i1j2k3l                                      | sipkeschoorstra.medium.com/reusing-triggers-in-elsa-workflows-3-5-d86a484f40b3                          | Placeholder slug    |
 * | Orchard Core and Elsa Workflows Demo            | youtube.com/watch?v=orchard-core-elsa-demo (placeholder)               | youtube.com/watch?v=5jWR5fWhNrk                                                                         | Placeholder URL     |
 * 
 * Verified working URLs (no changes needed):
 * - Elsa 3.0 – Unleash the power of workflows: sipkeschoorstra.medium.com/elsa-3-0-2b341e7cbfa7
 * - Introducing Elsa Workflows 3: cantinhode.net (cleaned tracking params)
 * - Parallel Task Orchestration: sipkeschoorstra.medium.com/parallel-task-orchestration-with-elsa-3-0-e387f863655f
 * - Scheduled Background Tasks: dev.to/sfmskywalker/scheduled-background-tasks-made-easy-with-elsa-workflows-3o6k
 * - Configure External Authentication: medium.com/@djay93_42000/configure-external-authentication-in-elsa-workflows-environment-c8f91b6bd3ae
 * - Choosing the Right Workflow Engine: dev.to/mohammad_anzawi/choosing-the-right-workflow-engine-for-business-approval-systems-3klf
 * - ABP Community Talks YouTube: youtube.com/watch?v=fBPfbZwONKI
 * 
 * ============================================================================
 */

// Resource data organized by category
const gettingStartedResources: CommunityResource[] = [
  {
    title: "Elsa 3.0 – Unleash the power of workflows in your .NET projects",
    description:
      "Introduction to Elsa 3.0 featuring redesigned activity architecture, parallel execution, drag-and-drop designer, and more.",
    href: "https://sipkeschoorstra.medium.com/elsa-3-0-2b341e7cbfa7",
    source: "Medium",
    author: "Sipke Schoorstra",
    date: "Dec 2023",
    type: "article",
  },
  {
    title: "Introducing Elsa Workflows 3 – A Modern .NET Workflow Engine",
    description:
      "Overview of Elsa 3 as open-source .NET libraries for programmatic, visual, and declarative workflow definitions.",
    href: "https://cantinhode.net/blogs/community-cantinho-de-net/introducing-elsa-workflows-3-a-modern-net-workflow-engine",
    source: "Cantinhode.net",
    date: "2024",
    type: "article",
  },
];

const advancedFeaturesResources: CommunityResource[] = [
  {
    title: "Parallel Task Orchestration with Elsa 3.0",
    description:
      "Compare concurrent HTTP calls in C# with equivalent Elsa workflows using asynchronous execution and background jobs.",
    href: "https://sipkeschoorstra.medium.com/parallel-task-orchestration-with-elsa-3-0-e387f863655f",
    source: "Medium",
    date: "Jan 2024",
    type: "tutorial",
  },
  {
    title: "Scheduled Background Tasks made easy with Elsa Workflows",
    description:
      "Schedule background jobs using Cron-based and timer-based triggers via the workflow API with Quartz.NET.",
    href: "https://dev.to/sfmskywalker/scheduled-background-tasks-made-easy-with-elsa-workflows-3o6k",
    source: "Dev.to",
    date: "2024",
    type: "tutorial",
  },
  {
    title: "Configure External Authentication in Elsa Workflows Environment",
    description:
      "Step-by-step examples for password-flow authentication and OpenID Connect integration for Elsa Server and dashboard.",
    href: "https://medium.com/@djay93_42000/configure-external-authentication-in-elsa-workflows-environment-c8f91b6bd3ae",
    source: "Medium",
    date: "Dec 2024",
    type: "article",
  },
  {
    title: "Choosing the Right Workflow Engine for Business Approval Systems",
    description:
      "Comparison of .NET workflow engines including Elsa's feature set, visual designer, and persistence providers.",
    href: "https://dev.to/mohammad_anzawi/choosing-the-right-workflow-engine-for-business-approval-systems-3klf",
    source: "Dev.to",
    date: "Jun 2025",
    type: "article",
  },
];

const aiAgentsResources: CommunityResource[] = [
  {
    title: "Orchestrating Intelligent Agents with Elsa Workflows",
    description:
      "Preview of the Agents module in Elsa 3.3 for configuring LLM-powered agents to proof-read text or create artwork.",
    href: "https://sipkeschoorstra.medium.com/orchestrating-intelligent-agents-with-elsa-workflows-f3346b91dc17",
    source: "Medium",
    date: "Sep 2024",
    type: "article",
  },
  {
    title: "AI Workflows in .NET with Elsa 3",
    description:
      "Build an AI-powered question-answering system using Elsa and Ollama's LLM capabilities in an ABP-based application.",
    href: "https://abp.io/community/videos/ai-workflows-in-.net-elsa-3-abp-framework-integration-stepbystep-u8ownpse",
    source: "ABP.IO",
    date: "May 2025",
    type: "video",
  },
  {
    title: "From Text to Summary: LLaMA 3.1 + .NET in Action",
    description: "Build a Blazor WebAssembly app connecting to a local LLaMA 3.1 model for text summarization.",
    href: "https://engincanveske.substack.com/p/from-text-to-summary-llama-31-net",
    source: "Substack",
    date: "May 2025",
    type: "article",
  },
];

const frameworkIntegrationsResources: CommunityResource[] = [
  {
    title: "Using Elsa 3 with the ABP Framework: A Comprehensive Guide",
    description:
      "Step-by-step tutorial building an AI-powered Q&A workflow using Elsa 3, ABP Framework, and PostgreSQL.",
    href: "https://abp.io/community/articles/using-elsa-3-workflow-with-abp-framework-usqk8afg",
    source: "ABP.IO",
    date: "May 2025",
    type: "tutorial",
  },
  {
    title: "ABP Elsa Module Documentation",
    description:
      "Official documentation for integrating Elsa into ABP applications with permission management and OAuth support.",
    href: "https://abp.io/docs/latest/modules/elsa-workflow",
    source: "ABP Official",
    type: "official",
  },
  {
    title: "ABP Community Talks: Empower Elsa Workflows with AI",
    description:
      "Community talk exploring practical techniques to automate business processes with AI capabilities in Elsa.",
    href: "https://www.youtube.com/watch?v=fBPfbZwONKI",
    source: "YouTube",
    author: "Sipke Schoorstra",
    date: "Jun 2025",
    type: "video",
  },
  {
    title: "Elsa Workflows for Orchard Core – Improve publish/unpublish operations",
    description: "Enhancements to Orchard Core using Elsa Workflows with Content Activities and Core Services modules.",
    href: "https://orcharddojo.net/blog/elsa-workflows-for-orchard-core-improve-handling-of-publish-unpublish-operations-this-week-in-orchard-28-02-2025",
    source: "Orchard Dojo",
    date: "Feb 2025",
    type: "article",
  },
];

const releaseNotesResources: CommunityResource[] = [
  {
    title: "Elsa 3.1 – Elevating Reliability, Usability, and Performance",
    description:
      "Release notes covering Bulk Dispatch, Parallel For Each, workflow cancellation, and performance improvements.",
    href: "https://sipkeschoorstra.medium.com/elsa-3-1-9e7a516f3f8f",
    source: "Medium",
    date: "Apr 2024",
    type: "article",
  },
  {
    title: "Reusing Triggers in Elsa Workflows 3.5",
    description:
      "Preview of base classes (EventBase, TimerBase, HttpEndpointBase) and DelayFor function for custom triggers.",
    href: "https://sipkeschoorstra.medium.com/reusing-triggers-in-elsa-workflows-3-5-d86a484f40b3",
    source: "Medium",
    date: "Mar 2025",
    type: "article",
  },
  {
    title: "Orchard Core and Elsa Workflows Demo",
    description:
      "Demo showing Elsa integration into Orchard Core with visual workflow creation and content publish events.",
    href: "https://www.youtube.com/watch?v=5jWR5fWhNrk",
    source: "Lombiq/Orchard Dojo",
    author: "Sipke Schoorstra",
    type: "video",
  },
];

const categories = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Introductory tutorials and basic concepts",
    icon: BookOpen,
    resources: gettingStartedResources,
  },
  {
    id: "advanced-features",
    title: "Advanced Features",
    description: "Parallel execution, scheduling, and authentication",
    icon: Zap,
    resources: advancedFeaturesResources,
  },
  {
    id: "ai-agents",
    title: "AI and Agents",
    description: "LLM integration and intelligent agents",
    icon: Bot,
    resources: aiAgentsResources,
  },
  {
    id: "framework-integrations",
    title: "Framework Integrations",
    description: "ABP Framework and Orchard Core",
    icon: Puzzle,
    resources: frameworkIntegrationsResources,
  },
  {
    id: "release-notes",
    title: "Release Notes and Previews",
    description: "Version announcements and upcoming features",
    icon: Megaphone,
    resources: releaseNotesResources,
  },
];

export default function CommunityContent() {
  return (
    <Layout>
      {/* Breadcrumb */}
      <section className="py-6 border-b">
        <div className="container">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/resources">Resources</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Community Content</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </section>

      {/* Hero */}
      <section className="py-12 md:py-16 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Community Content</h1>
            <p className="text-lg text-muted-foreground mb-6">
              Blog posts, videos, and tutorials created by and for the Elsa Workflows community. Learn from real-world
              experiences and discover new ways to use Elsa.
            </p>

            {/* Quick Navigation */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <a
                  key={category.id}
                  href={`#${category.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full bg-muted/50 hover:bg-muted/70 transition-colors"
                >
                  <category.icon className="h-3.5 w-3.5" />
                  {category.title}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Category Sections */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="space-y-16">
            {categories.map((category) => (
              <ResourceCategorySection
                key={category.id}
                id={category.id}
                title={category.title}
                description={category.description}
                icon={category.icon}
                resources={category.resources}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Contribute Section */}
      <section className="py-12 md:py-16 bg-surface-subtle">
        <div className="container">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8 text-center">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Share Your Knowledge</h2>
              <p className="text-muted-foreground mb-6">
                Created a tutorial, blog post, or video about Elsa Workflows? We'd love to feature it here. Share your
                content with the community through GitHub Discussions.
              </p>
              <Button asChild>
                <a
                  href="https://github.com/elsa-workflows/elsa-core/discussions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-2"
                >
                  Submit Your Content
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
}
