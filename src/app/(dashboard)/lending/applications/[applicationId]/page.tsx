import LoanDetailView from '@/components/lending/LoanDetailView'; // We will create this component next
export default function ApplicationDetailPage({ params }: { params: { applicationId: string } }) {
    return (
        <div className="container mx-auto py-6">
            <LoanDetailView applicationId={Number(params.applicationId)} />
        </div>
    );
}