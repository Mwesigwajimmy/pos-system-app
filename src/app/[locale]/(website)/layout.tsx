"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Providers from "@/components/Providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Rocket, Menu, X, Mail, Linkedin, Twitter, Facebook, 
  Leaf, DownloadCloud, Sparkles, ChevronDown, MessageSquareText,
  ShieldCheck, FileText, Phone, Smartphone, User, CheckCircle2,
  Send, Loader2, Landmark, Briefcase
} from "lucide-react";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogTrigger,
    DialogClose
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

// --- PROFESSIONAL INQUIRY FORM COMPONENT ---
const DepartmentInquiryForm = ({ department, email, icon: Icon }: { department: string, email: string, icon: any }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        
        const data = {
            name: formData.get('name'),
            org: formData.get('org'),
            email: formData.get('email'),
            message: formData.get('message'),
            department: department
        };

        try {
            // 1. Save to your Supabase Leads table so you never lose the contact
            await supabase.from('system_marketing_leads').insert({
                email: data.email,
                metadata: { ...data, source: 'Departmental Form' }
            });

            // 2. The "Handshake" Redirect: Prepare the email client
            const subject = encodeURIComponent(`Strategic Inquiry: ${department} [BBU1 Global]`);
            const body = encodeURIComponent(
                `Hello ${department} team,\n\n` +
                `My name is ${data.name} from ${data.org}.\n\n` +
                `Inquiry Details:\n${data.message}\n\n` +
                `Best regards,\n${data.name}`
            );

            toast.success("Opening your secure email client...");
            window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
        } catch (err) {
            toast.error("Handshake failed. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Full Name</Label>
                    <Input name="name" placeholder="John Doe" required className="h-11 border-slate-200" />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Organization</Label>
                    <Input name="org" placeholder="Acme Corp" required className="h-11 border-slate-200" />
                </div>
            </div>
            <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Return Email Address</Label>
                <Input name="email" type="email" placeholder="john@company.com" required className="h-11 border-slate-200" />
            </div>
            <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Brief Detail / Message</Label>
                <textarea 
                    name="message" 
                    required 
                    className="w-full min-h-[120px] p-3 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-600 outline-none"
                    placeholder="How can we assist your enterprise?"
                ></textarea>
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl shadow-lg">
                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 h-5 w-5" />}
                Submit & Open Official Email
            </Button>
        </form>
    );
};

/**
 * --- PROFESSIONAL LAYOUT HEADER ---
 */
const LayoutHeader = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/95 backdrop-blur-md">
      <div className="container mx-auto flex h-20 items-center justify-between px-6">
        <Link href="/" className="flex items-center space-x-2 font-bold text-2xl text-blue-600 tracking-tight group">
          <Rocket className="h-7 w-7 transition-transform group-hover:rotate-12" /> 
          <span>BBU1</span>
        </Link>

        <nav className="hidden xl:flex items-center gap-8 text-[12px] font-semibold uppercase tracking-wider text-slate-500">
          <Link href="/features" className="hover:text-blue-600 transition-colors">Features</Link>
          <Link href="/industries" className="hover:text-blue-600 transition-colors">Industries</Link>
          <Link href="/download" className="text-blue-600 font-bold flex items-center gap-1.5">
            <DownloadCloud size={14} /> Download
          </Link>
          <Link href="/aura-ai" className="text-blue-500 hover:text-blue-600 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" /> Aura AI
          </Link>
          <Link href="/courses" className="hover:text-blue-600 transition-colors">Academy</Link>
          <Link href="/blog" className="hover:text-blue-600 transition-colors">Journal</Link>
          <Link href="/help-centre" className="hover:text-blue-600 transition-colors">Help Center</Link>
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <Button variant="outline" asChild size="sm" className="border-slate-200 text-slate-600 font-bold px-5 h-9 rounded-lg">
            <Link href="/download">Install App</Link>
          </Button>
          <Button variant="ghost" asChild className="text-slate-500 font-bold px-4 h-9">
            <Link href="/login">Log In</Link>
          </Button>
          <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 rounded-lg px-6 shadow-sm">
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>

        <button className="xl:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-lg" onClick={() => setIsMobileOpen(!isMobileOpen)}>
          {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMobileOpen && (
        <div className="xl:hidden fixed inset-0 top-20 bg-white z-[60] p-6 flex flex-col gap-6 animate-in slide-in-from-right duration-300">
          <nav className="flex flex-col gap-4 text-lg font-bold text-slate-800">
            <Link href="/features" onClick={() => setIsMobileOpen(false)} className="border-b pb-4">Features</Link>
            <Link href="/industries" onClick={() => setIsMobileOpen(false)} className="border-b pb-4">Industries</Link>
            <Link href="/download" onClick={() => setIsMobileOpen(false)} className="border-b pb-4 text-blue-600">Download Application</Link>
            <Link href="/aura-ai" className="text-blue-500 border-b pb-4" onClick={() => setIsMobileOpen(false)}>Aura AI</Link>
            <Link href="/courses" onClick={() => setIsMobileOpen(false)} className="border-b pb-4">Academy</Link>
            <Link href="/blog" onClick={() => setIsMobileOpen(false)} className="border-b pb-4">Journal</Link>
          </nav>
          <div className="mt-auto flex flex-col gap-3">
            <Button asChild className="bg-blue-600 h-14 text-lg font-bold">
               <Link href="/signup">Get Started</Link>
            </Button>
            <Button variant="outline" asChild className="h-14 text-lg font-bold border-slate-200">
               <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};

/**
 * --- EXECUTIVE CORPORATE FOOTER ---
 */
const LayoutFooter = () => (
  <footer className="bg-slate-950 text-slate-300 pt-24 pb-12 border-t border-slate-800">
    <div className="container mx-auto px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-16 mb-20">
        
        {/* Branding & CONTACT FORMS */}
        <div className="lg:col-span-4 space-y-8">
          <div className="flex items-center gap-3">
             <Rocket className="h-7 w-7 text-blue-500" />
             <h3 className="text-2xl font-bold text-white tracking-tight">BBU1 Global</h3>
          </div>
          <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
            The unified operating system for modern enterprise. Unify cloud accounting, auditing, CRM, and advanced inventory into one secure core.
          </p>
          
          <div className="space-y-4 pt-2">
            {/* FOUNDER MODAL */}
            <Dialog>
                <DialogTrigger asChild>
                    <button className="flex items-center gap-4 group w-full text-left">
                        <div className="h-10 w-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
                            <User size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Founder & CEO</p>
                            <span className="text-slate-200 font-semibold border-b border-transparent group-hover:border-blue-500 transition-all">ceo@bbu1.com</span>
                        </div>
                    </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[450px] p-0 border-none rounded-2xl overflow-hidden shadow-2xl">
                    <DialogHeader className="bg-slate-900 p-8 text-white">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2 uppercase tracking-tight">
                            <Landmark size={20} className="text-blue-500"/> Founder's Office
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">Direct strategic inquiry to the Lead Architect.</DialogDescription>
                    </DialogHeader>
                    <div className="p-8 bg-white"><DepartmentInquiryForm department="Founder's Office" email="ceo@bbu1.com" icon={User} /></div>
                </DialogContent>
            </Dialog>
            
            <a href="https://wa.me/256703572503" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group">
              <div className="h-10 w-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                <Smartphone size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Official WhatsApp</p>
                <span className="text-slate-200 font-semibold">+256 703 572 503</span>
              </div>
            </a>
          </div>
        </div>

        <div className="lg:col-span-2">
          <h4 className="font-bold text-white mb-8 uppercase text-[11px] tracking-widest">Platform</h4>
          <ul className="space-y-4 text-sm font-medium">
            <li><Link href="/features" className="hover:text-blue-500 transition-colors">OS Features</Link></li>
            <li><Link href="/industries" className="hover:text-blue-500 transition-colors">Sector Solutions</Link></li>
            <li><Link href="/download" className="text-blue-500 font-bold hover:text-blue-400">Download App</Link></li>
            <li><Link href="/aura-ai" className="text-blue-400 font-bold flex items-center gap-1.5 italic hover:text-blue-300"><Sparkles size={14}/> Aura AI</Link></li>
            <li><Link href="/pricing" className="hover:text-blue-500 transition-colors">Investment Tiers</Link></li>
          </ul>
        </div>

        <div className="lg:col-span-3">
          <h4 className="font-bold text-white mb-8 uppercase text-[11px] tracking-widest">Organization</h4>
          <ul className="space-y-4 text-sm font-medium">
            <li><Link href="/help-centre" className="hover:text-blue-500 transition-colors">Documentation</Link></li>
            <li><Link href="/courses" className="hover:text-blue-500 transition-colors">BBU1 Academy</Link></li>
            <li><Link href="/about" className="hover:text-blue-500 transition-colors">Executive Profile</Link></li>
            <li><Link href="/careers" className="hover:text-blue-500 transition-colors">Careers & Hiring</Link></li>
          </ul>
        </div>

        <div className="lg:col-span-3">
          <h4 className="font-bold text-white mb-8 uppercase text-[11px] tracking-widest">Support & Admin</h4>
          <ul className="space-y-4 text-sm font-medium">
             {/* SUPPORT MODAL */}
             <li>
                <Dialog>
                    <DialogTrigger asChild>
                        <button className="text-slate-400 hover:text-blue-500 transition-all flex items-center gap-2.5 font-semibold">
                            <Mail size={14}/> Technical Support
                        </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[450px] p-0 border-none rounded-2xl overflow-hidden shadow-2xl">
                        <DialogHeader className="bg-blue-600 p-8 text-white">
                            <DialogTitle className="text-xl font-bold flex items-center gap-2 uppercase tracking-tight">
                                <MessageSquareText size={20}/> Support Desk
                            </DialogTitle>
                            <DialogDescription className="text-blue-100">Submit your technical query to our engineers.</DialogDescription>
                        </DialogHeader>
                        <div className="p-8 bg-white"><DepartmentInquiryForm department="Technical Support" email="support@bbu1.com" icon={MessageSquareText} /></div>
                    </DialogContent>
                </Dialog>
             </li>
             {/* ADMIN MODAL */}
             <li>
                <Dialog>
                    <DialogTrigger asChild>
                        <button className="text-slate-400 hover:text-blue-500 transition-all flex items-center gap-2.5 font-semibold">
                            <ShieldCheck size={14}/> Administration
                        </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[450px] p-0 border-none rounded-2xl overflow-hidden shadow-2xl">
                        <DialogHeader className="bg-slate-800 p-8 text-white">
                            <DialogTitle className="text-xl font-bold flex items-center gap-2 uppercase tracking-tight">
                                <Briefcase size={20}/> Account Administration
                            </DialogTitle>
                            <DialogDescription className="text-slate-400">Inquiries regarding billing, legal, or account status.</DialogDescription>
                        </DialogHeader>
                        <div className="p-8 bg-white"><DepartmentInquiryForm department="Administration" email="admin@bbu1.com" icon={Briefcase} /></div>
                    </DialogContent>
                </Dialog>
             </li>
             <li><Link href="/terms" className="hover:text-blue-500 transition-colors">Terms of Service</Link></li>
             <li><Link href="/privacy" className="hover:text-blue-500 transition-colors">Privacy Policy</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-800/60 pt-10 flex flex-col lg:flex-row justify-between items-center gap-8">
        <div className="space-y-2 text-center lg:text-left">
           <p className="text-slate-200 font-bold text-sm">
             BBU1 is a product of <span className="text-blue-600 uppercase">Litonu Business Base Universe Ltd.</span>
           </p>
           <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
             © {new Date().getFullYear()} All rights reserved • Reg No: 80034302367494
           </p>
        </div>
        
        <div className="flex items-center gap-4 px-5 py-2 bg-slate-900 border border-slate-800 rounded-xl">
           <ShieldCheck className="h-4 w-4 text-blue-500" />
           <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Verified Corporate Entity</span>
        </div>
      </div>
    </div>
  </footer>
);

export default function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHomePage = pathname === "/" || pathname.split("/").length <= 2;

  return (
    <Providers>
      <div className="flex flex-col min-h-screen bg-white text-slate-900 selection:bg-blue-600/20">
        {!isHomePage && <LayoutHeader />}
        <main className="flex-grow">
          {children}
        </main>
        {!isHomePage && <LayoutFooter />}
      </div>
    </Providers>
  );
}