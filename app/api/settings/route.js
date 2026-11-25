import { NextResponse } from "next/server";
import { isDatabaseWritable, saveSettings } from "@/lib/brands-db";

export const runtime = "nodejs";

export async function PUT(request) {
  if (!isDatabaseWritable()) {
    return NextResponse.json({ error: "Los ajustes solo se pueden cambiar corriendo el proyecto en local." }, { status: 409 });
  }
  try {
    const body = await request.json();
    return NextResponse.json({ settings: saveSettings(body) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudieron guardar los ajustes." }, { status: 400 });
  }
}
