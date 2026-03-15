import { Metadata } from "next";
import { Calendar, User, ArrowLeft, Tag, Share2 } from "lucide-react";
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
    <article className="min-h-screen bg-[#020617] text-slate-300">
      <div className="relative h-[70vh] w-full flex items-end pb-24">
        <Image src={article.image} alt={article.title} fill className="object-cover opacity-40 grayscale-[0.5]" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/40 to-transparent" />
        <div className="container mx-auto px-6 relative z-10">
          <Link href="/blog" className="inline-flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-12 hover:gap-4 transition-all">
            <ArrowLeft className="h-4 w-4" /> Back to Journal
          </Link>
          <span className="bg-blue-600 text-white text-[10px] font-black px-6 py-2 rounded-full uppercase tracking-widest mb-8 inline-block">
            {article.category}
          </span>
          <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-none max-w-5xl uppercase italic">
            {article.title}
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-6 py-24">
        <div className="grid lg:grid-cols-12 gap-20">
          <div className="lg:col-span-3 space-y-12">
            <div className="space-y-4">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Lead Author</p>
              <p className="text-white text-xl font-bold">{article.author}</p>
            </div>
            <div className="space-y-4">
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Published On</p>
              <p className="text-white text-xl font-bold">{article.date}</p>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="max-w-3xl space-y-10 text-xl md:text-2xl leading-relaxed font-light whitespace-pre-wrap">
              {article.content}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}