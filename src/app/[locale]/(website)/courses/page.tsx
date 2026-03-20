import React from 'react';
import { Metadata } from "next";
import Link from "next/link";
import { courses } from '@/lib/data/courses';
import { 
  Award, 
  BookOpen, 
  Zap, 
  Users, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  CheckCircle, 
  GraduationCap,
  ShoppingCart,
  BrainCircuit,
  Landmark,
  ShieldCheck,
  BarChart3,
  Utensils,
  Target,
  Rocket
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LeadForm from "@/components/LeadForm";

export async function generateStaticParams() {
  return [{ locale: 'en' }]; 
}

export const metadata: Metadata = {
  title: "BBU1 Academy - Sovereign Business Engineering",
  description: "Master business automation, AI intelligence, and operational excellence through BBU1 certified training paths.",
};

export default async function CoursesPage({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}) {
  const { locale } = await params;

  const freeTracks = courses.filter(c => c.category === "Free");
  const certTracks = courses.filter(c => c.category === "Certification");

  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      <main className="flex-grow pt-20 pb-24">
        <div className="container mx-auto px-6 max-w-7xl">
          
          {/* --- EXECUTIVE HEADER --- */}
          <header className="max-w-4xl mb-32">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full mb-8">
              <GraduationCap className="h-4 w-4 text-blue-600" />
              <span className="text-blue-700 text-xs font-bold tracking-widest uppercase">The BBU1 Academy</span>
            </div>
            {/* Fixed: Normal case, straight text, professional size */}
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight mb-10">
              Engineer your <span className="text-blue-600">intellect.</span>
            </h1>
            <p className="text-xl md:text-2xl font-normal text-slate-600 leading-relaxed border-l-4 border-blue-600 pl-8 max-w-3xl">
              Technology is only as powerful as the mind operating it. We provide the architectural training to master the future of global commerce.
            </p>
          </header>

          {/* --- BENEFITS GRID --- */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-40">
            {[
              { icon: Award, title: "Certified", desc: "Industry-recognized credentials validating your mastery of the Sovereign OS." },
              { icon: BookOpen, title: "Expert-Led", desc: "Direct instructional modules from the Lead Architects and BBU1 engineering team." },
              { icon: Zap, title: "Practical", desc: "Hands-on implementation tasks built on real-world enterprise scenarios." },
              { icon: Users, title: "Global Network", desc: "Access to a private community of visionary business leaders and engineers." }
            ].map((ben, i) => (
              <div key={i} className="p-10 bg-slate-50 border border-slate-100 rounded-3xl hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all duration-300 group">
                <ben.icon className="h-10 w-10 text-blue-600 mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-slate-900 text-xl font-bold mb-4">{ben.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed font-normal">{ben.desc}</p>
              </div>
            ))}
          </section>

          {/* --- FOUNDATIONAL TRACKS (FREE) --- */}
          <section className="mb-40">
            <div className="flex flex-wrap items-center gap-4 mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900">Foundational Tracks</h2>
              <span className="bg-green-50 text-green-700 text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest border border-green-100">Free Access</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {freeTracks.map((course) => (
                <Card key={course.id} className="bg-slate-50 border-slate-200 rounded-[2.5rem] overflow-hidden hover:bg-white hover:shadow-2xl hover:border-blue-100 transition-all duration-500 border group">
                  <div className="p-10 md:p-12">
                    <course.icon className="h-12 w-12 text-blue-600 mb-8 group-hover:scale-110 transition-transform" />
                    <h3 className="text-2xl md:text-3xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-4 tracking-tight leading-tight">{course.title}</h3>
                    <p className="text-slate-600 text-lg font-normal mb-8 leading-relaxed">{course.description}</p>
                    <div className="flex flex-wrap gap-4 mb-10">
                       {course.topics.map((t, idx) => (
                         <span key={idx} className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                           <CheckCircle className="h-4 w-4 text-blue-600" /> {t}
                         </span>
                       ))}
                    </div>
                    <Button className="h-14 px-10 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/10" asChild>
                       <a href="#enroll">Enroll Instantly</a>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* --- GLOBAL CERTIFICATION TIERS --- */}
          <section className="mb-40">
            <div className="mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900">Global Certifications</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {certTracks.map((course) => (
                <Card key={course.id} className="bg-white border-slate-200 rounded-3xl overflow-hidden hover:shadow-2xl hover:border-blue-300 transition-all border flex flex-col h-full group">
                  <div className="p-10 flex-grow">
                    <div className="flex justify-between items-start mb-8">
                       <course.icon className="h-10 w-10 text-blue-600 group-hover:scale-110 transition-transform" />
                       <span className="text-slate-900 text-2xl font-bold tracking-tight">{course.price}</span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight leading-tight">{course.title}</h3>
                    <p className="text-slate-600 text-sm font-normal leading-relaxed mb-8">{course.description}</p>
                    <div className="space-y-3">
                       {course.topics.slice(0,3).map((t, idx) => (
                         <div key={idx} className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                            <Sparkles className="h-3.5 w-3.5 text-blue-500" /> {t}
                         </div>
                       ))}
                    </div>
                  </div>
                  <div className="p-10 pt-0 mt-auto">
                    <Button variant="outline" className="w-full h-14 border-blue-600 text-blue-600 font-bold rounded-xl hover:bg-blue-600 hover:text-white transition-all" asChild>
                       <a href="#enroll">Apply for Training</a>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* --- ENROLLMENT ENGINE --- */}
          <section id="enroll" className="mt-40 p-10 md:p-20 bg-slate-50 border border-slate-200 rounded-[3rem] max-w-5xl mx-auto shadow-sm relative overflow-hidden scroll-mt-24">
             <div className="absolute top-0 right-0 p-10 opacity-10">
                <Target className="h-64 w-64 text-slate-900" />
             </div>
             
             <div className="relative z-10">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-100 border border-blue-200 rounded-full mb-8">
                        <Rocket className="h-4 w-4 text-blue-600" />
                        <span className="text-blue-700 text-xs font-bold tracking-widest uppercase">Admission Interface</span>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight mb-6">Secure your seat.</h2>
                    <p className="text-slate-600 text-lg font-normal max-w-2xl mx-auto leading-relaxed">
                        Enter your professional profile below. Our Admission Architects will review your application and provide secure access to the Academy.
                    </p>
                </div>

                <div className="max-w-2xl mx-auto bg-white p-8 md:p-12 rounded-3xl border border-slate-100 shadow-xl">
                    <LeadForm intent="ACADEMY_ENROLL" ctaText="INITIATE ENROLLMENT" />
                </div>
             </div>
          </section>

          {/* --- FINAL CTA --- */}
          <section className="mt-40 p-16 md:p-24 bg-blue-600 rounded-[3rem] text-center shadow-2xl shadow-blue-600/20 relative overflow-hidden text-white">
             <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-8 relative z-10 leading-tight">Master the system.</h2>
             <p className="text-blue-50 text-xl md:text-2xl font-normal mb-12 max-w-3xl mx-auto relative z-10 leading-relaxed">
               Join the BBU1 Academy and transform your career into a high-fidelity business architect capable of deploying sovereign commerce worldwide.
             </p>
             <Button size="lg" className="h-16 px-12 bg-white text-blue-600 text-lg font-bold rounded-xl hover:bg-slate-50 transition-all shadow-xl relative z-10" asChild>
                <a href="#enroll">Explore Learning Paths</a>
             </Button>
          </section>
        </div>
      </main>
    </div>
  );
}