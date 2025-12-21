'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function GuiaCompletaPage() {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContent() {
      try {
        const response = await fetch('/api/docs/guia');
        if (response.ok) {
          const text = await response.text();
          setContent(text);
        } else {
          setContent('# Error\n\nNo se pudo cargar la guía completa.');
        }
      } catch (error) {
        console.error('Error loading guide:', error);
        setContent('# Error\n\nNo se pudo cargar la guía completa.');
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/api-docs">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Documentación
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="p-8">
            <div className="prose prose-slate dark:prose-invert max-w-none
              prose-headings:font-bold prose-headings:text-foreground
              prose-h1:text-4xl prose-h1:mb-6 prose-h1:mt-0
              prose-h2:text-3xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-b prose-h2:pb-2 prose-h2:border-border
              prose-h3:text-2xl prose-h3:mt-6 prose-h3:mb-3
              prose-h4:text-xl prose-h4:mt-4 prose-h4:mb-2
              prose-p:text-foreground/80 prose-p:leading-7
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-code:text-sm prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-[''] prose-code:after:content-['']
              prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:overflow-x-auto
              prose-strong:font-semibold prose-strong:text-foreground
              prose-ul:list-disc prose-ul:pl-6
              prose-ol:list-decimal prose-ol:pl-6
              prose-li:my-2
              prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic
              prose-table:w-full prose-table:border-collapse prose-table:my-4
              prose-th:border prose-th:border-border prose-th:p-2 prose-th:bg-muted prose-th:font-semibold
              prose-td:border prose-td:border-border prose-td:p-2
              prose-hr:border-border">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

