import { Metadata } from "next";
import Link from "next/link";
import { 
  Globe, Heart, Users, Zap, Code, Wrench, TrendingUp, 
  FileText, Sparkles, Building2, ArrowRight, MapPin, Clock 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Careers at BBU1 - Global Talent Acquisition",
  description: "Join the core team building the Business Base Universe. We are hiring across engineering, product, and operations. 100% remote. 100% sovereign.",
};

const jobCategories = [
  {
    title: "Engineering",
    icon: Code,
    roles: [
      { title: "Backend Developer", description: "Build scalable APIs and backend services for our next-generation business operating system. Expertise in Go, Node.js, or Rust required." },
      { title: "Frontend Developer", description: "Create beautiful, responsive interfaces using React, TypeScript, and Tailwind. Build the dashboards that power global decision-making." },
      { title: "DevOps / Infrastructure Engineer", description: "Manage global cloud infrastructure. Build CI/CD pipelines and ensure 99.99% reliability for our enterprise clients." },
      { title: "QA / Testing Engineer", description: "Ensure BBU1 quality through automated testing strategies. Lead the effort in maintaining our Zero-Math integrity." }
    ]
  },
  {
    title: "Product & Growth",
    icon: TrendingUp,
    roles: [
      { title: "Product Manager", description: "Drive our roadmap and shape the future of business automation across 15+ industry verticals." },
      { title: "Sales Manager", description: "Lead our enterprise sales cycle. Develop strategic partnerships in African and global markets." },
      { title: "Marketing Manager", description: "Lead our brand development and content strategy. Build thought leadership in AI and automation." }
    ]
  },
  {
    title: "Operations & Support",
    icon: Wrench,
    roles: [
      { title: "Technical Support Specialist", description: "Help customers succeed through expert technical guidance via our advanced chat and phone systems." },
      { title: "Technical Writer", description: "Create the documentation that defines the BBU1 standard. Write API docs and user tutorials." }
    ]
  }
];

export default function CareersPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#020617] text-slate-300 selection:bg-blue-500/30 font-sans overflow-x-hidden">
      <main className="flex-grow pt-32 pb-24">
        <div className="container mx-auto px-6">
          
          {/* --- HERO SECTION --- */}
          <header className="max-w-5xl mb-32">
            <div className="inline-flex items-center gap-3 px-6 py-2 bg-blue-500/5 border border-blue-500/20 rounded-full mb-8">
              <Sparkles className="h-4 w-4 text-blue-500 animate-pulse" />
              <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.5em]">Join the Elite</span>
            </div>
            <h1 className="text-6xl md:text-9xl font-black text-white tracking-tighter leading-none mb-10 uppercase italic">
              ENGINEER THE <br /> <span className="text-blue-600">UNIVERSE.</span>
            </h1>
            <p className="text-2xl md:text-3xl font-light text-slate-400 leading-relaxed italic border-l-4 border-blue-600 pl-8 max-w-3xl">
              "We are building a unified operating system for the world. All positions are fully remote—your talent is global, and your work should be too."
            </p>
          </header>

          {/* --- VALUES SECTION --- */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-40">
            {[
              { icon: Globe, title: "FULLY REMOTE", desc: "Work from any coordinates on Earth. We value output over presence." },
              { icon: Heart, title: "RADICAL CULTURE", desc: "A collaborative, high-intensity environment built on mutual respect." },
              { icon: Users, title: "HYPER GROWTH", desc: "Continuous learning and rapid professional progression within the OS." },
              { icon: Zap, title: "GLOBAL IMPACT", desc: "Your code and strategy will power the commerce of entire nations." }
            ].map((value, i) => (
              <div key={i} className="p-10 bg-white/5 border border-white/10 rounded-[3rem] hover:bg-blue-600/5 transition-all duration-500 group">
                <value.icon className="h-10 w-10 text-blue-600 mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-white text-xl font-black mb-4 tracking-tight uppercase italic">{value.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed font-light">{value.desc}</p>
              </div>
            ))}
          </section>

          {/* --- OPEN POSITIONS SECTION --- */}
          <section className="space-y-24 mb-40">
            <div className="flex items-center gap-4 text-white mb-16">
              <Building2 className="h-8 w-8 text-blue-600" />
              <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">OPEN OPPORTUNITIES</h2>
            </div>

            {jobCategories.map((category, idx) => (
              <div key={idx} className="space-y-10">
                <div className="flex items-center gap-3 text-blue-400 mb-6">
                  <category.icon className="h-6 w-6" />
                  <h3 className="text-2xl font-black uppercase tracking-widest">{category.title}</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                  {category.roles.map((role, rIdx) => (
                    <Card key={rIdx} className="bg-white/5 border-white/10 rounded-[3rem] overflow-hidden hover:bg-white/[0.08] transition-all duration-500 group border-none">
                      <div className="p-10 md:p-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                        <div className="space-y-4">
                          <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest text-blue-400">
                            <span className="flex items-center gap-2 bg-blue-500/10 px-3 py-1 rounded-full"><MapPin className="h-3 w-3" /> Fully Remote</span>
                            <span className="flex items-center gap-2 bg-slate-500/10 px-3 py-1 rounded-full"><Clock className="h-3 w-3" /> Full-time</span>
                          </div>
                          <h4 className="text-3xl font-black text-white group-hover:text-blue-400 transition-colors uppercase italic tracking-tight">{role.title}</h4>
                          <p className="text-slate-400 text-lg font-light max-w-2xl leading-relaxed">{role.description}</p>
                        </div>
                        <Button className="bg-blue-600 text-white font-black py-8 px-10 rounded-3xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 group-hover:scale-105" asChild>
                          <Link href={`mailto:careers@bbu1.com?subject=Application: ${role.title}`}>
                            Apply Now <ArrowRight className="ml-4 h-5 w-5" />
                          </Link>
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {/* --- VOLUNTEERING SECTION --- */}
          <section className="py-24 border-t border-white/10">
            <div className="max-w-4xl mb-16">
                <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase italic mb-6">VOLUNTEER OPPORTUNITIES</h2>
                <p className="text-xl text-slate-400 font-light leading-relaxed">
                    Contribute to the BBU1 Open Ecosystem. Build your portfolio while helping us democratize enterprise technology.
                </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                "Backend Architecture Volunteer", 
                "UI/UX Design Contributor", 
                "Open Source Evangelist", 
                "Documentation Specialist", 
                "Beta Verification Team",
                "Regional Language Translator"
              ].map((vol, i) => (
                <div key={i} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] hover:border-blue-500/50 transition-all group">
                  <h4 className="text-white text-xl font-bold mb-4 uppercase italic tracking-tight">{vol}</h4>
                  <p className="text-slate-500 text-sm mb-6">Gain hands-on experience with production-grade enterprise systems.</p>
                  <Link href={`mailto:careers@bbu1.com?subject=Volunteer: ${vol}`} className="text-blue-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:gap-4 transition-all">
                    Inquire <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ))}
            </div>
          </section>

          {/* --- FINAL CTA --- */}
          <section className="mt-40 p-20 bg-blue-600 rounded-[5rem] text-center shadow-3xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-10">
                <Users className="h-64 w-64" />
             </div>
             <h2 className="text-5xl md:text-8xl font-black text-white tracking-tighter uppercase italic mb-8 relative z-10">BECOME AN ARCHITECT.</h2>
             <p className="text-blue-100 text-2xl font-light mb-12 max-w-3xl mx-auto relative z-10">
               If you don't see your role but you know you belong in the Universe, send us your vision. We hire visionaries, not just resumes.
             </p>
             <Button className="h-20 px-16 bg-white text-blue-600 text-xl font-black uppercase tracking-[0.2em] rounded-[2rem] hover:bg-slate-100 transition-all shadow-2xl relative z-10" asChild>
                <a href="mailto:careers@bbu1.com">General Inquiry</a>
             </Button>
          </section>

        </div>
      </main>
    </div>
  );
}