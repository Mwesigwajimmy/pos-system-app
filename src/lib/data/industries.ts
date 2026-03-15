import { 
  ShoppingCart, Stethoscope, DollarSign, Truck, Utensils, 
  Building2, Briefcase, GraduationCap, Users, Zap, Leaf, 
  Palette, Code, Hammer, Home, TrendingUp, ShieldCheck
} from "lucide-react";

export interface Industry {
  slug: string;
  name: string;
  icon: any;
  description: string;
  longDescription: string;
  challenges: string[];
  solutions: string[];
  keyFeatures: string[];
}

export const industries: Industry[] = [
  {
    slug: "retail",
    name: "Retail & Wholesale",
    icon: ShoppingCart,
    description: "Unified POS, inventory, and CRM for retail operations.",
    longDescription: "Complete retail management system engineered for modern multi-location businesses, providing real-time visibility from storefront to warehouse.",
    challenges: ["Managing multiple locations", "Real-time inventory tracking", "Complex pricing and promotions", "Vendor management"],
    solutions: ["Centralized POS system", "Automated inventory synchronization", "Dynamic pricing engine", "Integrated vendor management"],
    keyFeatures: ["POS System", "Inventory Sync", "Customer Analytics"]
  },
  {
    slug: "healthcare",
    name: "Healthcare & Clinics",
    icon: Stethoscope,
    description: "Secure healthcare operations and patient management.",
    longDescription: "Sovereign healthcare infrastructure ensuring HIPAA-compliant patient data security and seamless clinic operations.",
    challenges: ["Patient data security", "Appointment scheduling", "Billing and insurance", "Compliance requirements"],
    solutions: ["HIPAA-compliant system", "Automated scheduling", "Smart billing integration", "Audit trail management"],
    keyFeatures: ["Patient Records", "Appointment Scheduling", "Inventory"]
  },
  {
    slug: "finance",
    name: "Finance & Microfinance",
    icon: DollarSign,
    description: "Advanced financial operations and loan portfolio management.",
    longDescription: "Specialized core banking module for MFIs and Lenders, automating the entire loan lifecycle from origination to collection.",
    challenges: ["Complex regulations", "Risk management", "Data security", "Real-time reporting"],
    solutions: ["Regulatory compliance tools", "Risk assessment automation", "Enterprise-grade security", "Real-time analytics"],
    keyFeatures: ["Loan Management", "Disbursement Tracking", "KYC Process"]
  },
  {
    slug: "logistics",
    name: "Distribution & Logistics",
    icon: Truck,
    description: "Warehouse management and fleet optimization.",
    longDescription: "Intelligent supply chain coordination featuring route optimization and real-time fleet tracking.",
    challenges: ["Fuel cost management", "Inefficient routing", "Vehicle underutilization", "Real-time tracking"],
    solutions: ["AI-powered route optimization", "Fuel monitoring systems", "Automated dispatching", "Warehouse management integration"],
    keyFeatures: ["Warehouse Mgmt", "Fleet Tracking", "Route Optimization"]
  },
  {
    slug: "sacco",
    name: "SACCO / Co-operative",
    icon: Users,
    description: "Member management and automated dividend calculation.",
    longDescription: "A unified operating core for cooperatives to manage shares, savings, and member dividends with absolute audit integrity.",
    challenges: ["Manual calculation errors", "Fraud detection", "Member communication", "Regulatory reporting"],
    solutions: ["Automated dividend engine", "Immutable audit trails", "Member self-service portals", "Instant financial reporting"],
    keyFeatures: ["Member Management", "Dividend Calculation", "Savings Tracking"]
  },
  {
    slug: "professional-services",
    name: "Professional Services",
    icon: Briefcase,
    description: "Project tracking and time billing for agencies.",
    longDescription: "High-fidelity project management integrated with automated billing for law firms, consultants, and creative agencies.",
    challenges: ["Unbilled billable hours", "Project margin visibility", "Client retainer management", "Resource allocation"],
    solutions: ["Automated time tracking", "Real-time project P&L", "Integrated retainer billing", "Unified client portals"],
    keyFeatures: ["Project Tracking", "Time Billing", "Client Portal"]
  },
  {
    slug: "manufacturing",
    name: "Manufacturing",
    icon: Hammer,
    description: "BOM, production planning, and work orders.",
    longDescription: "Industrial-grade resource planning for manufacturers, handling complex assembly structures and production floor scheduling.",
    challenges: ["Material waste", "Production delays", "Inventory inaccuracy", "Quality control logs"],
    solutions: ["Multi-level Bill of Materials", "Real-time floor scheduling", "Automated reorder points", "Integrated quality audits"],
    keyFeatures: ["BOM Management", "Production Planning", "Work Orders"]
  },
  {
    slug: "construction",
    name: "Construction & Engineering",
    icon: Building2,
    description: "Job costing and project management.",
    longDescription: "Sovereign engineering infrastructure for contractors to manage equipment, labor, and progress billing across multiple sites.",
    challenges: ["Site labor tracking", "Equipment maintenance", "Progress billing errors", "Budget overruns"],
    solutions: ["Mobile site reporting", "Fleet maintenance logs", "AIA style progress billing", "Integrated job costing"],
    keyFeatures: ["Job Costing", "Resource Management", "Progress Tracking"]
  },
  {
    slug: "education",
    name: "Education & Institutions",
    icon: GraduationCap,
    description: "Student systems and fee management.",
    longDescription: "A unified academic operating system for schools and universities to manage admissions, grading, and automated fee collections.",
    challenges: ["Fee collection tracking", "Academic record integrity", "Parent communication", "Exam management"],
    solutions: ["Automated fee billing", "Secure student portals", "Integrated grading systems", "Real-time attendance logs"],
    keyFeatures: ["Student Records", "Fee Management", "Attendance Tracking"]
  },
  {
    slug: "agriculture",
    name: "Agriculture & Agribusiness",
    icon: Leaf,
    description: "Farm management and crop tracking.",
    longDescription: "Precision digital core for commercial farms to manage inputs, track crop cycles, and analyze seasonal harvest yields.",
    challenges: ["Input stock leakage", "Harvest yield visibility", "Labor management", "Cycle tracking"],
    solutions: ["Digital input inventory", "Yield forecasting models", "Field labor tracking", "Automated crop logs"],
    keyFeatures: ["Farm Planning", "Crop Tracking", "Harvest Management"]
  },
  {
    slug: "creative",
    name: "Creative Agencies",
    icon: Palette,
    description: "Portfolio tracking and client billing.",
    longDescription: "The business engine for creativity. Manage digital assets, project milestones, and agency-level profitability in one core.",
    challenges: ["Milestone tracking", "Freelancer cost management", "Asset versioning", "Profitability visibility"],
    solutions: ["Milestone-based billing", "External cost tracking", "Digital asset hub", "Consolidated agency analytics"],
    keyFeatures: ["Project Portfolio", "Time Tracking", "Client Billing"]
  },
  {
    slug: "technology",
    name: "Tech & Software",
    icon: Code,
    description: "Subscription billing and issue tracking.",
    longDescription: "Scalable infrastructure for SaaS and IT firms to manage recurring revenue, license distribution, and technical support.",
    challenges: ["Churn management", "MRR accuracy", "SLA tracking", "Ticket resolution time"],
    solutions: ["Automated MRR analytics", "License management engine", "SLA monitoring hub", "Integrated support desk"],
    keyFeatures: ["Subscription Mgmt", "Issue Tracking", "License Management"]
  }
];