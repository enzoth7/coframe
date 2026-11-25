import "./matriz.css";
import { getMatrices, getSettings, isDatabaseWritable } from "@/lib/brands-db";
import { MATRICES } from "@/lib/matrices";
import { weightShares } from "@/lib/weights";
import MatrixView from "@/components/matrix/matrix-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Matriz · CoframeLab",
  robots: { index: false, follow: false },
};

export default function MatrixPage() {
  const shares = weightShares(getSettings());
  const definitions = MATRICES.map(({ key, label, help, values, factor }) => ({ key, label, help, values, share: Math.round((shares[factor] || 0) * 1000) / 10 }));
  return (
    <div className="matrix-page">
      <h1 className="page-title">Matriz</h1>
      <MatrixView definitions={definitions} initialMatrices={getMatrices()} writable={isDatabaseWritable()} />
    </div>
  );
}
