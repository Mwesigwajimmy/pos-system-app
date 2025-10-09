import ShiftReport from "@/components/shifts/ShiftReport";

export default function ShiftsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">End-of-Day Reports</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Review daily sales activity, reconcile cash drawers, and monitor employee performance.
      </p>
      <ShiftReport />
    </div>
  );
}