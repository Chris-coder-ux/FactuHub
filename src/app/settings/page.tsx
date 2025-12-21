'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import useSWR, { mutate } from 'swr';
import { settingsSchema } from '@/lib/validations';
import { fetcher } from '@/lib/fetcher';
import { Settings } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, Building2, CreditCard, Cog, Globe, Loader2, FileCheck, Shield, Upload, Mail, History } from 'lucide-react';
import Link from 'next/link';
import BankingSettings from '@/components/settings/BankingSettings';

type SettingsFormData = z.infer<typeof settingsSchema> & {
  currency: string;
  defaultTaxRate: number;
  stripeEnabled: boolean;
  verifactuEnabled?: boolean;
  verifactuEnvironment?: 'production' | 'sandbox';
  verifactuAutoEnableForSpain?: boolean;
  verifactuAutoSend?: boolean;
  verifactuCertificatePath?: string;
  verifactuCertificatePassword?: string;
  // Email settings
  emailFromAddress?: string;
  emailFromName?: string;
  emailNotificationsEnabled?: boolean;
  emailInvoiceEnabled?: boolean;
  emailOverdueEnabled?: boolean;
  emailPaymentEnabled?: boolean;
  emailTeamInvitesEnabled?: boolean;
  emailFiscalRemindersEnabled?: boolean;
};

export default function SettingsPage() {
  const { data: settingsData, isLoading } = useSWR<{ data: Settings }>('/api/settings', fetcher);
  const { data: bankingData } = useSWR('/api/banking/accounts', fetcher);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema) as any,
    defaultValues: {
      companyName: '',
      taxId: '',
      email: '',
      phone: '',
      currency: 'EUR',
      defaultTaxRate: 21,
      stripeEnabled: false,
      logoUrl: '',
      stripePublicKey: '',
      stripeSecretKey: '',
      verifactuEnabled: false,
      verifactuEnvironment: 'sandbox',
      verifactuAutoEnableForSpain: true,
      verifactuAutoSend: false,
      verifactuCertificatePath: '',
      verifactuCertificatePassword: '',
      emailFromAddress: '',
      emailFromName: '',
      emailNotificationsEnabled: true,
      emailInvoiceEnabled: true,
      emailOverdueEnabled: true,
      emailPaymentEnabled: true,
      emailTeamInvitesEnabled: true,
      emailFiscalRemindersEnabled: true,
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'España'
      }
    }
  });

  const stripeEnabled = watch('stripeEnabled');
  const verifactuEnabled = watch('verifactuEnabled');

  useEffect(() => {
    if (settingsData?.data) {
      // Use any here to handle the potential optional/required mismatch between the API response and the Zod schema
      reset(settingsData.data as any);
    }
  }, [settingsData, reset]);

  const onSubmit = async (data: SettingsFormData) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Error al guardar la configuración');

      toast.success('Configuración actualizada correctamente');
      mutate('/api/settings');
    } catch (error) {
      toast.error('Ocurrió un error al guardar los cambios');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración del Sistema</h1>
        <p className="text-muted-foreground">Gestiona los datos de tu empresa y preferencias del sistema.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
        {/* Company Information */}
        <Card className="border-none shadow-md overflow-hidden">
          <CardHeader className="bg-muted/50">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>Información de la Empresa</CardTitle>
            </div>
            <CardDescription>Estos datos aparecerán en tus facturas y documentos.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nombre Comercial</Label>
                <Input id="companyName" {...register('companyName')} placeholder="Mi Empresa S.L." />
                {errors.companyName && <p className="text-sm text-red-500">{errors.companyName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxId">NIF / CIF</Label>
                <Input id="taxId" {...register('taxId')} placeholder="B12345678" />
                {errors.taxId && <p className="text-sm text-red-500">{errors.taxId.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email de Contacto</Label>
                <Input id="email" type="email" {...register('email')} placeholder="admin@empresa.com" />
                {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono (Opcional)</Label>
                <Input id="phone" {...register('phone')} placeholder="+34 600 000 000" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="street">Dirección</Label>
              <Input id="street" {...register('address.street')} placeholder="Calle Mayor, 12" />
              {errors.address?.street && <p className="text-sm text-red-500">{errors.address.street.message}</p>}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input id="city" {...register('address.city')} placeholder="Madrid" />
                {errors.address?.city && <p className="text-sm text-red-500">{errors.address.city.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Provincia</Label>
                <Input id="state" {...register('address.state')} placeholder="Madrid" />
                {errors.address?.state && <p className="text-sm text-red-500">{errors.address.state.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">C.P.</Label>
                <Input id="zipCode" {...register('address.zipCode')} placeholder="28001" />
                {errors.address?.zipCode && <p className="text-sm text-red-500">{errors.address.zipCode.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Input id="country" {...register('address.country')} placeholder="España" />
                {errors.address?.country && <p className="text-sm text-red-500">{errors.address.country.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operational Preferences */}
        <Card className="border-none shadow-md overflow-hidden">
          <CardHeader className="bg-muted/50">
            <div className="flex items-center gap-2">
              <Cog className="h-5 w-5 text-primary" />
              <CardTitle>Preferencias de Operación</CardTitle>
            </div>
            <CardDescription>Configuración regional y de impuestos por defecto.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Moneda</Label>
                <Input id="currency" {...register('currency')} placeholder="EUR" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultTaxRate">Tipo de IVA por Defecto (%)</Label>
                <Input id="defaultTaxRate" type="number" {...register('defaultTaxRate', { valueAsNumber: true })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logoUrl">URL del Logo (Opcional)</Label>
              <Input id="logoUrl" {...register('logoUrl')} placeholder="https://miweb.com/logo.png" />
              {errors.logoUrl && <p className="text-sm text-red-500">{errors.logoUrl.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Integrations (Stripe) */}
        <Card className="border-none shadow-md overflow-hidden">
          <CardHeader className="bg-muted/50">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle>Integración con Stripe</CardTitle>
            </div>
            <CardDescription>Permite a tus clientes pagar facturas online mediante tarjeta de crédito.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-primary/5">
              <div className="space-y-0.5">
                <Label className="text-base">Habilitar Pagos Online</Label>
                <p className="text-sm text-muted-foreground">Activa el motor de pagos de Stripe en las facturas.</p>
              </div>
              <Switch
                checked={stripeEnabled}
                onCheckedChange={(checked: boolean) => setValue('stripeEnabled', checked)}
              />
            </div>

            {stripeEnabled && (
              <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <Label htmlFor="stripePublicKey">Stripe Public Key (pk_test_...)</Label>
                  <Input id="stripePublicKey" type="password" {...register('stripePublicKey')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stripeSecretKey">Stripe Secret Key (sk_test_...)</Label>
                  <Input id="stripeSecretKey" type="password" {...register('stripeSecretKey')} />
                </div>
                <div className="p-3 bg-blue-50 border border-blue-100 rounded text-sm text-blue-700">
                  <p className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Asegúrate de configurar el webhook en el panel de Stripe para recibir confirmaciones de pago.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* VeriFactu Compliance */}
        <Card className="border-none shadow-md overflow-hidden">
          <CardHeader className="bg-muted/50">
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              <CardTitle>Cumplimiento VeriFactu (AEAT)</CardTitle>
            </div>
            <CardDescription>Configura el cumplimiento automático con la normativa española de facturación electrónica.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-primary/5">
              <div className="space-y-0.5">
                <Label className="text-base">Habilitar VeriFactu</Label>
                <p className="text-sm text-muted-foreground">Activa el cumplimiento automático con la AEAT para facturas españolas.</p>
              </div>
              <Switch
                checked={verifactuEnabled || false}
                onCheckedChange={(checked: boolean) => setValue('verifactuEnabled', checked)}
              />
            </div>

            {verifactuEnabled && (
              <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-top-2">
                {/* Environment Selection */}
                <div className="space-y-2">
                  <Label htmlFor="verifactuEnvironment">Entorno AEAT</Label>
                  <Select
                    value={watch('verifactuEnvironment') || 'sandbox'}
                    onValueChange={(value: string) => setValue('verifactuEnvironment', value as 'sandbox' | 'production')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona entorno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (Pruebas)</SelectItem>
                      <SelectItem value="production">Producción (Real)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Usa Sandbox para pruebas, Producción para facturas reales.
                  </p>
                </div>

                {/* Auto-enable for Spanish clients */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Auto-habilitar para España</Label>
                    <p className="text-xs text-muted-foreground">Habilita automáticamente VeriFactu para clientes con dirección en España.</p>
                  </div>
                  <Switch
                    checked={watch('verifactuAutoEnableForSpain') ?? true}
                    onCheckedChange={(checked: boolean) => setValue('verifactuAutoEnableForSpain', checked)}
                  />
                </div>

                {/* Auto-send to AEAT */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Envío Automático a AEAT</Label>
                    <p className="text-xs text-muted-foreground">Envía automáticamente las facturas firmadas a la AEAT tras generarlas.</p>
                  </div>
                  <Switch
                    checked={watch('verifactuAutoSend') ?? false}
                    onCheckedChange={(checked: boolean) => setValue('verifactuAutoSend', checked)}
                  />
                </div>

                {/* Certificate Configuration */}
                <div className="space-y-4 p-4 border rounded-lg bg-amber-50/50">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-amber-600" />
                    <Label className="text-sm font-medium text-amber-800">Configuración de Certificado Digital</Label>
                  </div>
                  <p className="text-xs text-amber-700">
                    Necesitas un certificado digital de la FNMT para firmar facturas VeriFactu.
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="verifactuCertificatePath" className="text-sm">Ruta del Certificado (.pfx/.p12)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="verifactuCertificatePath"
                        {...register('verifactuCertificatePath')}
                        placeholder="/ruta/a/certificado.p12"
                        className="flex-1"
                      />
                      <Button type="button" variant="outline" size="sm" className="shrink-0">
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ruta absoluta al archivo de certificado en el servidor.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="verifactuCertificatePassword" className="text-sm">Contraseña del Certificado</Label>
                    <Input
                      id="verifactuCertificatePassword"
                      type="password"
                      {...register('verifactuCertificatePassword')}
                      placeholder="Contraseña del certificado"
                    />
                    <p className="text-xs text-muted-foreground">
                      Contraseña proporcionada por la FNMT al descargar el certificado.
                    </p>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-100 rounded text-sm text-blue-700">
                    <p className="flex items-center gap-2">
                      <FileCheck className="h-4 w-4" />
                      Obtén tu certificado en <a href="https://www.fnmt.es" target="_blank" rel="noopener noreferrer" className="underline">www.fnmt.es</a>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Configuration */}
        <Card className="border-none shadow-md overflow-hidden">
          <CardHeader className="bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <CardTitle>Configuración de Emails</CardTitle>
              </div>
              <Link href="/settings/emails">
                <Button variant="outline" size="sm">
                  <History className="h-4 w-4 mr-2" />
                  Ver Historial
                </Button>
              </Link>
            </div>
            <CardDescription>Gestiona el envío de emails y notificaciones automáticas.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {/* Email Remitente */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emailFromAddress">Email Remitente</Label>
                <Input
                  id="emailFromAddress"
                  {...register('emailFromAddress')}
                  placeholder="noreply@tudominio.com"
                  type="email"
                />
                <p className="text-xs text-muted-foreground">
                  Email desde el que se enviarán los mensajes. Si está vacío, se usará la variable de entorno SENDGRID_FROM_EMAIL.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emailFromName">Nombre del Remitente</Label>
                <Input
                  id="emailFromName"
                  {...register('emailFromName')}
                  placeholder="FacturaHub"
                />
                <p className="text-xs text-muted-foreground">
                  Nombre que aparecerá como remitente en los emails.
                </p>
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-primary/5">
                <div className="space-y-0.5">
                  <Label className="text-base">Notificaciones Automáticas</Label>
                  <p className="text-sm text-muted-foreground">Habilitar/deshabilitar todas las notificaciones por email.</p>
                </div>
                <Switch
                  checked={watch('emailNotificationsEnabled') ?? true}
                  onCheckedChange={(checked: boolean) => setValue('emailNotificationsEnabled', checked)}
                />
              </div>

              {watch('emailNotificationsEnabled') && (
                <div className="space-y-3 pt-2 pl-4 border-l-2 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Envío de Facturas</Label>
                      <p className="text-xs text-muted-foreground">Permitir enviar facturas por email.</p>
                    </div>
                    <Switch
                      checked={watch('emailInvoiceEnabled') ?? true}
                      onCheckedChange={(checked: boolean) => setValue('emailInvoiceEnabled', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Facturas Vencidas</Label>
                      <p className="text-xs text-muted-foreground">Notificar cuando una factura está vencida.</p>
                    </div>
                    <Switch
                      checked={watch('emailOverdueEnabled') ?? true}
                      onCheckedChange={(checked: boolean) => setValue('emailOverdueEnabled', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Confirmaciones de Pago</Label>
                      <p className="text-xs text-muted-foreground">Enviar confirmación cuando se recibe un pago.</p>
                    </div>
                    <Switch
                      checked={watch('emailPaymentEnabled') ?? true}
                      onCheckedChange={(checked: boolean) => setValue('emailPaymentEnabled', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Invitaciones a Equipos</Label>
                      <p className="text-xs text-muted-foreground">Enviar emails al invitar miembros al equipo.</p>
                    </div>
                    <Switch
                      checked={watch('emailTeamInvitesEnabled') ?? true}
                      onCheckedChange={(checked: boolean) => setValue('emailTeamInvitesEnabled', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Recordatorios Fiscales</Label>
                      <p className="text-xs text-muted-foreground">Recordatorios de plazos fiscales por email.</p>
                    </div>
                    <Switch
                      checked={watch('emailFiscalRemindersEnabled') ?? true}
                      onCheckedChange={(checked: boolean) => setValue('emailFiscalRemindersEnabled', checked)}
                    />
                  </div>
                </div>
              )}

              <div className="p-3 bg-blue-50 border border-blue-100 rounded text-sm text-blue-700">
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Asegúrate de configurar SENDGRID_API_KEY en las variables de entorno para que los emails funcionen.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Banking Settings */}
        <BankingSettings bankAccounts={(bankingData as any)?.bankAccounts || []} />

        <div className="flex justify-end pt-4">
          <Button type="submit" size="lg" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando Cambios...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar Configuración
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
