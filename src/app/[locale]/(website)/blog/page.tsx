import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import BackNavbar from '@/components/BackNavbar';
import { blogPosts } from '@/lib/data/blog';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Calendar, User, Tag } from 'lucide-react';

export default function BlogListPage() {
    return (
        <div className="flex flex-col min-h-screen bg-white text-slate-900 selection:bg-blue-500/30 font-sans">
            <BackNavbar backHref="/" backLabel="Home" />
            <main className="flex-grow pt-20 pb-24">
                <div className="container mx-auto px-6 max-w-7xl">

                    {/* --- HEADER --- */}
                    <header className="max-w-3xl mb-16">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full mb-6">
                            <Tag className="h-3 w-3 text-blue-600" />
                            <span className="text-blue-700 text-xs font-bold tracking-widest uppercase">Blog</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
                            The BBU1 Journal
                        </h1>
                        <p className="mt-5 text-lg text-slate-600 max-w-2xl leading-relaxed">
                            Notes on business automation, inventory, and finance — written for the people running the business, not just the ones building the software.
                        </p>
                    </header>

                    {/* --- BLOG GRID --- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {blogPosts.map((post) => (
                            <Link href={`/blog/${post.slug}`} key={post.slug} className="group">
                                <Card className="bg-slate-50 border-slate-200 rounded-2xl overflow-hidden hover:bg-white hover:shadow-lg hover:border-blue-100 transition-all duration-300 h-full flex flex-col border">

                                    {/* Image */}
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

                                    {/* Content */}
                                    <CardContent className="p-7 flex-1 flex flex-col">
                                        <div className="flex items-center gap-4 text-xs font-medium text-slate-400 mb-3">
                                            <span className="flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5" /> {new Date(post.publishDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <User className="h-3.5 w-3.5" /> {post.author}
                                            </span>
                                        </div>

                                        <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-snug group-hover:text-blue-600 transition-colors mb-3">
                                            {post.title}
                                        </h2>

                                        <p className="text-sm text-slate-600 leading-relaxed mb-5 flex-1">
                                            {post.description}
                                        </p>

                                        <div className="flex items-center gap-1.5 text-slate-900 font-semibold text-sm group-hover:text-blue-600 group-hover:gap-2.5 transition-all">
                                            Read post <ArrowRight className="h-4 w-4" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>

                </div>
            </main>
        </div>
    );
}