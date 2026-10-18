# Especificación Funcional: Circuito Radial en Vivo y Reproductor Persistente de Audio

## 1. Resumen Ejecutivo y Propósito
El módulo **Circuito Radial en Vivo** dota a **REPUBLICARAQUISTAPP** de un reproductor de audio integrado, persistente y sin interrupciones para sintonizar las transmisiones oficiales de **Leones del Caracas** a través del circuito radial insignia (**La Mega 107.3 FM Caracas / Unión Radio**).

Esta funcionalidad permite que el fanático caraquista:
1. Escuche la narración oficial del juego en vivo mientras navega libremente por toda la aplicación (marcador, boxscore, estadísticas, NotiCueva, spray charts, etc.) sin que el audio se corte ni se reinicie.
2. Tenga acceso directo y sin publicidad intrusiva a la señal oficial de streaming provista por el circuito Unión Radio / Lorini (`https://acp4.lorini.net:2050/stream`).
3. Controle la reproducción, el volumen y la conmutación de emisoras mediante una interfaz moderna Glassmorphism adaptada tanto a dispositivos móviles (PWA) como a desktop.

---

## 2. Definición Técnica de Emisoras y Streams de Audio

Las emisiones se transmiten vía HTTPS seguro con soporte nativo de Icecast (formato `audio/mpeg` a 128 kbps, 44.1 kHz estéreo) y cabeceras `Access-Control-Allow-Origin: *`:

| ID Emisora | Nombre Comercial | Frecuencia / Red | URL de Stream Directo | Rol |
|---|---|---|---|---|
| `lamega` | **La Mega 107.3 FM** | 107.3 FM Caracas · Circuito Unión Radio | `https://acp4.lorini.net:2050/stream` | **Principal (Transmisión oficial de Leones del Caracas)** |
| `unionradio` | **Éxitos 99.9 FM / Deportes** | 99.9 FM Caracas · Unión Radio | `https://acp4.lorini.net:2070/stream` | Alterna / Deportes complementarios |
| `onda` | **Onda La Superestación** | 107.9 FM Caracas · Unión Radio | `https://acp4.lorini.net:2060/stream` | Respaldo adicional |

### Atribución y Enlaces Oficiales:
- Portal oficial de origen: [Mundo UR / La Mega Live](https://unionradio.net/live-mega/) y [MundoUR.com](https://mundour.com/).
- El reproductor debe incluir un botón o link sutil de atribución externa que abra la fuente oficial en una nueva pestaña de forma segura (`target="_blank" rel="noopener noreferrer"`).

---

## 3. Requisitos Funcionales y de Experiencia de Usuario (UI/UX)

### 3.1. Persistencia Global en el Árbol DOM
* El reproductor de audio debe montarse en `src/app/layout.tsx` dentro de un Contexto de Audio o componente cliente persistente (`RadioProvider` / `RadioPlayer`).
* La navegación entre rutas (`/`, `/standings`, `/noticueva`, `/pitching`, etc.) mediada por Next.js App Router **no debe desmontar el elemento `<audio>`**.

### 3.2. Modo Minimizado (Floating Mini-Player / Pill)
* **Mobile (< lg):** Anclado flotante sobre la barra de navegación inferior (distancia de seguridad `bottom-20` en móvil) para evitar solapamientos con el bottom bar o el notch de iOS.
* **Desktop (lg+):** Anclado en la esquina inferior derecha (`bottom-6 right-6`) o integrado discretamente con la barra inferior.
* **Elementos en Miniatura:**
  - Badge pulsante: Punto dorado/rojo con etiqueta `EN VIVO`.
  - Emisora activa: `La Mega 107.3 FM` y subtítulo `Circuito Radial Leones`.
  - Botón de Reproducir / Pausa (`Play` / `Pause`) con animación de carga mientras se conecta el stream.
  - Botón de Expansión (`▲` / chevron) para abrir el panel completo.

### 3.3. Modo Expandido (Tarjeta Flotante Glassmorphism)
* **Diseño:** Tarjeta de fondo oscuro translúcido (`bg-[#0D152B]/95 backdrop-blur-xl border border-[#1E2B4D] shadow-2xl rounded-2xl`).
* **Visualizador de Audio:** Animación CSS de ecualizador de barras cuando el audio esté reproduciéndose activamente.
* **Selector de Emisora:** Pestañas o selector rápido para cambiar entre `La Mega 107.3 FM` y `Éxitos 99.9 FM`.
* **Control de Volumen:** Control deslizante (`range`) de 0% a 100% con botón de silencio (`Mute`) y restauración de volumen previo.
* **Estado de Conexión:**
  - `Listo para escuchar`: Audio detenido.
  - `Sintonizando...`: Buffering del stream.
  - `En el aire`: Audio reproduciéndose.
  - `Reconectando...`: En caso de fallo transitorio en la red o caída del socket Icecast.
* **Botón de Minimizar (`▼`)**: Contrae la tarjeta al modo píldora sin interrumpir la transmisión.

### 3.4. Resiliencia y Políticas de Autoplay
* **Políticas de Navegadores:** Por defecto el reproductor inicia en estado `paused` para cumplir con las directivas de Autoplay de Chrome, Safari y navegadores móviles.
* **Reconexión Automática:** Si la conexión a la emisora se interrumpe temporalmente, el motor intentará reconectar automáticamente con un delay de 3 segundos antes de mostrar un mensaje de reintento manual.
* **Persistencia de Preferencias:** El volumen seleccionado y la última estación sintonizada se almacenan en `localStorage` (`rc_radio_volume`, `rc_radio_station`).

---

## 4. Criterios de Aceptación
1. El usuario puede iniciar la reproducción de La Mega 107.3 FM con un solo toque/clic.
2. Al navegar entre las diferentes páginas de la aplicación, la música o narración continúa sonando sin ningún microcorte.
3. El reproductor es plenamente responsivo: se adapta a pantallas móviles pequeñas sin tapar botones de acción y a pantallas de escritorio.
4. El control de volumen y botón de mute funcionan de inmediato sin latencia.
5. Los créditos y atribución a Mundo UR / Unión Radio están claramente visibles y respetan los términos de enlace externo.
