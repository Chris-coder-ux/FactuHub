'use client';

import { useState, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { fetcher } from '@/lib/fetcher';
import { ClientForm } from '@/components/forms/ClientForm';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { Search, Plus, Users, Pencil, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useClientActions } from '@/hooks/useClientActions';

interface ClientsResponse {
  data: Client[];
  total: number;
}

export default function ClientsPage() {
  const { data: clientsData, error, isLoading } = useSWR<ClientsResponse | Client[]>('/api/clients', fetcher);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Use client actions hook
  const { deleteClient } = useClientActions({
    onSuccess: () => {
      mutate('/api/clients');
    },
  });

  const clients = useMemo(() => {
    return Array.isArray(clientsData) ? clientsData : clientsData?.data || [];
  }, [clientsData]);

  const filteredClients = useMemo(() => {
    return clients.filter(client => 
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.taxId?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [clients, searchQuery]);

  const handleFormSubmit = async (data: any) => {
    // Optimistic update for editing existing client
    if (editingClient?._id) {
      const updatedClient = { ...editingClient, ...data };
      mutate(
        '/api/clients',
        (current: any) => {
          if (!current) return current;
          const clients = Array.isArray(current) ? current : current.data || [];
          return Array.isArray(current)
            ? clients.map((c: Client) => c._id === editingClient._id ? updatedClient : c)
            : { ...current, data: clients.map((c: Client) => c._id === editingClient._id ? updatedClient : c) };
        },
        false // Don't revalidate immediately
      );
    }

    try {
      const method = editingClient ? 'PUT' : 'POST';
      const url = editingClient ? `/api/clients/${editingClient._id}` : '/api/clients';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        // Revert optimistic update on error
        if (editingClient?._id) {
          mutate('/api/clients');
        }
        throw new Error('Error saving client');
      }

      // Revalidate to get server state
      mutate('/api/clients');
      setDialogOpen(false);
      setEditingClient(null);
      toast.success(editingClient ? 'Cliente actualizado' : 'Cliente creado');
    } catch (err) {
      toast.error('Error al guardar el cliente');
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setDialogOpen(true);
  };

  const handleDelete = async (client: Client) => {
    if (!client._id) return;
    await deleteClient(client);
  };

  if (error) return <div className="p-6 text-destructive">Error al cargar clientes</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
          <p className="text-muted-foreground">Gestiona tu cartera de clientes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingClient(null);
        }}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
            </DialogHeader>
            <ClientForm 
              key={editingClient?._id || 'new'} 
              initialData={editingClient || undefined} 
              onSubmit={handleFormSubmit}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2 bg-card p-1 rounded-lg border shadow-sm max-w-md">
        <Search className="h-5 w-5 text-muted-foreground ml-2" />
        <Input 
          placeholder="Buscar por nombre, email o ID..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border-none shadow-none focus-visible:ring-0"
        />
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="rounded-xl border bg-card shadow-sm overflow-hidden"
      >
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>ID Fiscal</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 inline-block" /></TableCell>
                </TableRow>
              ))
            ) : filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-96 text-center">
                  <EmptyState 
                    title={searchQuery ? "No hay resultados" : "No hay clientes"}
                    description={searchQuery ? "Intenta con otra búsqueda" : "Comienza agregando tu primer cliente"}
                    icon={Users}
                    actionLabel={searchQuery ? undefined : "Crear Cliente"}
                    onAction={searchQuery ? undefined : () => setDialogOpen(true)}
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client: Client, index) => (
                <TableRow key={client._id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                       <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {client.name.substring(0, 2).toUpperCase()}
                       </div>
                       {client.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{client.email}</TableCell>
                  <TableCell className="text-muted-foreground">{client.phone}</TableCell>
                  <TableCell className="font-mono text-sm">{client.taxId}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(client)} className="h-8 w-8 hover:text-primary">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(client)} className="h-8 w-8 hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  );
}