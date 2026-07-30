import {
  Calendar, User, ArrowLeft, Share2, Clock,
  ArrowRight, Link2, X, Globe2, MessageCircle
} from "lucide-react";
import BackNavbar from '@/components/BackNavbar';
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { blogPosts } from '@/lib/data/blog';

function estimateReadMinutes(sections: { heading: string; body: string }[]): number {
  const wordCount = sections.reduce((total, s) => total + s.heading.split(' ').length + s.body.split(' ').length, 0);
  return Math.max(1, Math.round(wordCount / 200));
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = blogPosts.find(p => p.slug === slug);

  if (!article) notFound();

  const readMinutes = estimateReadMinutes(article.sections);

  // --- SOCIAL SHARING LINKS ---
  const articleUrl = `https://bbu1.com/blog/${slug}`;
  const shareMessage = `${article.title} — BBU1 Journal`;

  const shareLinks = {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${encodeURIComponent(articleUrl)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(shareMessage + " " + articleUrl)}`
  };

  return (
    <article className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">
      <BackNavbar backHref="/blog" backLabel="Blog" />

      {/* --- HERO --- */}
      <header className="relative w-full bg-slate-50 border-b border-slate-100">
        <div className="container mx-auto px-6 pt-24 pb-16 max-w-7xl">
          <Link href="/blog" className="inline-flex items-center gap-2 text-blue-600 text-sm font-semibold mb-10 hover:gap-3 transition-all">
            <ArrowLeft className="h-4 w-4" /> Back to Journal
          </Link>

          <div className="max-w-4xl">
            <span className="bg-blue-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-md uppercase tracking-widest mb-6 inline-block">
              {article.category}
            </span>

            <h1 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight leading-tight mb-6">
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500 font-medium">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                   <User className="h-4 w-4 text-blue-600" />
                </div>
                <span>By {article.author}</span>
              </div>
              <span className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {new Date(article.publishDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> {readMinutes} min read</span>
            </div>
          </div>
        </div>
      </header>

      {/* --- FEATURED IMAGE --- */}
      <div className="container mx-auto px-6 -mt-8 max-w-7xl">
        <div className="relative aspect-[21/9] w-full rounded-2xl overflow-hidden shadow-xl border border-slate-200">
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>

      {/* --- CONTENT --- */}
      <div className="container mx-auto px-6 py-16 max-w-7xl">
        <div className="grid lg:grid-cols-12 gap-16">

          {/* Sidebar */}
          <aside className="lg:col-span-3 space-y-10 border-r border-slate-100 pr-8 hidden lg:block">

            <div className="space-y-5">
               <p className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                 <Share2 className="h-4 w-4" /> Share
               </p>
               <div className="grid grid-cols-2 gap-3">
                  <a href={shareLinks.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center h-11 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-600 hover:text-blue-600 transition-all">
                     <Link2 className="h-4.5 w-4.5" />
                  </a>
                  <a href={shareLinks.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center h-11 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-400 hover:text-blue-400 transition-all">
                     <X className="h-4.5 w-4.5" />
                  </a>
                  <a href={shareLinks.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center h-11 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-700 hover:text-blue-700 transition-all">
                     <Globe2 className="h-4.5 w-4.5" />
                  </a>
                  <a href={shareLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center h-11 rounded-xl bg-slate-50 border border-slate-200 hover:border-green-500 hover:text-green-500 transition-all">
                     <MessageCircle className="h-4.5 w-4.5" />
                  </a>
               </div>
            </div>

            <div className="space-y-3 pt-8 border-t border-slate-100">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Written by</p>
              <p className="text-slate-900 text-base font-bold">{article.author}</p>
              <p className="text-slate-500 text-sm leading-relaxed">Founder at BBU1, writing about business automation and operations.</p>
            </div>
          </aside>

          {/* Article Body */}
          <div className="lg:col-span-8">
            <div className="max-w-3xl space-y-10">
              {article.sections.map((section, i) => (
                <div key={i}>
                  <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight mb-3">{section.heading}</h2>
                  <p className="text-lg text-slate-700 leading-relaxed">{section.body}</p>
                </div>
              ))}
            </div>

            {/* Footer CTA */}
            <div className="mt-16 p-8 bg-blue-50 border border-blue-100 rounded-2xl">
              <h4 className="text-slate-900 text-lg font-bold mb-2">Want to see this in your own business?</h4>
              <p className="text-slate-600 mb-6">Start a free trial, or talk to us about your specific setup.</p>
              <Link href="/contact" className="inline-flex items-center gap-2 px-7 py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all">
                Get in touch <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}