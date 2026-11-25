"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { BANDS, bandFor } from "@/lib/bands";

const pairKey = (a, b) => [a, b].sort().join("||");

async function send(method, body) {
  const response = await fetch("/api/matrices", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "No se pudo guardar.");
  return payload.matrices;
}

// Una celda: muestra el valor (0 a 100) con el color de su banda; clic para editar.
function Cell({ value, label, writable, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const done = useRef(false);
  const score = Math.round((value ?? 0) * 100);

  const commit = () => {
    if (done.current) return;
    done.current = true;
    setEditing(false);
    const number = Number(draft);
    if (draft === "" || !Number.isFinite(number) || Math.round(number) === score) return;
    onSave(Math.max(0, Math.min(100, Math.round(number))) / 100);
  };

  if (editing) {
    return (
      <input
        className="matrix-input"
        type="number"
        min={0}
        max={100}
        autoFocus
        aria-label={label}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") { event.preventDefault(); commit(); }
          if (event.key === "Escape") { done.current = true; setEditing(false); }
        }}
      />
    );
  }
  return (
    <button
      type="button"
      className={`matrix-cell band-${bandFor(score).key}`}
      aria-label={`${label}: ${score}`}
      title={label}
      disabled={!writable}
      onClick={() => { done.current = false; setDraft(String(score)); setEditing(true); }}
    >
      {score}
    </button>
  );
}

export default function MatrixView({ definitions, initialMatrices, writable }) {
  const [matrices, setMatrices] = useState(initialMatrices);
  const [active, setActive] = useState(definitions[0].key);
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const definition = definitions.find((item) => item.key === active);
  const table = matrices[definition.key] || {};

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 4200);
  };

  const save = async (a, b, value) => {
    const key = pairKey(a, b);
    const previous = table[key];
    setMatrices((current) => ({ ...current, [definition.key]: { ...current[definition.key], [key]: value } }));
    try {
      setMatrices(await send("PATCH", { matrix: definition.key, a, b, value }));
    } catch (error) {
      setMatrices((current) => ({ ...current, [definition.key]: { ...current[definition.key], [key]: previous } }));
      showToast(error.message);
    }
  };

  const reset = async () => {
    try {
      setMatrices(await send("POST", { matrix: definition.key }));
      showToast(`${definition.label}: volvió a los valores originales.`);
    } catch (error) {
      showToast(error.message);
    }
  };

  return (
    <div className="matrix-layout">
      <nav className="lists-nav matrix-nav" aria-label="Matrices">
        {definitions.map((item) => (
          <button key={item.key} type="button" className={item.key === active ? "is-active" : undefined} aria-current={item.key === active ? "true" : undefined} onClick={() => setActive(item.key)}>
            {item.label}
            <small>{item.share}%</small>
          </button>
        ))}
      </nav>

      <section className="matrix-panel" aria-labelledby="matrix-title">
        <header className="matrix-head">
          <h2 id="matrix-title">{definition.label}</h2>
          <div className="matrix-help">{definition.help}</div>
          <div className="matrix-weight">
            Pesa <strong>{definition.share}%</strong> en el puntaje total. <Link href="/ajustes">Cambiar el peso en Ajustes</Link>
          </div>
        </header>

        {!writable && <div className="matrix-readonly">Esta copia es de solo lectura. Para editar las matrices corré el proyecto en tu computadora.</div>}

        <div className="matrix-scroll">
          <table className="matrix-table">
            <caption className="sr-only">Compatibilidad entre valores de {definition.label}, de 0 a 100.</caption>
            <thead>
              <tr>
                <td className="matrix-corner" />
                {definition.values.map((value) => <th key={value} scope="col"><div className="matrix-col">{value}</div></th>)}
              </tr>
            </thead>
            <tbody>
              {definition.values.map((row) => (
                <tr key={row}>
                  <th scope="row" className="matrix-row">{row}</th>
                  {definition.values.map((col) => (
                    <td key={col} className={row === col ? "is-diagonal" : undefined}>
                      <Cell
                        value={table[pairKey(row, col)]}
                        label={`${row} × ${col}`}
                        writable={writable}
                        onSave={(value) => save(row, col, value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="matrix-legend">
          {BANDS.map((band) => (
            <li key={band.key}><i className={`matrix-dot band-fill-${band.key}`} aria-hidden="true" /><b>{band.label}</b> <small>{band.range}</small></li>
          ))}
        </ul>

        {writable && (
          <div className="matrix-actions">
            <div className="matrix-hint">Clic en una celda para cambiar el valor (0 a 100). Es simétrica: A × B vale lo mismo que B × A.</div>
            <button type="button" className="btn-ghost" onClick={reset}>Volver a los valores originales</button>
          </div>
        )}
      </section>

      {toast && <div className="base-toast" role="status">{toast}</div>}
    </div>
  );
}
