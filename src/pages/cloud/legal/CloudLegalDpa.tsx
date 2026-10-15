import { Link } from "react-router-dom";
import CloudLegalDocument from "./CloudLegalDocument";
import { elsaCloudLegalPath } from "@/lib/elsaCloud";

const dpaSections = [
  {
    id: "scope-and-details",
    number: "01",
    title: "Scope and processing details",
    summary: "The Hosted processing covered by this addendum, including its purpose, duration and data categories.",
    points: [
      "The customer is the controller of Hosted customer content and Skywalker Digital B.V. trading as Valence Works is the processor, unless the parties expressly agree otherwise for a particular activity.",
      "The subject matter is the hosting, operation and support of the customer's Elsa Cloud Hosted environment. Processing lasts for the Hosted subscription and the deletion period described below.",
      "The purpose is to provide, secure, maintain and support Hosted. The data may include workflow definitions, workflow inputs and outputs, logs, identifiers and other content the customer chooses to place in the environment.",
      "Data subjects may include the customer's users, employees, contractors, customers and other people whose information the customer puts into a workflow. The customer remains responsible for its instructions and notices to those people.",
    ],
  },
  {
    id: "instructions-and-confidentiality",
    number: "02",
    title: "Instructions and confidentiality",
    summary: "How documented instructions and confidentiality obligations apply.",
    points: [
      "The customer's use of Hosted, configuration and written support requests are the primary instructions for processing. We will not use Hosted customer content for unrelated purposes or sell it.",
      "If an instruction would infringe the GDPR or other applicable EU or Member State data-protection law, we will inform the customer before processing it unless the law prohibits us from doing so.",
      "People authorised to process Hosted customer content are subject to confidentiality obligations appropriate to their role.",
      "The customer must ensure that its instructions and use of Hosted have a lawful basis and do not require processing that the service is not designed to perform.",
    ],
  },
  {
    id: "security-and-assistance",
    number: "03",
    title: "Security and assistance",
    summary: "The security measures and processor assistance required for Hosted customer content.",
    points: [
      "Valence Works will apply technical and organisational measures appropriate to the nature of Hosted processing and the early-access service, including access controls and operational safeguards.",
      "Taking account of the processing and information available to us, we will reasonably assist the customer with data-subject requests, security obligations, breach response and impact assessments where the GDPR requires processor assistance.",
      "We will notify the customer without undue delay after becoming aware of a personal-data breach affecting Hosted customer content. The customer remains responsible for deciding whether and how to notify data subjects or a supervisory authority.",
    ],
  },
  {
    id: "subprocessors",
    number: "04",
    title: "Subprocessors and transfers",
    summary: "How Hosted subprocessors, changes and international transfers are handled.",
    points: [
      <>
        {/* CHANGED: URL — Subprocessors page is on Elsa Hub */}
        The customer gives general written authorisation for Valence Works to use the providers identified as Hosted customer-content subprocessors on the{" "}
        <Link to={elsaCloudLegalPath("subprocessors")} className="text-primary hover:underline">
          Elsa Cloud Subprocessors page
        </Link>{" "}
        on Elsa Hub.
      </>,
      "We will give reasonable advance notice of an intended addition or replacement so the customer can object on reasonable data-protection grounds. If the parties cannot resolve the objection, the customer may stop the affected Hosted processing.",
      "We impose materially equivalent data-protection obligations on each subprocessor and remain responsible for the processor obligations we have accepted in this addendum.",
      "We will not transfer Hosted customer content outside the EU/EEA except on the customer's instructions or using a lawful transfer mechanism required by applicable data-protection law.",
      "Hosted customer workloads run in Microsoft Azure West Europe in the EU/EEA during Preview. This regional statement does not apply to every account, billing, authentication or delivery service described on the Subprocessors page.",
    ],
  },
  {
    id: "return-and-deletion",
    number: "05",
    title: "Return and deletion",
    summary: "How Hosted customer content is returned or deleted when processing ends.",
    points: [
      "At the end of Hosted processing, Valence Works will make Hosted customer content available for export where the service supports that export and will retain it for up to 30 days.",
      "After that period, we will delete Hosted customer content unless the customer asks for earlier deletion, the parties agree otherwise or applicable law requires retention.",
      "The customer is responsible for exporting content it needs and for giving any deletion instruction that is not already covered by the service lifecycle.",
    ],
  },
  {
    id: "information-and-contact",
    number: "06",
    title: "Information and contact",
    summary: "Compliance information, audit rights and how this addendum fits the Hosted agreement.",
    points: [
      "Valence Works will make available information reasonably necessary to demonstrate compliance with the processor obligations described in this addendum, subject to confidentiality and security limits.",
      "The customer may request a reasonable audit or other review of relevant processing information. The parties will agree scope, timing and safeguards in advance so the review does not disrupt other customers or the service.",
      "This DPA forms part of the agreement for Hosted customer content. If it conflicts with another term on data processing, this DPA controls for that conflict. Questions can be sent to hello@valence.works.",
    ],
  },
];

export default function CloudLegalDpa() {
  return (
    <CloudLegalDocument
      id="dpa"
      name="GDPR Article 28 DPA"
      navLabel="DPA navigation"
      meta={{
        /* CHANGED: site name and URL — Elsa Cloud DPA on Elsa Hub */
        title: "Data Processing Addendum — Elsa Cloud — Elsa+",
        description: "Short GDPR Article 28 Data Processing Addendum for Elsa Cloud Hosted customer content.",
        path: elsaCloudLegalPath("dpa"),
      }}
      hero={{
        eyebrow: "Hosted addendum · GDPR Art. 28",
        title: "Data Processing Addendum",
        lede: "A short Data Processing Addendum for business customers placing personal data in an Elsa Cloud Hosted environment.",
        note: "Effective 14 September 2026. This addendum covers Hosted customer content. BYO environments remain under the customer's Azure control and configuration.",
        factsLabel: "DPA scope",
        facts: [
          { label: "Controller", value: "Your business" },
          { label: "Processor", value: "Valence Works" },
          { label: "Hosted", value: "Customer content" },
          { label: "Delete", value: "Up to 30 days" },
        ],
      }}
      intro={{
        eyebrow: "Hosted customer content",
        title: "Processing terms for Hosted customer content",
        body: "This DPA records the processor relationship for personal data that a business customer places in Elsa Cloud Hosted. Read it with the Early Access Terms, the Privacy Notice and the customer's documented instructions.",
        caveat:
          "The customer decides what data to place in Hosted and remains responsible for its own lawful basis, notices, permissions and instructions.",
      }}
      sections={dpaSections}
      related={[
        /* CHANGED: URL — Hub legal paths */
        { href: elsaCloudLegalPath("privacy"), label: "Privacy notice" },
        { href: elsaCloudLegalPath("subprocessors"), label: "Subprocessors" },
      ]}
      contact={{
        eyebrow: "Data processing questions",
        title: "Questions about data processing",
        body: "For questions about this DPA, Hosted customer content or the current provider list, email hello@valence.works.",
        related: { label: "See subprocessors", to: elsaCloudLegalPath("subprocessors") },
      }}
    />
  );
}
