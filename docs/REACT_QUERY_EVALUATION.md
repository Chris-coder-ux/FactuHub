# Evaluación: Migración de SWR a React Query (TanStack Query)

## 📊 Estado Actual

### Uso de SWR en el Proyecto

- **Total de usos**: ~95 instancias en 40 archivos
- **Versión actual**: SWR 2.3.8
- **Patrón principal**: `useSWR(key, fetcher)`
- **Hooks personalizados**: `useSWRConfig()` en hooks de acciones
- **Fetcher personalizado**: `src/lib/fetcher.ts` con manejo de errores

### Características Actuales de SWR

✅ **Implementado**:
- Caching automático con revalidación
- Optimistic updates (implementados recientemente)
- Mutaciones con `mutate()`
- Manejo de errores consistente
- Loading states (`isLoading`)
- Revalidación automática en focus/reconnect

✅ **Hooks personalizados que dependen de SWR**:
- `useInvoiceActions` - usa `useSWRConfig()`
- `useClientActions` - usa `useSWRConfig()`
- `useProductActions` - usa `useSWRConfig()`
- `useRealtime` - independiente (SSE)

## 🔄 React Query (TanStack Query) - Comparación

### Ventajas de React Query

1. **Mutations más robustas**
   - API dedicada para mutations (`useMutation`)
   - Mejor integración con queries
   - Rollback automático más elegante

2. **Cache más avanzado**
   - Invalidación por dependencias
   - Background refetching más granular
   - Stale time y cache time configurables por query

3. **Infinite Queries**
   - Soporte nativo para paginación infinita
   - Mejor que implementación manual con SWR

4. **DevTools**
   - React Query DevTools para debugging
   - Visualización del estado del cache

5. **TypeScript**
   - Mejor tipado genérico
   - Inferencia de tipos más robusta

### Desventajas de Migrar

1. **Esfuerzo de migración**
   - 95+ usos en 40 archivos
   - Cambios en hooks personalizados
   - Cambios en componentes
   - Actualización de tests

2. **Costo vs Beneficio**
   - SWR ya funciona bien
   - Optimistic updates ya implementados
   - No hay problemas críticos con SWR

3. **Bundle size**
   - React Query es ligeramente más pesado
   - SWR es más ligero (~4KB vs ~12KB)

4. **Curva de aprendizaje**
   - El equipo ya conoce SWR
   - React Query tiene conceptos adicionales

## 📋 Análisis de Casos de Uso

### Casos donde React Query sería mejor

1. **Paginación infinita**
   - Actualmente: implementación manual
   - Con React Query: `useInfiniteQuery` nativo

2. **Mutations complejas**
   - Actualmente: hooks personalizados con `useSWRConfig`
   - Con React Query: `useMutation` más declarativo

3. **Cache dependencies**
   - Actualmente: invalidación manual
   - Con React Query: invalidación automática por dependencias

### Casos donde SWR es suficiente

1. **Data fetching básico** ✅
   - SWR funciona perfectamente
   - Sintaxis simple y clara

2. **Optimistic updates** ✅
   - Ya implementados con SWR
   - Funcionan correctamente

3. **Revalidación automática** ✅
   - SWR lo hace bien
   - Configuración simple

## 🎯 Recomendación

### ❌ **NO migrar en este momento**

**Razones**:
1. **SWR funciona bien**: No hay problemas críticos que justifiquen la migración
2. **Esfuerzo alto**: 95+ cambios en 40 archivos
3. **ROI bajo**: Los beneficios no superan el costo de migración
4. **Riesgo**: Migración grande puede introducir bugs

### ✅ **Cuándo considerar migrar**

Migrar a React Query solo si:
1. **Necesitas paginación infinita nativa** - `useInfiniteQuery` sería útil
2. **Mutations muy complejas** - Si necesitas features avanzadas de mutations
3. **Cache dependencies complejas** - Si necesitas invalidación automática por dependencias
4. **DevTools críticas** - Si necesitas debugging avanzado del cache

### 🔄 **Alternativa: Migración gradual**

Si en el futuro se decide migrar:

1. **Fase 1**: Instalar React Query junto a SWR
2. **Fase 2**: Migrar nuevos componentes a React Query
3. **Fase 3**: Migrar componentes existentes gradualmente
4. **Fase 4**: Remover SWR cuando todo esté migrado

## 📝 Plan de Migración (si se decide hacerlo)

### Paso 1: Instalación
```bash
npm install @tanstack/react-query
```

### Paso 2: Configuración del Provider
```tsx
// app/providers.tsx
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minuto
      cacheTime: 5 * 60 * 1000, // 5 minutos
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### Paso 3: Migrar fetcher
```tsx
// lib/react-query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const res = await fetch(queryKey[0] as string);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || errorData.message || 'Error');
        }
        return res.json();
      },
    },
  },
});
```

### Paso 4: Migrar hooks
```tsx
// Antes (SWR)
const { data, isLoading, mutate } = useSWR('/api/invoices', fetcher);

// Después (React Query)
const { data, isLoading } = useQuery({
  queryKey: ['invoices'],
  queryFn: () => fetcher('/api/invoices'),
});

const { mutate } = useMutation({
  mutationFn: updateInvoice,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  },
});
```

### Paso 5: Migrar optimistic updates
```tsx
// Con React Query
const { mutate } = useMutation({
  mutationFn: updateInvoice,
  onMutate: async (newInvoice) => {
    // Cancelar queries en curso
    await queryClient.cancelQueries({ queryKey: ['invoices'] });
    
    // Snapshot del valor anterior
    const previous = queryClient.getQueryData(['invoices']);
    
    // Optimistic update
    queryClient.setQueryData(['invoices'], (old: any) => {
      return old.map((inv: Invoice) => 
        inv._id === newInvoice._id ? newInvoice : inv
      );
    });
    
    return { previous };
  },
  onError: (err, newInvoice, context) => {
    // Rollback
    queryClient.setQueryData(['invoices'], context?.previous);
  },
  onSettled: () => {
    // Revalidar
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  },
});
```

## 📊 Comparación de Código

### Ejemplo: Fetch de facturas

**SWR (Actual)**:
```tsx
const { data, isLoading, error, mutate } = useSWR<Invoice[]>(
  '/api/invoices',
  fetcher
);
```

**React Query (Alternativa)**:
```tsx
const { data, isLoading, error } = useQuery<Invoice[]>({
  queryKey: ['invoices'],
  queryFn: () => fetcher('/api/invoices'),
});

const queryClient = useQueryClient();
const invalidate = () => queryClient.invalidateQueries({ queryKey: ['invoices'] });
```

### Ejemplo: Optimistic Update

**SWR (Actual)**:
```tsx
mutate(
  '/api/invoices',
  (current) => current.map(inv => inv._id === id ? updated : inv),
  false
);
try {
  await updateInvoice(id, data);
  mutate('/api/invoices');
} catch {
  mutate('/api/invoices'); // Rollback
}
```

**React Query (Alternativa)**:
```tsx
const mutation = useMutation({
  mutationFn: (data) => updateInvoice(id, data),
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: ['invoices'] });
    const previous = queryClient.getQueryData(['invoices']);
    queryClient.setQueryData(['invoices'], (old: any) => 
      old.map(inv => inv._id === id ? { ...inv, ...newData } : inv)
    );
    return { previous };
  },
  onError: (err, variables, context) => {
    queryClient.setQueryData(['invoices'], context?.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  },
});
```

## 🎯 Conclusión

**Decisión**: **NO migrar en este momento**

**Justificación**:
- SWR funciona correctamente para las necesidades actuales
- Optimistic updates ya implementados
- El esfuerzo de migración (95+ cambios) no justifica los beneficios
- SWR es más ligero y simple
- El equipo ya está familiarizado con SWR

**Recomendación futura**:
- Evaluar nuevamente si surgen necesidades específicas que React Query resuelva mejor
- Considerar migración gradual si se decide hacerlo
- Mantener documentación actualizada sobre ambas opciones

**Estado**: Evaluación completada - Migración no recomendada en este momento

