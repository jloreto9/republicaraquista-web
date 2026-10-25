# Desglose de Tareas: Notificaciones Web Push PWA (República Caraquista)

**Slug:** `011-web-push-notifications`  
**Fase:** Desglose de Tareas Ejecutables (Fase 3 de Spec-Kit)  
**Fecha:** 2026-10-21  

---

## Matriz de Tareas Atómicas

### Fase 1: Infraestructura y Tipado
- [x] **T001**: Instalar dependencia minimalista `web-push` y su tipo `@types/web-push` en `package.json`.
- [x] **T002**: Crear archivo de tipos `src/types/push-notifications.ts` con definiciones completas (`NotificationTopic`, `PushSubscriptionRecord`, `PushPayload`, etc.).
- [x] **T003**: Crear migración SQL en `supabase/migrations/20261021_create_push_subscriptions.sql` con tabla `push_subscriptions`, índices y políticas RLS.

### Fase 2: Service Worker & Soporte PWA
- [x] **T004**: Actualizar `public/sw.js` para registrar el listener del evento `push`, parsear el payload JSON y emitir `self.registration.showNotification` con badge, icono oficial y acciones.
- [x] **T005**: Incorporar el listener del evento `notificationclick` en `public/sw.js` para abrir o enfocar ventanas con la URL correspondiente.

### Fase 3: Backend Serverless API Routes (Vercel)
- [x] **T006**: Crear utilidad `src/lib/push-service.ts` con inicialización VAPID, método de despacho por lotes `sendPushToTopics` y auto-purgado de suscripciones caducadas (HTTP 410/404).
- [x] **T007**: Crear API Route `src/app/api/push/public-key/route.ts` para servir la clave pública VAPID al cliente.
- [x] **T008**: Crear API Route `src/app/api/push/subscribe/route.ts` para procesar suscripciones nuevas y actualizar preferencias de tópicos en Supabase.
- [x] **T009**: Crear API Route `src/app/api/push/send/route.ts` protegida con clave administrativa para despacho de notificaciones hacia los tópicos seleccionados.

### Fase 4: UI de Usuario y Selector de Preferencias
- [x] **T010**: Crear helper en cliente `src/lib/push-client.ts` para solicitar permisos de notificación, convertir clave VAPID base64 a Uint8Array y sincronizar estado con `sw.js`.
- [x] **T011**: Construir componente `src/components/notifications/notification-modal.tsx` con soporte para selección de los 4 tópicos, detección de iOS PWA (guía "Agregar a Inicio") y prueba de notificación.
- [x] **T012**: Construir botón de campana `src/components/notifications/notification-bell.tsx` e integrarlo en la barra de navegación global / Game Center.

### Fase 5: Panel Administrativo Manual (NotiCueva)
- [x] **T013**: Construir componente `src/components/admin/push-broadcast-panel.tsx` para redactar y enviar notificaciones manuales con selección de tópico y vista previa en vivo.
- [x] **T014**: Integrar el panel de envío en la vista de administración de NotiCueva (`src/app/noticueva/admin/page.tsx`).

### Fase 6: Validación, Compilación y Cierre
- [x] **T015**: Ejecutar suite de pruebas de compilación (`tsc --noEmit` y `npm run build`) verificando cero errores y cero advertencias críticas.
- [x] **T016**: Redactar `specs/011-web-push-notifications/implementation.md` con reporte de verificación de los 6 Criterios de Aceptación.

### Fase 7: Centro de Notificaciones In-App (Feed en Vivo de Alertas y Novedades)
- [x] **T017**: Expandir `src/types/push-notifications.ts` con la interfaz canónica `AppNotification`.
- [x] **T018**: Implementar ruta API dinámica `src/app/api/notifications/route.ts` que agregue en tiempo real el último juego/resultado de Leones de MLB Stats API, notas de NotiCueva de Supabase, roster de 34 peloteros y transmisión de La Mega 107.3 FM.
- [x] **T019**: Reestructurar `src/components/notifications/notification-modal.tsx` con arquitectura de doble pestaña: Pestaña 1 "Alertas y Novedades" (feed interactivo con enlaces directos y badges) y Pestaña 2 "Alertas Push (Móvil / PC)".
- [x] **T020**: Actualizar `src/components/notifications/notification-bell.tsx` para consultar `/api/notifications` y mostrar badge numérico dinámico de alertas activas en header y menú móvil.
- [x] **T021**: Validar tipado TypeScript con `npx tsc --noEmit` y registrar convergencia en `implementation.md`.
