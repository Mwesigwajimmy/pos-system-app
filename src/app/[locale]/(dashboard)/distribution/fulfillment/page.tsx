import OrderFulfillmentTracking from "@/components/distribution/OrderFulfillmentTracking";

export default function FulfillmentPage() {
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <h1 className="text-3xl font-bold">Order Fulfillment</h1>
      <OrderFulfillmentTracking />
    </div>
  );
}