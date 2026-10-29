/**
 * Elsa Cloud Data Processing Agreement (/legal/dpa) and the Elsa Cloud
 * sub-processor list (/legal/subprocessors), which is Annex III of the DPA.
 *
 * Source: Elsa Cloud DPA draft v2.2 (29 October 2026). Drafting notes,
 * internal notes and counsel markers are removed; otherwise the wording is
 * verbatim, except "Skywalker Digital B.V." is written "Skywalker Digital BV"
 * to match the Cloud and Academy terms. Do not edit this text without
 * Sipke's approval; it is customer-facing legal copy.
 *
 * Body strings are Markdown (GFM), rendered with react-markdown.
 */

export const CLOUD_DPA_PATH = "/legal/dpa";
export const CLOUD_SUBPROCESSORS_PATH = "/legal/subprocessors";

export const CLOUD_DPA_TITLE = "Elsa Cloud Data Processing Agreement";
export const CLOUD_DPA_DESCRIPTION =
  "The data processing agreement (GDPR Article 28) for Elsa Cloud Hosted, operated by Valence Works.";
export const CLOUD_DPA_VERSION = "Version 1.0, effective on the date of publication";
export const CLOUD_SUBPROCESSORS_TITLE = "Elsa Cloud Sub-processors";
export const CLOUD_SUBPROCESSORS_DESCRIPTION =
  "The sub-processors and service providers Valence Works uses for Elsa Cloud, as listed in Annex III of the Elsa Cloud DPA.";

export interface CloudDpaSection {
  id: string;
  title: string;
  body: string;
}

/** Preamble and parties table. */
export const CLOUD_DPA_INTRO = `This Data Processing Agreement ("DPA") forms part of the agreement between the customer ("Customer", "you") and Skywalker Digital BV, trading as Valence Works ("Valence Works", "we", "us"), for the Elsa Cloud service. It sets out how we process personal data on your behalf, as Article 28 of the EU General Data Protection Regulation (GDPR) requires.

This DPA is the official data processing agreement for Elsa Cloud. It replaces the Data Processing Addendum previously published at elsacloud.app/dpa (effective 14 September 2026) from the date shown above.

| | |
|---|---|
| **Processor** | Skywalker Digital BV, trading as Valence Works. Meervelderweg 72, 3888 NK Uddel, the Netherlands. Chamber of Commerce (KvK) 88244520. VAT NL864551484B01. |
| **Privacy contact** | hello@valence.works |
| **Controller** | The Customer named in the order, account or checkout for Elsa Cloud. |`;

export const CLOUD_DPA_SECTIONS: CloudDpaSection[] = [
  {
    id: "section-1",
    title: "1. Definitions",
    body: `1.1 **Agreement** means the Elsa Cloud Early Access Terms published at https://www.elsaworkflows.io/legal/cloud-terms and any order or subscription made under them.

1.2 **Customer Personal Data** means personal data that you or your users place in or generate through your Hosted environment, and that we process on your behalf to provide the Service.

1.3 **Hosted environment** means the dedicated Elsa Workflows engine, with its database and supporting resources, that we run for you in Microsoft Azure as part of Elsa Cloud Hosted.

1.4 **Control plane** means the systems we use to sell, provision, configure, update, monitor and delete Hosted environments (Elsa Control and its supporting services). The control plane holds account, organisation, billing and lifecycle metadata about your environments. It does not hold the workflow content of a Hosted environment.

1.5 **Service** means Elsa Cloud Hosted as described in the Agreement.

1.6 **Sub-processor** means a third party we engage that processes Customer Personal Data on our behalf.

1.7 **Personal Data Breach**, **personal data**, **processing**, **data subject**, **controller**, **processor** and **supervisory authority** have the meanings given in the GDPR.

1.8 **Data Protection Law** means the GDPR, the Dutch GDPR Implementation Act (Uitvoeringswet AVG) and any other EU or Member State data-protection law that applies to the processing.`,
  },
  {
    id: "section-2",
    title: "2. Scope and roles",
    body: `2.1 This DPA applies to Customer Personal Data processed in the Hosted environment. You are the controller of that data and we are your processor.

2.2 This DPA does not apply to:

- (a) data we process as a controller to run our business, such as your account, sign-in, organisation membership, billing and support records. Our Privacy Notice at https://elsacloud.app/privacy covers that processing until it moves to Elsa Hub; and
- (b) Bring Your Own Azure ("BYO") environments. In BYO you run Elsa in your own Azure subscription and choose its region, configuration and content, and we do not host that data.

2.3 Annex I describes the processing: its subject matter, duration, nature and purpose, the types of personal data and the categories of data subjects.`,
  },
  {
    id: "section-3",
    title: "3. Your instructions",
    body: `3.1 We process Customer Personal Data only on your documented instructions, unless EU or Member State law requires otherwise. If it does, we will tell you about that legal requirement before processing, unless the law prohibits us from telling you.

3.2 Your documented instructions are: this DPA and the Agreement, your use and configuration of the Service, and any written support request you send us. Further instructions must be in writing and consistent with the Service. If an instruction needs work outside the Service as offered, we may charge for it or decline it.

3.3 We will tell you promptly if we believe an instruction infringes Data Protection Law. We may suspend that instruction until you confirm or change it.

3.4 We will not use Customer Personal Data for any other purpose, sell it, or use it to train machine-learning models.

3.5 You are responsible for having a lawful basis for the processing, for giving the notices your data subjects need, and for the accuracy and lawfulness of the data you place in the Service.`,
  },
  {
    id: "section-4",
    title: "4. Confidentiality",
    body: `4.1 We make sure that everyone we authorise to process Customer Personal Data is bound by a duty of confidentiality, by contract or by law, and only accesses it as needed to provide, secure or support the Service.

4.2 We use automated tools, including AI-assisted coding and deployment agents, to develop and operate the control plane. These tools are not given access to Customer Personal Data (see Annex II, section 9).`,
  },
  {
    id: "section-5",
    title: "5. Security",
    body: `5.1 We implement the technical and organisational measures in Annex II to protect Customer Personal Data, as Article 32 GDPR requires. These measures take into account the state of the art, the cost of implementation, and the nature, scope, context and purposes of the processing, as well as the risks to data subjects.

5.2 We may update these measures as the Service develops, provided the overall level of protection is not reduced.

5.3 You are responsible for the security of how you use the Service, including managing your users, their access rights and their credentials, and for not placing data in the Service that it is not designed to receive (see Annex I, special categories).`,
  },
  {
    id: "section-6",
    title: "6. Sub-processors",
    body: `6.1 You give us general written authorisation to engage Sub-processors. The Sub-processors in use on the date of this DPA are listed in Annex III and on our sub-processor page at https://www.elsaworkflows.io/legal/subprocessors.

6.2 We will give you at least 30 days' notice before we add or replace a Sub-processor. We give notice by updating the sub-processor page and emailing the owners of your organisation on Elsa Hub.

6.3 You may object to a change on reasonable data-protection grounds by writing to us within the notice period. We will then work with you in good faith to find a solution. If we cannot resolve the objection before the change takes effect, you may end the affected part of the Service before the change takes effect, and we will refund, on a pro-rata basis, any fees you prepaid for the period after termination.

6.4 We put a written contract in place with each Sub-processor that imposes data-protection obligations providing at least the same level of protection as this DPA. We remain liable to you for the performance of our Sub-processors' obligations, as Article 28(4) GDPR requires.

6.5 In an emergency that threatens the security or availability of the Service, we may replace a Sub-processor at shorter notice. We will tell you as soon as reasonably possible, and you keep your right to object under section 6.3.`,
  },
  {
    id: "section-7",
    title: "7. Helping you with data subject requests",
    body: `7.1 Taking into account the nature of the processing, we will help you, through appropriate technical and organisational measures where possible, to respond to requests from data subjects exercising their GDPR rights (access, rectification, erasure, restriction, portability and objection).

7.2 In the first place, you can handle these requests yourself through the Service, for example by reading, changing, exporting or deleting workflow data in your Hosted environment. If you need more help, contact us and we will assist within a reasonable time.

7.3 If a data subject contacts us directly about Customer Personal Data, we will not respond on the substance. We will pass the request to you without undue delay, unless the law requires otherwise.`,
  },
  {
    id: "section-8",
    title: "8. Personal Data Breaches",
    body: `8.1 We will notify you without undue delay, and in any case within 48 hours, after becoming aware of a Personal Data Breach affecting Customer Personal Data.

8.2 We will send the notice by email to the owners of your organisation on Elsa Hub. As far as the information is available, it will describe the nature of the breach, the categories and approximate number of data subjects and records concerned, the likely consequences, and the measures taken or proposed to address the breach and limit its effects. Where we cannot give all of this at once, we will provide it in stages without further undue delay.

8.3 We will take reasonable steps to contain, investigate and remedy the breach, and will cooperate with you so you can meet your obligations under Articles 33 and 34 GDPR.

8.4 You decide whether to notify a supervisory authority or data subjects. Our notification of a breach is not an admission of fault or liability.`,
  },
  {
    id: "section-9",
    title: "9. Impact assessments and prior consultation",
    body: `9.1 Taking into account the nature of the processing and the information available to us, we will give you reasonable help with any data protection impact assessment and any prior consultation with a supervisory authority that you are required to carry out in relation to the Service (Articles 35 and 36 GDPR). We may charge a reasonable fee for help beyond the information in this DPA and our published documentation.`,
  },
  {
    id: "section-10",
    title: "10. Deletion and return at the end of the Service",
    body: `10.1 You can delete your Hosted environment yourself at any time with the "Delete engine" action in the Elsa Cloud section of Elsa Hub. Deleting an environment removes its engine, database, secrets and logs.

10.2 When your Hosted subscription ends or your account is cancelled, we keep Customer Personal Data for up to 30 days so you can export it, where the Service supports export. After that we delete it, unless you ask us to delete it sooner, we agree otherwise in writing, or EU or Member State law requires us to keep it.

10.3 Database backups held for recovery are deleted together with the Hosted environment. We do not keep long-term backup copies of Hosted databases.

10.4 On written request, we will confirm in writing that deletion has taken place.`,
  },
  {
    id: "section-11",
    title: "11. Information and audits",
    body: `11.1 We will make available to you the information reasonably necessary to demonstrate our compliance with Article 28 GDPR and this DPA, for example this DPA, Annex II and answers to reasonable security questionnaires.

11.2 If that information is not enough to show compliance, or a supervisory authority requires it, you may audit our compliance, either yourself or through an independent auditor bound by confidentiality, no more than once in any 12-month period unless a Personal Data Breach or an authority requires otherwise. You must give at least 30 days' written notice. We will agree scope, timing and safeguards beforehand, so that the audit does not disrupt the Service, put other customers' data at risk, or give access to infrastructure shared with other customers or run by our Sub-processors.

11.3 You bear the costs of the audit, unless the audit shows a material breach of this DPA by us, in which case we bear our own costs and reimburse your reasonable audit costs.

11.4 For Sub-processor infrastructure such as Microsoft Azure, we may meet audit requests by providing the Sub-processor's current independent audit reports or certifications.`,
  },
  {
    id: "section-12",
    title: "12. Data location and international transfers",
    body: `12.1 Hosted environments, including their databases, backups, secrets and logs, are hosted in Microsoft Azure in an EU/EEA region. We do not move a Hosted environment outside the EU/EEA without your instruction. Annex I states the region used at the date of this DPA.

12.2 Some Sub-processors, or their own sub-processors and support staff, may access personal data from outside the EU/EEA. Where that is a transfer to a country without an adequacy decision, we make sure an appropriate safeguard under Chapter V GDPR is in place, such as the EU Standard Contractual Clauses (Commission Implementing Decision (EU) 2021/914) or certification under the EU-US Data Privacy Framework. Annex III states the mechanism for each Sub-processor.`,
  },
  {
    id: "section-13",
    title: "13. Liability",
    body: `13.1 Each party's liability under or in connection with this DPA is subject to the limitations and exclusions of liability in the Agreement, including the cap on liability of the fees paid in the 12 months before the event giving rise to the claim. This DPA and the Agreement share that single cap; this DPA does not create a separate one.

13.2 Nothing in this DPA limits either party's liability to data subjects under Article 82 GDPR or to a supervisory authority, or any liability that cannot be limited under applicable law.`,
  },
  {
    id: "section-14",
    title: "14. Term, precedence and changes",
    body: `14.1 This DPA applies for as long as we process Customer Personal Data for you, including the deletion period in section 10.

14.2 If this DPA conflicts with the Agreement on the processing of Customer Personal Data, this DPA prevails.

14.3 We may update this DPA to reflect changes in law, guidance from supervisory authorities or changes in the Service. We will give you at least 30 days' notice of any change that materially reduces your protection, and you may object in the same way as in section 6.3.`,
  },
  {
    id: "section-15",
    title: "15. Governing law and jurisdiction",
    body: `15.1 This DPA is governed by Dutch law. Disputes are submitted to the competent court, being the District Court of Gelderland (Rechtbank Gelderland), the Netherlands, without affecting any mandatory rights the Customer or data subjects have under Data Protection Law.`,
  },
];

/** Annex III Part A: sub-processors in the Hosted environment. */
export const CLOUD_SUBPROCESSORS_PART_A = `**Part A: Sub-processors that process Customer Personal Data in the Hosted environment**

| Sub-processor | Purpose | Personal data | Location | Transfer mechanism |
|---|---|---|---|---|
| Microsoft Azure (Microsoft Ireland Operations Limited) | Hosting of the dedicated engine, database, secret store, logs and backups; the Elsa Control control plane that provisions and manages environments | All Customer Personal Data in Annex I | An EU/EEA region. Current practice: Hosted environments run in West Europe (Netherlands) by default; North Europe (Ireland) and Sweden Central (Sweden) are also supported. Control plane: Belgium Central (Belgium). | Data stored in the EU. For any access from outside the EU/EEA by Microsoft support or engineering: the EU Standard Contractual Clauses in the Microsoft Products and Services Data Protection Addendum and the EU-US Data Privacy Framework, together with Microsoft's EU Data Boundary commitments. |

No other provider processes Customer Personal Data in the Hosted environment. This includes the providers of the AI-assisted tools described in Annex II section 9: those tools have no access to Hosted environments and do not receive Customer Personal Data.`;

/** Annex III Part B: controller-side providers, listed for information. */
export const CLOUD_SUBPROCESSORS_PART_B = `**Part B: Service providers for accounts, sign-in and billing (for information)**

We use these providers to run Elsa Hub accounts and billing for Elsa Cloud. We act as a controller for this data under our Privacy Notice, not as your processor. This includes organisation membership and invitation data that you manage through Elsa Hub, for which we act as an independent controller. We list them here for transparency.

| Provider | Purpose | Personal data | Location | Transfer mechanism |
|---|---|---|---|---|
| Supabase, Inc. | Elsa Hub database, sign-in and server functions, including the connection between Elsa Hub and Elsa Cloud | Account and organisation data: name, email address, sign-in identities, organisation membership, Elsa Cloud link status | Database in AWS eu-west-1 (Ireland). Server functions run at edge locations worldwide, usually near the user. | EU Standard Contractual Clauses in the Supabase DPA |
| Stripe (Stripe Payments Europe, Limited, Ireland) | Checkout, subscriptions and invoices | Billing contact, email address, billing address, payment details (Stripe collects card data; we never see full card numbers), subscription status | EU and US | EU-US Data Privacy Framework (Stripe, LLC), with EU Standard Contractual Clauses as fallback, under the Stripe DPA |
| Lovable (Lovable Labs Incorporated, US) | Hosting and deployment of the Elsa Hub website and dashboard | Technical request data such as IP address and browser details | US company; the site is served through Cloudflare's global network | EU Standard Contractual Clauses in the Lovable DPA |
| Cloudflare, Inc. | Content delivery and network protection for the Elsa Hub website, through its hosting provider | Technical request data such as IP address | Global network | EU-US Data Privacy Framework and EU Standard Contractual Clauses |
| Resend (Plus Five Five, Inc., US) | Sending service emails, such as organisation invitations and notifications | Recipient name and email address, email content | US | EU-US Data Privacy Framework and EU Standard Contractual Clauses in the Resend DPA |
| Google (Google LLC) | Optional sign-in with Google | Name, email address and account identifier from Google | Global | EU-US Data Privacy Framework |
| GitHub, Inc. | Optional sign-in with GitHub | User name, email address and account identifier from GitHub | US | EU-US Data Privacy Framework |
| Microsoft Entra ID (Microsoft Ireland Operations Limited). **Transitional.** | Sign-in with Microsoft on elsacloud.app only (not offered on Elsa Hub) | Name, email address and account identifier from Microsoft | EU and US | EU Standard Contractual Clauses and EU-US Data Privacy Framework, in the Microsoft Products and Services DPA |`;

/** Annex III: note on the transitional Microsoft Entra ID entry. */
export const CLOUD_SUBPROCESSORS_TRANSITIONAL_NOTE = `*Transitional entry:* Microsoft Entra ID is listed only while sign-in on elsacloud.app is still available. We will remove this entry when that sign-in is retired, and the removal takes effect on that date. Removing a provider does not need the notice in section 6.2. This entry is about customer sign-in only. Microsoft Entra ID is also part of Microsoft Azure's access control in Part A, and it stays there.`;

export const CLOUD_DPA_ANNEXES: CloudDpaSection[] = [
  {
    id: "annex-i",
    title: "Annex I: Description of the processing",
    body: `| Item | Description |
|---|---|
| **Subject matter** | Hosting, running, securing, maintaining and supporting a dedicated Elsa Workflows engine for the Customer (Elsa Cloud Hosted). |
| **Duration** | For the term of the Hosted subscription, plus up to 30 days after it ends for export and deletion (section 10). |
| **Nature of processing** | Storage, hosting, computation (running the Customer's workflows), backup and restore, logging and monitoring, deletion, and access by our support staff when needed to support or secure the Service. |
| **Purpose** | Providing the Service under the Agreement, keeping it secure and available, and supporting the Customer. |
| **Categories of data subjects** | Determined by the Customer. Typically: the Customer's users of the Elsa engine and Studio; the Customer's employees, contractors, customers and other people whose data the Customer puts into workflows. |
| **Types of personal data** | Determined by the Customer. Typically: (a) engine user account data, such as user names and roles, with passwords stored only as salted one-way hashes; (b) any personal data in workflow definitions, workflow inputs, outputs, variables and execution history; (c) technical and log data generated when the engine runs or is used, such as timestamps, IP addresses, request details and diagnostic logs. |
| **Special categories** | The Service is not designed for special categories of personal data (Article 9 GDPR) or data about criminal convictions (Article 10 GDPR). The Customer should not place such data in the Service without first agreeing this with us in writing. |
| **Frequency** | Continuous, for as long as the Hosted environment runs. |
| **Location** | Microsoft Azure, in an EU/EEA region (section 12). At the date of this DPA, Hosted environments run in the West Europe region (the Netherlands). See Annex III for Sub-processor locations. |
| **Retention** | Workflow data: as long as the Customer keeps it in the Hosted environment, then deleted under section 10. Diagnostic logs: kept for up to 30 days on a rolling basis. Database backups: kept for up to 35 days on a rolling basis for recovery, and deleted when the environment is deleted. |`,
  },
  {
    id: "annex-ii",
    title: "Annex II: Technical and organisational measures",
    body: `These are the measures in place for Elsa Cloud Hosted on the date of this DPA. We review them as the Service develops.

**1. Isolation**
- Each Customer gets a dedicated Elsa engine with its own database, secret store, log workspace and managed identity, deployed in a separate Azure resource group. Customer workloads do not share a database or engine with other customers.
- Engines run from immutable container images pinned by content hash, built and published through an automated pipeline.

**2. Encryption**
- All traffic to the engine, the Elsa Cloud dashboard and the control plane is served over HTTPS. Plain HTTP to the engine is refused.
- Database connections require TLS 1.2 or higher.
- Data at rest is encrypted. Workload databases use Azure SQL transparent data encryption, and storage and secret services use the encryption Microsoft Azure applies by default.

**3. Identity and access control**
- Access to the Elsa engine from the Elsa Cloud dashboard uses a short-lived handoff. The resulting session is limited to a defined set of permissions and lasts at most 8 hours.
- Services authenticate to each other and to Azure resources with managed identities and role-based access control, not shared passwords. Database administration uses Microsoft Entra ID identities only; SQL password logins are disabled.
- Each engine reads its secrets at runtime from its own managed secret store, which only that engine's identity (read-only) and our provisioning service can access. Secrets are not kept in source code or container images.
- Staff access to production systems is limited to people who need it for their role and uses named accounts. Multi-factor authentication is required for all personnel with access to production systems.
- The control plane applies rate limits to sign-in, provisioning and engine-access endpoints to reduce abuse.

**4. Availability and resilience**
- Workload databases have automated backups with point-in-time restore for up to 35 days.
- Engine deployments are health-checked, and a failed deployment rolls back to the last working version.
- Lifecycle events that need attention, such as an environment entering a recovery state, raise alerts to the operations team.
- During Early Access we do not commit to a recovery-time or recovery-point objective.

**5. Logging and monitoring**
- Engine and platform logs are collected in Azure Log Analytics and Application Insights, with access restricted through Microsoft Entra ID and role-based access control, and kept for 30 days.

**6. Secure development and change management**
- All code changes go through pull requests with review and automated tests before merging. Production deployments run through automated pipelines, not by hand.
- Third-party dependencies are tracked and updated, including security patches to the Elsa runtime and the .NET platform.

**7. Deletion**
- Deleting a Hosted environment removes its Azure resource group, including the engine, database and its backups, logs and secret store. The secret store is purged, not just soft-deleted. See DPA section 10.

**8. Organisational measures**
- People with access to Customer Personal Data are bound by confidentiality (DPA section 4).
- Personal Data Breaches are handled under DPA section 8, following a documented incident response procedure that we maintain.
- Sub-processors are selected and bound under DPA section 6.

**9. Automated and AI-assisted operations**
- We use AI-assisted coding and deployment agents to develop, test, build and deploy the control plane. These agents work only on the control plane: its source code, build pipelines and the control plane's own metadata.
- The agents have no standing credentials, roles or network paths that give them access to Hosted environments, including their databases, secret stores, logs, backups and engine user interfaces, or to the Azure subscriptions in which Hosted environments run. No agent holds Azure sign-in credentials. The agents do not receive Customer Personal Data, so the providers of these AI tools are not Sub-processors.
- Changes to the production control plane are deployed only through automated pipelines from the main branch, and each production deployment must be approved by a named person. The person who starts a deployment cannot approve it, and administrators cannot bypass the approval.
- Any change to these restrictions that would give an AI provider access to Customer Personal Data would be a new Sub-processor and is subject to section 6.`,
  },
  {
    id: "annex-iii",
    title: "Annex III: Sub-processors",
    body: [CLOUD_SUBPROCESSORS_PART_A, CLOUD_SUBPROCESSORS_PART_B, CLOUD_SUBPROCESSORS_TRANSITIONAL_NOTE].join("\n\n"),
  },
];
