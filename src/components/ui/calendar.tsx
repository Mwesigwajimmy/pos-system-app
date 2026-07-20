"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "relative flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-3",
        month_caption: "flex justify-center pt-1 items-center w-full",
        caption_label: "text-sm font-semibold text-slate-900",
        // `nav` is a sibling of `month` (not nested inside the caption),
        // so it needs its own positioned ancestor to anchor `absolute`
        // against — that's `months` above, via `relative`. Without that
        // it anchors to whatever positioned element it finds further up
        // the tree (e.g. the popover), drifting every time the popover
        // resizes (switching months, since week-row counts differ).
        nav: "flex items-center justify-between absolute inset-x-0 top-0 px-1 z-10",
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "h-7 w-7 bg-transparent border-slate-200 p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "h-7 w-7 bg-transparent border-slate-200 p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        ),
        month_grid: "w-full border-collapse mt-2",
        weekdays: "flex",
        weekday: "text-slate-400 rounded-md w-9 font-medium text-[0.75rem] uppercase",
        week: "flex w-full mt-1",
        day: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal rounded-lg text-slate-700 hover:bg-blue-50 hover:text-blue-700 aria-selected:opacity-100"
        ),
        range_start: "day-range-start",
        range_end: "day-range-end",
        selected:
          "[&>button]:bg-blue-600 [&>button]:text-white [&>button]:hover:bg-blue-600 [&>button]:hover:text-white [&>button]:focus:bg-blue-600 [&>button]:focus:text-white",
        today: "[&>button]:bg-slate-100 [&>button]:text-slate-900 [&>button]:font-bold",
        outside: "text-slate-300 opacity-50",
        disabled: "text-slate-300 opacity-40",
        range_middle: "[&>button]:bg-blue-50 [&>button]:text-blue-700 [&>button]:rounded-none",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...chevronProps }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" {...chevronProps} />
          ) : (
            <ChevronRight className="h-4 w-4" {...chevronProps} />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
