import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Calendar, User, Tag } from 'lucide-react';

// Updated to include all 8 enterprise articles to prevent 404 errors
const articles = [
    { 
        slug: "how-ai-transforms-business", 
        title: "How AI is Transforming Your Business Operations", 
        date: "2026-03-12", 
        author: "Mwesigwa Jimmy", 
        category: "Insights", 
        image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=2000&auto=format&fit=crop" 
    },
    { 
        slug: "future-of-automation", 
        title: "The Future of Business Automation", 
        date: "2026-03-10", 
        author: "Mwesigwa Jimmy", 
        category: "Trends", 
        image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=2000&auto=format&fit=crop" 
    },
    { 
        slug: "zero-math-automation", 
        title: "Zero Math Automation: Reducing Human Error", 
        date: "2026-03-08", 
        author: "Mwesigwa Jimmy", 
        category: "Engineering", 
        image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2000&auto=format&fit=crop" 
    },
    { 
        slug: "digital-transformation-sme", 
        title: "Digital Transformation for SMEs", 
        date: "2026-03-06", 
        author: "Mwesigwa Jimmy", 
        category: "Growth", 
        image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=2000&auto=format&fit=crop" 
    },
    { 
        slug: "inventory-management-revolution", 
        title: "The Inventory Management Revolution", 
        date: "2026-03-04", 
        author: "Mwesigwa Jimmy", 
        category: "Supply Chain", 
        image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2000&auto=format&fit=crop" 
    },
    { 
        slug: "aura-ai-cutting-edge-intelligence", 
        title: "Aura AI: The Cutting-Edge of Intelligence", 
        date: "2026-03-02", 
        author: "Engineering Team", 
        category: "Product Updates", 
        image: "https://images.unsplash.com/photo-1675271591211-126ad94e495d?q=80&w=2000&auto=format&fit=crop" 
    },
    { 
        slug: "unbreakable-offline-mode-continuity", 
        title: "Unbreakable Offline Mode: Business Continuity", 
        date: "2026-02-28", 
        author: "Product Team", 
        category: "Features", 
        image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2000&auto=format&fit=crop" 
    },
    { 
        slug: "sacco-transformation-success-story", 
        title: "Success Story: SACCO Digital Transformation", 
        date: "2026-02-25", 
        author: "Customer Success", 
        category: "Success Stories", 
        image: "https://images.unsplash.com/photo-1556742044-3c52d6e88c62?q=80&w=2000&auto=format&fit=crop" 
    }
];

export default function BlogListPage() {
    return (
        <div className="flex flex-col min-h-screen bg-white text-slate-900 selection:bg-blue-500/30 font-sans">
            <main className="flex-grow pt-20 pb-24">
                <div className="container mx-auto px-6 max-w-7xl">
                    
                    {/* --- HEADER SECTION --- */}
                    <header className="max-w-4xl mb-16">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full mb-6">
                            <Tag className="h-3 w-3 text-blue-600" />
                            <span className="text-blue-700 text-xs font-bold tracking-widest uppercase">Knowledge Base</span>
                        </div>
                        {/* Normalized size, straight text, no all-caps */}
                        <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
                            The BBU1 <span className="text-blue-600">Journal.</span>
                        </h1>
                        <p className="mt-6 text-lg text-slate-600 max-w-2xl font-normal leading-relaxed">
                            Deep analysis, engineering insights, and the latest trends in business automation and global commerce architecture.
                        </p>
                    </header>

                    {/* --- BLOG GRID --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {articles.map((post) => (
                            <Link href={`/blog/${post.slug}`} key={post.slug} className="group">
                                <Card className="bg-slate-50 border-slate-200 rounded-3xl overflow-hidden hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all duration-300 h-full flex flex-col border">
                                    
                                    {/* Image Section */}
                                    <div className="relative aspect-[16/9] w-full overflow-hidden">
                                        <Image 
                                            src={post.image} 
                                            alt={post.title} 
                                            fill 
                                            className="object-cover transition-transform duration-500 group-hover:scale-105" 
                                        />
                                        <div className="absolute top-4 left-4">
                                            <span className="bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-md uppercase tracking-wider">
                                                {post.category}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Content Section */}
                                    <CardContent className="p-8">
                                        <div className="flex items-center gap-4 text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                                            <span className="flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5" /> {post.date}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <User className="h-3.5 w-3.5" /> {post.author}
                                            </span>
                                        </div>
                                        
                                        {/* Professional Title: No italics, no uppercase */}
                                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight leading-snug group-hover:text-blue-600 transition-colors mb-6">
                                            {post.title}
                                        </h2>
                                        
                                        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm tracking-wide group-hover:text-blue-600 transition-all">
                                            Read Analysis <ArrowRight className="h-4 w-4 text-blue-600" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>

                    {/* --- FOOTER INFO --- */}
                    <div className="mt-24 pt-12 border-t border-slate-100 text-center">
                        <p className="text-slate-400 text-sm">
                            © {new Date().getFullYear()} BBU1 International. All analysis is verified by our Lead Architects.
                        </p>
                    </div>

                </div>
            </main>
        </div>
    );
}