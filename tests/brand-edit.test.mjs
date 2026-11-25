import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { BrandEditError, createBrand, deleteLogo, getBrandTable, getLogo, saveLogo, updateBrandField } from "../lib/brands-db.js";

// Trabaja sobre una copia: nunca toca data/coframe.sqlite.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "coframe-edit-"));
const copy = path.join(dir, "coframe.sqlite");
fs.copyFileSync(path.join(process.cwd(), "data", "coframe.sqlite"), copy);
process.env.COFRAME_DB_PATH = copy;
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

test("la tabla trae todas las marcas con opciones para cada selector", () => {
  const { rows, options } = getBrandTable();
  assert.ok(rows.length >= 240);
  assert.ok(options.category.includes("Moda"));
  assert.ok(Array.isArray(rows[0].motivators));
});

test("editar campos simples, listas y activa", () => {
  const { rows } = getBrandTable();
  const target = rows.find((row) => row.name === "Salus");
  assert.equal(updateBrandField(target.id, "archetype", "Cuidador").archetype, "Cuidador");
  assert.deepEqual(updateBrandField(target.id, "motivators", ["Familia", "Seguridad", "Familia"]).motivators.sort(), ["Familia", "Seguridad"]);
  assert.equal(updateBrandField(target.id, "active", false).active, false);
  assert.equal(updateBrandField(target.id, "country_code", "uy").country_code, "UY");
});

test("rechaza nombres repetidos, obligatorios vacíos y columnas desconocidas", () => {
  const { rows } = getBrandTable();
  const [first, second] = rows;
  assert.throws(() => updateBrandField(first.id, "name", second.name), BrandEditError);
  assert.throws(() => updateBrandField(first.id, "city", "  "), BrandEditError);
  assert.throws(() => updateBrandField(first.id, "normalized_name", "x"), BrandEditError);
});

test("crear una marca nueva le da el siguiente ID uruguayo", () => {
  const created = createBrand();
  assert.match(created.id, /^M-\d{5}$/);
  assert.equal(created.source, "bd_v3");
  const again = createBrand();
  assert.notEqual(again.name, created.name);
});

test("los logos se guardan en la base y se validan por contenido", () => {
  const { rows } = getBrandTable();
  const target = rows[0];
  assert.throws(() => saveLogo(target.id, Buffer.from("<script>alert(1)</script>")), BrandEditError);
  assert.throws(() => saveLogo(target.id, Buffer.alloc(0)), BrandEditError);
  const png = fs.readFileSync(path.join(process.cwd(), "data", "sponsors", "logos", "salus.png"));
  const url = saveLogo(target.id, png);
  assert.ok(url.startsWith(`/api/brands/${target.id}/logo?v=`), url);
  assert.equal(getLogo(target.id).mime, "image/png");
  deleteLogo(target.id);
  assert.equal(getLogo(target.id), null);
});
