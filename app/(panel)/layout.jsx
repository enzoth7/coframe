import "./panel.css";
import Sidebar from "@/components/panel/sidebar";

export default function PanelLayout({ children }) {
  return (
    <div className="panel-shell">
      <Sidebar />
      <main className="panel-main">{children}</main>
    </div>
  );
}
