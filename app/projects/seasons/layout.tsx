import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#07141f",
};

export default function SeasonsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
