'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { PredesignedTemplate } from '@/lib/templates/predesigned-templates';

interface TemplatePreviewProps {
  template: PredesignedTemplate;
  onSelect?: (template: PredesignedTemplate) => void;
  isSelected?: boolean;
}

export function TemplatePreview({ template, onSelect, isSelected }: TemplatePreviewProps) {
  const categoryLabels: Record<string, string> = {
    minimal: 'Minimalista',
    professional: 'Profesional',
    detailed: 'Detallado',
    branded: 'Con Branding',
  };

  const categoryColors: Record<string, string> = {
    minimal: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    professional: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    detailed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    branded: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative"
    >
      <Card 
        className={`cursor-pointer hover:shadow-lg transition-all duration-300 ${
          isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
        }`}
        onClick={() => onSelect?.(template)}
      >
        <CardContent className="p-0">
          {/* Vista Previa Visual */}
          <div 
            className="h-48 relative overflow-hidden rounded-t-lg"
            style={{
              background: `linear-gradient(135deg, ${template.preview.colors.primary} 0%, ${template.preview.colors.secondary} 100%)`,
            }}
          >
            {/* Simulación de contenido según tipo */}
            {template.type === 'invoice' && (
              <div className="p-4 text-white">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="h-2 w-24 bg-white/30 rounded mb-2" />
                    <div className="h-2 w-16 bg-white/20 rounded" />
                  </div>
                  <div className="h-2 w-20 bg-white/30 rounded" />
                </div>
                <div className="space-y-2 mt-6">
                  <div className="h-1 w-full bg-white/20 rounded" />
                  <div className="h-1 w-3/4 bg-white/20 rounded" />
                  <div className="h-1 w-1/2 bg-white/20 rounded" />
                </div>
                <div className="mt-6 flex justify-between items-center">
                  <div className="h-2 w-16 bg-white/30 rounded" />
                  <div className="h-3 w-20 bg-white/40 rounded" />
                </div>
              </div>
            )}
            
            {template.type === 'email' && (
              <div className="p-4 text-white">
                <div className="h-3 w-32 bg-white/30 rounded mb-4" />
                <div className="space-y-2">
                  <div className="h-1 w-full bg-white/20 rounded" />
                  <div className="h-1 w-5/6 bg-white/20 rounded" />
                  <div className="h-1 w-4/6 bg-white/20 rounded" />
                </div>
                <div className="mt-6 p-3 bg-white/10 rounded">
                  <div className="h-2 w-24 bg-white/30 rounded mb-2" />
                  <div className="h-2 w-16 bg-white/20 rounded" />
                </div>
              </div>
            )}
            
            {template.type === 'pdf' && (
              <div className="p-4 text-white">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-4 w-4 bg-white/30 rounded" />
                  <div className="h-2 w-28 bg-white/30 rounded" />
                </div>
                <div className="space-y-3">
                  <div className="h-2 w-full bg-white/20 rounded" />
                  <div className="h-2 w-3/4 bg-white/20 rounded" />
                  <div className="h-8 w-full bg-white/10 rounded mt-4" />
                  <div className="h-1 w-1/2 bg-white/20 rounded" />
                </div>
              </div>
            )}

            {/* Badge de seleccionado */}
            {isSelected && (
              <div className="absolute top-2 right-2">
                <div className="h-6 w-6 bg-primary rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              </div>
            )}
          </div>

          {/* Información */}
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-lg">{template.name}</h3>
              <Badge className={categoryColors[template.category]}>
                {categoryLabels[template.category]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {template.description}
            </p>
            
            {/* Colores de la plantilla */}
            <div className="flex gap-2 mb-4">
              <div 
                className="h-4 w-4 rounded-full border border-gray-300"
                style={{ backgroundColor: template.preview.colors.primary }}
                title="Color primario"
              />
              <div 
                className="h-4 w-4 rounded-full border border-gray-300"
                style={{ backgroundColor: template.preview.colors.secondary }}
                title="Color secundario"
              />
              <div 
                className="h-4 w-4 rounded-full border border-gray-300"
                style={{ backgroundColor: template.preview.colors.accent }}
                title="Color de acento"
              />
            </div>

            {onSelect && (
              <Button
                variant={isSelected ? "default" : "outline"}
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(template);
                }}
              >
                {isSelected ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Seleccionada
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Seleccionar
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

