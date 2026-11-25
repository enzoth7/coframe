import { NextResponse } from "next/server";
import { BrandEditError, addListOption, deleteListOption, getLists, isDatabaseWritable, updateListDescription } from "@/lib/brands-db";

export const runtime = "nodejs";

const READ_ONLY = { error: "Las listas solo se pueden editar corriendo el proyecto en local." };

async function handle(request, action) {
  if (!isDatabaseWritable()) return NextResponse.json(READ_ONLY, { status: 409 });
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  try {
    action(body || {});
    return NextResponse.json({ lists: getLists() });
  } catch (error) {
    if (error instanceof BrandEditError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: "No se pudo guardar el cambio." }, { status: 500 });
  }
}

// Editar la descripción de una opción.
export function PATCH(request) {
  return handle(request, ({ list, value, description }) => updateListDescription(list, value, description));
}

// Agregar una opción a una lista que no entra en el cálculo.
export function POST(request) {
  return handle(request, ({ list, value, description, parent }) => addListOption(list, value, description, parent));
}

// Quitar una opción que ninguna marca usa.
export function DELETE(request) {
  return handle(request, ({ list, value }) => deleteListOption(list, value));
}
