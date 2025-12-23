'use client';

import { useCallback } from 'react';
import { useSWRConfig } from 'swr';
import { toast } from 'sonner';
import { Product } from '@/types';
import { logger } from '@/lib/logger';

interface UseProductActionsOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Custom hook for product-related actions
 * Provides reusable functions for common product operations
 */
export function useProductActions(options: UseProductActionsOptions = {}) {
  const { mutate } = useSWRConfig();

  /**
   * Delete product (soft delete) with optimistic update
   */
  const deleteProduct = useCallback(async (product: Product) => {
    if (!product._id) {
      toast.error('El producto debe estar guardado para eliminarlo');
      return;
    }

    // Optimistic update: remove product from list immediately
    let previousData: any;
    
    mutate(
      '/api/products',
      (current: any) => {
        if (!current) return current;
        previousData = current; // Store for rollback
        const data = Array.isArray(current) ? current : current.data || [];
        return Array.isArray(current)
          ? data.filter((p: Product) => p._id !== product._id)
          : { ...current, data: data.filter((p: Product) => p._id !== product._id) };
      },
      false // Don't revalidate immediately
    );

    try {
      const response = await fetch(`/api/products/${product._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(errorData.message || 'Error al eliminar el producto');
      }

      // Revalidate to get server state
      mutate('/api/products');
      mutate(`/api/products/${product._id}`);

      toast.success('Producto eliminado correctamente');
      options.onSuccess?.();
    } catch (error) {
      // Revert optimistic update on error
      mutate('/api/products', previousData, false);
      
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar el producto';
      logger.error('Failed to delete product', { error, productId: product._id });
      toast.error(errorMessage);
      options.onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [mutate, options]);

  /**
   * Update product stock with optimistic update
   */
  const updateStock = useCallback(async (product: Product, newStock: number) => {
    if (!product._id) {
      toast.error('El producto debe estar guardado para actualizar el stock');
      return;
    }

    // Optimistic update: update stock immediately
    const updatedProduct = { ...product, stock: newStock };
    
    mutate(
      '/api/products',
      (current: any) => {
        if (!current) return current;
        const data = Array.isArray(current) ? current : current.data || [];
        return Array.isArray(current)
          ? data.map((p: Product) => p._id === product._id ? updatedProduct : p)
          : { ...current, data: data.map((p: Product) => p._id === product._id ? updatedProduct : p) };
      },
      false // Don't revalidate immediately
    );

    mutate(
      `/api/products/${product._id}`,
      updatedProduct,
      false
    );

    try {
      const response = await fetch(`/api/products/${product._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(errorData.message || 'Error al actualizar el stock');
      }

      // Revalidate to get server state
      mutate('/api/products');
      mutate(`/api/products/${product._id}`);

      toast.success('Stock actualizado correctamente');
      options.onSuccess?.();
    } catch (error) {
      // Revert optimistic update on error
      mutate('/api/products');
      mutate(`/api/products/${product._id}`);
      
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar el stock';
      logger.error('Failed to update product stock', { error, productId: product._id });
      toast.error(errorMessage);
      options.onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [mutate, options]);

  return {
    deleteProduct,
    updateStock,
  };
}

