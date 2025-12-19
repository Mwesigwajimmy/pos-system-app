import LocationManager from "@/components/settings/LocationManager";

export default function LocationsSettingsPage() {
    return (
        <div className="container mx-auto py-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Organization Locations</h1>
                <p className="text-muted-foreground mt-1">Manage your physical branches and inventory warehouses.</p>
            </div>
            <LocationManager />
        </div>
    );
}