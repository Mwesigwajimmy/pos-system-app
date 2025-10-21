// src/app/(dashboard)/sacco/members/page.tsx

import MemberAccountsTable from "@/components/sacco/MemberAccountsTable";

export default function SaccoMembersPage() {
    return (
        <div className="container mx-auto py-6 space-y-6">
             <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Member Accounts</h1>
            </div>
            <p className="text-sm text-muted-foreground">
                Manage member profiles, view account balances, and process deposits or withdrawals.
            </p>
            <MemberAccountsTable />
        </div>
    );
}