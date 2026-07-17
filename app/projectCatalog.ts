export type ProjectVisual =
  | "solar-system"
  | "volcano"
  | "water-cycle"
  | "typhoon";

type ProjectBase = {
  slug: string;
  title: string;
  category: string;
  index: string;
  description: string;
  visual: ProjectVisual;
};

export type AvailableProject = ProjectBase & {
  status: "available";
  href: string;
};

export type ComingSoonProject = ProjectBase & {
  status: "coming-soon";
  href?: never;
};

export type ScienceProject = AvailableProject | ComingSoonProject;

export const SCIENCE_PROJECTS = [
  {
    slug: "solar-system",
    title: "小小太阳系",
    category: "天文",
    index: "01",
    description:
      "从太阳出发，看八颗行星如何沿着自己的轨道，奔赴宇宙的下一站。",
    visual: "solar-system",
    status: "available",
    href: "/projects/solar-system",
  },
  {
    slug: "volcano",
    title: "火山的形成",
    category: "地质",
    index: "02",
    description: "地底的能量，如何一步步冲破岩层，奔向天空。",
    visual: "volcano",
    status: "coming-soon",
  },
  {
    slug: "water-cycle",
    title: "水循环",
    category: "气候",
    index: "03",
    description: "一滴水的旅行，从云端到大海，然后再次出发。",
    visual: "water-cycle",
    status: "coming-soon",
  },
  {
    slug: "typhoon",
    title: "台风的形成",
    category: "气象",
    index: "04",
    description: "跟随风和海水，看一场巨大旋涡如何慢慢诞生。",
    visual: "typhoon",
    status: "coming-soon",
  },
] as const satisfies readonly ScienceProject[];
