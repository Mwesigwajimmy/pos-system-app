'use client';

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, startOfYear, endOfYear } from "date-fns";
import { Calendar as CalendarIcon, BrainCircuit } from "lucide-react";
import { DateRange } from "react-day-picker"; 
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
// Tooltip and TooltipProvider imports removed as they were only used for the mock day events
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import * as chrono from 'chrono-node';

// All logic related to getEventCountForDay, renderDay, and eventData removed.

const predefinedRanges = [
    { label: "Today", getRange: () => ({ from: new Date(), to: new Date() }) },
    { label: "Last 7 Days", getRange: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
    { label: "This Week", getRange: () => ({ from: startOfWeek(new Date()), to: endOfWeek(new Date()) }) },
    { label: "This Month", getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
    { label: "Last Month", getRange: () => ({ from: startOfMonth(addMonths(new Date(), -1)), to: endOfMonth(addMonths(new Date(), -1)) }) },
    { label: "This Year", getRange: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
];

export function RevolutionaryDateRangePicker() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined;
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined;

    const [date, setDate] = React.useState<DateRange | undefined>({ from, to });
    const [naturalInput, setNaturalInput] = React.useState("");
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

    const handleDateSelect = (range: DateRange | undefined) => {
        setDate(range);
        updateUrlParams(range);
        setIsPopoverOpen(false);
    };

    const updateUrlParams = (range: DateRange | undefined) => {
        const params = new URLSearchParams(searchParams);
        if (range?.from) {
            params.set('from', format(range.from, 'yyyy-MM-dd'));
        } else {
            params.delete('from');
        }
        if (range?.to) {
            params.set('to', format(range.to, 'yyyy-MM-dd'));
        } else {
            params.delete('to');
        }
        router.replace(`/professional-services/ledger?${params.toString()}`);
    };

    const handleNaturalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNaturalInput(e.target.value);
    };

    const handleNaturalInputBlur = () => {
        const parsedResult = chrono.parse(naturalInput);
        if (parsedResult.length > 0) {
            const startDate = parsedResult[0].start.date();
            const endDate = parsedResult[0].end ? parsedResult[0].end.date() : startDate;
            handleDateSelect({ from: startDate, to: endDate });
        }
    };
    
    // Day Rendering logic is now removed.

    // Smart Suggestion Logic (Persisted via localStorage)
    const getSmartSuggestion = (): DateRange | undefined => {
        const lastFrom = typeof window !== 'undefined' ? localStorage.getItem('lastFromDate') : null;
        const lastTo = typeof window !== 'undefined' ? localStorage.getItem('lastToDate') : null;
        
        if (lastFrom && lastTo) {
            const fromDate = new Date(lastFrom);
            const toDate = new Date(lastTo);
            const diff = toDate.getTime() - fromDate.getTime();
            // Suggest the same duration starting today
            return { from: new Date(), to: new Date(new Date().getTime() + diff) };
        }
        return undefined;
    };

    // Effect to persist the last selected dates
    React.useEffect(() => {
        // Protects against Next.js server-side rendering errors when accessing localStorage
        if (typeof window !== 'undefined' && date?.from && date.to) {
            localStorage.setItem('lastFromDate', date.from.toISOString());
            localStorage.setItem('lastToDate', date.to.toISOString());
        }
    }, [date]);


    return (
        <div className="grid gap-2">
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[300px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Pick a date range</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-2">
                        <Input
                            placeholder="e.g., 'last 2 weeks' or 'next month'"
                            value={naturalInput}
                            onChange={handleNaturalInputChange}
                            onBlur={handleNaturalInputBlur}
                        />
                    </div>
                    <div className="flex">
                        <div className="p-2 border-r">
                            {predefinedRanges.map(({ label, getRange }) => (
                                <Button
                                    key={label}
                                    variant="ghost"
                                    className="w-full justify-start"
                                    onClick={() => handleDateSelect(getRange())}
                                >
                                    {label}
                                </Button>
                            ))}
                             {getSmartSuggestion() && (
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start items-center"
                                    onClick={() => handleDateSelect(getSmartSuggestion())}
                                >
                                    <BrainCircuit className="mr-2 h-4 w-4 text-purple-500" />
                                    Smart Suggestion
                                </Button>
                             )}
                        </div>
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={handleDateSelect}
                            numberOfMonths={2}
                            // The `components` prop (Day visualization) is correctly removed.
                        />
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}