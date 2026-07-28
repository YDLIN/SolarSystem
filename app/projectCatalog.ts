export type ProjectVisual =
  | "solar-system"
  | "seasons"
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
    slug: "seasons",
    title: "地球的四季",
    category: "天文 · 气候",
    index: "02",
    description:
      "拨动一整年，看地轴的倾斜如何改变照向中国的阳光。",
    visual: "seasons",
    status: "available",
    href: "/projects/seasons",
  },
  {
    slug: "volcano",
    title: "火山的形成",
    category: "地质",
    index: "03",
    description: "潜入深海，看岩浆如何形成、上升，并在海底创造新的岩石。",
    visual: "volcano",
    status: "available",
    href: "/projects/volcano",
  },
  {
    slug: "water-cycle",
    title: "水循环",
    category: "气候",
    index: "04",
    description: "一滴水的旅行，从云端到大海，然后再次出发。",
    visual: "water-cycle",
    status: "coming-soon",
  },
  {
    slug: "typhoon",
    title: "台风的形成",
    category: "气象",
    index: "05",
    description: "跟随风和海水，看一场巨大旋涡如何慢慢诞生。",
    visual: "typhoon",
    status: "available",
    href: "/projects/typhoon",
  },
] as const satisfies readonly ScienceProject[];
