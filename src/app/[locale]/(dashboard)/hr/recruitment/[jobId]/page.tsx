import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Briefcase } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { ApplicantKanbanBoard } from '@/components/hr/recruitment/ApplicantKanbanBoard';

// Data fetching function for a single job opening and its applicants
async function getJobOpeningDetails(supabase: any, jobId: string) {
    const { data: job, error } = await supabase
        .from('job_openings')
        .select(`
            id,
            title,
            description,
            department,
            location,
            status,
            applicants (
                id,
                first_name,
                last_name,
                email,
                stage,
                applied_at
            )
        `)
        .eq('id', jobId)
        .single();

    if (error || !job) {
        console.error("Error fetching job details:", error);
        return null;
    }

    return job;
}

interface JobDetailsPageProps {
    params: {
        jobId: string;
    };
}

export default async function JobDetailsPage({ params }: JobDetailsPageProps) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const job = await getJobOpeningDetails(supabase, params.jobId);

    if (!job) {
        notFound(); // This will render the not-found.tsx file
    }

    const applicantCount = job.applicants.length;

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="mb-6">
                <Button asChild variant="outline" size="sm">
                    <Link href="/hr/recruitment">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to All Jobs
                    </Link>
                </Button>
            </div>

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">{job.title}</h2>
                    <div className="flex items-center space-x-4 text-muted-foreground">
                         {job.department && (
                            <div className="flex items-center">
                                <Briefcase className="mr-2 h-4 w-4" />
                                <span>{job.department}</span>
                            </div>
                        )}
                        {job.location && (
                            <div className="flex items-center">
                                <MapPin className="mr-2 h-4 w-4" />
                                <span>{job.location}</span>
                            </div>
                        )}
                        {/* --- THIS IS THE FIXED LINE --- */}
                        <Badge variant={job.status === 'OPEN' ? 'default' : 'secondary'}>
                            {job.status}
                        </Badge>
                    </div>
                </div>
                <div>
                     <Button variant="outline">Edit Job</Button>
                </div>
            </div>

            {/* Tabs for Details and Applicants */}
            <Tabs defaultValue="applicants" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="applicants">
                        Applicants
                        <span className="ml-2 inline-flex items-center justify-center h-5 w-5 text-xs font-bold bg-primary text-primary-foreground rounded-full">
                            {applicantCount}
                        </span>
                    </TabsTrigger>
                    <TabsTrigger value="details">Job Details</TabsTrigger>
                </TabsList>

                {/* Applicants Tab */}
                <TabsContent value="applicants" className="space-y-4">
                    <ApplicantKanbanBoard
                        applicants={job.applicants}
                        jobId={job.id}
                    />
                </TabsContent>

                {/* Job Details Tab */}
                <TabsContent value="details">
                    <Card>
                        <CardHeader>
                            <CardTitle>Job Description</CardTitle>
                        </CardHeader>
                        <CardContent className="prose dark:prose-invert max-w-none">
                            {job.description ? (
                                <p>{job.description}</p>
                            ) : (
                                <p className="text-muted-foreground">No job description has been provided.</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}