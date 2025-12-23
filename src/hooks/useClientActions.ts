'use client';

import { useCallback } from 'react';
import { useSWRConfig } from 'swr';
import { toast } from 'sonner';
import { Client } from '@/types';
import { logger } from '@/lib/logger';

interface UseClientActionsOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Custom hook for client-related actions
 * Provides reusable functions for common client operations
 */
export function useClientActions(options: UseClientActionsOptions = {}) {
  const { mutate } = useSWRConfig();

  /**
   * Delete client (soft delete) with optimistic update
   */
  const deleteClient = useCallback(async (client: Client) => {
    if (!client._id) {
      toast.error('El cliente debe estar guardado para eliminarlo');
      return;
    }

    // Optimistic update: remove client from list immediately
    let previousData: any;
    
    mutate(
      '/api/clients',
      (current: any) => {
        if (!current) return current;
        previousData = current; // Store for rollback
        const data = Array.isArray(current) ? current : current.data || [];
        return Array.isArray(current)
          ? data.filter((c: Client) => c._id !== client._id)
          : { ...current, data: data.filter((c: Client) => c._id !== client._id) };
      },
      false // Don't revalidate immediately
    );

    try {
      const response = await fetch(`/api/clients/${client._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(errorData.message || 'Error al eliminar el cliente');
      }

      // Revalidate to get server state
      mutate('/api/clients');
      mutate(`/api/clients/${client._id}`);

      toast.success('Cliente eliminado correctamente');
      options.onSuccess?.();
    } catch (error) {
      // Revert optimistic update on error
      mutate('/api/clients', previousData, false);
      
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar el cliente';
      logger.error('Failed to delete client', { error, clientId: client._id });
      toast.error(errorMessage);
      options.onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [mutate, options]);

  /**
   * Send email to client
   */
  const sendEmail = useCallback(async (client: Client, subject: string, body: string) => {
    if (!client.email) {
      toast.error('El cliente no tiene un email configurado');
      return;
    }

    try {
      const response = await fetch('/api/clients/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client._id,
          email: client.email,
          subject,
          body,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(errorData.message || 'Error al enviar el email');
      }

      toast.success('Email enviado correctamente');
      options.onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al enviar el email';
      logger.error('Failed to send email to client', { error, clientId: client._id });
      toast.error(errorMessage);
      options.onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [options]);

  return {
    deleteClient,
    sendEmail,
  };
}

