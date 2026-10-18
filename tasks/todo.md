# Backlog de Prioridades & Roadmap • REPUBLICARAQUISTAPP

> **Origen:** Benchmarking funcional y de experiencia de usuario contra FansMagallanes 360 vs. arquitectura sabermétrica moderna de REPUBLICARAQUISTAPP (Next.js 16, React 19, Supabase, MLB Stats API).
> **Fecha de Creación:** 18 de Octubre de 2026.
> **Última Actualización:** 18 de Octubre de 2026.

---

## 🏆 Resumen de Estado de Prioridades (P1 - P5)

| Prioridad | Módulo / Feature | Ruta / Componente | Estado |
|---|---|---|---|
| **P1** | **Circuito Radial en Vivo (Sticky Player)** | [`src/components/radio/sticky-radio-player.tsx`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/components/radio/sticky-radio-player.tsx) | ✅ **Completado y en Producción** |
| **P2** | **Roster Semanal Oficial de 34 + Staff** | [`/roster`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/roster/page.tsx) | ✅ **Completado y en Producción** |
| **P3** | **Tracker de Hitos & Récords Melenudos** | `/hitos` | ⏳ **Pendiente (Siguiente en Backlog)** |
| **P4** | **Live Game Center / Segunda Pantalla** | [`/game-center`](file:///c:/Users/Administrator/Projets/republicaraquista-web/src/app/game-center/page.tsx) | ✅ **Completado y en Producción** |
| **P5** | **Scouting Táctico Pre-Juego del Rival** | `/scouting` | ⏳ **Pendiente (Backlog)** |
| **P6** | **Movimientos & Estatus de Importados** | `/movimientos` | 💡 **Propuesta Complementaria** |

---

## ⏳ P3: Tracker de Hitos & Récords Melenudos (`/hitos`)

### 1. Propósito
Centralizar y proyectar el seguimiento de cifras redondas históricas, marcas personales de por vida en la LVBP y récords de la franquicia de los Leones del Caracas para la temporada 2026-27.

### 2. Estructura de la Vista (`/hitos`)
* **A cinco o menos (Inminentes):** Marcas a punto de caer en los próximos 1-3 compromisos.
  * Ejemplos:
    * Wilfredo Tovar: a 3 hits de los 500 de por vida en LVBP.
    * Harold Castro: a 2 impulsadas de las 200 de por vida.
    * José Rondón: a 3 cuadrangulares de marca de franquicia caraquista.
* **A seis a quince (Al alcance en la temporada):**
  * Hitos proyectados para alcanzarse dentro de los 56 juegos de ronda regular.
* **A dieciséis a treinta (Radar melenudo):**
  * Cifras de volumen que entraron en la mira para seguimiento progresivo.
* **Récords de Franquicia Históricos de Leones:**
  * Máximos jonroneros en una temporada regular (récord de José Rondón en 2022-23).
  * Líderes históricos de salvados, ponches de abridores, etc.

### 3. Arquitectura de Datos & Cálculo
* **Fórmula:** `Valor Actual = Base Histórica (hasta 2025-26) + Producción Temporada 2026-27 (Supabase)`.
* **Diferencia faltante:** `Hito Objetivo - Valor Actual`.
* **Barra de Progreso Visual:** Indicador porcentual dinámico `(Valor Actual / Hito Objetivo) * 100%`.
* **Filtrado por Ámbito:**
  * Hitos LVBP General (todo el circuito).
  * Hitos exclusivos vistiendo el uniforme de Leones del Caracas.

### 4. Comando Spec-Kit para iniciar:
```bash
speckit feature hitos-tracker
```

---

## ⏳ P5: Scouting Táctico Pre-Juego del Rival (`/scouting`)

### 1. Propósito
Ofrecer al aficionado, periodista y analista sabermétrico un **Reporte de Inteligencia Pre-Partido** automatizado contra el rival de la jornada, publicado antes de la voz de *"Play Ball"*.

### 2. Módulos del Reporte Táctico
1. **Duelo de Abridores Anunciados:**
   * Comparativa cara a cara: ERA, WHIP, FIP, K/9, BB/9, repertorio y zonas de mayor efectividad.
   * **Historial BvP (Batter vs Pitcher):** Cómo le han bateado los toleteros melenudos al abridor rival en sus carreras (AB, H, HR, AVG, OPS).
2. **Radar de Fatiga del Bullpen Rival:**
   * Relevistas utilizados por el contrincante en los últimos 2 días calendario.
   * Conteo de pitcheos acumulados y descansos:
     * 🟢 **Disponible:** 0 lanzamientos en 48h o menos de 15 lanzamientos.
     * 🟡 **Carga Media:** Lanzó ayer 15-25 pitcheos.
     * 🔴 **Agotado / No Disponible:** 2 días consecutivos lanzando o > 30 pitcheos en la víspera.
3. **Tendencias Tácticas del Rival:**
   * Rendimiento colectivo con corredores en posición anotadora (RISP).
   * Eficiencia de retención de ventajas de su bullpen (Hold / Save / Blown Save %).
   * Splits vs lanzadores zurdos (LHP) y derechos (RHP).

### 3. Comando Spec-Kit para iniciar:
```bash
speckit feature scouting-pre-juego
```

---

## 💡 Módulos Complementarios Identificados

### 1. Movimientos & Transacciones de Roster (`/movimientos`)
* Registro cronológico oficial de:
  * Altas y bajas semanales del Roster de 34.
  * Estatus de importados (Reportado, En Trámite de Visado, Lesionado, Cesanteado).
  * Incorporaciones de jugadores MLB/MiLB a lo largo de noviembre y diciembre.
* Evita contradicciones con el Roster de 34 garantizando una sola fuente de verdad.

### 2. Perfiles Individuales Enlazables (`/jugadores/[id]`)
* Páginas dedicadas por pelotero accesibles desde `/individuales`, `/roster` o `/game-center`.
* Integra tarjeta de bio oficial, sabermetría completa, radar polar 8D, spray chart BIS y botón de compartir nativo en WhatsApp/redes.
