'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { Product } from '@/types';
import { UseFieldArrayReturn } from 'react-hook-form';
import { InvoiceFormData } from './types';

interface InvoiceItemsListProps {
  fields: UseFieldArrayReturn<InvoiceFormData, 'items'>['fields'];
  append: UseFieldArrayReturn<InvoiceFormData, 'items'>['append'];
  remove: UseFieldArrayReturn<InvoiceFormData, 'items'>['remove'];
  register: any;
  products: Product[];
  watchedItems: Array<{ product: string; quantity: number; price: number; tax: number; total: number }>;
  onProductChange: (index: number, productId: string) => void;
}

function InvoiceItemsListComponent({
  fields,
  append,
  remove,
  register,
  products,
  watchedItems,
  onProductChange
}: InvoiceItemsListProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Artículos / Servicios</CardTitle>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={() => append({ product: '', quantity: 1, price: 0, tax: 21, total: 0 })}
        >
          <Plus className="mr-2 h-4 w-4" /> Agregar Item
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end border-b pb-4">
              <div className="md:col-span-2 space-y-2">
                <Label id={`invoice-product-${index}-label`}>Producto/Servicio</Label>
                <Select 
                  onValueChange={(val) => onProductChange(index, val)}
                  defaultValue={field.product}
                >
                  <SelectTrigger aria-labelledby={`invoice-product-${index}-label`} id={`invoice-product-${index}`}>
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
                <Label htmlFor={`invoice-quantity-${index}`}>Cant.</Label>
                <Input id={`invoice-quantity-${index}`} type="number" {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`invoice-price-${index}`}>Precio Unit.</Label>
                <Input id={`invoice-price-${index}`} type="number" step="0.01" {...register(`items.${index}.price`, { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`invoice-tax-${index}`}>Impuesto (%)</Label>
                <Input id={`invoice-tax-${index}`} type="number" step="0.01" {...register(`items.${index}.tax`, { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Total Item</div>
                <div className="h-10 flex items-center px-3 rounded-md bg-muted text-sm font-medium">
                  ${(watchedItems[index]
                    ? watchedItems[index].price * watchedItems[index].quantity * (1 + (watchedItems[index].tax || 0) / 100)
                    : 0).toFixed(2)}
                </div>
              </div>
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="text-red-500" 
                onClick={() => remove(index)} 
                disabled={fields.length === 1}
              >
                <Trash2 size={18} />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Memoize component to prevent unnecessary re-renders
// Only re-render if props actually change
export const InvoiceItemsList = React.memo(InvoiceItemsListComponent, (prevProps, nextProps) => {
  // Compare arrays by reference and length
  if (prevProps.fields.length !== nextProps.fields.length) return false;
  if (prevProps.products.length !== nextProps.products.length) return false;
  if (prevProps.watchedItems.length !== nextProps.watchedItems.length) return false;
  
  // Compare watchedItems values (they change when user edits)
  const watchedItemsChanged = prevProps.watchedItems.some((item, index) => {
    const nextItem = nextProps.watchedItems[index];
    return !nextItem || 
           item.product !== nextItem.product ||
           item.quantity !== nextItem.quantity ||
           item.price !== nextItem.price ||
           item.tax !== nextItem.tax;
  });
  
  if (watchedItemsChanged) return false;
  
  // Compare products array (reference check is usually enough)
  if (prevProps.products !== nextProps.products) return false;
  
  return true;
});

