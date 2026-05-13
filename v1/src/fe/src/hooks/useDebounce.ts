import { useState, useEffect } from 'react';

/**
 * Debounces a value by delaying updates until after the specified delay period.
 * Useful for search inputs to avoid expensive operations on every keystroke.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (recommended: 200-300ms for search)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
