# Tareas de Implementación: Remediación de Auditoría de Seguridad (020)

- [x] **T001**: Neutralizar XSS en enlaces Markdown en `src/components/noticueva/formatted-content.tsx`
- [x] **T002**: Endurecer autenticación fail-closed y suprimir contraseñas en URLs en `src/app/api/noticueva/*` y `src/components/noticueva/noticueva-admin.tsx`
- [x] **T003**: Proteger endpoints de estado DDL (`/api/noticueva/status` y `/api/push/status`) para evitar information disclosure
- [x] **T004**: Blindar endpoint `POST /api/push/broadcast-scoring` contra inyecciones arbitrarias y asegurar autorización
- [x] **T005**: Inyectar cabeceras de seguridad HTTP en `next.config.ts` (HSTS, CSP, X-Frame-Options, X-Content-Type-Options)
- [x] **T006**: Crear migración oficial de endurecimiento RLS en `supabase/migrations/20261105_rls_security_hardening.sql` y actualizar `.env.example`
- [x] **T007**: Ejecutar pruebas locales (`npm run build` o lint), verificar no regresión y redactar `implementation.md`
- [x] **T008**: Commit semántico y push a repositorio remoto
