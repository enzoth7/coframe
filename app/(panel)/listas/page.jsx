import "./listas.css";
import { getLists, isDatabaseWritable } from "@/lib/brands-db";
import ListsView from "@/components/lists/lists-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Listas · CoframeLab",
  robots: { index: false, follow: false },
};

export default function ListsPage() {
  return (
    <div className="lists">
      <h1 className="page-title">Listas</h1>
      <ListsView initialLists={getLists()} writable={isDatabaseWritable()} />
    </div>
  );
}
