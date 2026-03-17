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
import LeadForm from "@/components/LeadForm"; // Ensure you created this component in Step 2 of previous message

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
    <div className="flex flex-col min-h-screen bg-[#020617] text-slate-300 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      <main className="flex-grow pt-32 pb-24">
        <div className="container mx-auto px-6">
          
          {/* --- EXECUTIVE HEADER --- */}
          <header className="max-w-5xl mb-32">
            <div className="inline-flex items-center gap-3 px-6 py-2 bg-blue-500/5 border border-blue-500/20 rounded-full mb-8">
              <GraduationCap className="h-4 w-4 text-blue-500" />
              <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.5em]">The BBU1 Academy</span>
            </div>
            <h1 className="text-6xl md:text-9xl font-black text-white tracking-tighter leading-none mb-10 uppercase italic">
              ENGINEER YOUR <br /> <span className="text-blue-600">INTELLECT.</span>
            </h1>
            <p className="text-2xl md:text-3xl font-light text-slate-400 leading-relaxed italic border-l-4 border-blue-600 pl-8 max-w-3xl">
              "Technology is only as powerful as the mind operating it. We provide the architectural training to master the future of global commerce."
            </p>
          </header>

          {/* --- BENEFITS GRID --- */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-40">
            {[
              { icon: Award, title: "CERTIFIED", desc: "Industry-recognized credentials validating your mastery of the Sovereign OS." },
              { icon: BookOpen, title: "EXPERT-LED", desc: "Direct instructional modules from the Lead Architects and BBU1 engineering team." },
              { icon: Zap, title: "PRACTICAL", desc: "Hands-on implementation tasks built on real-world enterprise scenarios." },
              { icon: Users, title: "GLOBAL NETWORK", desc: "Access to a private community of visionary business leaders and engineers." }
            ].map((ben, i) => (
              <div key={i} className="p-10 bg-white/5 border border-white/10 rounded-[3rem] hover:bg-blue-600/5 transition-all group">
                <ben.icon className="h-10 w-10 text-blue-600 mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-white text-xl font-black mb-4 tracking-tight uppercase italic">{ben.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed font-light">{ben.desc}</p>
              </div>
            ))}
          </section>

          {/* --- FOUNDATIONAL TRACKS (FREE) --- */}
          <section className="mb-40">
            <div className="flex items-center gap-4 text-white mb-16">
              <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">FOUNDATIONAL TRACKS</h2>
              <span className="bg-green-500/10 text-green-500 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-green-500/20">Free Access</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {freeTracks.map((course) => (
                <Card key={course.id} className="bg-white/5 border-white/10 rounded-[3.5rem] overflow-hidden hover:bg-white/[0.08] transition-all duration-500 border-none group">
                  <div className="p-12">
                    <course.icon className="h-12 w-12 text-blue-600 mb-8 group-hover:scale-110 transition-transform" />
                    <h3 className="text-3xl font-black text-white group-hover:text-blue-400 transition-colors uppercase italic mb-4 tracking-tight leading-none">{course.title}</h3>
                    <p className="text-slate-400 text-lg font-light mb-8 leading-relaxed">{course.description}</p>
                    <div className="flex flex-wrap gap-4 mb-10">
                       {course.topics.map((t, idx) => (
                         <span key={idx} className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                           <CheckCircle className="h-3 w-3 text-blue-600" /> {t}
                         </span>
                       ))}
                    </div>
                    {/* SOVEREIGN FIX: Redirects to the form anchor instead of login */}
                    <Button className="bg-blue-600 text-white font-black py-8 px-12 rounded-3xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20" asChild>
                       <a href="#enroll">Enroll Instantly</a>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* --- GLOBAL CERTIFICATION TIERS --- */}
          <section className="mb-40">
            <div className="flex items-center gap-4 text-white mb-16">
              <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">GLOBAL CERTIFICATIONS</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {certTracks.map((course) => (
                <Card key={course.id} className="bg-white/5 border-white/10 rounded-[3rem] overflow-hidden hover:bg-white/[0.08] transition-all border-none flex flex-col h-full group">
                  <div className="p-10 flex-grow">
                    <div className="flex justify-between items-start mb-8">
                       <course.icon className="h-10 w-10 text-blue-600 group-hover:scale-110 transition-transform" />
                       <span className="text-white text-2xl font-black italic tracking-tighter">{course.price}</span>
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase italic mb-4 tracking-tight leading-none">{course.title}</h3>
                    <p className="text-slate-500 text-sm font-light leading-relaxed mb-8">{course.description}</p>
                    <div className="space-y-3">
                       {course.topics.slice(0,3).map((t, idx) => (
                         <div key={idx} className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <Sparkles className="h-3 w-3 text-blue-500" /> {t}
                         </div>
                       ))}
                    </div>
                  </div>
                  <div className="p-10 pt-0 mt-auto">
                    {/* SOVEREIGN FIX: Redirects to the form anchor instead of contact/login */}
                    <Button variant="outline" className="w-full py-8 border-blue-600 text-blue-600 font-black uppercase tracking-widest rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-xl hover:shadow-blue-600/20" asChild>
                       <a href="#enroll">Apply for Training</a>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* --- SOVEREIGN ENROLLMENT ENGINE (THE FORM) --- */}
          <section id="enroll" className="mt-40 p-12 md:p-24 bg-white/5 border border-white/10 rounded-[5rem] max-w-5xl mx-auto shadow-3xl relative overflow-hidden scroll-mt-24">
             <div className="absolute top-0 right-0 p-10 opacity-5">
                <Target className="h-96 w-96 text-white" />
             </div>
             
             <div className="relative z-10">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-3 px-6 py-2 bg-blue-500/5 border border-blue-500/20 rounded-full mb-8">
                        <Rocket className="h-4 w-4 text-blue-500" />
                        <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.5em]">Admission Interface</span>
                    </div>
                    <h2 className="text-4xl md:text-7xl font-black text-white tracking-tighter uppercase italic mb-6 leading-none">SECURE YOUR SEAT.</h2>
                    <p className="text-slate-400 text-xl font-light max-w-2xl mx-auto leading-relaxed">
                        Enter your professional profile below. Our Admission Architects will review your application and provide secure access to the Academy.
                    </p>
                </div>

                <div className="max-w-3xl mx-auto">
                    <LeadForm intent="ACADEMY_ENROLL" ctaText="INITIATE ENROLLMENT" />
                </div>
             </div>
          </section>

          {/* --- FINAL CTA --- */}
          <section className="mt-40 p-20 bg-blue-600 rounded-[5rem] text-center shadow-3xl relative overflow-hidden">
             <h2 className="text-5xl md:text-8xl font-black text-white tracking-tighter uppercase italic mb-8 relative z-10">MASTER THE SYSTEM.</h2>
             <p className="text-blue-100 text-2xl font-light mb-12 max-w-3xl mx-auto relative z-10 leading-relaxed">
               Join the BBU1 Academy and transform your career into a high-fidelity business architect capable of deploying sovereign commerce worldwide.
             </p>
             <Button className="h-20 px-16 bg-white text-blue-600 text-xl font-black uppercase tracking-[0.2em] rounded-[2rem] hover:bg-slate-100 transition-all shadow-2xl relative z-10" asChild>
                <a href="#enroll">Explore Learning Paths</a>
             </Button>
          </section>
        </div>
      </main>
    </div>
  );
}