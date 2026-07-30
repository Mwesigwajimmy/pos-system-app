import React from 'react';
import { Metadata } from "next";
import Link from "next/link";
import { courses } from '@/lib/data/courses';
import BackNavbar from '@/components/BackNavbar';
import { 
  Award, 
  BookOpen, 
  Zap, 
  Users, 
  ArrowRight, 
  Sparkles, 
  CheckCircle, 
  GraduationCap,
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LeadForm from "@/components/LeadForm";

export async function generateStaticParams() {
  return [{ locale: 'en' }]; 
}

export const metadata: Metadata = {
  title: "BBU1 Academy - Business & Operations Training",
  description: "Free and certified courses on business automation, finance, and operations, taught for the people running the business.",
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
      <BackNavbar backHref="/" backLabel="Home" />
      <main className="flex-grow pt-20 pb-24">
        <div className="container mx-auto px-6 max-w-7xl">
          
          {/* --- HEADER --- */}
          <header className="max-w-3xl mb-24">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full mb-6">
              <GraduationCap className="h-4 w-4 text-blue-600" />
              <span className="text-blue-700 text-xs font-bold tracking-widest uppercase">BBU1 Academy</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 tracking-tight leading-tight mb-6">
              Learn to run your business better.
            </h1>
            <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-2xl">
              Free and certified courses on automation, finance, and operations — built for people running a business, not writing code.
            </p>
          </header>

          {/* --- BENEFITS GRID --- */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-24">
            {[
              { icon: Award, title: "Certified", desc: "Recognized credentials that show you know how to run a modern business platform." },
              { icon: BookOpen, title: "Practical", desc: "Taught by the team who built BBU1, focused on real workflows, not theory." },
              { icon: Zap, title: "Hands-On", desc: "Work through real scenarios, not just slides and quizzes." },
              { icon: Users, title: "Community", desc: "Access to a group of other business owners and operators taking the same courses." }
            ].map((ben, i) => (
              <div key={i} className="p-8 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-md hover:border-blue-100 transition-all duration-300 group">
                <ben.icon className="h-8 w-8 text-blue-600 mb-5 group-hover:scale-110 transition-transform" />
                <h3 className="text-slate-900 text-lg font-bold mb-2.5">{ben.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{ben.desc}</p>
              </div>
            ))}
          </section>

          {/* --- FREE TRACKS --- */}
          <section className="mb-24">
            <div className="flex flex-wrap items-center gap-3 mb-10">
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-slate-900">Free courses</h2>
              <span className="bg-green-50 text-green-700 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest border border-green-100">No cost</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {freeTracks.map((course) => (
                <Card key={course.id} className="bg-slate-50 border-slate-200 rounded-2xl overflow-hidden hover:bg-white hover:shadow-lg hover:border-blue-100 transition-all duration-300 border group">
                  <div className="p-8 md:p-10">
                    <course.icon className="h-9 w-9 text-blue-600 mb-6" />
                    <h3 className="text-xl md:text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-3 tracking-tight leading-tight">{course.title}</h3>
                    <p className="text-slate-600 text-base mb-6 leading-relaxed">{course.description}</p>
                    <div className="flex flex-wrap gap-3 mb-8">
                       {course.topics.map((t, idx) => (
                         <span key={idx} className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                           <CheckCircle className="h-3.5 w-3.5 text-blue-600" /> {t}
                         </span>
                       ))}
                    </div>
                    <Button className="h-12 px-8 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all" asChild>
                       <a href="#enroll">Enroll now</a>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* --- CERTIFICATIONS --- */}
          <section className="mb-24">
            <div className="mb-10">
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-slate-900">Certification tracks</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {certTracks.map((course) => (
                <Card key={course.id} className="bg-white border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all border flex flex-col h-full group">
                  <div className="p-8 flex-grow">
                    <div className="flex justify-between items-start mb-6">
                       <course.icon className="h-8 w-8 text-blue-600" />
                       <span className="text-slate-900 text-xl font-bold tracking-tight">{course.price}</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3 tracking-tight leading-tight">{course.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed mb-6">{course.description}</p>
                    <div className="space-y-2.5">
                       {course.topics.slice(0,3).map((t, idx) => (
                         <div key={idx} className="flex items-center gap-2.5 text-xs font-medium text-slate-500">
                            <Sparkles className="h-3.5 w-3.5 text-blue-500" /> {t}
                         </div>
                       ))}
                    </div>
                  </div>
                  <div className="p-8 pt-0 mt-auto">
                    <Button variant="outline" className="w-full h-12 border-blue-600 text-blue-600 font-semibold rounded-xl hover:bg-blue-600 hover:text-white transition-all" asChild>
                       <a href="#enroll">Apply</a>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* --- ENROLLMENT --- */}
          <section id="enroll" className="mt-24 p-8 md:p-16 bg-slate-50 border border-slate-200 rounded-3xl max-w-5xl mx-auto scroll-mt-24">
             <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-100 border border-blue-200 rounded-full mb-6">
                    <Target className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-700 text-xs font-bold tracking-widest uppercase">Enrollment</span>
                </div>
                <h2 className="text-2xl md:text-4xl font-bold text-slate-900 tracking-tight mb-4">Save your spot</h2>
                <p className="text-slate-600 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                    Tell us a bit about yourself and we'll confirm your access.
                </p>
             </div>

             <div className="max-w-2xl mx-auto bg-white p-6 md:p-10 rounded-2xl border border-slate-100 shadow-sm">
                <LeadForm intent="ACADEMY_ENROLL" ctaText="Submit application" />
             </div>
          </section>

          {/* --- FINAL CTA --- */}
          <section className="mt-24 p-12 md:p-16 bg-blue-600 rounded-3xl text-center text-white">
             <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-4">Start learning today.</h2>
             <p className="text-blue-50 text-base md:text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
               Join the BBU1 Academy and pick up practical skills for running a modern business.
             </p>
             <Button size="lg" className="h-13 px-10 bg-white text-blue-600 text-base font-semibold rounded-xl hover:bg-slate-50 transition-all" asChild>
                <a href="#enroll">Browse courses</a>
             </Button>
          </section>
        </div>
      </main>
    </div>
  );
}