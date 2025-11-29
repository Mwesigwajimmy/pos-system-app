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
import { MoreHorizontal, FileText, Trash2, Edit2, ExternalLink, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

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
import { DataTableToolbar } from './data-table-toolbar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// --- Types ---
export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  receipt_url?: string | null;
  expense_categories: { name: string } | null;
  customers: { name: string } | null;
}

// --- Column Definitions ---
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
      <Button 
        variant="ghost" 
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="text-xs uppercase font-semibold"
      >
        Date
      </Button>
    ),
    cell: ({ row }) => <div className="pl-4">{format(new Date(row.getValue('date')), 'MMM d, yyyy')}</div>,
  },
  {
    accessorKey: 'description',
    header: ({ column }) => <Button variant="ghost" className="text-xs uppercase font-semibold">Description</Button>,
    cell: ({ row }) => <div className="font-medium">{row.getValue('description')}</div>,
  },
  {
    // Accessor key matches the faceted filter column ID
    accessorKey: 'expense_categories', 
    header: ({ column }) => <Button variant="ghost" className="text-xs uppercase font-semibold">Category</Button>,
    cell: ({ row }) => {
        const cat = row.original.expense_categories?.name;
        return cat ? (
            <Badge variant="secondary" className="font-normal">{cat}</Badge>
        ) : (
            <span className="text-muted-foreground text-xs italic">Uncategorized</span>
        );
    },
    // Custom filter function for nested object
    filterFn: (row, id, value) => {
        const rowValue = row.original.expense_categories?.name || '';
        return value.includes(rowValue);
    }
  },
  {
    accessorKey: 'customers',
    header: ({ column }) => <Button variant="ghost" className="text-xs uppercase font-semibold">Billed To</Button>,
    cell: ({ row }) =>
      row.original.customers ? (
        <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span className="text-sm">{row.original.customers.name}</span>
        </div>
      ) : (
        <span className="text-muted-foreground text-xs">Internal</span>
      ),
  },
  {
    accessorKey: 'amount',
    header: () => <div className="text-right text-xs uppercase font-semibold">Amount</div>,
    cell: ({ row }) => {
        const amount = parseFloat(row.getValue('amount'));
        const formatted = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
        return <div className="text-right font-medium font-mono">{formatted}</div>
    },
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
            <DropdownMenuItem onClick={() => console.log('Edit', expense.id)}>
              <Edit2 className="mr-2 h-4 w-4 text-blue-600" /> Edit Details
            </DropdownMenuItem>
            {expense.receipt_url && (
              <DropdownMenuItem onClick={() => window.open(expense.receipt_url!, '_blank')}>
                <ExternalLink className="mr-2 h-4 w-4 text-slate-500" /> View Receipt
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
                className="text-red-600 focus:text-red-600"
                onClick={() => console.log('Delete', expense.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete Record
            </DropdownMenuItem>
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
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'date', desc: true }]);
  
  // Extract unique categories for the Faceted Filter
  const uniqueCategories = React.useMemo(() => {
    const categories = new Set(
        expenses
            .map(e => e.expense_categories?.name)
            .filter((name): name is string => !!name)
    ); 
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
    () => table.getFilteredRowModel().rows.reduce((total, row) => total + row.original.amount, 0),
    [table.getFilteredRowModel().rows]
  );

  return (
    <div className="space-y-4">
      <DataTableToolbar table={table} categories={uniqueCategories} />
      
      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50">
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
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                        <FileText className="h-8 w-8 text-slate-300 mb-2" />
                        No expenses match your filters.
                    </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
           <TableFooter className="bg-slate-50">
                <TableRow>
                    <TableCell colSpan={5} className="font-semibold text-right">
                      Total (Visible Rows)
                    </TableCell>
                    <TableCell className="text-right font-bold font-mono text-slate-900">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalAmount)}
                    </TableCell>
                    <TableCell />
                </TableRow>
           </TableFooter>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
            <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">Rows per page</p>
                <Select
                    value={`${table.getState().pagination.pageSize}`}
                    onValueChange={(value) => {
                        table.setPageSize(Number(value))
                    }}
                >
                    <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue placeholder={table.getState().pagination.pageSize} />
                    </SelectTrigger>
                    <SelectContent side="top">
                        {[10, 20, 30, 40, 50].map((pageSize) => (
                            <SelectItem key={pageSize} value={`${pageSize}`}>
                                {pageSize}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
            </div>
            <div className="flex items-center space-x-2">
                <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                >
                    <span className="sr-only">Go to first page</span>
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    <span className="sr-only">Go to previous page</span>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    <span className="sr-only">Go to next page</span>
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    className="hidden h-8 w-8 p-0 lg:flex"
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                >
                    <span className="sr-only">Go to last page</span>
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
}