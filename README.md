# CoframeLab

Herramienta interna de compatibilidad entre marcas. Todo vive en local: la única fuente de datos es el SQLite `data/coframe.sqlite`. No hay Excel ni Google Sheet de por medio.

## Pestañas

- **Lab**: elegís hasta 6 marcas y ves la compatibilidad general, la matriz de duplas, el detalle y los atributos de cada dupla, el ranking y las fichas.
- **Base de datos**: tabla tipo Excel con todas las marcas. Se edita cada celda y se suben o cambian los logos.
- **Listas**: todas las opciones de los desplegables con su descripción. Las listas que entran en el cálculo tienen opciones fijas; en las demás se pueden agregar o quitar opciones.
- **Matriz**: qué tan compatibles son dos valores de un mismo atributo (arquetipos, rubros, motivadores, nivel socioeconómico, cliente, alcance, segmento y código cultural). Cada celda va de 0 a 100 y se edita.
- **Ajustes**: cuánto pesa cada atributo en el puntaje total y el bonus por cercanía. La matriz dice qué tan bien combinan dos valores; el peso dice cuánto importa ese atributo.

## Desarrollo local

```bash
npm install
npm run dev
```

`predev` y `prebuild` corren `npm run db:ensure`, que aplica las migraciones pendientes sin tocar tus ediciones. Los CSV de `data/sources/` son solo una semilla de emergencia: se usan únicamente si el SQLite no existe.

```bash
npm run db:backup   # copia de seguridad: data/coframe.backup-AAAA-MM-DD-HHMM.sqlite
npm run db:check    # conteos y campos incompletos
npm test
npm run lint
```

## Publicar

```bash
vercel deploy --prod --yes
```

El SQLite viaja con el deploy. En Vercel la base, las listas y los ajustes son de solo lectura: se editan en local y se vuelve a publicar.

## Dónde está cada cosa

- `lib/brand-engine.js`: el motor de compatibilidad.
- `lib/weights.js`: los pesos por defecto y su normalización.
- `lib/matrices.js`: las matrices iniciales (las reglas que antes estaban fijas en el motor).
- `lib/list-catalog.js`: las listas iniciales con sus descripciones.
- `lib/taxonomies.js`: segmento y código cultural, dos listas que no comparten valores.
- `lib/brands-db.js`: lectura y escritura del SQLite.
- `scripts/db-migrate.mjs`: migraciones (logos, listas, ajustes, matrices).
- `data/sponsors/`: fichas y logos de los sponsors de Polarist Club.
