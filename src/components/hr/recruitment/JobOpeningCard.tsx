'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, Briefcase } from "lucide-react";
import { cn } from '@/lib/utils';

// Define the shape of the job prop
export interface JobOpening {
    id: string;
    title: string;
    department: string | null;
    location: string | null;
    status: string;
    created_at: string;
    applicant_count: number;
}

interface JobOpeningCardProps {
    job: JobOpening;
}

export function JobOpeningCard({ job }: JobOpeningCardProps) {
    const timeAgo = formatDistanceToNow(new Date(job.created_at), { addSuffix: true });

    return (
        <Link href={`/hr/recruitment/${job.id}`} className="block hover:shadow-lg transition-shadow duration-200 rounded-lg">
            <Card className={cn(
                "flex flex-col h-full",
                job.status === 'CLOSED' && "bg-muted/50"
            )}>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-lg font-semibold">{job.title}</CardTitle>
                        {/* --- THIS IS THE FIXED LINE --- */}
                        <Badge variant={job.status === 'OPEN' ? 'default' : 'secondary'}>
                            {job.status}
                        </Badge>
                    </div>
                    <CardDescription>Posted {timeAgo}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-3">
                    {job.department && (
                        <div className="flex items-center text-sm text-muted-foreground">
                            <Briefcase className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span>{job.department}</span>
                        </div>
                    )}
                    {job.location && (
                        <div className="flex items-center text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span>{job.location}</span>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <div className="flex items-center text-sm font-medium">
                        <Users className="h-4 w-4 mr-2 text-primary" />
                        <span>{job.applicant_count} Applicant{job.applicant_count !== 1 ? 's' : ''}</span>
                    </div>
                </CardFooter>
            </Card>
        </Link>
    );
}