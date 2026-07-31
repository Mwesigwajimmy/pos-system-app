import React from 'react';
import { Metadata } from "next";
import BackNavbar from '@/components/BackNavbar';

export const metadata: Metadata = {
  title: "Terms of Service ",
  description: "Terms of Service for LITONU BUSINESS BASE UNIVERSE LTD and the bbu1 platform.",
};

const LAST_UPDATED = "July 30, 2026";

const TOC_SECTIONS: { id: string; title: string }[] = [
  { id: "introduction", title: "1. Introduction" },
  { id: "definitions", title: "2. Definitions" },
  { id: "who-can-use", title: "3. Who Can Use bbu1" },
  { id: "your-account", title: "4. Your Account" },
  { id: "billing", title: "5. Subscriptions, Billing, and Payments" },
  { id: "refunds-chargebacks", title: "6. Refunds and Chargebacks" },
  { id: "license", title: "7. License to Use bbu1" },
  { id: "your-data", title: "8. Your Data and Content" },
  { id: "data-protection", title: "9. Data Protection and Privacy" },
  { id: "security", title: "10. Security" },
  { id: "compliance-tax-audit", title: "11. Compliance, Tax, and Audit Features" },
  { id: "ura-efris", title: "12. Uganda Revenue Authority (URA) and EFRIS Compliance" },
  { id: "records-retention", title: "13. Records Retention" },
  { id: "third-party-integrations", title: "14. Third-Party Integrations and Financial Institution Connections" },
  { id: "subprocessors", title: "15. Sub-processors" },
  { id: "api-developer", title: "16. API and Developer Terms" },
  { id: "worldwide-availability", title: "17. Worldwide Availability" },
  { id: "acceptable-use", title: "18. Acceptable Use" },
  { id: "anti-bribery-aml", title: "19. Anti-Bribery, Anti-Corruption, and Anti-Money Laundering" },
  { id: "intellectual-property", title: "20. Intellectual Property" },
  { id: "feedback", title: "21. Feedback" },
  { id: "beta-features", title: "22. Beta and Preview Features" },
  { id: "service-availability", title: "23. Service Availability, Support, and Modifications" },
  { id: "accessibility", title: "24. Accessibility" },
  { id: "confidentiality", title: "25. Confidentiality" },
  { id: "disclaimers", title: "26. Disclaimers" },
  { id: "limitation-of-liability", title: "27. Limitation of Liability" },
  { id: "insurance", title: "28. Insurance (Enterprise Customers)" },
  { id: "export-control", title: "29. Export Control and Sanctions Compliance" },
  { id: "indemnification", title: "30. Indemnification" },
  { id: "audit-rights", title: "31. Audit Rights" },
  { id: "termination", title: "32. Termination" },
  { id: "governing-law", title: "33. Governing Law and Dispute Resolution" },
  { id: "complaints", title: "34. Complaints and Escalation" },
  { id: "publicity", title: "35. Publicity" },
  { id: "notices", title: "36. Notices" },
  { id: "survival", title: "37. Survival" },
  { id: "third-party-beneficiaries", title: "38. Third-Party Beneficiaries" },
  { id: "changes-to-terms", title: "39. Changes to These Terms" },
  { id: "general", title: "40. General" },
  { id: "contact", title: "41. Contact Us" },
];

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 font-sans">
      <BackNavbar backHref="/" backLabel="Home" />
      <main className="grow pt-16 pb-24">
        <div className="container mx-auto px-6 max-w-6xl">

          {/* Header */}
          <header className="max-w-2xl mb-12">
            <p className="text-sm font-semibold text-slate-500 mb-3">Legal</p>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-5">
              Terms of Service
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
                  These Terms of Service (&quot;Terms,&quot; &quot;Agreement&quot;) govern your access to and use of bbu1 (the
                  &quot;Platform,&quot; &quot;Service&quot;), a business management platform that includes point-of-sale (POS),
                  accounting and finance, internal and external auditing tools, reporting, bookkeeping, invoice
                  management, tax and compliance features, and enterprise resource planning (ERP) functionality,
                  provided by <strong>LITONU BUSINESS BASE UNIVERSE LTD</strong> (&quot;LITONU,&quot; &quot;we,&quot; &quot;us,&quot; &quot;our&quot;), a
                  company registered under the laws of the Republic of Uganda, with its registered office in
                  Kisasi, Kampala, Uganda, registration number 80034302367494.
                </p>
                <p>
                  By creating an account, accessing, or using bbu1, you (&quot;you,&quot; &quot;your,&quot; &quot;User,&quot; &quot;Customer&quot;) agree
                  to be bound by these Terms. If you are accepting these Terms on behalf of a company or other legal
                  entity, you represent that you have the authority to bind that entity, in which case &quot;you&quot; refers
                  to that entity.
                </p>
                <p>
                  If you have signed a separate order form, master services agreement, or enterprise agreement with
                  LITONU that references these Terms, that document forms part of this Agreement. If there is a
                  direct conflict, the order form or master agreement will govern to the extent of that conflict.
                </p>
                <p>If you do not agree to these Terms, you must not access or use the Platform.</p>
              </Section>

              <Section id="definitions" title="2. Definitions">
                <p>Capitalized terms used throughout these Terms have the meanings set out below, in addition to terms defined elsewhere in this Agreement.</p>
                <ul>
                  <li><strong>&quot;Affiliate&quot;</strong> means, with respect to a party, any entity that controls, is controlled by, or is under common control with that party.</li>
                  <li><strong>&quot;Authorized User&quot;</strong> means an individual authorized by you to access bbu1 under your account, including Administrators, Accountants, Cashiers, Auditors, and Staff roles.</li>
                  <li><strong>&quot;Business Day&quot;</strong> means a day other than a Saturday, Sunday, or public holiday in the Republic of Uganda.</li>
                  <li><strong>&quot;Confidential Information&quot;</strong> has the meaning given in Section 25 (Confidentiality).</li>
                  <li><strong>&quot;Customer Data&quot;</strong> means the financial records, transaction data, invoices, reports, and other business content you or your Authorized Users input into, or generate through, bbu1.</li>
                  <li><strong>&quot;Documentation&quot;</strong> means LITONU&apos;s user guides, help center articles, and API references for bbu1, as updated from time to time.</li>
                  <li><strong>&quot;EFRIS&quot;</strong> means the Electronic Fiscal Receipting and Invoicing Solution operated by the Uganda Revenue Authority.</li>
                  <li><strong>&quot;Order Form&quot;</strong> means any ordering document, quotation, or online checkout flow referencing these Terms and specifying the plan, fees, and term you have purchased.</li>
                  <li><strong>&quot;Personal Data&quot;</strong> has the meaning given under applicable data protection law, and refers to any information relating to an identified or identifiable natural person processed through bbu1.</li>
                  <li><strong>&quot;Sub-processor&quot;</strong> means a third party engaged by LITONU to process Personal Data on LITONU&apos;s behalf in connection with the Service, as described in Section 15.</li>
                  <li><strong>&quot;URA&quot;</strong> means the Uganda Revenue Authority.</li>
                </ul>
              </Section>

              <Section id="who-can-use" title="3. Who Can Use bbu1">
                <p>To use bbu1, you must:</p>
                <ul>
                  <li>Be at least 18 years old, or the age of legal majority in your jurisdiction;</li>
                  <li>Be capable of forming a legally binding contract;</li>
                  <li>Not be barred from using the Platform under the laws of Uganda, your own country, or any jurisdiction from which you access the Service;</li>
                  <li>Not appear on any sanctions, denied-party, or restricted-party list maintained by the United Nations, the United States, the European Union, the United Kingdom, or Uganda.</li>
                </ul>
                <p>bbu1 is designed for use by businesses of all sizes worldwide, including sole proprietors, startups, SMEs, and larger enterprises, across industries.</p>
              </Section>

              <Section id="your-account" title="4. Your Account">
                <SubHeading>4.1 Registration</SubHeading>
                <p>You must provide accurate, current, and complete information when creating an account. You are responsible for keeping this information up to date.</p>
                <SubHeading>4.2 Account Security</SubHeading>
                <p>You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. Where bbu1 offers multi-factor authentication or similar security controls, we recommend enabling them, particularly for Administrator and Accountant roles. Notify us immediately at info@bbu1.com if you suspect unauthorized access.</p>
                <SubHeading>4.3 Administrators and Team Members</SubHeading>
                <p>Accounts may support multiple user roles, including Administrator, Accountant, Cashier, Auditor, and Staff. The Administrator is responsible for:</p>
                <ul>
                  <li>Assigning and managing permissions for other users under the account;</li>
                  <li>Ensuring team members have agreed to these Terms before accessing the Platform;</li>
                  <li>Any actions taken by users they have added to the account.</li>
                </ul>
                <SubHeading>4.4 Enterprise and Organization Accounts</SubHeading>
                <p>Where an account is created on behalf of an organization with multiple branches, subsidiaries, or business units, the organization may designate a primary Administrator with authority to manage sub-accounts, consolidated reporting, and cross-entity permissions, subject to any applicable Order Form.</p>
              </Section>

              <Section id="billing" title="5. Subscriptions, Billing, and Payments">
                <SubHeading>5.1 Pricing Plans</SubHeading>
                <p>bbu1 is offered under monthly, yearly, and custom/enterprise pricing plans, as selected at signup or negotiated directly with LITONU. bbu1 supports multiple currencies, and pricing and invoicing can be configured to match the currency, tax treatment, and business location relevant to you, whether you operate from Uganda, elsewhere in Africa, Europe, North America, Asia, or any other region. Current pricing is available on our <a href="/pricing">Pricing page</a> or as set out in your custom order form or quotation.</p>
                <SubHeading>5.2 Free Trials</SubHeading>
                <p>If you sign up for a free trial, the trial period will be as stated at signup. We may require payment information before or at the end of the trial to continue your subscription. If you do not wish to continue, you must cancel before the trial ends.</p>
                <SubHeading>5.3 Billing</SubHeading>
                <ul>
                  <li>Subscription fees are billed in advance on a monthly or yearly basis, or per your custom agreement, in the currency shown at checkout or in your invoice.</li>
                  <li>You authorize us, or our third-party payment processor, to charge your chosen payment method automatically at the start of each billing cycle.</li>
                  <li>All fees are exclusive of applicable taxes (VAT, GST, withholding tax, or similar) unless otherwise stated. You are responsible for any such taxes.</li>
                </ul>
                <SubHeading>5.4 Renewals and Cancellation</SubHeading>
                <ul>
                  <li>Subscriptions renew automatically at the end of each billing period unless cancelled beforehand.</li>
                  <li>You may cancel at any time through your account settings or by contacting info@bbu1.com. Cancellation takes effect at the end of the current billing period.</li>
                  <li>Except where required by law, fees already paid are non-refundable, including for partial billing periods.</li>
                </ul>
                <SubHeading>5.5 Price Changes</SubHeading>
                <p>We may change our pricing from time to time. For existing subscribers, price changes take effect at the start of your next renewal period, and we will give you reasonable advance notice, at least 30 days, before the change applies to you.</p>
                <SubHeading>5.6 Late or Failed Payments</SubHeading>
                <p>If a payment fails, we may suspend or limit your access to the Platform until payment is resolved. Continued non-payment may result in termination of your account.</p>
                <SubHeading>5.7 Taxes and Withholding</SubHeading>
                <p>If any withholding or deduction is required by law on payments to LITONU, you agree to gross up the payment so LITONU receives the full amount it would have received absent the withholding, unless otherwise agreed in an Order Form.</p>
              </Section>

              <Section id="refunds-chargebacks" title="6. Refunds and Chargebacks">
                <p>Except where required by law or expressly stated in an Order Form, subscription fees are non-refundable once a billing period has started, including where you cancel partway through that period or do not use the Platform during it.</p>
                <p>If you believe you were billed in error, contact info@bbu1.com within 30 days of the charge and we will investigate in good faith. If you initiate a chargeback or payment dispute with your bank or card issuer without first contacting us, we may suspend your account while the dispute is resolved, and you remain responsible for any fees legitimately owed under these Terms.</p>
              </Section>

              <Section id="license" title="7. License to Use bbu1">
                <p>Subject to your compliance with these Terms and payment of applicable fees, LITONU grants you a limited, non-exclusive, non-transferable, revocable license to access and use bbu1 for your own internal business purposes.</p>
                <p>You may not:</p>
                <ul>
                  <li>Resell, sublicense, rent, or lease access to the Platform to third parties without our written consent;</li>
                  <li>Reverse engineer, decompile, or attempt to extract the source code of the Platform, except where permitted by law;</li>
                  <li>Use the Platform to build a competing product;</li>
                  <li>Circumvent usage limits, security features, or access controls;</li>
                  <li>Use the Platform for any unlawful purpose, including tax evasion, money laundering, or fraud;</li>
                  <li>Use any automated means, such as bots or scrapers, to access bbu1 except through APIs we expressly make available for that purpose.</li>
                </ul>
              </Section>

              <Section id="your-data" title="8. Your Data and Content">
                <SubHeading>8.1 Ownership</SubHeading>
                <p>You retain all rights to the financial records, transaction data, invoices, reports, and other business content you input into bbu1 (&quot;Customer Data&quot;). We do not claim ownership over your Customer Data.</p>
                <SubHeading>8.2 License to Operate the Service</SubHeading>
                <p>You grant LITONU a limited license to host, store, process, back up, and transmit your Customer Data solely as necessary to provide, maintain, secure, and improve the Platform, in accordance with our Privacy Policy.</p>
                <SubHeading>8.3 Aggregated and De-identified Data</SubHeading>
                <p>We may generate aggregated, anonymized, or de-identified data derived from usage of the Platform, such as benchmarking statistics, that does not identify you or any individual. We may use such data to improve bbu1 and for other lawful business purposes.</p>
                <SubHeading>8.4 Your Responsibility for Accuracy</SubHeading>
                <p>You are solely responsible for the accuracy and completeness of financial, tax, and accounting data you enter into bbu1. bbu1 is a tool to support your bookkeeping, reporting, tax, and audit processes, and it does not replace the judgment of a qualified accountant, tax advisor, or auditor.</p>
                <SubHeading>8.5 Data Export and Portability</SubHeading>
                <p>You may export your Customer Data in the formats made available within the Platform at any time during your subscription. We recommend maintaining your own independent backups of critical financial records.</p>
              </Section>

              <Section id="data-protection" title="9. Data Protection and Privacy">
                <SubHeading>9.1 Roles of the Parties</SubHeading>
                <p>Where Customer Data includes Personal Data, you act as the data controller (or equivalent) and LITONU acts as a data processor (or service provider), processing Personal Data solely on your documented instructions and as necessary to provide bbu1, as further described in our <a href="/privacy">Privacy Policy</a> and, where applicable, a separate Data Processing Agreement (&quot;DPA&quot;).</p>
                <SubHeading>9.2 Applicable Data Protection Laws</SubHeading>
                <p>Depending on where you and your end customers are located, processing of Personal Data through bbu1 may be subject to laws such as Uganda&apos;s Data Protection and Privacy Act, the EU/UK General Data Protection Regulation, and other applicable regional or sectoral privacy laws. You are responsible for ensuring you have a lawful basis to submit Personal Data to bbu1 and for meeting any notice or consent obligations to your own customers and employees.</p>
                <SubHeading>9.3 International Transfers</SubHeading>
                <p>Personal Data processed through bbu1 may be transferred to, and stored or processed in, countries other than where you or your end customers are located. Where required by applicable law, LITONU will implement appropriate safeguards, such as standard contractual clauses or equivalent mechanisms, for such transfers.</p>
                <SubHeading>9.4 Data Subject Requests</SubHeading>
                <p>Where LITONU receives a request from an individual to exercise their data protection rights, such as access, correction, or deletion, in relation to Personal Data within your Customer Data, we will refer the request to you and provide reasonable assistance as required by applicable law.</p>
                <SubHeading>9.5 Data Processing Agreement</SubHeading>
                <p>Enterprise customers with specific regulatory requirements may request a separate DPA incorporating standard contractual clauses or equivalent transfer mechanisms by contacting info@bbu1.com.</p>
              </Section>

              <Section id="security" title="10. Security">
                <p>LITONU maintains administrative, technical, and physical safeguards designed to protect Customer Data against unauthorized access, disclosure, alteration, and destruction, appropriate to the nature of the financial and business data processed through bbu1.</p>
                <SubHeading>10.1 Security Measures</SubHeading>
                <p>These safeguards may include encryption of data in transit and at rest, access controls and role-based permissions, logging and monitoring, regular security testing, and employee confidentiality obligations. Further detail on our security practices is available on request by contacting info@bbu1.com.</p>
                <SubHeading>10.2 Your Security Responsibilities</SubHeading>
                <p>You are responsible for configuring user roles and permissions appropriately, safeguarding your own credentials and devices, and promptly removing access for Authorized Users who no longer require it.</p>
                <SubHeading>10.3 Security Incident Notification</SubHeading>
                <p>If LITONU becomes aware of a security incident that results in unauthorized access to, or disclosure of, your Customer Data, we will notify you without undue delay and provide information reasonably available to us to help you meet any regulatory notification obligations you may have.</p>
              </Section>

              <Section id="compliance-tax-audit" title="11. Compliance, Tax, and Audit Features">
                <p>bbu1 includes tools intended to help you track compliance obligations, calculate taxes, and prepare for internal or external audits across multiple jurisdictions.</p>
                <p><strong>Important:</strong> LITONU is a software provider, not a law firm, accounting firm, or tax authority. Tax rules, reporting formats, and compliance obligations vary by country and change frequently. You are responsible for:</p>
                <ul>
                  <li>Verifying that tax rates, rules, and templates configured in bbu1 match the current law in your jurisdiction or jurisdictions;</li>
                  <li>Consulting a licensed accountant, tax advisor, or lawyer before relying on bbu1&apos;s outputs for regulatory filings;</li>
                  <li>Any penalties, fines, or liabilities arising from incorrect tax filings or non-compliance, whether or not caused by data or calculations produced by bbu1.</li>
                </ul>
              </Section>

              <Section id="ura-efris" title="12. Uganda Revenue Authority (URA) and EFRIS Compliance">
                <p>Where you operate in Uganda, bbu1 may offer features intended to support integration with the Uganda Revenue Authority&apos;s Electronic Fiscal Receipting and Invoicing Solution (EFRIS), including e-invoicing, e-receipting, and related tax reporting workflows.</p>
                <p>These features are provided to help you meet your URA obligations, but LITONU is not URA and does not act as your tax agent. You remain responsible for:</p>
                <ul>
                  <li>Registering with URA and obtaining any credentials, device identifiers, or taxpayer identification numbers required to connect to EFRIS;</li>
                  <li>Confirming that invoices, receipts, and tax figures generated or transmitted through bbu1 are accurate before submission;</li>
                  <li>Any penalties, interest, or enforcement action arising from late, incorrect, or missed filings, connectivity interruptions between bbu1 and EFRIS, or changes URA makes to its systems or requirements that affect this integration;</li>
                  <li>Maintaining an alternative manual process for fiscal receipting during any period where the EFRIS integration is unavailable.</li>
                </ul>
                <p>LITONU will make reasonable efforts to keep this integration aligned with URA&apos;s published technical requirements, but URA may change those requirements at any time, and LITONU cannot guarantee uninterrupted connectivity to systems it does not operate.</p>
              </Section>

              <Section id="records-retention" title="13. Records Retention">
                <p>Many jurisdictions impose statutory minimum periods for retaining accounting books, tax records, and audit trails, commonly, though not universally, in the range of five to seven years. bbu1 provides tools to help you retain and export such records, but you remain solely responsible for:</p>
                <ul>
                  <li>Determining the retention periods applicable to your business under the laws of each jurisdiction in which you operate;</li>
                  <li>Exporting and independently archiving records before deleting data within bbu1 or closing your account;</li>
                  <li>Retaining copies of records after termination of your subscription, as LITONU is not obligated to preserve Customer Data indefinitely (see Section 32.3).</li>
                </ul>
              </Section>

              <Section id="third-party-integrations" title="14. Third-Party Integrations and Financial Institution Connections">
                <p>bbu1 may allow you to connect third-party services, such as payment gateways, banks, e-commerce platforms, and government tax portals. Where you authorize such connections:</p>
                <ul>
                  <li>You permit LITONU to access, retrieve, and process data from that third party on your behalf, solely to provide the Service;</li>
                  <li>LITONU is not responsible for the accuracy, availability, or security practices of third-party services;</li>
                  <li>Your use of any third-party service is governed by that provider&apos;s own terms and privacy policy.</li>
                </ul>
              </Section>

              <Section id="subprocessors" title="15. Sub-processors">
                <p>LITONU engages Sub-processors, such as cloud hosting, payment processing, and communications providers, to support delivery of bbu1. LITONU remains responsible for each Sub-processor&apos;s compliance with data protection obligations equivalent to those in this Agreement.</p>
                <p>A current list of material Sub-processors is available on request at info@bbu1.com. Where required under a DPA, LITONU will provide notice of new Sub-processors and an opportunity to object on reasonable data protection grounds.</p>
              </Section>

              <Section id="api-developer" title="16. API and Developer Terms">
                <p>Where LITONU makes an application programming interface (&quot;API&quot;) available for bbu1, your use of the API is subject to these Terms, our published API Documentation, and any applicable rate limits, authentication requirements, or usage tiers.</p>
                <ul>
                  <li>You are responsible for the security of your API keys and credentials, and for all activity conducted through them;</li>
                  <li>You may not use the API to circumvent subscription limits, resell access to bbu1 as a standalone product, or build a product that duplicates bbu1&apos;s core functionality;</li>
                  <li>LITONU may throttle, suspend, or modify API access to protect the stability and security of the Platform, and will provide reasonable notice of breaking changes where practical;</li>
                  <li>Data retrieved through the API remains Customer Data and is subject to Section 8 and Section 9 of these Terms.</li>
                </ul>
              </Section>

              <Section id="worldwide-availability" title="17. Worldwide Availability">
                <p>bbu1 is built as a multi-location, multi-currency, multi-country platform, designed to be usable by a single-branch business or by an enterprise operating across many countries at once, whether based in Uganda, elsewhere in Africa, Europe, the Americas, Asia, or any other region, subject to:</p>
                <ul>
                  <li>Local law compliance being your responsibility as the user or business in each country where you operate;</li>
                  <li>Certain features, such as specific tax templates, currencies, or regulatory reports, being unavailable or limited in some regions;</li>
                  <li>Export control and sanctions restrictions described in Section 29.</li>
                </ul>
              </Section>

              <Section id="acceptable-use" title="18. Acceptable Use">
                <p>You agree not to use bbu1 to:</p>
                <ul>
                  <li>Violate any applicable law or regulation;</li>
                  <li>Infringe the intellectual property or privacy rights of others;</li>
                  <li>Upload malicious code, viruses, or harmful software;</li>
                  <li>Interfere with or disrupt the integrity or performance of the Platform;</li>
                  <li>Access data or accounts you are not authorized to access;</li>
                  <li>Use the Platform to facilitate fraud, money laundering, or terrorist financing;</li>
                  <li>Conduct load testing, security testing, or vulnerability scanning against bbu1 without our prior written consent.</li>
                </ul>
                <p>We may suspend or terminate accounts we reasonably believe are engaged in prohibited activity.</p>
              </Section>

              <Section id="anti-bribery-aml" title="19. Anti-Bribery, Anti-Corruption, and Anti-Money Laundering">
                <p>Given bbu1&apos;s use across accounting, POS, and financial workflows, each party represents that it will comply with applicable anti-bribery and anti-corruption laws, including the Uganda Anti-Corruption Act, the UK Bribery Act, and the U.S. Foreign Corrupt Practices Act, to the extent applicable to that party.</p>
                <p>You agree not to use bbu1 to facilitate bribery, corruption, money laundering, or the financing of terrorism, and you are responsible for implementing your own internal controls and know-your-customer (KYC) and anti-money laundering (AML) procedures appropriate to your business and regulatory obligations. bbu1&apos;s compliance and audit features support, but do not substitute for, your own AML/KYC program.</p>
              </Section>

              <Section id="intellectual-property" title="20. Intellectual Property">
                <p>
                  The Platform, including its software, design, trademarks (&quot;bbu1,&quot; &quot;LITONU BUSINESS BASE
                  UNIVERSE LTD,&quot; and associated logos), and underlying technology, is owned by LITONU and its
                  licensors. Nothing in these Terms transfers any ownership rights to you except the limited license
                  granted in Section 7.
                </p>
              </Section>

              <Section id="feedback" title="21. Feedback">
                <p>If you choose to submit ideas, suggestions, or feedback about bbu1, you grant LITONU a perpetual, irrevocable, royalty-free license to use and incorporate that feedback into the Platform without obligation or compensation to you. You are not required to provide feedback.</p>
              </Section>

              <Section id="beta-features" title="22. Beta and Preview Features">
                <p>From time to time, LITONU may make beta, preview, or early-access features available. These features are provided &quot;as is,&quot; may be changed or discontinued at any time, may be less reliable than generally available features, and are excluded from any service level commitments unless expressly stated otherwise. You may choose not to enable such features.</p>
              </Section>

              <Section id="service-availability" title="23. Service Availability, Support, and Modifications">
                <p>We aim to keep bbu1 available at all times but do not guarantee uninterrupted access. We may:</p>
                <ul>
                  <li>Perform scheduled or emergency maintenance;</li>
                  <li>Modify, update, or discontinue features, with reasonable notice for material changes where practical;</li>
                  <li>Suspend the Service to address security risks or legal obligations.</li>
                </ul>
                <p>Specific uptime commitments and support response times, where applicable, are set out in a separate Service Level Agreement (SLA) referenced in your Order Form for eligible enterprise plans, and are not implied by this Section absent such an agreement. General support is available at info@bbu1.com or by phone at +256 766 380 103.</p>
              </Section>

              <Section id="accessibility" title="24. Accessibility">
                <p>LITONU is committed to making bbu1 usable by as broad a range of businesses and users as reasonably practicable. If you encounter an accessibility barrier while using the Platform, please contact info@bbu1.com so we can investigate and, where feasible, address it.</p>
              </Section>

              <Section id="confidentiality" title="25. Confidentiality">
                <p>&quot;Confidential Information&quot; means non-public information disclosed by one party to the other that is designated as confidential or would reasonably be understood to be confidential given its nature, including business, financial, and technical information, and, for you, your Customer Data, and for LITONU, non-public aspects of the Platform.</p>
                <p>Each party agrees to use the other party&apos;s Confidential Information only as necessary to perform its obligations under these Terms, to protect it with at least the same degree of care it uses for its own confidential information, and no less than reasonable care, and not to disclose it to third parties except to Affiliates, employees, contractors, and advisors with a need to know who are bound by confidentiality obligations at least as protective as this Section.</p>
                <p>These obligations do not apply to information that is or becomes publicly available through no fault of the receiving party, was rightfully known prior to disclosure, is independently developed without use of the disclosing party&apos;s Confidential Information, or is required to be disclosed by law, provided reasonable notice is given where legally permitted.</p>
              </Section>

              <Section id="disclaimers" title="26. Disclaimers">
                <p>
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, BBU1 IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE,&quot; WITHOUT
                  WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS
                  FOR A PARTICULAR PURPOSE, ACCURACY, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE PLATFORM WILL BE
                  ERROR-FREE, SECURE, OR THAT TAX/COMPLIANCE CALCULATIONS WILL BE ACCURATE FOR YOUR SPECIFIC
                  JURISDICTION.
                </p>
                <p>Nothing in this section limits any consumer protection rights that cannot be excluded under applicable law.</p>
              </Section>

              <Section id="limitation-of-liability" title="27. Limitation of Liability">
                <p>
                  To the maximum extent permitted by law, LITONU&apos;s total aggregate liability arising out of or
                  relating to these Terms or the Platform will not exceed the total fees you paid to LITONU in the
                  12 months immediately preceding the event giving rise to the claim.
                </p>
                <p>
                  LITONU will not be liable for indirect, incidental, consequential, special, or punitive damages, or
                  for loss of profits, revenue, data, or business opportunities, even if advised of the possibility of
                  such damages.
                </p>
                <p>This limitation does not apply to liability that cannot be limited under applicable law, such as death, personal injury caused by negligence, or fraud.</p>
              </Section>

              <Section id="insurance" title="28. Insurance (Enterprise Customers)">
                <p>Where set out in an Order Form for enterprise or custom plans, LITONU will maintain commercially reasonable insurance coverage, which may include general liability, professional liability (errors and omissions), and cyber liability insurance, at levels appropriate to the scope of services provided. Certificates of insurance will be made available to enterprise customers on reasonable request.</p>
              </Section>

              <Section id="export-control" title="29. Export Control and Sanctions Compliance">
                <p>
                  You agree not to use, export, or re-export bbu1 in violation of applicable export control or
                  sanctions laws, including those of Uganda, the United States, the European Union, and the United
                  Nations. You represent that you are not located in, or ordinarily resident in, a country or region
                  subject to comprehensive trade sanctions, and are not on any restricted or denied party list.
                </p>
              </Section>

              <Section id="indemnification" title="30. Indemnification">
                <p>
                  You agree to indemnify and hold harmless LITONU, its officers, directors, employees, and agents from
                  any claims, damages, losses, and expenses, including reasonable legal fees, arising from: (a) your
                  breach of these Terms; (b) your violation of any law; (c) your Customer Data; or (d) your misuse of
                  the Platform.
                </p>
              </Section>

              <Section id="audit-rights" title="31. Audit Rights">
                <p>For enterprise customers subject to regulatory oversight, LITONU will, on reasonable prior written notice and no more than once per year, except where required by a regulator or following a security incident, provide reasonably requested information about LITONU&apos;s security and compliance practices relevant to the Service. This may take the form of a summary report, questionnaire response, or independent audit certification, at LITONU&apos;s discretion, to help you meet your own regulatory or audit obligations.</p>
              </Section>

              <Section id="termination" title="32. Termination">
                <SubHeading>32.1 By You</SubHeading>
                <p>You may terminate your account at any time by cancelling your subscription and ceasing use of the Platform.</p>
                <SubHeading>32.2 By Us</SubHeading>
                <p>We may suspend or terminate your access if you materially breach these Terms, fail to pay fees due, or if we are required to do so by law.</p>
                <SubHeading>32.3 Effect of Termination</SubHeading>
                <p>Upon termination, your right to use bbu1 ends immediately. You remain responsible for any fees accrued before termination. We recommend exporting your Customer Data before cancelling, as we may delete data after a reasonable retention period following termination (see our <a href="/privacy">Privacy Policy</a>).</p>
              </Section>

              <Section id="governing-law" title="33. Governing Law and Dispute Resolution">
                <SubHeading>33.1 Governing Law</SubHeading>
                <p>
                  These Terms are governed by the laws of the Republic of Uganda, without regard to conflict-of-law
                  principles, except where mandatory local consumer protection law in your country requires
                  otherwise, in which case those mandatory protections will apply to the extent required.
                </p>
                <SubHeading>33.2 Dispute Resolution</SubHeading>
                <p>
                  The parties will first attempt to resolve any dispute informally by contacting info@bbu1.com. If
                  not resolved within 30 days, disputes will be subject to the exclusive jurisdiction of the courts
                  of Uganda, unless applicable law in your home country grants you the right to bring proceedings in
                  your local courts, such as EU/UK consumer protection law, in which case that right is preserved.
                </p>
                <SubHeading>33.3 No Class Actions</SubHeading>
                <p>Where permitted by applicable law, disputes will be resolved on an individual basis, and you waive any right to participate in a class or representative action.</p>
              </Section>

              <Section id="complaints" title="34. Complaints and Escalation">
                <p>If you have a complaint about bbu1 or about LITONU&apos;s conduct, contact info@bbu1.com with a description of the issue. We aim to acknowledge complaints promptly and to resolve them fairly. If your complaint is not resolved to your satisfaction, you may escalate it in writing to LITONU&apos;s management at the same address, and, where applicable, you retain any rights to refer the matter to a relevant regulator or to the courts under Section 33.</p>
              </Section>

              <Section id="publicity" title="35. Publicity">
                <p>Neither party may publicly announce this Agreement or use the other party&apos;s name, logo, or trademarks without prior written consent, except that LITONU may list your company name and logo as a customer of bbu1 in marketing materials unless you opt out by contacting info@bbu1.com.</p>
              </Section>

              <Section id="notices" title="36. Notices">
                <p>Notices to LITONU under these Terms must be sent to info@bbu1.com. Notices to you will be sent to the email address or account contact associated with your bbu1 account. Notices are deemed given when sent, provided the sender has no reason to believe delivery failed.</p>
              </Section>

              <Section id="survival" title="37. Survival">
                <p>Sections relating to Your Data and Content, Confidentiality, Intellectual Property, Disclaimers, Limitation of Liability, Indemnification, Governing Law and Dispute Resolution, and any other provision that by its nature should survive, will survive termination or expiration of these Terms.</p>
              </Section>

              <Section id="third-party-beneficiaries" title="38. Third-Party Beneficiaries">
                <p>These Terms are between you and LITONU only. Except as expressly stated, no third party has any right to enforce any term of this Agreement.</p>
              </Section>

              <Section id="changes-to-terms" title="39. Changes to These Terms">
                <p>
                  We may update these Terms from time to time. For material changes, we will provide notice via the
                  Platform or by email at least 30 days before the change takes effect.
                  Continued use of bbu1 after the effective date constitutes acceptance of the updated Terms.
                </p>
              </Section>

              <Section id="general" title="40. General">
                <ul>
                  <li><strong>Entire Agreement:</strong> These Terms, together with our Privacy Policy and any Order Forms, constitute the entire agreement between you and LITONU regarding bbu1.</li>
                  <li><strong>Severability:</strong> If any provision is found unenforceable, the remaining provisions remain in effect.</li>
                  <li><strong>Assignment:</strong> You may not assign your rights under these Terms without our consent. We may assign these Terms in connection with a merger, acquisition, or sale of assets.</li>
                  <li><strong>No Waiver:</strong> Our failure to enforce a provision is not a waiver of our right to do so later.</li>
                  <li><strong>Force Majeure:</strong> We are not liable for delays or failures caused by events beyond our reasonable control.</li>
                  <li><strong>Relationship of the Parties:</strong> The parties are independent contractors. Nothing in these Terms creates a partnership, joint venture, agency, or employment relationship.</li>
                  <li><strong>Language:</strong> These Terms are drafted in English. Any translation is provided for convenience only, and the English version governs in the event of any conflict.</li>
                </ul>
              </Section>

              <Section id="contact" title="41. Contact Us">
                <p>
                  <strong>LITONU BUSINESS BASE UNIVERSE LTD</strong>
                  <br />
                  Kisasi, Kampala
                  <br />
                  Uganda
                </p>
                <p>
                  Email: info@bbu1.com
                  <br />
                  Phone: +256 766 380 103
                </p>
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