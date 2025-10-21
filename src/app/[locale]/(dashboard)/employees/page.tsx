import EmployeeDataTable from "@/components/employees/EmployeeDataTable";
import { columns } from "@/components/employees/columns";

export default function EmployeesPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Employee Management</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Invite, view, and manage roles for all employees in your organization.
      </p>
      <EmployeeDataTable columns={columns} />
    </div>
  );
}