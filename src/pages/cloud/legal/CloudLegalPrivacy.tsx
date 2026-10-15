import CloudLegalDocument from "./CloudLegalDocument";
import { elsaCloudLegalPath } from "@/lib/elsaCloud";

const privacySections = [
  {
    id: "controller-and-scope",
    number: "01",
    title: "Controller and scope",
    summary: "Who is responsible for this notice and which Elsa Cloud services it covers.",
    points: [
      "The controller for this notice is Skywalker Digital B.V., registered with the Dutch Chamber of Commerce under KvK 88244520 and trading as Valence Works.",
      <>
        {/* CHANGED: site name — public Elsa Cloud site is now Elsa Cloud pages on Elsa Hub */}
        This notice covers the Elsa Cloud pages on Elsa Hub, account and workspace interactions, the Hosted Preview and the BYO software path. It does not replace your own privacy notice for people whose data you place in your workflows.
      </>,
      "Questions about personal data can be sent to hello@valence.works.",
    ],
  },
  {
    id: "data-we-process",
    number: "02",
    title: "Data we process",
    summary: "The account, contact, payment, operational and customer-content data involved in Elsa Cloud.",
    points: [
      "Account and contact details, such as your name, business email address, organisation, workspace information and anything you submit with a BYO Azure waitlist request.",
      <>
        {/* CHANGED: account/sign-in wording — Hub uses Google, GitHub or email, not Microsoft Entra */}
        Authentication information from Google, GitHub or email authentication when used for sign-in, including the identity information needed to recognise your account and workspace access.
      </>,
      "Billing and payment status connected with your subscription. Stripe processes payment details for checkout and billing on our behalf.",
      "Operational information, such as service events, support correspondence and diagnostic details needed to operate and support the Preview.",
      "For Hosted, customer content may include workflow definitions, workflow data and other information your business chooses to place in its environment. We do not need this content for a BYO environment that you run in your own Azure subscription.",
    ],
  },
  {
    id: "how-we-use-data",
    number: "03",
    title: "How we use data",
    summary: "Why we use personal data and the legal bases that apply.",
    points: [
      "We use account and workspace information to create access, administer subscriptions and communicate with your business about the service.",
      "We use payment information and status to process subscriptions, identify failed payments and manage account access.",
      "We use operational and support information to troubleshoot, maintain and improve the Preview, and to investigate security or misuse where needed.",
      "We process data to take steps at your request and perform our contract, comply with legal obligations, and pursue our legitimate interests in operating, securing and improving the service. Where the law requires consent, we ask for it separately.",
      "For Hosted customer content, your business generally acts as controller and Valence Works acts as processor under the Hosted DPA. We use that content only on your instructions and as needed to provide, operate or support Hosted. We do not sell personal data.",
    ],
  },
  {
    id: "providers",
    number: "04",
    title: "Service providers",
    summary: "The providers used for hosting, application services, payment, authentication and delivery.",
    points: [
      "Microsoft Azure hosts Elsa Cloud Hosted customer workloads in West Europe during Preview. For BYO, your business selects and operates its own Azure environment.",
      "Supabase provides application database, authentication and edge-function services for account records, waitlist submissions, checkout coordination and the Elsa Cloud dashboard.",
      "Stripe processes payment details and returns payment or billing status connected with your subscription.",
      <>
        {/* CHANGED: account/sign-in wording — Hub federated sign-in is Google and GitHub; email uses a password or magic link */}
        Google and GitHub support federated authentication when you choose those sign-in methods. Email sign-in uses a password or a magic link.
      </>,
      <>
        {/* CHANGED: site name — Lovable hosts Elsa Hub rather than the standalone Elsa Cloud site */}
        Lovable hosts and deploys Elsa Hub, including the Elsa Cloud pages and application interface.
      </>,
      "Cloudflare may support delivery, DNS or network protection features where enabled for the site or service. See the current Subprocessors page for the provider list and roles.",
    ],
  },
  {
    id: "hosted-and-byo",
    number: "05",
    title: "Hosted, BYO and EU residency intent",
    summary: "How Hosted and BYO Azure differ, including the current EU hosting intention.",
    points: [
      "Hosted customer workloads run in Microsoft Azure West Europe, within the EU/EEA, during Preview. Account, payment, authentication, support and delivery providers may process data in other locations as described on the Subprocessors page.",
      "With BYO, your business controls the Azure subscription, region, configuration and content in that environment. This notice describes the Elsa Cloud software interaction; your organisation remains responsible for its own Azure setup and data practices.",
      "If a provider processes personal data outside the EU/EEA, we use an available lawful transfer mechanism, such as an adequacy decision or approved standard contractual clauses, where required.",
      "Before placing regulated or sensitive data in a Preview environment, review the current configuration and provider information with your own advisers.",
    ],
  },
  {
    id: "retention-and-security",
    number: "06",
    title: "Retention and security",
    summary: "How long we keep different records and how we protect them.",
    points: [
      "After Hosted access ends or an account is cancelled, we retain Hosted customer content for up to 30 days to allow export, then delete it unless a longer period is required by law or agreed for the account.",
      "We retain account, billing and operational records for as long as needed to provide the service, handle support, resolve disputes or meet legal obligations. The appropriate period depends on the record and context.",
      "We use access controls and operational safeguards appropriate to the Preview and review those controls as the service changes.",
    ],
  },
  {
    id: "rights-and-choices",
    number: "07",
    title: "Your choices and rights",
    summary: "How to exercise applicable data-protection rights or raise a concern.",
    points: [
      "Depending on your location and circumstances, you may have rights to access, correct, delete, restrict or object to processing, and to receive a copy of certain personal data.",
      "Send a request to hello@valence.works with enough context for us to identify the relevant account. We may need to verify the request before responding.",
      "If you are not satisfied with our response, applicable data-protection law may give you the option to contact your local supervisory authority.",
    ],
  },
];

export default function CloudLegalPrivacy() {
  return (
    <CloudLegalDocument
      id="privacy"
      name="Privacy Notice"
      navLabel="Privacy navigation"
      meta={{
        /* CHANGED: site name, URL, and account/sign-in wording */
        title: "Privacy Notice — Elsa Cloud — Elsa+",
        description:
          "Privacy Notice for Elsa Cloud Preview on Elsa Hub, including Hosted and BYO processing, Stripe payments and Hub sign-in (Google, GitHub or email).",
        path: elsaCloudLegalPath("privacy"),
      }}
      hero={{
        eyebrow: "Public notice · Early access",
        title: "Privacy Notice",
        lede: (
          <>
            {/* CHANGED: site name — Elsa Cloud now lives on Elsa Hub */}
            How Valence Works handles personal data for Elsa Cloud on Elsa Hub, accounts, payments and Hosted service.
          </>
        ),
        note: "Updated 14 September 2026. Elsa Cloud is in early access. Review the current configuration and provider roles before placing sensitive data in a Preview environment.",
        factsLabel: "Privacy scope",
        facts: [
          { label: "Account", value: "Workspace and access" },
          { label: "Payments", value: "Stripe checkout" },
          {
            label: "Identity",
            value: (
              <>
                {/* CHANGED: account/sign-in wording — Hub identity is Google, GitHub or email, not Microsoft Entra */}
                Google, GitHub or email
              </>
            ),
          },
          { label: "Hosting", value: "Hosted or BYO" },
        ],
      }}
      intro={{
        eyebrow: "Read this first",
        title: "Who handles which data",
        body: (
          <>
            {/* CHANGED: site name — scoped to Elsa Cloud accounts on Elsa Hub */}
            This notice covers your Elsa Cloud business account on Elsa Hub, the providers used to run Elsa Cloud, and the difference between a Valence-operated Hosted environment and software used in your own Azure environment.
          </>
        ),
        caveat:
          "We do not sell personal data. We process Hosted customer content only as needed to provide, operate or support the service, or when your business asks us to.",
      }}
      sections={privacySections}
      related={[
        /* CHANGED: URL — Hub legal paths */
        { href: elsaCloudLegalPath("subprocessors"), label: "Subprocessors" },
        { href: elsaCloudLegalPath("dpa"), label: "Hosted DPA" },
      ]}
      contact={{
        eyebrow: "Privacy questions",
        title: "Ask us directly",
        body: (
          <>
            {/* CHANGED: account/sign-in wording — Hub sign-in replaces Microsoft Entra in this contact line */}
            For a privacy request or a question about Hosted, BYO, Stripe, Hub sign-in or the current EU/EEA hosting intention, email hello@valence.works.
          </>
        ),
        related: { label: "See subprocessors", to: elsaCloudLegalPath("subprocessors") },
      }}
    />
  );
}
