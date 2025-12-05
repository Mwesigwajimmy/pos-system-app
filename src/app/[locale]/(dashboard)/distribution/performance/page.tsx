import DeliveryPerformanceAnalytics from "@/components/distribution/DeliveryPerformanceAnalytics";

export default function AnalyticsPage() {
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <h1 className="text-3xl font-bold">Performance Analytics</h1>
      <DeliveryPerformanceAnalytics />
    </div>
  );
}