import { CLOUD_DPA_PATH as HUB_DPA_URL, CLOUD_SUBPROCESSORS_PATH as HUB_SUBPROCESSORS_URL } from "./cloudDpa";

export const CLOUD_PRIVACY_PATH = "/legal/privacy";

export const CLOUD_PRIVACY_SECTIONS = [
  {
    id: "controller-and-scope",
    number: "01",
    title: "Controller and scope",
    summary: "Who is responsible for this notice and which Elsa Cloud services it covers.",
    points: [
      "The controller for this notice is Skywalker Digital B.V., registered with the Dutch Chamber of Commerce under KvK 88244520 and trading as Valence Works.",
      "This notice covers the public Elsa Cloud site, Elsa Hub accounts and organisations at elsaworkflows.io used for Elsa Cloud, account and workspace interactions, the Hosted Preview and the BYO software path. It does not replace your own privacy notice for people whose data you place in your workflows.",
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
      "Authentication information from Microsoft Entra, Google, GitHub or Supabase email authentication when used for sign-in, including the identity information needed to recognise your account and workspace access.",
      "Billing and payment status connected with your subscription. Stripe processes payment details for checkout and billing on our behalf.",
      "Operational information, such as service events, support correspondence and diagnostic details needed to operate and support the Preview.",
      "For Hosted, customer content may include workflow definitions, workflow data and other information your business chooses to place in its environment. We do not need this content for a BYO environment that you run in your own Azure subscription.",
    ],
  },
  {
    id: "hub-accounts",
    number: "03",
    title: "Elsa Hub accounts, organisations and invitations",
    summary: "What we process when you use Elsa Hub to manage your account, your organisation and the people you invite.",
    points: [
      "Skywalker Digital B.V. (trading as Valence Works) is the controller for Elsa Hub account, organisation membership and invitation data. This also applies when your business manages members through Elsa Hub: we decide how this data is used to run the accounts, so we act as an independent controller for it, not as your processor. Workflow data in a Hosted environment is different and is covered by the Data Processing Agreement.",
      "Account data: name, email address and sign-in identities (email sign-in, or Google or GitHub when you choose them). Organisation data: organisation name, members and their roles, and whether the organisation is linked to Elsa Cloud. Invitation data: who sent an invitation, the invitee's email address, the organisation and role, the invitation status and timestamps. Billing data: billing contact and subscription status for the organisation, processed through Stripe. We also process the invitation and notification emails we send.",
      "We use account, organisation and billing data to provide Elsa Hub and Elsa Cloud under our contract with you (GDPR Art. 6(1)(b)). We use an invitee's email address to send the invitation an organisation asked us to send and to let them join, based on our legitimate interest and that of the inviting organisation in letting businesses add their own people (Art. 6(1)(f)); once the invitee accepts, the contract basis applies. We keep records needed for tax and accounting to meet legal obligations (Art. 6(1)(c)). We do not use invitation data for marketing.",
      "Owners and administrators of an organisation can see its members, roles and invitations. Our service providers process this data for us: Supabase (database, sign-in and server functions; database in the EU, Ireland), Stripe (billing), Lovable and Cloudflare (website hosting and delivery), Resend (sending invitation and notification emails), and Google or GitHub only if you sign in with them. The current list, with locations and transfer mechanisms, is in Annex III Part B of the Data Processing Agreement.",
      "Some of these providers are in the US. Where personal data leaves the EU/EEA, we rely on the EU-US Data Privacy Framework or the EU Standard Contractual Clauses, as listed in that annex.",
      "We keep account and organisation data while the account or organisation exists, and delete or anonymise it within 30 days after it is closed. When someone is removed from an organisation, their membership record is deleted immediately; their own account is not affected. Pending invitations expire after 7 days. Expired, revoked or declined invitations are deleted within 30 days. Billing records are kept for 7 years, as Dutch tax law requires.",
      "If you were invited and do not want to join, you can ignore the email or ask us to delete the invitation at hello@valence.works. You have the same rights as account holders, described under Your choices and rights.",
    ],
  },
  {
    id: "how-we-use-data",
    number: "04",
    title: "How we use data",
    summary: "Why we use personal data and the legal bases that apply.",
    points: [
      "We use account and workspace information to create access, administer subscriptions and communicate with your business about the service.",
      "We use payment information and status to process subscriptions, identify failed payments and manage account access.",
      "We use operational and support information to troubleshoot, maintain and improve the Preview, and to investigate security or misuse where needed.",
      "We process data to take steps at your request and perform our contract, comply with legal obligations, and pursue our legitimate interests in operating, securing and improving the service. Where the law requires consent, we ask for it separately.",
      "For Hosted customer content, your business generally acts as controller and Valence Works acts as processor under the Data Processing Agreement. We use that content only on your instructions and as needed to provide, operate or support Hosted. We do not sell personal data.",
    ],
  },
  {
    id: "providers",
    number: "05",
    title: "Service providers",
    summary: "The providers used for hosting, application services, payment, authentication and delivery.",
    points: [
      "Microsoft Azure hosts Elsa Cloud Hosted customer workloads in West Europe during Preview. For BYO, your business selects and operates its own Azure environment.",
      "Supabase provides application database, authentication and edge-function services for account records, waitlist submissions, checkout coordination and the Elsa Cloud dashboard.",
      "Stripe processes payment details and returns payment or billing status connected with your subscription.",
      "Microsoft Entra, Google and GitHub support federated authentication when you choose those sign-in methods.",
      "Resend sends service emails, such as organisation invitations and notifications, on our behalf.",
      "Lovable hosts and deploys the public website and application interface.",
      "Cloudflare may support delivery, DNS or network protection features where enabled for the site or service. See the current sub-processor list on Elsa Hub for the provider list and roles.",
    ],
  },
  {
    id: "hosted-and-byo",
    number: "06",
    title: "Hosted, BYO and EU residency intent",
    summary: "How Hosted and BYO Azure differ, including the current EU hosting intention.",
    points: [
      "Hosted customer workloads run in Microsoft Azure West Europe, within the EU/EEA, during Preview. Account, payment, authentication, support and delivery providers may process data in other locations as described in the sub-processor list on Elsa Hub.",
      "With BYO, your business controls the Azure subscription, region, configuration and content in that environment. This notice describes the Elsa Cloud software interaction; your organisation remains responsible for its own Azure setup and data practices.",
      "If a provider processes personal data outside the EU/EEA, we use an available lawful transfer mechanism, such as an adequacy decision or approved standard contractual clauses, where required.",
      "Before placing regulated or sensitive data in a Preview environment, review the current configuration and provider information with your own advisers.",
    ],
  },
  {
    id: "retention-and-security",
    number: "07",
    title: "Retention and security",
    summary: "How long we keep different records and how we protect them.",
    points: [
      "After Hosted access ends or an account is cancelled, we retain Hosted customer content for up to 30 days to allow export, then delete it unless a longer period is required by law or agreed for the account.",
      "We retain account, billing and operational records for as long as needed to provide the service, handle support, resolve disputes or meet legal obligations. Elsa Hub account, organisation and invitation periods are described in section 03.",
      "We use access controls and operational safeguards appropriate to the Preview and review those controls as the service changes.",
    ],
  },
  {
    id: "rights-and-choices",
    number: "08",
    title: "Your choices and rights",
    summary: "How to exercise applicable data-protection rights or raise a concern.",
    points: [
      "Depending on your location and circumstances, you may have rights to access, correct, delete, restrict or object to processing, and to receive a copy of certain personal data (portability). Where we rely on legitimate interests, you can object at any time.",
      "Send a request to hello@valence.works with enough context for us to identify the relevant account, organisation or invitation. We may need to verify the request before responding. We answer within one month.",
      "If you are not satisfied with our response, you can complain to a supervisory authority. In the Netherlands this is the Autoriteit Persoonsgegevens (autoriteitpersoonsgegevens.nl).",
    ],
  },
];

export const CLOUD_PRIVACY_PAGE = {
  id: "privacy",
  name: "Privacy Notice",
  navLabel: "Privacy navigation",
  meta: {
    title: "Privacy Notice — Elsa Cloud",
    description: "Privacy Notice for Elsa Cloud Preview, including Elsa Hub accounts and organisation invitations, Hosted and BYO processing, Stripe payments and sign-in providers.",
    path: CLOUD_PRIVACY_PATH,
  },
  hero: {
    eyebrow: "Public notice · Early access",
    title: "Privacy Notice",
    lede: "How Valence Works handles personal data for the Elsa Cloud site, Elsa Hub accounts and organisations, payments and the Hosted service.",
    note: "Updated 30 October 2026. Elsa Cloud is in early access. Review the current configuration and provider roles before placing sensitive data in a Preview environment.",
    factsLabel: "Privacy scope",
    facts: [
      { label: "Account", value: "Workspace and access" },
      { label: "Payments", value: "Stripe checkout" },
      { label: "Identity", value: "Microsoft Entra" },
      { label: "Hosting", value: "Hosted or BYO" },
    ],
  },
  intro: {
    eyebrow: "Read this first",
    title: "Who handles which data",
    body: "This notice covers your business account, Elsa Hub accounts, organisations and invitations, the providers used to run Elsa Cloud, and the difference between a Valence-operated Hosted environment and software used in your own Azure environment.",
    caveat: "We do not sell personal data. We process Hosted customer content only as needed to provide, operate or support the service, or when your business asks us to.",
  },
  related: [
    { href: HUB_SUBPROCESSORS_URL, label: "Subprocessors" },
    { href: HUB_DPA_URL, label: "Data Processing Agreement" },
  ],
  contact: {
    eyebrow: "Privacy questions",
    title: "Ask us directly",
    body: "For a privacy request or a question about Elsa Hub accounts, Hosted, BYO, Stripe, sign-in or the current EU/EEA hosting intention, email hello@valence.works.",
    related: { label: "See subprocessors", to: HUB_SUBPROCESSORS_URL },
  },
};
