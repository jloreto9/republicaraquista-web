# Especificación de Feature: Pestaña "Rachas" (Rachas Activas) en Centro de Mando

**Slug:** `021-rachas-activas-centro-mando`  
**Rama:** `021-rachas-activas-centro-mando`  
**Autor:** Antigravity & Jorge Leonardo Loreto (@JorgeLoreto)  
**Fecha:** 2026-11-06  
**Estado:** Especificado y Clarificado (Spec-Kit Track 2 • Listo para Planificación)  

---

## 1. Contexto y Objetivos de Producto

En **República Caraquista** (`https://republicaraquistapp.vercel.app/`), el **Centro de Mando** (`/`) es el epicentro visual del aficionado y analista de Leones del Caracas.

Actualmente cuenta con 4 pestañas en `DashboardTabs`. Tras la clarificación con el usuario, la nueva pestaña **"Rachas"** se ubica en la **3.ª posición** en el siguiente orden canónico:
1. **Último Juego** (`last-game`): Boxscore, MVP y mejores jugadas.
2. **Tendencias** (`trends`): Rendimiento y balance en los últimos 10 juegos (U10J).
3. **Rachas** (`rachas`): Seguidillas activas individuales y de equipo (**NUEVA**, con badge `"Activas"` e icono `Flame`).
4. **Líderes del Equipo** (`leaders`): Top 3 en bateo y pitcheo del club.
5. **Leones Stats** (`leones-stats`): Métricas situacionales avanzadas (local/visita, día/noche, remontados, récord semanal, TV y series particulares).

### Alcance Acordado (Clarification Gate)
- **Alcance prioritario:** Jugadores de **Leones del Caracas** (bateadores y lanzadores caraquistas en racha activa) + **Rachas de equipo** (general, local en el Monumental, visitante en la carretera y series particulares activas cara a cara vs los 7 rivales de la LVBP).
- **Posición UI:** 3.ª pestaña (junto a Tendencias).

---

## 2. Requerimientos Funcionales (RF)

### RF01: Motor y Servicio de Cálculo de Rachas (`src/lib/streaks-service.ts`)
Crear un servicio puro y tipado para calcular y extraer las rachas activas a partir de los datos existentes en Supabase (`games`, `batting_stats`, `pitching_stats`):

1. **Rachas Colectivas de Leones del Caracas (`TeamStreaks`):**
   - **Racha General Activa**: Consecutivos ganados (ej. `3 W`) o perdidos (ej. `1 L`).
   - **Racha de Local (Monumental Simón Bolívar)**: Consecutivos ganados/perdidos como home club.
   - **Racha de Visitante**: Consecutivos ganados/perdidos en la carretera.
   - **Rachas Activas Head-to-Head (H2H) vs Rivales**: Para cada uno de los 7 rivales de la LVBP (Magallanes, Tiburones, Cardenales, Tigres, Águilas, Caribes, Bravos), calcular el balance de los últimos juegos y la racha activa (ej. `2 W vs Navegantes del Magallanes`, `1 L vs Cardenales de Lara`).
   - **Rachas Situacionales**: Racha en juegos de 1 carrera y racha en extrainnings.

2. **Rachas Ofensivas Activas de Jugadores (`BatterStreakItem`):**
   - **Racha de Hits (Hitting Streak)**: Juegos consecutivos con al menos 1 hit conectado ($H \ge 1$) para bateadores de Leones con apariciones al plato oficiales ($AB \ge 1$ o $PA \ge 1$).
     - Metadatos durante la racha: Juegos de la racha, Hits/Turnos oficiales ($H/AB$), Promedio de Bateo (.AVG) y Cuadrangulares (HR) durante el tramo.
   - **Racha de Embasado (On-Base Streak)**: Juegos consecutivos llegando a base por Hit, Boleto o Golpe ($H + BB + HBP \ge 1$).
     - Metadatos: Juegos consecutivos, $OBP$ en el tramo.
   - **Racha de Remolcadas (RBI Streak)**: Juegos consecutivos empujando al menos 1 carrera ($RBI \ge 1$, umbral $\ge 2$ juegos).
   - **Racha de Anotadas (Runs Streak)**: Juegos consecutivos anotando al menos 1 carrera ($R \ge 1$, umbral $\ge 2$ juegos).

3. **Rachas de Pitcheo Activas (`PitcherStreakItem`):**
   - **Apariciones Consecutivas sin Permitir Carrera Limpia (Scoreless Appearances)**: Especialmente relevante para relevistas del bullpen (ej. 5 apariciones consecutivas con $0\text{ ER}$, innings lanzados acumulados y ponches).
   - **Innings Consecutivos en Blanco (Scoreless Innings Streak)**: Tramo acumulado de innings recientes sin carreras permitidas.
   - **Racha de Salvados Consecutivos (Save Streak)**: Salvados exitosos consecutivos sin incurrir en Blown Save (BS).
   - **Racha de Ponches (Strikeout Streak)**: Juegos consecutivos logrando $\ge 1$ ponche.

4. **Reglas de Negocio Sabermétricas:**
   - La temporada por defecto es la temporada activa devuelta por `getActiveSeason()`.
   - Si no hay juegos disputados aún en una temporada naciente, manejar fallback limpio a `0` o estado base sin romper la interfaz.
   - Umbrales de filtro: Solo mostrar jugadores cuya racha activa sea relevante (ej. Hitting streak $\ge 2$ juegos, On-base streak $\ge 3$ juegos, Relevistas $\ge 2$ apariciones en blanco).

---

### RF02: Contrato de Datos e Interfaces TypeScript (`src/types/streaks.ts`)

```typescript
export interface BatterStreakItem {
  playerId: number;
  playerName: string;
  playerPhoto: string;
  position: string;
  streakType: "hitting" | "on_base" | "rbi" | "runs";
  streakLabel: string; // ej: "Juegos con Hit", "Juegos Embasándose"
  streakLength: number; // Cantidad de juegos consecutivos
  statsSummary: string; // ej: "12 H en 28 VB (.429)", "6 BB, 1 HBP (.515 OBP)"
  startDate?: string;
  active: boolean;
}

export interface PitcherStreakItem {
  playerId: number;
  playerName: string;
  playerPhoto: string;
  role: "Closer" | "Setup" | "Reliever" | "Starter";
  streakType: "scoreless_app" | "scoreless_ip" | "saves" | "strikeouts";
  streakLabel: string; // ej: "Apariciones sin Carreras", "Innings en Blanco"
  streakLength: number; // ej: 6 apariciones o 8.1 innings
  statsSummary: string; // ej: "6.2 IP • 8 K • 0.00 ERA", "5/5 Salvados"
  active: boolean;
}

export interface TeamStreakItem {
  category: string; // "General", "Local", "Visitante", "vs Magallanes", etc.
  streak: string;   // "3 W", "2 L"
  trend: "winning" | "losing" | "neutral";
  details: string;  // "Estadio Monumental", "Últimos 5 juegos", etc.
  lastResult?: {
    rival: string;
    score: string;
    date: string;
  };
}

export interface RachasTabData {
  teamStreaks: {
    general: TeamStreakItem;
    home: TeamStreakItem;
    away: TeamStreakItem;
    rivals: TeamStreakItem[];
  };
  hittingStreaks: BatterStreakItem[];
  onBaseStreaks: BatterStreakItem[];
  pitchingStreaks: PitcherStreakItem[];
  updatedAt: string;
}
```

---

### RF03: Componente de Pestaña `RachasTab` (`src/components/dashboard/tabs/rachas-tab.tsx`)

1. **Diseño Visual de Primer Nivel (Apegado a `impeccable.md`):**
   - Fondo: Caracas Navy `#0D152B`, bordes `#1E2B4D`, detalles Oro Caraquista `#FDB827`.
   - Tipografía: Títulos con tracking amplio, números y rachas en `font-mono font-bold`.
   - Sin emojis como iconos (utilizar `Flame`, `ShieldCheck`, `TrendingUp`, `Sparkles`, `Swords` de Lucide).
   - Selector o tabs internas fluidas:
     - `Todo` | `Bateadores Encendidos` | `Brazos Intocables` | `Rachas de Equipo`.

2. **Sección 1: Rachas Colectivas de Leones del Caracas:**
   - 3 tarjetas KPI superiores:
     - **Racha General**: Indicador visual dinámico (verde esmeralda si es racha de victorias `W`, carmesí si es de derrotas `L`).
     - **Fortaleza Monumental (Local)**: Racha en casa.
     - **En la Carretera (Visitante)**: Racha fuera de casa.
   - Tarjeta desplegable o cuadrícula de **Rachas Activas vs Rivales (H2H)**:
     - Mini cards con logo del rival, estado de la racha actual (`2 W`, `1 L`) y fecha del último choque.

3. **Sección 2: Bateadores en Racha (Seguidillas de Hits y Embasado):**
   - Tarjetas de bateadores con:
     - Foto oficial del jugador (`getPlayerHeadshotUrl`).
     - Número grande de la racha (ej. `8 JUEGOS`).
     - Badge distintivo: `🔥 RACHA DE HIT` o `🎯 EMBASÁNDOSE`.
     - Subtexto con la línea sabermétrica durante la racha: turnos, hits, dobles, jonrones, AVG y OBP.

4. **Sección 3: Bullpen y Abridores Intocables:**
   - Tarjetas de lanzadores con:
     - Foto oficial del pitcher y rol (Cerrador, Setup, Relevo).
     - Racha en apariciones en blanco o innings consecutivos sin anotaciones.
     - Estadísticas del tramo: $IP$, ponches, boletos concedidos y efectividad ($0.00\text{ ERA}$).

5. **Estado Vacío (Empty / Zero-State):**
   - Mensaje sobrio y estilizado en caso de inicio de temporada o pausas de calendario:
     *"No hay rachas activas superiores a 2 juegos en este momento. Las seguidillas se actualizarán al completarse el próximo partido."*

---

### RF04: Integración en `DashboardTabs` (`src/components/dashboard/dashboard-tabs.tsx`)

- Actualizar el orden de pestañas en `DashboardTabs`:
  1. `last-game`: "Último Juego"
  2. `trends`: "Tendencias"
  3. `rachas`: "Rachas" (Badge: "Activas", Icono: `Flame`, Highlight: true)
  4. `leaders`: "Líderes del Equipo"
  5. `leones-stats`: "Leones Stats"
- Permitir que `defaultTab` acepte `"rachas"`.
- Renderizar `<RachasTab data={data.streaks} />` cuando `activeTab === "rachas"`.

---

### RF05: Orquestación de Datos en `src/lib/leones-stats-service.ts` y `src/app/page.tsx`

- En `getDashboardTabsData(season)`:
  - Invocar en paralelo el cálculo de rachas `getStreaksData(season)`.
  - Empaquetarlo en `DashboardTabsData.streaks`.
- Cero consultas lentas: Los datos de juegos y boxscores ya cargados se reutilizan para calcular las rachas de forma determinista y memoizada.

---

## 3. Criterios de Aceptación y Demostración

1. **CA1 (Navegación y Posición 3):** La pestaña "Rachas" aparece visible como la 3.ª pestaña (entre Tendencias y Líderes), con icono `Flame` y badge "Activas". Al hacer clic, conmuta suavemente sin recarga.
2. **CA2 (Cálculo Colectivo):** Muestra con precisión la racha general de Leones (coincidiendo con Standings), el récord local/visita y la racha activa vs los demás equipos de la liga.
3. **CA3 (Cálculo Individual):** Muestra las rachas de bateo ($\ge 2$ juegos con hit o embasándose) y de pitcheo activas con las estadísticas del tramo correctamente calculadas.
4. **CA4 (Responsividad y Estilo):** Probado y validado en móvil (390px), tablet (768px) y escritorio (1280px+). Contraste WCAG AA verificado. Cero AI slop.
5. **CA5 (Estabilidad y Fallback):** No rompe si Supabase devuelve 0 juegos o si la temporada está comenzando.
