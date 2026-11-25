import { Newsreader, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", display: "swap", weight: ["500", "600"] });

export const metadata = {
  title: "CoframeLab",
  description: "Herramienta interna de compatibilidad entre marcas.",
  applicationName: "CoframeLab",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.svg" },
  robots: { index: false, follow: false },
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#111111" };

export default function RootLayout({ children }) {
  return (
    <html lang="es-UY" className={`${outfit.variable} ${newsreader.variable}`}>
      <body>{children}</body>
    </html>
  );
}
