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
  ShoppingCart,
  Utensils
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
    description: "A practical introduction to automating routine tasks in your business, from process mapping to measuring the return on your effort.",
    duration: "4 weeks",
    lessons: 12,
    level: "Beginner",
    topics: ["Process Mapping", "What to Automate First", "Measuring ROI", "Common Pitfalls"],
    certified: false,
    category: "Free",
    icon: Zap
  },
  {
    id: 2,
    title: "Introduction to AI in Business",
    description: "A beginner-friendly look at where AI actually helps in day-to-day operations, without requiring a technical background.",
    duration: "3 weeks",
    lessons: 9,
    level: "Beginner",
    topics: ["AI Basics for Non-Engineers", "Where AI Helps (and Where It Doesn't)", "Reading Predictive Reports", "Industry Examples"],
    certified: false,
    category: "Free",
    icon: BrainCircuit
  },
  {
    id: 3,
    title: "Financial Management Basics",
    description: "The core principles of accounting and financial reporting, taught for business owners rather than accountants.",
    duration: "5 weeks",
    lessons: 15,
    level: "Beginner",
    topics: ["Double-Entry Basics", "Reading a P&L and Balance Sheet", "Cash Flow Fundamentals", "Digital Ledgers"],
    certified: false,
    category: "Free",
    icon: Landmark
  },
  {
    id: 4,
    title: "CRM Fundamentals",
    description: "How to build a sales pipeline and customer relationships that actually last, using the CRM tools already in BBU1.",
    duration: "3 weeks",
    lessons: 10,
    level: "Beginner",
    topics: ["Building a Sales Pipeline", "Customer Segmentation", "Improving Sales Velocity", "Customer Retention"],
    certified: false,
    category: "Free",
    icon: Users
  },
  {
    id: 5,
    title: "Aura AI in Practice",
    price: "$299",
    description: "A hands-on course on using Aura for forecasting and reporting, and knowing when to trust it versus verify it yourself.",
    duration: "8 weeks",
    lessons: 30,
    level: "Advanced",
    certified: true,
    category: "Certification",
    topics: ["Setting Up Aura for Your Business", "Predictive Models Explained", "Building Dashboards", "Data-Driven Decision Making"],
    icon: BrainCircuit
  },
  {
    id: 6,
    title: "Financial Compliance Across Markets",
    price: "$249",
    description: "Practical training on managing tax rules, reporting standards, and audits when your business operates in more than one country.",
    duration: "10 weeks",
    lessons: 35,
    level: "Advanced",
    certified: true,
    category: "Certification",
    topics: ["International Tax Basics", "Audit Preparation", "IFRS Reporting", "Managing Regulatory Risk"],
    icon: ShieldCheck
  },
  {
    id: 7,
    title: "Operations & Supply Chain Management",
    price: "$279",
    description: "Practical inventory forecasting and logistics planning for businesses managing multiple warehouses or delivery routes.",
    duration: "8 weeks",
    lessons: 28,
    level: "Intermediate",
    certified: true,
    category: "Certification",
    topics: ["Inventory Forecasting", "Route Optimization", "Landed Cost Calculation", "Supplier Management"],
    icon: BarChart3
  },
  {
    id: 8,
    title: "E-Commerce & Retail Operations",
    price: "$269",
    description: "How to run in-store and online sales from the same system, with a focus on inventory sync and the customer experience.",
    duration: "7 weeks",
    lessons: 25,
    level: "Intermediate",
    certified: true,
    category: "Certification",
    topics: ["Omnichannel Setup", "Retail Analytics", "Inventory Sync", "Customer Experience Design"],
    icon: ShoppingCart
  },
  {
    id: 9,
    title: "Restaurant & Hospitality Management",
    price: "$259",
    description: "Running high-volume restaurant operations well, from recipe costing to scaling a single location into a small chain.",
    duration: "6 weeks",
    lessons: 22,
    level: "Intermediate",
    certified: true,
    category: "Certification",
    topics: ["Kitchen Display Systems", "Recipe Costing", "Labor Scheduling", "Scaling to Multiple Locations"],
    icon: Utensils
  },
  {
    id: 10,
    title: "HR & Payroll Management",
    price: "$219",
    description: "Practical workforce management, covering compliant payroll, hiring workflows, and performance reviews across regions.",
    duration: "7 weeks",
    lessons: 24,
    level: "Intermediate",
    certified: true,
    category: "Certification",
    topics: ["Payroll Fundamentals", "Regional HR Compliance", "Performance Reviews", "Recruitment Workflows"],
    icon: Users
  },
  {
    id: 11,
    title: "Lending & Microfinance Operations",
    price: "$289",
    description: "Running a lending operation well, from credit scoring and loan origination to managing a healthy loan portfolio.",
    duration: "9 weeks",
    lessons: 32,
    level: "Advanced",
    certified: true,
    category: "Certification",
    topics: ["Credit Risk Basics", "Loan Origination", "MFI Operations", "Portfolio Health Analysis"],
    icon: Award
  },
  {
    id: 12,
    title: "Project Management & Profitability",
    price: "$249",
    description: "Delivering projects on time and on budget, with a focus on tracking profitability alongside progress.",
    duration: "7 weeks",
    lessons: 26,
    level: "Intermediate",
    certified: true,
    category: "Certification",
    topics: ["Gantt & Kanban Planning", "Resource Allocation", "Budget Variance Tracking", "Stakeholder Management"],
    icon: GraduationCap
  }
];