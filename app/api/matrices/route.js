import { NextResponse } from "next/server";
import { BrandEditError, getMatrices, isDatabaseWritable, resetMatrix, setMatrixCell } from "@/lib/brands-db";

export const runtime = "nodejs";

async function handle(request, action) {
  if (!isDatabaseWritable()) {
    return NextResponse.json({ error: "Las matrices solo se pueden editar corriendo el proyecto en local." }, { status: 409 });
  }
  try {
    action(await request.json());
    return NextResponse.json({ matrices: getMatrices() });
  } catch (error) {
    if (error instanceof BrandEditError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: "No se pudo guardar el cambio." }, { status: 500 });
  }
}

// Cambiar una celda (value de 0 a 1). La matriz es simétrica: A×B y B×A son la misma celda.
export function PATCH(request) {
  return handle(request, ({ matrix, a, b, value }) => setMatrixCell(matrix, a, b, value));
}

// Volver una matriz a sus valores originales.
export function POST(request) {
  return handle(request, ({ matrix }) => resetMatrix(matrix));
}
