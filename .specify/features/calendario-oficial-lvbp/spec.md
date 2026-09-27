# Feature Specification: Calendario Oficial LVBP 2026-2027 (Leones del Caracas)

## 1. Visión General
Implementación de la vista interactiva de **Calendario Oficial LVBP 2026-2027** para Leones del Caracas en **REPUBLICARAQUISTAPP**.
El módulo permite a los fanáticos consultar los 56 encuentros de la ronda regular en formato de cuadrícula mensual (tipo calendario y no lista), con diferenciación visual de juegos en casa (blanco) y de visita (dorado), actualización dinámica de horas y canales de transmisión desde el feed `.ics`, suscripción directa a Google Calendar y Apple Calendar (iOS webcal), e integración progresiva de resultados.

## 2. Reglas de Negocio e Identidad
- **Formato Cuadrícula Mensual**: Vista estructurada de mes completo (Octubre, Noviembre, Diciembre 2026) con días de la semana de Lunes a Domingo, celdas de días sin juego claramente distinguidas y tarjetas de juego ricas en información.
- **Diferenciación de Colores Canónica**:
  - **Juegos en Casa (Local)**: Acentos, bordes y badge en **Blanco** (`border-slate-100/60`, texto blanco).
  - **Juegos de Visita (Visitante)**: Acentos, bordes y badge en **Dorado Caraquista** (`#FDB827`).
- **Logos Oficiales**: Uso del CDN oficial de MLB (`spots/120`) mapeado con la estructura `LVBP_TEAMS` existente en `src/lib/constants.ts`.
- **Horarios y Transmisión**:
  - Horario pendiente: Indicador "Hora por confirmar" con icono de reloj.
  - Horario confirmado: Formateo horario local de Caracas (ej. `7:00 PM`).
  - Transmisión: Extracción de canales oficiales (ej. `Televen`, `IVC`, `Venevisión`, `SimpleTV`, `ByM Sport`, `1Beisbol`) o etiqueta "Por confirmar".
- **Sincronización de Resultados**:
  - Cruce con la base de datos Supabase (`games`) para mostrar marcador final (`CAR 5 - 3 MAG (Final)`) e indicador de Victoria (`G`) o Derrota (`P`) al disputarse los partidos.
- **Suscripción de Calendario**:
  - Google Calendar (Android / Web): URL directa con `cid` oficial.
  - Apple Calendar (iOS / macOS): URL de protocolo `webcal://` con instrucción rápida y botón de copiado.
  - Descarga de archivo `.ics` raw para clientes independientes.
- **Ubicación en Navegación**:
  - **Tercera posición** en el menú principal (`Sidebar` y `MobileNav`), situada entre `Posiciones & ELO` y `Líderes Individuales`.

## 3. Criterios de Aceptación
1. **User Story 1 - Vista de Cuadrícula Mensual (P1)**:
   - Los 56 partidos se visualizan organizados por mes (Octubre, Noviembre, Diciembre 2026).
   - Los días libres y días de juego se distinguen claramente.
   - Navegación entre meses fluida y responsiva.
2. **User Story 2 - Identidad Visual y Tarjetas de Juego (P1)**:
   - Juegos de local lucen en blanco pulcro; juegos de visita lucen en dorado (#FDB827).
   - Cada tarjeta muestra logo del rival, abreviatura, condición (@ / vs.), hora y transmisión.
3. **User Story 3 - Modal de Detalle y Suscripción (P2)**:
   - Clic en cualquier juego abre un modal con detalles completos: estadio, ciudad, transmisión y enlace a Matchup 360.
   - Barra superior con botones funcionales para Google Calendar, Apple Calendar y descarga de archivo `.ics`.
4. **User Story 4 - Integración de Resultados y Supabase (P2)**:
   - Sincronización automática de marcadores finales de juegos disputados.
5. **User Story 5 - Integración de Navegación (P1)**:
   - Acceso desde la 3ra posición del menú en escritorio y móvil (`/calendario`).
