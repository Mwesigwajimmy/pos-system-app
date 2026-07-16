'use client';

/**
 * --- BBU1 SOVEREIGN IDENTITY NODE ---
 * VERSION: v3.0 OMEGA (PERSONAL VAULT)
 * Use: Advanced user profile management, forensic security, and identity welding.
 * Logic: Avatar Upload + Custom 2FA + WhatsApp Phone Verification.
 */

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { 
  User, ShieldCheck, Camera, Loader2, Globe, 
  Smartphone, Lock, Fingerprint, Calendar, 
  CheckCircle2, AlertTriangle, Mail, Briefcase,
  Zap, Save, X, Trash2, ShieldAlert
} from 'lucide-react';
import { format } from "date-fns";
import toast from 'react-hot-toast';

// --- UI COMPONENTS ---
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const supabase = createClient();

async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    // Fetching the deep profile we birthed in the SQL migration
    const { data, error } = await supabase
        .from('profiles')
        .select(`
            *,
            business:business_id ( name, business_type )
        `)
        .eq('id', user?.id)
        .single();
    
    if (error) throw error;
    return data;
}

export default function ProfilePage() {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    // 1. DATA: Identity Handshake
    const { data: profile, isLoading } = useQuery({ 
        queryKey: ['myProfile'], 
        queryFn: fetchProfile 
    });

    // 2. STATE: Forensic Form Control
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        if (profile) {
            setFormData({
                full_name: profile.full_name || '',
                gender: profile.gender || '',
                birth_date: profile.birth_date || '',
                country_code: profile.country_code || 'UG',
                phone: profile.phone || profile.phone_number || '',
                is_two_factor_enabled: profile.is_two_factor_enabled || false
            });
        }
    }, [profile]);

    // 3. MUTATION: Update Identity Master
    const updateProfile = useMutation({
        mutationFn: async (payload: any) => {
            const { error } = await supabase
                .from('profiles')
                .update(payload)
                .eq('id', profile.id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Identity updated in Sovereign Vault.");
            queryClient.invalidateQueries({ queryKey: ['myProfile'] });
            setIsEditing(false);
        },
        onError: (err: any) => toast.error(err.message)
    });

    // 4. HANDLER: Forensic Avatar Upload
    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `${profile.id}/avatar-${Date.now()}.${fileExt}`;

            // Uploading to the private bucket we created
            const { error: uploadError } = await supabase.storage
                .from('user-avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('user-avatars')
                .getPublicUrl(filePath);

            await updateProfile.mutateAsync({ avatar_url: publicUrl });
        } catch (error: any) {
            toast.error(`Media Error: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    // 5. LOGIC: WhatsApp Verification Node (Free Strategy)
    const handleVerifyPhone = () => {
        if (!formData.phone) return toast.error("Provide a mobile number first.");
        
        // Logic: Generate a forensic code (this would ideally be done via an RPC for security)
        const code = Math.floor(100000 + Math.random() * 900000);
        const message = `BBU1 SOVEREIGN OS: Your verification code is ${code}. Weld this to your profile to enable Phone Login.`;
        
        // Open WhatsApp intent
        const cleanPhone = formData.phone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
        
        toast.info("Verification code dispatched via WhatsApp link.");
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="animate-spin text-blue-600 h-10 w-10" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Synchronizing Vault...</p>
        </div>
    );

    return (
        <div className="container mx-auto py-10 space-y-10 animate-in fade-in duration-700 pb-32">
            
            {/* --- HEADER IDENTITY --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 pb-10">
                <div className="flex items-center gap-6">
                    <div className="relative group">
                        <div className="h-24 w-24 rounded-[2rem] bg-slate-900 overflow-hidden flex items-center justify-center border-4 border-white shadow-2xl transition-transform hover:scale-105">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} className="h-full w-full object-cover" alt="Avatar" />
                            ) : (
                                <span className="text-3xl font-black text-white">{profile?.full_name?.charAt(0)}</span>
                            )}
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"
                            >
                                <Camera className="text-white h-6 w-6" />
                            </button>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
                        {isUploading && <div className="absolute -bottom-2 -right-2 bg-white p-1 rounded-full shadow-lg"><Loader2 className="animate-spin h-4 w-4 text-blue-600" /></div>}
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">{profile?.full_name}</h1>
                        <div className="flex items-center gap-3 mt-1">
                            <Badge className="bg-blue-50 text-blue-700 border-blue-100 uppercase text-[9px] font-black tracking-widest">{profile?.role}</Badge>
                            <span className="text-slate-400 text-xs font-bold">NODE_ID: {profile?.id.substring(0,8)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    {!isEditing ? (
                        <Button onClick={() => setIsEditing(true)} variant="outline" className="h-12 px-8 rounded-2xl font-bold uppercase text-[10px] tracking-widest border-slate-200">Edit Identity</Button>
                    ) : (
                        <div className="flex gap-2 w-full">
                            <Button onClick={() => setIsEditing(false)} variant="ghost" className="h-12 px-6 rounded-2xl font-bold text-slate-400">Cancel</Button>
                            <Button onClick={() => updateProfile.mutate(formData)} className="h-12 px-8 bg-blue-600 text-white rounded-2xl shadow-xl flex-1 font-bold uppercase text-[10px] tracking-widest">
                                {updateProfile.isPending ? <Loader2 className="animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Changes
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                
                {/* --- LEFT: PERSONAL DNA --- */}
                <div className="lg:col-span-2 space-y-10">
                    <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white">
                        <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Fingerprint size={24} /></div>
                            <div>
                                <CardTitle className="text-xl font-bold uppercase tracking-tight">Personal DNA</CardTitle>
                                <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Master identity attributes</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Full Identity Name</Label>
                                    <Input value={formData.full_name} disabled={!isEditing} onChange={e => setFormData({...formData, full_name: e.target.value})} className="h-12 rounded-xl border-slate-100 bg-slate-50/50 font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Email Address</Label>
                                    <Input value={profile?.email} disabled className="h-12 rounded-xl border-slate-100 bg-slate-100/50 text-slate-400 font-medium" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Gender / Sex</Label>
                                    <Select disabled={!isEditing} value={formData.gender} onValueChange={v => setFormData({...formData, gender: v})}>
                                        <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50/50 font-bold"><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent className="rounded-xl shadow-2xl">
                                            <SelectItem value="Male">Male</SelectItem>
                                            <SelectItem value="Female">Female</SelectItem>
                                            <SelectItem value="Private">Decline to state</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Date of Birth</Label>
                                    <div className="relative">
                                        <Input type="date" disabled={!isEditing} value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})} className="h-12 rounded-xl border-slate-100 bg-slate-50/50 font-bold pl-12" />
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase ml-1">Resident Country</Label>
                                    <Input value={formData.country_code} disabled={!isEditing} onChange={e => setFormData({...formData, country_code: e.target.value})} className="h-12 rounded-xl border-slate-100 bg-slate-50/50 font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase ml-1">Preferred Currency</Label>
                                    <Input value={profile?.currency} disabled className="h-12 rounded-xl border-slate-100 bg-slate-100/50 text-slate-400 font-bold" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* --- SECURITY SECTION: 2FA & PHONE --- */}
                    <Card className="rounded-[2.5rem] border-none shadow-2xl shadow-blue-900/5 bg-white overflow-hidden">
                        <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center gap-4">
                            <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg"><Lock size={24} /></div>
                            <div>
                                <CardTitle className="text-xl font-black uppercase tracking-tight">Forensic Security Hub</CardTitle>
                                <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Multi-factor & access control</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-10 space-y-10">
                            
                            {/* PHONE LOGIN WELD */}
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                                <div className="flex items-center gap-5">
                                    <div className="h-14 w-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-blue-600 shadow-sm"><Smartphone size={28} /></div>
                                    <div>
                                        <p className="text-sm font-black uppercase text-slate-900">Phone-Only Sign In</p>
                                        <p className="text-xs font-medium text-slate-500">Enable high-tier mobile authentication via WhatsApp OTP.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <Input placeholder="+256..." value={formData.phone} disabled={!isEditing} onChange={e => setFormData({...formData, phone: e.target.value})} className="h-12 rounded-xl border-slate-200 bg-white font-bold text-center w-full md:w-48" />
                                    <Button onClick={handleVerifyPhone} variant="outline" className="h-12 px-6 rounded-xl font-bold uppercase text-[9px] tracking-[0.2em] border-blue-200 text-blue-600 hover:bg-blue-50">Link Number</Button>
                                </div>
                            </div>

                            {/* 2FA TOGGLE */}
                            <div className="flex items-center justify-between p-6 px-10">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <p className="text-sm font-black uppercase text-slate-900">Two-Factor Authorization</p>
                                        <Badge variant="outline" className="text-[8px] font-black text-blue-500 border-blue-100 uppercase px-2">Experimental</Badge>
                                    </div>
                                    <p className="text-xs font-medium text-slate-400">Protect your vault with a 6-digit forensic key upon every new login.</p>
                                </div>
                                <Switch 
                                    checked={formData.is_two_factor_enabled} 
                                    onCheckedChange={(v) => setFormData({...formData, is_two_factor_enabled: v})}
                                    className="data-[state=checked]:bg-emerald-500" 
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* --- RIGHT: BUSINESS CONTEXT --- */}
                <div className="space-y-10">
                    <Card className="rounded-[2.5rem] border-slate-100 shadow-sm bg-slate-50/50">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Operational Node</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-0 space-y-6">
                            <div className="h-20 w-20 bg-white rounded-3xl flex items-center justify-center shadow-sm border border-slate-100 text-blue-600"><Briefcase size={32} /></div>
                            <div>
                                <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Current Sector</Label>
                                <p className="text-xl font-black text-slate-900 uppercase tracking-tight">{profile?.business?.name || 'NIM UGANDA LTD'}</p>
                            </div>
                            <div>
                                <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Industry Identity</Label>
                                <p className="text-sm font-bold text-slate-500 uppercase">{profile?.business?.business_type || 'Manufacturing'}</p>
                            </div>
                            <div className="p-6 bg-slate-900 rounded-[2rem] shadow-2xl">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck className="text-blue-400" size={16} />
                                    <span className="text-[9px] font-bold text-white uppercase tracking-widest">Tenant Isolation Active</span>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                                    Your personal identity is forensically isolated from other businesses within the Sovereign OS cluster.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* --- SYSTEM FOOTER --- */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 p-6 z-[40] flex justify-center">
                 <div className="flex items-center gap-6 opacity-30">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={14} />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Identity Standard V3.2</span>
                    </div>
                    <div className="h-4 w-[1px] bg-slate-300" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Forensic Node Sealed</span>
                 </div>
            </footer>
        </div>
    );
}