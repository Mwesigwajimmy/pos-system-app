import { Metadata } from "next";
import { Calendar, User, ArrowLeft, Tag, Share2, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

// --- FULL DATASET FOR ALL 8 ARTICLES ---
const articles: Record<string, any> = {
  "how-ai-transforms-business": {
    title: "How AI is Transforming Your Business Operations",
    date: "2026-03-12",
    author: "Mwesigwa Jimmy",
    category: "Insights",
    image: "/images/showcase/future-of-business-tech.jpg",
    content: `AI is no longer a luxury for elite tech firms; it is the fundamental engine of modern business competition. Traditional software simply records history. AI, specifically the Aura Neural Core, architects the future.

## The Shift from Reactive to Proactive
Most ERP systems wait for you to input data and then ask for a report. Aura AI works in reverse. It monitors your general ledger, inventory levels, and sales pipelines 24/7. It identifies a cash flow gap three weeks before it happens, allowing you to move capital strategically rather than reacting to a crisis.

## Automation of the Mundane
The most immediate transformation is the elimination of manual bookkeeping. Aura categorizes transactions with 99.9% accuracy using Zero-Math protocols. This doesn't just save time; it eliminates the human fatigue that leads to expensive audit errors and compliance penalties.

## Strategic Decision Support
When an executive asks, "Should we open a new branch in Entebbe?", Aura doesn't just look at past sales. It analyzes market trends, localized tax implications, and operational overhead to provide a high-fidelity recommendation backed by data. This is how BBU1 empowers SMEs to act with the strategic weight of global conglomerates.`
  },
  "future-of-automation": {
    title: "The Future of Business Automation",
    date: "2026-03-10",
    author: "Mwesigwa Jimmy",
    category: "Trends",
    image: "/images/showcase/Greeting (41).jpeg",
    content: `The next decade will belong to the autonomous enterprise. We are moving beyond simple "if-this-then-that" rules into a world of self-healing business systems that manage the complexities of global commerce.

## The End of the Integration Tax
For years, businesses have paid an "Integration Tax"—the hidden cost of using disconnected tools. The future is a single, sovereign operating system where CRM, Accounting, and Logistics live in one kernel. This unity allows data to flow at the speed of thought.

## Hyper-Personalization at Scale
Automation will allow even small shops to provide a bespoke experience to every customer. By automating the tracking of preferences and buying habits, businesses can trigger personalized offers and support interactions without human intervention.

## Autonomous Compliance
Imagine a world where your tax filings and regulatory reports are generated and verified by AI the moment a transaction is closed. This is the core engineering goal of BBU1. We are building a system where compliance is a background process, not a monthly crisis.`
  },
  "zero-math-automation": {
    title: "Zero Math Automation: Reducing Human Error",
    date: "2026-03-08",
    author: "Mwesigwa Jimmy",
    category: "Engineering",
    image: "/images/showcase/education-dashboard.jpg",
    content: `Human beings are excellent at strategy but notoriously poor at repetitive mathematical accuracy. Zero Math Automation is our philosophy of removing the human hand from the calculation process entirely.

## Why Zero Math Matters
In a traditional business, an employee calculates a discount, then a tax, then a total. Every touchpoint is an opportunity for a mistake. BBU1's kernel handles all financial logic through verified, deterministic algorithms that ensure 100% precision.

## Immutable Audit Trails
Because the system performs every calculation, every result is backed by an unbreakable trail. You don't have to wonder why a balance is off; you can trace the algorithmic logic back to the source transaction with absolute certainty.

## Engineering Certainty
Zero Math is about trust. When you present your reports to a board, an investor, or an auditor, you should do so with the certainty that the numbers are mathematically irrefutable. This foundation of accuracy is what allows for true global scaling.`
  },
  "digital-transformation-sme": {
    title: "Digital Transformation for SMEs",
    date: "2026-03-06",
    author: "Mwesigwa Jimmy",
    category: "Growth",
    image: "/images/showcase/retail-system-customer-service.jpg",
    content: `Digital transformation is often misunderstood as simply buying new hardware. For an SME, true transformation is the re-engineering of how value is created, tracked, and scaled.

## Leveling the Playing Field
Historically, high-tier enterprise software was reserved for massive corporations. BBU1 changes this dynamic. We provide the same "Neural Core" to a local startup that was previously only accessible to multi-billion dollar firms.

## Operational Velocity
The biggest advantage an SME has is speed. Digital transformation amplifies this. When your inventory, sales, and accounts are synced in real-time, you can pivot your strategy in hours rather than months based on actual data.

## Sovereignty and Equity
Many SMEs fear losing control of their data to big tech. BBU1’s commitment to data sovereignty ensures that your business intelligence remains your asset. Transformation should empower the owner, not the vendor.`
  },
  "inventory-management-revolution": {
    title: "The Inventory Management Revolution",
    date: "2026-03-04",
    author: "Mwesigwa Jimmy",
    category: "Supply Chain",
    image: "/images/showcase/ai-warehouse-logistics.jpg",
    content: `Inventory is frozen capital. The revolution in inventory management is about turning that capital back into liquid cash flow as fast as humanly possible through intelligent synchronization.

## Real-time Multi-Warehouse Sync
The days of "calling the warehouse" are over. BBU1 provides a unified view across all locations. If an item sells in Kampala, the warehouse in Entebbe knows instantly. This eliminates stock discrepancies and double-selling.

## Predictive Reordering
Aura AI analyzes your sales velocity and seasonal trends to suggest reorder points. It prevents "out-of-stock" disasters while ensuring you aren't over-leveraged in slow-moving items that eat up warehouse space.

## Landed Cost Accuracy
Importing goods is complex. The revolution includes automated calculation of landed costs—duties, freight, and insurance. This gives you the true margin on every item, allowing you to price for profit with total clarity.`
  },
  "aura-ai-cutting-edge-intelligence": {
    title: "Aura AI: The Cutting-Edge of Intelligence",
    date: "2026-03-02",
    author: "Mwesigwa Jimmy",
    category: "Product Updates",
    image: "/images/showcase/Greeting (10).jpeg",
    content: `Aura is not a chatbot or a novelty; it is a specialized, deterministic intelligence layer running across your entire business ecosystem to ensure operational excellence.

## Engineering Transparency
Unlike "Black Box" AIs, Aura provides the logic for its insights. It shows you the irrefutable data points it used to arrive at a conclusion, ensuring that the human executive always remains in final control of the strategy.

## Pattern Recognition
Aura identifies correlations invisible to the human eye. It might notice that whenever a specific supplier is late, your sales in a specific region drop three weeks later. These insights allow for proactive supply chain adjustments.

## Continuous Monitoring
Aura never sleeps. It scans your ledger for anomalies, duplicate payments, and fraud signatures 24 hours a day, providing an unbreakable layer of security that traditional software simply cannot match.`
  },
  "unbreakable-offline-mode-continuity": {
    title: "Unbreakable Offline Mode: Continuity Anywhere",
    date: "2026-02-28",
    author: "Mwesigwa Jimmy",
    category: "Features",
    image: "/images/showcase/artisan-cooperative-tech.jpg",
    content: `In the real world, internet connectivity is not a guarantee. When the connection fails, your business shouldn't. BBU1 is built with a "Local-First" architecture designed for survival.

## Seamless Synchronization
Your Point of Sale and Inventory systems continue to function perfectly without a connection. Transactions are stored securely on the local device and sync automatically the millisecond a connection is detected.

## Conflict Resolution
Our sync engine uses sophisticated algorithms to ensure that data from multiple offline devices merges perfectly in the cloud. We handle complex inventory deductions and financial updates with total integrity.

## Business on Your Terms
Connectivity becomes a bonus feature rather than a prerequisite for operation. Your staff can continue to serve customers and manage stock without ever seeing a "Connection Lost" error. This is engineering certainty.`
  },
  "sacco-transformation-success-story": {
    title: "Success Story: SACCO Digital Transformation",
    date: "2026-02-25",
    author: "Mwesigwa Jimmy",
    category: "Success Stories",
    image: "/images/showcase/System Image Generat (42).jpeg",
    content: `From manual ledger books to an automated powerhouse. This is the story of how a 500-member SACCO re-engineered their community trust through BBU1.

## The Challenge
Loan calculations were taking days, and errors in interest tracking were destroying member trust. Manual records made auditing almost impossible, leading to friction between the board and members.

## The BBU1 Solution
By implementing the BBU1 Lending Module, approval times dropped from 48 hours to just 10 minutes. Dividend distribution for hundreds of members became a single-click process rather than a week-long ordeal.

## Building Lasting Trust
Transparency is the foundation of a successful SACCO. Members now receive real-time updates on their shares and loan balances, creating a culture of honesty that allowed the SACCO to double its capital within 12 months of integration.`
  }
};

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articles[slug];

  if (!article) notFound();

  return (
    <article className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">
      
      {/* --- HEADER SECTION --- */}
      <header className="relative w-full bg-slate-50 border-b border-slate-100">
        <div className="container mx-auto px-6 pt-24 pb-16 max-w-7xl">
          <Link href="/blog" className="inline-flex items-center gap-2 text-blue-600 text-sm font-bold mb-10 hover:translate-x-[-4px] transition-transform">
            <ArrowLeft className="h-4 w-4" /> Back to Journal
          </Link>
          
          <div className="max-w-4xl">
            <span className="bg-blue-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-md uppercase tracking-widest mb-6 inline-block">
              {article.category}
            </span>
            
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-8">
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500 font-medium">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                   <User className="h-4 w-4 text-blue-600" />
                </div>
                <span>By {article.author}</span>
              </div>
              <span className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {article.date}</span>
              <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> 6 min read</span>
            </div>
          </div>
        </div>
      </header>

      {/* --- FEATURED IMAGE --- */}
      <div className="container mx-auto px-6 -mt-10 max-w-7xl">
        <div className="relative aspect-[21/9] w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
          <Image 
            src={article.image} 
            alt={article.title} 
            fill 
            className="object-cover" 
            priority 
          />
        </div>
      </div>

      {/* --- CONTENT SECTION --- */}
      <div className="container mx-auto px-6 py-20 max-w-7xl">
        <div className="grid lg:grid-cols-12 gap-16">
          
          {/* Sidebar Info */}
          <aside className="lg:col-span-3 space-y-10 border-r border-slate-100 pr-8 hidden lg:block">
            <div className="space-y-4">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">About the Author</p>
              <p className="text-slate-900 text-lg font-bold">{article.author}</p>
              <p className="text-slate-500 text-sm leading-relaxed">Specializing in enterprise-grade AI infrastructure and deterministic business automation at BBU1.</p>
            </div>
            <div className="pt-6">
               <button className="flex items-center gap-2 text-slate-900 font-bold text-sm hover:text-blue-600 transition-colors">
                  <Share2 className="h-4 w-4" /> Share Analysis
               </button>
            </div>
            <div className="pt-8 border-t border-slate-100">
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <CheckCircle2 className="h-6 w-6 text-blue-600 mb-3" />
                <p className="text-sm font-semibold text-blue-900">Enterprise Verified</p>
                <p className="text-xs text-blue-700 mt-1">This insight is backed by BBU1 engineering standards.</p>
              </div>
            </div>
          </aside>

          {/* Article Body */}
          <div className="lg:col-span-8">
            <div className="max-w-3xl text-lg md:text-xl text-slate-700 leading-relaxed font-normal whitespace-pre-wrap prose prose-slate prose-blue lg:prose-xl">
              {article.content}
            </div>
            
            {/* Professional Footer CTA */}
            <div className="mt-20 p-10 bg-blue-50 border border-blue-100 rounded-3xl">
              <h4 className="text-slate-900 text-xl font-bold mb-2">Ready to re-engineer your operations?</h4>
              <p className="text-slate-600 mb-8">Deploy the BBU1 Neural Core and eliminate operational friction today.</p>
              <Link href="/contact" className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
                Interface with BBU1 <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}