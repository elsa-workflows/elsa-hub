import { Link } from "react-router-dom";
import CloudLegalDocument, { CloudLegalSectionArticle, type CloudLegalSection } from "./CloudLegalDocument";
import { elsaCloudLegalPath } from "@/lib/elsaCloud";

const providers = [
  {
    name: "Microsoft Azure",
    role: "Hosted infrastructure and customer content",
    details:
      "Hosts Elsa Cloud Hosted environments in West Europe and processes the workflow, runtime and diagnostic data placed in those environments. For BYO, your business selects and operates its own Azure environment.",
  },
  {
    name: "Supabase",
    role: "Application backend and authentication",
    details:
      "Stores account records, organisation links and BYO waitlist submissions, and runs application functions used for checkout coordination and the Elsa Cloud dashboard. Stripe, not Supabase, collects card details.",
  },
  {
    name: "Stripe",
    role: "Payments and billing",
    details:
      "Processes customer email, billing and payment details, and subscription status for Hosted plans and trials.",
  },
  {
    name: "GitHub",
    role: "Federated authentication",
    details:
      "Processes the identity attributes needed for account and Elsa Cloud access when you choose GitHub sign-in.",
  },
  {
    name: "Google",
    role: "Federated authentication",
    details: "Processes the identity attributes needed for account access when you choose Google sign-in.",
  },
  {
    name: "Lovable",
    role: "Website hosting and deployment",
    details:
      "Hosts and deploys Elsa Hub, including the Elsa Cloud pages and application interface, and may process technical request and security-log data needed to deliver it.",
  },
  {
    name: "Cloudflare",
    role: "DNS and network services",
    details:
      "Processes technical request and network-security data where its DNS, delivery or protection services are enabled.",
  },
];

const currentList: CloudLegalSection = {
  id: "providers",
  number: "01",
  title: "Providers used by Elsa Cloud",
  summary: "Not every provider processes Hosted customer content; the role for each provider is stated below.",
  points: providers.map((provider) => {
    const body = (
      <>
        <strong>{provider.name}</strong> · {provider.role}. {provider.details}
      </>
    );
    if (provider.name === "GitHub") {
      return (
        <>
          {/* CHANGED: account/sign-in wording — Hub uses GitHub OAuth instead of Microsoft Entra */}
          {body}
        </>
      );
    }
    if (provider.name === "Lovable") {
      return (
        <>
          {/* CHANGED: site name — Lovable hosts Elsa Hub rather than the standalone Elsa Cloud site */}
          {body}
        </>
      );
    }
    return body;
  }),
};

const dataBoundary: CloudLegalSection = {
  id: "data-boundary",
  number: "02",
  title: "Hosted and BYO Azure responsibilities",
  summary: "The infrastructure and data-processing roles differ between the two options.",
  points: [
    <>
      <strong>Hosted.</strong> Microsoft Azure hosts the Valence-operated environment in West Europe. Hosted customer content is processed for the service under the Hosted DPA.
    </>,
    <>
      <strong>BYO.</strong> Your business controls the Azure subscription and environment. Elsa Cloud's software interaction does not make Valence Works the operator of the Azure resources you choose.
    </>,
    <>
      <strong>Payments.</strong> Stripe handles payment details and billing status connected with the plan or trial where payment is enabled.
    </>,
    <>
      {/* CHANGED: site name — Lovable hosts Elsa Hub */}
      <strong>Application.</strong> Supabase supports account data, authentication and application functions. Lovable hosts and deploys Elsa Hub and the Elsa Cloud interface.
    </>,
    <>
      {/* CHANGED: account/sign-in wording — Hub identity providers are Google and GitHub */}
      <strong>Identity.</strong> Google and GitHub process the identity details needed when you choose those sign-in methods.
    </>,
    <>
      <strong>Delivery.</strong> Cloudflare may process technical request and security data where its network services are enabled.
    </>,
  ],
};

const customerReview: CloudLegalSection = {
  id: "customer-review",
  number: "03",
  title: "Before placing sensitive data",
  summary: "Confirm which providers and regions apply to your account and chosen service.",
  points: [
    "Confirm whether your business is using Hosted or BYO and which account, sign-in and payment features are enabled.",
    "Check the current region and configuration before placing regulated or sensitive data in an early-access environment.",
    <>
      {/* CHANGED: URL — Hub legal paths */}
      Read the{" "}
      <Link to={elsaCloudLegalPath("privacy")} className="text-primary hover:underline">
        Privacy Notice
      </Link>{" "}
      and{" "}
      <Link to={elsaCloudLegalPath("dpa")} className="text-primary hover:underline">
        Hosted DPA
      </Link>{" "}
      alongside your own privacy documentation.
    </>,
  ],
};

export default function CloudLegalSubprocessors() {
  return (
    <CloudLegalDocument
      id="subprocessors"
      name="Subprocessor list"
      navLabel="Subprocessor navigation"
      meta={{
        /* CHANGED: site name and URL — Elsa Cloud subprocessors on Elsa Hub */
        title: "Subprocessors — Elsa Cloud — Elsa+",
        description:
          "Current providers used for Elsa Cloud Preview hosting, application services, payments, authentication and site delivery.",
        path: elsaCloudLegalPath("subprocessors"),
      }}
      hero={{
        eyebrow: "Updated 14 September 2026",
        title: "Service providers and subprocessors",
        lede: "The providers used for Elsa Cloud hosting, application services, payment, authentication and site delivery.",
        note: "A provider's role depends on whether you use Hosted or BYO Azure and which sign-in or payment features you choose.",
        factsLabel: "Subprocessor categories",
        facts: [
          { label: "Hosted", value: "Azure infrastructure" },
          { label: "Application", value: "Supabase and Lovable" },
          { label: "Payments", value: "Stripe" },
          {
            label: "Identity",
            value: (
              <>
                {/* CHANGED: account/sign-in wording — Hub identity is Google or GitHub, not Microsoft */}
                Google or GitHub
              </>
            ),
          },
        ],
      }}
      intro={{
        eyebrow: "Current provider list",
        title: "Current provider list",
        body: (
          <>
            {/* CHANGED: site name — Elsa Cloud Preview on Elsa Hub */}
            This page names the providers used by Elsa Cloud Preview on Elsa Hub and describes the data involved in each role. Read it with the Privacy Notice and Hosted Data Processing Addendum.
          </>
        ),
        caveat:
          "A provider listed here may process only the data needed for its role. The exact data flow depends on whether you use Hosted or BYO and which features are enabled.",
      }}
      nav={[
        { href: "#providers", label: "Current list" },
        { href: "#data-boundary", label: "Data boundary" },
        { href: "#customer-review", label: "Customer review" },
      ]}
      related={[
        /* CHANGED: URL — Hub legal paths */
        { href: elsaCloudLegalPath("privacy"), label: "Privacy notice" },
        { href: elsaCloudLegalPath("dpa"), label: "Hosted DPA" },
      ]}
      contact={{
        eyebrow: "Provider questions",
        title: "Questions about a provider",
        body: "If you need to understand how the current provider list maps to your Preview setup, email hello@valence.works.",
        related: { label: "Read the privacy notice", to: elsaCloudLegalPath("privacy") },
      }}
    >
      <CloudLegalSectionArticle section={currentList} label="Subprocessors" />
      <CloudLegalSectionArticle section={dataBoundary} label="Data boundary" />
      <CloudLegalSectionArticle section={customerReview} label="Customer review" />
    </CloudLegalDocument>
  );
}
