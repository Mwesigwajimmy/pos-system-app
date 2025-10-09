'use client';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

async function fetchBusinessType() {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_my_business_type');
    if (error) return null;
    return data;
}

export function useBusinessType() {
    return useQuery({ queryKey: ['businessType'], queryFn: fetchBusinessType });
}