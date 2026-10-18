# REPUBLICARAQUISTAPP 🦁⚾

> **Plataforma Web y Progressive Web App (PWA) Sabermétrica de Alto Rendimiento para la Liga Venezolana de Béisbol Profesional (LVBP), con enfoque analítico en los Leones del Caracas.**

[![Production](https://img.shields.io/badge/Production-Live_PWA-FDB827.svg?style=for-the-badge&logo=vercel&logoColor=black)](https://republicaraquistapp.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-16.3.6_Turbopack-000000.svg?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-20232A.svg?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_RLS-3ECF8E.svg?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

---

## 🌟 Visión Arquitectónica

**REPUBLICARAQUISTAPP** implementa una arquitectura nativa de borde (Edge-first) con renderizado híbrido reactivo, garantizando tiempos de respuesta ultrarrápidos (TTFB < 50ms) y sincronización relacional en tiempo real con Supabase.

```mermaid
flowchart TD
    subgraph Edge_Frontend [Vercel Edge Network - Next.js 16 / React 19]
        PWA[PWA Manifest & Service Worker]
        RSC[React Server Components]
        ISR[Incremental Static Regeneration - 5m TTL]
        Canvas[Canvas HTML5 HD 300 DPI Export]
    end

    subgraph Persistence_Layer [Capa de Persistencia & Seguridad]
        Supabase[(Supabase PostgreSQL)]
        RLS[Row Level Security & Anti-Delete Protection]
        AdminAuth[Panel NotiCueva Auth]
    end

    subgraph Data_Pipeline [Ingesta Automatizada & MLB Stats API]
        Cron[GitHub Actions Batch ETL - 06:00 UTC]
        MLBAPI[MLB Stats API - sportId:17 / leagueId:135]
        CDN[CDN Canónico MLB Headshots & Logos]
    end

    Edge_Frontend -->|Consultas tipadas ISR / Cache| Supabase
    Data_Pipeline -->|Upserts diarios de Boxscores & Juegos| Supabase
    Edge_Frontend -->|Fotos oficiales y escudos| CDN
```

- **Frontend en Vercel:** Next.js 16.3.6 (Turbopack) con React 19, Tailwind CSS v4, temas Dark Navy (`#070B19`), Tarjetas Glassmorphism (`#0D152B`) y acentos oficiales Dorado Caraquista (`#FDB827`).
- **PWA Instalable:** Experiencia nativa en móviles y tablets (iOS / Android) con manifest completo, iconos HD y diseño responsivo.
- **Audio Streaming en Vivo:** Circuito radial integrado con streaming en directo de La Mega 107.3 FM (Unión Radio) para escuchar los juegos de Leones del Caracas sin interrumpir la navegación.
- **Herramientas de Comunidad:** Botón de compartir nativo multicanal (WhatsApp, X, Telegram, portapapeles) en cabecera global, barra móvil y Game Center.
- **Persistencia & Seguridad (RLS):** Supabase PostgreSQL blindado con Row Level Security (RLS) activo en todas las tablas, prevención estricta de borrado (`DELETE`) contra accesos no autorizados y proxy server-side.
- **CDN Canónico de Fotos:** Headshots oficiales de peloteros servidos en alta resolución desde el CDN de MLB (`img.mlbstatic.com`) y TuJonrón con siluetas oficiales de fallback.

---

## ⚾ Suite Completa de Vistas Sabermétricas & Módulos en Vivo

| Ruta | Módulo | Descripción y Capacidades Sabermétricas |
| :--- | :--- | :--- |
| `/` | **Centro de Mando** | Scoreboard cara a cara en vivo, series particulares, desglose canónico Día (< 18:00 VET) y Noche (≥ 18:00 VET), Semanas ISO. Pestaña activa por defecto **"Último Juego"** con marcador detallado y MVP de Leones (Tango RE24), Tendencias U10J, Líderes del Equipo y Leones Stats. |
| `/game-center` | **Game Center (En Vivo)** | **Segunda pantalla oficial en vivo de Leones del Caracas**: diamante interactivo con corredores en base, conteo dinámico B-S-O, duelo actual lanzador vs bateador, linescore R-H-E por entradas, play-by-play en tiempo real, selector de partidos y botón directo de compartir en WhatsApp y redes. |
| `/roster` | **Roster Oficial & Coaching Staff** | Nómina semanal oficial de 34 jugadores activos autorizada por la LVBP, clasificada por rol (Lanzadores, Receptores, Infielders, Jardineros) con fotos oficiales transparentes, datos biográficos, más el cuerpo técnico completo liderado por José Alguacil, filtros por posición y buscador por nombre/número. |
| `/standings` | **Posiciones & ELO** | Tabla de clasificación oficial, Expectativa Pitagórica ($xW/xL$ con exponente 1.83), ratings ELO dinámicos y simulador Monte Carlo (5,000 iteraciones) de clasificación a Round Robin y Serie Final. |
| `/calendario` | **Calendario Oficial LVBP 2026-2027** | Cuadrícula interactiva mensual (Octubre, Noviembre, Diciembre), diferenciación cromática de local (blanco) y visitante (dorado `#FDB827`), sincronización con Google Calendar y Apple Calendar (`webcal://`), badges y logotipos de televisoras y streaming (Televen, Venevisión, IVC, ByM Sport, 1Baseball, SimpleTV, YouTube). |
| `/probabilidades` | **Líneas & Probabilidades (Tipster Hub)** | Proyecciones de partidos (ELO dinámico + delta FIP abridores + bullpen + factores de parque LVBP + Poisson/Skellam), cálculo de Cuotas Justas (Fair Odds), comparador de 4 casas de apuestas de Venezuela (**JuegaEnLínea**, **Betcris**, **SellaTuParley**, **Apuestas Royal**), detector de **Mejor Cuota** y **Cuotas Desfasadas ($EV \ge 12\%$)**, gestión de bankroll con **Quarter-Kelly** y exportador Canvas HTML5 de tarjetas de picks en formato dual HD (Cuadrado 1:1 a 2400x2400 y Vertical 9:16 a 1080x1920 a 300 DPI). |
| `/individuales` | **Líderes Individuales & Fildeo** | Tablas ordenables de bateo y pitcheo tradicional y avanzado (AVG, OBP, SLG, OPS, ISO, BABIP, wOBA, wRC+, ERA, WHIP, FIP, K/9, BB/9, K/BB, IP, SV), pestaña de Fildeo/Defensa (PO, A, E, TC, FPCT, DP, CS, SB) y enlaces directos a perfiles. |
| `/matchup` | **Matchup 360** | Comparador Head-to-Head con radar polar de 8 ejes sabermétricos, desglose por categorías (Ofensiva, Volumen, Corrido y Defensa), veredicto algorítmico y exportación de tarjeta descargable en PNG. |
| `/colectivas` | **Estadísticas Colectivas** | Rendimiento comparativo de bateo, pitcheo y fildeo entre los 8 equipos de la LVBP con gráficos horizontales interactivos en Recharts. |
| `/bullpen` | **Bullpen & Lineups** | Efectividad de relevistas, control de corredores heredados ($IR$, $IRS$, $IRS\%$), retención de ventajas y alineaciones titulares 1 al 9. |
| `/wpa` | **Win Expectancy & WPA** | Curvas interactivas de probabilidad de victoria por encuentro, matriz Tango RE24 de 24 estados, Leverage Index (LI), jugadas de mayor impacto (Clutch) y acumulados de temporada. |
| `/situacional` | **Splits Situacionales & LOB** | Rendimiento con corredores en posición anotadora (RISP), bases llenas, platoon LHP/RHP, matriz BvP y **Tracker de Dejados en Base (LOB)** con desglose de 3er out y RISP LOB. |
| `/spray-charts` | **Spray Charts & Strike Zone** | Gráficos espaciales de batazos sobre diamante con modelo determinístico de dureza BIS (Hard, Medium, Soft) y mapas de calor 3x3 de disciplina en el plato (O-Swing%, Z-Contact%, SwStr%, CSW%). Prohibición estricta de Statcast en LVBP. |
| `/pitching` | **Pitching Summary & Telemetría** | Buscador universal de lanzadores (MLB/MiLB y Leones del Caracas). Conmutador Salida Individual vs Temporada Completa. Rama MLB (Statcast Hawk-Eye: IVB, HB, Whiff%, Zone%) vs Rama Caracas (Play-by-Play Tango RE24: destinos, carga por entrada y splits LHB/RHB). Exportación de tarjeta oficial cuadrada (2400x2400 px a 300 DPI) estilo Thomas Nestico (@TJStats). |
| `/noticueva` | **NotiCueva por Gilberto Méndez** | Espacio editorial oficial con crónicas de la cueva melenuda, feed oficial de X (@RepubCaraquista), y panel de redacción protegido (`/admin`) con barra de formato enriquecido, vista previa en tiempo real y persistencia relacional en Supabase. |
| *Global* | **Circuito Radial en Vivo (Sticky Player)** | Reproductor flotante persistente con la señal oficial en directo de **La Mega 107.3 FM / Unión Radio** para sintonizar las transmisiones de los Leones del Caracas sin interrumpir la navegación. |
| *Global* | **Compartir en WhatsApp & Redes** | Botón interactivo presente en la cabecera, barra móvil y Game Center para compartir marcadores, enlaces y análisis en WhatsApp, X, Telegram o Web Share API. |

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Versión |
| :--- | :--- | :--- |
| **Framework Web** | Next.js (App Router, Turbopack) | `16.3.6` |
| **Librería UI** | React / React DOM | `19.2.8` |
| **Lenguaje** | TypeScript | `5.x` |
| **Estilos** | Tailwind CSS v4, Lucide React, Glassmorphism | `^4.0.0` |
| **Visualización** | Recharts, SVG, Canvas HTML5 nativo | `^3.10.1` |
| **Base de Datos** | Supabase PostgreSQL con Row Level Security (RLS) | `@supabase/supabase-js ^2.117.1` |
| **Despliegue** | Vercel Edge Network (Edge Runtime / ISR) | Producción Continua |

---

## 🔒 Seguridad y Row Level Security (RLS)

La base de datos en Supabase opera bajo estrictas políticas de **Row Level Security**:
- **Lectura Pública:** Consultas anónimas autorizadas para tablas de estadísticas (`teams`, `games`, `players`, `batting_stats`, `pitching_stats`, `noticueva_posts`).
- **Protección contra Borrado:** Las llamadas anónimas tienen **prohibido el borrado (`DELETE`)** en todas las tablas de datos deportivos.
- **Ingesta Segura:** Políticas dedicadas de `INSERT` y `UPDATE` permiten la actualización continua de marcadores desde los pipelines diarios sin exponer el control de las tablas.
- **NotiCueva Admin:** Panel protegido por contraseña en servidor con validación segura de publicaciones.
- **Repositorios Privados:** Código y configuraciones aseguradas en GitHub (`private: true`).

---

## 📦 Instalación y Desarrollo Local

### 1. Clonar el repositorio
```bash
git clone git@github.com:jloreto9/republicaraquista-web.git
cd republicaraquista-web
```

### 2. Configurar variables de entorno
Crea tu archivo `.env.local`:
```ini
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-de-supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu-anon-key-de-supabase
NOTICUEVA_ADMIN_PASSWORD=tu-contraseña-segura
```

### 3. Instalar dependencias
```bash
npm install
```

### 4. Iniciar servidor de desarrollo
```bash
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### 5. Compilar para producción
```bash
npm run build
```

---

## 🚢 Despliegue en Producción (Vercel)

El proyecto está configurado para integración continua en Vercel:
1. Cada `push` a la rama `main` dispara automáticamente la compilación optimizada con Turbopack.
2. Despliegue activo en: **[https://republicaraquistapp.vercel.app/](https://republicaraquistapp.vercel.app/)**

---

## ⚖️ Créditos y Licencia

- **Diseño, Desarrollo y Modelos Sabermétricos:** **Jorge Leonardo Loreto** ([@JorgeLoreto](https://x.com/JorgeLoreto)) • [@RepubCaraquista](https://x.com/RepubCaraquista)
- **Crónicas de NotiCueva:** **Gilberto Méndez** ([@GilbertoMendez](https://x.com/GilbertoMendez))
- **Diseño de Tarjetas de Pitcheo:** Inspirado en Thomas Nestico (@TJStats)
- **Datos Oficiales:** Consumidos desde MLB Stats API (`sportId=17`, `leagueId=135`)
- **Licencia:** Propietaria • Todos los derechos reservados © República Caraquista
