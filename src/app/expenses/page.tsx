'use client';

import { useState, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { fetcher } from '@/lib/fetcher';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import { Search, Receipt, Eye, Edit, Trash2, Plus, CheckCircle, XCircle, Clock, Filter, Download, FileText, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { ExpenseForm } from '@/components/forms/ExpenseForm';
import { ExpenseReportsDialog } from '@/components/expenses/ExpenseReportsDialog';
import { Expense } from '@/types';
import Link from 'next/link';

interface ExpensesResponse {
  data: Expense[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const categoryLabels: Record<string, string> = {
  travel: 'Viajes',
  meals: 'Comidas',
  office: 'Oficina',
  supplies: 'Suministros',
  utilities: 'Servicios',
  marketing: 'Marketing',
  software: 'Software',
  professional_services: 'Servicios Profesionales',
  other: 'Otros',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
};

export default function ExpensesPage() {
  const { data: expensesData, error, isLoading } = useSWR<ExpensesResponse>('/api/expenses?limit=50', fetcher);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [reportsDialogOpen, setReportsDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const expenses = useMemo(() => {
    return expensesData?.data || [];
  }, [expensesData]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const matchesSearch = 
        expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.vendor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
      
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [expenses, searchQuery, statusFilter, categoryFilter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    }
  };

  const handleDelete = async (expenseId: string) => {
    if (!confirm('¿Estás seguro de eliminar este gasto?')) return;

    try {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar el gasto');
      }

      toast.success('Gasto eliminado');
      mutate('/api/expenses?limit=50');
    } catch (error) {
      toast.error('Error al eliminar el gasto');
      console.error(error);
    }
  };

  const handleFormSuccess = () => {
    setCreateDialogOpen(false);
    setEditDialogOpen(false);
    setSelectedExpense(null);
    mutate('/api/expenses?limit=50');
  };

  const handleCreateTestExpense = async () => {
    try {
      const response = await fetch('/api/expenses/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear gasto de prueba');
      }

      const data = await response.json();
      toast.success('Gasto de prueba creado exitosamente');
      mutate('/api/expenses?limit=50');
    } catch (error: any) {
      toast.error(error.message || 'Error al crear gasto de prueba');
      console.error('Error:', error);
    }
  };

  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [filteredExpenses]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10 text-center">
        <p className="text-red-600">Error al cargar los gastos</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gastos</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tus gastos empresariales
          </p>
        </div>
        <div className="flex gap-2">
          {expenses.length === 0 && (
            <Button
              variant="outline"
              onClick={handleCreateTestExpense}
              className="bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Gasto de Prueba
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              const startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
              const endDate = new Date().toISOString().split('T')[0];
              window.open(`/api/expenses/export?format=pdf&startDate=${startDate}&endDate=${endDate}`, '_blank');
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
              const endDate = new Date().toISOString().split('T')[0];
              window.open(`/api/expenses/export?format=csv&startDate=${startDate}&endDate=${endDate}`, '_blank');
            }}
          >
            <FileText className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => setReportsDialogOpen(true)}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Reportes
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Gasto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Gasto</DialogTitle>
              </DialogHeader>
              <ExpenseForm onSuccess={handleFormSuccess} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Gastos</div>
            <div className="text-2xl font-bold">{filteredExpenses.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Importe Total</div>
            <div className="text-2xl font-bold">{totalAmount.toFixed(2)} €</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Pendientes</div>
            <div className="text-2xl font-bold">
              {expenses.filter(e => e.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Aprobados</div>
            <div className="text-2xl font-bold">
              {expenses.filter(e => e.status === 'approved').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por descripción, proveedor o tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-md"
        >
          <option value="all">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobado</option>
          <option value="rejected">Rechazado</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border rounded-md"
        >
          <option value="all">Todas las categorías</option>
          {Object.entries(categoryLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No hay gastos"
          description="Comienza creando tu primer gasto"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExpenses.map((expense) => (
            <motion.div
              key={expense._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{expense.description}</h3>
                      <p className="text-sm text-muted-foreground">{expense.vendor || 'Sin proveedor'}</p>
                    </div>
                    <Badge className={getStatusColor(expense.status)}>
                      {getStatusIcon(expense.status)}
                      <span className="ml-1">{statusLabels[expense.status]}</span>
                    </Badge>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Importe:</span>
                      <span className="font-semibold">{expense.amount.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">IVA:</span>
                      <span>{expense.taxAmount.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Categoría:</span>
                      <Badge variant="outline">{categoryLabels[expense.category]}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Fecha:</span>
                      <span>{new Date(expense.date).toLocaleDateString('es-ES')}</span>
                    </div>
                    {expense.receiptIds && expense.receiptIds.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Recibos:</span>
                        <Link href={`/receipts`} className="text-sm text-blue-600 hover:underline">
                          {expense.receiptIds.length} recibo(s)
                        </Link>
                      </div>
                    )}
                  </div>

                  {expense.tags && expense.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {expense.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedExpense(expense);
                        setEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(expense._id!)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Gasto</DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <ExpenseForm
              initialData={selectedExpense}
              isEditing={true}
              onSuccess={handleFormSuccess}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Reports Dialog */}
      <ExpenseReportsDialog
        open={reportsDialogOpen}
        onOpenChange={setReportsDialogOpen}
      />
    </div>
  );
}

