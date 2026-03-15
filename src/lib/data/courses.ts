import { 
  BookOpen, 
  Zap, 
  Users, 
  Award, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  GraduationCap, 
  ShieldCheck, 
  BrainCircuit, 
  Landmark, 
  BarChart3,
  ShoppingCart, // ADDED
  Utensils      // ADDED
} from "lucide-react";

export interface Course {
  id: number;
  title: string;
  description: string;
  duration: string;
  lessons: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  topics: string[];
  price?: string;
  certified: boolean;
  category: "Free" | "Certification";
  icon: any;
}

export const courses: Course[] = [
  {
    id: 1,
    title: "Business Automation Fundamentals",
    description: "Architect the basics of business automation and transform your operational core.",
    duration: "4 weeks",
    lessons: 12,
    level: "Beginner",
    topics: ["Automation Architecture", "Process Mapping", "Optimization Logic", "ROI Calculation"],
    certified: false,
    category: "Free",
    icon: Zap
  },
  {
    id: 2,
    title: "Introduction to AI in Business",
    description: "Navigate cognitive infrastructure and AI applications without deep technical overhead.",
    duration: "3 weeks",
    lessons: 9,
    level: "Beginner",
    topics: ["Neural Logic Basics", "Machine Learning Patterns", "Predictive Analytics", "Industry Use-Cases"],
    certified: false,
    category: "Free",
    icon: BrainCircuit
  },
  {
    id: 3,
    title: "Sovereign Financial Management 101",
    description: "Master the deterministic foundations of modern financial accounting and transparency.",
    duration: "5 weeks",
    lessons: 15,
    level: "Beginner",
    topics: ["Double-Entry Principles", "High-Fidelity Reporting", "Cash Flow Orchestration", "Digital Ledger Management"],
    certified: false,
    category: "Free",
    icon: Landmark
  },
  {
    id: 4,
    title: "CRM & Relationship Architecture",
    description: "Build unbreakable customer lifecycles using high-performance CRM systems.",
    duration: "3 weeks",
    lessons: 10,
    level: "Beginner",
    topics: ["Pipeline Engineering", "Customer Segmentation", "Sales Velocity", "Retention Logic"],
    certified: false,
    category: "Free",
    icon: Users
  },
  {
    id: 5,
    title: "Aura Intelligence & AI Mastery",
    price: "$299",
    description: "Advanced engineering course on leveraging the Aura Neural Core for strategic decision-making.",
    duration: "8 weeks",
    lessons: 30,
    level: "Advanced",
    certified: true,
    category: "Certification",
    topics: ["Neural Engine Integration", "Advanced Predictive Models", "Data Visualization", "Algorithmic Strategy"],
    icon: BrainCircuit
  },
  {
    id: 6,
    title: "Financial Engineering & Global Compliance",
    price: "$249",
    description: "Tier-1 training on complex financial systems and multi-market regulatory adherence.",
    duration: "10 weeks",
    lessons: 35,
    level: "Advanced",
    certified: true,
    category: "Certification",
    topics: ["International Tax Codes", "Audit Integrity", "IFRS Compliance", "Sovereign Risk Mgmt"],
    icon: ShieldCheck
  },
  {
    id: 7,
    title: "Operations & Supply Chain Excellence",
    price: "$279",
    description: "Optimize global inventory orchestration and logistics for maximum business velocity.",
    duration: "8 weeks",
    lessons: 28,
    level: "Intermediate",
    certified: true,
    category: "Certification",
    topics: ["Inventory Forecasting", "Route Optimization", "Landed Costing", "Supplier Integrity"],
    icon: BarChart3
  },
  {
    id: 8,
    title: "E-Commerce & Retail Transformation",
    price: "$269",
    description: "Re-engineer retail models using modern POS, cloud-sync, and omnichannel logic.",
    duration: "7 weeks",
    lessons: 25,
    level: "Intermediate",
    certified: true,
    category: "Certification",
    topics: ["Omnichannel Architecture", "Retail Data Analytics", "Inventory Sync", "UX Psychology"],
    icon: ShoppingCart
  },
  {
    id: 9,
    title: "Hospitality Management Systems",
    price: "$259",
    description: "Master high-volume restaurant operations from recipe precision to global scaling.",
    duration: "6 weeks",
    lessons: 22,
    level: "Intermediate",
    certified: true,
    category: "Certification",
    topics: ["KDS Orchestration", "Ingredient Costing", "Labor Optimization", "Scaling Logic"],
    icon: Utensils
  },
  {
    id: 10,
    title: "HRM & Capital Orchestration",
    price: "$219",
    description: "Strategic workforce management covering automated compliance and global payroll.",
    duration: "7 weeks",
    lessons: 24,
    level: "Intermediate",
    certified: true,
    category: "Certification",
    topics: ["Payroll Engineering", "Regulatory HR", "Performance KPIs", "Talent Acquisition"],
    icon: Users
  },
  {
    id: 11,
    title: "Fintech & Lending Infrastructure",
    price: "$289",
    description: "Scale lending operations with portfolio risk-scoring and automated collections.",
    duration: "9 weeks",
    lessons: 32,
    level: "Advanced",
    certified: true,
    category: "Certification",
    topics: ["Credit Risk Modeling", "Loan Origination Logic", "MFI Operations", "Portfolio Analysis"],
    icon: Award
  },
  {
    id: 12,
    title: "Project Architecture & Profitability",
    price: "$249",
    description: "Deliver complex enterprise projects on-time with deterministic profitability tracking.",
    duration: "7 weeks",
    lessons: 26,
    level: "Intermediate",
    certified: true,
    category: "Certification",
    topics: ["Gantt Logic", "Resource Allocation", "Budget Variance", "Stakeholder Mgmt"],
    icon: GraduationCap
  }
];