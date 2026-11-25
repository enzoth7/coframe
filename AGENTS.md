<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Reglas de interfaz de CoframeLab

- **Prohibido usar `<span>`** en la interfaz. Para texto en línea usar `<strong>`, `<b>`, `<em>`, `<small>`, `<label>`, `<time>` o `<div>` con su clase.
- **Prohibido usar `<p>`** en la interfaz. Los textos van en `<div>`, títulos (`<h1>`–`<h4>`), listas o `<dl>`.
- **Prohibido el eyebrow** (etiqueta chica arriba de un título, tipo "SECCIÓN" o "NUEVO"). El título va solo.
- Estilo: panel negro a la izquierda, fondo blanco, texto negro y azul `#2563eb` solo para lo activo. El color de estado (verde, amarillo, naranja, rojo) se usa únicamente para puntajes de compatibilidad.
- El nombre del producto es **CoframeLab**.
