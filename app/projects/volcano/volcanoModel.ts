export type VolcanoStage = "melting" | "rising" | "eruption" | "cooling";

export type VolcanoOverlayState = {
  labels: boolean;
  arrows: boolean;
  cutaway: boolean;
  particles: boolean;
};

export type VolcanoHotspotId =
  | "asthenosphere"
  | "melt-zone"
  | "magma-chamber"
  | "fissure"
  | "pillow-lava";

export type Point3 = readonly [number, number, number];

export type StageDefinition = {
  id: VolcanoStage;
  label: string;
  shortLabel: string;
  description: string;
  fact: string;
  sceneLabel: string;
  cameraPosition: Point3;
  cameraTarget: Point3;
  defaultOverlays: VolcanoOverlayState;
};

const DEFAULT_OVERLAYS: VolcanoOverlayState = {
  labels: true,
  arrows: true,
  cutaway: true,
  particles: true,
};

export const STAGE_ORDER = [
  "melting",
  "rising",
  "eruption",
  "cooling",
] as const satisfies readonly VolcanoStage[];

export const STAGE_DEFINITIONS: Record<VolcanoStage, StageDefinition> = {
  melting: {
    id: "melting",
    label: "岩浆形成",
    shortLabel: "形成",
    description:
      "海底板块向两边分开，炽热的地幔岩石上涌；压力降低后，其中一小部分开始熔融。",
    fact: "岩浆不是从地核直接冒上来的，而是地幔岩石发生了部分熔融。",
    sceneLabel: "上涌时压力降低，部分岩石熔成岩浆",
    cameraPosition: [8.8, 1.2, 13.2],
    cameraTarget: [0, -2.65, 0],
    defaultOverlays: DEFAULT_OVERLAYS,
  },
  rising: {
    id: "rising",
    label: "聚集上升",
    shortLabel: "上升",
    description:
      "新形成的岩浆比周围岩石轻，先汇入岩浆储集区，再沿着板块裂隙继续向上。",
    fact: "裂隙像岩石里的通道，帮助岩浆从储集区移动到海床。",
    sceneLabel: "岩浆汇聚后，沿裂隙向海床移动",
    cameraPosition: [7.7, 2.3, 11.8],
    cameraTarget: [0, -1.05, 0],
    defaultOverlays: DEFAULT_OVERLAYS,
  },
  eruption: {
    id: "eruption",
    label: "海底喷发",
    shortLabel: "喷发",
    description:
      "玄武质岩浆从海床裂口挤出；深海压力很大，所以它常常安静流出，而不是形成巨大的灰柱。",
    fact: "海底喷发也可能很剧烈，但深水中的高压力常会抑制岩浆与海水的爆炸作用。",
    sceneLabel: "岩浆从裂口挤出，冷海水立刻包围它",
    cameraPosition: [6.5, 4.3, 9.7],
    cameraTarget: [0, 0.7, 0],
    defaultOverlays: DEFAULT_OVERLAYS,
  },
  cooling: {
    id: "cooling",
    label: "冷却成岩",
    shortLabel: "成岩",
    description:
      "熔岩外层被海水迅速冷却成硬壳，内部熔岩再次挤出，一层层堆成枕状熔岩。",
    fact: "反复喷出和冷却的玄武质熔岩，会在洋中脊不断制造新的海洋地壳。",
    sceneLabel: "外壳先变硬，内部熔岩继续挤出",
    cameraPosition: [6.9, 3.7, 9.5],
    cameraTarget: [0.35, 0.72, 0],
    defaultOverlays: DEFAULT_OVERLAYS,
  },
};

export const MAGMA_PATH: readonly Point3[] = [
  [-1.75, -5.35, 0.52],
  [-1.15, -4.62, 0.34],
  [-0.55, -3.86, 0.12],
  [0.12, -3.12, -0.08],
  [0.18, -2.35, 0],
  [-0.12, -1.62, 0.08],
  [-0.18, -0.74, 0.04],
  [0, 0.2, 0],
  [0, 1.18, 0],
];

export function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function loopingProgress(elapsed: number, duration: number) {
  if (!Number.isFinite(elapsed) || !Number.isFinite(duration) || duration <= 0) {
    return 0;
  }
  return ((elapsed % duration) + duration) % duration / duration;
}

export function magmaPathPosition(progress: number): Point3 {
  const clamped = clampProgress(progress);
  const scaled = clamped * (MAGMA_PATH.length - 1);
  const index = Math.min(MAGMA_PATH.length - 2, Math.floor(scaled));
  const localProgress = scaled - index;
  const easedProgress =
    localProgress * localProgress * (3 - 2 * localProgress);
  const start = MAGMA_PATH[index];
  const end = MAGMA_PATH[index + 1];

  return [
    start[0] + (end[0] - start[0]) * easedProgress,
    start[1] + (end[1] - start[1]) * easedProgress,
    start[2] + (end[2] - start[2]) * easedProgress,
  ];
}

export type EruptionState = {
  ventRise: number;
  lateralFlow: number;
  bubbleRise: number;
};

export function eruptionState(progress: number): EruptionState {
  const value = clampProgress(progress);
  return {
    ventRise: clampProgress(value / 0.28),
    lateralFlow: clampProgress((value - 0.2) / 0.55),
    bubbleRise: clampProgress((value - 0.12) / 0.7),
  };
}

export type PillowFormationState = {
  shellProgress: number;
  coreHeat: number;
  nextLobeProgress: number;
};

export function pillowFormationState(progress: number): PillowFormationState {
  const value = clampProgress(progress);
  const shellProgress = clampProgress(value / 0.32);
  const coolingAfterShell = clampProgress((value - 0.28) / 0.72);

  return {
    shellProgress,
    coreHeat: 1 - coolingAfterShell * 0.72,
    nextLobeProgress: clampProgress((value - 0.46) / 0.54),
  };
}
