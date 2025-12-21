'use client';

import { useState, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { fetcher } from '@/lib/fetcher';
import { ProductForm } from '@/components/forms/ProductForm';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { Search, Plus, Package, Pencil, Trash2, AlertTriangle, Share2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductsResponse {
  data: Product[];
  total: number;
}

export default function ProductsPage() {
  const { data: productsData, error, isLoading } = useSWR<ProductsResponse | Product[]>('/api/products', fetcher);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const products = useMemo(() => {
    return Array.isArray(productsData) ? productsData : productsData?.data || [];
  }, [productsData]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const handleFormSubmit = async (data: any) => {
    try {
      const method = editingProduct ? 'PUT' : 'POST';
      const url = editingProduct ? `/api/products/${editingProduct._id}` : '/api/products';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Error saving product');

      mutate('/api/products');
      setDialogOpen(false);
      setEditingProduct(null);
      toast.success(editingProduct ? 'Producto actualizado' : 'Producto creado');
    } catch (err) {
      toast.error('Error al guardar el producto');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    toast.promise(
      async () => {
         await fetch(`/api/products/${id}`, { method: 'DELETE' });
         mutate('/api/products');
      },
      {
        loading: 'Eliminando producto...',
        success: 'Producto eliminado',
        error: 'Error al eliminar el producto',
      }
    );
  };

  const handleShare = async (product: Product, share: boolean) => {
    try {
      const method = share ? 'POST' : 'DELETE';
      const res = await fetch(`/api/products/${product._id}/share`, { method });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al compartir producto');
      }
      
      mutate('/api/products');
      toast.success(share ? 'Producto compartido con el grupo' : 'Producto descompartido del grupo');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al compartir producto');
    }
  };

  if (error) return <div className="p-6 text-destructive">Error al cargar productos</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Productos</h2>
          <p className="text-muted-foreground">Gestiona tu inventario y servicios</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingProduct(null);
        }}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
              <DialogDescription>
                {editingProduct 
                  ? 'Modifica los datos del producto y guarda los cambios.' 
                  : 'Completa el formulario para crear un nuevo producto o servicio.'}
              </DialogDescription>
            </DialogHeader>
            <ProductForm 
              initialData={editingProduct || undefined} 
              onSubmit={handleFormSubmit}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2 bg-card p-1 rounded-lg border shadow-sm max-w-md">
        <Search className="h-5 w-5 text-muted-foreground ml-2" />
        <Input 
          placeholder="Buscar producto..." 
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
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-[200px]" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-[80px] ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-[60px] ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 inline-block" /></TableCell>
                </TableRow>
              ))
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-96 text-center">
                  <EmptyState 
                    title={searchQuery ? "No hay resultados" : "Inventario vacío"}
                    description={searchQuery ? "Intenta con otra búsqueda" : "Agrega tus primeros productos o servicios"}
                    icon={Package}
                    actionLabel={searchQuery ? undefined : "Crear Producto"}
                    onAction={searchQuery ? undefined : () => setDialogOpen(true)}
                  />
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product: Product) => (
                <TableRow key={product._id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                       <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <Package size={16} />
                       </div>
                       <div className="flex flex-col">
                         <span>{product.name}</span>
                         {product.isShared && (
                           <Badge variant="outline" className="text-xs mt-1 w-fit bg-blue-50 text-blue-700 border-blue-200">
                             Compartido
                           </Badge>
                         )}
                       </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{product.description}</TableCell>
                  <TableCell className="text-right font-semibold">${product.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-2">
                        {product.stock <= (product.alertThreshold || 0) && (
                            <AlertTriangle size={14} className="text-amber-500" />
                        )}
                        <span className={product.stock <= (product.alertThreshold || 0) ? "text-amber-600 font-bold" : ""}>
                        {product.stock}
                        </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {product.companyId && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleShare(product, !product.isShared)} 
                          className="h-8 w-8 hover:text-blue-600"
                          title={product.isShared ? 'Descompartir del grupo' : 'Compartir con el grupo'}
                        >
                          {product.isShared ? (
                            <X className="h-4 w-4" />
                          ) : (
                            <Share2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(product)} className="h-8 w-8 hover:text-primary">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(product._id!)} className="h-8 w-8 hover:text-destructive">
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
