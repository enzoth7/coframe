import { NextResponse } from "next/server";
import { BrandEditError, isDatabaseWritable, updateBrandField } from "@/lib/brands-db";

export const runtime = "nodejs";

export async function PATCH(request, { params }) {
  if (!isDatabaseWritable()) {
    return NextResponse.json({ error: "La base solo se puede editar corriendo el proyecto en local." }, { status: 409 });
  }
  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  try {
    const row = updateBrandField(id, body?.key, body?.value);
    return NextResponse.json({ row });
  } catch (error) {
    if (error instanceof BrandEditError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: "No se pudo guardar el cambio." }, { status: 500 });
  }
}
