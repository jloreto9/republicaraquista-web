# Especificación de Feature 019: Corrección de Ticker Borroso en iOS y Optimización de Safe Areas / Responsive

## 1. Resumen Ejecutivo
Esta especificación define la remediación definitiva de los defectos visuales y de interacción reportados en dispositivos iOS (iPhone 14/15/16 Pro con Dynamic Island o Notch) y desplegados en Vercel:
1. Eliminación del desenfoque (*blur*) del texto y marcadores del `LiveTicker` en Safari Mobile (WebKit).
2. Corrección del Safe Area Inset superior en `MobileNav` y en el Drawer lateral para evitar que la barra de estado y la Dynamic Island oculten la marca, campana y menú hamburguesa.
3. Desacoplamiento del comportamiento pegajoso (*sticky*) de la cabecera interna (`<Header>`) en móviles para optimizar el área de lectura en pantallas pequeñas.
4. Ajuste de elevación del reproductor de radio flotante (`RadioPlayer`) para coordinar con el Safe Area inferior del home indicator sobre la `BottomNav`.

---

## 2. Requerimientos Funcionales

### RF-01: Nitidez Total del LiveTicker en WebKit (iOS Safari)
- El contenedor principal de `LiveTicker` debe abandonar `backdrop-blur-md` y usar fondo sólido opaco `bg-[#070B19]` con borde inferior `border-b border-[#1E2B4D]/80`.
- Aplicar clases de suavizado tipográfico nítido (`antialiased transform-gpu`) para forzar rasterización nativa en pantallas Retina.
- Cada tarjeta de partido debe mantener fondo contrastante sin heredar filtros de desenfoque.

### RF-02: Adaptación de Safe Area Superior en MobileNav y Drawer
- El `<header>` móvil de `MobileNav` debe incorporar `pt-[env(safe-area-inset-top,0px)]` y altura dinámica `h-[calc(3.5rem+env(safe-area-inset-top,0px))]`.
- La cabecera del Drawer lateral (menú deslizable) debe incluir `pt-[calc(1rem+env(safe-area-inset-top,0px))]` para que el botón de cerrar y el título no se superpongan con la Dynamic Island.

### RF-03: Ergonomía de Cabeceras al Desplazar (Scroll) en Móvil
- El componente `<Header>` (que contiene el título de la página y el selector de temporada) debe comportarse como `relative` en pantallas móviles (`< lg`) y `sticky top-0 z-20` en escritorio (`>= lg`).
- En móviles, solo `MobileNav` y `LiveTicker` permanecen anclados en la parte superior.

### RF-04: Separación de RadioPlayer y BottomNav con Safe Area Inferior
- En pantallas móviles, el contenedor flotante de `RadioPlayer` debe posicionarse en `bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))]`.
