# Plan Técnico: Roster Semanal Oficial (Tope 34) y Coaching Staff (`005-roster-semanal-staff`)

## 1. Arquitectura de Archivos y Componentes

```
src/
├── app/
│   └── roster/
│       └── page.tsx                     # Página principal /roster (Metadata, SSR inicial)
├── components/
│   └── roster/
│       ├── roster-view.tsx              # Componente orquestador con navegación de pestañas y búsqueda
│       ├── weekly-roster-tab.tsx        # Tabla y cuadrícula de los 34 habilitados (KPIs, filtros)
│       ├── extended-roster-tab.tsx      # Plantel general y reservas
│       ├── staff-tab.tsx                # Tarjetas de coaching staff (Lipso Nava, Wilson Álvarez, etc.)
│       ├── pdf-viewer-modal.tsx         # Visor embebido y modal de descarga de Leones_20261013.pdf
│       └── roster-kpis.tsx              # Tarjetas métricas (Cupos 34/34, 26 Criollos, 8 Importados)
├── data/
│   └── roster-data.ts                   # Datos estáticos tipados de peloteros y staff oficial
└── components/layout/
    ├── sidebar.tsx                      # Enlace a /roster en menú de escritorio
    └── mobile-nav.tsx                   # Enlace a /roster en drawer móvil
```

---

## 2. Tipado de Datos (`roster-data.ts`)

```typescript
export type PlayerPositionCategory = "pitcher" | "catcher" | "infielder" | "outfielder" | "utility";
export type PlayerOrigin = "criollo" | "importado";

export interface RosterPlayer {
  number: number;
  name: string;
  slug?: string;
  position: string;
  positionCategory: PlayerPositionCategory;
  batsThrows: string; // e.g. "D/D", "Z/Z", "D/A"
  height: string;     // e.g. "1.90 m"
  weight: string;     // e.g. "100 kg"
  age: number;
  birthDate: string;  // e.g. "20-06-1996"
  birthPlace: string;
  level: string;      // e.g. "MLB", "AAA", "AA", "A+", "A", "ROK", "IND. LEAGUE", "OTRO"
  origin: PlayerOrigin;
  headshotUrl?: string;
  isWeeklyActive: boolean; // Si pertenece a los 34 activos de la semana
}

export interface StaffMember {
  number?: number;
  name: string;
  role: string;
  category: "manager" | "coach" | "directiva" | "apoyo";
  photoUrl?: string;
  bio?: string;
}
```

---

## 3. Plan de Implementación de la UI
1. **Header & Context:** Título con escudo de Leones y subtítulo: `Semana 1 · 13–19 OCT 2026 · Tope Oficial LVBP: 34 Plazas`.
2. **Visualización Híbrida (Cards vs Tabla):**
   - En pantallas móviles: tarjetas optimizadas con número en dorado `#FDB827`, foto, origen, posición y nivel.
   - En pantallas desktop: tabla estilizada de alto contraste con columnas ordenables.
3. **Descarga y Previsualización PDF:**
   - Botón directo `Descargar PDF Oficial` enlazando a `/documents/Leones_20261013.pdf`.
   - Embed responsivo en pestaña dedicada con `<iframe>` para lectura rápida.
