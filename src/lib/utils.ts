import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import React from "react" // Import React to use its types for refs

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// === NEWLY ADDED UTILITY ===
/**
 * Merges multiple refs into a single ref callback.
 * This is useful when you need to assign a ref from a parent component
 * and also maintain an internal ref, for instance, with react-hook-form.
 * @param refs The refs to merge.
 * @returns A single ref callback function.
 */
export function mergeRefs<T = any>(
  ...refs: Array<React.MutableRefObject<T | null> | React.LegacyRef<T>>
): React.RefCallback<T> {
  return (val) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") {
        ref(val);
      } else if (ref != null) {
        // Correctly assign the value (which can be T or null) to the ref's current property.
        (ref as React.MutableRefObject<T | null>).current = val;
      }
    });
  };
}