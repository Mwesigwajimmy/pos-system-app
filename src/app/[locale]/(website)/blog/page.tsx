import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Calendar, User, Tag } from 'lucide-react';

const articles = [
    { slug: "how-ai-transforms-business", title: "How AI is Transforming Your Business Operations", date: "2026-03-12", author: "Mwesigwa Jimmy", category: "Insights", image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=2000&auto=format&fit=crop" },
    { slug: "future-of-automation", title: "The Future of Business Automation", date: "2026-03-10", author: "Mwesigwa Jimmy", category: "Trends", image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=2000&auto=format&fit=crop" },
    { slug: "zero-math-automation", title: "Zero Math Automation: Reducing Human Error", date: "2026-03-08", author: "Mwesigwa Jimmy", category: "Engineering", image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2000&auto=format&fit=crop" },
    { slug: "digital-transformation-sme", title: "Digital Transformation for SMEs", date: "2026-03-06", author: "Mwesigwa Jimmy", category: "Growth", image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=2000&auto=format&fit=crop" },
    { slug: "inventory-management-revolution", title: "The Inventory Management Revolution", date: "2026-03-04", author: "Mwesigwa Jimmy", category: "Supply Chain", image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2000&auto=format&fit=crop" }
];

export default function BlogListPage() {
    return (
        <div className="flex flex-col min-h-screen bg-[#020617]">
            <main className="flex-grow pt-32 pb-24">
                <div className="container mx-auto px-6">
                    <header className="max-w-4xl mb-20">
                        <div className="inline-flex items-center gap-3 px-4 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full mb-6">
                            <Tag className="h-3 w-3 text-blue-500" />
                            <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em]">Knowledge Base</span>
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-none mb-8 uppercase italic">
                            THE BBU1 <br /> <span className="text-blue-600">JOURNAL.</span>
                        </h1>
                    </header>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {articles.map((post) => (
                            <Link href={`/blog/${post.slug}`} key={post.slug} className="group">
                                <Card className="bg-white/5 border-white/10 rounded-[3rem] overflow-hidden hover:bg-white/[0.07] transition-all duration-500 h-full flex flex-col border-none">
                                    <div className="relative aspect-[16/9] w-full">
                                        <Image src={post.image} alt={post.title} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                                        <div className="absolute top-6 left-6">
                                            <span className="bg-blue-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">{post.category}</span>
                                        </div>
                                    </div>
                                    <div className="p-10">
                                        <div className="flex items-center gap-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
                                            <span className="flex items-center gap-2"><Calendar className="h-3 w-3" /> {post.date}</span>
                                            <span className="flex items-center gap-2"><User className="h-3 w-3" /> {post.author}</span>
                                        </div>
                                        <h2 className="text-3xl font-black text-white tracking-tight leading-tight group-hover:text-blue-400 transition-colors uppercase italic mb-8">{post.title}</h2>
                                        <div className="flex items-center gap-4 text-white font-black uppercase text-xs tracking-widest group-hover:gap-6 transition-all">
                                            Read Analysis <ArrowRight className="h-4 w-4 text-blue-500" />
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}