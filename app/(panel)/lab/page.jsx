import "./lab.css";
import { getActiveBrands, getModel } from "@/lib/brands-db";
import { buildLab } from "@/lib/sponsor-lab";
import LabView from "@/components/lab/lab-view";

// Se calcula en cada visita para reflejar las ediciones de la base y las marcas elegidas.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Lab · CoframeLab",
  robots: { index: false, follow: false },
};

export default async function LabPage({ searchParams }) {
  const { marcas } = await searchParams;
  const selectedIds = typeof marcas === "string" ? marcas.split(",").map((id) => id.trim()).filter(Boolean) : [];
  const lab = buildLab({ brands: getActiveBrands(), selectedIds, settings: getModel() });
  return <LabView key={lab.selectedIds.join(",")} lab={lab} />;
}
