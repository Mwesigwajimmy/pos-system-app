// /src/components/professional-services/expenses/data-table-toolbar.tsx
'use client';

import { Cross2Icon } from '@radix-ui/react-icons';
import { Table } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Imports now resolve correctly since the required files exist
import { DataTableViewOptions } from './data-table-view-options'; 
import { DataTableFacetedFilter } from './data-table-faceted-filter'; 

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  categories: { value: string; label: string; }[];
}

export function DataTableToolbar<TData>({
  table,
  categories
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Filter expenses..."
          // Assumes you have a column named 'description' to filter against
          value={(table.getColumn('description')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('description')?.setFilterValue(event.target.value)
          }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {/* Assumes you have a column named 'expense_categories' for the faceted filter */}
        {table.getColumn('expense_categories') && (
          <DataTableFacetedFilter
            column={table.getColumn('expense_categories')}
            title="Category"
            options={categories}
          />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  );
}