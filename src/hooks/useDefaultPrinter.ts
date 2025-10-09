'use client';

import { useState, useEffect } from 'react';

const useDefaultPrinter = () => {
  const [defaultPrinter, setDefaultPrinterState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const savedPrinter = localStorage.getItem('defaultPrinter');
      if (savedPrinter) {
        setDefaultPrinterState(savedPrinter);
      }
    } catch (error) {
      console.error('Failed to access localStorage:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setDefaultPrinter = (printerName: string | null) => {
    try {
      if (printerName) {
        localStorage.setItem('defaultPrinter', printerName);
      } else {
        localStorage.removeItem('defaultPrinter');
      }
      setDefaultPrinterState(printerName);
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  };

  return { defaultPrinter, setDefaultPrinter, isLoading };
};

export default useDefaultPrinter;