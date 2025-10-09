import CreateAdjustmentForm from "@/components/inventory/CreateAdjustmentForm";

export default function NewAdjustmentPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-3xl font-bold">New Stock Adjustment</h1>
            <p className="text-sm text-muted-foreground">
                Manually update stock levels for damages, stock takes, or other reasons.
            </p>
        </div>
      </div>
      <CreateAdjustmentForm />
    </div>
  );
}