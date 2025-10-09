'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from 'use-debounce';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Loader2, PackageSearch } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const SearchResultHighlighter = ({ text, highlight }: { text: string; highlight: string }) => {
  if (!highlight.trim()) {
    return <span>{text}</span>;
  }
  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} className="font-extrabold text-primary">{part}</span>
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
  
  const [debouncedSearchTerm] = useDebounce(searchTerm, 250);
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
      console.error('Error searching products:', error);
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
    }
  };

  useEffect(() => {
    if (activeIndex >= 0 && resultsContainerRef.current) {
      const activeElement = resultsContainerRef.current.children[activeIndex] as HTMLElement;
      activeElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  return (
    <div className="relative w-full z-50">
      <div className="relative">
        <PackageSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Instantly find any product by name or SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={handleKeyDown}
          className="pl-10 h-14 text-xl font-medium tracking-wider"
          autoComplete="off"
        />
      </div>
      {isFocused && searchTerm.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-card border rounded-lg shadow-2xl max-h-96 overflow-y-auto">
          {isLoading && results.length === 0 ? (
            <div className="p-2 space-y-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-3">
                  <div className="h-5 w-3/4 bg-muted rounded-md animate-pulse mb-2"></div>
                  <div className="h-4 w-1/2 bg-muted rounded-md animate-pulse"></div>
                </div>
              ))}
            </div>
          ) : results.length > 0 ? (
            <div ref={resultsContainerRef}>
              {results.map((product, index) => (
                <div
                  key={product.variant_id}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(product); }}
                  className={cn(
                    "p-3 hover:bg-accent cursor-pointer border-b last:border-b-0",
                    index === activeIndex && "bg-accent ring-2 ring-primary"
                  )}
                >
                  <div className="font-semibold text-base">
                    <SearchResultHighlighter text={`${product.product_name} - ${product.variant_name}`} highlight={searchTerm} />
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>SKU: {product.sku || 'N/A'}</span>
                    <span className="font-bold">UGX {product.price.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground">No products found for "{searchTerm}"</div>
          )}
        </div>
      )}
    </div>
  );
}