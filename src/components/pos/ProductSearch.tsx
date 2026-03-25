'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from 'use-debounce';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Package, Hash, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area";

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

const cache = new Map<string, SearchResult[]>();

// Professional Highlighter
const SearchResultHighlighter = ({ text, highlight }: { text: string; highlight: string }) => {
  if (!highlight.trim()) return <span>{text}</span>;
  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} className="text-blue-600 font-semibold">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
};

export default function ProductSearch({ onProductSelect }: ProductSearchProps) {
  const supabase = createClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  
  const [debouncedSearchTerm] = useDebounce(searchTerm, 200);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

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
      console.error('Search error:', error);
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

  // Ensure selected item is visible while scrolling with keys
  useEffect(() => {
    if (activeIndex >= 0 && resultsContainerRef.current) {
      const activeElement = resultsContainerRef.current.children[activeIndex] as HTMLElement;
      activeElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  return (
    <div className="relative w-full z-[100]">
      <div className="relative group">
        <div className={cn(
          "absolute left-4 top-1/2 -translate-y-1/2 transition-colors",
          isFocused ? "text-blue-600" : "text-slate-400"
        )}>
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
        </div>
        <Input
          type="text"
          placeholder="Search product name or scan SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={handleKeyDown}
          className={cn(
            "pl-12 h-14 text-lg border-slate-200 bg-white shadow-sm transition-all rounded-xl",
            "focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white",
            isFocused && "shadow-lg"
          )}
          autoComplete="off"
        />
      </div>

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
                      "flex items-center justify-between p-4 cursor-pointer rounded-lg transition-colors group",
                      index === activeIndex ? "bg-blue-50" : "hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-md group-hover:bg-white transition-colors">
                            <Package className="h-4 w-4 text-slate-500" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-slate-900">
                                <SearchResultHighlighter text={product.product_name} highlight={searchTerm} />
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-tight">{product.variant_name}</span>
                                <span className="text-[10px] text-slate-300">•</span>
                                <span className="text-[10px] font-mono font-bold text-blue-500 uppercase flex items-center gap-1">
                                    <Hash className="h-2.5 w-2.5" /> {product.sku || 'No SKU'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-base font-bold text-blue-600">
                                UGX {product.price.toLocaleString()}
                            </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </div>
                ))
              ) : (
                !isLoading && (
                  <div className="p-10 text-center">
                    <div className="inline-flex p-3 bg-slate-50 rounded-full mb-3">
                        <Search className="h-6 w-6 text-slate-300" />
                    </div>
                    <p className="text-sm font-semibold text-slate-500">No matching products found</p>
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