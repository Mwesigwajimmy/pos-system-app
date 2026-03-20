import { Metadata } from "next";
import { Calendar, User, ArrowLeft, Tag, Share2, Clock } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

const articles: Record<string, any> = {
  "how-ai-transforms-business": {
    title: "How AI is Transforming Your Business Operations",
    date: "2026-03-12",
    author: "Mwesigwa Jimmy",
    category: "Insights",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=2000&auto=format&fit=crop",
    content: `AI is revolutionizing how businesses operate. From automating routine tasks to providing strategic insights, artificial intelligence is becoming essential for competitive advantage.

## The Current State of AI in Business
Artificial intelligence has moved beyond hype into practical, measurable business impact. Companies using AI are seeing a 30-40% reduction in operational costs and 50% faster decision-making processes.

## How BBU1's Aura AI Transforms Operations
BBU1's Aura AI is your intelligent business assistant that works 24/7 to:
- Automate 100% of bookkeeping and tax filing
- Generate executive reports and strategic insights
- Detect financial anomalies in real-time
- Make data-driven recommendations

The future of business is AI-powered, and the time to start is now.`
  },
  "future-of-automation": {
    title: "The Future of Business Automation",
    date: "2026-03-10",
    author: "Mwesigwa Jimmy",
    category: "Trends",
    image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=2000&auto=format&fit=crop",
    content: `The future of business is automation. Companies that embrace automation will have a significant competitive advantage.

## Why Automation Matters Now
We're at an inflection point where automation technology is more affordable than ever and proven to deliver ROI within months.

## Key Trends to Watch
Combining AI, machine learning, and RPA to handle complex business processes end-to-end. AI-Powered Decision Making and real-time analytics are changing the landscape.

## BBU1's Automation Platform
BBU1 is leading this transformation with comprehensive automation capabilities across accounting, CRM, and supply chain management.`
  },
  "zero-math-automation": {
    title: "Zero Math Automation: Reducing Human Error",
    date: "2026-03-08",
    author: "Mwesigwa Jimmy",
    category: "Engineering",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2000&auto=format&fit=crop",
    content: `Manual calculations are a major source of errors in business. Zero Math Automation eliminates these errors by automating all mathematical operations.

## The Cost of Manual Calculations
Manual calculations lead to 1 error per 300 transactions on average, resulting in compliance violations and penalties.

## What is Zero Math Automation?
Zero Math Automation is a philosophy where no human touches a calculation. All math is handled by verified algorithms with immutable audit trails.

## How BBU1 Implements Zero Math
BBU1's Zero Math feature ensures your business runs error-free by automating all financial calculations and implementing multi-layer verification.`
  }
};

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articles[slug];

  if (!article) notFound();

  return (
    <article className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">
      
      {/* --- HERO SECTION --- */}
      <header className="relative w-full bg-slate-50 border-b border-slate-100">
        <div className="container mx-auto px-6 pt-24 pb-16 max-w-7xl">
          <Link href="/blog" className="inline-flex items-center gap-2 text-blue-600 text-sm font-bold mb-10 hover:translate-x-[-4px] transition-transform">
            <ArrowLeft className="h-4 w-4" /> Back to Journal
          </Link>
          
          <div className="max-w-4xl">
            <span className="bg-blue-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-md uppercase tracking-widest mb-6 inline-block">
              {article.category}
            </span>
            
            {/* Fixed Title: Bold, Straight, Normal Case, Professional Size */}
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
              <p className="text-slate-500 text-sm leading-relaxed">Lead Architect at BBU1, specializing in enterprise-grade AI infrastructure and automation.</p>
            </div>
            <div className="pt-6">
               <button className="flex items-center gap-2 text-slate-900 font-bold text-sm hover:text-blue-600 transition-colors">
                  <Share2 className="h-4 w-4" /> Share this Analysis
               </button>
            </div>
          </aside>

          {/* Article Body */}
          <div className="lg:col-span-8">
            <div className="max-w-3xl text-lg md:text-xl text-slate-700 leading-relaxed font-normal whitespace-pre-wrap">
              {article.content}
            </div>
            
            {/* Professional Footer CTA */}
            <div className="mt-20 p-10 bg-blue-50 border border-blue-100 rounded-3xl">
              <h4 className="text-slate-900 text-xl font-bold mb-4">Ready to automate your operations?</h4>
              <p className="text-slate-600 mb-8">Integrate Aura AI into your business ecosystem and eliminate manual errors today.</p>
              <Link href="/contact" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
                Get Started with BBU1 <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}