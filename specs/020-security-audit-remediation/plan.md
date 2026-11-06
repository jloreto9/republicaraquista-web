# Plan Técnico: Remediación de Auditoría de Seguridad (020)
**Feature:** `020-security-audit-remediation`  
**Arquitectura:** Next.js 16 (App Router) + Supabase (PostgreSQL RLS) + Vercel Edge

---

## 1. Archivos Afectados

1. `src/app/api/push/broadcast-scoring/route.ts`: Blindaje con verificación de autorización y saneamiento de títulos/marcador.
2. `src/components/game-center/game-center-view.tsx`: Asegurar que el despacho cliente sea sanitizado y compatible.
3. `src/components/noticueva/formatted-content.tsx`: Saneamiento de protocolo para enlaces Markdown.
4. `src/components/noticueva/noticueva-admin.tsx`: Supresión de contraseñas en query params (`DELETE`).
5. `src/app/api/noticueva/[id]/route.ts`: Priorización de cabecera `x-admin-key` y protección fail-closed.
6. `src/app/api/noticueva/route.ts`: Validación fail-closed si la clave de entorno está ausente.
7. `src/app/api/noticueva/auth/route.ts`: Validación fail-closed si la clave de entorno está ausente.
8. `src/app/api/noticueva/tweets/route.ts`: Validación fail-closed y saneamiento de cabeceras.
9. `src/app/api/noticueva/status/route.ts`: Ocultamiento de DDL a visitantes no autenticados.
10. `src/app/api/push/status/route.ts`: Ocultamiento de DDL a visitantes no autenticados.
11. `next.config.ts`: Inyección de cabeceras de seguridad HTTP globales (`headers()`).
12. `supabase/migrations/20261105_rls_security_hardening.sql`: Nueva migración idempotente de endurecimiento RLS.
13. `.env.example`: Adición documentada de `SUPABASE_SERVICE_ROLE_KEY`.

---

## 2. Escalera Ponytail & Principios de Diseño
- **No romper nada:** La experiencia del Game Center y el flujo de redacción de Gilberto Méndez deben mantenerse 100% funcionales.
- **Cambio mínimo:** Parches quirúrgicos directos en los archivos fuente sin crear wrappers ni dependencias externas innecesarias.
- **Rollback:** `git checkout main` o reversión limpia de los commits si alguna verificación falla.
