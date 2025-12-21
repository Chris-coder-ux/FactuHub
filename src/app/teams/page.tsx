'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, UserPlus, Mail, Trash2, Shield, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { fetcher } from '@/lib/fetcher';
import useSWR from 'swr';

interface Member {
  userId: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'accountant' | 'sales' | 'client';
  isOwner: boolean;
}

interface Company {
  _id: string;
  name: string;
  role: string;
  isOwner: boolean;
}

const roleLabels: Record<string, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  accountant: 'Contador',
  sales: 'Ventas',
  client: 'Cliente',
};

const roleColors: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  accountant: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  sales: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  client: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

export default function TeamsPage() {
  const { data: session, update } = useSession();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'accountant' | 'sales' | 'client'>('accountant');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);

  // Fetch user's companies
  const { data: companiesData, mutate: mutateCompanies } = useSWR<{ companies: Company[] }>(
    '/api/companies',
    fetcher
  );

  // Fetch members of selected company
  const { data: membersData, mutate: mutateMembers } = useSWR<{ members: Member[] }>(
    selectedCompanyId ? `/api/companies/${selectedCompanyId}/members` : null,
    fetcher
  );

  // Set default company on load
  useEffect(() => {
    if (companiesData?.companies && companiesData.companies.length > 0 && !selectedCompanyId) {
      const currentCompany = companiesData.companies.find(c => c._id === session?.user?.companyId) || companiesData.companies[0];
      setSelectedCompanyId(currentCompany._id);
    }
  }, [companiesData, session, selectedCompanyId]);

  const selectedCompany = companiesData?.companies?.find(c => c._id === selectedCompanyId);
  const canManageUsers = selectedCompany?.isOwner || selectedCompany?.role === 'admin';
  const members = membersData?.members || [];

  const handleInvite = async () => {
    if (!selectedCompanyId || !inviteEmail.trim()) {
      toast.error('Por favor ingresa un email válido');
      return;
    }

    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al invitar miembro');
      }

      toast.success('Invitación enviada exitosamente');
      setInviteEmail('');
      setIsInviteDialogOpen(false);
      mutateMembers();
    } catch (error: any) {
      toast.error(error.message || 'Error al invitar miembro');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'accountant' | 'sales' | 'client') => {
    if (!selectedCompanyId) return;

    setIsUpdatingRole(userId);
    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al actualizar rol');
      }

      toast.success('Rol actualizado exitosamente');
      mutateMembers();
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar rol');
    } finally {
      setIsUpdatingRole(null);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedCompanyId) return;
    if (!confirm('¿Estás seguro de que deseas eliminar a este miembro del equipo?')) return;

    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/members/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar miembro');
      }

      toast.success('Miembro eliminado exitosamente');
      mutateMembers();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar miembro');
    }
  };

  if (!session) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Por favor inicia sesión para ver los equipos</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Gestión de Equipos
          </h1>
          <p className="text-muted-foreground mt-2">
            Administra los miembros y roles de tus compañías
          </p>
        </div>
      </div>

      {/* Company Selector */}
      {companiesData?.companies && companiesData.companies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Seleccionar Compañía</CardTitle>
            <CardDescription>Elige la compañía para gestionar su equipo</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedCompanyId || ''}
              onValueChange={setSelectedCompanyId}
            >
              <SelectTrigger className="w-full md:w-[400px]">
                <SelectValue placeholder="Selecciona una compañía" />
              </SelectTrigger>
              <SelectContent>
                {companiesData.companies.map((company) => (
                  <SelectItem key={company._id} value={company._id}>
                    {company.name} {company.isOwner && '(Propietario)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      {selectedCompanyId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Miembros del Equipo
                </CardTitle>
                <CardDescription>
                  {selectedCompany?.name} • {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
                </CardDescription>
              </div>
              {canManageUsers && (
                <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invitar Miembro
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invitar Nuevo Miembro</DialogTitle>
                      <p className="text-sm text-muted-foreground">
                        Invita a un usuario por email a unirse al equipo
                      </p>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="invite-email">Email</Label>
                        <Input
                          id="invite-email"
                          type="email"
                          placeholder="usuario@ejemplo.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="invite-role">Rol</Label>
                        <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                          <SelectTrigger id="invite-role">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="accountant">Contador</SelectItem>
                            <SelectItem value="sales">Ventas</SelectItem>
                            <SelectItem value="client">Cliente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleInvite} className="w-full">
                        <Mail className="h-4 w-4 mr-2" />
                        Enviar Invitación
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay miembros en este equipo</p>
                {canManageUsers && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setIsInviteDialogOpen(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invitar Primer Miembro
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {members.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {member.isOwner ? (
                          <Shield className="h-5 w-5 text-primary" />
                        ) : (
                          <UserCog className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{member.name}</p>
                          {member.isOwner && (
                            <Badge variant="outline" className="text-xs">Propietario</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                      {canManageUsers && !member.isOwner && (
                        <div className="flex items-center gap-2">
                          <Select
                            value={member.role}
                            onValueChange={(v: any) => handleUpdateRole(member.userId, v)}
                            disabled={isUpdatingRole === member.userId}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrador</SelectItem>
                              <SelectItem value="accountant">Contador</SelectItem>
                              <SelectItem value="sales">Ventas</SelectItem>
                              <SelectItem value="client">Cliente</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMember(member.userId)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {!canManageUsers && (
                        <Badge className={roleColors[member.role]}>
                          {roleLabels[member.role]}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedCompanyId && companiesData?.companies && companiesData.companies.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No tienes compañías. Crea una para comenzar.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

