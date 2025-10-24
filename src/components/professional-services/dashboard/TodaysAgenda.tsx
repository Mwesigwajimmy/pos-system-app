import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckSquare } from "lucide-react";
import { format } from 'date-fns';

export interface AgendaItem {
    id: string;
    type: 'APPOINTMENT' | 'TASK';
    dateTime: string;
    title: string;
    clientName: string | null;
}

export function TodaysAgenda({ items }: { items: AgendaItem[] }) {
    return (
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Today's Agenda</CardTitle>
                <CardDescription>Appointments and critical deadlines for {format(new Date(), 'PPP')}.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {items.length > 0 ? (
                        items.map(item => (
                            <div key={item.id} className="flex items-center">
                                <div className="font-semibold text-sm w-20 text-center">{format(new Date(item.dateTime), 'h:mm a')}</div>
                                <div className="flex-grow p-3 rounded-md border bg-muted/40 flex items-start">
                                     {item.type === 'APPOINTMENT' 
                                        ? <Calendar className="h-4 w-4 mr-3 mt-1 text-primary" /> 
                                        : <CheckSquare className="h-4 w-4 mr-3 mt-1 text-amber-600" />}
                                    <div>
                                        <p className="font-semibold text-sm">{item.title}</p>
                                        <p className="text-xs text-muted-foreground">{item.clientName || 'Internal Task'}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-muted-foreground py-10">
                            <p>Your agenda is clear for today.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}