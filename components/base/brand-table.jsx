"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BRAND_COLUMNS, SOURCE_LABELS, isUnknownValue } from "@/lib/brand-columns";
import { SCALE_LABELS, brandScale } from "@/lib/alerts";

// Columna calculada (solo lectura) que se muestra después de "Facturación USD".
const SIZE_AFTER = "revenue_range";
const sizeOf = (row) => {
  const scale = brandScale({ followersBucket: row.followers_bucket, revenueRange: row.revenue_range });
  return scale ? SCALE_LABELS[scale - 1] : "—";
};

const normalize = (value = "") => String(value).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const SOURCE_FILTERS = [
  { value: "all", label: "Todas" },
  { value: "bd_v3", label: "Uruguay" },
  { value: "international_global", label: "Global" },
  { value: "international_latam", label: "Latinoamérica" },
];

function displayValue(column, value) {
  if (column.type === "bool") return value ? "Sí" : "No";
  if (column.type === "multi") return value.join(", ");
  if (column.key === "source") return SOURCE_LABELS[value] || value;
  return value ?? "";
}

// Un subrubro que pertenece a otro rubro (por ejemplo, después de cambiar el rubro de la marca).
function parentMismatch(column, row, parents) {
  if (!column.parentKey) return false;
  const parent = parents[column.key]?.[row[column.key]];
  return Boolean(parent && parent !== row[column.parentKey]);
}

function rowWarnings(row, lists, parents = {}) {
  return BRAND_COLUMNS.filter((column) => isUnknownValue(column, row[column.key], lists[column.key]) || parentMismatch(column, row, parents)).map((column) => column.label);
}

// Editor de una celda. Guarda con Enter, Tab o al salir; Escape cancela.
function CellEditor({ column, value, options, lists, parents = {}, row, onCommit, onCancel, anchor }) {
  const [draft, setDraft] = useState(column.type === "multi" ? value : value ?? "");
  const ref = useRef(null);
  // Evita guardar dos veces cuando Enter desmonta el editor y además dispara blur.
  const done = useRef(false);
  const commit = (next, direction) => { if (done.current) return; done.current = true; onCommit(next, direction); };
  const cancel = () => { if (done.current) return; done.current = true; onCancel(); };

  useEffect(() => {
    ref.current?.focus();
    if (column.type === "text") ref.current?.select?.();
  }, [column.type]);

  const keyDown = (event) => {
    if (event.key === "Escape") { event.preventDefault(); cancel(); }
    if (event.key === "Enter" && column.type !== "multi") { event.preventDefault(); commit(draft, "down"); }
    if (event.key === "Tab") { event.preventDefault(); commit(draft, event.shiftKey ? "left" : "right"); }
  };

  if (column.type === "select") {
    // Listas dependientes (subrubro): solo las opciones del rubro de la marca.
    const all = options[column.key] || [];
    const parentValue = column.parentKey ? row?.[column.parentKey] : null;
    const filtered = column.parentKey ? all.filter((item) => parents[column.key]?.[item] === parentValue) : all;
    const list = filtered.length ? filtered : all;
    return (
      <select
        ref={ref}
        className="cell-input"
        value={draft}
        onChange={(event) => commit(event.target.value, null)}
        onBlur={cancel}
        onKeyDown={keyDown}
      >
        {!column.required && <option value="">—</option>}
        {draft && !list.includes(draft) && <option value={draft}>{draft}</option>}
        {list.map((item) => <option key={item} value={item}>{column.key === "source" ? SOURCE_LABELS[item] || item : item}</option>)}
      </select>
    );
  }

  if (column.type === "multi") {
    const list = options[column.key] || [];
    const rect = anchor?.getBoundingClientRect();
    const style = rect ? { top: Math.min(rect.bottom + 4, window.innerHeight - 320), left: Math.min(rect.left, window.innerWidth - 260) } : undefined;
    const toggle = (item) => setDraft((current) => (current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item]));
    return (
      <div
        className="cell-popover"
        style={style}
        ref={ref}
        tabIndex={-1}
        onKeyDown={keyDown}
        onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) cancel(); }}
        role="dialog"
        aria-label={column.label}
      >
        <div className="cell-popover-title">{column.label}</div>
        <div className="cell-popover-list">
          {list.map((item) => (
            <label key={item} className={!(lists[column.key] || column.base || []).includes(item) ? "is-unknown" : undefined}>
              <input type="checkbox" checked={draft.includes(item)} onChange={() => toggle(item)} />
              {item}
            </label>
          ))}
        </div>
        <div className="cell-popover-actions">
          <button type="button" className="btn-ghost" onClick={cancel}>Cancelar</button>
          <button type="button" className="btn-dark" onClick={() => commit(list.filter((item) => draft.includes(item)), null)}>Guardar</button>
        </div>
      </div>
    );
  }

  return (
    <input
      ref={ref}
      className="cell-input"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => commit(draft, null)}
      onKeyDown={keyDown}
    />
  );
}

// Logo de la marca: clic para subir o cambiar, botón para quitar. Se guarda en el SQLite.
function LogoCell({ row, writable, onChange, onError }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`/api/brands/${encodeURIComponent(row.id)}/logo`, { method: "POST", body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo subir el logo.");
      onChange(payload.logo);
    } catch (error) {
      onError(`${row.name}: ${error.message}`);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const response = await fetch(`/api/brands/${encodeURIComponent(row.id)}/logo`, { method: "DELETE" });
      if (!response.ok) throw new Error((await response.json()).error || "No se pudo quitar el logo.");
      onChange(null);
    } catch (error) {
      onError(`${row.name}: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const image = row.logo
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={row.logo} alt="" loading="lazy" />
    : <b aria-hidden="true">+</b>;

  if (!writable) return <div className="logo-cell">{row.logo ? image : null}</div>;

  return (
    <div className={`logo-cell${busy ? " is-busy" : ""}`}>
      <button type="button" className="logo-pick" onClick={() => input.current?.click()} disabled={busy} aria-label={row.logo ? `Cambiar logo de ${row.name}` : `Subir logo de ${row.name}`} title={row.logo ? "Cambiar logo" : "Subir logo"}>
        {image}
      </button>
      {row.logo && (
        <button type="button" className="logo-remove" onClick={remove} disabled={busy} aria-label={`Quitar logo de ${row.name}`} title="Quitar logo">×</button>
      )}
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={(event) => upload(event.target.files?.[0])} />
    </div>
  );
}

export default function BrandTable({ initialRows, options, lists = {}, parents = {}, writable }) {
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");
  const [onlyWarnings, setOnlyWarnings] = useState(false);
  const [active, setActive] = useState({ row: 0, col: 0 });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState({});
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const tableRef = useRef(null);
  const cellRefs = useRef({});

  const warningsById = useMemo(() => Object.fromEntries(rows.map((row) => [row.id, rowWarnings(row, lists, parents)])), [rows, lists, parents]);
  const warningCount = rows.filter((row) => warningsById[row.id].length).length;

  const visible = useMemo(() => {
    const term = normalize(query.trim());
    return rows.filter((row) => {
      if (source !== "all" && row.source !== source) return false;
      if (onlyWarnings && !warningsById[row.id].length) return false;
      if (!term) return true;
      return [row.name, row.city, row.category, row.subcategory, row.instagram, row.id].some((value) => normalize(value || "").includes(term));
    });
  }, [rows, query, source, onlyWarnings, warningsById]);

  const activeRow = Math.min(active.row, Math.max(0, visible.length - 1));
  const cellKey = (rowId, colKey) => `${rowId}:${colKey}`;

  // Lleva la celda a la vista sin que la tapen el encabezado ni las columnas fijas (ID + Marca).
  const ensureVisible = useCallback((cell) => {
    const wrap = tableRef.current;
    if (!wrap || !cell) return;
    const box = wrap.getBoundingClientRect();
    const rect = cell.getBoundingClientRect();
    const head = wrap.querySelector("thead")?.getBoundingClientRect().height || 0;
    const sticky = cell.classList.contains("col-name") ? 0 : (wrap.querySelector("tbody .col-name")?.getBoundingClientRect().right || box.left) - box.left;
    if (rect.left < box.left + sticky) wrap.scrollLeft -= box.left + sticky - rect.left;
    else if (rect.right > box.right) wrap.scrollLeft += rect.right - box.right + 8;
    if (rect.top < box.top + head) wrap.scrollTop -= box.top + head - rect.top;
    else if (rect.bottom > box.bottom) wrap.scrollTop += rect.bottom - box.bottom + 8;
  }, []);

  // El foco se mueve después del render, cuando la celda activa ya existe en el DOM.
  const wantFocus = useRef(false);
  const focusCell = useCallback((rowIndex, colIndex) => {
    if (!visible[rowIndex] || !BRAND_COLUMNS[colIndex]) return;
    wantFocus.current = true;
    setActive({ row: rowIndex, col: colIndex });
  }, [visible]);

  useEffect(() => {
    if (!wantFocus.current || editing) return;
    wantFocus.current = false;
    const row = visible[Math.min(active.row, visible.length - 1)];
    const column = BRAND_COLUMNS[active.col];
    if (!row || !column) return;
    const cell = cellRefs.current[cellKey(row.id, column.key)];
    cell?.focus({ preventScroll: true });
    ensureVisible(cell);
  }, [active, editing, visible, ensureVisible]);

  const move = useCallback((direction) => {
    const delta = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[direction];
    if (!delta) return;
    const nextRow = Math.max(0, Math.min(visible.length - 1, activeRow + delta[0]));
    const nextCol = Math.max(0, Math.min(BRAND_COLUMNS.length - 1, active.col + delta[1]));
    focusCell(nextRow, nextCol);
  }, [visible.length, activeRow, active.col, focusCell]);

  const toastTimer = useRef(null);
  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  };

  const save = async (row, column, value) => {
    const key = cellKey(row.id, column.key);
    const previous = row[column.key];
    const same = JSON.stringify(previous ?? (column.type === "multi" ? [] : "")) === JSON.stringify(value ?? "");
    if (same) return;
    setRows((current) => current.map((item) => (item.id === row.id ? { ...item, [column.key]: value } : item)));
    setSaving((current) => ({ ...current, [key]: true }));
    setErrors((current) => { const next = { ...current }; delete next[key]; return next; });
    try {
      const response = await fetch(`/api/brands/${encodeURIComponent(row.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: column.key, value }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo guardar.");
      setRows((current) => current.map((item) => (item.id === row.id ? payload.row : item)));
    } catch (error) {
      setRows((current) => current.map((item) => (item.id === row.id ? { ...item, [column.key]: previous } : item)));
      setErrors((current) => ({ ...current, [key]: error.message }));
      showToast(`${row.name} · ${column.label}: ${error.message}`);
    } finally {
      setSaving((current) => { const next = { ...current }; delete next[key]; return next; });
    }
  };

  const startEdit = (rowIndex, colIndex) => {
    if (!writable) return;
    const row = visible[rowIndex];
    const column = BRAND_COLUMNS[colIndex];
    setActive({ row: rowIndex, col: colIndex });
    if (column.type === "bool") { save(row, column, !row[column.key]); return; }
    setEditing(true);
  };

  const onGridKey = (event) => {
    // Solo las celdas de datos navegan; los botones del logo manejan sus propias teclas.
    if (editing || event.target.tagName !== "TD") return;
    const arrows = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
    if (arrows[event.key]) { event.preventDefault(); move(arrows[event.key]); return; }
    if (event.key === "Tab") { event.preventDefault(); move(event.shiftKey ? "left" : "right"); return; }
    if (event.key === "Enter" || event.key === "F2" || (event.key === " " && BRAND_COLUMNS[active.col].type === "bool")) {
      event.preventDefault();
      startEdit(activeRow, active.col);
    }
  };

  const addBrand = async () => {
    try {
      const response = await fetch("/api/brands", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo crear la marca.");
      setQuery("");
      setSource("all");
      setOnlyWarnings(false);
      setRows((current) => [payload.row, ...current]);
      setActive({ row: 0, col: 0 });
      setEditing(true);
      tableRef.current?.scrollTo({ top: 0, left: 0 });
    } catch (error) {
      showToast(error.message);
    }
  };

  return (
    <div className="base-wrap">
      <div className="base-stats">
        <div><small>Marcas</small><strong>{rows.length}</strong></div>
        <div><small>Activas</small><strong>{rows.filter((row) => row.active).length}</strong></div>
        <div><small>Con logo</small><strong>{rows.filter((row) => row.logo).length}</strong></div>
        <div><small>Con valores a revisar</small><strong>{warningCount}</strong></div>
      </div>

      {!writable && (
        <div className="base-readonly">Esta copia es de solo lectura. Para editar la base corré el proyecto en tu computadora.</div>
      )}

      <div className="base-toolbar">
        <label className="base-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input type="search" aria-label="Buscar marca" placeholder="Buscar marca, ciudad o rubro…" value={query} onChange={(event) => { setQuery(event.target.value); setActive({ row: 0, col: active.col }); }} />
        </label>
        <div className="base-segment" role="group" aria-label="Filtrar por fuente">
          {SOURCE_FILTERS.map((item) => (
            <button key={item.value} type="button" aria-pressed={source === item.value} onClick={() => setSource(item.value)}>{item.label}</button>
          ))}
        </div>
        <button type="button" className={`base-chip${onlyWarnings ? " is-on" : ""}`} aria-pressed={onlyWarnings} onClick={() => setOnlyWarnings((value) => !value)}>
          A revisar ({warningCount})
        </button>
        <div className="base-count">{visible.length} de {rows.length}</div>
        {writable && <button type="button" className="btn-dark base-add" onClick={addBrand}>Nueva marca</button>}
      </div>

      <div className="base-table-wrap" ref={tableRef}>
        <table className="base-table" role="grid" aria-rowcount={visible.length + 1} onKeyDown={onGridKey}>
          <colgroup>
            <col style={{ width: 92 }} />
            <col style={{ width: 72 }} />
            {BRAND_COLUMNS.map((column) => (
              <Fragment key={column.key}>
                <col style={{ width: column.width }} />
                {column.key === SIZE_AFTER && <col style={{ width: 120 }} />}
              </Fragment>
            ))}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="col-id">ID</th>
              <th scope="col" className="col-logo">Logo</th>
              {BRAND_COLUMNS.map((column) => (
                <Fragment key={column.key}>
                  <th scope="col" className={column.key === "name" ? "col-name" : undefined}>{column.label}</th>
                  {column.key === SIZE_AFTER && <th scope="col" className="col-computed" title="Calculado con seguidores de Instagram y facturación">Tamaño</th>}
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, rowIndex) => (
              <tr key={row.id} className={row.active ? undefined : "is-inactive"}>
                <th scope="row" className="col-id">{row.id}</th>
                <td className="col-logo">
                  <LogoCell
                    row={row}
                    writable={writable}
                    onError={showToast}
                    onChange={(logo) => setRows((current) => current.map((item) => (item.id === row.id ? { ...item, logo } : item)))}
                  />
                </td>
                {BRAND_COLUMNS.map((column, colIndex) => {
                  const key = cellKey(row.id, column.key);
                  const isActive = rowIndex === activeRow && colIndex === active.col;
                  const isEditing = isActive && editing;
                  const mismatch = parentMismatch(column, row, parents);
                  const unknown = isUnknownValue(column, row[column.key], lists[column.key]) || mismatch;
                  const classes = [
                    column.key === "name" ? "col-name" : "",
                    isActive ? "is-active" : "",
                    saving[key] ? "is-saving" : "",
                    errors[key] ? "has-error" : "",
                    unknown ? "has-warning" : "",
                  ].filter(Boolean).join(" ");
                  return (
                    <Fragment key={column.key}>
                    <td
                      ref={(node) => { cellRefs.current[key] = node; }}
                      className={classes || undefined}
                      tabIndex={isActive && !isEditing ? 0 : -1}
                      title={errors[key] || (mismatch ? `Este subrubro es de otro rubro (${parents[column.key][row[column.key]]})` : unknown ? "El motor de compatibilidad no reconoce este valor" : undefined)}
                      onClick={() => { if (!isEditing) setActive({ row: rowIndex, col: colIndex }); }}
                      onDoubleClick={() => startEdit(rowIndex, colIndex)}
                    >
                      {isEditing ? (
                        <CellEditor
                          column={column}
                          value={row[column.key]}
                          options={options}
                          lists={lists}
                          parents={parents}
                          row={row}
                          anchor={cellRefs.current[key]}
                          onCancel={() => { setEditing(false); focusCell(rowIndex, colIndex); }}
                          onCommit={(value, direction) => {
                            setEditing(false);
                            save(row, column, value);
                            if (direction) move(direction); else focusCell(rowIndex, colIndex);
                          }}
                        />
                      ) : column.type === "bool" ? (
                        <strong className={`cell-bool${row.active ? " is-on" : ""}`}>{displayValue(column, row[column.key])}</strong>
                      ) : (
                        <div className="cell-text">{displayValue(column, row[column.key])}</div>
                      )}
                    </td>
                    {column.key === SIZE_AFTER && (
                      <td className="col-computed" title="Calculado con seguidores de Instagram y facturación"><div className="cell-text">{sizeOf(row)}</div></td>
                    )}
                    </Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && <div className="base-empty">Ninguna marca coincide con la búsqueda. Probá con otro nombre o sacá los filtros.</div>}
      </div>

      <div className="base-help">
        Doble clic o Enter para editar. Las flechas mueven la selección. Clic en el logo para subirlo o cambiarlo. Los cambios se guardan solos en el SQLite.
      </div>

      {toast && <div className="base-toast" role="status">{toast}</div>}
    </div>
  );
}
