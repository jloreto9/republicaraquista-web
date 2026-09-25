# Feature Specification: Mobile Responsive Orientation (Landscape / Portrait Mode)

> **Feature**: `001-mobile-orientation-landscape-portrait`  
> **App**: `republicaraquista-web` (REPUBLICARAQUISTAPP)  
> **Status**: Ready for Implementation  
> **Author**: Jorge Leonardo Loreto • AI Data Scientist  
> **Date**: 2026-09-25

---

## 1. Problem Statement
Actualmente, los usuarios que abren `REPUBLICARAQUISTAPP` en sus teléfonos móviles tienen la orientación bloqueada a vertical si la instalan como PWA, debido a la directiva `"orientation": "portrait"` en los manifiestos. Asimismo, quienes la usan en navegador móvil sufren de un layout rígido diseñado para pantallas verticales angostas (~390px), lo que dificulta la lectura de:
- Tablas sabermétricas de lanzadores (10 salidas con 15 columnas).
- Tablas de bateo y fildeo con más de 10 métricas por fila.
- Gráficos de series de tiempo (curvas de Win Expectancy WPA de 9 entradas).
- Mapas espaciales de Spray Charts y Strike Zone (que requieren desplazarse verticalmente).

## 2. Proposed Solution
Desbloquear y optimizar activamente la rotación en dispositivos móviles, transformando la orientación horizontal (**Landscape**) en un **"Modo Estadio / Consola Sabermétrica"**:
- **Vertical (Portrait)**: Flujo de lectura vertical rápido, KPIs en columna, navegación táctil estándar con una sola mano.
- **Horizontal (Landscape)**: Desbloqueo de 800-932px de ancho útil para visualizar tablas completas de 10 juegos sin truncamiento, timeline extendido de WPA y disposición lado a lado (split screen) de gráficos espaciales.

## 3. User Scenarios & Acceptance Criteria

### Escenario 1: Lanzadores en `/pitching`
- **Dado** que un usuario está en la vista de Pitching Summary en su teléfono en posición vertical,
- **Cuando** rota físicamente el teléfono a posición horizontal (Landscape),
- **Entonces** la tabla de los últimos 10 juegos se expande a pantalla completa o vista dual sin scroll horizontal forzado, mostrando FECHA, RIVAL, ROL, DEC, IP, H, R, ER, BB, SO, PIT, STR%, WHIFF%, CSW% y ERA de forma perfectamente legible.

### Escenario 2: Curvas de Win Expectancy en `/wpa`
- **Dado** que un usuario visualiza el gráfico de probabilidad de victoria de un juego,
- **Cuando** gira su teléfono a horizontal,
- **Entonces** el gráfico se expande horizontalmente a lo largo de las 9 entradas completas con tipografía nítida y etiquetas legibles.

### Escenario 3: PWA Instalada
- **Dado** que un usuario instaló la app como PWA en su iPhone o Android,
- **Cuando** cambia la orientación física del dispositivo,
- **Entonces** el sistema operativo rota la ventana suavemente sin bloquearse en vertical.

### Escenario 4: Zonas Seguras de Pantalla (Safe Areas)
- **Dado** un teléfono con Dynamic Island o Notch en orientación horizontal,
- **Cuando** la aplicación se renderiza a pantalla completa,
- **Entonces** ningún botón, texto o dato queda tapado por el corte de la pantalla gracias a `env(safe-area-inset-*)`.
