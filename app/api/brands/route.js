import { NextResponse } from "next/server";
import { createBrand, isDatabaseWritable } from "@/lib/brands-db";

export const runtime = "nodejs";

const READ_ONLY = { error: "La base solo se puede editar corriendo el proyecto en local." };

export async function POST() {
  if (!isDatabaseWritable()) return NextResponse.json(READ_ONLY, { status: 409 });
  try {
    return NextResponse.json({ row: createBrand() }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudo crear la marca." }, { status: 500 });
  }
}
