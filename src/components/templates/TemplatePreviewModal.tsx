'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PredesignedTemplate } from '@/lib/templates/predesigned-templates';
import { X } from 'lucide-react';

interface TemplatePreviewModalProps {
  template: PredesignedTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply?: (template: PredesignedTemplate) => void;
}

export function TemplatePreviewModal({
  template,
  open,
  onOpenChange,
  onApply,
}: TemplatePreviewModalProps) {
  if (!template) return null;

  const categoryLabels: Record<string, string> = {
    minimal: 'Minimalista',
    professional: 'Profesional',
    detailed: 'Detallado',
    branded: 'Con Branding',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template.name}</DialogTitle>
          <DialogDescription>
            {template.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Vista Previa Grande */}
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="h-64 relative"
              style={{
                background: `linear-gradient(135deg, ${template.preview.colors.primary} 0%, ${template.preview.colors.secondary} 100%)`,
              }}
            >
              {template.type === 'invoice' && (
                <div className="p-6 text-white">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="h-3 w-32 bg-white/30 rounded mb-3" />
                      <div className="h-2 w-24 bg-white/20 rounded" />
                    </div>
                    <div className="text-right">
                      <div className="h-3 w-28 bg-white/30 rounded mb-2" />
                      <div className="h-2 w-20 bg-white/20 rounded" />
                    </div>
                  </div>
                  <div className="space-y-3 mt-8">
                    <div className="h-2 w-full bg-white/20 rounded" />
                    <div className="h-2 w-4/5 bg-white/20 rounded" />
                    <div className="h-2 w-3/5 bg-white/20 rounded" />
                  </div>
                  <div className="mt-8 flex justify-between items-center">
                    <div className="h-3 w-24 bg-white/30 rounded" />
                    <div className="h-4 w-32 bg-white/40 rounded" />
                  </div>
                </div>
              )}
              
              {template.type === 'email' && (
                <div className="p-6 text-white">
                  <div className="h-4 w-40 bg-white/30 rounded mb-6" />
                  <div className="space-y-3">
                    <div className="h-2 w-full bg-white/20 rounded" />
                    <div className="h-2 w-5/6 bg-white/20 rounded" />
                    <div className="h-2 w-4/6 bg-white/20 rounded" />
                  </div>
                  <div className="mt-8 p-4 bg-white/10 rounded">
                    <div className="h-3 w-32 bg-white/30 rounded mb-3" />
                    <div className="h-2 w-24 bg-white/20 rounded" />
                  </div>
                </div>
              )}
              
              {template.type === 'pdf' && (
                <div className="p-6 text-white">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-6 w-6 bg-white/30 rounded" />
                    <div className="h-3 w-36 bg-white/30 rounded" />
                  </div>
                  <div className="space-y-4">
                    <div className="h-3 w-full bg-white/20 rounded" />
                    <div className="h-3 w-3/4 bg-white/20 rounded" />
                    <div className="h-12 w-full bg-white/10 rounded mt-6" />
                    <div className="h-2 w-1/2 bg-white/20 rounded" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Información Detallada */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Categoría</h4>
              <Badge>{categoryLabels[template.category]}</Badge>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Tipo</h4>
              <Badge variant="outline">
                {template.type === 'invoice' ? 'Factura' : 
                 template.type === 'email' ? 'Email' : 'PDF'}
              </Badge>
            </div>
            <div className="col-span-2">
              <h4 className="font-semibold mb-2">Paleta de Colores</h4>
              <div className="flex gap-3">
                <div className="flex items-center gap-2">
                  <div 
                    className="h-6 w-6 rounded border border-gray-300"
                    style={{ backgroundColor: template.preview.colors.primary }}
                  />
                  <span className="text-sm text-muted-foreground">Primario</span>
                </div>
                <div className="flex items-center gap-2">
                  <div 
                    className="h-6 w-6 rounded border border-gray-300"
                    style={{ backgroundColor: template.preview.colors.secondary }}
                  />
                  <span className="text-sm text-muted-foreground">Secundario</span>
                </div>
                <div className="flex items-center gap-2">
                  <div 
                    className="h-6 w-6 rounded border border-gray-300"
                    style={{ backgroundColor: template.preview.colors.accent }}
                  />
                  <span className="text-sm text-muted-foreground">Acento</span>
                </div>
              </div>
            </div>
            <div className="col-span-2">
              <h4 className="font-semibold mb-2">Descripción</h4>
              <p className="text-sm text-muted-foreground">
                {template.preview.thumbnail}
              </p>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            {onApply && (
              <Button onClick={() => {
                onApply(template);
                onOpenChange(false);
              }}>
                Usar esta Plantilla
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

