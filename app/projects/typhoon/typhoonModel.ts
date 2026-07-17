export type TyphoonStage =
  | "warm-ocean"
  | "convection"
  | "clustering"
  | "rotation"
  | "eye"
  | "track";

export type TyphoonOverlayState = {
  labels: boolean;
  airflow: boolean;
  pressure: boolean;
  clouds: boolean;
  tracks: boolean;
};

export type TyphoonHotspotId =
  | "warm-pool"
  | "low-pressure"
  | "cumulonimbus"
  | "rainbands"
  | "eyewall"
  | "eye"
  | "subtropical-high";

export type TyphoonTrackKind = "westward" | "northwest" | "recurving";

export type TyphoonTrackPhase =
  | "disturbance"
  | "strengthening"
  | "mature"
  | "weakening";

export type Point3 = readonly [number, number, number];

export type TyphoonTrackPoint = {
  lat: number;
  lon: number;
  intensity: number;
  phase: TyphoonTrackPhase;
};

export type TyphoonStageDefinition = {
  id: TyphoonStage;
  label: string;
  shortLabel: string;
  duration: number;
  description: string;
  fact: string;
  sceneLabel: string;
  cameraPosition: Point3;
  cameraTarget: Point3;
};

export const STAGE_ORDER = [
  "warm-ocean",
  "convection",
  "clustering",
  "rotation",
  "eye",
  "track",
] as const satisfies readonly TyphoonStage[];

export const STAGE_DEFINITIONS: Record<
  TyphoonStage,
  TyphoonStageDefinition
> = {
  "warm-ocean": {
    id: "warm-ocean",
    label: "暖海蓄能",
    shortLabel: "暖海",
    duration: 6,
    description:
      "热带海洋像一块巨大的蓄能池。海面约 26.5°C 以上、暖水足够深时，才能持续提供热量和水汽。",
    fact: "暖海水只是台风的“燃料”之一；还需要原有扰动、充足水汽和较弱的垂直风切变。",
    sceneLabel: "暖海面不断向空气输送水汽和热量",
    cameraPosition: [10.5, 5.8, 13.8],
    cameraTarget: [0, 1.4, 0],
  },
  convection: {
    id: "convection",
    label: "水汽上升",
    shortLabel: "上升",
    duration: 8,
    description:
      "暖湿空气上升后冷却凝结，长成积雨云；凝结释放的热量又会帮助空气继续上升。",
    fact: "上升的空气让海面附近气压降低，四周空气开始向低压中心补充进来。",
    sceneLabel: "水汽冷却凝结，雷暴云塔向上生长",
    cameraPosition: [9.6, 7.2, 12.8],
    cameraTarget: [0, 2.7, 0],
  },
  clustering: {
    id: "clustering",
    label: "云团聚集",
    shortLabel: "聚云",
    duration: 10,
    description:
      "分散的雷暴云团被低压中心吸引，逐渐靠拢、增厚，并形成低层流入和高层外流。",
    fact: "云变多并不等于台风已经形成；云团还要建立起持续、有组织的环流。",
    sceneLabel: "雷暴云团向低压中心汇聚并彼此合并",
    cameraPosition: [8.4, 10.2, 13.2],
    cameraTarget: [0, 3, 0],
  },
  rotation: {
    id: "rotation",
    label: "旋转成涡",
    shortLabel: "旋转",
    duration: 10,
    description:
      "北半球汇聚的空气受到地球自转偏向作用，逐渐组织成逆时针旋转的热带气旋。",
    fact: "地球自转偏向作用不会凭空制造台风，但能帮助流向中心的空气建立有组织的旋转。",
    sceneLabel: "低压更集中，螺旋云雨带逐渐成形",
    cameraPosition: [6.2, 13.2, 12.2],
    cameraTarget: [0, 2.6, 0],
  },
  eye: {
    id: "eye",
    label: "台风眼成形",
    shortLabel: "风眼",
    duration: 12,
    description:
      "环流继续增强，中心空气下沉、云层减少；强烈上升的眼墙和外围螺旋雨带变得清晰。",
    fact: "眼内相对平静，最猛烈的风雨却集中在周围眼墙；并非每个热带气旋都有清晰的眼。",
    sceneLabel: "台风眼、眼墙与螺旋雨带组成成熟结构",
    cameraPosition: [0.8, 17.6, 5.4],
    cameraTarget: [0, 2.4, 0],
  },
  track: {
    id: "track",
    label: "地球上的移动",
    shortLabel: "路径",
    duration: 14,
    description:
      "台风会被大范围环境气流引导。西北太平洋常见西行、西北行和转向东北三类典型路径。",
    fact: "路径不是固定轨道，也不是实时预报；登陆点不一定是风雨影响最严重的地方。",
    sceneLabel: "副热带高压和西风等环境气流共同引导路径",
    cameraPosition: [0, 1.6, 15.6],
    cameraTarget: [0, 0, 0],
  },
};

export const TOTAL_DURATION = STAGE_ORDER.reduce(
  (total, stage) => total + STAGE_DEFINITIONS[stage].duration,
  0,
);

export const DEFAULT_OVERLAYS: TyphoonOverlayState = {
  labels: true,
  airflow: true,
  pressure: true,
  clouds: true,
  tracks: true,
};

export const TYPHOON_TRACKS: Record<
  TyphoonTrackKind,
  readonly TyphoonTrackPoint[]
> = {
  westward: [
    { lat: 14, lon: 145, intensity: 0.2, phase: "disturbance" },
    { lat: 15, lon: 136, intensity: 0.55, phase: "strengthening" },
    { lat: 16.5, lon: 126, intensity: 1, phase: "mature" },
    { lat: 18, lon: 117, intensity: 0.72, phase: "mature" },
    { lat: 18, lon: 112, intensity: 0.28, phase: "weakening" },
  ],
  northwest: [
    { lat: 14, lon: 145, intensity: 0.2, phase: "disturbance" },
    { lat: 16, lon: 138, intensity: 0.54, phase: "strengthening" },
    { lat: 19, lon: 131, intensity: 1, phase: "mature" },
    { lat: 22, lon: 125, intensity: 0.82, phase: "mature" },
    { lat: 25, lon: 120, intensity: 0.3, phase: "weakening" },
  ],
  recurving: [
    { lat: 14, lon: 150, intensity: 0.2, phase: "disturbance" },
    { lat: 18, lon: 142, intensity: 0.58, phase: "strengthening" },
    { lat: 25, lon: 135, intensity: 1, phase: "mature" },
    { lat: 32, lon: 139, intensity: 0.68, phase: "weakening" },
    { lat: 38, lon: 150, intensity: 0.22, phase: "weakening" },
  ],
};

export function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function stageStartTime(stage: TyphoonStage) {
  let elapsed = 0;
  for (const item of STAGE_ORDER) {
    if (item === stage) return elapsed;
    elapsed += STAGE_DEFINITIONS[item].duration;
  }
  return elapsed;
}

export function timelineState(elapsedSeconds: number) {
  const elapsed = Math.min(
    TOTAL_DURATION,
    Math.max(0, Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0),
  );
  let cursor = 0;

  for (const stage of STAGE_ORDER) {
    const definition = STAGE_DEFINITIONS[stage];
    const stageEnd = cursor + definition.duration;
    if (elapsed < stageEnd || stage === "track") {
      return {
        stage,
        stageProgress: clampProgress((elapsed - cursor) / definition.duration),
        totalProgress: clampProgress(elapsed / TOTAL_DURATION),
      };
    }
    cursor = stageEnd;
  }

  return { stage: "track" as const, stageProgress: 1, totalProgress: 1 };
}

export function cloudFormationState(
  stage: TyphoonStage,
  stageProgress: number,
) {
  const progress = clampProgress(stageProgress);
  const index = STAGE_ORDER.indexOf(stage);
  const baseDensity = [0.07, 0.2, 0.48, 0.76, 1, 1][index];
  const nextDensity = [0.2, 0.48, 0.76, 1, 1, 1][index];
  const density = baseDensity + (nextDensity - baseDensity) * progress;
  const organization =
    stage === "clustering"
      ? 0.15 + progress * 0.35
      : stage === "rotation"
        ? 0.5 + progress * 0.42
        : stage === "eye" || stage === "track"
          ? 1
          : 0.08 + index * 0.08;

  return {
    density,
    organization,
    towerHeight:
      stage === "warm-ocean"
        ? 0.12
        : Math.min(1, 0.26 + index * 0.18 + progress * 0.16),
    rotationSpeed:
      stage === "rotation"
        ? 0.08 + progress * 0.22
        : stage === "eye" || stage === "track"
          ? 0.34
          : 0.02 + index * 0.018,
  };
}

export function eyeFormationState(stage: TyphoonStage, stageProgress: number) {
  const progress = clampProgress(stageProgress);
  const eyeOpening =
    stage === "eye"
      ? clampProgress((progress - 0.12) / 0.72)
      : stage === "track"
        ? 1
        : 0;

  return {
    eyeOpening,
    eyeRadius: 0.22 + eyeOpening * 1.52,
    eyewallIntensity:
      stage === "eye"
        ? 0.55 + progress * 0.45
        : stage === "track"
          ? 1
          : 0.18,
  };
}

export function tangentialWindVector(x: number, z: number) {
  const length = Math.hypot(x, z);
  if (!Number.isFinite(length) || length === 0) return [0, 0] as const;
  const tangentX = -z / length;
  const tangentZ = x / length;
  return [
    Object.is(tangentX, -0) ? 0 : tangentX,
    Object.is(tangentZ, -0) ? 0 : tangentZ,
  ] as const;
}

export function latLonToCartesian(
  lat: number,
  lon: number,
  radius = 1,
): Point3 {
  const latitude = (lat * Math.PI) / 180;
  // Rotate the teaching globe so the western Pacific faces the opening camera.
  const longitude = ((lon - 45) * Math.PI) / 180;
  const horizontalRadius = Math.cos(latitude) * radius;
  return [
    horizontalRadius * Math.cos(longitude),
    Math.sin(latitude) * radius,
    horizontalRadius * Math.sin(longitude),
  ];
}

function cartesianToLatLon(point: Point3) {
  const radius = Math.hypot(point[0], point[1], point[2]) || 1;
  return {
    lat: (Math.asin(point[1] / radius) * 180) / Math.PI,
    lon: (Math.atan2(point[2], point[0]) * 180) / Math.PI + 45,
  };
}

function slerpPoint(start: Point3, end: Point3, progress: number): Point3 {
  const dot = Math.min(
    1,
    Math.max(
      -1,
      start[0] * end[0] + start[1] * end[1] + start[2] * end[2],
    ),
  );
  const angle = Math.acos(dot);
  if (angle < 1e-6) return start;
  const sine = Math.sin(angle);
  const startWeight = Math.sin((1 - progress) * angle) / sine;
  const endWeight = Math.sin(progress * angle) / sine;
  return [
    start[0] * startWeight + end[0] * endWeight,
    start[1] * startWeight + end[1] * endWeight,
    start[2] * startWeight + end[2] * endWeight,
  ];
}

export function trackPosition(
  kind: TyphoonTrackKind,
  progress: number,
  radius = 1,
) {
  const track = TYPHOON_TRACKS[kind];
  const clamped = clampProgress(progress);
  const scaled = clamped * (track.length - 1);
  const index = Math.min(track.length - 2, Math.floor(scaled));
  const localProgress = scaled - index;
  const eased = localProgress * localProgress * (3 - 2 * localProgress);
  const start = track[index];
  const end = track[index + 1];
  const unitPoint = slerpPoint(
    latLonToCartesian(start.lat, start.lon),
    latLonToCartesian(end.lat, end.lon),
    eased,
  );
  const length = Math.hypot(unitPoint[0], unitPoint[1], unitPoint[2]) || 1;
  const position = unitPoint.map((value) => (value / length) * radius) as [
    number,
    number,
    number,
  ];

  return {
    position,
    ...cartesianToLatLon(position),
    intensity:
      start.intensity + (end.intensity - start.intensity) * eased,
    phase: localProgress < 0.5 ? start.phase : end.phase,
  };
}
