import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#031018",
};

export default function TyphoonLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
