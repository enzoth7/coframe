import "./base.css";
import { getBrandTable, isDatabaseWritable } from "@/lib/brands-db";
import BrandTable from "@/components/base/brand-table";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Base de datos · CoframeLab",
  robots: { index: false, follow: false },
};

export default function BasePage() {
  const { rows, options, lists, parents } = getBrandTable();
  return (
    <div className="base">
      <h1 className="page-title">Base de marcas</h1>
      <BrandTable initialRows={rows} options={options} lists={lists} parents={parents} writable={isDatabaseWritable()} />
    </div>
  );
}
