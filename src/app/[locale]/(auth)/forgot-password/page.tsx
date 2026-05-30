'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Fingerprint } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const supabase = createClient();

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
        });

        if (error) {
            toast.error("Handshake Refused", { description: error.message });
        } else {
            toast.success("Recovery Link Dispatched", { description: "Check your inbox for the access key." });
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
                <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
                    <CardHeader className="bg-slate-900 text-white text-center py-10">
                        <Fingerprint className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <CardTitle className="text-xl font-black uppercase tracking-tighter">Identity Recovery</CardTitle>
                        <CardDescription className="text-slate-400 font-bold uppercase text-[9px]">BBU1 Sovereign Node Access</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <form onSubmit={handleReset} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Registered Email</label>
                                <Input type="email" placeholder="email@bbu1.com" required value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl h-14 bg-slate-50 border-slate-100" />
                            </div>
                            <Button className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-100" disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin" /> : "DISPATCH RECOVERY LINK"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}