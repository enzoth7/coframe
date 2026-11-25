import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import { buildDatabase, defaultInternationalCsv, defaultUruguayCsv, inspectDatabase, parseUruguayCsv } from "../scripts/db-lib.mjs";

function fileHash(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function contentHash(dbPath) {
  const db = new Database(dbPath, { readonly: true });
  try {
    const rows = db.prepare(`
      SELECT b.*, GROUP_CONCAT(DISTINCT bm.motivator) AS motivators, GROUP_CONCAT(DISTINCT ba.age_range) AS ages
      FROM brands b
      LEFT JOIN brand_motivators bm ON bm.brand_id = b.id
      LEFT JOIN brand_age_ranges ba ON ba.brand_id = b.id
      GROUP BY b.id ORDER BY b.id
    `).all();
    return crypto.createHash("sha256").update(JSON.stringify(rows)).digest("hex");
  } finally { db.close(); }
}

function tempWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "coframe-db-test-"));
}

test("las fuentes construyen 240 marcas con los conteos acordados", () => {
  const directory = tempWorkspace();
  try {
    const dbPath = path.join(directory, "coframe.sqlite");
    buildDatabase({ dbPath });
    assert.deepEqual(inspectDatabase(dbPath), {
      total: 240, uruguay: 140, international: 100, global: 75, latam: 25,
      paysandu: 83, montevideo: 57, duplicates: 0, incomplete: 0,
      sourceHash: inspectDatabase(dbPath).sourceHash,
    });
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test("dos reconstrucciones producen el mismo contenido", () => {
  const directory = tempWorkspace();
  try {
    const dbPath = path.join(directory, "coframe.sqlite");
    buildDatabase({ dbPath });
    const first = contentHash(dbPath);
    buildDatabase({ dbPath });
    assert.equal(contentHash(dbPath), first);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test("columnas faltantes y filas incompletas no reemplazan la base anterior", () => {
  const directory = tempWorkspace();
  try {
    const dbPath = path.join(directory, "coframe.sqlite");
    const malformed = path.join(directory, "bad.csv");
    buildDatabase({ dbPath });
    const before = fileHash(dbPath);
    fs.writeFileSync(malformed, "ID_MARCA,NOMBRE_MARCA\nM-00001,Incompleta\n", "utf8");
    assert.throws(() => buildDatabase({ dbPath, uruguayCsv: malformed }), /Faltan columnas/);
    assert.equal(fileHash(dbPath), before);
    const original = fs.readFileSync(defaultUruguayCsv, "utf8");
    assert.equal(parseUruguayCsv(original).length, 140);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
