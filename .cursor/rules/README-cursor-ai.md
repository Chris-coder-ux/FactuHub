# 📚 Instrucciones para Cursor AI

## 🎯 Cómo usar estos archivos .mdc

### 1. **Configuración en Cursor**

1. Ve a `Settings` → `AI Rules` (o `Cursor Settings` → `Rules for AI`)
2. Haz clic en `Add Rule File` o arrastra los archivos
3. Sube todos los archivos `.mdc` desde `.cursor/rules/`:
   - `typescript.mdc` - Reglas de TypeScript estricto
   - `nextjs.mdc` - Reglas de Next.js 14+ App Router
   - `xsd-xml.mdc` - Reglas de validación XSD/XML
   - `testing.mdc` - Reglas de testing
   - `errors.mdc` - Manejo de errores
   - `security.mdc` - Reglas de seguridad
   - `codacy.mdc` - Integración con Codacy (ya configurado)

### 2. **Prioridad de Reglas**

Las reglas se aplican en este orden de importancia:

1. **Security** - Seguridad primero, siempre
2. **XSD/XML** - Fuente única de verdad para datos
3. **TypeScript** - Tipado estricto sin `any`
4. **Next.js** - App Router + Server Components
5. **Errors** - Manejo robusto de errores
6. **Testing** - Cobertura y calidad de tests
7. **Codacy** - Análisis automático de código

### 3. **Comandos Específicos para el AI**

Cuando trabajes con:

#### **XML/XSD**
```
"Primero consulta el archivo .xsd correspondiente antes de generar interfaces TypeScript"
"Siguiendo xsd-xml.mdc, valida el XML contra el XSD antes de procesarlo"
```

#### **Next.js**
```
"Siguiendo nextjs.mdc, ¿este componente necesita 'use client'?"
"Crear un Server Component que fetch datos de la API"
```

#### **TypeScript**
```
"Rechazar cualquier sugerencia con `any` - usar `unknown` con type guards"
"Siguiendo typescript.mdc, usar named exports únicamente"
```

#### **Testing**
```
"Siguiendo testing.mdc, crear tests unitarios para esta función"
"Asegurar cobertura >80% para este módulo"
```

#### **Errores**
```
"Siguiendo errors.mdc, implementar Result Pattern para esta operación"
"Crear clase de error personalizada para este caso"
```

#### **Seguridad**
```
"Siguiendo security.mdc, validar y sanitizar esta entrada"
"Nunca exponer secrets - usar variables de entorno"
```

### 4. **Estructura de Respuestas del AI**

Cuando el AI genere código, debe seguir este orden:

```typescript
// 1. Tipos e interfaces primero
interface Props { /* ... */ }
type Result<T> = /* ... */;

// 2. Constantes y configuraciones
const DEFAULT_CONFIG = { /* ... */ };

// 3. Componente/función principal
function Component({ props }: Props) { /* ... */ }

// 4. Subcomponentes
function SubComponent() { /* ... */ }

// 5. Helpers y utilidades
function helperFunction() { /* ... */ }

// 6. Export (named exports únicamente)
export { Component, type Props };
```

### 5. **Validación Automática**

Cursor AI debería:

✅ **Validar XML contra XSD mencionado** antes de procesar  
✅ **Rechazar `any` y default exports** automáticamente  
✅ **Sugerir Server Components por defecto** en Next.js  
✅ **Usar absolute imports (@/)** en lugar de relative  
✅ **Seguir patrones de nomenclatura** (kebab-case para archivos, camelCase para funciones)  
✅ **Validar entrada con Zod** en todas las API routes  
✅ **Sanitizar HTML** antes de renderizar  
✅ **Manejar errores explícitamente** con tipos específicos  
✅ **Crear tests** para funciones críticas  

### 6. **Contexto para el AI**

```
Proyecto: Next.js 14+ con App Router
TypeScript: Strict mode (no `any`)
Estilos: Tailwind CSS + shadcn/ui
Base de datos: MongoDB con Mongoose
Autenticación: NextAuth.js
Testing: Jest (unit), Cypress (E2E), Artillery (performance)
Linter: ESLint + Codacy
Despliegue: Vercel
XML: Validación estricta contra XSD (VeriFactu compliance)
Experiencia: Fullstack 8+ años - Código técnico y conciso
```

### 7. **Ejemplo de Interacción**

#### Usuario:
```
Crea un componente de factura que lea datos XML
```

#### Cursor AI debería:

1. 🔍 **Buscar archivos .xsd de factura** en el proyecto
2. 📝 **Generar interfaces TypeScript desde XSD** (no inventar campos)
3. ⚡ **Crear Server Component de Next.js** (por defecto)
4. 🛡️ **Agregar validación XML** contra XSD
5. ✅ **Validar con Zod** como segunda capa
6. 📤 **Exportar con named exports**
7. 🧪 **Sugerir crear tests** para el componente

### 8. **Checklist de Validación**

Antes de aceptar código generado por el AI, verificar:

- [ ] ¿Usa Server Component por defecto? (Next.js)
- [ ] ¿No tiene `any`? (TypeScript)
- [ ] ¿Usa named exports? (TypeScript)
- [ ] ¿Valida entrada con Zod? (Security)
- [ ] ¿Sanitiza HTML si renderiza contenido dinámico? (Security)
- [ ] ¿Maneja errores explícitamente? (Errors)
- [ ] ¿Sigue nomenclatura correcta? (kebab-case archivos, camelCase funciones)
- [ ] ¿Usa absolute imports (@/)? (TypeScript)
- [ ] ¿XML deriva del XSD? (XSD/XML)
- [ ] ¿Tiene tests si es código crítico? (Testing)

### 9. **Métodos de Uso**

#### **Método 1: Archivos separados (Recomendado)**
1. Los archivos `.mdc` ya están en `.cursor/rules/`
2. Cursor los detecta automáticamente si están configurados
3. Se aplican a todas las conversaciones

#### **Método 2: Referencia en prompts**
```bash
# Al empezar conversación:
"Usa las reglas de typescript.mdc, nextjs.mdc, xsd-xml.mdc, testing.mdc, errors.mdc y security.mdc"

# Para código específico:
"Siguiendo nextjs.mdc, crea un Server Component que..."
"Siguiendo security.mdc, valida esta entrada con Zod"
```

#### **Método 3: Comandos directos**
```
@typescript.mdc crear una función que valide emails
@nextjs.mdc crear una API route para facturas
@xsd-xml.mdc generar interfaces desde este XSD
```

### 10. **Tips Adicionales**

- ✅ Las reglas están diseñadas para proyectos Next.js 14+ en producción
- ✅ Se enfocan en performance, type safety y mantenibilidad
- ✅ Basadas en 8+ años de experiencia fullstack
- ✅ Optimizadas para trabajo en equipo y CI/CD
- ✅ Integración automática con Codacy para análisis de código
- ✅ Compatibles con Vercel deployment

### 11. **Troubleshooting**

#### El AI no sigue las reglas:
1. Verificar que los archivos `.mdc` estén en `.cursor/rules/`
2. Verificar que `alwaysApply: true` esté en el frontmatter
3. Reiniciar Cursor
4. Referenciar explícitamente las reglas en el prompt

#### Conflicto entre reglas:
- **Security** siempre tiene prioridad
- **XSD/XML** tiene prioridad sobre TypeScript para datos XML
- En caso de duda, preguntar al usuario

### 12. **Actualización de Reglas**

Las reglas se actualizan periódicamente. Para actualizar:

1. Editar el archivo `.mdc` correspondiente
2. Los cambios se aplican automáticamente en nuevas conversaciones
3. Para aplicar en conversación actual, mencionar: "Actualiza las reglas de [archivo].mdc"

---

## 🚨 REGLA FINAL

**El XSD es ley para datos XML. La seguridad es prioridad #1. TypeScript estricto siempre. Server Components por defecto. Tests para código crítico.**

---

## 📁 Estructura de Archivos

```
.cursor/rules/
├── README-cursor-ai.md      # Este archivo
├── typescript.mdc           # Reglas TypeScript
├── nextjs.mdc               # Reglas Next.js
├── xsd-xml.mdc              # Reglas XSD/XML
├── testing.mdc              # Reglas de testing
├── errors.mdc               # Manejo de errores
├── security.mdc             # Reglas de seguridad
└── codacy.mdc               # Integración Codacy
```

---

**Última actualización**: Diciembre 2025  
**Versión**: 1.0.0

