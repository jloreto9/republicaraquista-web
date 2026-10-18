export interface Station {
  id: string;
  name: string;
  frequency: string;
  network: string;
  streamUrl: string;
  officialUrl: string;
  badge?: string;
  description?: string;
}

export const RADIO_STATIONS: Station[] = [
  {
    id: "lamega",
    name: "La Mega 107.3 FM",
    frequency: "107.3 FM Caracas",
    network: "Circuito Unión Radio",
    streamUrl: "https://acp4.lorini.net:2050/stream",
    officialUrl: "https://unionradio.net/live-mega/",
    badge: "OFICIAL LEONES",
    description: "Transmisión oficial de los Leones del Caracas en la LVBP.",
  },
  {
    id: "exitos",
    name: "Éxitos 99.9 FM",
    frequency: "99.9 FM Caracas",
    network: "Unión Radio",
    streamUrl: "https://acp4.lorini.net:2070/stream",
    officialUrl: "https://mundour.com/",
    badge: "DEPORTES / NOTICIAS",
    description: "Transmisiones deportivas y seguimiento de la LVBP.",
  },
  {
    id: "onda",
    name: "Onda 107.9 FM",
    frequency: "107.9 FM Caracas",
    network: "Unión Radio",
    streamUrl: "https://acp4.lorini.net:2060/stream",
    officialUrl: "https://mundour.com/",
    badge: "CIRCUITO UR",
    description: "Señal matriz del circuito Unión Radio.",
  },
];
