# Tareas de Implementación: Circuito Radial en Vivo (`004-circuito-radial-leones`)

- [x] **Tarea 1: Catálogo de Estaciones y Definición de Tipos**
  - Crear `src/components/radio/radio-stations.ts` con la lista canónica de estaciones de Unión Radio (La Mega 107.3 FM, Éxitos 99.9 FM, Onda 107.9 FM) y sus endpoints HTTPS verificados.

- [x] **Tarea 2: Contexto de Radio Global (`RadioProvider`)**
  - Crear `src/context/radio-context.tsx` para administrar el estado de reproducción (`isPlaying`, `status`, `volume`, `isMuted`, `isExpanded`, `currentStation`), con persistencia en `localStorage`.

- [x] **Tarea 3: Componente de Ondas de Sonido (`RadioWave`)**
  - Crear `src/components/radio/radio-wave.tsx` para animar las barras del ecualizador cuando el streaming esté activo.

- [x] **Tarea 4: Componente del Reproductor Persistente (`RadioPlayer`)**
  - Crear `src/components/radio/radio-player.tsx` implementando:
    - Elemento nativo `<audio>` con reconexión en vivo y manejo de eventos (`play`, `pause`, `waiting`, `playing`, `error`).
    - Vista minimizada (Pill flotante responsivo con botón Play/Pause, badge EN VIVO y chevron).
    - Vista expandida (Tarjeta Glassmorphism con selector de emisoras, slider de volumen, botón de mute, animación de ondas y enlace a Mundo UR / Unión Radio).

- [x] **Tarea 5: Integración en el Layout Raíz (`layout.tsx`)**
  - Envolver la aplicación en `<RadioProvider>` e insertar `<RadioPlayer />` en `src/app/layout.tsx`.
  - Ajustar márgenes inferiores de seguridad para que no solape la barra de navegación móvil.

- [x] **Tarea 6: Pruebas de Compilación, Calidad y Verificación**
  - Ejecutar `npm run build` con Turbopack para validar que no haya errores de TypeScript ni de hidratación.
  - Verificar la reproducción del stream en vivo de La Mega 107.3 FM y la navegación entre páginas.
