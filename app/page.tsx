import type { Metadata } from "next";
import { headers } from "next/headers";
import SolarSystemApp from "./SolarSystemApp";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
  const origin = host ? `${protocol}://${host}` : "http://localhost:3000";
  const title = "小小太阳系";
  const description = "为孩子准备的 3D 太阳系、公转自转、昼夜与日月食互动演示。";
  const imageUrl = `${origin}/og.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: imageUrl, width: 1536, height: 1024, alt: "小小太阳系互动演示" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function Home() {
  return <SolarSystemApp />;
}
