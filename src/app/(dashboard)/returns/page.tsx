import ReturnProcessing from "@/components/returns/ReturnProcessing";

export default function ReturnsPage() {
    return (
        <div className="container mx-auto py-6">
            <h1 className="text-3xl font-bold mb-6">Process a Return or Refund</h1>
            <ReturnProcessing />
        </div>
    );
}