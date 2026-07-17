import type { Metadata } from "next";
import { headers } from "next/headers";
import TyphoonApp from "./TyphoonApp";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");
  const origin = host ? `${protocol}://${host}` : "http://localhost:3000";
  const title = "台风的形成｜小小科学馆";
  const description =
    "为孩子准备的 3D 台风形成、云团聚集、台风眼结构与西北太平洋典型路径互动演示。";
  const imageUrl = `${origin}/typhoon-og.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1536,
          height: 1024,
          alt: "台风的形成互动演示",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function TyphoonPage() {
  return <TyphoonApp />;
}
