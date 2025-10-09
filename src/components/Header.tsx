// src/components/Header.tsx
'use client';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui/button';

export default function Header() {
  const router = useRouter();
  const supabase = createClient();
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };
  return (
    <header className="flex justify-between items-center p-4 bg-white border-b">
      <h2 className="text-xl font-semibold">Dashboard</h2>
      <Button onClick={handleLogout} variant="destructive">Logout</Button>
    </header>
  );
}