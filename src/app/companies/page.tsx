'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/lib/fetcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Plus, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const createCompanySchema = z.object({
  name: z.string().min(1, 'El nombre de la compañía es requerido'),
  taxId: z.string().min(1, 'El NIF/CIF es requerido'),
  address: z.object({
    street: z.string().min(1, 'La calle es requerida'),
    city: z.string().min(1, 'La ciudad es requerida'),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().default('España'),
  }),
});

type CreateCompanyFormData = z.infer<typeof createCompanySchema>;

interface Company {
  _id: string;
  name: string;
  role: 'owner' | 'admin' | 'accountant' | 'sales' | 'client';
  isOwner: boolean;
}

interface CompaniesResponse {
  companies: Company[];
}

export default function CompaniesPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data, error, isLoading } = useSWR<CompaniesResponse>('/api/companies', fetcher);
  const companies = data?.companies || [];
  const currentCompanyId = (session?.user as any)?.companyId;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCompanyFormData>({
    resolver: zodResolver(createCompanySchema) as any,
    defaultValues: {
      address: {
        country: 'España',
      },
    },
  });

  const onSubmit = async (data: CreateCompanyFormData) => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear la compañía');
      }

      const result = await response.json();
      
      // Update session with new company
      await update({ companyId: result.company._id });
      
      toast.success('Compañía creada exitosamente');
      reset();
      setShowCreateForm(false);
      mutate('/api/companies');
      router.refresh();
    } catch (error) {
      console.error('Error creating company:', error);
      toast.error(error instanceof Error ? error.message : 'Error al crear la compañía');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSwitchCompany = async (companyId: string) => {
    if (companyId === currentCompanyId) return;

    try {
      const response = await fetch('/api/companies/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cambiar de compañía');
      }

      await update({ companyId });
      toast.success('Compañía cambiada exitosamente');
      router.refresh();
    } catch (error) {
      console.error('Error switching company:', error);
      toast.error(error instanceof Error ? error.message : 'Error al cambiar de compañía');
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
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis Compañías</h1>
          <p className="text-muted-foreground">
            Gestiona las compañías a las que tienes acceso
          </p>
        </div>
        {!showCreateForm && (
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Nueva Compañía
          </Button>
        )}
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Crear Nueva Compañía</CardTitle>
            <CardDescription>
              Completa la información para crear una nueva compañía
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre de la Compañía *</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="Mi Empresa S.L."
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxId">NIF / CIF *</Label>
                  <Input
                    id="taxId"
                    {...register('taxId')}
                    placeholder="B12345678"
                  />
                  {errors.taxId && (
                    <p className="text-sm text-red-500">{errors.taxId.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="street">Calle *</Label>
                <Input
                  id="street"
                  {...register('address.street')}
                  placeholder="Calle Mayor, 12"
                />
                {errors.address?.street && (
                  <p className="text-sm text-red-500">{errors.address.street.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad *</Label>
                  <Input
                    id="city"
                    {...register('address.city')}
                    placeholder="Madrid"
                  />
                  {errors.address?.city && (
                    <p className="text-sm text-red-500">{errors.address.city.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Provincia</Label>
                  <Input
                    id="state"
                    {...register('address.state')}
                    placeholder="Madrid"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">Código Postal</Label>
                  <Input
                    id="zipCode"
                    {...register('address.zipCode')}
                    placeholder="28001"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Compañía
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    reset();
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {companies.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tienes compañías</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crea tu primera compañía para comenzar a usar la aplicación
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Compañía
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {companies.map((company) => (
            <Card
              key={company._id}
              className={`cursor-pointer transition-colors ${
                company._id === currentCompanyId
                  ? 'border-primary bg-primary/5'
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => handleSwitchCompany(company._id)}
            >
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{company.name}</h3>
                    <p className="text-sm text-muted-foreground capitalize">
                      {company.role} {company.isOwner && '• Propietario'}
                    </p>
                  </div>
                </div>
                {company._id === currentCompanyId && (
                  <div className="flex items-center gap-2 text-primary">
                    <Check className="h-5 w-5" />
                    <span className="text-sm font-medium">Activa</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

