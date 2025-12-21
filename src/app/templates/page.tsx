'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import { 
  Search, 
  Plus,
  FileText,
  Mail,
  File,
  Star,
  Edit,
  Trash2,
  Copy,
  MoreVertical,
  Eye
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TemplateDialog } from '@/components/templates/TemplateDialog';
import { TemplatePreview } from '@/components/templates/TemplatePreview';
import { TemplatePreviewModal } from '@/components/templates/TemplatePreviewModal';
import { getPredesignedTemplates, PredesignedTemplate } from '@/lib/templates/predesigned-templates';

interface Template {
  _id: string;
  name: string;
  type: 'invoice' | 'email' | 'pdf';
  isDefault: boolean;
  isShared: boolean;
  invoiceTemplate?: {
    items?: Array<{ product: { name: string } }>;
    client?: { name: string };
  };
  emailTemplate?: {
    subject: string;
  };
  metadata?: {
    description?: string;
    usageCount?: number;
    lastUsedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

const typeLabels: Record<string, string> = {
  invoice: 'Factura',
  email: 'Email',
  pdf: 'PDF',
};

const typeIcons: Record<string, any> = {
  invoice: FileText,
  email: Mail,
  pdf: File,
};

export default function TemplatesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showPredesigned, setShowPredesigned] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<PredesignedTemplate | null>(null);
  const [selectedPredesigned, setSelectedPredesigned] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR<{ data: Template[] }>(
    `/api/templates?type=${typeFilter !== 'all' ? typeFilter : ''}`,
    fetcher
  );

  const templates = data?.data || [];

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.metadata?.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (templateId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta plantilla?')) return;

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Error al eliminar');

      toast.success('Plantilla eliminada');
      mutate();
    } catch (error) {
      toast.error('Error al eliminar plantilla');
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/templates/${templateId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) throw new Error('Error al aplicar plantilla');

      const invoiceData = await response.json();
      
      // Redirigir a crear factura con los datos de la plantilla
      router.push(`/invoices/new?template=${templateId}`);
    } catch (error) {
      toast.error('Error al aplicar plantilla');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10 text-center">
        <p className="text-red-600">Error al cargar las plantillas</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Plantillas</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona plantillas de facturas, emails y PDFs
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPredesigned(!showPredesigned)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {showPredesigned ? 'Ocultar' : 'Ver'} Plantillas Predefinidas
          </Button>
          <Button
            onClick={() => {
              setIsCreating(true);
              setSelectedTemplate(null);
              setIsDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Plantilla
          </Button>
        </div>
      </div>

      {/* Plantillas Predefinidas */}
      {showPredesigned && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Plantillas Predefinidas</h2>
            <p className="text-sm text-muted-foreground">
              Selecciona una plantilla profesional para empezar rápidamente
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getPredesignedTemplates(typeFilter !== 'all' ? typeFilter as any : undefined).map((predesigned) => (
              <TemplatePreview
                key={predesigned.id}
                template={predesigned}
                isSelected={selectedPredesigned === predesigned.id}
                onSelect={(template) => {
                  setSelectedPredesigned(template.id);
                  setPreviewTemplate(template);
                }}
              />
            ))}
          </div>
          {selectedPredesigned && (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedPredesigned(null);
                  setPreviewTemplate(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  const template = getPredesignedTemplates().find(t => t.id === selectedPredesigned);
                  if (!template) return;

                  try {
                    const response = await fetch('/api/templates', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: template.name,
                        type: template.type,
                        ...template.config,
                        metadata: {
                          description: template.description,
                        },
                      }),
                    });

                    if (!response.ok) throw new Error('Error al crear plantilla');

                    toast.success('Plantilla predefinida creada');
                    mutate();
                    setSelectedPredesigned(null);
                    setShowPredesigned(false);
                  } catch (error) {
                    toast.error('Error al crear plantilla');
                  }
                }}
              >
                Crear desde esta Plantilla
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-4 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar plantillas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 border rounded-md"
        >
          <option value="all">Todos los tipos</option>
          <option value="invoice">Facturas</option>
          <option value="email">Emails</option>
          <option value="pdf">PDFs</option>
        </select>
      </div>

      {/* Lista de Plantillas */}
      {filteredTemplates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No hay plantillas"
          description={searchQuery ? "No se encontraron plantillas que coincidan con la búsqueda" : "Crea tu primera plantilla para agilizar la creación de facturas"}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => {
            const Icon = typeIcons[template.type] || FileText;
            return (
              <motion.div
                key={template._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {template.isDefault && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {template.type === 'invoice' && (
                            <DropdownMenuItem
                              onClick={() => handleApplyTemplate(template._id)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Aplicar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedTemplate(template);
                              setIsCreating(false);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(template._id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Badge variant="outline">{typeLabels[template.type]}</Badge>
                      {template.isShared && (
                        <Badge variant="secondary">Compartida</Badge>
                      )}
                      {template.metadata?.description && (
                        <p className="text-sm text-muted-foreground">
                          {template.metadata.description}
                        </p>
                      )}
                      {template.type === 'invoice' && template.invoiceTemplate && (
                        <div className="text-sm text-muted-foreground">
                          <p>
                            {template.invoiceTemplate.items?.length || 0} items
                            {template.invoiceTemplate.client && (
                              <> • Cliente: {template.invoiceTemplate.client.name}</>
                            )}
                          </p>
                        </div>
                      )}
                      {template.type === 'email' && template.emailTemplate && (
                        <p className="text-sm text-muted-foreground">
                          Asunto: {template.emailTemplate.subject}
                        </p>
                      )}
                      {template.metadata?.usageCount && (
                        <p className="text-xs text-muted-foreground">
                          Usada {template.metadata.usageCount} veces
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Dialog para crear/editar */}
      <TemplateDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        template={selectedTemplate}
        isCreating={isCreating}
        onSuccess={() => {
          mutate();
          setIsDialogOpen(false);
        }}
      />

      {/* Modal de vista previa de plantillas predefinidas */}
      <TemplatePreviewModal
        template={previewTemplate}
        open={!!previewTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewTemplate(null);
            setSelectedPredesigned(null);
          }
        }}
        onApply={async (template) => {
          try {
            const response = await fetch('/api/templates', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: template.name,
                type: template.type,
                ...template.config,
                metadata: {
                  description: template.description,
                },
              }),
            });

            if (!response.ok) throw new Error('Error al crear plantilla');

            toast.success('Plantilla creada desde predefinida');
            mutate();
            setPreviewTemplate(null);
            setSelectedPredesigned(null);
            setShowPredesigned(false);
          } catch (error) {
            toast.error('Error al crear plantilla');
          }
        }}
      />
    </div>
  );
}

