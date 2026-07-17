import type { Metadata } from "next";
import { headers } from "next/headers";
import VolcanoApp from "./VolcanoApp";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");
  const origin = host ? `${protocol}://${host}` : "http://localhost:3000";
  const title = "火山的形成｜小小科学馆";
  const description =
    "为孩子准备的 3D 海底火山、岩浆形成、上升喷发与枕状熔岩互动演示。";
  const imageUrl = `${origin}/volcano-og.png`;

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
          alt: "火山的形成互动演示",
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

export default function VolcanoPage() {
  return <VolcanoApp />;
}
