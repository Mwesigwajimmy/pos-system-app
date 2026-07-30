import { LucideIcon, BrainCircuit, Zap, Users, ShieldCheck, TrendingUp, Cpu, BarChart3, Globe } from 'lucide-react';

export interface BlogSection {
  heading: string;
  body: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  author: string;
  publishDate: string;
  category: "Insights" | "Trends" | "Engineering" | "Growth" | "Supply Chain" | "Product Updates" | "Features" | "Success Stories";
  image: string;
  icon: any;
  sections: BlogSection[];
}

export const blogPosts: BlogPost[] = [
  {
    slug: "how-ai-transforms-business",
    title: "How AI Is Changing Day-to-Day Business Operations",
    description: "AI isn't just automation with extra steps. Here's what actually changes when your books, inventory, and sales data are watched continuously instead of reviewed monthly.",
    author: "Mwesigwa Jimmy",
    publishDate: "2026-03-12",
    category: "Insights",
    icon: BrainCircuit,
    image: "/images/showcase/future-of-business-tech.jpg",
    sections: [
      {
        heading: "From reactive to proactive",
        body: "Most business software waits for you to ask for a report. Aura, BBU1's built-in assistant, works the other way around — it watches your ledger, inventory, and sales pipeline continuously, so it can flag a cash flow gap three weeks before it happens instead of a month after."
      },
      {
        heading: "Less manual bookkeeping",
        body: "The most immediate change is fewer manual entries. Aura categorizes routine transactions automatically, which cuts down on the small errors that pile up over a year and turn into a stressful audit."
      },
      {
        heading: "Decision support, not decisions",
        body: "When you're weighing something like opening a new branch, Aura can surface relevant trends, tax implications, and overhead estimates from your own data — but the decision, and the judgment behind it, stays with you."
      }
    ]
  },
  {
    slug: "future-of-automation",
    title: "Where Business Automation Is Headed",
    description: "The next wave of automation isn't about more rules — it's about fewer disconnected tools. Here's what that shift looks like in practice.",
    author: "Mwesigwa Jimmy",
    publishDate: "2026-03-10",
    category: "Trends",
    icon: TrendingUp,
    image: "/images/showcase/Greeting (41).jpeg",
    sections: [
      {
        heading: "The cost of disconnected tools",
        body: "Most businesses run separate apps for CRM, accounting, and logistics, and pay for it in reconciliation time — someone has to keep all three in sync by hand. Bringing them into one platform removes that manual step entirely."
      },
      {
        heading: "Personalization without extra headcount",
        body: "When purchase history and preferences live in one place, even a small shop can send a relevant offer to a repeat customer automatically, without a marketing team behind it."
      },
      {
        heading: "Compliance as a background process",
        body: "The goal is for tax filings and regulatory reports to generate themselves from transactions as they happen, so compliance stops being a stressful end-of-month scramble."
      }
    ]
  },
  {
    slug: "zero-math-automation",
    title: "Reducing Manual Errors in Bookkeeping",
    description: "People are good at judgment and bad at repetitive arithmetic. Here's why we push as much of the calculation work as possible onto the system instead of the person.",
    author: "Mwesigwa Jimmy",
    publishDate: "2026-03-08",
    category: "Engineering",
    icon: Cpu,
    image: "/images/showcase/education-dashboard.jpg",
    sections: [
      {
        heading: "Why we automate the math, not the judgment",
        body: "In a manual workflow, someone calculates a discount, then a tax, then a total — and every one of those steps is a place a mistake can creep in. BBU1 handles that chain of calculations automatically, so the only manual step is approving the outcome."
      },
      {
        heading: "A traceable record for every number",
        body: "Every calculated figure is tied back to the transaction that produced it. If a balance looks off, you can trace it to the source instead of re-deriving it by hand."
      },
      {
        heading: "Why this matters as you grow",
        body: "The bigger your transaction volume, the more a small manual error rate compounds. Automating the arithmetic is what lets your books stay accurate as the number of transactions climbs."
      }
    ]
  },
  {
    slug: "digital-transformation-sme",
    title: "What Digital Transformation Actually Looks Like for a Small Business",
    description: "It's not about buying new hardware. It's about closing the gap between when something happens in your business and when you find out about it.",
    author: "Mwesigwa Jimmy",
    publishDate: "2026-03-06",
    category: "Growth",
    icon: Globe,
    image: "/images/showcase/retail-system-customer-service.jpg",
    sections: [
      {
        heading: "Tools that used to be out of reach",
        body: "Real-time inventory, unified customer records, and live financial reporting used to require an enterprise IT budget. That same tooling is now within reach of a single-location retailer or a two-person consultancy."
      },
      {
        heading: "Speed is the real advantage",
        body: "When your inventory, sales, and accounts update in real time, you can act on what's actually happening this week instead of waiting for a month-end report to tell you what already happened."
      },
      {
        heading: "Your data stays yours",
        body: "Moving to a unified platform doesn't mean losing control of your data. You should be able to export everything at any time — transformation should make you less dependent on any one vendor, not more."
      }
    ]
  },
  {
    slug: "inventory-management-revolution",
    title: "Turning Sitting Stock Into Cash Flow",
    description: "Inventory that isn't moving is capital you can't use anywhere else. Here's how real-time visibility and better reordering change that.",
    author: "Mwesigwa Jimmy",
    publishDate: "2026-03-04",
    category: "Supply Chain",
    icon: BarChart3,
    image: "/images/showcase/ai-warehouse-logistics.jpg",
    sections: [
      {
        heading: "One view across every location",
        body: "If an item sells at one branch, every other branch and your central warehouse see the updated count instantly. That alone eliminates most of the double-selling and stock discrepancies that come from checking in by phone."
      },
      {
        heading: "Reordering based on actual sales velocity",
        body: "Aura looks at your sales trends and seasonal patterns to suggest reorder points, which helps avoid both running out of fast movers and over-ordering stock that sits on the shelf."
      },
      {
        heading: "Knowing your true margin",
        body: "Landed cost — duties, freight, and insurance — gets calculated into your cost price automatically, so the margin you see for an imported item is the real one, not just the invoice price."
      }
    ]
  },
  {
    slug: "aura-ai-cutting-edge-intelligence",
    title: "Aura AI: How It Actually Works",
    description: "Aura isn't a general chatbot bolted onto the platform. Here's what it's actually built to do, and where a human still needs to make the call.",
    author: "Mwesigwa Jimmy",
    publishDate: "2026-03-02",
    category: "Product Updates",
    icon: BrainCircuit,
    image: "/images/showcase/Greeting (10).jpeg",
    sections: [
      {
        heading: "It shows its work",
        body: "When Aura surfaces an insight, it points to the specific data points behind it, so you can check its reasoning instead of taking a recommendation on faith."
      },
      {
        heading: "Finding patterns across modules",
        body: "Because Aura sees data from accounting, inventory, and sales together, it can spot connections a person checking each system separately might miss — like a late supplier in one region showing up as a sales dip elsewhere weeks later."
      },
      {
        heading: "Continuous monitoring",
        body: "Aura scans for anomalies like duplicate payments or unusual spending around the clock, and flags them for review rather than acting on its own."
      }
    ]
  },
  {
    slug: "unbreakable-offline-mode-continuity",
    title: "Keeping Your Business Running Without Internet",
    description: "Connectivity isn't guaranteed everywhere. Here's how BBU1 keeps point of sale and inventory working when the connection drops, and syncs everything back up once it returns.",
    author: "Mwesigwa Jimmy",
    publishDate: "2026-02-28",
    category: "Features",
    icon: ShieldCheck,
    image: "/images/showcase/artisan-cooperative-tech.jpg",
    sections: [
      {
        heading: "Local-first, not cloud-only",
        body: "Your point of sale and inventory tools run primarily off the device itself. Transactions are saved locally the instant they happen, connection or not."
      },
      {
        heading: "Syncing back up safely",
        body: "The moment a connection returns, everything syncs to the cloud in the background. If multiple devices were offline and made conflicting updates, the sync engine reconciles them instead of silently overwriting one."
      },
      {
        heading: "What this means day to day",
        body: "Your staff can keep serving customers and adjusting stock without a 'connection lost' error interrupting the sale. Connectivity becomes something you have, not something you depend on."
      }
    ]
  },
  {
    slug: "sacco-transformation-success-story",
    title: "What a SACCO Gains From Digitizing Loan Operations",
    description: "A look at what typically changes for a savings and credit cooperative when loan calculations, approvals, and dividend distribution move off paper ledgers.",
    author: "Mwesigwa Jimmy",
    publishDate: "2026-02-25",
    category: "Success Stories",
    icon: Users,
    image: "/images/showcase/System Image Generat (42).jpeg",
    sections: [
      {
        heading: "The problem with manual ledgers",
        body: "For many SACCOs, loan calculations and interest tracking are still done by hand. That's slow, and small errors in interest tracking are exactly the kind of thing that erodes member trust over time."
      },
      {
        heading: "What changes with a digital lending module",
        body: "Loan approvals that used to take days can be reviewed in minutes once credit checks and amortization schedules calculate automatically. Dividend distribution across hundreds of members becomes a single run instead of a manual, error-prone process repeated per member."
      },
      {
        heading: "Why transparency matters most",
        body: "The biggest shift isn't speed — it's that members can see their own shares and loan balances update in real time. That visibility is usually what rebuilds trust faster than anything else."
      }
    ]
  }
];