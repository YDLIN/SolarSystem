import type { Metadata } from "next";
import { headers } from "next/headers";
import SeasonApp from "./SeasonApp";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");
  const origin = host ? `${protocol}://${host}` : "http://localhost:3000";
  const title = "地球的四季｜小小科学馆";
  const description =
    "拨动一年，观察地轴倾斜怎样改变照向中国的阳光，以及北京、广州和哈尔滨不同的四季。";
  const imageUrl = `${origin}/seasons-og.png`;

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
          alt: "地球的四季互动科普展厅",
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

export default function SeasonsPage() {
  return <SeasonApp />;
}
