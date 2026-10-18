# Tareas de Implementación: Roster Semanal Oficial y Coaching Staff (`005-roster-semanal-staff`)

- [x] **Tarea 1: Extracción y Modelado Canónico de Datos (`roster-data.ts`)**
  - Crear `src/data/roster-data.ts` con los 34 peloteros oficiales extraídos del boletín PDF de la LVBP (`Leones_20261013.pdf`), reservas y el cuerpo técnico completo (Lipso Nava, Wilson Álvarez, Heberto Andrade, etc.).

- [x] **Tarea 2: Componentes de KPIs y Métricas de Plantilla (`roster-kpis.tsx`)**
  - Implementar tarjetas de resumen: 34/34 plazas cubiertas, 26 Criollos vs 8 Importados, desglose posicional y porcentaje de brazos derechos vs zurdos.

- [x] **Tarea 3: Pestaña de Roster Semanal Oficial (`weekly-roster-tab.tsx`)**
  - Construir la vista de los 34 habilitados con filtros de posición (`Lanzadores`, `Catchers`, `Infielders`, `Outfielders`), origen (`Criollos`, `Importados`) y buscador de texto.
  - Implementar tarjeta por pelotero y tabla de escritorio con badges de procedencia y nivel (MLB, AAA, etc.).

- [x] **Tarea 4: Pestaña de Coaching Staff (`staff-tab.tsx`)**
  - Crear tarjetas de perfil para los 12 miembros del cuerpo técnico oficial 2026-2027 con número de uniforme, cargo y trayectoria.

- [x] **Tarea 5: Pestaña de Plantel General / Reserva (`extended-roster-tab.tsx`) y Visor PDF (`pdf-viewer-modal.tsx`)**
  - Construir la vista del plantel ampliado con buscador y el visor/descargador integrado del PDF oficial de la LVBP.

- [x] **Tarea 6: Página Principal `/roster` y Enlaces de Navegación**
  - Crear la ruta `src/app/roster/page.tsx` con metadatos SEO.
  - Actualizar `src/components/layout/sidebar.tsx` y `src/components/layout/mobile-nav.tsx` para incluir el acceso a `/roster` ("Roster & Staff").

- [x] **Tarea 7: Validación de Compilación, Pruebas y Despliegue**
  - Ejecutar `npm run build` con Turbopack.
  - Hacer commit y push a `origin main` para desplegar en Vercel.
