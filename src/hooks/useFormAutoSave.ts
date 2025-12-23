'use client';

import { useEffect, useCallback, useRef } from 'react';
import { UseFormWatch } from 'react-hook-form';
import { logger } from '@/lib/logger';

interface UseFormAutoSaveOptions {
  formKey: string;
  enabled?: boolean;
  debounceMs?: number;
  onSave?: (data: any) => void;
}

/**
 * Custom hook for auto-saving form data to localStorage
 * Provides debounced auto-save functionality
 */
export function useFormAutoSave<T extends Record<string, any>>(
  watch: UseFormWatch<T>,
  options: UseFormAutoSaveOptions
) {
  const { formKey, enabled = true, debounceMs = 1000, onSave } = options;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string | null>(null);

  const saveToLocalStorage = useCallback(
    (data: T) => {
      if (!enabled) return;

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout for debounced save
      timeoutRef.current = setTimeout(() => {
        try {
          localStorage.setItem(formKey, JSON.stringify(data));
          lastSavedRef.current = new Date().toLocaleTimeString();
          onSave?.(data);
        } catch (error) {
          logger.error('Failed to save form data to localStorage', { error, formKey });
        }
      }, debounceMs);
    },
    [formKey, enabled, debounceMs, onSave]
  );

  // Watch for changes and auto-save
  useEffect(() => {
    if (!enabled) return;

    const subscription = watch((data) => {
      saveToLocalStorage(data as T);
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [watch, saveToLocalStorage, enabled]);

  /**
   * Load saved data from localStorage
   */
  const loadFromLocalStorage = useCallback((): T | null => {
    try {
      const saved = localStorage.getItem(formKey);
      if (saved) {
        return JSON.parse(saved) as T;
      }
    } catch (error) {
      logger.error('Failed to load form data from localStorage', { error, formKey });
    }
    return null;
  }, [formKey]);

  /**
   * Clear saved data from localStorage
   */
  const clearSavedData = useCallback(() => {
    try {
      localStorage.removeItem(formKey);
      lastSavedRef.current = null;
    } catch (error) {
      logger.error('Failed to clear form data from localStorage', { error, formKey });
    }
  }, [formKey]);

  return {
    loadFromLocalStorage,
    clearSavedData,
    lastSaved: lastSavedRef.current,
  };
}

