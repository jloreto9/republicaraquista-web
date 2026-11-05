# Especificación de Feature 018: Optimización Integral Mobile-First

## 1. Resumen Ejecutivo
Esta especificación define la transformación de la experiencia móvil de **República Caraquista Web** en una PWA de alto rendimiento y ergonomía nativa:
- Incorporación de **Bottom Navigation Bar** fija (5 destinos: Inicio, Game Center, Posiciones, Calendario, Más).
- Rediseño de tablas anchas (**StandingsTable** y **BoxscoreLineupsTab**) con columnas esenciales en móvil y filas expandibles tipo acordeón.
- Optimización de espaciados, paddings y ergonomía táctil en el **LiveHeroGameCard** y el Centro de Mando.
- Pulido de interfaz: Safe Area Insets (`env(safe-area-inset-bottom)`), feedback táctil (`active:scale-[0.98]`) y elevación coordinada del `RadioPlayer`.

---

## 2. Requerimientos Funcionales

### RF-01: Bottom Navigation Bar Fija
- Solo visible en pantallas móviles/tablets (`< lg`).
- 5 botones táctiles de al menos 44x44px:
  1. `Inicio` (`/`, `LayoutDashboard`)
  2. `Game Center` (`/game-center`, `Tv` con badge pulsante si el juego está en vivo)
  3. `Posiciones` (`/standings`, `Trophy`)
  4. `Calendario` (`/calendario`, `Calendar`)
  5. `Más` (`Menu`, abre el Drawer de categorías)
- Fondo Glassmorphism con `backdrop-blur-md` y soporte para `env(safe-area-inset-bottom)`.

### RF-02: Tablas Anchas con Acordeón en Móvil
- **StandingsTable**: En `< sm`, muestra `POS`, `EQUIPO`, `G`, `P`, `PCT`, `DIF` y chevron. Al tocar la fila se despliega la tarjeta con casa/visita, carreras, racha, L10 y pitagórico. En `>= sm`, muestra la tabla completa de 16 columnas.
- **BoxscoreLineupsTab**: En `< sm`, muestra las estadísticas esenciales del bateador/lanzador con fila desplegable para el desglose secundario.

### RF-03: Ergonomía de Centro de Mando & Live Hero
- Pila vertical fluida sin scroll horizontal accidental.
- Líneas de carrera y diamante con tamaños de fuente y padding táctiles ajustados a pantallas de 360px a 414px.

### RF-04: Coordinación con RadioPlayer
- El reproductor de radio flotante se posiciona a `bottom-20` en móvil para no solapar los botones de la barra inferior.
