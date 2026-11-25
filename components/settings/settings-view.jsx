"use client";

import { useMemo, useRef, useState } from "react";
import { DEFAULT_SETTINGS, FACTORS, normalizeSettings } from "@/lib/weights";

const same = (a, b) => JSON.stringify(normalizeSettings(a)) === JSON.stringify(normalizeSettings(b));

function NumberField({ id, value, max, disabled, onChange }) {
  return (
    <input
      id={id}
      type="number"
      inputMode="numeric"
      min={0}
      max={max}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value === "" ? 0 : Number(event.target.value))}
    />
  );
}

export default function SettingsView({ initialSettings, writable }) {
  const [saved, setSaved] = useState(initialSettings);
  const [draft, setDraft] = useState(initialSettings);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const total = useMemo(() => Object.values(draft.weights).reduce((sum, value) => sum + (Number(value) || 0), 0), [draft.weights]);
  const share = (key) => (total ? Math.round(((Number(draft.weights[key]) || 0) / total) * 1000) / 10 : 0);
  const dirty = !same(draft, saved);
  const isDefault = same(draft, DEFAULT_SETTINGS);

  const setWeight = (key, value) => setDraft((current) => ({ ...current, weights: { ...current.weights, [key]: Math.max(0, Math.min(100, value)) } }));
  const setBonus = (key, value) => setDraft((current) => ({ ...current, locationBonus: { ...current.locationBonus, [key]: Math.max(0, Math.min(30, value)) } }));

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 4200);
  };

  const save = async () => {
    if (!total) { showToast("Al menos un factor tiene que pesar algo."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudieron guardar los ajustes.");
      setSaved(payload.settings);
      setDraft(payload.settings);
      showToast("Ajustes guardados. El Lab ya calcula con estos pesos.");
    } catch (error) {
      showToast(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="settings-layout">
      {!writable && <div className="settings-readonly">Esta copia es de solo lectura. Para cambiar los ajustes corré el proyecto en tu computadora.</div>}

      <section className="settings-block" aria-labelledby="weights-title">
        <header className="settings-head">
          <h2 id="weights-title">Peso de cada atributo</h2>
          <div>Cuánto creemos que importa cada atributo para que dos marcas sean compatibles. Los valores son relativos: el porcentaje final se calcula sobre el total.</div>
        </header>

        <div className="weights-bar" role="img" aria-label={FACTORS.map((factor) => `${factor.label} ${share(factor.key)}%`).join(", ")}>
          {FACTORS.map((factor, index) => (
            <i key={factor.key} className={`weights-seg seg-${index}`} style={{ flexGrow: Number(draft.weights[factor.key]) || 0 }} title={`${factor.label}: ${share(factor.key)}%`} />
          ))}
        </div>

        <ul className="weights-list">
          {FACTORS.map((factor, index) => (
            <li key={factor.key}>
              <div className="weight-info">
                <label htmlFor={`w-${factor.key}`}><i className={`weights-dot seg-${index}`} aria-hidden="true" />{factor.label}</label>
                <small>{factor.help}</small>
              </div>
              <input
                className="weight-range"
                type="range"
                min={0}
                max={50}
                step={1}
                value={Math.min(50, draft.weights[factor.key])}
                disabled={!writable}
                aria-label={`Peso de ${factor.label}`}
                onChange={(event) => setWeight(factor.key, Number(event.target.value))}
              />
              <NumberField id={`w-${factor.key}`} value={draft.weights[factor.key]} max={100} disabled={!writable} onChange={(value) => setWeight(factor.key, value)} />
              <strong className="weight-share">{share(factor.key)}%</strong>
            </li>
          ))}
        </ul>
      </section>

      <section className="settings-block" aria-labelledby="bonus-title">
        <header className="settings-head">
          <h2 id="bonus-title">Bonus por cercanía</h2>
          <div>Puntos que se suman al puntaje final cuando las dos marcas están cerca. El máximo del puntaje sigue siendo 99.</div>
        </header>
        <ul className="weights-list">
          <li>
            <div className="weight-info">
              <label htmlFor="b-city">Misma ciudad</label>
              <small>Las dos marcas son de Paysandú o las dos de Montevideo.</small>
            </div>
            <input className="weight-range" type="range" min={0} max={30} value={draft.locationBonus.sameCity} disabled={!writable} aria-label="Bonus por misma ciudad" onChange={(event) => setBonus("sameCity", Number(event.target.value))} />
            <NumberField id="b-city" value={draft.locationBonus.sameCity} max={30} disabled={!writable} onChange={(value) => setBonus("sameCity", value)} />
            <strong className="weight-share">+{draft.locationBonus.sameCity}</strong>
          </li>
          <li>
            <div className="weight-info">
              <label htmlFor="b-country">Ambas en Uruguay</label>
              <small>Las dos marcas son uruguayas pero de ciudades distintas.</small>
            </div>
            <input className="weight-range" type="range" min={0} max={30} value={draft.locationBonus.uruguay} disabled={!writable} aria-label="Bonus por estar ambas en Uruguay" onChange={(event) => setBonus("uruguay", Number(event.target.value))} />
            <NumberField id="b-country" value={draft.locationBonus.uruguay} max={30} disabled={!writable} onChange={(value) => setBonus("uruguay", value)} />
            <strong className="weight-share">+{draft.locationBonus.uruguay}</strong>
          </li>
        </ul>
      </section>

      {writable && (
        <div className="settings-actions">
          <button type="button" className="btn-dark" onClick={save} disabled={busy || !dirty}>{busy ? "Guardando…" : "Guardar ajustes"}</button>
          <button type="button" className="btn-ghost" onClick={() => setDraft(saved)} disabled={busy || !dirty}>Descartar cambios</button>
          <button type="button" className="btn-ghost" onClick={() => setDraft(normalizeSettings(DEFAULT_SETTINGS))} disabled={busy || isDefault}>Volver a los valores originales</button>
          {dirty && <strong className="settings-dirty">Hay cambios sin guardar</strong>}
        </div>
      )}

      {toast && <div className="base-toast" role="status">{toast}</div>}
    </div>
  );
}
