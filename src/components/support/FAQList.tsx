/**
 * FAQ List Component
 */

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetcher } from '@/lib/fetcher';
import { HelpCircle, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const categoryLabels = {
  general: 'General',
  billing: 'Facturación',
  technical: 'Técnico',
  verifactu: 'VeriFactu',
  ocr: 'OCR',
  other: 'Otro',
};

interface FAQ {
  _id: string;
  question: string;
  answer: string;
  category: 'general' | 'billing' | 'technical' | 'verifactu' | 'ocr' | 'other';
  tags?: string[];
  views?: number;
  helpful?: number;
  notHelpful?: number;
  isPublished?: boolean;
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface FAQResponse {
  data: FAQ[];
}

export function FAQList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const queryParams = new URLSearchParams();
  if (categoryFilter !== 'all') queryParams.set('category', categoryFilter);
  if (searchQuery) queryParams.set('search', searchQuery);

  const { data, error, isLoading } = useSWR<FAQResponse>(
    `/api/support/faq?${queryParams.toString()}`,
    fetcher
  );

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <HelpCircle className="h-12 w-12 mx-auto mb-4" />
            <p>Error al cargar las preguntas frecuentes.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const faqs = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar en preguntas frecuentes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="billing">Facturación</SelectItem>
            <SelectItem value="technical">Técnico</SelectItem>
            <SelectItem value="verifactu">VeriFactu</SelectItem>
            <SelectItem value="ocr">OCR</SelectItem>
            <SelectItem value="other">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {faqs.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No se encontraron preguntas frecuentes con los filtros seleccionados.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {faqs.map((faq: FAQ) => {
            const isExpanded = expandedItems.has(faq._id);
            return (
              <Card key={faq._id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{faq.question}</CardTitle>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                          {categoryLabels[faq.category as keyof typeof categoryLabels]}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleExpanded(faq._id)}
                      className="ml-4"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-muted-foreground whitespace-pre-line">
                        {faq.answer}
                      </p>
                    </div>
                    {faq.tags && faq.tags.length > 0 && (
                      <div className="flex gap-2 mt-4 flex-wrap">
                        {faq.tags.map((tag: string) => (
                          <span
                            key={tag}
                            className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

