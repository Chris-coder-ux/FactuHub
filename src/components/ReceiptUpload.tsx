'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, X, FileImage } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReceiptUploadProps {
  onUploadComplete?: (receipts: any[]) => void;
  maxFiles?: number;
  className?: string;
}

export function ReceiptUpload({ onUploadComplete, maxFiles = 10, className }: ReceiptUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const uploadFiles = useCallback(async (files: File[]) => {
    setUploading(true);
    const results: any[] = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append('receipt', file);

      try {
        const response = await fetch('/api/receipts', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Error uploading file');
        }

        const data = await response.json();
        results.push(data.receipt);
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Error subiendo ${file.name}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }

    if (results.length > 0) {
      toast.success(`Subidos ${results.length} recibos correctamente`);
      onUploadComplete?.(results);
    }

    setUploading(false);
    // Clear uploaded files after upload
    setUploadedFiles([]);
  }, [onUploadComplete]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    // Validate files
    const invalidFiles = acceptedFiles.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      toast.error('Solo se permiten archivos de imagen');
      return;
    }

    const oversizedFiles = acceptedFiles.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error('Los archivos deben ser menores de 10MB');
      return;
    }

    setUploadedFiles(prev => {
      if (prev.length + acceptedFiles.length > maxFiles) {
        toast.error(`Máximo ${maxFiles} archivos permitidos`);
        return prev;
      }
      return [...prev, ...acceptedFiles];
    });

    // Start upload
    await uploadFiles(acceptedFiles);
  }, [maxFiles, uploadFiles]);

  const removeFile = (file: File) => {
    setUploadedFiles(prev => prev.filter(f => f !== file));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxFiles: maxFiles - uploadedFiles.length,
    disabled: uploading
  });

  return (
    <div className={cn("space-y-4", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
          uploading && "pointer-events-none opacity-50"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div className="p-3 rounded-full bg-muted">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {isDragActive ? 'Suelta los archivos aquí' : 'Arrastra y suelta imágenes de recibos'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              O haz clic para seleccionar archivos (máx. {maxFiles} archivos, 10MB cada uno)
            </p>
          </div>
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Archivos seleccionados:</p>
          {uploadedFiles.map((file) => (
            <div key={file.name} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <FileImage className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFile(file)}
                disabled={uploading}
                className="h-6 w-6 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Procesando recibos...</p>
        </div>
      )}
    </div>
  );
}