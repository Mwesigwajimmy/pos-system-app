'use client';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { MoreHorizontal, PlusCircle } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { DataTableToolbar } from './data-table-toolbar'; // Imports corrected in previous step

// Define the shape of our expense data, ensuring nested objects are handled
export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  receipt_url?: string | null;
  expense_categories: { name: string } | null;
  customers: { name: string } | null;
}

// Define the columns with sorting, filtering, and custom rendering
export const columns: ColumnDef<Expense>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'date',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Date
      </Button>
    ),
    cell: ({ row }) => format(new Date(row.getValue('date')), 'PP'),
  },
  {
    accessorKey: 'description',
    header: 'Description',
  },
  {
    accessorKey: 'expense_categories',
    header: 'Category',
    cell: ({ row }) => row.original.expense_categories?.name || <span className="text-muted-foreground">Uncategorized</span>,
    filterFn: (row, id, value) => {
        return value.includes(row.original.expense_categories?.name)
    }
  },
  {
    accessorKey: 'customers',
    header: 'Billed To',
    cell: ({ row }) =>
      row.original.customers ? (
        <Badge variant="outline">{row.original.customers.name}</Badge>
      ) : (
        <span className="text-muted-foreground">Internal</span>
      ),
  },
  {
    accessorKey: 'amount',
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => <div className="text-right font-medium">{formatCurrency(row.getValue('amount'), 'USD')}</div>,
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const expense = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => console.log('Editing', expense.id)}>
              Edit Expense
            </DropdownMenuItem>
            {expense.receipt_url && (
              // FIX: Used non-null assertion operator (!) to assure window.open the URL is a string/URL, not null/undefined
              <DropdownMenuItem onClick={() => window.open(expense.receipt_url!, '_blank')}>
                View Receipt
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">Delete Expense</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export function RevolutionaryExpenseTable({ expenses }: { expenses: Expense[] }) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  
  const uniqueCategories = React.useMemo(() => {
    // Only includes categories with a name (i.e., not null)
    const categories = new Set(expenses.map(e => e.expense_categories?.name).filter(Boolean) as string[]); 
    return Array.from(categories).map(name => ({ value: name, label: name }));
  }, [expenses]);


  const table = useReactTable({
    data: expenses,
    columns,
    state: { sorting, columnVisibility, rowSelection, columnFilters },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const totalAmount = React.useMemo(
    () => table.getRowModel().rows.reduce((total, row) => total + row.original.amount, 0),
    [table.getRowModel().rows]
  );

  return (
    <div className="space-y-4">
      <DataTableToolbar table={table} categories={uniqueCategories} />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No expenses recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
           <TableFooter>
                <TableRow>
                    <TableCell colSpan={columns.length - 2} className="font-semibold">
                      Total for filtered period
                    </TableCell>
                    <TableCell className="text-right font-bold">
                        {formatCurrency(totalAmount, 'USD')}
                    </TableCell>
                    <TableCell />
                </TableRow>
           </TableFooter>
        </Table>
      </div>
      {/* Add Pagination Component Here */}
    </div>
  );
}