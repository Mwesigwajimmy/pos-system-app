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
    <div className="flex flex-col min-h-screen bg-white text-slate-900 selection:bg-blue-500/30 font-sans overflow-x-hidden">
      <main className="flex-grow pt-20 pb-24">
        <div className="container mx-auto px-6 max-w-7xl">
          
          {/* --- HERO SECTION --- */}
          <header className="max-w-4xl mb-32">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full mb-8">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-blue-700 text-xs font-bold tracking-widest uppercase">Join the Elite</span>
            </div>
            
            {/* Fixed: Professional size, straight text, no all-caps */}
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight mb-10">
              Engineer the <span className="text-blue-600">Universe.</span>
            </h1>
            
            <p className="text-xl md:text-2xl font-normal text-slate-600 leading-relaxed border-l-4 border-blue-600 pl-8 max-w-3xl">
              We are building a unified operating system for the world. All positions are fully remote—your talent is global, and your work should be too.
            </p>
          </header>

          {/* --- VALUES SECTION --- */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-40">
            {[
              { icon: Globe, title: "Fully Remote", desc: "Work from any coordinates on Earth. We value output over presence." },
              { icon: Heart, title: "Radical Culture", desc: "A collaborative, high-intensity environment built on mutual respect." },
              { icon: Users, title: "Hyper Growth", desc: "Continuous learning and rapid professional progression within the OS." },
              { icon: Zap, title: "Global Impact", desc: "Your code and strategy will power the commerce of entire nations." }
            ].map((value, i) => (
              <div key={i} className="p-10 bg-slate-50 border border-slate-100 rounded-3xl hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all duration-300 group">
                <value.icon className="h-10 w-10 text-blue-600 mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-slate-900 text-xl font-bold mb-4">{value.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed font-normal">{value.desc}</p>
              </div>
            ))}
          </section>

          {/* --- OPEN POSITIONS SECTION --- */}
          <section className="space-y-24 mb-40">
            <div className="flex items-center gap-4 text-slate-900 mb-12">
              <Building2 className="h-8 w-8 text-blue-600" />
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Open Opportunities</h2>
            </div>

            {jobCategories.map((category, idx) => (
              <div key={idx} className="space-y-8">
                <div className="flex items-center gap-3 text-blue-600 border-b border-slate-100 pb-4">
                  <category.icon className="h-5 w-5" />
                  <h3 className="text-xl font-bold uppercase tracking-widest">{category.title}</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                  {category.roles.map((role, rIdx) => (
                    <Card key={rIdx} className="bg-slate-50 border-slate-200 rounded-3xl overflow-hidden hover:bg-white hover:shadow-xl hover:border-blue-200 transition-all duration-300 group border">
                      <div className="p-8 md:p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                        <div className="space-y-4">
                          <div className="flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-widest text-blue-600">
                            <span className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-md border border-blue-100"><MapPin className="h-3 w-3" /> Fully Remote</span>
                            <span className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-md border border-slate-200 text-slate-600"><Clock className="h-3 w-3" /> Full-time</span>
                          </div>
                          <h4 className="text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight">{role.title}</h4>
                          <p className="text-slate-600 text-lg font-normal max-w-2xl leading-relaxed">{role.description}</p>
                        </div>
                        <Button className="bg-blue-600 text-white font-bold py-6 px-8 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/10" asChild>
                          <Link href={`mailto:careers@bbu1.com?subject=Application: ${role.title}`}>
                            Apply Now <ArrowRight className="ml-2 h-4 w-4" />
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
          <section className="py-24 border-t border-slate-100">
            <div className="max-w-4xl mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-6">Volunteer Opportunities</h2>
                <p className="text-lg text-slate-600 font-normal leading-relaxed">
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
                <div key={i} className="p-8 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-white hover:border-blue-400 hover:shadow-md transition-all group">
                  <h4 className="text-slate-900 text-lg font-bold mb-3">{vol}</h4>
                  <p className="text-slate-500 text-sm mb-6 leading-relaxed">Gain hands-on experience with production-grade enterprise systems.</p>
                  <Link href={`mailto:careers@bbu1.com?subject=Volunteer: ${vol}`} className="text-blue-600 text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:translate-x-1 transition-transform">
                    Inquire <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ))}
            </div>
          </section>

          {/* --- FINAL CTA --- */}
          <section className="mt-40 p-16 md:p-24 bg-blue-600 rounded-[3rem] text-center shadow-2xl shadow-blue-600/20 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-10">
                <Users className="h-64 w-64 text-white" />
             </div>
             <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-8 relative z-10">Become an Architect.</h2>
             <p className="text-blue-50 text-xl md:text-2xl font-normal mb-12 max-w-3xl mx-auto relative z-10">
               If you don't see your role but you know you belong in the Universe, send us your vision. We hire visionaries, not just resumes.
             </p>
             <Button size="lg" className="h-16 px-12 bg-white text-blue-600 text-lg font-bold rounded-xl hover:bg-slate-50 transition-all shadow-xl relative z-10" asChild>
                <a href="mailto:careers@bbu1.com">General Inquiry</a>
             </Button>
          </section>

        </div>
      </main>
    </div>
  );
}