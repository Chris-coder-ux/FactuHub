/**
 * Support Page
 * Main support page with tickets and FAQ
 */

'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, HelpCircle, Plus } from 'lucide-react';
import { SupportTicketsList } from '@/components/support/SupportTicketsList';
import { CreateTicketForm } from '@/components/support/CreateTicketForm';
import { FAQList } from '@/components/support/FAQList';

export default function SupportPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Centro de Soporte</h1>
        <p className="text-muted-foreground">
          Encuentra respuestas rápidas o contacta con nuestro equipo
        </p>
      </div>

      <Tabs defaultValue="faq" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="faq" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Preguntas Frecuentes
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Mis Tickets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="faq" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preguntas Frecuentes</CardTitle>
              <CardDescription>
                Busca respuestas a las preguntas más comunes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FAQList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold">Mis Tickets de Soporte</h2>
              <p className="text-muted-foreground">
                Gestiona tus solicitudes de soporte
              </p>
            </div>
            <Button onClick={() => setShowCreateForm(!showCreateForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Ticket
            </Button>
          </div>

          {showCreateForm && (
            <Card>
              <CardHeader>
                <CardTitle>Crear Nuevo Ticket</CardTitle>
                <CardDescription>
                  Describe tu problema o consulta y nuestro equipo te ayudará
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CreateTicketForm
                  onSuccess={() => {
                    setShowCreateForm(false);
                  }}
                  onCancel={() => setShowCreateForm(false)}
                />
              </CardContent>
            </Card>
          )}

          <SupportTicketsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

