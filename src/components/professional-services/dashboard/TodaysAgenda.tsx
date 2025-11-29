'use client';

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckSquare, Clock, MapPin, MoreHorizontal } from "lucide-react";
import { format, parseISO, isSameDay } from 'date-fns';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- EXPORTED INTERFACE ---
export interface AgendaItem {
    id: string;
    type: 'APPOINTMENT' | 'TASK';
    dateTime: string;
    title: string;
    description?: string;
    clientName: string | null;
}

export function TodaysAgenda({ items }: { items: AgendaItem[] }) {
    // Enterprise Grade: Ensure we aren't crashing on undefined arrays
    const safeItems = items || [];
    const today = new Date();

    return (
        <Card className="lg:col-span-2 h-full shadow-sm flex flex-col">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        Today's Agenda
                    </CardTitle>
                    <CardDescription>
                        {format(today, 'EEEE, MMMM do, yyyy')}
                    </CardDescription>
                </div>
                <Button variant="outline" size="icon">
                    <Calendar className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="flex-1 p-0">
                <ScrollArea className="h-[400px] p-6 pt-0">
                    <div className="space-y-6 mt-2">
                        {safeItems.length > 0 ? (
                            safeItems.map((item, index) => {
                                const itemTime = new Date(item.dateTime);
                                const isTask = item.type === 'TASK';
                                
                                return (
                                    <div key={item.id} className="relative flex group">
                                        {/* Timeline Line */}
                                        <div className="absolute left-[58px] top-8 bottom-[-24px] w-px bg-slate-200 group-last:hidden" />
                                        
                                        {/* Time Column */}
                                        <div className="w-[45px] flex flex-col items-end mr-6 pt-1">
                                            <span className="text-sm font-bold text-slate-700">
                                                {format(itemTime, 'h:mm')}
                                            </span>
                                            <span className="text-xs text-slate-400 font-medium uppercase">
                                                {format(itemTime, 'a')}
                                            </span>
                                        </div>

                                        {/* Content Card */}
                                        <div className={`flex-1 rounded-lg border p-4 transition-all hover:shadow-md ${
                                            isTask 
                                            ? "bg-white border-slate-200 hover:border-indigo-300" 
                                            : "bg-blue-50/40 border-blue-100 hover:border-blue-300"
                                        }`}>
                                            <div className="flex items-start justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    {isTask ? (
                                                        <div className="p-1.5 rounded bg-amber-100 text-amber-700">
                                                            <CheckSquare className="w-3.5 h-3.5" />
                                                        </div>
                                                    ) : (
                                                        <div className="p-1.5 rounded bg-blue-100 text-blue-700">
                                                            <Clock className="w-3.5 h-3.5" />
                                                        </div>
                                                    )}
                                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                        {item.clientName || 'General'}
                                                    </span>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2">
                                                    <MoreHorizontal className="w-4 h-4 text-slate-400" />
                                                </Button>
                                            </div>
                                            
                                            <h4 className="text-sm font-bold text-slate-900 leading-snug">
                                                {item.title}
                                            </h4>
                                            
                                            {item.description && (
                                                <div className="flex items-center mt-2 text-xs text-slate-500">
                                                    <MapPin className="w-3 h-3 mr-1" />
                                                    <span className="truncate">{item.description}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                                <div className="p-4 bg-slate-50 rounded-full mb-3">
                                    <Calendar className="w-8 h-8 text-slate-300" />
                                </div>
                                <h3 className="text-lg font-medium text-slate-900">No events today</h3>
                                <p className="text-sm text-slate-500 max-w-xs mt-1">
                                    Your schedule is clear. Enjoy the free time or pick up a backlog task.
                                </p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}