import React from 'react';
import { Metadata } from "next";
import BackNavbar from '@/components/BackNavbar';

export const metadata: Metadata = {
  title: "Privacy Policy ",
  description: "How LITONU BUSINESS BASE UNIVERSE LTD collects, uses, and protects personal data on the bbu1 platform, worldwide.",
};

const LAST_UPDATED = "July 30, 2026";

const TOC_SECTIONS: { id: string; title: string }[] = [
  { id: "introduction", title: "1. Introduction" },
  { id: "scope", title: "2. Scope of This Policy" },
  { id: "who-we-are", title: "3. Who We Are (Data Controller Information)" },
  { id: "definitions", title: "4. Definitions" },
  { id: "data-we-collect", title: "5. What Personal Data We Collect" },
  { id: "how-we-use", title: "6. How We Use Personal Data" },
  { id: "legal-bases", title: "7. Legal Bases for Processing (GDPR / UK GDPR)" },
  { id: "uganda-dppa", title: "8. Uganda Data Protection and Privacy Act, 2019" },
  { id: "ura-efris-sharing", title: "9. Uganda Revenue Authority (URA) and EFRIS Data Sharing" },
  { id: "other-regional", title: "10. Other Regional Compliance" },
  { id: "controller-processor", title: "11. Our Role: Controller vs. Processor" },
  { id: "subprocessors", title: "12. Sub-processors" },
  { id: "your-rights", title: "13. Your Rights" },
  { id: "international-transfers", title: "14. International Data Transfers" },
  { id: "cookies", title: "15. Cookies and Tracking Technologies" },
  { id: "dnt-gpc", title: "16. Do Not Track and Global Privacy Control Signals" },
  { id: "marketing", title: "17. Marketing Communications and Preferences" },
  { id: "retention", title: "18. Data Retention" },
  { id: "security", title: "19. Data Security" },
  { id: "breach-notification", title: "20. Data Breach Notification" },
  { id: "sharing-disclosure", title: "21. Sharing and Disclosure of Data" },
  { id: "third-party-links", title: "22. Third-Party Links" },
  { id: "hr-payroll-data", title: "23. Employee, Payroll, and HR Data" },
  { id: "childrens-privacy", title: "24. Children's Privacy" },
  { id: "automated-decisions", title: "25. Automated Decision-Making" },
  { id: "accessibility", title: "26. Accessibility" },
  { id: "changes", title: "27. Changes to This Privacy Policy" },
  { id: "contact", title: "28. Contact Us / Complaints" },
];

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 font-sans">
      <BackNavbar backHref="/" backLabel="Home" />
      <main className="grow pt-16 pb-24">
        <div className="container mx-auto px-6 max-w-6xl">

          {/* Header */}
          <header className="max-w-2xl mb-12">
            <p className="text-sm font-semibold text-slate-500 mb-3">Legal</p>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-5">
              Privacy Policy
            </h1>
            <p className="text-slate-500 text-sm">
              LITONU BUSINESS BASE UNIVERSE LTD, bbu1 Platform
            </p>
            <p className="text-slate-400 text-sm mt-1">Last Updated: {LAST_UPDATED}</p>
          </header>

          <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-12">

            {/* Table of Contents, sticky sidebar on desktop */}
            <nav
              aria-label="Table of contents"
              className="hidden lg:block sticky top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto pr-4 border-r border-slate-100"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">
                On this page
              </p>
              <ul className="space-y-2.5">
                {TOC_SECTIONS.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="text-sm text-slate-500 hover:text-slate-900 transition-colors leading-snug block"
                    >
                      {item.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Mobile TOC, collapsible */}
            <details className="lg:hidden mb-10 border border-slate-200 rounded-lg px-4 py-3 open:pb-4">
              <summary className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                Table of contents
              </summary>
              <ul className="mt-3 space-y-2">
                {TOC_SECTIONS.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`} className="text-sm text-slate-500 hover:text-slate-900">
                      {item.title}
                    </a>
                  </li>
                ))}
              </ul>
            </details>

            <article className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-a:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-slate-900 prose-headings:scroll-mt-24">

              <Section id="introduction" title="1. Introduction">
                <p>
                  <strong>LITONU BUSINESS BASE UNIVERSE LTD</strong> (&quot;LITONU,&quot; &quot;we,&quot; &quot;us,&quot; &quot;our&quot;) respects your
                  privacy and is committed to protecting the personal data of everyone who uses bbu1 (the
                  &quot;Platform&quot;), regardless of where in the world you are located.
                </p>
                <p>
                  This Privacy Policy explains what personal data we collect, why we collect it, how we use and
                  protect it, who we share it with, and the rights available to you under applicable data protection
                  laws, including the laws of Uganda, the European Union and United Kingdom (GDPR/UK GDPR), the
                  United States (including California&apos;s CCPA/CPRA), and other jurisdictions in which our users are
                  located.
                </p>
                <p>
                  LITONU maintains registration as a data controller and processor under Uganda&apos;s data protection
                  framework with the Personal Data Protection Office (PDPO) under the National Information Technology
                  Authority, Uganda (NITA-U). LITONU is registered with the Uganda Registration Services Bureau under
                  company registration number 80034302367494.
                </p>
                <p>If you do not agree with this Privacy Policy, please do not use bbu1.</p>
              </Section>

              <Section id="scope" title="2. Scope of This Policy">
                <p>This Policy applies to:</p>
                <ul>
                  <li>Visitors to our website;</li>
                  <li>Registered users of bbu1 (Administrators, Accountants, Auditors, Cashiers, Staff, and other roles);</li>
                  <li>
                    Individuals whose data is entered into bbu1 by our business customers, such as a customer&apos;s own
                    employees, clients, or suppliers. For this category, our customer is typically the &quot;data
                    controller&quot; and LITONU acts as a &quot;data processor&quot; or &quot;service provider,&quot; as explained in Section 11.
                  </li>
                </ul>
                <p>
                  Because bbu1 is used by businesses worldwide, this Policy is designed to meet the requirements of
                  multiple legal frameworks simultaneously. Where a specific law grants you stronger rights than
                  described generally in this Policy, that stronger right applies to you.
                </p>
              </Section>

              <Section id="who-we-are" title="3. Who We Are (Data Controller Information)">
                <p>
                  <strong>LITONU BUSINESS BASE UNIVERSE LTD</strong>
                  <br />
                  Registered in the Republic of Uganda
                  <br />
                  Registered Office: Kisasi, Kampala, Uganda
                  <br />
                  Company Registration Number: 80034302367494
                  <br />
                  Data Protection Contact: info@bbu1.com
                  <br />
                  Phone: +256 766 380 103
                </p>
                <p>
                  If we appoint a formal Data Protection Officer under GDPR or Uganda&apos;s Data Protection and Privacy
                  Act, 2019, their contact details will be listed here.
                </p>
              </Section>

              <Section id="definitions" title="4. Definitions">
                <p>Capitalized terms used throughout this Policy have the meanings set out below, in addition to terms defined elsewhere in this Policy.</p>
                <ul>
                  <li><strong>&quot;Controller&quot;</strong> means the entity that determines the purposes and means of processing personal data.</li>
                  <li><strong>&quot;Data Subject&quot;</strong> means the individual to whom personal data relates.</li>
                  <li><strong>&quot;EFRIS&quot;</strong> means the Electronic Fiscal Receipting and Invoicing Solution operated by the Uganda Revenue Authority.</li>
                  <li><strong>&quot;Personal Data&quot;</strong> means any information relating to an identified or identifiable natural person.</li>
                  <li><strong>&quot;Processing&quot;</strong> means any operation performed on personal data, including collection, storage, use, disclosure, and deletion.</li>
                  <li><strong>&quot;Processor&quot;</strong> means an entity that processes personal data on behalf of, and under the instructions of, a Controller.</li>
                  <li><strong>&quot;Sensitive Data&quot;</strong> or &quot;Special Category Data&quot; means personal data revealing racial or ethnic origin, health, religious belief, biometric or genetic data, or similar categories protected under applicable law.</li>
                  <li><strong>&quot;Sub-processor&quot;</strong> means a third party engaged by LITONU to process personal data on LITONU&apos;s behalf.</li>
                  <li><strong>&quot;URA&quot;</strong> means the Uganda Revenue Authority.</li>
                </ul>
              </Section>

              <Section id="data-we-collect" title="5. What Personal Data We Collect">
                <SubHeading>5.1 Data You Provide Directly</SubHeading>
                <ul>
                  <li><strong>Account data:</strong> name, email address, phone number, job title, business name, password (encrypted).</li>
                  <li><strong>Billing data:</strong> billing address, payment card details or bank information, processed via secure third-party payment processors so we do not store full card numbers, and tax identification numbers.</li>
                  <li><strong>Business and financial data you input into bbu1:</strong> transaction records, invoices, receipts, payroll data, supplier/customer records, inventory data, audit trails, tax filings, and reports you create or upload.</li>
                  <li><strong>Communications:</strong> messages you send to our support team, survey responses, feedback.</li>
                </ul>
                <SubHeading>5.2 Data Collected Automatically</SubHeading>
                <ul>
                  <li><strong>Usage data:</strong> pages viewed, features used, actions taken within the Platform, timestamps, session duration.</li>
                  <li><strong>Device and log data:</strong> IP address, browser type, operating system, device identifiers, crash logs.</li>
                  <li><strong>Cookies and similar technologies:</strong> see Section 15.</li>
                </ul>
                <SubHeading>5.3 Data From Third Parties</SubHeading>
                <ul>
                  <li>Data from payment processors confirming successful transactions;</li>
                  <li>Data from integrated banks, financial institutions, or accounting/e-commerce platforms you choose to connect;</li>
                  <li>Data from identity verification providers, where required for compliance, such as anti-money-laundering checks;</li>
                  <li>Data exchanged with URA through the EFRIS integration described in Section 9, where you enable it.</li>
                </ul>
                <SubHeading>5.4 Special Category / Sensitive Data</SubHeading>
                <p>
                  bbu1 is not designed to collect sensitive categories of personal data, such as health data, religious
                  beliefs, or racial or ethnic origin, as a core function. If such data is voluntarily entered by you, for
                  example in payroll or HR-adjacent records, you are responsible for ensuring you have a lawful basis
                  to do so, and for configuring appropriate access restrictions within the Platform.
                </p>
              </Section>

              <Section id="how-we-use" title="6. How We Use Personal Data">
                <p>We use personal data to:</p>
                <ol>
                  <li>Create and manage your account;</li>
                  <li>Provide, operate, and maintain bbu1&apos;s features, including POS, accounting, invoicing, reporting, tax, audit, and ERP tools;</li>
                  <li>Process payments and manage billing and subscriptions;</li>
                  <li>Provide customer support and respond to inquiries;</li>
                  <li>Detect, prevent, and investigate fraud, security incidents, and abuse;</li>
                  <li>Comply with legal, tax, and regulatory obligations, including audit trail and EFRIS reporting requirements;</li>
                  <li>Improve and develop the Platform, including through aggregated and de-identified analytics;</li>
                  <li>Send service-related communications, such as billing notices and security alerts, and, where you have consented, marketing communications;</li>
                  <li>Enforce our Terms of Service and protect our legal rights.</li>
                </ol>
              </Section>

              <Section id="legal-bases" title="7. Legal Bases for Processing (GDPR / UK GDPR)">
                <p>Where the GDPR or UK GDPR applies to our processing of your personal data, we rely on the following legal bases:</p>
                <ul>
                  <li><strong>Performance of a contract</strong>, to provide bbu1 and fulfill our obligations under our Terms of Service;</li>
                  <li><strong>Legitimate interests</strong>, to secure the Platform, prevent fraud, and improve our services, balanced against your rights and interests;</li>
                  <li><strong>Legal obligation</strong>, to comply with tax, accounting, anti-money-laundering, or other regulatory requirements;</li>
                  <li><strong>Consent</strong>, for optional marketing communications and non-essential cookies, which you may withdraw at any time.</li>
                </ul>
              </Section>

              <Section id="uganda-dppa" title="8. Uganda Data Protection and Privacy Act, 2019">
                <p>
                  As a company registered in Uganda, LITONU processes personal data in accordance with the Data
                  Protection and Privacy Act, 2019, and its Regulations, under the oversight of the Personal Data
                  Protection Office (PDPO) at NITA-U. In accordance with this framework, we:
                </p>
                <ul>
                  <li>Collect and process personal data lawfully, fairly, and transparently;</li>
                  <li>Collect data only for specified, explicit purposes;</li>
                  <li>Apply appropriate technical and organizational security measures;</li>
                  <li>Allow data subjects to exercise their rights as set out in Section 13;</li>
                  <li>Are registered with the PDPO as required under the Data Protection and Privacy Act, 2019, with registration details available on request at info@bbu1.com.</li>
                </ul>
              </Section>

              <Section id="ura-efris-sharing" title="9. Uganda Revenue Authority (URA) and EFRIS Data Sharing">
                <p>
                  Where you use bbu1&apos;s integration with URA&apos;s Electronic Fiscal Receipting and Invoicing Solution
                  (EFRIS), invoice and receipt data you generate through bbu1, which may include your customers&apos;
                  names, tax identification numbers, and transaction details, is transmitted to URA as part of the
                  fiscal receipting process. This transmission happens because you have chosen to use the EFRIS
                  integration to meet your own tax obligations, not because LITONU independently decides to share
                  your data with URA.
                </p>
                <p>
                  LITONU acts as a technical conduit for this transmission and does not control how URA subsequently
                  stores, uses, or retains data received through EFRIS. Any questions about URA&apos;s own handling of
                  that data should be directed to URA. If you enter customer or supplier personal data into invoices
                  processed through EFRIS, you are responsible for ensuring you have a lawful basis to disclose that
                  data to URA through this mechanism.
                </p>
              </Section>

              <Section id="other-regional" title="10. Other Regional Compliance">
                <SubHeading>10.1 California (CCPA/CPRA)</SubHeading>
                <p>
                  If you are a California resident, you have the right to know what personal information we collect,
                  request deletion, correct inaccurate information, opt out of the &quot;sale&quot; or &quot;sharing&quot; of personal
                  information, which LITONU does not engage in, and not be discriminated against for exercising
                  these rights. Requests can be made to info@bbu1.com.
                </p>
                <SubHeading>10.2 Other U.S. State Laws</SubHeading>
                <p>
                  Residents of other U.S. states with comprehensive privacy laws, such as Virginia, Colorado,
                  Connecticut, and Utah, have similar rights, which we honor consistent with applicable law.
                </p>
                <SubHeading>10.3 Other Jurisdictions</SubHeading>
                <p>
                  For users in Canada, Australia, Nigeria, Kenya, South Africa, India, or elsewhere, we process
                  personal data consistent with applicable local data protection laws, such as PIPEDA, the Privacy Act
                  1988, the NDPR, Kenya&apos;s Data Protection Act, POPIA, and the DPDP Act. Where local law grants additional
                  rights, we will honor them upon request.
                </p>
              </Section>

              <Section id="controller-processor" title="11. Our Role: Controller vs. Processor">
                <ul>
                  <li>
                    When you register for bbu1 and use it for your own business, LITONU generally acts as the
                    <strong> data controller</strong> for your account and billing data, and as a
                    <strong> data processor/service provider</strong> for the business, financial, and customer data
                    you input into the Platform on behalf of your own business.
                  </li>
                  <li>
                    If you are an employee, customer, or supplier of one of our business customers, and your data has
                    been entered into bbu1 by that business, your business is the <strong>data controller</strong>, and
                    you should direct privacy inquiries to them first. We process that data only according to our
                    customer&apos;s instructions and this Policy.
                  </li>
                </ul>
              </Section>

              <Section id="subprocessors" title="12. Sub-processors">
                <p>
                  LITONU engages Sub-processors, such as cloud hosting, payment processing, identity verification, and
                  communications providers, to support delivery of bbu1. LITONU remains responsible for each
                  Sub-processor&apos;s compliance with data protection obligations equivalent to those in this Policy.
                </p>
                <p>
                  A current list of material Sub-processors is available on request at info@bbu1.com. Where required
                  under a Data Processing Agreement, LITONU will provide notice of new Sub-processors and an
                  opportunity to object on reasonable data protection grounds.
                </p>
              </Section>

              <Section id="your-rights" title="13. Your Rights">
                <p>Subject to applicable law, you may have the right to:</p>
                <ul>
                  <li><strong>Access</strong> the personal data we hold about you;</li>
                  <li><strong>Rectify</strong> inaccurate or incomplete data;</li>
                  <li><strong>Erase</strong> your data, sometimes called the &quot;right to be forgotten,&quot; subject to legal retention obligations, since tax law may require us or our customers to retain financial records for a minimum period;</li>
                  <li><strong>Restrict or object</strong> to certain processing, including direct marketing;</li>
                  <li><strong>Data portability</strong>, to receive your data in a structured, commonly used format;</li>
                  <li><strong>Withdraw consent</strong> at any time, where processing is based on consent;</li>
                  <li><strong>Lodge a complaint</strong> with your local data protection authority: for Uganda, the Personal Data Protection Office (PDPO) at NITA-U; for the EU/EEA, your local supervisory authority; for the UK, the Information Commissioner&apos;s Office (ICO).</li>
                </ul>
                <p>To exercise these rights, contact us at info@bbu1.com. We may need to verify your identity before fulfilling a request. We aim to respond to verified requests within the timeframe required by applicable law, and no later than 30 days as a general practice.</p>
              </Section>

              <Section id="international-transfers" title="14. International Data Transfers">
                <p>
                  bbu1 is built for businesses operating across multiple locations, currencies, and countries at once,
                  and personal data may be transferred to, stored, and processed in Uganda and other countries where
                  we or our service providers, such as cloud hosting providers, operate, regardless of whether you or
                  your business is based in Uganda, elsewhere in Africa, Europe, the Americas, Asia, or any other
                  region.
                </p>
                <p>
                  Where we transfer personal data out of the European Economic Area (EEA), United Kingdom, or
                  Switzerland to a country not deemed to provide an adequate level of protection, we rely on
                  appropriate safeguards, including the European Commission&apos;s Standard Contractual Clauses (SCCs)
                  and, where applicable, the UK International Data Transfer Addendum, to ensure your data remains
                  protected.
                </p>
              </Section>

              <Section id="cookies" title="15. Cookies and Tracking Technologies">
                <p>We use cookies and similar technologies to:</p>
                <ul>
                  <li>Keep you logged in and remember preferences;</li>
                  <li>Understand how the Platform is used, to improve performance;</li>
                  <li>With your consent, support marketing and analytics.</li>
                </ul>
                <p>
                  You can manage cookie preferences through your browser settings or any cookie consent tool provided
                  on our website. Disabling certain cookies may limit some functionality of the Platform.
                </p>
              </Section>

              <Section id="dnt-gpc" title="16. Do Not Track and Global Privacy Control Signals">
                <p>
                  Some browsers and devices support &quot;Do Not Track&quot; signals or the Global Privacy Control (GPC).
                  Where legally required, such as under California law, we treat a detected GPC signal from your
                  browser as a valid request to opt out of the sale or sharing of your personal information for that
                  browser or device. There is no common industry standard for interpreting Do Not Track signals more
                  broadly, so we do not currently respond to Do Not Track signals outside of GPC in the way described
                  above.
                </p>
              </Section>

              <Section id="marketing" title="17. Marketing Communications and Preferences">
                <p>
                  Where you have opted in, we may send you marketing communications about bbu1 features, updates, or
                  offers. You can opt out at any time by using the unsubscribe link included in those messages or by
                  contacting info@bbu1.com. Opting out of marketing communications does not affect service-related
                  communications, such as billing notices, security alerts, or changes to this Policy or our Terms of
                  Service, which we may still need to send you while you hold an account.
                </p>
              </Section>

              <Section id="retention" title="18. Data Retention">
                <p>We retain personal data for as long as:</p>
                <ul>
                  <li>Your account remains active;</li>
                  <li>Necessary to provide the Service;</li>
                  <li>Required to comply with legal, tax, accounting, or audit obligations, which, for financial records, may require retention periods of five to ten years or more depending on jurisdiction;</li>
                  <li>Necessary to resolve disputes or enforce our agreements.</li>
                </ul>
                <p>After this period, we will securely delete or anonymize your data, unless a longer retention period is required or permitted by law.</p>
              </Section>

              <Section id="security" title="19. Data Security">
                <p>We implement technical and organizational measures appropriate to the risk, including:</p>
                <ul>
                  <li>Encryption of data in transit and at rest;</li>
                  <li>Access controls and role-based permissions within bbu1;</li>
                  <li>Regular security testing and vulnerability assessments;</li>
                  <li>Employee training on data protection and confidentiality;</li>
                  <li>Incident response procedures, including breach notification to affected users and regulators as required by applicable law, such as within 72 hours under GDPR where feasible.</li>
                </ul>
                <p>No system is completely secure, and we cannot guarantee absolute security, but we work continuously to protect your data.</p>
              </Section>

              <Section id="breach-notification" title="20. Data Breach Notification">
                <p>
                  If a breach occurs that is likely to result in a risk to your rights and freedoms, we will notify
                  affected users without undue delay, describe the nature of the breach and the categories of data
                  involved to the extent known, explain the likely consequences, and describe the steps we are taking
                  in response. We will also notify the relevant regulator, such as the PDPO in Uganda or the ICO in
                  the UK, where required by applicable law and within the timeframe that law prescribes.
                </p>
              </Section>

              <Section id="sharing-disclosure" title="21. Sharing and Disclosure of Data">
                <p>We do not sell your personal data. We may share data with:</p>
                <ul>
                  <li><strong>Service providers</strong> who help us operate bbu1, such as cloud hosting, payment processors, customer support tools, and analytics providers, under contractual confidentiality and data protection obligations;</li>
                  <li><strong>Professional advisors</strong>, such as lawyers, auditors, and accountants, as necessary;</li>
                  <li><strong>Regulators and authorities</strong>, including URA through the EFRIS integration described in Section 9, where required by law, court order, or to protect our legal rights;</li>
                  <li><strong>A successor entity</strong>, in the event of a merger, acquisition, or sale of assets, subject to continued protection of your data under equivalent terms;</li>
                  <li><strong>Third parties you authorize</strong>, such as banks or accounting platforms you choose to connect to bbu1.</li>
                </ul>
              </Section>

              <Section id="third-party-links" title="22. Third-Party Links">
                <p>
                  bbu1 and our website may contain links to third-party sites, such as payment processors or
                  integration partners, that are not operated by LITONU. This Policy does not apply to those sites,
                  and we encourage you to review the privacy practices of any third-party site before providing your
                  data to it.
                </p>
              </Section>

              <Section id="hr-payroll-data" title="23. Employee, Payroll, and HR Data">
                <p>
                  Where you use bbu1 to manage payroll or HR-adjacent records for your own employees, you act as the
                  data controller for that data, and LITONU processes it only as your processor, on your instructions,
                  as described in Section 11. This may include employee names, salaries, bank details, tax
                  identification numbers, and, where you choose to record it, statutory leave or benefits information.
                </p>
                <p>
                  You are responsible for having a lawful basis to process your employees&apos; data in bbu1, for
                  informing your employees about this processing, such as through your own internal privacy notice,
                  and for configuring role-based access so that payroll data is only visible to Authorized Users who
                  need it.
                </p>
              </Section>

              <Section id="childrens-privacy" title="24. Children's Privacy">
                <p>
                  bbu1 is a business platform not directed at children. We do not knowingly collect personal data from
                  individuals under 18. If we become aware that we have inadvertently collected such data, we will
                  delete it promptly.
                </p>
              </Section>

              <Section id="automated-decisions" title="25. Automated Decision-Making">
                <p>
                  bbu1 may use automated processes, such as fraud detection algorithms and tax calculation engines, to
                  support business functions. Where such processing produces legal or similarly significant effects on
                  you, you have the right to request human review, subject to applicable law.
                </p>
              </Section>

              <Section id="accessibility" title="26. Accessibility">
                <p>
                  LITONU is committed to making our privacy notices and account settings usable by as broad a range
                  of users as reasonably practicable. If you need this Policy in an alternative format, or encounter
                  an accessibility barrier while managing your privacy settings, contact info@bbu1.com.
                </p>
              </Section>

              <Section id="changes" title="27. Changes to This Privacy Policy">
                <p>
                  We may update this Privacy Policy periodically. Material changes will be communicated via the
                  Platform or by email at least 30 days before they take effect. The &quot;Last
                  Updated&quot; date at the top of this Policy reflects the most recent revision.
                </p>
              </Section>

              <Section id="contact" title="28. Contact Us / Complaints">
                <p>For any privacy-related questions, requests, or complaints, contact:</p>
                <p>
                  <strong>LITONU BUSINESS BASE UNIVERSE LTD</strong>
                  <br />
                  Kisasi, Kampala, Uganda
                  <br />
                  Email: info@bbu1.com
                  <br />
                  Phone: +256 766 380 103
                </p>
                <p>If you are not satisfied with our response, you have the right to lodge a complaint with:</p>
                <ul>
                  <li><strong>Uganda:</strong> Personal Data Protection Office (PDPO), National Information Technology Authority, Uganda (NITA-U);</li>
                  <li><strong>EU/EEA:</strong> your local data protection supervisory authority;</li>
                  <li><strong>UK:</strong> Information Commissioner&apos;s Office (ICO), ico.org.uk;</li>
                  <li><strong>Other regions:</strong> your applicable national data protection authority.</li>
                </ul>
              </Section>

            </article>
          </div>
        </div>
      </main>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <h2 className="text-xl font-bold text-slate-900 mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-slate-800 mt-4 mb-1">{children}</h3>;
}