"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BANDS, bandFor } from "@/lib/bands";

const MAX_SLOTS = 6;
const FIELD_LABELS = {
  category: "Rubro", location: "Ubicación", scope: "Alcance", clientType: "Cliente", ages: "Edades",
  nse: "NSE", personality: "Arquetipo", values: "Valores", motivators: "Motivadores", tone: "Tono", objective: "Objetivo",
};
const SCOPE_LABELS = { Local: "Local", Nacional: "Nacional", Multinacional: "Internacional" };
const CLIENT_LABELS = { B2C: "Personas", B2B: "Empresas", "B2B, B2C": "Personas y empresas" };

const pairKey = (first, second) => [first, second].sort().join("__");
const normalize = (value = "") => String(value).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Logo({ item, size = "md" }) {
  return (
    <div className={`lab-logo lab-logo-${size}`} title={item.name}>
      {item.logo
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={item.logo} alt={item.name} />
        : <b aria-hidden="true">{item.name.slice(0, 1)}</b>}
    </div>
  );
}

function Score({ value, size = "md" }) {
  return <strong className={`lab-score lab-score-${size} band-${bandFor(value).key}`}>{value}</strong>;
}

function formatValue(key, value) {
  if (Array.isArray(value)) return value.join(", ");
  if (key === "scope") return SCOPE_LABELS[value] || value;
  if (key === "clientType") return CLIENT_LABELS[value] || value;
  return value || "—";
}

// Un espacio para elegir marca: buscador sobre toda la base.
function BrandSlot({ index, value, options, taken, onPick, onClear }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef(null);
  const current = options.find((option) => option.id === value) || null;

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const results = useMemo(() => {
    const term = normalize(query.trim());
    const list = term ? options.filter((option) => normalize(`${option.name} ${option.city} ${option.category}`).includes(term)) : options;
    return [...list].sort((a, b) => Number(b.isSponsor) - Number(a.isSponsor) || a.name.localeCompare(b.name, "es")).slice(0, 80);
  }, [options, query]);

  const pick = (id) => { onPick(index, id); setOpen(false); setQuery(""); };

  return (
    <div className={`slot${current ? " is-filled" : ""}`} ref={root}>
      <button type="button" className="slot-button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((state) => !state)}>
        {current ? (
          <>
            <Logo item={current} size="slot" />
            <div className="slot-name">
              <strong>{current.name}</strong>
              <small>{current.city}</small>
            </div>
          </>
        ) : (
          <div className="slot-empty"><b aria-hidden="true">+</b> Marca {index + 1}</div>
        )}
      </button>
      {current && (
        <button type="button" className="slot-clear" onClick={() => onClear(index)} aria-label={`Quitar ${current.name}`}>×</button>
      )}
      {open && (
        <div className="slot-popover">
          <input
            autoFocus
            type="search"
            aria-label="Buscar marca"
            placeholder="Buscar marca o ciudad…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
              if (event.key === "Enter") {
                const first = results.find((option) => !taken.has(option.id) || option.id === value);
                if (first) pick(first.id);
              }
            }}
          />
          <ul role="listbox" aria-label={`Marca ${index + 1}`}>
            {results.map((option) => {
              const disabled = taken.has(option.id) && option.id !== value;
              return (
                <li key={option.id}>
                  <button type="button" role="option" aria-selected={option.id === value} disabled={disabled} onClick={() => pick(option.id)}>
                    <Logo item={option} size="sm" />
                    <div className="slot-option">
                      <strong>{option.name}</strong>
                      <small>{option.category} · {option.city}{option.isSponsor ? " · Sponsor" : ""}</small>
                    </div>
                  </button>
                </li>
              );
            })}
            {!results.length && <li className="slot-none">Ninguna marca coincide.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

function Slots({ lab, pending, onChange }) {
  const [slots, setSlots] = useState(() => Array.from({ length: MAX_SLOTS }, (_, index) => lab.selectedIds[index] || null));
  const taken = new Set(slots.filter(Boolean));
  const update = (next) => { setSlots(next); onChange(next.filter(Boolean)); };
  return (
    <section className={`slots${pending ? " is-pending" : ""}`} aria-label="Marcas a comparar">
      {slots.map((value, index) => (
        <BrandSlot
          key={index}
          index={index}
          value={value}
          options={lab.options}
          taken={taken}
          onPick={(position, id) => update(slots.map((item, i) => (i === position ? id : item)))}
          onClear={(position) => update(slots.map((item, i) => (i === position ? null : item)))}
        />
      ))}
    </section>
  );
}

function Overview({ lab, byId }) {
  const overall = bandFor(lab.summary.average);
  const counts = BANDS.map((band) => ({ ...band, count: lab.pairs.filter((pair) => bandFor(pair.score).key === band.key).length }));
  const { best, worst } = lab.summary;
  return (
    <section className="lab-overview" aria-labelledby="overview-title">
      <div className="lab-stats">
        <div className="lab-stat lab-stat-main">
          <h2 id="overview-title">Compatibilidad general</h2>
          <strong className={`lab-stat-value band-text-${overall.key}`}>{lab.summary.average}</strong>
          <strong className={`lab-pill band-${overall.key}`}>{overall.label}</strong>
        </div>
        <div className="lab-stat">
          <h3>Duplas en alta</h3>
          <strong className="lab-stat-value">{counts[0].count}<small> de {lab.pairs.length}</small></strong>
        </div>
        <div className="lab-stat">
          <h3>Mejor dupla</h3>
          <div className="lab-stat-pair">{byId[best.a].name} × {byId[best.b].name} <Score value={best.score} size="sm" /></div>
        </div>
        <div className="lab-stat">
          <h3>Dupla más floja</h3>
          <div className="lab-stat-pair">{byId[worst.a].name} × {byId[worst.b].name} <Score value={worst.score} size="sm" /></div>
        </div>
      </div>

      <div className="lab-distribution" role="img" aria-label={counts.map((band) => `${band.label}: ${band.count}`).join(", ")}>
        {counts.filter((band) => band.count).map((band) => (
          <i key={band.key} className={`band-fill-${band.key}`} style={{ flexGrow: band.count }} />
        ))}
      </div>

      <ul className="lab-legend">
        {counts.map((band) => (
          <li key={band.key}>
            <i className={`lab-dot band-fill-${band.key}`} aria-hidden="true" />
            <b>{band.label}</b>
            <small>{band.range} · {band.count} {band.count === 1 ? "dupla" : "duplas"}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4.5" />
      <circle cx="12" cy="17.2" r="0.6" fill="currentColor" />
    </svg>
  );
}

// Qué marca desentona: gráfico de puntos. Cada marca es un punto según su compatibilidad promedio
// con el resto; la línea vertical es la compatibilidad general del grupo. Puntos (no barras) porque
// las diferencias son chicas y una barra con el eje cortado engaña.
function Dissonance({ lab, byId }) {
  const rows = lab.dissonance;
  if (!rows.length) return null;
  const min = Math.min(50, Math.floor(Math.min(...rows.map((row) => row.average)) / 10) * 10);
  const position = (value) => `${((value - min) / (100 - min)) * 100}%`;
  const ticks = [];
  for (let value = min; value <= 100; value += 10) ticks.push(value);
  const delta = (value) => `${value > 0 ? "+" : ""}${String(value).replace(".", ",")}`;
  return (
    <section className="lab-block lab-dissonance" aria-labelledby="dissonance-title">
      <h2 className="lab-block-title" id="dissonance-title">Qué marca desentona</h2>
      <div className="dis-chart">
        <div className="dis-axis" aria-hidden="true">
          <div />
          <div className="dis-scale">
            {ticks.map((tick) => <small key={tick} style={{ left: position(tick) }}>{tick}</small>)}
          </div>
          <div />
        </div>
        <ol className="dis-rows">
          {rows.map((row, index) => {
            const item = byId[row.id];
            const band = bandFor(row.average);
            return (
              <li key={row.id} className={index === 0 ? "is-odd" : undefined}>
                <div className="dis-name"><Logo item={item} size="sm" /><strong>{item.name}</strong></div>
                <div className="dis-track">
                  {ticks.map((tick) => <i key={tick} className="dis-grid" style={{ left: position(tick) }} aria-hidden="true" />)}
                  <i className="dis-mean" style={{ left: position(lab.summary.average) }} aria-hidden="true" />
                  <b
                    className={`dis-dot band-fill-${band.key}`}
                    style={{ left: position(row.average) }}
                    tabIndex={0}
                    aria-label={`${item.name}: ${row.average} de promedio con el resto`}
                  >
                    <small className="dis-tip" role="tooltip">
                      {item.name}: {row.average} de promedio ({band.label.toLowerCase()}). Peor dupla: {row.worst ? `${byId[row.worst.id].name} (${row.worst.score})` : "—"}.
                    </small>
                  </b>
                  <small className="dis-value" style={{ left: position(row.average) }}>{row.average}</small>
                </div>
                <div className="dis-side">
                  <small>Sin ella: <b>{row.without ?? "—"}</b> ({row.delta == null ? "—" : delta(row.delta)})</small>
                  <small>{row.alerts ? `${row.alerts} ${row.alerts === 1 ? "alerta" : "alertas"}` : "Sin alertas"}</small>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="dis-key">
          <i className="dis-mean-key" aria-hidden="true" /> Compatibilidad general del grupo ({lab.summary.average}). Cada punto es el promedio de una marca con las demás.
        </div>
      </div>
    </section>
  );
}

function Matrix({ candidates, byKey, selected, onSelect }) {
  return (
    <div className="lab-matrix-wrap">
      <table className="lab-matrix">
        <caption className="sr-only">Compatibilidad entre las marcas elegidas. Elegí una celda para ver el detalle.</caption>
        <thead>
          <tr>
            <td />
            {candidates.map((item) => <th scope="col" key={item.id}><Logo item={item} size="sm" /></th>)}
          </tr>
        </thead>
        <tbody>
          {candidates.map((row) => (
            <tr key={row.id}>
              <th scope="row"><Logo item={row} size="sm" /></th>
              {candidates.map((col) => {
                if (row.id === col.id) return <td key={col.id} className="lab-cell-self" aria-label={`${row.name} consigo misma`} />;
                const pair = byKey[pairKey(row.id, col.id)];
                const isSelected = selected === pair.key;
                return (
                  <td key={col.id}>
                    <button
                      type="button"
                      className={`lab-cell band-${bandFor(pair.score).key}${isSelected ? " is-selected" : ""}`}
                      aria-pressed={isSelected}
                      aria-label={`${row.name} y ${col.name}: ${pair.score}`}
                      onClick={() => onSelect([row.id, col.id])}
                    >
                      {pair.score}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Atributos lado a lado de la dupla elegida. Las filas donde coinciden se marcan.
const COMPARE_ROWS = [
  ["Arquetipo", (item) => item.archetype.primary, "El arquetipo principal de la marca (uno de los 12 de Jung): cómo se comporta y qué le promete a su público. Suele ser lo que más pesa en la compatibilidad (ver Ajustes)."],
  ["Arquetipo secundario", (item) => item.archetype.secondary, "El segundo arquetipo más fuerte. Matiza la personalidad principal y también cuenta al medir afinidad."],
  ["Rubro", (item) => item.profile.category, "La categoría del negocio. Dos rubros complementarios (por ejemplo Alimentos y Bebidas) suman más que dos del mismo rubro."],
  ["Subrubro", (item) => item.subcategory, "Qué vende concretamente la marca dentro de su rubro. Es informativo: no entra en el puntaje."],
  ["Ciudad", (item) => item.city, "Dónde opera la marca. Dos marcas de la misma ciudad suman puntos extra de cercanía (se ajusta en Ajustes)."],
  ["Tamaño", (item) => item.scale, "Calculado automáticamente con los seguidores de Instagram y la facturación: Micro, Pequeña, Mediana, Grande o Muy grande. Si la diferencia es de 3 escalones o más, aparece la alerta de escala despareja."],
  ["Seguidores en IG", (item) => item.brand.followersBucket, "Rango de seguidores de la cuenta principal de Instagram, tal como está cargado en la Base de datos."],
  ["Facturación USD", (item) => item.brand.revenueRange, "Facturación anual aproximada, tal como está cargada en la Base de datos."],
  ["Alcance", (item) => formatValue("scope", item.profile.scope), "Hasta dónde llega la marca: local (una ciudad), nacional o internacional."],
  ["Cliente", (item) => formatValue("clientType", item.profile.clientType), "A quién le vende: a personas (B2C), a empresas (B2B) o a ambos."],
  ["Nivel socioeconómico", (item) => item.profile.nse, "El poder adquisitivo principal de su público, de Bajo a Élite. Cuanto más cerca, más compatibles."],
  ["Edades", (item) => item.profile.ages, "Los rangos de edad de su público. Compartir edades suma compatibilidad."],
  ["Valores", (item) => item.profile.values, "Los valores que defiende la marca según Schwartz. Vecinos en el círculo se refuerzan; opuestos (por ejemplo Poder y Universalismo) chocan."],
  ["Motivadores", (item) => item.profile.motivators, "Lo que mueve a su público a elegirla: seguridad, pertenencia, estatus, placer, libertad, familia, etc."],
  ["Código cultural", (item) => item.traits.culturalCode, "Describe a la marca, no al cliente: qué significado cultural activa y con qué símbolos y valores conecta (tradición, lujo silencioso, calle, progreso, etc.)."],
  ["Segmento", (item) => item.traits.segment, "Describe al cliente, no a la marca: a quién le vende según qué busca ese consumidor y con qué recursos (innovador, aspiracional, experiencial, racional, sensible al precio, etc.)."],
  ["Estilo de cliente", (item) => item.traits.customerStyle, "El perfil de comportamiento del cliente (modelo DISC): Dominancia, Influencia, Estabilidad o Cumplimiento."],
  ["Núcleo de público", (item) => item.traits.coreAudience, "El grupo de personas al que apunta principalmente la marca."],
  ["Tono", (item) => item.profile.tone, "Cómo habla la marca en su comunicación: formal, cercano, divertido, aspiracional, provocador o creativo."],
  ["Objetivo", (item) => item.profile.objective, "Qué busca hoy la marca con su comunicación: vender más, ganar visibilidad, crear comunidad, etc."],
];

function HelpTip({ label, text }) {
  const id = `help-${label.normalize("NFD").replace(/[^\w]/g, "").toLowerCase()}`;
  return (
    <div className="help">
      <button type="button" className="help-icon" aria-label={`Qué es ${label}`} aria-describedby={id}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
          <path d="M6.2 6.1a1.9 1.9 0 0 1 3.7.6c0 1.3-1.9 1.6-1.9 2.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="8" cy="11.6" r="0.85" fill="currentColor" />
        </svg>
      </button>
      <div role="tooltip" id={id} className="help-text">{text}</div>
    </div>
  );
}

function sameValue(first, second) {
  if (Array.isArray(first) && Array.isArray(second)) return first.length > 0 && first.some((value) => second.includes(value));
  return Boolean(first) && first === second;
}

function PairCompare({ order, byId }) {
  const a = byId[order[0]];
  const b = byId[order[1]];
  const rows = COMPARE_ROWS.map(([label, read, help]) => ({ label, help, first: read(a), second: read(b) }))
    .filter((row) => (Array.isArray(row.first) ? row.first.length : row.first) || (Array.isArray(row.second) ? row.second.length : row.second));
  const show = (value) => (Array.isArray(value) ? value.join(", ") || "—" : value || "—");
  return (
    <div className="lab-compare">
      <h2 className="lab-block-title">Atributos de la dupla</h2>
      <table>
        <thead>
          <tr>
            <td />
            <th scope="col"><div className="lab-compare-brand"><Logo item={a} size="sm" />{a.name}</div></th>
            <th scope="col"><div className="lab-compare-brand"><Logo item={b} size="sm" />{b.name}</div></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const match = sameValue(row.first, row.second);
            return (
              <tr key={row.label} className={match ? "is-match" : undefined}>
                <th scope="row">
                  <div className="lab-compare-label">
                    {row.label}
                    <HelpTip label={row.label} text={row.help} />
                  </div>
                  {match && <small>{Array.isArray(row.first) ? "comparten" : "igual"}</small>}
                </th>
                <td>{show(row.first)}</td>
                <td>{show(row.second)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PairPicker({ candidates, order, onPick }) {
  const change = (index) => (event) => {
    const id = event.target.value;
    const next = [...order];
    // Si elige la misma marca que está del otro lado, se intercambian.
    if (id === order[1 - index]) next[1 - index] = order[index];
    next[index] = id;
    onPick(next);
  };
  const field = (index, label) => (
    <label className="lab-pick-field">
      <small>{label}</small>
      <select value={order[index]} onChange={change(index)}>
        {candidates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>
  );
  return (
    <div className="lab-pick">
      <h2>Compará dos marcas</h2>
      <div className="lab-pick-row">
        {field(0, "Marca 1")}
        <b className="lab-pick-x" aria-hidden="true">×</b>
        {field(1, "Marca 2")}
      </div>
    </div>
  );
}

function PairDetail({ pair, order, byId }) {
  const a = byId[order[0]];
  const b = byId[order[1]];
  const { insights } = pair;
  const band = bandFor(pair.score);
  return (
    <article className="lab-detail" aria-live="polite">
      <header className="lab-detail-head">
        <div className="lab-detail-logos"><Logo item={a} /><Logo item={b} /></div>
        <div className="lab-detail-title">
          <h3>{a.name} × {b.name}</h3>
          <small>{pair.reasons.join(" · ")}</small>
        </div>
        <div className="lab-detail-score">
          <strong className={`band-text-${band.key}`}>{pair.score}</strong>
          <strong className={`lab-pill band-${band.key}`}>{band.label}</strong>
        </div>
      </header>

      {pair.alerts.length > 0 && (
        <ul className="lab-alerts" aria-label="Alertas de la dupla">
          {pair.alerts.map((alert) => (
            <li key={alert.key} className={`lab-alert is-${alert.level}`}>
              <AlertIcon />
              <div>
                <strong>{alert.title}</strong>
                <div>{alert.text}</div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="lab-direction">
        {a.name} buscando a {b.name}: <b>{pair.directional[a.id]}</b> · {b.name} buscando a {a.name}: <b>{pair.directional[b.id]}</b>
      </div>

      <ul className="lab-factors">
        {pair.factors.map((factor) => (
          <li key={factor.key}>
            <div className="lab-factor-label">{factor.label}<small>peso {Math.round(factor.weight * 100)}%</small></div>
            <div className="lab-bar"><i style={{ width: `${Math.round(factor.value * 100)}%` }} /></div>
            <strong className="lab-factor-value">{Math.round(factor.value * 100)}</strong>
          </li>
        ))}
        {pair.location > 0 && (
          <li>
            <div className="lab-factor-label">Bonus por cercanía<small>{insights.sameCity ? "misma ciudad" : "ambas en Uruguay"}</small></div>
            <div />
            <strong className="lab-factor-value">+{Math.round(pair.location)}</strong>
          </li>
        )}
      </ul>

      <dl className="lab-facts">
        <div><dt>Motivadores en común</dt><dd>{insights.sharedMotivators.length ? insights.sharedMotivators.join(", ") : "Ninguno"}</dd></div>
        <div><dt>Edades en común</dt><dd>{insights.sharedAges.length ? insights.sharedAges.join(", ") : "Ninguna"}</dd></div>
        <div><dt>Rubros</dt><dd>{a.profile.category} y {b.profile.category}{insights.complementary ? ", complementarios" : insights.sameCategory ? ", mismo rubro" : ""}</dd></div>
      </dl>

      <div className="lab-idea">
        <h4>Idea de activación para el evento</h4>
        <div>{pair.idea}</div>
      </div>
    </article>
  );
}

function Ranking({ pairs, byId, selected, onSelect }) {
  return (
    <ol className="lab-ranking">
      {pairs.map((pair, index) => {
        const band = bandFor(pair.score);
        return (
          <li key={pair.key}>
            <button type="button" className={`lab-rank-row${selected === pair.key ? " is-selected" : ""}`} aria-pressed={selected === pair.key} onClick={() => onSelect([pair.a, pair.b], true)}>
              <small className="lab-rank-pos">{index + 1}</small>
              <div className="lab-rank-names">
                <strong>
                  {byId[pair.a].name} × {byId[pair.b].name}
                  {pair.alerts.length > 0 && (
                    <em className={`lab-rank-alert is-${pair.alerts.some((alert) => alert.level === "alta") ? "alta" : "media"}`} title={pair.alerts.map((alert) => alert.title).join(" · ")}>
                      <AlertIcon /> {pair.alerts.map((alert) => alert.title).join(" · ")}
                    </em>
                  )}
                </strong>
                <small>{pair.reasons.join(" · ")}</small>
              </div>
              <div className="lab-rank-bar" aria-hidden="true"><i className={`band-fill-${band.key}`} style={{ width: `${pair.score}%` }} /></div>
              <Score value={pair.score} size="sm" />
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function BrandCard({ item }) {
  return (
    <div className="lab-sponsor" role="tabpanel" id={`panel-${item.id}`} aria-labelledby={`tab-${item.id}`}>
      <div className="lab-sponsor-main">
        <div className="lab-sponsor-head">
          <Logo item={item} size="lg" />
          <div>
            <h3>{item.name}</h3>
            <div className="lab-sponsor-meta">
              {item.subcategory} · {item.city}{item.scale ? ` · Tamaño ${item.scale.toLowerCase()}` : ""}
              {item.followers ? ` · ${item.followers.toLocaleString("es-UY")} seguidores` : ""}
            </div>
            <div className="lab-sponsor-links">
              {/^@?[A-Za-z0-9_.]+$/.test(item.instagram || "") && <a href={`https://www.instagram.com/${item.instagram.replace(/^@/, "")}/`} target="_blank" rel="noreferrer">@{item.instagram.replace(/^@/, "")}</a>}
              {/^https?:\/\//.test(item.website || "") && !item.website.includes("instagram.com") && <a href={item.website} target="_blank" rel="noreferrer">{item.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</a>}
            </div>
          </div>
        </div>
        {item.description && <div className="lab-sponsor-desc">{item.description}</div>}
        <div className="lab-archetype">
          Arquetipo <b>{item.archetype.primary}</b>, con rasgos de {item.archetype.secondary}. {item.archetype.promise}
        </div>
        <dl className="lab-profile">
          {Object.entries(FIELD_LABELS).map(([key, label]) => (
            <div key={key}>
              <dt>{label}</dt>
              <dd>{key === "location" ? item.city : formatValue(key, item.profile[key])}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="lab-sponsor-side">
        <h4>Más compatibles en la base</h4>
        <ol className="lab-base">
          {item.base.matches.map((brand) => (
            <li key={brand.id || brand.name}>
              <Logo item={brand} size="sm" />
              <div className="lab-base-name">
                <strong>{brand.name}</strong>
                <small>{brand.category} · {brand.market} · {brand.reason}</small>
              </div>
              <Score value={brand.score} size="sm" />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default function LabView({ lab }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const byId = useMemo(() => Object.fromEntries(lab.candidates.map((item) => [item.id, item])), [lab.candidates]);
  const [order, setOrder] = useState(lab.summary ? [lab.summary.best.a, lab.summary.best.b] : []);
  const [activeCard, setActiveCard] = useState(lab.candidates[0]?.id);
  const detailRef = useRef(null);
  const tabRefs = useRef({});

  const changeSelection = (ids) => {
    startTransition(() => router.push(ids.length ? `${pathname}?marcas=${ids.join(",")}` : `${pathname}?marcas=`, { scroll: false }));
  };

  const select = (next, scroll = false) => {
    setOrder(next);
    if (scroll && window.matchMedia("(max-width: 1100px)").matches) {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const onTabKey = (event, index) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = lab.candidates[(index + step + lab.candidates.length) % lab.candidates.length];
    setActiveCard(next.id);
    tabRefs.current[next.id]?.focus();
  };

  const enough = lab.candidates.length >= 2;
  const card = byId[activeCard] || lab.candidates[0];

  return (
    <div className="lab">
      <h1 className="sr-only">Lab de compatibilidad</h1>
      <Slots lab={lab} pending={pending} onChange={changeSelection} />

      {!enough ? (
        <div className="lab-empty-state">Elegí al menos dos marcas para ver la compatibilidad.</div>
      ) : (
        <div className={pending ? "lab-content is-pending" : "lab-content"}>
          <Overview lab={lab} byId={byId} />

          <section className="lab-grid" aria-label="Duplas">
            <div className="lab-block">
              <h2 className="lab-block-title">Matriz de duplas</h2>
              <Matrix candidates={lab.candidates} byKey={lab.byKey} selected={pairKey(order[0], order[1])} onSelect={select} />
              <PairCompare order={order} byId={byId} />
            </div>
            <div className="lab-block lab-block-detail" ref={detailRef}>
              <PairPicker candidates={lab.candidates} order={order} onPick={setOrder} />
              <PairDetail pair={lab.byKey[pairKey(order[0], order[1])]} order={order} byId={byId} />
            </div>
          </section>

          <Dissonance lab={lab} byId={byId} />

          <section className="lab-block" aria-labelledby="ranking-title">
            <h2 className="lab-block-title" id="ranking-title">Ranking de duplas</h2>
            <Ranking pairs={lab.pairs} byId={byId} selected={pairKey(order[0], order[1])} onSelect={select} />
          </section>

          <section className="lab-block" aria-labelledby="cards-title">
            <h2 className="lab-block-title" id="cards-title">Fichas</h2>
            <div className="lab-tabs" role="tablist" aria-label="Marcas elegidas">
              {lab.candidates.map((item, index) => (
                <button
                  key={item.id}
                  ref={(node) => { tabRefs.current[item.id] = node; }}
                  type="button"
                  role="tab"
                  id={`tab-${item.id}`}
                  aria-selected={card.id === item.id}
                  aria-controls={`panel-${item.id}`}
                  tabIndex={card.id === item.id ? 0 : -1}
                  className="lab-tab"
                  onClick={() => setActiveCard(item.id)}
                  onKeyDown={(event) => onTabKey(event, index)}
                >
                  <Logo item={item} size="sm" />
                  {item.name}
                  {item.average != null && <Score value={item.average} size="sm" />}
                </button>
              ))}
            </div>
            <BrandCard item={card} />
          </section>
        </div>
      )}
    </div>
  );
}
