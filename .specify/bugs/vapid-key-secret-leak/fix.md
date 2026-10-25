# Bug Fix: Eliminación de Fuga de Clave VAPID y Rotación Criptográfica

- **Slug**: vapid-key-secret-leak
- **Fixed**: 2026-10-25T18:25:00-04:00
- **Assessment**: [assessment.md](file:///c:/Users/Administrator/Projets/republicaraquista-web/.specify/bugs/vapid-key-secret-leak/assessment.md)

## Summary of Changes

1. **Remoción de Constantes Hardcodeadas**:
   Se eliminaron completamente las constantes `DEFAULT_VAPID_PUBLIC_KEY` y `DEFAULT_VAPID_PRIVATE_KEY` de `src/lib/push-service.ts`.
2. **Consumo Exclusivo desde Variables de Entorno Seguras**:
   Las claves VAPID ahora se leen estrictamente de `process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY` y `process.env.VAPID_PRIVATE_KEY`. Si faltan o están vacías, `ensureVapidConfig()` aborta de forma segura con un log claro y `getVapidPublicKey()` devuelve string vacío, lo cual es manejado limpiamente por el endpoint de la API con HTTP 503.
3. **Rotación Criptográfica de Claves VAPID**:
   Se generó un nuevo par de claves criptográficas seguras con la librería `web-push`. La nueva configuración se aplicó en el entorno local (`.env.local`, protegido en `.gitignore`).

## Files Modified / Added / Removed

- **Modificado**: `src/lib/push-service.ts` (fuente canónica del servicio push, se quitaron secretos en texto plano)
- **Modificado**: `.env.local` (actualizado con las nuevas claves rotadas; no versionado)
- **Creado**: `.specify/bugs/vapid-key-secret-leak/assessment.md`
- **Creado**: `.specify/bugs/vapid-key-secret-leak/fix.md`
- **Creado**: `.specify/bugs/vapid-key-secret-leak/test.md`

## Local Verification

- `npx tsc --noEmit`: Validación de compilación TypeScript exitosa sin errores (código 0).
- `git grep "VfA2hwoqvHOWCKh3EjIqFh5_jKCsqPTokz86wMSc-Xk"`: Verificación de que la clave comprometida fue erradicada de todos los archivos rastreados (código 1, 0 coincidencias).
- `git grep "hqbHcgYN1pgewHOw8oI91xIEA-kUL7sax_2PndyCT4c"`: Verificación de que la nueva clave privada no se encuentra en ningún archivo rastreado (código 1, 0 coincidencias).

## Deviations from Assessment

Ninguna. La remediación siguió exactamente el plan de remediación preferido.

## Remaining Work / Follow-ups

- Actualizar en el panel de **Vercel** (`Settings -> Environment Variables`) las variables de producción:
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
- En el enlace de GitGuardian del correo, marcar la incidencia como remediada / resuelta.
