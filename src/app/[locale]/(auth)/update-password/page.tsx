'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function UpdatePasswordPage() {
    // INITIALIZING CLIENTS
    const supabase = createClient();
    const router = useRouter();
    const params = useParams(); 
    
    // STATE MANAGEMENT
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    /**
     * HANDLE PASSWORD UPDATE
     * Commits new credentials to the authentication engine.
     */
    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        // Security Validation
        if (password.length < 8) {
            toast.error("Password Too Short", {
                description: "Password must be at least 8 characters for account security."
            });
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading("Updating password...");

        try {
            const { error } = await supabase.auth.updateUser({ password });
            
            if (error) {
                throw error;
            }

            toast.success("Password Updated", { 
                id: toastId,
                description: "Your account credentials have been successfully updated."
            });

            const currentLocale = params?.locale || 'en';
            router.push(`/${currentLocale}/login`);

        } catch (err: any) {
            toast.error("Update Failed", { 
                id: toastId, 
                description: err.message || "An unexpected error occurred." 
            });
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans antialiased">
            
            {/* BACKGROUND PATTERN */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] bg-[url('/patterns/grid-dark.svg')] bg-[length:40px_40px]" />

            <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="relative z-10 w-full max-w-md"
            >
                <Card className="border border-slate-200 shadow-2xl bg-white rounded-2xl overflow-hidden">
                    
                    <CardHeader className="pt-10 text-center pb-6">
                        <div className="flex justify-center mb-4">
                            <img 
                                src="/logo.png" 
                                alt="Company Logo" 
                                className="h-16 w-auto object-contain" 
                            />
                        </div>
                        <div className="space-y-1">
                            <CardTitle className="text-2xl font-bold text-slate-900 tracking-tight">
                                Update Password
                            </CardTitle>
                            <CardDescription className="text-slate-500 font-medium text-sm">
                                Set a new password for your business account.
                            </CardDescription>
                        </div>
                    </CardHeader>

                    <CardContent className="px-8 pb-10">
                        <form onSubmit={handleUpdate} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-700 ml-0.5">
                                    New Password
                                </label>
                                <div className="relative group">
                                    <Input 
                                        type={showPassword ? "text" : "password"} 
                                        className="h-11 rounded-lg border-slate-200 bg-white font-medium text-sm pr-12 focus:ring-1 focus:ring-blue-500 transition-all" 
                                        value={password} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        placeholder="Enter new password"
                                        required 
                                        autoFocus
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPassword(!showPassword)} 
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 px-1">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                    <p className="text-[11px] text-slate-500 font-medium">
                                        Use at least 8 characters for better security.
                                    </p>
                                </div>
                            </div>

                            <Button 
                                type="submit" 
                                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-sm transition-all" 
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Saving Changes...</span>
                                    </div>
                                ) : (
                                    "Save New Password"
                                )}
                            </Button>

                            {/* FOOTER NOTE */}
                            <div className="pt-6 border-t border-slate-50 text-center">
                                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                                    Updating your password will require you to log back in <br /> on all of your active devices.
                                </p>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}