'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from 'use-debounce';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Package, Hash, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * TYPE DEFINITIONS
 */
type SearchResult = {
  variant_id: number;
  product_name: string;
  variant_name: string;
  price: number;
  sku: string;
};

type ProductSearchProps = {
  onProductSelect: (product: SearchResult) => void;
};

/**
 * CLIENT-SIDE CACHE
 * Prevents redundant network requests for identical search terms
 */
const cache = new Map<string, SearchResult[]>();

/**
 * SEARCH RESULT HIGHLIGHTER
 * Safely wraps matched terms in a bold blue span for better user visibility
 */
const SearchResultHighlighter = ({ text, highlight }: { text: string; highlight: string }) => {
  if (!highlight.trim()) return <span className="font-medium">{text}</span>;
  
  // Escaping special characters to prevent regex breaking
  const safeHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${safeHighlight})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <span className="font-medium">
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} className="text-blue-600 font-bold">{part}</span>
        ) : (
          <span key={part + i}>{part}</span>
        )
      )}
    </span>
  );
};

export default function ProductSearch({ onProductSelect }: ProductSearchProps) {
  const supabase = createClient();
  
  // State Management
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  
  // Debounce logic (200ms) to reduce database load
  const [debouncedSearchTerm] = useDebounce(searchTerm, 200);
  
  // Refs for keyboard navigation and container management
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  /**
   * SEARCH EXECUTION
   * Interacts with the database RPC for high-performance product matching
   */
  const performSearch = useCallback(async (term: string) => {
    if (term.length < 1) {
      setResults([]);
      return;
    }

    if (cache.has(term)) {
      setResults(cache.get(term)!);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase.rpc('search_products_for_pos', { p_search_term: term });
    
    if (error) {
      console.error('Search operational error:', error);
      setResults([]);
    } else {
      const searchData = data || [];
      setResults(searchData);
      cache.set(term, searchData);
    }
    setIsLoading(false);
    setActiveIndex(-1);
  }, [supabase]);

  useEffect(() => {
    performSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, performSearch]);

  const handleSelect = (product: SearchResult) => {
    onProductSelect(product);
    setSearchTerm('');
    setResults([]);
    setActiveIndex(-1);
    setIsFocused(false);
  };

  /**
   * KEYBOARD NAVIGATION HANDLER
   * Supports Enter, Escape, ArrowUp, and ArrowDown for power users
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsFocused(false);
    }
  };

  // Ensure the highlighted item is visible within the scroll area during keyboard navigation
  useEffect(() => {
    if (activeIndex >= 0 && resultsContainerRef.current) {
      const activeElement = resultsContainerRef.current.children[activeIndex] as HTMLElement;
      activeElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  return (
    <div className="relative w-full z-[100]">
      {/* SEARCH INPUT GROUP */}
      <div className="relative group">
        <div className={cn(
          "absolute left-4 top-1/2 -translate-y-1/2 transition-colors",
          isFocused ? "text-blue-600" : "text-slate-400"
        )}>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Search className="h-5 w-5" />
          )}
        </div>
        <Input
          type="text"
          placeholder="Search by product name or scan SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsFocused(true)}
          // Timeout allows the click event on a result to fire before the input loses focus
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={handleKeyDown}
          className={cn(
            "pl-12 h-14 text-lg border-slate-200 bg-white shadow-sm transition-all rounded-xl",
            "focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 focus:bg-white",
            isFocused && "shadow-lg border-blue-500"
          )}
          autoComplete="off"
        />
      </div>

      {/* RESULTS DROPDOWN */}
      {isFocused && searchTerm.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden">
          <ScrollArea className="max-h-[400px]">
            <div ref={resultsContainerRef} className="p-1">
              {results.length > 0 ? (
                results.map((product, index) => (
                  <div
                    key={product.variant_id}
                    onMouseDown={(e) => { e.preventDefault(); handleSelect(product); }}
                    className={cn(
                      "flex items-center justify-between p-4 cursor-pointer rounded-lg transition-all group",
                      index === activeIndex ? "bg-blue-50 border-blue-100" : "hover:bg-slate-50 border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-slate-100 rounded-lg group-hover:bg-white transition-colors border border-slate-200/50">
                            <Package className="h-4 w-4 text-slate-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-slate-900 font-semibold text-sm">
                                <SearchResultHighlighter text={product.product_name} highlight={searchTerm} />
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{product.variant_name}</span>
                                <span className="text-[10px] text-slate-300">•</span>
                                <span className="text-[10px] font-mono font-bold text-blue-500 uppercase flex items-center gap-1">
                                    <Hash className="h-2.5 w-2.5" /> {product.sku || 'No SKU'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <div className="text-base font-bold text-slate-900 tabular-nums">
                                <span className="text-[10px] text-slate-400 mr-1 uppercase">UGX</span>
                                {product.price.toLocaleString()}
                            </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </div>
                ))
              ) : (
                !isLoading && (
                  <div className="p-12 text-center">
                    <div className="inline-flex p-4 bg-slate-50 rounded-full mb-4 border border-slate-100">
                        <Search className="h-6 w-6 text-slate-300" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">No matching items found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your search terms or scan a different SKU.</p>
                  </div>
                )
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}