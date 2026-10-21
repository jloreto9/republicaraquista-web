# Especificación de Feature: Notificaciones Web Push PWA (República Caraquista)

**Slug:** `011-web-push-notifications`  
**Autor:** Antigravity & Jorge Leonardo Loreto (@JorgeLoreto)  
**Fecha:** 2026-10-21  
**Estado:** Especificado (Fase 1 de Spec-Kit)  

---

## 1. Contexto y Objetivos

**República Caraquista** es la plataforma web y Progressive Web App (PWA) de referencia para los fanáticos de los Leones del Caracas en la LVBP, desplegada en **Vercel** con persistencia en **Supabase**. Actualmente, los fanáticos acceden al Game Center, Circuito Radial y NotiCueva mediante navegación pull (ingresar manualmente a la web).

El objetivo de esta funcionalidad es transformar la experiencia del usuario hacia un modelo reactivo e interactivo mediante **Notificaciones Web Push nativas del sistema operativo** (estándar W3C Push API + VAPID), permitiendo al fanático recibir alertas de alta relevancia incluso con el navegador o la aplicación cerrados, con cero costo de infraestructura en Vercel.

### Metas Principales:
1. **Suscripción y Preferencias:** Permitir a los usuarios activar notificaciones y seleccionar qué alertas recibir mediante interruptores claros.
2. **Catálogo de Notificaciones:** Cobertura de 4 categorías concretas: inicio y resultado final, carreras y jonrones, extrainnings, y noticias y roster.
3. **Disparador Híbrido:**
   - **Automático:** Detección de eventos de juego (Play ball, carreras, final) mediante la API de MLB.
   - **Manual:** Formulario en el panel de administración de NotiCueva para publicar noticias y notas breves.
4. **Soporte Multiplataforma:** Funcionamiento en Android, escritorio (Chrome, Edge, Firefox, Safari) e iOS 16.4+ (PWA instalada en pantalla de inicio).

---

## 2. Catálogo de Notificaciones y Categorías

El sistema organiza las alertas en 4 categorías:

| Identificador (`topic_id`) | Etiqueta en Interfaz | Evento | Ejemplo | Frecuencia |
|---|---|---|---|---|
| `game_status` | **Inicio y resultado final** | • Lineup confirmado<br>• Inicio de juego (Play ball)<br>• Pizarra final | **Play Ball**: Leones del Caracas vs Navegantes del Magallanes en el Estadio Monumental. | 2–3 por juego |
| `scoring_plays` | **Carreras y jonrones** | • Carreras anotadas<br>• Jonrones de Leones | **Jonrón**: Harold Castro conecta cuadrangular. Leones 4, Navegantes 2 (7ma entrada). | 1–4 por juego |
| `extra_innings` | **Extrainnings** | • Entradas extras (inning 10+)<br>• Empate en el 9no inning | **Extrainning**: Juego empatado 5-5 en la 10ma entrada. | Ocasional |
| `news_roster` | **Noticias y roster** | • Publicaciones en La Cueva<br>• Cambios en el roster semanal | **Roster Semanal**: Publicada la lista oficial de 34 jugadores para la semana. | 2–3 por semana |

---

## 3. Requerimientos Funcionales

### RF01: Registro y Gestión de Suscripciones (Client-Side)
- La aplicación debe verificar el soporte del navegador para `('serviceWorker' in navigator && 'PushManager' in window)`.
- En dispositivos iOS donde la app no esté instalada como standalone PWA, la interfaz muestra una indicación clara: *"Para recibir notificaciones en iPhone, pulsa Compartir y selecciona 'Agregar a pantalla de inicio'"*.
- Al pulsar *"Activar notificaciones"*, se solicita `Notification.requestPermission()`. Si se concede, se suscribe al `pushManager` con la clave pública `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
- Se envía el objeto `PushSubscription` (endpoint, claves `p256dh` y `auth`) al backend junto con las categorías activadas.

### RF02: Persistencia en Supabase
- Registro en la tabla `push_subscriptions` con `endpoint` como clave única (upsert).
- Almacenamiento del arreglo `topics TEXT[]` para filtrado por categoría.
- Depuración automática: si el servicio de mensajería (FCM/Apple) devuelve código HTTP 404 o 410, el backend elimina la suscripción obsoleta de la base de datos.

### RF03: Service Worker (`public/sw.js`)
- **Evento `push`:** Procesa payloads JSON con la estructura:
  ```json
  {
    "title": "Victoria de Leones del Caracas",
    "body": "Pizarra final: Leones 6, Navegantes 4. PG: Jhoulys Chacín. JS: Anthony Castro.",
    "icon": "/icon-512.png",
    "badge": "/favicon.ico",
    "url": "/game-center",
    "tag": "game-final-2026",
    "data": { "url": "/game-center" }
  }
  ```
- **Evento `notificationclick`:** Al pulsar la notificación, abre o enfoca la ventana en la ruta indicada (`url`).

### RF04: Panel de Envío Manual (NotiCueva Admin)
- Formulario en la administración de NotiCueva:
  - Selector de categoría (`news_roster`, `game_status`, `scoring_plays`, `extra_innings`, o todas).
  - Título del mensaje.
  - Texto descriptivo.
  - Ruta de destino (por defecto `/noticueva` o `/game-center`).
  - Botón de envío con confirmación y reporte de entregas.

### RF05: Disparador Automático de Juegos
- Endpoint `/api/push/game-event` protegido por token de autorización (`CRON_SECRET`).
- Evaluación de estados desde MLB Stats API:
  - Cambio a `In Progress` → Notificación de inicio de juego.
  - Cambio a `Final` → Notificación de resultado final.
  - Entrada $\ge 10$ → Notificación de extrainning.
  - Anotación o jonrón de Leones → Notificación de carrera/jonrón.

---

## 4. Contrato de Datos e Interfaces

```typescript
// Categorías de notificación
export type NotificationTopic = 'game_status' | 'scoring_plays' | 'extra_innings' | 'news_roster';

export interface UserNotificationPreferences {
  game_status: boolean;
  scoring_plays: boolean;
  extra_innings: boolean;
  news_roster: boolean;
}

// Payload de envío
export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url: string;
  topic: NotificationTopic;
  tag?: string;
}
```

---

## 5. Criterios de Aceptación (Definición de Terminado)

1. **CA01:** Un usuario en Android o Escritorio puede pulsar "Activar Notificaciones", conceder permiso y recibir una notificación de prueba exitosa en pantalla.
2. **CA02:** Un usuario en iOS ve la guía de *"Agregar a Inicio"* si no está en modo standalone.
3. **CA03:** Los tópicos deseleccionados por el usuario no reciben notificaciones de esa categoría (respeto estricto al opt-in).
4. **CA04:** El panel NotiCueva permite enviar un mensaje manual autenticado que llega a los dispositivos suscriptores en menos de 3 segundos.
5. **CA05:** Las suscripciones que expiran o son revocadas en el navegador son limpiadas automáticamente de Supabase (sin tokens huérfanos).
6. **CA06:** `npm run build` y `tsc --noEmit` compilan con 0 errores y 0 regresiones en Vercel.
