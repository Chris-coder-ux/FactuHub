'use client';

import { useState, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { fetcher } from '@/lib/fetcher';
import { ReceiptUpload } from '@/components/ReceiptUpload';
import { OCRAccuracyMetrics } from '@/components/receipts/OCRAccuracyMetrics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { Search, Receipt, Eye, Edit, Trash2, Upload, CheckCircle, XCircle, Clock, AlertTriangle, Save, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface Receipt {
  _id: string;
  imageUrl: string;
  originalFilename: string;
  extractedData: {
    merchant?: string;
    date?: string;
    total?: number;
    tax?: number;
    items?: Array<{
      description: string;
      quantity?: number;
      price?: number;
      total?: number;
    }>;
  };
  confidenceScore: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: string;
}

interface ReceiptsResponse {
  receipts: Receipt[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function ReceiptsPage() {
  const { data: receiptsData, error, isLoading } = useSWR<ReceiptsResponse>('/api/receipts?limit=50', fetcher);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState<Receipt['extractedData']>({});

  const receipts = useMemo(() => {
    return receiptsData?.receipts || [];
  }, [receiptsData]);

  const filteredReceipts = useMemo(() => {
    return receipts.filter(receipt =>
      receipt.originalFilename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.extractedData.merchant?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.extractedData.date?.includes(searchQuery)
    );
  }, [receipts, searchQuery]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    }
  };

  const handleUploadComplete = (uploadedReceipts: any[]) => {
    mutate('/api/receipts?limit=50');
    setUploadDialogOpen(false);
    toast.success(`Subidos ${uploadedReceipts.length} recibos`);
  };

  const handleDelete = async (receiptId: string) => {
    toast.promise(
      async () => {
        await fetch(`/api/receipts/${receiptId}`, { method: 'DELETE' });
        mutate('/api/receipts?limit=50');
      },
      {
        loading: 'Eliminando recibo...',
        success: 'Recibo eliminado',
        error: 'Error al eliminar el recibo',
      }
    );
  };

  if (error) return <div className="p-6 text-destructive">Error al cargar recibos</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Recibos</h2>
          <p className="text-muted-foreground">Gestiona y procesa tus recibos con OCR</p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
              <Upload className="mr-2 h-4 w-4" /> Subir Recibos
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Subir Recibos</DialogTitle>
            </DialogHeader>
            <ReceiptUpload onUploadComplete={handleUploadComplete} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2 bg-card p-1 rounded-lg border shadow-sm max-w-md">
        <Search className="h-5 w-5 text-muted-foreground ml-2" />
        <Input
          placeholder="Buscar recibo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border-none shadow-none focus-visible:ring-0"
        />
      </div>

      <Tabs defaultValue="receipts" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="receipts">Recibos</TabsTrigger>
          <TabsTrigger value="metrics">Métricas OCR</TabsTrigger>
        </TabsList>
        
        <TabsContent value="receipts" className="space-y-6">
          <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="aspect-[4/3] bg-muted animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredReceipts.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              title={searchQuery ? "No hay resultados" : "Sin recibos"}
              description={searchQuery ? "Intenta con otra búsqueda" : "Sube tus primeros recibos para procesarlos con OCR"}
              icon={Receipt}
              actionLabel={searchQuery ? undefined : "Subir Recibos"}
              onAction={searchQuery ? undefined : () => setUploadDialogOpen(true)}
            />
          </div>
        ) : (
          filteredReceipts.map((receipt: Receipt) => (
            <motion.div
              key={receipt._id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
                <CardContent className="p-0">
                  <div className="relative aspect-[4/3] bg-muted">
                    <Image
                      src={receipt.imageUrl}
                      alt={receipt.originalFilename}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge className={getStatusColor(receipt.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(receipt.status)}
                          <span className="text-xs capitalize">{receipt.status}</span>
                        </div>
                      </Badge>
                    </div>
                    {receipt.confidenceScore > 0 && (
                      <div className="absolute bottom-2 left-2">
                        <Badge variant="secondary" className="text-xs">
                          {receipt.confidenceScore.toFixed(1)}% confianza
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate text-sm">{receipt.originalFilename}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(receipt.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {receipt.extractedData.merchant && (
                      <p className="text-xs text-muted-foreground truncate">
                        {receipt.extractedData.merchant}
                      </p>
                    )}
                    {receipt.extractedData.total && (
                      <p className="text-sm font-semibold">
                        €{receipt.extractedData.total.toFixed(2)}
                      </p>
                    )}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedReceipt(receipt)}
                        className="h-8 w-8 hover:text-primary"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedReceipt(receipt);
                          setEditedData(receipt.extractedData);
                          setEditMode(true);
                        }}
                        className="h-8 w-8 hover:text-primary"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(receipt._id)}
                        className="h-8 w-8 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
          </motion.div>
        </TabsContent>
        
        <TabsContent value="metrics">
          <OCRAccuracyMetrics />
        </TabsContent>
      </Tabs>

      {/* Receipt Details Dialog */}
      <Dialog open={!!selectedReceipt} onOpenChange={() => {
        setSelectedReceipt(null);
        setEditMode(false);
        setEditedData({});
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editMode ? 'Editar Recibo' : 'Detalles del Recibo'}
            </DialogTitle>
          </DialogHeader>
          {selectedReceipt && (
            <div className="space-y-6">
              <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden">
                <Image
                  src={selectedReceipt.imageUrl}
                  alt={selectedReceipt.originalFilename}
                  fill
                  className="object-contain"
                />
              </div>

              {editMode && (
                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      if (!selectedReceipt) return;
                      
                      try {
                        const response = await fetch(`/api/receipts/${selectedReceipt._id}`, {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            extractedData: editedData,
                          }),
                        });

                        if (!response.ok) {
                          const error = await response.json();
                          throw new Error(error.error || 'Error al guardar cambios');
                        }

                        toast.success('Cambios guardados');
                        setEditMode(false);
                        mutate('/api/receipts?limit=50');
                        // Update selected receipt with new data
                        setSelectedReceipt({
                          ...selectedReceipt,
                          extractedData: editedData,
                        });
                      } catch (error) {
                        console.error('Error saving receipt:', error);
                        toast.error(error instanceof Error ? error.message : 'Error al guardar cambios');
                      }
                    }}
                    className="flex-1"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Cambios
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditMode(false);
                      setEditedData(selectedReceipt?.extractedData || {});
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Archivo</label>
                  <p className="text-sm text-muted-foreground">{selectedReceipt.originalFilename}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Estado</label>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(selectedReceipt.status)}
                    <span className="text-sm capitalize">{selectedReceipt.status}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Confianza OCR</label>
                  <p className="text-sm text-muted-foreground">{selectedReceipt.confidenceScore.toFixed(1)}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Fecha de subida</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedReceipt.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-medium">Datos Extraídos</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Comercio</label>
                    {editMode ? (
                      <Input
                        value={editedData.merchant || ''}
                        onChange={(e) => setEditedData(prev => ({ ...prev, merchant: e.target.value }))}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {selectedReceipt.extractedData.merchant || 'No detectado'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Fecha</label>
                    {editMode ? (
                      <Input
                        type="date"
                        value={editedData.date || ''}
                        onChange={(e) => setEditedData(prev => ({ ...prev, date: e.target.value }))}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {selectedReceipt.extractedData.date || 'No detectada'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium">Total</label>
                    {editMode ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editedData.total || ''}
                        onChange={(e) => setEditedData(prev => ({ ...prev, total: parseFloat(e.target.value) || undefined }))}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-sm font-semibold">
                        {selectedReceipt.extractedData.total ? `€${selectedReceipt.extractedData.total.toFixed(2)}` : 'No detectado'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium">IVA</label>
                    {editMode ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editedData.tax || ''}
                        onChange={(e) => setEditedData(prev => ({ ...prev, tax: parseFloat(e.target.value) || undefined }))}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {selectedReceipt.extractedData.tax ? `€${selectedReceipt.extractedData.tax.toFixed(2)}` : 'No detectado'}
                      </p>
                    )}
                  </div>
                </div>
                {selectedReceipt.extractedData.items && selectedReceipt.extractedData.items.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Artículos</label>
                    <div className="mt-2 space-y-1">
                      {selectedReceipt.extractedData.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="truncate">{item.description}</span>
                          <span className="font-medium">{item.total ? `€${item.total.toFixed(2)}` : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}