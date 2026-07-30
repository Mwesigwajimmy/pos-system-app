import { 
  Users, BarChart3, TrendingUp, Briefcase, Clock, 
  Zap, ShieldCheck, Layers, ShoppingCart, FileText, 
  BrainCircuit, Lock, CheckCircle, Phone
} from "lucide-react";

export interface FeatureDetailItem {
  name: string;
  detail: string;
}

export interface FeatureSet {
  slug: string;
  title: string;
  description: string;
  longDescription: string;
  icon: any;
  capabilities: string[];
  detailedBreakdown: FeatureDetailItem[];
}

export const featureSets: FeatureSet[] = [
  {
    slug: "human-resources",
    title: "Human Resources",
    description: "Manage your people, from recruitment through to retirement.",
    longDescription: "An HR module that covers the full employee lifecycle — hiring, attendance, payroll, and performance — with settings you can adapt to local labor rules.",
    icon: Users,
    capabilities: [
      "Automated Payroll",
      "Biometric Attendance Sync",
      "Leave Management",
      "Performance Reviews",
      "Benefits Administration",
      "Digital Employee Records"
    ],
    detailedBreakdown: [
      { name: "Leave Management", detail: "Employees submit requests, managers approve from their dashboard, and balances update automatically based on policies you configure per region." },
      { name: "Recruitment Pipeline", detail: "Post a role, collect applications, and move candidates through a shared pipeline your hiring team can see and comment on together." },
      { name: "Performance Reviews", detail: "Set goals for individuals or teams, run review cycles on a schedule, and keep a history of feedback tied to each employee's record." },
      { name: "Payroll Automation", detail: "Salary runs calculate deductions and taxes automatically, generate payslips, and support paying staff in more than one currency." },
      { name: "Attendance & Shifts", detail: "Clock-ins sync from biometric devices or the mobile app, and shift schedules flag conflicts before they become a problem." },
      { name: "Employee Self-Service", detail: "Staff can update their own details, download payslips, and check leave balances without emailing HR." }
    ]
  },
  {
    slug: "crm",
    title: "CRM & Sales",
    description: "Manage customer relationships and move deals through your pipeline.",
    longDescription: "Sales pipeline, customer support, and marketing tools in one place, so your sales and service teams are working from the same customer data.",
    icon: TrendingUp,
    capabilities: [
      "Visual Pipeline",
      "Lead Scoring",
      "Helpdesk & Support",
      "Marketing Campaigns",
      "Customer Segmentation",
      "Sales Forecasting"
    ],
    detailedBreakdown: [
      { name: "Sales Pipeline", detail: "Drag deals through customizable stages, assign owners, and see exactly where every opportunity stands at a glance." },
      { name: "Customer Support", detail: "A built-in helpdesk lets you log, prioritize, and resolve tickets, with a full history attached to each customer record." },
      { name: "Marketing Campaigns", detail: "Run email campaigns to segmented lists and track opens, clicks, and resulting deals without leaving the platform." },
      { name: "Customer Segmentation", detail: "Group customers by purchase history, location, or any custom field, and target communication accordingly." },
      { name: "Activity Timeline", detail: "Every call, email, and meeting is logged against the customer, so anyone on the team can pick up where the last person left off." },
      { name: "Lead Scoring", detail: "Score incoming leads automatically against criteria you define, so your team spends time on the ones most likely to convert." }
    ]
  },
  {
    slug: "finance-accounting",
    title: "Finance & Accounting",
    description: "Real-time, GAAP-compliant accounting with full financial control.",
    longDescription: "A double-entry accounting core with live reporting, bank reconciliation, and tax rules that adapt to the country you operate in.",
    icon: BarChart3,
    capabilities: [
      "General Ledger",
      "Real-Time P&L & Balance Sheet",
      "Bank Reconciliation",
      "Asset Depreciation",
      "Consolidated Reporting",
      "Accounts Payable & Receivable"
    ],
    detailedBreakdown: [
      { name: "Financial Reporting", detail: "Profit & Loss, Balance Sheet, and Cash Flow statements update as transactions post — no month-end wait to see where you stand." },
      { name: "Expense Management", detail: "Staff submit expenses with a photo of the receipt, managers approve from their phone, and reimbursement flows straight to the ledger." },
      { name: "Advanced Invoicing", detail: "Send invoices with automated payment reminders, and accept payments through multiple gateways without manual entry." },
      { name: "Bank Reconciliation", detail: "Imported bank statements are matched against your ledger automatically, with any mismatches flagged for review." },
      { name: "Multi-Currency Accounting", detail: "Transact and report in multiple currencies with exchange rates that update automatically." },
      { name: "Accounts Payable & Receivable", detail: "Track what you owe and what's owed to you in one place, with aging reports that show exactly what's overdue." }
    ]
  },
  {
    slug: "inventory-supply-chain",
    title: "Inventory & Supply Chain",
    description: "Optimize stock levels, manage warehouses, and streamline logistics.",
    longDescription: "Track stock across every location in real time, with barcode scanning, reorder alerts, and landed cost tracking built in.",
    icon: Layers,
    capabilities: [
      "Multi-Warehouse Tracking",
      "Batch & Serial Numbers",
      "Landed Cost Calculation",
      "Automated Reorder Points",
      "Barcode & QR Scanning",
      "Supplier Management"
    ],
    detailedBreakdown: [
      { name: "Multi-Warehouse Management", detail: "See stock levels across every location in real time, and transfer inventory between warehouses with a full audit trail." },
      { name: "Purchase Orders", detail: "Create and send purchase orders, track delivery status, and compare supplier performance over time." },
      { name: "Stock Level Optimization", detail: "Set reorder points per item and get alerted before you run out, instead of finding out at the till." },
      { name: "Barcode Scanning", detail: "Speed up receiving, picking, and dispatch with barcode or QR scanning from the mobile app or a handheld scanner." },
      { name: "Landed Cost Tracking", detail: "Duties, freight, and insurance are factored into your cost price automatically, so your margins reflect the real cost of imported goods." },
      { name: "Supplier Management", detail: "Keep supplier contacts, pricing history, and performance notes in one record tied to every purchase order." }
    ]
  },
  {
    slug: "sales-ecommerce",
    title: "Sales & E-commerce",
    description: "Manage every sales channel, from retail POS to your online store.",
    longDescription: "Run in-store and online sales from the same inventory and customer data, with orders and stock syncing automatically across channels.",
    icon: ShoppingCart,
    capabilities: [
      "Point of Sale",
      "Online Store Sync",
      "Order Management",
      "Dynamic Pricing Rules",
      "Sales Analytics",
      "Click & Collect"
    ],
    detailedBreakdown: [
      { name: "Point of Sale", detail: "A fast, offline-capable checkout that stays in sync with your inventory the moment a connection is available." },
      { name: "E-commerce Sync", detail: "Products, orders, and customer data stay synchronized between your website and physical stores automatically." },
      { name: "Order Fulfillment", detail: "Every sales order moves through clear status stages, from placed to packed to delivered, with automated notifications." },
      { name: "Sales Analytics", detail: "See which products, staff, and locations are performing best, with dashboards you can filter by date range." },
      { name: "Dynamic Pricing", detail: "Set promotional pricing, bulk discounts, or customer-specific rates that apply automatically at checkout." },
      { name: "Click & Collect", detail: "Let customers order online and pick up in-store, with stock reserved automatically the moment they check out." }
    ]
  },
  {
    slug: "project-management",
    title: "Project Management",
    description: "Plan, execute, and track projects with your team in one place.",
    longDescription: "Task management connected to time tracking and budgets, so you can see project profitability alongside progress.",
    icon: Briefcase,
    capabilities: [
      "Task & Kanban Boards",
      "Resource Allocation",
      "Time Tracking",
      "Budget vs. Actual",
      "Client Portal",
      "Milestone Tracking"
    ],
    detailedBreakdown: [
      { name: "Task Management", detail: "Break projects into tasks, assign owners, set deadlines, and track progress on a board your whole team can see." },
      { name: "Time Tracking", detail: "Log billable and internal hours against tasks for accurate client billing and a clear picture of where time goes." },
      { name: "Resource Allocation", detail: "See who's assigned to what across every active project, so you can spot overload before it becomes a bottleneck." },
      { name: "Budget Tracking", detail: "Set a project budget and watch actual spend against it in real time, instead of finding out at the final invoice." },
      { name: "Client Portal", detail: "Give clients a secure, read-only view of project progress, files, and invoices, without access to anything else." },
      { name: "Milestone Tracking", detail: "Break long projects into milestones with their own deadlines and deliverables, so progress is visible at a glance." }
    ]
  },
  {
    slug: "compliance-governance",
    title: "Compliance & Governance",
    description: "Stay compliant and keep strong internal controls.",
    longDescription: "Role-based permissions, audit logs, and configurable tax rules to help you meet regulatory requirements without manual tracking.",
    icon: ShieldCheck,
    capabilities: [
      "Audit Trails",
      "Role-Based Access Control",
      "Data Privacy Tools",
      "Tax Localization",
      "Document Version Control",
      "Fraud Detection"
    ],
    detailedBreakdown: [
      { name: "Audit Trails", detail: "Every action in the system is logged with a timestamp and user ID, giving you a complete record for internal or external audits." },
      { name: "Role-Based Access", detail: "Control exactly what each user can see and do, down to individual fields, so sensitive data stays with the right people." },
      { name: "Document Management", detail: "Store business documents with version history and access permissions, so nothing gets overwritten by accident." },
      { name: "Tax & Currency Rules", detail: "Configure tax rates and reporting rules per region, so transactions calculate and report correctly wherever you operate." },
      { name: "Fraud Detection", detail: "Unusual transaction patterns are flagged automatically, so you can investigate before a small issue becomes a big loss." },
      { name: "Data Privacy Tools", detail: "Manage consent, data retention, and access requests to help meet GDPR and other regional privacy regulations." }
    ]
  },
  {
    slug: "telecom-services",
    title: "Telecom Services",
    description: "An end-to-end solution for telecom and agent-based businesses.",
    longDescription: "Manage agent networks, mobile money float, and airtime or data products from one dashboard, built for high-volume telecom operations.",
    icon: Phone,
    capabilities: [
      "Agent Hierarchy & Commissions",
      "Real-Time Float Monitoring",
      "Reconciliation & Settlement",
      "Risk & Financial Controls",
      "Airtime & Data Configuration",
      "Subscriber Management"
    ],
    detailedBreakdown: [
      { name: "Admin Dashboard", detail: "See your entire telecom operation, from agent performance to financial health, in one dashboard." },
      { name: "Agent Management", detail: "Onboard and manage large agent networks with commission structures and hierarchical controls." },
      { name: "Reconciliation & Settlement", detail: "Automate reconciliations between your systems, MNOs, and partners for accurate, timely settlements." },
      { name: "Financial Controls", detail: "Set limits, commissions, and controls across your agent network to manage risk." },
      { name: "Product Configuration", detail: "Configure airtime, data bundles, mobile money, and other telecom products." },
      { name: "Subscriber Management", detail: "Manage subscriber accounts, activations, and support for your telecom offerings." }
    ]
  },
  {
    slug: "business-intelligence-ai",
    title: "Business Intelligence & AI",
    description: "Turn your business data into decisions with AI-assisted analytics.",
    longDescription: "Aura is the assistant built into BBU1. It helps with day-to-day bookkeeping, flags anomalies, and answers plain-language questions about your own data.",
    icon: BrainCircuit,
    capabilities: [
      "Automated Bookkeeping",
      "Predictive Cash Flow",
      "Anomaly Alerts",
      "Natural Language Queries",
      "Custom Dashboards",
      "Demand Forecasting"
    ],
    detailedBreakdown: [
      { name: "Aura Copilot", detail: "Ask questions like \"what was our best-selling category last week\" and get an answer pulled directly from your data." },
      { name: "Anomaly Detection", detail: "Aura flags things like duplicate payments or unusual spending so you can review them before they become a problem." },
      { name: "Custom Dashboards", detail: "Build dashboards with drag-and-drop tools to track the metrics that matter most to your business." },
      { name: "Forecasting", detail: "Get sales and inventory projections based on your own historical data, updated as new transactions come in." },
      { name: "Data Integration", detail: "Bring data from every module — sales, inventory, finance — into one place, instead of exporting from five different systems to build a report." },
      { name: "Cash Flow Projection", detail: "See likely cash flow gaps weeks in advance, based on outstanding invoices and recurring expenses." }
    ]
  }
];