# Plan Técnico de Arquitectura: Circuito Radial en Vivo (`004-circuito-radial-leones`)

## 1. Arquitectura y Árbol de Componentes

Para asegurar cero parpadeos y que el audio permanezca activo sin importar las transiciones de página, estructuramos la solución con React Context y un componente aislado montado en el layout raíz:

```
src/
├── context/
│   └── radio-context.tsx          # Estado global: estación, isPlaying, volume, isMuted, isExpanded, status
├── components/
│   └── radio/
│       ├── radio-player.tsx       # Componente orquestador persistente (Minimizado / Expandido)
│       ├── radio-wave.tsx         # Animación CSS del ecualizador de ondas (3 barras dinámicas)
│       └── radio-stations.ts      # Catálogo tipado de emisoras (La Mega, Éxitos, Onda)
└── app/
    └── layout.tsx                 # Montaje de <RadioProvider> y <RadioPlayer />
```

---

## 2. Definición del Estado Global (`RadioContext`)

```typescript
export interface Station {
  id: string;
  name: string;
  frequency: string;
  network: string;
  streamUrl: string;
  officialUrl: string;
  badge?: string;
}

export type RadioStatus = "idle" | "buffering" | "playing" | "error";

export interface RadioContextType {
  currentStation: Station;
  setStation: (station: Station) => void;
  isPlaying: boolean;
  togglePlay: () => void;
  status: RadioStatus;
  volume: number;
  setVolume: (vol: number) => void;
  isMuted: boolean;
  toggleMute: () => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
}
```

---

## 3. Catálogo de Estaciones (`radio-stations.ts`)

```typescript
export const RADIO_STATIONS: Station[] = [
  {
    id: "lamega",
    name: "La Mega 107.3 FM",
    frequency: "107.3 FM Caracas",
    network: "Circuito Unión Radio",
    streamUrl: "https://acp4.lorini.net:2050/stream",
    officialUrl: "https://unionradio.net/live-mega/",
    badge: "OFICIAL LEONES",
  },
  {
    id: "exitos",
    name: "Éxitos 99.9 FM",
    frequency: "99.9 FM Caracas",
    network: "Unión Radio",
    streamUrl: "https://acp4.lorini.net:2070/stream",
    officialUrl: "https://mundour.com/",
    badge: "DEPORTES",
  },
  {
    id: "onda",
    name: "Onda 107.9 FM",
    frequency: "107.9 FM Caracas",
    network: "Unión Radio",
    streamUrl: "https://acp4.lorini.net:2060/stream",
    officialUrl: "https://mundour.com/",
  },
];
```

---

## 4. Estrategia de Manejo de Audio y Reconexión
1. **Instancia de Audio:** Un único elemento `<audio ref={audioRef} preload="none" />` renderizado en `RadioPlayer`.
2. **Reanudación y Caché de Red:** Al cambiar de emisora o pulsar Play tras una pausa prolongada en streams Icecast en vivo, se reinicia la fuente (`audio.src = station.streamUrl + '?t=' + Date.now()`) para garantizar que el oyente reciba el audio en tiempo real y no un fragmento desfasado en caché.
3. **Manejo de Errores y Timeouts:** Si ocurre un evento `error` o `stalled`, se transiciona al estado `"error"` y se ofrece un botón de reintento inmediato sin colapsar la aplicación.

---

## 5. Diseño Visual y Comportamiento Responsive
* **Colores y Contrastes:**
  - Fondo: `#0D152B` con borde `#1E2B4D` y realces en dorado `#FDB827`.
  - Animación de ondas: barras con `bg-[#FDB827]` escalando verticalmente con `transform: scaleY`.
* **Posicionamiento Z-Index:**
  - Mini-player: `z-40` para flotar por encima del contenido y justo arriba de la barra de navegación móvil (`bottom-20` en móvil, `bottom-6` en desktop).
  - Expanded modal: `z-50` centrado o flotante con backdrop difuminado.
