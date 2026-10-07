# Checklist de Calidad de Requisitos: Transmisiones de TV y Calendario LVBP 2026-2027

> **Propósito**: Validar la claridad, completitud, consistencia y ausencia de ambigüedades en la especificación para la ingesta de canales de transmisión y sincronización del calendario en la app web y feeds .ics (Google/Apple).

## 1. Completitud de Datos de Transmisión
- [ ] ¿Están mapeados los 56 juegos de Leones del Caracas con su respectivo paquete de televisoras y streaming sin dejar juegos en "Por confirmar"?
- [ ] ¿Se contempla la inclusión o exclusión explícita de señales de streaming universal (`BeisbolPlay` y `LVBP YouTube` de los lunes) frente a los canales lineales de TV (`Televén`, `Venevisión`, `IVC`, `ByM Sport`, `1Baseball`, `Meridiano`)?
- [ ] ¿Está especificado el comportamiento para juegos con 3 o 4 señales simultáneas (ej. `Venevisión, 1Baseball, ByM Sport, BeisbolPlay`) en interfaces con espacio horizontal restringido (celdas móviles)?

## 2. Consistencia Horaria e Impacto de Parrilla TV
- [ ] ¿Se define formalmente si los horarios modificados por las televisoras (ej. traslados a 1:00 PM, 6:00 PM u 8:00 PM) sustituyen los horarios preliminares en `calendar_2026_27.json`, `lvbp_full_calendar_2026_27.json` y `generar_calendario_leones.py`?
- [ ] ¿Existe paridad estricta entre la hora indicada en el objeto de evento (`timeDisplay`) y la marca temporal de inicio en el feed `.ics` (`DTSTART`)?

## 3. Formato y Presentación Visual (UI/UX)
- [ ] ¿Se especifica la jerarquía visual del badge de transmisión dentro de la tarjeta de día (`CalendarDayCard`) para evitar truncamiento excesivo en pantallas pequeñas?
- [ ] ¿El modal de detalle (`CalendarEventModal`) presenta la lista completa de canales con formato legible y amigable (separación por badges o lista delimitada)?
- [ ] ¿Se preserva la convención cromática canónica (Blanco para Casa, Dorado `#FDB827` para Visita) al incorporar los badges de transmisión?

## 4. Sincronización y Distribución Multiplataforma (.ics, Google, iOS)
- [ ] ¿Se actualiza el generador canónico en `Calendario Republica Caraquista/generar_calendario_leones.py` para inyectar la transmisión en la propiedad `DESCRIPTION` y `SUMMARY` de cada `VEVENT`?
- [ ] ¿Se regenera y versiona el archivo `calendario_republica_caraquista.ics` para su publicación en el repositorio remoto de GitHub?
- [ ] ¿Se valida que el feed `webcal://` y la URL pública `raw.githubusercontent.com` expongan la nueva información sin errores de sintaxis iCalendar (RFC 5545)?
