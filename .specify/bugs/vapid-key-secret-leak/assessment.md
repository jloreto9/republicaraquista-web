# Bug Assessment: Fuga de Clave Privada VAPID (GitGuardian Secret Leak)

- **Slug**: vapid-key-secret-leak
- **Created**: 2026-10-25T18:24:00-04:00
- **Source**: Alerta de seguridad automatizada de GitGuardian (notificación por correo tras push a `jloreto9/republicaraquista-web`)
- **Verdict**: valid
- **Severity**: critical

## Report (verbatim or summarized)

GitGuardian detectó una clave privada VAPID expuesta públicamente en el repositorio `jloreto9/republicaraquista-web`:
- Tipo de secreto: `Vapid Key`
- Repositorio: `jloreto9/republicaraquista-web`
- Fecha de detección: 25 de octubre de 2026, 21:07:33 UTC

## Symptom

Al subir cambios recientes de la implementación de Notificaciones Web Push, GitGuardian detectó una clave privada VAPID hardcodeada en el código fuente versionado. Esto compromete la seguridad del canal de notificaciones push de la aplicación.

## Reproduction

1. Inspeccionar el repositorio en busca de claves VAPID:
   `git grep "DEFAULT_VAPID_PRIVATE_KEY"`
2. Se observa en `src/lib/push-service.ts` líneas 10-14:
   ```typescript
   const DEFAULT_VAPID_PUBLIC_KEY = 'BOVrzoz9H0kQioJd9IfN6oL2Oh4NmBSzHD-yWOvQrHH4pmoKO_2YVmhpl-m0P9CTyy41UPzjnIjeC-fAZ59aLw0';
   const DEFAULT_VAPID_PRIVATE_KEY = 'VfA2hwoqvHOWCKh3EjIqFh5_jKCsqPTokz86wMSc-Xk';
   ```
3. Cualquier actor malicioso con acceso al código puede usar `DEFAULT_VAPID_PRIVATE_KEY` para emitir notificaciones push fraudulentas suplantando la identidad del servidor de República Caraquista.

## Suspected Code Paths

- `src/lib/push-service.ts:10-15`: Declaración y uso de constantes de fallback para claves públicas y privadas VAPID.

## Root Cause Hypothesis

Durante la implementación del sistema Web Push PWA, se dejaron valores por defecto (*fallback*) para las claves VAPID (`DEFAULT_VAPID_PUBLIC_KEY` y `DEFAULT_VAPID_PRIVATE_KEY`) directamente en el archivo TypeScript. Al comitear y pushear el archivo a GitHub, los escáneres de seguridad de GitGuardian identificaron la cadena de entropía criptográfica correspondiente a una clave privada VAPID y generaron la alerta crítica. Confianza: **High (100%)**.

## Proposed Remediation

**Preferred**:
1. **Eliminar completamente los fallbacks hardcodeados en el código**:
   En `src/lib/push-service.ts`, remover `DEFAULT_VAPID_PUBLIC_KEY` y `DEFAULT_VAPID_PRIVATE_KEY`.
   Leer exclusivamente de `process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY` y `process.env.VAPID_PRIVATE_KEY`. Si alguna de las variables no está presente, `ensureVapidConfig()` retornará `false` y `getVapidPublicKey()` retornará cadena vacía, activando el manejo de error defensivo ya existente en la API route (`src/app/api/push/public-key/route.ts`).
2. **Generar un nuevo par de claves criptográficas VAPID**:
   Debido a que el par de claves anterior quedó comprometido en el historial de Git, generar inmediatamente un nuevo par seguro (`publicKey` y `privateKey`) e insertarlo en `.env.local` (que está protegido por `.gitignore`).
3. **Instrucción de rotación en producción (Vercel)**:
   Documentar que el usuario debe actualizar estas dos variables en los ajustes del proyecto en Vercel.

**Files likely to change**:
- `src/lib/push-service.ts`
- `.env.local` (local, ignorado por git)

**Tests to add or update**:
- Comprobación estática de tipos con TypeScript (`npx tsc --noEmit`).
- Verificación con `git grep` para garantizar que ninguna clave privada resida en archivos rastreados.

## Risks & Considerations

- **Suscripciones previas**: Si algún usuario ya se había suscrito con la clave pública anterior, al cambiar las claves VAPID su suscripción previa fallará con HTTP 410 (Gone) en el próximo envío. `push-service.ts` ya cuenta con purgado automático de endpoints caducados (`cleanedCount`), por lo que se limpiarán solos de forma transparente en el primer despacho.

## Open Questions

Ninguna. Causa raíz identificada y aislada de forma determinística.
