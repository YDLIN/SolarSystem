import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050507",
};

export default function SolarSystemLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
