'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ShieldCheck, Lock, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function UpdatePasswordPage() {
    const supabase = createClient();
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 8) {
            toast.error("Security Policy Breach: Password too short.");
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading("Sealing New Master Key...");

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            toast.success("Identity Sealed Successfully", { id: toastId });
            router.push('/login');
        } catch (err: any) {
            toast.error("Update Failed", { id: toastId, description: err.message });
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
                <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="pt-12 text-center bg-blue-600 text-white pb-10">
                        <Lock className="h-10 w-10 mx-auto mb-4" />
                        <CardTitle className="text-2xl font-black uppercase tracking-tighter">New Master Key</CardTitle>
                        <CardDescription className="text-blue-100 font-bold uppercase text-[9px]">Re-securing Sovereign Account</CardDescription>
                    </CardHeader>
                    <CardContent className="p-10">
                        <form onSubmit={handleUpdate} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400">Master Password</label>
                                <div className="relative">
                                    <Input type={showPassword ? "text" : "password"} className="h-14 rounded-xl bg-slate-50 font-bold text-lg pr-12" value={password} onChange={(e) => setPassword(e.target.value)} required />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            <Button type="submit" className="w-full h-14 bg-slate-900 text-white font-black uppercase tracking-widest rounded-xl shadow-lg" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin" /> : "UPDATE IDENTITY SEAL"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}