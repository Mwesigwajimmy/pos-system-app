import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { RevolutionaryExpenseTable, Expense } from '@/components/expenses/RevolutionaryExpenseTable';
import { RevolutionaryCreateExpenseModal } from '@/components/expenses/RevolutionaryCreateExpenseModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

async function getExpenseData(supabase: any): Promise<Expense[]> {
    const { data: expenses, error } = await supabase
        .from('expenses')
        .select(`
            id,
            date,
            description,
            amount,
            receipt_url,
            expense_categories ( name ),
            customers ( name )
        `)
        .order('date', { ascending: false });

    if (error) {
        console.error("Error fetching expense data:", error);
        return [];
    }

    return (expenses as Expense[]) || [];
}

export default async function ExpensesPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const expenses = await getExpenseData(supabase);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                 <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Expense Management</h1>
                    <p className="text-muted-foreground">
                        A complete, interactive hub to track, categorize, and analyze all your business spending.
                    </p>
                </div>
                <RevolutionaryCreateExpenseModal />
            </div>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Expense History</CardTitle>
                    <CardDescription>
                        Explore all recorded expenses. Use the powerful filter and sort controls to analyze your data.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <RevolutionaryExpenseTable expenses={expenses} />
                </CardContent>
            </Card>
        </div>
    );
}