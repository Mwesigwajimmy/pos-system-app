import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// --- Mock Component Placeholders for UI structure ---
const OnboardingTemplateList = ({ templates }: { templates: any[] }) => (
    <div className="p-10 border-2 border-dashed rounded-lg">
        <h3 className="text-center font-semibold">OnboardingTemplateList Component</h3>
        <p className="text-center text-sm text-muted-foreground">This will display a list of all onboarding checklist templates.</p>
        <pre className="mt-4 text-xs bg-muted p-2 rounded">{JSON.stringify(templates, null, 2)}</pre>
    </div>
);
const CreateTemplateModal = () => (
    <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium">Create New Template</button>
);
// --- End Mock Components ---

// This utility should ideally live in a central auth file
async function getCurrentUser(supabase: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }
    const { data: employee } = await supabase
        .from('employees')
        .select('id, role')
        .eq('user_id', user.id)
        .single();
    return employee;
}

// Define the type for the data returned by the Supabase query
interface OnboardingTemplateFromQuery {
  // Allows for any properties from the '*' selector
  [key: string]: any; 
  onboarding_template_items: {
    id: string;
  }[]; // An array of objects, each with an 'id'
}


// Data fetching function for onboarding templates.
async function getOnboardingTemplates(supabase: any) {
    const { data, error } = await supabase
        .from('onboarding_templates')
        .select(`*, onboarding_template_items(id)`)
        .order('created_at', { ascending: false });

    if (error) {
        console.warn("Could not fetch onboarding templates (table might not exist yet):", error.message);
        return [];
    }

    // --- THIS IS THE FIXED BLOCK ---
    return data.map((template: OnboardingTemplateFromQuery) => ({
        ...template,
        task_count: template.onboarding_template_items.length
    }));
}


export default async function OnboardingManagementPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const currentUser = await getCurrentUser(supabase);

    if (!currentUser || !['admin', 'manager'].includes(currentUser.role)) {
        return (
             <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <h2 className="text-3xl font-bold tracking-tight text-destructive">Access Denied</h2>
                <p>You do not have permission to access the onboarding management module.</p>
            </div>
        );
    }
    
    const onboardingTemplates = await getOnboardingTemplates(supabase);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Onboarding Management</h2>
                    <p className="text-muted-foreground">
                        Create and manage reusable onboarding checklists for new hires.
                    </p>
                </div>
                <CreateTemplateModal />
            </div>

            <OnboardingTemplateList templates={onboardingTemplates} />
        </div>
    );
}