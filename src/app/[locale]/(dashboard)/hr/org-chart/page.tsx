import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import OrgChart, { OrgNode } from '@/components/hr/OrgChart';

// Helper to build tree from flat list
function buildHierarchy(employees: any[]): OrgNode | null {
    const empMap = new Map();
    
    // Initialize all nodes
    employees.forEach(e => {
        empMap.set(e.id, {
            id: e.id,
            name: `${e.first_name} ${e.last_name}`,
            title: e.job_title,
            entity: e.department || 'Company',
            country: e.country_code || 'Global',
            reports: []
        });
    });

    let root: OrgNode | null = null;

    // Connect parents to children
    employees.forEach(e => {
        const node = empMap.get(e.id);
        if (e.manager_id && empMap.has(e.manager_id)) {
            const parent = empMap.get(e.manager_id);
            parent.reports.push(node);
        } else {
            // Assume the person with no manager (or manager not in list) is the Root/CEO
            // In a multi-root scenario, you might need an array of roots.
            if (!root) root = node; 
        }
    });

    return root;
}

export default async function OrgChartPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Fetch id, name, title, and MANAGER_ID
    const { data: employees } = await supabase
        .from('employees')
        .select('id, first_name, last_name, job_title, department, country_code, manager_id');

    const orgTree = employees ? buildHierarchy(employees) : null;

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <h2 className="text-3xl font-bold tracking-tight">Organization Chart</h2>
            <OrgChart data={orgTree} />
        </div>
    );
}