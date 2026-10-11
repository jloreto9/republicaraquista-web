# Feature Specification: NotiCueva por Gilberto Méndez & Feed de X (@republicaraquista)

**Identificador**: `noticueva-gilberto-mendez-x`  
**Estado**: Especificado  
**Prioridad**: Alta  
**Aplicación**: REPUBLICARAQUISTAPP (Next.js 16 / React 19 / Vercel)  
**Redactor Oficial**: Gilberto Méndez  
**Cuenta de Redes**: `@republicaraquista` en X (Twitter)  
**Clave de Acceso Redactor**: `Leones21.`

---

## 1. Visión y Propósito

Crear un espacio editorial y comunitario dentro de REPUBLICARAQUISTAPP compuesto por dos secciones integradas:
1. **NotiCueva por Gilberto Méndez**: Columna de noticias, análisis, notas de juego y novedades del equipo escritas por Gilberto Méndez, con una interfaz de redacción web ultra-sencilla accesible desde móvil o escritorio sin conocimientos técnicos.
2. **Feed Oficial de X (@republicaraquista)**: Integración en tiempo real de los tuits de la cuenta oficial de República Caraquista adaptado al tema Dark Navy.

---

## 2. Requerimientos de Negocio y Funcionales

### RF1: Sin Categorías
- La NotiCueva no utiliza taxonomías complejas ni selector de categorías. Las notas se publican de forma directa, limpia y cronológica.

### RF2: Identidad y Encabezado
- El encabezado de la sección debe mostrar con prominencia:
  - Título: **NotiCueva**
  - Firma / Crédito de autoría: **por Gilberto Méndez**
  - Acento visual en dorado caraquista (`#FDB827`) sobre fondo Dark Navy (`#070B19`).

### RF3: Panel de Redacción para Gilberto Méndez (`/admin` o `/noticueva/redaccion`)
- Diseñado para usuarios no informáticos:
  - Pantalla de acceso protegida por la contraseña: `Leones21.`
  - Formulario limpio:
    - **Título de la nota** (obligatorio)
    - **Cuerpo de la nota** (texto con saltos de línea automáticos, negritas y enlaces)
    - **Foto de portada opcional** (enlace URL a imagen)
    - Botón de acción: *"Publicar en la NotiCueva"*
  - Gestión: Lista de notas publicadas con opción de eliminar o editar erratas.

### RF4: Vista Pública (`/noticueva`)
- Cuadrícula/Lista de notas publicadas por Gilberto Méndez con:
  - Título, fecha formateada en español (ej. "11 de Octubre, 2026"), autor ("Gilberto Méndez"), foto si existe y texto completo formateado.
  - Columna o sección complementaria con el **Timeline oficial de X (@republicaraquista)** embebido en modo oscuro (`theme=dark`).

### RF5: Persistencia de Datos
- Almacenamiento en tabla Supabase `noticueva_posts` (con fallback a snapshot local inicial de ejemplo mientras se aplica el script SQL en Supabase).
- Contrato de tabla `noticueva_posts`:
  - `id`: string/uuid
  - `title`: text
  - `slug`: text
  - `content`: text
  - `author`: text (default "Gilberto Méndez")
  - `image_url`: text nullable
  - `created_at`: timestamptz
  - `published`: boolean default true

---

## 3. Criterios de Aceptación
1. Gilberto puede entrar a `/admin`, escribir `Leones21.` y publicar una nota en menos de 1 minuto desde su celular.
2. La nota aparece de inmediato en `/noticueva` bajo el título "NotiCueva por Gilberto Méndez".
3. El feed de X muestra los tuits de `@republicaraquista` con estética Dark Navy de la plataforma.
4. El enlace "NotiCueva" está integrado en el Sidebar desktop y MobileNav.
5. `npm run build` compila con éxito en Next.js 16 (Turbopack).
