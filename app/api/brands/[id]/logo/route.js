import { NextResponse } from "next/server";
import { BrandEditError, deleteLogo, getLogo, isDatabaseWritable, saveLogo } from "@/lib/brands-db";

export const runtime = "nodejs";

const READ_ONLY = { error: "La base solo se puede editar corriendo el proyecto en local." };

export async function GET(request, { params }) {
  const { id } = await params;
  const logo = getLogo(id);
  if (!logo) return new NextResponse(null, { status: 404 });
  const versioned = new URL(request.url).searchParams.has("v");
  return new NextResponse(logo.data, {
    headers: {
      "Content-Type": logo.mime,
      "Cache-Control": versioned ? "public, max-age=31536000, immutable" : "no-cache",
      // Un SVG abierto directo no puede ejecutar scripts.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request, { params }) {
  if (!isDatabaseWritable()) return NextResponse.json(READ_ONLY, { status: 409 });
  const { id } = await params;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function") throw new BrandEditError("Elegí un archivo de imagen.");
    const logo = saveLogo(id, Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ logo });
  } catch (error) {
    if (error instanceof BrandEditError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: "No se pudo guardar el logo." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  if (!isDatabaseWritable()) return NextResponse.json(READ_ONLY, { status: 409 });
  const { id } = await params;
  deleteLogo(id);
  return NextResponse.json({ logo: null });
}
