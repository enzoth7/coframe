import "./ajustes.css";
import { getSettings, isDatabaseWritable } from "@/lib/brands-db";
import SettingsView from "@/components/settings/settings-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ajustes · CoframeLab",
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return (
    <div className="settings">
      <h1 className="page-title">Ajustes</h1>
      <SettingsView initialSettings={getSettings()} writable={isDatabaseWritable()} />
    </div>
  );
}
