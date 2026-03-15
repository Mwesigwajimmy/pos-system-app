export interface ManualPhase {
  phase: string;
  description: string;
}

export interface TechnicalManual {
  title: string;
  verticalCode: string;
  standardTax: string;
  phases: ManualPhase[];
  summary: string;
}

export const technicalManuals: TechnicalManual[] = [
  {
    title: 'Retail & Wholesale',
    verticalCode: 'retail',
    standardTax: '16.00% VAT/Sales Tax',
    phases: [
      { phase: 'PHASE 1: SYSTEM BIRTH (SIGNUP & HYDRATION)', description: 'Identity entry, vertical selection, automatic 16% VAT profile creation, 100% Row-Level Security (RLS) activation.' },
      { phase: 'PHASE 2: RE-CONFIGURING THE TAX ENGINE', description: 'Optional tax customization. Users can delete defaults and create custom tax rates for different jurisdictions.' },
      { phase: 'PHASE 3: BUILDING THE INVENTORY COMMAND CENTER', description: 'Category creation, product entry with automatic tax calculations, bulk adjustment capabilities, SKU and stock level management.' },
      { phase: 'PHASE 4: THE SALES & POS EXPERIENCE', description: 'Products automatically flow to POS, real-time inventory checking, payment method selection, automatic stock deduction and ledger posting.' },
      { phase: 'PHASE 5: MANUAL INVOICING', description: 'Creation of invoices for wholesale/credit clients, automatic tax application, aged receivables tracking.' },
      { phase: 'PHASE 6: ZERO-MATH REPORTING & AUDITING', description: 'Live P&L reports, tax liability breakdown, comprehensive audit trail for all actions.' },
      { phase: 'PHASE 7: ASK AURA (THE AI CFO)', description: 'Natural language queries like "Aura, what was our most profitable category today?" providing instant insights.' }
    ],
    summary: 'SUMMARY: User handles signup and product entry. BBU1 handles all math, taxing, stock deduction, ledger posting, invoicing, and audit logging automatically.'
  },
  {
    title: 'SACCO & Co-operative',
    verticalCode: 'sacco',
    standardTax: '0.00% (Tax-Exempt)',
    phases: [
      { phase: 'PHASE 1: SYSTEM BIRTH', description: 'SACCO legal name entry, administrator details, automatic 0% tax rate configuration, activation of member, loan, and savings modules with RLS.' },
      { phase: 'PHASE 2: SETTING UP FINANCIAL PRODUCTS', description: 'Savings products creation, share products with price per share, loan products with interest rate definition (Reducing Balance or Straight Line).' },
      { phase: 'PHASE 3: MEMBER ONBOARDING & KYC', description: 'Member creation with KYC data, next of kin entry, automatic account creation and linking to savings accounts and share ledger.' },
      { phase: 'PHASE 4: MANAGING CONTRIBUTIONS', description: 'Processing deposits for savings or shares, automatic ledger sync, share calculation, professional receipt generation.' },
      { phase: 'PHASE 5: THE AUTOMATED LOAN LIFECYCLE', description: 'Loan applications, collateral and guarantor linking, automatic amortization schedule generation, disbursement, and automated repayment handling.' },
      { phase: 'PHASE 6: DIVIDEND DISTRIBUTION', description: 'Automatic dividend calculation based on shareholding percentage, one-click distribution to all member accounts.' },
      { phase: 'PHASE 7: AUDITING & REPORTING', description: 'Unchangeable audit trails, real-time financial statements, member-specific statements showing all transactions.' }
    ],
    summary: 'SUMMARY: Zero math required. Loans, interest, dividends, and all member transactions are calculated by the BBU1 Sovereign Kernel.'
  },
  {
    title: 'Telecom & Mobile Money',
    verticalCode: 'telecom',
    standardTax: '20.00% Excise/Telecom Tax',
    phases: [
      { phase: 'PHASE 1: SYSTEM BIRTH', description: 'Agency name entry, automatic 20% excise tax configuration, activation of float, commission, and transaction modules.' },
      { phase: 'PHASE 2: PROVIDER & SERVICE SETUP', description: 'Provider configuration (MTN, Airtel, Orange), service definition (Deposit, Airtime, Data), float balance initialization.' },
      { phase: 'PHASE 3: AGENT & BRANCH MANAGEMENT', description: 'Agent onboarding, role assignment, float allocation from main entity to individual agents with automatic balance tracking.' },
      { phase: 'PHASE 4: TRANSACTION EXECUTION', description: 'Service selection, automatic float update, cash account update, commission calculation.' },
      { phase: 'PHASE 5: AUTOMATED COMMISSION & TAXATION', description: 'Commission rule setup, automatic calculation per transaction, 20% tax on commission liability tracking.' },
      { phase: 'PHASE 6: FLOAT RECONCILIATION & AUDIT', description: 'Daily float sync verification, mismatch alerts, complete audit trail with actor_id and timestamps.' }
    ],
    summary: 'SUMMARY: Float integrity is maintained. Commission accuracy guaranteed. 20% telecom tax handled entirely by BBU1 Sovereign Kernel.'
  },
  {
    title: 'Contractor & Remodeling',
    verticalCode: 'contractor',
    standardTax: '16.00% Construction/VAT Tax',
    phases: [
      { phase: 'PHASE 1: SYSTEM BIRTH', description: 'Company name entry, automatic 16% construction tax configuration, activation of projects, work orders, procurement, job costs modules.' },
      { phase: 'PHASE 2: PROJECT & CLIENT ONBOARDING', description: 'Client entry in CRM, project creation with name and total contract value, unique project_id creation.' },
      { phase: 'PHASE 3: WORK ORDERS & LABOR ALLOCATION', description: 'Work order creation, employee assignment, automatic labor cost posting based on hourly rates.' },
      { phase: 'PHASE 4: PROCUREMENT & REAL-TIME JOB COSTING', description: 'Material requisition with project linking, automatic 16% VAT calculation, real-time budget monitoring.' },
      { phase: 'PHASE 5: THE CHANGE ORDER PROTECTOR', description: 'Change order creation, automatic impact calculation, contract value increase and invoicing schedule update.' },
      { phase: 'PHASE 6: AUTOMATED PROGRESS BILLING', description: 'Invoice creation by project percentage, automatic 16% tax application, aged receivables tracking.' }
    ],
    summary: 'SUMMARY: Total cost visibility with automatic labor and material linking. Change order control prevents profit loss.'
  },
  {
    title: 'Distribution & Wholesale',
    verticalCode: 'distribution',
    standardTax: '16.00% VAT/Sales Tax',
    phases: [
      { phase: 'PHASE 1: MASTER DATA SETUP', description: 'Warehouse/hub creation, vehicle registry with fleet details, route mapping for geographic grouping of sales.' },
      { phase: 'PHASE 2: INVENTORY PROCUREMENT', description: 'Bulk purchase orders, automatic 16% input VAT calculation, stock ingestion with inventory valuation.' },
      { phase: 'PHASE 3: THE VAN LOADING PROCESS', description: 'Van load creation, vehicle and driver selection, automatic warehouse stock deduction and van inventory update.' },
      { phase: 'PHASE 4: ROUTE EXECUTION & COLD CHAIN', description: 'Driver delivery logging, cold chain temperature monitoring for perishables with live system alerts.' },
      { phase: 'PHASE 5: ROUTE SETTLEMENT', description: 'Return reconciliation: loaded vs. delivered items, expected cash calculation, automatic ledger posting.' }
    ],
    summary: 'SUMMARY: Zero leakage. Every bottle and cent is accounted for. Van route settlement forces reconciliation before day close.'
  },
  {
    title: 'Field Service',
    verticalCode: 'field_service',
    standardTax: '16.00% Standard Service Tax',
    phases: [
      { phase: 'PHASE 1: SERVICE & TEAM CONFIGURATION', description: 'Service catalog creation, automatic 16% tax addition to base prices, staff/technician registry.' },
      { phase: 'PHASE 2: THE APPOINTMENT ENGINE', description: 'Customer onboarding in CRM, appointment scheduling with automatic collision detection.' },
      { phase: 'PHASE 3: FIELD EXECUTION & STOCK CONSUMPTION', description: 'Job start/finish tracking, material part selection, automatic inventory deduction, cost attachment.' },
      { phase: 'PHASE 4: THE 16% AUTOMATED INVOICE', description: 'Automatic invoice generation with service price + materials + labor, automatic 16% tax application.' }
    ],
    summary: 'SUMMARY: Collision-free booking. Every consumable tracked and billed. 16% service tax fully automated per job.'
  },
  {
    title: 'Lending & Microfinance',
    verticalCode: 'lending',
    standardTax: '0.00% (Principal not taxed)',
    phases: [
      { phase: 'PHASE 1: THE PRODUCT FACTORY', description: 'Loan product definition, interest rate setting, interest type selection (Reducing Balance or Amortized).' },
      { phase: 'PHASE 2: BORROWER ONBOARDING', description: 'Borrower CRM data entry, KYC documentation upload, AML compliance enforcement.' },
      { phase: 'PHASE 3: CREDIT RISK & SCORING', description: 'Automated credit history analysis, risk grade assignment, configurable threshold for auto-decline.' },
      { phase: 'PHASE 4: LOAN APPLICATION & DISBURSEMENT', description: 'Application creation with collateral, manager approval, automatic amortization schedule and ledger posting.' },
      { phase: 'PHASE 5: DEBT COLLECTIONS & RECOVERY', description: 'Automated arrears flagging (1+ days late), automatic penalty trigger, field agent portal tracking.' }
    ],
    summary: 'SUMMARY: Mathematical certainty in amortization and interest. Integrated KYC, scoring, and collateral tracking.'
  },
  {
    title: 'Professional Services',
    verticalCode: 'professional',
    standardTax: '18.00% Professional Service Tax',
    phases: [
      { phase: 'PHASE 1: THE EXPERTISE ARCHITECTURE', description: 'Billing rate definition by seniority, automatic 18% tax preparation for rate calculations.' },
      { phase: 'PHASE 2: SECURE DOCUMENT VAULT', description: 'Encrypted file upload module, tenant_id linking, medication/vaccine tracking via lot numbers.' },
      { phase: 'PHASE 3: EXECUTION (TIME TRACKING)', description: 'Task start/stop logs, automatic time_entry recording, billable mark-up, automatic rate matching.' },
      { phase: 'PHASE 4: THE AUTOMATED PROFESSIONAL INVOICE', description: 'One-click invoice generation aggregating all billable time, automatic 18% professional service tax addition.' },
      { phase: 'PHASE 5: GLOBAL DATA RESIDENCY', description: 'GDPR/POPIA ready. ISO-certified environment with local data isolation protocols for sensitive records.' }
    ],
    summary: 'SUMMARY: Absolute privacy with RLS for sensitive records. Automated billability converts time to money.'
  }
];