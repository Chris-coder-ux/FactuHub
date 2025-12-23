# Evaluación: Zustand para Estado Global

## 📊 Estado Actual

### Gestión de Estado en el Proyecto

**Patrones actuales**:
- **Estado local**: `useState` (194 usos en 53 archivos)
- **Data fetching**: SWR para datos del servidor
- **Autenticación**: next-auth (SessionProvider)
- **Persistencia**: localStorage para drafts de formularios
- **Hooks personalizados**: `useInvoiceActions`, `useClientActions`, `useProductActions`, `useFormAutoSave`, `useRealtime`

**No hay**:
- ❌ Context API (no se encontró `createContext`/`useContext`)
- ❌ Redux o Zustand
- ❌ Estado global complejo
- ❌ Prop drilling significativo

### Análisis de Complejidad

**Estado local por componente**:
- Cada componente maneja su propio estado
- Formularios con `react-hook-form` (estado local)
- Modales con `useState` para open/close
- Filtros y búsquedas con estado local

**Estado del servidor**:
- SWR maneja caching y revalidación
- No necesita estado global adicional

**Estado compartido**:
- Sesión de usuario: next-auth (SessionProvider)
- Datos de empresa: SWR + session
- No hay estado complejo compartido entre muchos componentes

## 🔄 Zustand - ¿Qué es?

Zustand es una librería de gestión de estado global minimalista para React.

### Ventajas de Zustand

1. **Simplicidad**
   - API simple y directa
   - Sin boilerplate como Redux
   - ~1KB bundle size

2. **TypeScript**
   - Excelente soporte de tipos
   - Inferencia automática

3. **Performance**
   - Selectores granulares
   - Re-renders optimizados
   - No necesita Provider

4. **Persistencia**
   - Middleware para localStorage
   - Fácil de implementar

5. **DevTools**
   - Soporte para Redux DevTools
   - Debugging mejorado

### Desventajas

1. **Dependencia adicional**
   - Añade una dependencia más
   - Aunque es ligera (~1KB)

2. **Curva de aprendizaje**
   - Aunque es simple, requiere aprender API
   - El equipo ya conoce useState/SWR

3. **No siempre necesario**
   - Si no hay estado global complejo, es overkill

## 📋 Análisis de Casos de Uso

### Casos donde Zustand sería útil

1. **Estado global complejo compartido**
   - Si múltiples componentes necesitan el mismo estado
   - Si hay prop drilling significativo
   - Si el estado es complejo y cambia frecuentemente

2. **Estado de UI global**
   - Sidebar abierto/cerrado
   - Modales globales
   - Notificaciones globales
   - Tema (aunque ya se usa next-themes)

3. **Estado de aplicación complejo**
   - Carrito de compras
   - Filtros globales
   - Preferencias de usuario
   - Estado de formularios multi-paso

4. **Persistencia de estado**
   - Si necesitas persistir estado complejo
   - Preferencias de usuario
   - Configuración de UI

### Casos donde NO es necesario

1. **Estado local** ✅ (caso actual)
   - Formularios individuales
   - Modales simples
   - Filtros locales
   - `useState` es suficiente

2. **Datos del servidor** ✅ (caso actual)
   - SWR maneja esto perfectamente
   - No necesita estado global

3. **Estado simple compartido** ✅ (caso actual)
   - Sesión: next-auth
   - Datos: SWR
   - No hay estado complejo compartido

## 🎯 Recomendación

### ❌ **NO implementar Zustand en este momento**

**Razones**:
1. **No hay estado global complejo**: El estado está bien distribuido
2. **Patrones actuales funcionan**: useState + SWR + hooks personalizados
3. **No hay prop drilling**: No se encontraron problemas de prop drilling
4. **ROI bajo**: Añadiría complejidad sin beneficios claros
5. **Dependencia innecesaria**: Aunque es ligera, no aporta valor actualmente

### ✅ **Cuándo considerar Zustand**

Implementar Zustand solo si:
1. **Surge estado global complejo**: Si múltiples componentes necesitan compartir estado complejo
2. **Prop drilling problemático**: Si el prop drilling se vuelve difícil de mantener
3. **Estado de UI global**: Si necesitas estado de UI compartido (sidebar, modales globales)
4. **Persistencia compleja**: Si necesitas persistir estado complejo más allá de localStorage simple

### 🔄 **Alternativas actuales**

**Para estado local**: `useState` ✅
```tsx
const [isOpen, setIsOpen] = useState(false);
```

**Para datos del servidor**: SWR ✅
```tsx
const { data } = useSWR('/api/invoices', fetcher);
```

**Para estado compartido simple**: Hooks personalizados ✅
```tsx
const { deleteInvoice } = useInvoiceActions();
```

**Para persistencia simple**: localStorage ✅
```tsx
const { loadFromLocalStorage } = useFormAutoSave(watch, { formKey: 'draft' });
```

## 📝 Plan de Implementación (si se decide hacerlo)

### Paso 1: Instalación
```bash
npm install zustand
```

### Paso 2: Crear Store
```typescript
// src/store/useAppStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  // Estado de UI
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  
  // Estado de aplicación
  selectedCompany: string | null;
  setSelectedCompany: (id: string) => void;
  
  // Filtros globales
  globalFilters: {
    dateRange: { start: Date; end: Date } | null;
    status: string[];
  };
  setGlobalFilters: (filters: AppState['globalFilters']) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Estado inicial
      sidebarOpen: true,
      selectedCompany: null,
      globalFilters: {
        dateRange: null,
        status: [],
      },
      
      // Acciones
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSelectedCompany: (id) => set({ selectedCompany: id }),
      setGlobalFilters: (filters) => set({ globalFilters: filters }),
    }),
    {
      name: 'app-storage', // localStorage key
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        selectedCompany: state.selectedCompany,
      }), // Solo persistir ciertos campos
    }
  )
);
```

### Paso 3: Usar en Componentes
```typescript
// Componente
import { useAppStore } from '@/store/useAppStore';

function Sidebar() {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  
  return (
    <aside className={sidebarOpen ? 'open' : 'closed'}>
      <button onClick={toggleSidebar}>Toggle</button>
    </aside>
  );
}
```

### Paso 4: Selectores Granulares
```typescript
// Para evitar re-renders innecesarios
const sidebarOpen = useAppStore((state) => state.sidebarOpen);
// Solo se re-renderiza si sidebarOpen cambia
```

## 📊 Comparación de Código

### Estado Local (Actual)
```tsx
function InvoiceList() {
  const [filters, setFilters] = useState({ status: 'all' });
  const [searchQuery, setSearchQuery] = useState('');
  
  return (
    <div>
      <Filters filters={filters} onChange={setFilters} />
      <Search value={searchQuery} onChange={setSearchQuery} />
      <InvoiceTable filters={filters} search={searchQuery} />
    </div>
  );
}
```

### Con Zustand (Si fuera necesario)
```tsx
// Store
const useInvoiceStore = create((set) => ({
  filters: { status: 'all' },
  searchQuery: '',
  setFilters: (filters) => set({ filters }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));

// Componente
function InvoiceList() {
  const filters = useInvoiceStore((state) => state.filters);
  const searchQuery = useInvoiceStore((state) => state.searchQuery);
  const setFilters = useInvoiceStore((state) => state.setFilters);
  const setSearchQuery = useInvoiceStore((state) => state.setSearchQuery);
  
  return (
    <div>
      <Filters filters={filters} onChange={setFilters} />
      <Search value={searchQuery} onChange={setSearchQuery} />
      <InvoiceTable filters={filters} search={searchQuery} />
    </div>
  );
}
```

**Nota**: En este caso, el estado local es más simple y apropiado.

## 🎯 Conclusión

**Decisión**: **NO implementar Zustand en este momento**

**Justificación**:
- El estado actual está bien distribuido
- No hay estado global complejo que justifique Zustand
- Los patrones actuales (useState + SWR + hooks) funcionan perfectamente
- No hay problemas de prop drilling o estado compartido complejo
- Añadir Zustand sería añadir complejidad sin beneficios claros

**Recomendación futura**:
- Evaluar nuevamente si surge estado global complejo
- Considerar Zustand si aparece prop drilling problemático
- Mantener el patrón actual de estado local + SWR + hooks personalizados

**Estado**: Evaluación completada - Zustand no recomendado en este momento

