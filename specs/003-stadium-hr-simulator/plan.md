# Plan Técnico de Arquitectura: Emulador de Estadios y Simulador "HR en X/8"

## 1. Módulos y Archivos Involucrados

| Archivo | Responsabilidad | Tipo de Cambio |
|---|---|---|
| `src/types/stadiums.ts` | Definición de tipos: `LVBPStadium`, `StadiumDimension`, `WouldItDongResult`, `StadiumCheck` | **Nuevo Archivo** |
| `src/lib/stadiums-service.ts` | Base de datos de los 9 estadios, función radial $R_S(\theta)$, generador de polígonos SVG y motor "Would It Dong?" | **Nuevo Archivo** |
| `src/components/spray/baseball-diamond.tsx` | Renderizado dinámico de la barda según el estadio seleccionado, superposición comparativa y eventos de selección | **Modificación** |
| `src/components/spray/would-it-dong-card.tsx` | Tarjeta interactiva del batazo con cuadrícula de los 8 equipos LVBP, insignias y comparativa | **Nuevo Archivo** |
| `src/components/spray/deep-balls-drawer.tsx` | Panel interactivo colapsable con la lista de batazos profundos ($\ge 300$ ft) del bateador | **Nuevo Archivo** |
| `src/components/spray/spray-view.tsx` | Orquestación de estado: estadio seleccionado, batazo enfocado y toggle 8 vs 9 estadios | **Modificación** |

---

## 2. Modelado Matemático de la Barda del Estadio

El cálculo radial se implementa de manera pura en TypeScript sin dependencias pesadas:
```typescript
export function getStadiumFenceDistance(stadium: LVBPStadium, angleDeg: number): number {
  // Clamping a zona fair: -45° (LF) a +45° (RF)
  const angle = Math.max(-45, Math.min(45, angleDeg));
  
  if (angle <= -22.5) {
    // Interpolar entre LF y LCF
    const t = (angle - (-45)) / 22.5;
    return stadium.lf + t * (stadium.lcf - stadium.lf);
  } else if (angle <= 0) {
    // Interpolar entre LCF y CF
    const t = (angle - (-22.5)) / 22.5;
    return stadium.lcf + t * (stadium.cf - stadium.lcf);
  } else if (angle <= 22.5) {
    // Interpolar entre CF y RCF
    const t = angle / 22.5;
    return stadium.cf + t * (stadium.rcf - stadium.cf);
  } else {
    // Interpolar entre RCF y RF
    const t = (angle - 22.5) / 22.5;
    return stadium.rcf + t * (stadium.rf - stadium.rcf);
  }
}
```

---

## 3. Estructura de Datos de los 9 Estadios

Se centralizan en `src/lib/stadiums-service.ts` con sus logos oficiales de equipo (usando las URLs oficiales de `LVBP_TEAMS` ya configuradas en el proyecto), colores distintivos, dimensiones y capacidad.

---

## 4. Estado Reactivo en `SprayView`

- `selectedStadiumId`: string (`"monumental"` por defecto, o `"all"`, `"valencia"`, `"maracay"`, etc.).
- `activeDeepBall`: `BattedBall | null` (batazo seleccionado para inspeccionar su Would It Dong).
- `stadiumMode`: `"8-teams"` | `"9-stadiums"` (por defecto `"8-teams"`).
- `showDeepBallsList`: boolean (toggle para el drawer de batazos profundos).

---

## 5. Pruebas y Criterio de Éxito
- Verificación geométrica:
  - En ángulo $0^\circ$ (CF), Monumental debe retornar $403$ ft, Maracay $380$ ft, Universitario $407$ ft.
  - En ángulo $-45^\circ$ (LF), Puerto La Cruz debe retornar $325$ ft, Valencia $347$ ft.
- Verificación sabermétrica:
  - Un flyout al CF de 385 ft en Universitario ($407$ ft) debe marcarse como Home Run en Maracay ($380$ ft), Puerto La Cruz ($380$ ft) y Valencia ($385$ ft).
- Build limpio con Next.js y Turbopack (`npm run build`).
