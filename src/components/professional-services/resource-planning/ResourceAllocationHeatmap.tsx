'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Users, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';

interface TenantContext { tenantId: string; }

// Strict DB Response Type
interface RawAllocation {
  id: string;
  date: string;
  hours: number;
  employees: { id: string; name: string; } | null; // Join result
  projects: { name: string; } | null; // Join result
}

// Optimized Grid Row Type
interface EmployeeRow {
  id: string;
  name: string;
  allocations: Record<string, number>; // Date string -> Hours map for O(1) lookup
  totalWeeklyHours: number;
}

async function fetchAllocations(tenantId: string, startDate: Date, endDate: Date) {
  const db = createClient();
  
  // REAL: Fetch only records within the specific week window to ensure scalability
  const { data, error } = await db
    .from('resource_allocations')
    .select(`
      id,
      date,
      hours,
      employees!inner(id, name),
      projects(name)
    `)
    .eq('tenant_id', tenantId)
    .gte('date', format(startDate, 'yyyy-MM-dd'))
    .lte('date', format(endDate, 'yyyy-MM-dd'));

  if (error) throw error;
  
  // Cast to specific structure since Supabase types are generic
  return data as unknown as RawAllocation[];
}

export default function ResourceAllocationHeatmap({ tenant }: { tenant: TenantContext }) {
  // State: Default to current week
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Derived dates
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const { data: rawData, isLoading } = useQuery({
    queryKey: ['resource-heatmap', tenant.tenantId, format(weekStart, 'yyyy-MM-dd')],
    queryFn: () => fetchAllocations(tenant.tenantId, weekStart, weekEnd),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Optimize Data Transformation: O(n) complexity using Maps instead of nested loops
  const gridData = useMemo(() => {
    if (!rawData) return [];

    const employeeMap = new Map<string, EmployeeRow>();

    rawData.forEach((record) => {
      if (!record.employees) return;
      
      const empId = record.employees.id;
      
      if (!employeeMap.has(empId)) {
        employeeMap.set(empId, {
          id: empId,
          name: record.employees.name,
          allocations: {},
          totalWeeklyHours: 0
        });
      }

      const empRow = employeeMap.get(empId)!;
      // Sum hours if multiple projects on same day
      const currentDayHours = empRow.allocations[record.date] || 0;
      empRow.allocations[record.date] = currentDayHours + record.hours;
      empRow.totalWeeklyHours += record.hours;
    });

    return Array.from(employeeMap.values());
  }, [rawData]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)); // Mon-Fri
  }, [weekStart]);

  const getCellColor = (hours: number) => {
    if (!hours) return 'bg-slate-50 text-slate-300';
    if (hours <= 4) return 'bg-emerald-100 text-emerald-800'; // Light load
    if (hours <= 8) return 'bg-blue-100 text-blue-800';       // Optimal load
    return 'bg-rose-100 text-rose-900 font-semibold';         // Overworked
  };

  return (
    <Card className="h-full shadow-sm border-t-4 border-t-blue-600">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600"/> Resource Utilization
            </CardTitle>
            <CardDescription>Monitor team capacity and allocation intensity.</CardDescription>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-md">
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}>
              <ChevronLeft className="w-4 h-4"/>
            </Button>
            <div className="flex items-center gap-2 px-2 text-sm font-medium">
              <Calendar className="w-4 h-4 text-slate-500"/>
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </div>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>
              <ChevronRight className="w-4 h-4"/>
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-slate-300"/></div>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-3 font-semibold text-slate-600 w-[200px]">Employee</th>
                  {weekDays.map(day => (
                    <th key={day.toISOString()} className="p-3 font-semibold text-center text-slate-600 min-w-[80px]">
                      {format(day, 'EEE dd')}
                    </th>
                  ))}
                  <th className="p-3 font-semibold text-center text-slate-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {gridData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No allocations found for this week.
                    </td>
                  </tr>
                ) : (
                  gridData.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-medium text-slate-800">{row.name}</td>
                      {weekDays.map(day => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const hours = row.allocations[dateKey] || 0;
                        return (
                          <td key={dateKey} className="p-1 text-center">
                            <div className={`h-10 rounded-md flex items-center justify-center text-xs ${getCellColor(hours)}`}>
                              {hours > 0 ? `${hours}h` : '-'}
                            </div>
                          </td>
                        );
                      })}
                      <td className="p-3 text-center font-bold text-slate-700">
                        {row.totalWeeklyHours}h
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="flex gap-4 mt-4 text-xs text-muted-foreground justify-end">
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-100 rounded"></div> &le; 4h (Light)</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-100 rounded"></div> 8h (Full)</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-rose-100 rounded"></div> &gt; 8h (Overtime)</div>
        </div>
      </CardContent>
    </Card>
  );
}