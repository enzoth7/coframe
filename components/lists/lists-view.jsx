"use client";

import { useRef, useState } from "react";

async function send(method, body) {
  const response = await fetch("/api/lists", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "No se pudo guardar.");
  return payload.lists;
}

// Descripción editable: clic para editar, Enter o salir para guardar, Escape para cancelar.
function Description({ list, option, writable, onSaved, onError }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(option.description);
  const [busy, setBusy] = useState(false);
  const done = useRef(false);

  const save = async () => {
    if (done.current) return;
    done.current = true;
    setEditing(false);
    const text = draft.trim();
    if (!text || text === option.description) { setDraft(option.description); return; }
    setBusy(true);
    try {
      onSaved(await send("PATCH", { list: list.key, value: option.value, description: text }));
    } catch (error) {
      setDraft(option.description);
      onError(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (!writable) return <div className="list-desc">{option.description}</div>;
  if (editing) {
    return (
      <textarea
        className="list-desc-input"
        autoFocus
        rows={2}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); save(); }
          if (event.key === "Escape") { done.current = true; setDraft(option.description); setEditing(false); }
        }}
      />
    );
  }
  return (
    <button
      type="button"
      className={`list-desc list-desc-button${busy ? " is-busy" : ""}`}
      onClick={() => { done.current = false; setDraft(option.description); setEditing(true); }}
      title="Editar descripción"
    >
      {option.description}
    </button>
  );
}

function AddOption({ list, onSaved, onError }) {
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [parent, setParent] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      onSaved(await send("POST", { list: list.key, value, description, parent }));
      setValue("");
      setDescription("");
      setParent("");
    } catch (error) {
      onError(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className={`list-add${list.parentLabel ? " has-parent" : ""}`} onSubmit={submit}>
      {list.parentLabel && (
        <select aria-label={list.parentLabel} value={parent} onChange={(event) => setParent(event.target.value)} required>
          <option value="">{list.parentLabel}…</option>
          {list.parentOptions.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      )}
      <input aria-label={`Nueva opción de ${list.label}`} placeholder="Nueva opción" value={value} onChange={(event) => setValue(event.target.value)} required />
      <input aria-label="Descripción" placeholder="Qué significa" value={description} onChange={(event) => setDescription(event.target.value)} required />
      <button type="submit" className="btn-dark" disabled={busy}>{busy ? "Agregando…" : "Agregar"}</button>
    </form>
  );
}

export default function ListsView({ initialLists, writable }) {
  const [lists, setLists] = useState(initialLists);
  const [active, setActive] = useState(initialLists[0]?.key);
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 4200);
  };

  const remove = async (list, option) => {
    try {
      setLists(await send("DELETE", { list: list.key, value: option.value }));
    } catch (error) {
      showToast(error.message);
    }
  };

  const list = lists.find((item) => item.key === active) || lists[0];

  return (
    <div className="lists-layout">
      <nav className="lists-nav" aria-label="Listas">
        {lists.map((item) => (
          <button key={item.key} type="button" className={item.key === list.key ? "is-active" : undefined} aria-current={item.key === list.key ? "true" : undefined} onClick={() => setActive(item.key)}>
            {item.label}
            <small>{item.options.length}</small>
          </button>
        ))}
      </nav>

      <section className="list-panel" aria-labelledby="list-title">
        <header className="list-head">
          <h2 id="list-title">{list.label}</h2>
          <div className="list-help">{list.help}</div>
          <div className={`list-kind${list.scored ? " is-scored" : ""}`}>
            {list.scored
              ? "Entra en el cálculo de compatibilidad: las opciones son fijas y solo se editan las descripciones."
              : "No entra en el cálculo: podés agregar opciones y quitar las que ninguna marca usa."}
          </div>
        </header>

        {!writable && <div className="list-readonly">Esta copia es de solo lectura. Para editar las listas corré el proyecto en tu computadora.</div>}

        <table className="list-table">
          <thead>
            <tr>
              {list.parentLabel && <th scope="col" className="list-parent">{list.parentLabel}</th>}
              <th scope="col">Opción</th>
              <th scope="col">Qué significa</th>
              {list.countable && <th scope="col" className="list-uses">Marcas</th>}
              {writable && !list.scored && <th scope="col" className="list-actions"><b className="sr-only">Acciones</b></th>}
            </tr>
          </thead>
          <tbody>
            {(list.parentLabel ? [...list.options].sort((a, b) => (a.parent || "").localeCompare(b.parent || "", "es")) : list.options).map((option) => (
              <tr key={option.value}>
                {list.parentLabel && <td className="list-parent">{option.parent || "—"}</td>}
                <th scope="row">{option.value}</th>
                <td><Description list={list} option={option} writable={writable} onSaved={setLists} onError={showToast} /></td>
                {list.countable && <td className="list-uses">{option.uses}</td>}
                {writable && !list.scored && (
                  <td className="list-actions">
                    <button type="button" className="btn-ghost list-remove" disabled={option.uses > 0} title={option.uses > 0 ? "La usan marcas de la base" : "Quitar opción"} onClick={() => remove(list, option)}>
                      Quitar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {writable && !list.scored && <AddOption list={list} onSaved={setLists} onError={showToast} />}
        {writable && <div className="list-hint">Clic en una descripción para editarla. Enter guarda; Escape cancela.</div>}
      </section>

      {toast && <div className="base-toast" role="status">{toast}</div>}
    </div>
  );
}
