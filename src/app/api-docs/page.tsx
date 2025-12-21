'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ExternalLink, Code, Book, Download } from 'lucide-react';
import Link from 'next/link';

export default function APIDocsPage() {
  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Documentación de la API</h1>
        <p className="text-muted-foreground mt-2">
          Documentación completa de la API REST de AppTrabajo
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5" />
              Documentación
            </CardTitle>
            <CardDescription>Guía completa de la API</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/api-docs/guia">
              <Button variant="outline" className="w-full">
                Ver Documentación
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              SDK TypeScript
            </CardTitle>
            <CardDescription>SDK oficial para integración</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link href="/packages/sdk/README.md" target="_blank">
                <Button variant="outline" className="w-full">
                  Ver SDK
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                <code className="text-xs">npm install @apptrabajo/sdk</code>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              OpenAPI Spec
            </CardTitle>
            <CardDescription>Especificación OpenAPI 3.0</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/docs/api/openapi.yaml" target="_blank">
              <Button variant="outline" className="w-full">
                Descargar Spec
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Endpoints Principales</CardTitle>
          <CardDescription>Resumen de los endpoints disponibles</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Resumen</TabsTrigger>
              <TabsTrigger value="auth">Autenticación</TabsTrigger>
              <TabsTrigger value="invoices">Facturas</TabsTrigger>
              <TabsTrigger value="verifactu">VeriFactu</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Autenticación</h3>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>POST /api/auth/register</code> - Registrar usuario</li>
                    <li><code>POST /api/auth/[...nextauth]</code> - Login</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Clientes</h3>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>GET /api/clients</code> - Listar</li>
                    <li><code>POST /api/clients</code> - Crear</li>
                    <li><code>PUT /api/clients/:id</code> - Actualizar</li>
                    <li><code>DELETE /api/clients/:id</code> - Eliminar</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Facturas</h3>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>GET /api/invoices</code> - Listar</li>
                    <li><code>POST /api/invoices</code> - Crear</li>
                    <li><code>GET /api/invoices/:id/pdf</code> - PDF</li>
                    <li><code>POST /api/invoices/:id/send</code> - Email</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">VeriFactu</h3>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>POST /api/invoices/:id/verifactu/generate</code> - XML</li>
                    <li><code>POST /api/invoices/:id/verifactu/sign</code> - Firmar</li>
                    <li><code>POST /api/invoices/:id/verifactu/send</code> - AEAT</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="auth">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">POST /api/auth/register</h3>
                  <p className="text-sm text-muted-foreground mb-2">Registrar nuevo usuario</p>
                  <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
{`{
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "password": "password123"
}`}
                  </pre>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="invoices">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">POST /api/invoices</h3>
                  <p className="text-sm text-muted-foreground mb-2">Crear factura</p>
                  <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
{`{
  "client": "client-id",
  "items": [
    {
      "product": "product-id",
      "quantity": 2,
      "price": 50,
      "tax": 21,
      "total": 121
    }
  ],
  "dueDate": "2025-12-31",
  "invoiceType": "invoice"
}`}
                  </pre>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="verifactu">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Proceso VeriFactu</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li><code>POST /api/invoices/:id/verifactu/generate</code> - Generar XML</li>
                    <li><code>POST /api/invoices/:id/verifactu/sign</code> - Firmar con certificado</li>
                    <li><code>POST /api/invoices/:id/verifactu/send</code> - Enviar a AEAT</li>
                    <li><code>GET /api/invoices/:id/verifactu/status</code> - Consultar estado</li>
                  </ol>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="analytics">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">GET /api/analytics</h3>
                  <p className="text-sm text-muted-foreground mb-2">Analytics avanzados con filtros opcionales</p>
                  <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
{`GET /api/analytics?startDate=2025-01-01&endDate=2025-12-31

Respuesta:
{
  "clientProfitability": [...],
  "productProfitability": [...],
  "cashFlow": [...],
  "trends": [...],
  "summary": {
    "totalRevenue": 100000,
    "totalExpenses": 50000,
    "totalProfit": 50000,
    "averageMargin": 25.5
  }
}`}
                  </pre>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ejemplos de Código</CardTitle>
          <CardDescription>Ejemplos de uso del SDK</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/examples/sdk-usage.js" target="_blank">
            <Button variant="outline">
              Ver Ejemplos
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

