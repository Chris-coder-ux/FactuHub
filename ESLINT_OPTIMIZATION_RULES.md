# 🔒 Reglas ESLint para Prevenir Regresiones de Optimización

**Fecha**: Diciembre 2025  
**Archivo**: `.eslintrc.json`

---

## 📋 Reglas Configuradas

### 1. **No Console** ✅
```json
"no-console": ["warn", { "allow": ["warn", "error"] }]
```
- **Propósito**: Prevenir uso de `console.log` en código de producción
- **Acción**: Advertir cuando se usa `console.log`, permitir `console.warn` y `console.error`
- **Razón**: Ya tenemos `logger` centralizado que elimina console.logs en producción
- **Excepciones**: 
  - Archivos de configuración (`next.config.*`)
  - Archivos de test (`*.test.*`, `*.spec.*`)

### 2. **No Restricted Imports** ✅
```json
"no-restricted-imports": ["error", { ... }]
```
- **Propósito**: Prevenir uso de librerías deprecated o pesadas sin optimización
- **Librerías bloqueadas**:
  - `moment` - Deprecated, usar `date-fns` o `date-fns-tz`
  - `exceljs` - Muy pesado (~2MB), usar `dynamic()` import
  - `jspdf` - Pesado, considerar `dynamic()` import

---

## 🎯 Objetivos de las Reglas

### Prevenir Regresiones
1. ✅ **Console.logs**: Evitar que se agreguen nuevos `console.log` sin usar `logger`
2. ✅ **Moment.js**: Prevenir reintroducción de `moment.js` (ya migrado a `date-fns`)
3. ✅ **Imports pesados**: Recordar usar `dynamic()` import para librerías grandes

### Mantener Optimizaciones
- Las reglas ayudan a mantener las optimizaciones aplicadas
- Previenen que se introduzcan nuevas dependencias pesadas sin optimización
- Fuerzan mejores prácticas de imports

---

## 📝 Uso

### Ejecutar Linter
```bash
npm run lint
```

### Verificar Reglas Específicas
```bash
# Ver solo warnings de console
npm run lint | grep "no-console"

# Ver errores de imports restringidos
npm run lint | grep "no-restricted-imports"
```

---

## ⚠️ Excepciones

### Archivos de Configuración
- `next.config.*` - No aplica regla de `no-console`
- `*.config.*` - No aplica regla de `no-console`

### Archivos de Test
- `**/*.test.*` - No aplica regla de `no-console`
- `**/*.spec.*` - No aplica regla de `no-console`
- `**/__tests__/**` - No aplica regla de `no-console`

### Archivos del Servidor (API Routes y Libs)
- `**/app/api/**` - No aplica regla de `no-restricted-imports`
- `**/lib/**` - No aplica regla de `no-restricted-imports`
- **Razón**: Los imports pesados en código del servidor no afectan el bundle del cliente, por lo que están permitidos

---

## 🔧 Agregar Nuevas Reglas

Si necesitas agregar más reglas para prevenir regresiones:

1. **Editar `.eslintrc.json`**
2. **Agregar regla en `rules`**
3. **Ejecutar `npm run lint` para verificar**
4. **Documentar en este archivo**

### Ejemplo: Agregar regla para prevenir wildcard imports
```json
{
  "rules": {
    "import/no-namespace": "warn"
  }
}
```

**Nota**: Requiere instalar `eslint-plugin-import`:
```bash
npm install -D eslint-plugin-import
```

---

## 📚 Referencias

- [ESLint Rules](https://eslint.org/docs/latest/rules/)
- [Next.js ESLint Config](https://nextjs.org/docs/app/building-your-application/configuring/eslint)
- [React Hooks ESLint Plugin](https://www.npmjs.com/package/eslint-plugin-react-hooks)

---

## ✅ Checklist de Reglas Implementadas

- [x] `no-console` - Prevenir console.logs
- [x] `no-restricted-imports` - Bloquear moment.js, exceljs, jspdf
- [x] Excepciones para archivos de configuración
- [x] Excepciones para archivos de test
- [ ] `import/no-namespace` - Prevenir wildcard imports (requiere plugin adicional)
- [ ] `import/no-default-export` - Mejor tree-shaking (opcional, puede ser muy restrictivo)

---

## 🎯 Próximos Pasos Recomendados

1. **Instalar plugin para imports** (opcional):
   ```bash
   npm install -D eslint-plugin-import
   ```
   Luego agregar regla `import/no-namespace` para prevenir wildcard imports

2. **Configurar pre-commit hook** (opcional):
   - Usar `husky` + `lint-staged` para ejecutar linter antes de commits
   - Prevenir que código con regresiones llegue al repositorio

3. **CI/CD Integration**:
   - Asegurar que `npm run lint` se ejecute en CI/CD
   - Falla el build si hay errores de ESLint

