# Tareas de Implementación: Emulador de Estadios y Simulador "HR en X/8"

- [x] **Tarea 1**: Crear `src/types/stadiums.ts` con las interfaces de estadio, dimensiones por sector y resultados de simulación "Would It Dong?".
- [x] **Tarea 2**: Crear `src/lib/stadiums-service.ts` con el catálogo completo de los 9 estadios de la LVBP, función radial continua $R_S(\theta)$, generador de polígonos de barda SVG y motor evaluador `evaluateWouldItDong()`.
- [x] **Tarea 3**: Actualizar `src/components/spray/baseball-diamond.tsx` para permitir seleccionar cualquier estadio (o comparar todos), renderizando la barda SVG interactiva con sus cotas de distancia reales y detectando clics en batazos para abrir la tarjeta de simulación.
- [x] **Tarea 4**: Crear `src/components/spray/would-it-dong-card.tsx` con la cuadrícula de los 8 equipos LVBP (logos, estadios, check/cruz, margen de pies), badges de categorización ("No-Doubter", "Mostly Gone", "Wall Scraper", "Unicornio") y toggle 8 vs 9 estadios.
- [x] **Tarea 5**: Crear `src/components/spray/deep-balls-drawer.tsx` con la tabla/lista interactiva de batazos $\ge 300$ pies del bateador seleccionado para exploración rápida.
- [x] **Tarea 6**: Integrar todos los componentes en `src/components/spray/spray-view.tsx` con barra de herramientas de estadios y sincronización de estado.
- [x] **Tarea 7**: Ejecutar `npx tsc --noEmit` y `npm run build` para garantizar cero errores de TypeScript y compilación perfecta.
- [ ] **Tarea 8**: Desplegar a producción vía `git push origin main` y validar en Vercel.
