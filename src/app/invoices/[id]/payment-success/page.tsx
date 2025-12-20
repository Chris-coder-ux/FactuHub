'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function PaymentSuccessPage() {
  const params = useParams();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center p-8 border-none shadow-2xl">
        <div className="mb-6 flex justify-center">
          <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
        </div>
        <CardHeader>
          <CardTitle className="text-3xl font-black text-slate-900">¡Pago Exitoso!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600">
            Hemos recibido tu pago correctamente. Se ha enviado un correo de confirmación a tu dirección de email.
          </p>
          <div className="pt-6">
            <Button asChild className="w-full bg-slate-900 h-12 text-lg font-bold">
              <Link href={`/public/invoices/${params.id}`}>
                Volver a la Factura <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
