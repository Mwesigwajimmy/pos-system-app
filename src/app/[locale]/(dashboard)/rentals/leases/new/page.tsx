import CreateLeaseForm from "@/components/rentals/CreateLeaseForm";

export default function NewLeasePage() {
    return (
        <div className="container mx-auto py-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Create New Lease Agreement</h1>
            </div>
            <CreateLeaseForm />
        </div>
    );
}