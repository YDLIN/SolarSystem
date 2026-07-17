import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#06141c",
};

export default function VolcanoLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
