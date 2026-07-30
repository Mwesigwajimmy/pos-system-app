import { 
  ShoppingCart, Stethoscope, DollarSign, Truck, Utensils, 
  Building2, Briefcase, GraduationCap, Users, Zap, Leaf, 
  Palette, Code, Hammer, Home, Car, Heart
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
    slug: "retail-wholesale",
    name: "Retail & Wholesale",
    icon: ShoppingCart,
    description: "Unified POS, inventory, and CRM for retail operations.",
    longDescription: "Run your physical stores, e-commerce, and warehouse from one connected platform, so stock levels and customer data stay accurate everywhere.",
    challenges: ["Managing multiple locations", "Real-time inventory tracking", "Complex pricing and promotions", "Vendor management"],
    solutions: ["Centralized POS across every location", "Automated inventory synchronization", "Configurable pricing and discount rules", "Built-in purchase order and vendor tracking"],
    keyFeatures: ["POS System", "Inventory Sync", "Customer Loyalty"]
  },
  {
    slug: "restaurant-cafe",
    name: "Restaurant & Cafe",
    icon: Utensils,
    description: "Complete management with KDS, tables, and recipes.",
    longDescription: "Run a tighter kitchen and a smoother front-of-house, from table reservations to ingredient-level inventory.",
    challenges: ["Slow order communication to the kitchen", "Food waste and over-ordering", "Table turnover and reservations", "Split billing complexity"],
    solutions: ["Kitchen Display System integration", "Recipe costing tied to ingredient stock", "Table management with live status", "Flexible split and group billing"],
    keyFeatures: ["Kitchen Display", "Recipe Costing", "Table Management"]
  },
  {
    slug: "professional-services",
    name: "Professional Services",
    icon: Briefcase,
    description: "Project tracking and time billing for agencies.",
    longDescription: "Connect project management with billing, so every billable hour is captured and invoiced accurately.",
    challenges: ["Unbilled hours going untracked", "Unclear project margins", "Client retainer management", "Resource allocation across projects"],
    solutions: ["Automated time tracking", "Real-time project profitability", "Retainer and recurring billing built in", "Team workload visibility across projects"],
    keyFeatures: ["Project Tracking", "Time Billing", "Client Portal"]
  },
  {
    slug: "manufacturing",
    name: "Manufacturing",
    icon: Hammer,
    description: "Bills of materials, production planning, and work orders.",
    longDescription: "Manage multi-level Bills of Materials, work-in-progress, and production scheduling from one system.",
    challenges: ["Material waste", "Production delays", "Inventory inaccuracy", "Quality control tracking"],
    solutions: ["Multi-level Bill of Materials", "Real-time production scheduling", "Automated reorder points", "Built-in quality checks at each stage"],
    keyFeatures: ["BOM Management", "Production Planning", "Work Orders"]
  },
  {
    slug: "construction-engineering",
    name: "Construction & Engineering",
    icon: Building2,
    description: "Job costing and project management for contractors.",
    longDescription: "Purpose-built tools for contractors to manage job costing, equipment, and progress billing across multiple sites.",
    challenges: ["Tracking labor across sites", "Equipment maintenance schedules", "Progress billing errors", "Budget overruns"],
    solutions: ["Mobile site reporting", "Fleet and equipment maintenance logs", "AIA-style progress billing", "Real-time job costing against budget"],
    keyFeatures: ["Job Costing", "Resource Management", "Progress Billing"]
  },
  {
    slug: "field-service",
    name: "Field Service Management",
    icon: Car,
    description: "Scheduling and technician tracking for mobile teams.",
    longDescription: "Dispatch jobs to technicians, track their location, and let them invoice and collect payment on-site through the mobile app.",
    challenges: ["Inefficient job scheduling", "No visibility into technician location", "Delayed invoicing after job completion", "Managing recurring maintenance contracts"],
    solutions: ["Visual dispatch board", "Mobile app with live technician location", "On-site invoicing and signature capture", "Recurring maintenance contract tracking"],
    keyFeatures: ["Dispatch Board", "Mobile App", "On-Site Invoicing"]
  },
  {
    slug: "distribution-logistics",
    name: "Distribution & Logistics",
    icon: Truck,
    description: "Warehouse management and fleet optimization.",
    longDescription: "Coordinate warehouse operations and delivery routes with real-time fleet tracking.",
    challenges: ["Fuel cost management", "Inefficient delivery routing", "Vehicle underutilization", "Real-time shipment tracking"],
    solutions: ["Route optimization", "Fuel and fleet monitoring", "Automated dispatching", "Warehouse management fully integrated with sales"],
    keyFeatures: ["Warehouse Mgmt", "Fleet Tracking", "Route Optimization"]
  },
  {
    slug: "lending-microfinance",
    name: "Lending & Microfinance",
    icon: DollarSign,
    description: "Loan accounts, disbursements, and portfolio management.",
    longDescription: "Manage the full loan lifecycle for MFIs and lenders, from application and credit scoring to disbursement and collections.",
    challenges: ["Complex lending regulations", "Credit risk assessment", "Sensitive borrower data security", "Real-time portfolio reporting"],
    solutions: ["Configurable compliance rules", "Automated credit scoring", "Encrypted, access-controlled borrower records", "Real-time portfolio analytics"],
    keyFeatures: ["Loan Management", "Disbursement Tracking", "KYC Process"]
  },
  {
    slug: "real-estate",
    name: "Real Estate & Property Management",
    icon: Home,
    description: "Property management and tenant billing.",
    longDescription: "Manage residential or commercial leases, automate rent invoicing, and track maintenance in one dashboard.",
    challenges: ["Manual rent collection tracking", "Lease renewal management", "Maintenance request delays", "Owner reporting"],
    solutions: ["Automated rent invoicing and collection", "Lease tracking with renewal alerts", "Maintenance ticketing", "Landlord and owner statements"],
    keyFeatures: ["Lease Management", "Rent Invoicing", "Maintenance Tracking"]
  },
  {
    slug: "sacco-cooperative",
    name: "SACCO & Co-operative",
    icon: Users,
    description: "Member management and automated dividend calculation.",
    longDescription: "Manage member shares, savings, and loans, with dividend calculations and regulatory reporting handled automatically.",
    challenges: ["Manual calculation errors", "Fraud detection", "Member communication", "Regulatory reporting"],
    solutions: ["Automated dividend calculation engine", "Full audit trail on every transaction", "Member self-service portal", "Instant financial reporting"],
    keyFeatures: ["Member Management", "Dividend Calculation", "Savings Tracking"]
  },
  {
    slug: "telecom",
    name: "Telecom Services",
    icon: Zap,
    description: "Mobile money, airtime, and agent network management.",
    longDescription: "Manage large agent networks, reconcile float in real time, and handle high-volume airtime and data transactions securely.",
    challenges: ["Agent float reconciliation", "Commission accuracy", "Fraud in agent transactions", "Real-time monitoring across a large agent base"],
    solutions: ["Automated float reconciliation", "Commission calculated per transaction", "Fraud detection alerts", "Live agent performance dashboard"],
    keyFeatures: ["Agent Management", "Float Monitoring", "Commission Tracking"]
  },
  {
    slug: "nonprofit-ngo",
    name: "Nonprofit & NGOs",
    icon: Heart,
    description: "Donor management, fund accounting, and grant tracking.",
    longDescription: "Track restricted funds, manage donor relationships, and report on program outcomes in line with grant requirements.",
    challenges: ["Restricted fund tracking", "Donor relationship management", "Grant compliance reporting", "Program budget accountability"],
    solutions: ["Fund accounting by grant or program", "Donor CRM with pledge tracking", "Automated compliance reports", "Budget vs. actual tracking per program"],
    keyFeatures: ["Grant Accounting", "Donor CRM", "Impact Reporting"]
  },
  {
    slug: "healthcare",
    name: "Healthcare & Clinics",
    icon: Stethoscope,
    description: "Secure healthcare operations and patient management.",
    longDescription: "Manage patient records, appointments, and pharmacy inventory with strict access controls.",
    challenges: ["Patient data security", "Appointment scheduling", "Billing and insurance", "Compliance requirements"],
    solutions: ["Role-based access to patient records", "Automated scheduling and reminders", "Integrated billing with insurance support", "Full audit trail for compliance"],
    keyFeatures: ["Patient Records", "Appointment Scheduling", "Pharmacy Inventory"]
  },
  {
    slug: "education",
    name: "Education & Institutions",
    icon: GraduationCap,
    description: "Student systems and fee management.",
    longDescription: "Manage admissions and academic records, and automate fee billing and collections, for administrators and parents alike.",
    challenges: ["Fee collection tracking", "Academic record management", "Parent communication", "Exam and grading management"],
    solutions: ["Automated fee billing and reminders", "Secure student and parent portals", "Integrated grading system", "Real-time attendance tracking"],
    keyFeatures: ["Student Records", "Fee Management", "Attendance Tracking"]
  },
  {
    slug: "agriculture",
    name: "Agriculture & Agribusiness",
    icon: Leaf,
    description: "Farm management and crop tracking.",
    longDescription: "Track farm inputs, crop cycles, and harvest yields to plan the next season with better data.",
    challenges: ["Input stock tracking", "Harvest yield forecasting", "Labor management", "Crop cycle tracking"],
    solutions: ["Digital input inventory", "Yield forecasting from historical data", "Field labor tracking", "Automated crop cycle logs"],
    keyFeatures: ["Farm Planning", "Crop Tracking", "Harvest Management"]
  },
  {
    slug: "creative-agencies",
    name: "Creative Agencies",
    icon: Palette,
    description: "Portfolio tracking and client billing.",
    longDescription: "Manage digital assets, project milestones, and profitability for creative teams and agencies.",
    challenges: ["Milestone tracking across projects", "Freelancer cost management", "Asset version control", "Profitability visibility per project"],
    solutions: ["Milestone-based billing", "Freelancer cost tracking", "Digital asset management with versioning", "Consolidated agency profitability reports"],
    keyFeatures: ["Project Portfolio", "Time Tracking", "Client Billing"]
  },
  {
    slug: "tech-software",
    name: "Tech & Software",
    icon: Code,
    description: "Subscription billing and issue tracking.",
    longDescription: "Manage recurring revenue, license distribution, and technical support from one platform.",
    challenges: ["Churn tracking", "MRR accuracy", "SLA compliance", "Support ticket resolution time"],
    solutions: ["Automated MRR analytics", "License management engine", "SLA monitoring", "Integrated support desk"],
    keyFeatures: ["Subscription Mgmt", "Issue Tracking", "License Management"]
  }
];