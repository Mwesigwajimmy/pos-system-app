import PropertyDetailView from "@/components/rentals/PropertyDetailView";

export default function PropertyDetailPage({ params }: { params: { propertyId: string } }) {
    return <PropertyDetailView propertyId={Number(params.propertyId)} />;
}