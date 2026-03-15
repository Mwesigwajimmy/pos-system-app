import { 
  Users, BarChart3, TrendingUp, Briefcase, Clock, 
  Zap, ShieldCheck, Layers, ShoppingCart, FileText, 
  BrainCircuit, Lock, CheckCircle 
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
    description: "Orchestrate your human capital from recruitment to retirement.",
    longDescription: "A sovereign HR core designed to automate the complexities of workforce management, ensuring local compliance and high-fidelity performance tracking.",
    icon: Users,
    capabilities: [
      "Automated Payroll Engine",
      "Biometric Attendance Sync",
      "Dynamic Leave Management",
      "Performance KPIs & Reviews",
      "Benefits Administration",
      "Digital Employee Dossiers"
    ],
    detailedBreakdown: [
      { name: "Leave Management", detail: "Automate leave requests, approvals, and balance tracking with configurable regional policies." },
      { name: "Recruitment Pipeline", detail: "Streamline hiring from job posting to onboarding with a collaborative engineering-grade recruitment flow." },
      { name: "Performance Architecture", detail: "Set deterministic goals, conduct reviews, and foster growth with integrated data analytics." },
      { name: "Payroll Automation", detail: "Deterministic salary calculations, tax deductions, and payslip generation with multi-currency support." }
    ]
  },
  {
    slug: "crm",
    title: "CRM & Sales",
    description: "Build lasting customer relationships and accelerate the sales cycle.",
    longDescription: "High-fidelity customer relationship management that unifies sales pipelines with service desk operations for a 360-degree business view.",
    icon: TrendingUp,
    capabilities: [
      "Visual Pipeline Management",
      "Automated Lead Scoring",
      "Integrated Helpdesk Support",
      "Marketing ROI Tracking",
      "Customer Segmentation",
      "Sales Forecasting Models"
    ],
    detailedBreakdown: [
      { name: "Sales Pipeline", detail: "Visualize and manage your entire sales process with a customizable, deterministic drag-and-drop pipeline." },
      { name: "Customer Support", detail: "Provide exceptional service with a built-in helpdesk to track, prioritize, and resolve issues with audit logs." },
      { name: "Marketing Automation", detail: "Run targeted email campaigns and track multi-channel marketing ROI within the core system." },
      { name: "Customer Segmentation", detail: "Dynamic segmentation of your customer base for personalized engagement and strategic offers." }
    ]
  },
  {
    slug: "finance-accounting",
    title: "Finance & Accounting",
    description: "Gain complete financial control with AI-powered, GAAP-compliant accounting.",
    longDescription: "An unbreakable financial core featuring double-entry accounting, real-time auditing, and intelligent tax localization for global markets.",
    icon: BarChart3,
    capabilities: [
      "Multi-Currency General Ledger",
      "Real-time P&L & Balance Sheets",
      "Automated Bank Reconciliation",
      "Asset Depreciation Engine",
      "Consolidated Financial Reports",
      "Accounts Payable & Receivable"
    ],
    detailedBreakdown: [
      { name: "Financial Reporting", detail: "Generate high-fidelity P&L, Balance Sheets, and Cash Flow statements with sub-second processing." },
      { name: "Expense Management", detail: "Capture, approve, and reimburse employee expenses seamlessly with zero paper-trail friction." },
      { name: "Advanced Invoicing", detail: "Construct and dispatch professional invoices with automated reminders and multi-gateway payment support." },
      { name: "Zero-Math Bank Sync", detail: "Automate bank reconciliations, matching transactions to your ledger with absolute mathematical precision." }
    ]
  },
  {
    slug: "inventory-supply-chain",
    title: "Inventory & Supply Chain",
    description: "Optimize stock levels, manage warehouses, and streamline logistics.",
    longDescription: "Precision inventory orchestration engine featuring multi-location synchronization, barcode integration, and intelligent demand forecasting.",
    icon: Layers,
    capabilities: [
      "Multi-Warehouse Orchestration",
      "Batch & Serial Number Tracking",
      "Landed Cost Calculation",
      "Automated Reorder Points",
      "Barcode & QR Integration",
      "Supplier Relationship Mgmt"
    ],
    detailedBreakdown: [
      { name: "Multi-Warehouse Mgmt", detail: "Track and transfer inventory across infinite locations or stores in real-time with total visibility." },
      { name: "Purchase Engineering", detail: "Generate, dispatch, and track purchase orders while managing strategic supplier performance metrics." },
      { name: "Stock Level Optimization", detail: "Automate reorder points and receive proactive alerts for low-stock scenarios to prevent outages." },
      { name: "Barcode Architecture", detail: "Accelerate floor operations with integrated scanning for receiving, picking, and dispatch cycles." }
    ]
  },
  {
    slug: "sales-ecommerce",
    title: "Sales & E-commerce",
    description: "Omnichannel commerce from retail POS to global online stores.",
    longDescription: "Unify your physical and digital sales channels into a single high-performance nervous system with real-time stock and order sync.",
    icon: ShoppingCart,
    capabilities: [
      "Sovereign Point of Sale",
      "Online Marketplace Sync",
      "Omnichannel Order Mgmt",
      "Dynamic Pricing Rules",
      "Customer Buying Patterns",
      "BOPIS (Pick-up) Integration"
    ],
    detailedBreakdown: [
      { name: "Sovereign POS", detail: "Intuitive and rapid retail interface with built-in offline synchronization and hardware integration." },
      { name: "Global E-commerce", detail: "Synchronize products, orders, and customer data across your website and physical stores automatically." },
      { name: "Order Fulfillment", detail: "Process sales orders with deterministic status tracking and automated logistics workflows." },
      { name: "Sales Intelligence", detail: "Gain deep insights into product performance and customer buying velocity with executive dashboards." }
    ]
  },
  {
    slug: "project-management",
    title: "Project Management",
    description: "Plan, execute, and track enterprise projects with high-fidelity tools.",
    longDescription: "Deterministic project tracking connecting time entries, resource allocation, and budget profitability in one unified environment.",
    icon: Briefcase,
    capabilities: [
      "Gantt & Kanban Workflows",
      "Resource Utilization Logs",
      "Integrated Time Tracking",
      "Budget vs. Actual Analysis",
      "Client Approval Portals",
      "Milestone Profitability"
    ],
    detailedBreakdown: [
      { name: "Task Orchestration", detail: "Organize projects into tasks, assign owners, and track progress with high-fidelity visual workflows." },
      { name: "Precision Time Tracking", detail: "Accurately log billable and internal hours for precise resource cost analysis and client billing." },
      { name: "Resource Mapping", detail: "Allocate team members effectively across global projects to ensure optimal utilization and scale." },
      { name: "Profitability Analytics", detail: "Monitor project margins in real-time against budgets to prevent scope creep and revenue leakage." }
    ]
  },
  {
    slug: "compliance-governance",
    title: "Compliance & Governance",
    description: "Maintain absolute regulatory adherence and internal audit integrity.",
    longDescription: "A sovereign security core ensuring all business actions are logged, encrypted, and compliant with regional and global standards.",
    icon: ShieldCheck,
    capabilities: [
      "Immutable Audit Trails",
      "Role-Based Access Control",
      "GDPR & Data Privacy Hub",
      "Tax Localization Engine",
      "Document Version Control",
      "Enterprise Fraud Detection"
    ],
    detailedBreakdown: [
      { name: "Audit Integrity", detail: "Maintain a complete, tamper-proof audit trail of every business action with cryptographic verification." },
      { name: "Granular Permissions", detail: "Deploy role-based access controls to manage user visibility and system interaction at the field level." },
      { name: "Document Infrastructure", detail: "Securely store and organize sensitive documents with enterprise-grade encryption and versioning." },
      { name: "Sovereign Tax Engine", detail: "Handle complex transactions in 160+ currencies with localized tax calculation and compliance." }
    ]
  },
  {
    slug: "aura-ai-intelligence",
    title: "Intelligence & Aura AI",
    description: "Transform raw data into actionable insights with the Aura Neural Core.",
    longDescription: "The cognitive layer of BBU1. Aura automates routine cognitive tasks and provides strategic forecasts to drive deterministic growth.",
    icon: BrainCircuit,
    capabilities: [
      "Autonomous Bookkeeping",
      "Predictive Cash Flow Models",
      "Anomaly & Fraud Alerts",
      "Natural Language Queries",
      "Executive Growth Reports",
      "Demand Velocity Patterns"
    ],
    detailedBreakdown: [
      { name: "Aura Copilot", detail: "The AI agent that automates manual data entry and provides proactive strategic alerts." },
      { name: "Neural Dashboards", detail: "Create personalized visual reports using drag-and-drop AI to visualize mission-critical KPIs." },
      { name: "Predictive Engines", detail: "Leverage machine learning to forecast sales trajectories and inventory requirements with high accuracy." },
      { name: "Pattern Detection", detail: "Automatically detect unusual data behaviors, alerting leadership to risks before they impact the bottom line." }
    ]
  }
];