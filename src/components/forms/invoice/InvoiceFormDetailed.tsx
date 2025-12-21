'use client';

import React, { useState } from 'react';
import { UseFormRegister, UseFormSetValue, Control, UseFormWatch } from 'react-hook-form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Users, Plane, Search, Pencil, FileSignature, Plus, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InvoiceFormData } from './types';
import { Product } from '@/types';

interface InvoiceFormDetailedProps {
  register: UseFormRegister<InvoiceFormData>;
  setValue: UseFormSetValue<InvoiceFormData>;
  watch: UseFormWatch<InvoiceFormData>;
  control: Control<InvoiceFormData>;
  fields: any[];
  append: (item: any) => void;
  remove: (index: number) => void;
  products: Product[];
  onProductChange: (index: number, productId: string) => void;
  subtotal: number;
  totalTax: number;
  total: number;
  invoiceNumber?: string;
  orderNumber?: string;
  clients?: Array<{ _id?: string; name: string; email: string }>;
}

export function InvoiceFormDetailed({
  register,
  setValue,
  watch,
  control,
  fields,
  append,
  remove,
  products,
  onProductChange,
  subtotal,
  totalTax,
  total,
  invoiceNumber,
  orderNumber,
  clients = [],
}: InvoiceFormDetailedProps) {
  const [activeTab, setActiveTab] = useState('detailed');
  const watchedItems = watch('items') || [];
  const invoiceType = watch('invoiceType') || 'invoice';
  const fromAddress = watch('fromAddress') || '';
  const billingAddress = watch('billingAddress') || '';
  const shippingAddress = watch('shippingAddress') || '';
  const paymentTerms = watch('paymentTerms') || 'El pago se efectuará en 15 días';
  const invoiceDate = watch('invoiceDate') || new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');
  const dueDate = watch('dueDate') || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');

  const calculateItemTotal = (index: number) => {
    const item = watchedItems[index];
    if (!item) return 0;
    const quantity = item.quantity || 0;
    const price = item.price || 0;
    const tax = item.tax || 0;
    return quantity * price * (1 + tax / 100);
  };

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="basic">Formulario básico</TabsTrigger>
          <TabsTrigger value="detailed" className="bg-yellow-400 text-black data-[state=active]:bg-yellow-400">
            Formulario detallado - Con vto. y dirección de envío
          </TabsTrigger>
        </TabsList>

        <TabsContent value="detailed" className="mt-0">
          <div className="grid grid-cols-12 gap-6">
            {/* Columna Izquierda - Direcciones */}
            <div className="col-span-4 space-y-6">
              {/* De (From) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <Label htmlFor="from-address" className="font-semibold">De</Label>
                </div>
                <Textarea
                  id="from-address"
                  {...register('fromAddress')}
                  placeholder="Su Empresa o Nombre, y Dirección"
                  className="min-h-[120px] resize-none"
                  value={fromAddress}
                  onChange={(e) => setValue('fromAddress', e.target.value)}
                />
              </div>

              {/* Facturar a (Bill to) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <Label htmlFor="billing-address" className="font-semibold">Facturar a</Label>
                </div>
                <Textarea
                  id="billing-address"
                  {...register('billingAddress')}
                  placeholder="Dirección de facturación de su cliente"
                  className="min-h-[120px] resize-none"
                  value={billingAddress}
                  onChange={(e) => setValue('billingAddress', e.target.value)}
                />
              </div>

              {/* Enviar a (Ship to) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Plane className="h-5 w-5 text-muted-foreground" />
                  <Label htmlFor="shipping-address" className="font-semibold">Enviar a</Label>
                </div>
                <Textarea
                  id="shipping-address"
                  {...register('shippingAddress')}
                  placeholder="Dirección de envío de su cliente (opcional)"
                  className="min-h-[120px] resize-none"
                  value={shippingAddress}
                  onChange={(e) => setValue('shippingAddress', e.target.value)}
                />
              </div>

              {/* Condiciones de pago */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="payment-terms" className="font-semibold">
                      Condiciones y forma de pago
                    </Label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-auto p-0"
                    onClick={() => {
                      const newTerms = prompt('Editar condiciones de pago:', paymentTerms);
                      if (newTerms !== null) {
                        setValue('paymentTerms', newTerms);
                      }
                    }}
                  >
                    Editar
                  </Button>
                </div>
                <Textarea
                  id="payment-terms"
                  {...register('paymentTerms')}
                  className="min-h-[80px] resize-none"
                  value={paymentTerms}
                  onChange={(e) => setValue('paymentTerms', e.target.value)}
                />
              </div>
            </div>

            {/* Columna Central - Items */}
            <div className="col-span-5 space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-medium w-20">Cant.</th>
                      <th className="px-3 py-2 text-left text-sm font-medium">Descripción</th>
                      <th className="px-3 py-2 text-left text-sm font-medium w-32">Precio unitario</th>
                      <th className="px-3 py-2 text-left text-sm font-medium w-32">Importe</th>
                      <th className="px-3 py-2 text-left text-sm font-medium w-32">Impuesto</th>
                      <th className="px-3 py-2 text-left text-sm font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => {
                      const item = watchedItems[index];
                      return (
                        <tr key={field.id} className="border-b">
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              step="0.1"
                              {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                              className="w-full"
                              defaultValue={item?.quantity || 1}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Textarea
                              {...register(`items.${index}.description`)}
                              placeholder="Descripción"
                              className="min-h-[60px] resize-none"
                              defaultValue={item?.description || ''}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              step="0.01"
                              {...register(`items.${index}.price`, { valueAsNumber: true })}
                              className="w-full"
                              defaultValue={item?.price || 0}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={calculateItemTotal(index).toFixed(2)}
                              readOnly
                              className="w-full bg-muted"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => {
                                  const tax = prompt('Impuesto (%):', item?.tax?.toString() || '21');
                                  if (tax) {
                                    setValue(`items.${index}.tax`, parseFloat(tax));
                                  }
                                }}
                              >
                                Añadir impu...
                              </Button>
                              {item?.tax && (
                                <span className="text-sm">{item.tax}%</span>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => remove(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                ×
                              </Button>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              ×
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-400"
                onClick={() => append({ product: '', quantity: 1, price: 0, tax: 21, description: '', total: 0 })}
              >
                Añadir concepto nuevo
              </Button>
            </div>

            {/* Columna Derecha - Metadatos */}
            <div className="col-span-3 space-y-4">
              {/* Logo */}
              <div className="border-2 border-dashed border-yellow-400 rounded-lg p-4 bg-yellow-50">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-400"
                >
                  Seleccionar logo
                </Button>
                <p className="text-xs text-center mt-2 text-muted-foreground">Galería de logos</p>
              </div>

              {/* N° de factura */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="invoice-number" className="font-semibold">N° de factura</Label>
                </div>
                <Input
                  id="invoice-number"
                  {...register('invoiceNumber')}
                  defaultValue={invoiceNumber || '100'}
                  className="w-full"
                />
              </div>

              {/* Fecha */}
              <div className="space-y-2">
                <Label htmlFor="invoice-date" className="font-semibold">Fecha</Label>
                <Input
                  id="invoice-date"
                  type="text"
                  {...register('invoiceDate')}
                  defaultValue={invoiceDate}
                  placeholder="DD.MM.YYYY"
                  className="w-full"
                />
              </div>

              {/* N° de pedido */}
              <div className="space-y-2">
                <Label htmlFor="order-number" className="font-semibold">N° de pedido</Label>
                <Input
                  id="order-number"
                  {...register('orderNumber')}
                  placeholder="Pedido (opcional)"
                  defaultValue={orderNumber || ''}
                  className="w-full"
                />
              </div>

              {/* Fecha vencimiento */}
              <div className="space-y-2">
                <Label htmlFor="due-date" className="font-semibold">Fecha vencimiento</Label>
                <Input
                  id="due-date"
                  type="text"
                  {...register('dueDate')}
                  defaultValue={dueDate}
                  placeholder="DD.MM.YYYY"
                  className="w-full"
                />
              </div>

              {/* Totales */}
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Subtotal</span>
                  <span className="font-mono">{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">TOTAL</span>
                    <span className="text-sm text-muted-foreground">EUR</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs h-auto p-0"
                      onClick={() => {
                        const currency = prompt('Moneda:', 'EUR');
                        if (currency) {
                          setValue('currency', currency);
                        }
                      }}
                    >
                      Editar
                    </Button>
                  </div>
                  <span className="font-mono font-bold">{total.toFixed(2)} €</span>
                </div>
              </div>

              {/* Firma */}
              <div className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-400"
                >
                  <FileSignature className="h-4 w-4 mr-2" />
                  Añadir mi firma
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="basic" className="mt-0">
          {/* Selector de tipo de factura */}
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Label htmlFor="basic-invoice-type" className="font-semibold">Tipo de Documento:</Label>
                <Select
                  value={invoiceType}
                  onValueChange={(value) => setValue('invoiceType', value as 'invoice' | 'proforma')}
                >
                  <SelectTrigger id="basic-invoice-type" className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">Factura</SelectItem>
                    <SelectItem value="proforma">Factura Proforma</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {invoiceType === 'proforma' && (
                <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900 rounded-md">
                  <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                    ⚠️ PROFORMA - Sin validez fiscal
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Formulario básico - versión simplificada */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna izquierda - Cliente y detalles básicos */}
            <div className="lg:col-span-2 space-y-6">
              {/* Selección de Cliente */}
              <div className="space-y-2">
                <Label htmlFor="basic-client" className="font-semibold">Cliente *</Label>
                <Select
                  onValueChange={(value) => setValue('client', value)}
                  defaultValue={watch('client') || ''}
                >
                  <SelectTrigger id="basic-client" className="w-full">
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client._id} value={client._id!}>
                        {client.name} {client.email ? `(${client.email})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Items de Factura - Versión simplificada */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-lg">Artículos / Servicios</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ product: '', quantity: 1, price: 0, tax: 21, total: 0, description: '' })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Item
                  </Button>
                </div>

                <div className="space-y-3">
                  {fields.map((field, index) => {
                    const item = watchedItems[index];
                    return (
                      <div key={field.id} className="border rounded-lg p-4 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`basic-product-${index}`}>Producto/Servicio</Label>
                            <Select
                              onValueChange={(val) => onProductChange(index, val)}
                              defaultValue={item?.product || ''}
                            >
                              <SelectTrigger id={`basic-product-${index}`}>
                                <SelectValue placeholder="Seleccionar..." />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((product) => (
                                  <SelectItem key={product._id} value={product._id!}>
                                    {product.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`basic-description-${index}`}>Descripción</Label>
                            <Input
                              id={`basic-description-${index}`}
                              {...register(`items.${index}.description`)}
                              placeholder="Descripción del item"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`basic-quantity-${index}`}>Cantidad</Label>
                            <Input
                              id={`basic-quantity-${index}`}
                              type="number"
                              step="0.1"
                              {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`basic-price-${index}`}>Precio Unit.</Label>
                            <Input
                              id={`basic-price-${index}`}
                              type="number"
                              step="0.01"
                              {...register(`items.${index}.price`, { valueAsNumber: true })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`basic-tax-${index}`}>Impuesto (%)</Label>
                            <Input
                              id={`basic-tax-${index}`}
                              type="number"
                              step="0.01"
                              {...register(`items.${index}.tax`, { valueAsNumber: true })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Total</Label>
                            <div className="h-10 flex items-center px-3 rounded-md bg-muted text-sm font-medium">
                              {calculateItemTotal(index).toFixed(2)} €
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                            disabled={fields.length === 1}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notas */}
              <div className="space-y-2">
                <Label htmlFor="basic-notes">Notas / Términos</Label>
                <Textarea
                  id="basic-notes"
                  {...register('notes')}
                  placeholder="Gracias por su confianza..."
                  className="min-h-[100px] resize-none"
                />
              </div>
            </div>

            {/* Columna derecha - Resumen y metadatos */}
            <div className="space-y-6">
              {/* Metadatos básicos */}
              <div className="space-y-4 border rounded-lg p-4">
                <div className="space-y-2">
                  <Label htmlFor="basic-invoice-number" className="font-semibold">N° de factura</Label>
                  <Input
                    id="basic-invoice-number"
                    {...register('invoiceNumber')}
                    defaultValue={invoiceNumber || ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="basic-date" className="font-semibold">Fecha</Label>
                  <Input
                    id="basic-date"
                    type="date"
                    {...register('invoiceDate')}
                    defaultValue={watch('invoiceDate') || new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="basic-due-date" className="font-semibold">Fecha de Vencimiento *</Label>
                  <Input
                    id="basic-due-date"
                    type="date"
                    {...register('dueDate')}
                    defaultValue={watch('dueDate') || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label id="basic-status-label" className="font-semibold">Estado</Label>
                  <Select
                    onValueChange={(value) => setValue('status', value as any)}
                    defaultValue={watch('status') || 'draft'}
                  >
                    <SelectTrigger id="basic-status" aria-labelledby="basic-status-label">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Borrador</SelectItem>
                      <SelectItem value="sent">Enviada</SelectItem>
                      <SelectItem value="paid">Pagada</SelectItem>
                      <SelectItem value="overdue">Vencida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Resumen Financiero */}
              <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
                <h3 className="font-semibold text-lg">Resumen</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">{subtotal.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Impuestos:</span>
                    <span className="font-medium">{totalTax.toFixed(2)} €</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>TOTAL:</span>
                    <span className="text-primary">{total.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

