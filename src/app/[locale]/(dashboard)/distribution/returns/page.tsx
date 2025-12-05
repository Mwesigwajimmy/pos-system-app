import ReturnsClaimsManager from "@/components/distribution/ReturnsClaimsManager";

export default function ReturnsPage() {
  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <h1 className="text-3xl font-bold">Returns & Claims</h1>
      <ReturnsClaimsManager />
    </div>
  );
}