'use client';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

async function fetchProfile() {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_my_profile_and_business');
    if (error) throw error;
    return data;
}

export default function ProfilePage() {
    const { data, isLoading } = useQuery({ queryKey: ['myProfile'], queryFn: fetchProfile });

    if (isLoading) return <div>Loading profile...</div>;

    return (
        <div className="container mx-auto py-6 space-y-6">
            <h1 className="text-3xl font-bold">My Profile & Business</h1>
            <Card>
                <CardHeader><CardTitle>Profile Settings</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div><Label>Full Name</Label><Input value={data.profile.full_name} disabled /></div>
                    <div><Label>Email</Label><Input value={data.profile.email} disabled /></div>
                    <div><Label>Role</Label><Input value={data.profile.role} disabled className="capitalize" /></div>
                    <Button>Change Password</Button>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Business Settings</CardTitle><CardDescription>Managed by your admin.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                    <div><Label>Business Name</Label><Input value={data.business.name} disabled /></div>
                    <div><Label>Business Type</Label><Input value={data.business.business_type} disabled className="capitalize" /></div>
                </CardContent>
            </Card>
        </div>
    );
}