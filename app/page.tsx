import type { Metadata } from "next";
import SolarSystemApp from "./SolarSystemApp";

export const metadata: Metadata = {
  title: "小小太阳系",
  description: "为孩子准备的 3D 太阳系、公转自转、昼夜与日月食互动演示。",
};

export default function Home() {
  return <SolarSystemApp />;
}
