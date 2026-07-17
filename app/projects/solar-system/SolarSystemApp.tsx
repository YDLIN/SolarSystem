"use client";

import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls, Stars } from "@react-three/drei";
import {
  ArrowLeft,
  Maximize,
  Moon,
  Orbit,
  Pause,
  Play,
  Rotate3D,
  RotateCcw,
  Settings,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject, RefObject } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import LightStream from "./LightStream";
import {
  ECLIPSE_LAYOUT,
  eclipseObservationState,
  eclipseOrbitPosition,
  eclipseTargetPhase,
  nextForwardEclipsePhase,
} from "./eclipseGeometry";
import type { EclipseKind } from "./eclipseGeometry";
import {
  orbitPositionFromEccentricAnomaly,
  orbitPositionFromMeanAnomaly,
  orbitTangentFromEccentricAnomaly,
} from "./planetOrbit";
import type { PlanetOrbitElements } from "./planetOrbit";

export type Mode =
  | "motion"
  | "day-night"
  | "solar-eclipse"
  | "lunar-eclipse";

export type OverlayState = {
  orbits: boolean;
  labels: boolean;
  arrows: boolean;
  light: boolean;
  moon: boolean;
};

type OverlayKey = keyof OverlayState;

const OVERLAY_OPTIONS: Record<OverlayKey, { id: string; label: string }> = {
  orbits: { id: "toggle-orbits", label: "轨道" },
  labels: { id: "toggle-labels", label: "名称标签" },
  arrows: { id: "toggle-arrows", label: "运动箭头" },
  light: { id: "toggle-light", label: "阳光与影子" },
  moon: { id: "toggle-moon", label: "月球" },
};

const MODE_OVERLAYS: Record<Mode, OverlayKey[]> = {
  motion: ["orbits", "labels", "arrows", "moon"],
  "day-night": ["labels", "light"],
  "solar-eclipse": ["orbits", "labels", "light"],
  "lunar-eclipse": ["orbits", "labels", "light"],
};

export type CelestialBody = {
  id: string;
  name: string;
  radius: number;
  orbitRadius: number;
  orbitPeriod: number;
  rotationSpeed: number;
  axialTilt: number;
  orbitTilt: number;
  orbitEccentricity: number;
  orbitAscendingNode: number;
  orbitPerihelionLongitude: number;
  rotationDirection: 1 | -1;
  color: string;
  accent: string;
  texture: "rock" | "cloud" | "ocean" | "desert" | "gas" | "ice" | "sun";
  fact: string;
  ring?: "major" | "minor";
};

const SUN: CelestialBody = {
  id: "sun",
  name: "太阳",
  radius: 2.25,
  orbitRadius: 0,
  orbitPeriod: 0,
  rotationSpeed: 0.08,
  axialTilt: 7.25,
  orbitTilt: 0,
  orbitEccentricity: 0,
  orbitAscendingNode: 0,
  orbitPerihelionLongitude: 0,
  rotationDirection: 1,
  color: "#ffb229",
  accent: "#fff0a5",
  texture: "sun",
  fact: "太阳是一颗会自己发光、发热的恒星。",
};

const PLANETS: CelestialBody[] = [
  // J2000 approximate orbital elements:
  // https://ssd.jpl.nasa.gov/planets/approx_pos.html
  {
    id: "mercury",
    name: "水星",
    radius: 0.38,
    orbitRadius: 4.2,
    orbitPeriod: 0.38,
    rotationSpeed: 0.04,
    axialTilt: 0.03,
    orbitTilt: 7.00497902,
    orbitEccentricity: 0.20563593,
    orbitAscendingNode: 48.33076593,
    orbitPerihelionLongitude: 77.45779628,
    rotationDirection: 1,
    color: "#9f9487",
    accent: "#d8c8b2",
    texture: "rock",
    fact: "水星离太阳最近，也是八大行星里最小的一颗。",
  },
  {
    id: "venus",
    name: "金星",
    radius: 0.58,
    orbitRadius: 5.7,
    orbitPeriod: 0.62,
    rotationSpeed: 0.018,
    axialTilt: 177.4,
    orbitTilt: 3.39467605,
    orbitEccentricity: 0.00677672,
    orbitAscendingNode: 76.67984255,
    orbitPerihelionLongitude: 131.60246718,
    rotationDirection: -1,
    color: "#d79a55",
    accent: "#ffe0a1",
    texture: "cloud",
    fact: "金星裹着厚厚的云，是太阳系里最热的行星。",
  },
  {
    id: "earth",
    name: "地球",
    radius: 0.64,
    orbitRadius: 7.4,
    orbitPeriod: 1,
    rotationSpeed: 0.34,
    axialTilt: 23.4,
    orbitTilt: 0,
    orbitEccentricity: 0.01671123,
    orbitAscendingNode: 0,
    orbitPerihelionLongitude: 102.93768193,
    rotationDirection: 1,
    color: "#2d78b9",
    accent: "#78c987",
    texture: "ocean",
    fact: "地球有海洋、空气和生命，是我们的家。",
  },
  {
    id: "mars",
    name: "火星",
    radius: 0.48,
    orbitRadius: 9.1,
    orbitPeriod: 1.52,
    rotationSpeed: 0.32,
    axialTilt: 25.2,
    orbitTilt: 1.84969142,
    orbitEccentricity: 0.0933941,
    orbitAscendingNode: 49.55953891,
    orbitPerihelionLongitude: -23.94362959,
    rotationDirection: 1,
    color: "#b95032",
    accent: "#ed9368",
    texture: "desert",
    fact: "火星表面有很多铁锈，所以看起来红红的。",
  },
  {
    id: "jupiter",
    name: "木星",
    radius: 1.28,
    orbitRadius: 12,
    orbitPeriod: 2.6,
    rotationSpeed: 0.72,
    axialTilt: 3.1,
    orbitTilt: 1.30439695,
    orbitEccentricity: 0.04838624,
    orbitAscendingNode: 100.47390909,
    orbitPerihelionLongitude: 14.72847983,
    rotationDirection: 1,
    color: "#c89a70",
    accent: "#f2d0a7",
    texture: "gas",
    fact: "木星是最大的行星，里面有一场巨大的红色风暴。",
  },
  {
    id: "saturn",
    name: "土星",
    radius: 1.06,
    orbitRadius: 14.9,
    orbitPeriod: 3.4,
    rotationSpeed: 0.66,
    axialTilt: 26.7,
    orbitTilt: 2.48599187,
    orbitEccentricity: 0.05386179,
    orbitAscendingNode: 113.66242448,
    orbitPerihelionLongitude: 92.59887831,
    rotationDirection: 1,
    color: "#d9bd7f",
    accent: "#f2e2b0",
    texture: "gas",
    fact: "土星有一圈明亮的环，它们由冰块和小石头组成。",
    ring: "major",
  },
  {
    id: "uranus",
    name: "天王星",
    radius: 0.82,
    orbitRadius: 17.4,
    orbitPeriod: 4.1,
    rotationSpeed: 0.44,
    axialTilt: 97.8,
    orbitTilt: 0.77263783,
    orbitEccentricity: 0.04725744,
    orbitAscendingNode: 74.01692503,
    orbitPerihelionLongitude: 170.9542763,
    rotationDirection: -1,
    color: "#76cbd1",
    accent: "#c1f2ee",
    texture: "ice",
    fact: "天王星像躺在轨道上滚动，自转姿势很特别。",
    ring: "minor",
  },
  {
    id: "neptune",
    name: "海王星",
    radius: 0.79,
    orbitRadius: 19.8,
    orbitPeriod: 4.8,
    rotationSpeed: 0.46,
    axialTilt: 28.3,
    orbitTilt: 1.77004347,
    orbitEccentricity: 0.00859048,
    orbitAscendingNode: 131.78422574,
    orbitPerihelionLongitude: 44.96476227,
    rotationDirection: 1,
    color: "#315dc7",
    accent: "#7da3ff",
    texture: "ice",
    fact: "海王星离太阳最远，那里刮着非常快的大风。",
  },
];

const MOON: CelestialBody = {
  id: "moon",
  name: "月球",
  radius: 0.42,
  orbitRadius: 2.5,
  orbitPeriod: 1,
  rotationSpeed: 0.08,
  axialTilt: 6.7,
  orbitTilt: 5.1,
  orbitEccentricity: 0,
  orbitAscendingNode: 0,
  orbitPerihelionLongitude: 0,
  rotationDirection: 1,
  color: "#9b9a96",
  accent: "#d8d5cc",
  texture: "rock",
  fact: "月球是地球的伙伴，它绕着地球公转。",
};

const MODES: Array<{
  id: Mode;
  label: string;
  shortLabel: string;
  description: string;
  icon: typeof Orbit;
}> = [
  {
    id: "motion",
    label: "公转与自转",
    shortLabel: "转动",
    description: "行星一边自转，一边沿着各自倾斜的椭圆轨道绕太阳公转。",
    icon: Rotate3D,
  },
  {
    id: "day-night",
    label: "白天与黑夜",
    shortLabel: "昼夜",
    description: "“我们这里”面向太阳时是白天，转到背面后就是黑夜。",
    icon: Sun,
  },
  {
    id: "solar-eclipse",
    label: "日食",
    shortLabel: "日食",
    description: "月球走到太阳和地球中间，挡住一部分阳光，就会发生日食。",
    icon: Orbit,
  },
  {
    id: "lunar-eclipse",
    label: "月食",
    shortLabel: "月食",
    description: "月球走进地球背后的影子里，就会发生月食。",
    icon: Moon,
  },
];

function seededRandom(seedText: string) {
  let seed = Array.from(seedText).reduce((sum, char) => sum + char.charCodeAt(0), 0) || 1;
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

type BodyTextures = {
  map: THREE.CanvasTexture;
  bumpMap?: THREE.CanvasTexture;
  emissiveMap?: THREE.CanvasTexture;
  cloudMap?: THREE.CanvasTexture;
};

const EARTH_CONTINENTS: Array<Array<[number, number]>> = [
  [[0.06, 0.21], [0.12, 0.13], [0.21, 0.11], [0.27, 0.18], [0.25, 0.29], [0.2, 0.35], [0.18, 0.47], [0.12, 0.44], [0.09, 0.34]],
  [[0.21, 0.49], [0.27, 0.52], [0.3, 0.62], [0.28, 0.75], [0.23, 0.88], [0.2, 0.76], [0.18, 0.62]],
  [[0.43, 0.2], [0.52, 0.13], [0.65, 0.15], [0.72, 0.22], [0.83, 0.2], [0.92, 0.3], [0.87, 0.39], [0.75, 0.36], [0.67, 0.45], [0.57, 0.4], [0.5, 0.31], [0.43, 0.3]],
  [[0.48, 0.4], [0.57, 0.38], [0.63, 0.47], [0.61, 0.66], [0.55, 0.79], [0.49, 0.69], [0.45, 0.52]],
  [[0.82, 0.59], [0.9, 0.57], [0.95, 0.65], [0.92, 0.75], [0.84, 0.77], [0.79, 0.68]],
  [[0.31, 0.08], [0.36, 0.05], [0.4, 0.1], [0.37, 0.18], [0.31, 0.16]],
  [[0, 0.91], [0.16, 0.88], [0.34, 0.92], [0.52, 0.89], [0.7, 0.92], [0.87, 0.88], [1, 0.91], [1, 1], [0, 1]],
];

function drawEarthContinents(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  fillStyle: string | CanvasGradient,
) {
  context.fillStyle = fillStyle;
  context.strokeStyle = "rgba(220, 236, 189, 0.42)";
  context.lineWidth = Math.max(1, width / 900);
  EARTH_CONTINENTS.forEach((continent) => {
    context.beginPath();
    continent.forEach(([x, y], index) => {
      if (index === 0) context.moveTo(x * width, y * height);
      else context.lineTo(x * width, y * height);
    });
    context.closePath();
    context.fill();
    context.stroke();
  });
}

function createEarthTextures(): BodyTextures | null {
  const width = 1024;
  const height = 512;
  const surface = document.createElement("canvas");
  const elevation = document.createElement("canvas");
  const night = document.createElement("canvas");
  const clouds = document.createElement("canvas");
  surface.width = elevation.width = night.width = clouds.width = width;
  surface.height = elevation.height = night.height = clouds.height = height;
  const surfaceContext = surface.getContext("2d");
  const elevationContext = elevation.getContext("2d");
  const nightContext = night.getContext("2d");
  const cloudContext = clouds.getContext("2d");
  if (!surfaceContext || !elevationContext || !nightContext || !cloudContext) return null;

  const random = seededRandom("earth-realistic-v2");
  const oceanGradient = surfaceContext.createLinearGradient(0, 0, 0, height);
  oceanGradient.addColorStop(0, "#163f73");
  oceanGradient.addColorStop(0.35, "#0c5c91");
  oceanGradient.addColorStop(0.68, "#0878a2");
  oceanGradient.addColorStop(1, "#12395f");
  surfaceContext.fillStyle = oceanGradient;
  surfaceContext.fillRect(0, 0, width, height);

  for (let index = 0; index < 2800; index += 1) {
    const latitude = random() * height;
    surfaceContext.globalAlpha = 0.025 + random() * 0.055;
    surfaceContext.fillStyle = random() > 0.45 ? "#8ee8ef" : "#042e5d";
    surfaceContext.fillRect(random() * width, latitude, 1 + random() * 4, 1 + random() * 2);
  }

  const landGradient = surfaceContext.createLinearGradient(0, height * 0.1, 0, height * 0.9);
  landGradient.addColorStop(0, "#66875d");
  landGradient.addColorStop(0.45, "#77a85f");
  landGradient.addColorStop(0.67, "#8a8e51");
  landGradient.addColorStop(1, "#4f7558");
  surfaceContext.globalAlpha = 1;
  drawEarthContinents(surfaceContext, width, height, landGradient);

  for (let index = 0; index < 1100; index += 1) {
    const x = random() * width;
    const y = random() * height;
    const pixel = surfaceContext.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    if (pixel[1] > pixel[2] * 0.72 && pixel[0] > 45) {
      surfaceContext.globalAlpha = 0.08 + random() * 0.18;
      surfaceContext.fillStyle = random() > 0.65 ? "#d2c17a" : "#284c32";
      surfaceContext.beginPath();
      surfaceContext.arc(x, y, 1 + random() * 5, 0, Math.PI * 2);
      surfaceContext.fill();
    }
  }

  surfaceContext.globalAlpha = 0.94;
  surfaceContext.fillStyle = "#e6f2ee";
  surfaceContext.fillRect(0, 0, width, 18);
  surfaceContext.fillRect(0, height - 20, width, 20);
  surfaceContext.globalAlpha = 0.22;
  surfaceContext.fillStyle = "#c8f1ff";
  surfaceContext.fillRect(0, 18, width, 12);
  surfaceContext.fillRect(0, height - 32, width, 12);

  elevationContext.fillStyle = "#202020";
  elevationContext.fillRect(0, 0, width, height);
  elevationContext.globalAlpha = 1;
  drawEarthContinents(elevationContext, width, height, "#c7c7c7");
  elevationContext.fillStyle = "#f3f3f3";
  elevationContext.fillRect(0, 0, width, 16);
  elevationContext.fillRect(0, height - 18, width, 18);

  nightContext.fillStyle = "#000";
  nightContext.fillRect(0, 0, width, height);
  nightContext.fillStyle = "#ffd36b";
  nightContext.shadowColor = "#ff9d35";
  nightContext.shadowBlur = 8;
  const lightClusters: Array<[number, number, number, number]> = [
    [0.18, 0.29, 0.1, 0.11], [0.24, 0.56, 0.06, 0.13], [0.5, 0.27, 0.14, 0.1],
    [0.58, 0.48, 0.08, 0.14], [0.72, 0.27, 0.17, 0.12], [0.86, 0.64, 0.1, 0.08],
  ];
  lightClusters.forEach(([cx, cy, spreadX, spreadY]) => {
    for (let index = 0; index < 72; index += 1) {
      nightContext.globalAlpha = 0.2 + random() * 0.8;
      const x = (cx + (random() - 0.5) * spreadX) * width;
      const y = (cy + (random() - 0.5) * spreadY) * height;
      nightContext.fillRect(x, y, 0.8 + random() * 1.8, 0.8 + random() * 1.8);
    }
  });

  cloudContext.clearRect(0, 0, width, height);
  cloudContext.lineCap = "round";
  for (let index = 0; index < 52; index += 1) {
    const y = 28 + random() * (height - 56);
    const startX = -80 + random() * width;
    cloudContext.globalAlpha = 0.12 + random() * 0.34;
    cloudContext.strokeStyle = random() > 0.18 ? "#ffffff" : "#d5edf5";
    cloudContext.lineWidth = 5 + random() * 14;
    cloudContext.beginPath();
    cloudContext.moveTo(startX, y);
    cloudContext.bezierCurveTo(
      startX + 70 + random() * 90,
      y - 28 + random() * 56,
      startX + 180 + random() * 120,
      y - 22 + random() * 44,
      startX + 280 + random() * 150,
      y + (random() - 0.5) * 36,
    );
    cloudContext.stroke();
  }

  const toTexture = (canvas: HTMLCanvasElement) => {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    return texture;
  };

  return {
    map: toTexture(surface),
    bumpMap: toTexture(elevation),
    emissiveMap: toTexture(night),
    cloudMap: toTexture(clouds),
  };
}

function createBodyTextures(body: CelestialBody): BodyTextures | null {
  if (body.id === "earth") return createEarthTextures();
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const random = seededRandom(body.id);
  context.fillStyle = body.color;
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (body.texture === "gas" || body.texture === "ice" || body.texture === "cloud") {
    for (let y = 0; y < canvas.height; y += 12) {
      context.globalAlpha = 0.13 + random() * 0.18;
      context.fillStyle = random() > 0.5 ? body.accent : "#ffffff";
      context.fillRect(0, y + random() * 5, canvas.width, 4 + random() * 7);
    }
    if (body.id === "jupiter") {
      context.globalAlpha = 0.82;
      context.fillStyle = "#a94f36";
      context.beginPath();
      context.ellipse(370, 155, 42, 18, -0.12, 0, Math.PI * 2);
      context.fill();
    }
  }

  if (body.texture === "rock" || body.texture === "desert") {
    for (let index = 0; index < 76; index += 1) {
      const radius = 2 + random() * 12;
      context.globalAlpha = 0.1 + random() * 0.25;
      context.fillStyle = random() > 0.52 ? body.accent : "#352f2a";
      context.beginPath();
      context.arc(random() * 512, random() * 256, radius, 0, Math.PI * 2);
      context.fill();
    }
  }

  if (body.texture === "ocean") {
    context.globalAlpha = 0.96;
    context.fillStyle = body.accent;
    for (let index = 0; index < 18; index += 1) {
      const x = random() * 512;
      const y = 28 + random() * 200;
      context.beginPath();
      context.ellipse(x, y, 16 + random() * 38, 7 + random() * 21, random(), 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 0.34;
    context.strokeStyle = "#ffffff";
    context.lineWidth = 5;
    for (let index = 0; index < 9; index += 1) {
      const y = random() * 256;
      context.beginPath();
      context.moveTo(0, y);
      context.bezierCurveTo(130, y - 24, 340, y + 28, 512, y - 3);
      context.stroke();
    }
  }

  if (body.texture === "sun") {
    for (let index = 0; index < 180; index += 1) {
      context.globalAlpha = 0.08 + random() * 0.18;
      context.fillStyle = random() > 0.45 ? body.accent : "#f56f24";
      context.beginPath();
      context.arc(random() * 512, random() * 256, 3 + random() * 13, 0, Math.PI * 2);
      context.fill();
    }
  }

  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return { map: texture };
}

function RotationIndicator({
  radius,
  playing,
  speed,
  direction,
}: {
  radius: number;
  playing: boolean;
  speed: number;
  direction: 1 | -1;
}) {
  const indicatorRef = useRef<THREE.Group>(null);
  const curve = useMemo(() => {
    const points = Array.from({ length: 42 }, (_, index) => {
      const startAngle = direction * Math.PI * 0.82;
      const angle = startAngle - direction * (index / 41) * Math.PI * 1.62;
      return new THREE.Vector3(Math.cos(angle) * radius * 1.36, 0, Math.sin(angle) * radius * 1.36);
    });
    return new THREE.CatmullRomCurve3(points);
  }, [direction, radius]);
  const arrowPosition = useMemo(() => curve.getPoint(1), [curve]);
  const arrowTangent = useMemo(() => curve.getTangent(1), [curve]);
  const arrowQuaternion = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), arrowTangent),
    [arrowTangent],
  );

  useFrame((_, delta) => {
    if (indicatorRef.current && playing) {
      indicatorRef.current.rotation.y += delta * 0.62 * speed * direction;
    }
  });

  return (
    <group ref={indicatorRef} rotation={[0.18, 0, -0.12]}>
      <mesh>
        <tubeGeometry args={[curve, 64, Math.max(0.018, radius * 0.026), 8, false]} />
        <meshBasicMaterial color="#a0fff0" transparent opacity={0.94} toneMapped={false} />
      </mesh>
      <mesh>
        <tubeGeometry args={[curve, 64, Math.max(0.05, radius * 0.072), 8, false]} />
        <meshBasicMaterial
          color="#38d9c0"
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={arrowPosition} quaternion={arrowQuaternion}>
        <coneGeometry args={[Math.max(0.075, radius * 0.11), Math.max(0.2, radius * 0.3), 20]} />
        <meshBasicMaterial color="#c5fff5" toneMapped={false} />
      </mesh>
      <mesh position={curve.getPoint(0.48)}>
        <sphereGeometry args={[Math.max(0.04, radius * 0.055), 16, 12]} />
        <meshBasicMaterial
          color="#ffffff"
          blending={THREE.AdditiveBlending}
          transparent
          opacity={0.88}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

type BodyProps = {
  body: CelestialBody;
  labels?: boolean;
  arrows?: boolean;
  marker?: boolean;
  interactive?: boolean;
  selected?: boolean;
  onSelect?: (body: CelestialBody) => void;
  speed: number;
  playing: boolean;
  scale?: number;
};

function CelestialSphere({
  body,
  labels = true,
  arrows = false,
  marker = false,
  interactive = false,
  selected = false,
  onSelect,
  speed,
  playing,
  scale = 1,
}: BodyProps) {
  const spinRef = useRef<THREE.Group>(null);
  const textures = useMemo(() => createBodyTextures(body), [body]);
  const radius = body.radius * scale;

  useEffect(
    () => () => {
      textures?.map.dispose();
      textures?.bumpMap?.dispose();
      textures?.emissiveMap?.dispose();
      textures?.cloudMap?.dispose();
    },
    [textures],
  );

  useFrame((_, delta) => {
    if (!spinRef.current || !playing) return;
    spinRef.current.rotation.y += delta * body.rotationSpeed * body.rotationDirection * speed;
  });

  const handleSelect = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect?.(body);
  };

  return (
    <group rotation={[0, 0, THREE.MathUtils.degToRad(body.axialTilt)]}>
      <group ref={spinRef}>
        <mesh
          castShadow
          receiveShadow
          onClick={interactive ? handleSelect : undefined}
          onPointerOver={interactive ? () => (document.body.style.cursor = "pointer") : undefined}
          onPointerOut={interactive ? () => (document.body.style.cursor = "default") : undefined}
          scale={selected ? 1.08 : 1}
        >
          <sphereGeometry args={[radius, 48, 32]} />
          {body.id === "sun" ? (
            <meshBasicMaterial map={textures?.map} color={body.color} toneMapped={false} />
          ) : (
            <meshStandardMaterial
              map={textures?.map}
              bumpMap={textures?.bumpMap}
              bumpScale={body.id === "earth" ? radius * 0.035 : 0}
              emissive={body.id === "earth" ? "#ffb04a" : "#000000"}
              emissiveMap={textures?.emissiveMap}
              emissiveIntensity={body.id === "earth" ? 0.32 : 0}
              color="#ffffff"
              roughness={body.id === "earth" ? 0.68 : 0.86}
              metalness={body.id === "earth" ? 0.06 : 0.02}
            />
          )}
        </mesh>

        {body.id === "earth" && textures?.cloudMap && (
          <mesh castShadow scale={1.012}>
            <sphereGeometry args={[radius, 56, 40]} />
            <meshStandardMaterial
              map={textures.cloudMap}
              alphaMap={textures.cloudMap}
              color="#ffffff"
              transparent
              opacity={0.7}
              alphaTest={0.08}
              roughness={1}
              depthWrite={false}
            />
          </mesh>
        )}

        {marker && (
          <group position={[radius * 1.03, 0, 0]}>
            <mesh>
              <sphereGeometry args={[radius * 0.075, 16, 12]} />
              <meshBasicMaterial color="#ffef70" />
            </mesh>
            <Html center position={[radius * 0.23, radius * 0.22, 0]}>
              <span className="earth-marker">我们这里</span>
            </Html>
          </group>
        )}
      </group>

      {body.ring && (
        <mesh rotation={[Math.PI / 2, 0, 0]} receiveShadow>
          <ringGeometry
            args={
              body.ring === "major"
                ? [radius * 1.28, radius * 2.05, 96]
                : [radius * 1.35, radius * 1.62, 72]
            }
          />
          <meshStandardMaterial
            color={body.ring === "major" ? "#d8c598" : "#93c7cf"}
            side={THREE.DoubleSide}
            transparent
            opacity={body.ring === "major" ? 0.68 : 0.32}
            roughness={0.9}
          />
        </mesh>
      )}

      {body.id === "sun" && (
        <>
          <mesh scale={1.09}>
            <sphereGeometry args={[radius, 40, 28]} />
            <meshBasicMaterial color="#ff9f2d" transparent opacity={0.18} side={THREE.BackSide} toneMapped={false} />
          </mesh>
          <mesh scale={1.2}>
            <sphereGeometry args={[radius, 40, 28]} />
            <meshBasicMaterial
              color="#ffb12e"
              transparent
              opacity={0.06}
              side={THREE.BackSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </>
      )}

      {body.id === "earth" && (
        <>
          <mesh scale={1.045}>
            <sphereGeometry args={[radius, 56, 40]} />
            <meshBasicMaterial
              color="#4bbdff"
              transparent
              opacity={0.1}
              side={THREE.BackSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh scale={1.085}>
            <sphereGeometry args={[radius, 56, 40]} />
            <meshBasicMaterial
              color="#1d84d9"
              transparent
              opacity={0.035}
              side={THREE.BackSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </>
      )}

      {arrows && body.id !== "sun" && (
        <RotationIndicator
          radius={radius}
          playing={playing}
          speed={speed}
          direction={body.rotationDirection}
        />
      )}

      {labels && (
        <Html center position={[0, radius + 0.68, 0]}>
          <span className={`body-label${selected ? " is-selected" : ""}`}>{body.name}</span>
        </Html>
      )}
    </group>
  );
}

function getPlanetOrbitElements(body: CelestialBody): PlanetOrbitElements {
  return {
    semiMajorAxis: body.orbitRadius,
    eccentricity: body.orbitEccentricity,
    inclinationDeg: body.orbitTilt,
    ascendingNodeDeg: body.orbitAscendingNode,
    longitudePerihelionDeg: body.orbitPerihelionLongitude,
  };
}

const ORBIT_ARROW_TURNS = [0.18, 0.52, 0.84] as const;
const ORBIT_ARROW_AXIS = new THREE.Vector3(0, 1, 0);

function OrbitTrack({
  body,
  orbitVisible,
  arrowsVisible,
  playing,
  speed,
}: {
  body: CelestialBody;
  orbitVisible: boolean;
  arrowsVisible: boolean;
  playing: boolean;
  speed: number;
}) {
  const arrowsRef = useRef<THREE.Group>(null);
  const arrowPhaseRef = useRef(0);
  const orbit = useMemo(() => getPlanetOrbitElements(body), [body]);
  const tangentVector = useMemo(() => new THREE.Vector3(), []);
  const points = useMemo(
    () =>
      Array.from({ length: 97 }, (_, index) => {
        const angle = (index / 96) * Math.PI * 2;
        const position = orbitPositionFromEccentricAnomaly(orbit, angle);
        return new THREE.Vector3(position.x, position.y, position.z);
      }),
    [orbit],
  );
  const initialArrowPoses = useMemo(
    () =>
      ORBIT_ARROW_TURNS.map((turn) => {
        const angle = turn * Math.PI * 2;
        const position = orbitPositionFromEccentricAnomaly(orbit, angle);
        const tangent = orbitTangentFromEccentricAnomaly(orbit, angle);
        const direction = new THREE.Vector3(
          tangent.x,
          tangent.y,
          tangent.z,
        ).normalize();
        return {
          position: new THREE.Vector3(position.x, position.y + 0.055, position.z),
          quaternion: new THREE.Quaternion().setFromUnitVectors(
            ORBIT_ARROW_AXIS,
            direction,
          ),
        };
      }),
    [orbit],
  );

  useFrame((_, delta) => {
    if (!arrowsRef.current || !arrowsVisible) return;
    if (playing) {
      arrowPhaseRef.current += delta * 0.18 * speed;
    }

    arrowsRef.current.children.forEach((arrow, index) => {
      const angle =
        arrowPhaseRef.current + ORBIT_ARROW_TURNS[index] * Math.PI * 2;
      const position = orbitPositionFromEccentricAnomaly(orbit, angle);
      const tangent = orbitTangentFromEccentricAnomaly(orbit, angle);
      tangentVector.set(tangent.x, tangent.y, tangent.z).normalize();
      arrow.position.set(position.x, position.y + 0.055, position.z);
      arrow.quaternion.setFromUnitVectors(ORBIT_ARROW_AXIS, tangentVector);
    });
  });

  return (
    <>
      {orbitVisible && arrowsVisible && (
        <Line
          points={points}
          color="#2bdcc2"
          transparent
          opacity={0.12}
          lineWidth={3.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      )}
      {orbitVisible && (
        <Line
          points={points}
          color={arrowsVisible ? "#8effee" : "#77766f"}
          transparent
          opacity={arrowsVisible ? 0.72 : 0.27}
          lineWidth={arrowsVisible ? 1.45 : 0.7}
        />
      )}
      {arrowsVisible && (
        <group ref={arrowsRef}>
          {ORBIT_ARROW_TURNS.map((turn, index) => (
            <group
              key={turn}
              position={initialArrowPoses[index].position}
              quaternion={initialArrowPoses[index].quaternion}
            >
              <mesh>
                <coneGeometry args={[0.1, 0.3, 18]} />
                <meshBasicMaterial color="#c7fff6" toneMapped={false} />
              </mesh>
              <mesh scale={1.9}>
                <coneGeometry args={[0.1, 0.3, 18]} />
                <meshBasicMaterial
                  color="#36dfc5"
                  transparent
                  opacity={0.16}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
            </group>
          ))}
        </group>
      )}
    </>
  );
}

function OrbitingPlanet({
  body,
  index,
  focusedBody,
  playing,
  speed,
  overlays,
  onSelect,
}: {
  body: CelestialBody;
  index: number;
  focusedBody: string | null;
  playing: boolean;
  speed: number;
  overlays: OverlayState;
  onSelect: (body: CelestialBody) => void;
}) {
  const positionRef = useRef<THREE.Group>(null);
  const initialMeanAnomaly = index * 0.78 + 0.42;
  const angleRef = useRef(initialMeanAnomaly);
  const orbit = getPlanetOrbitElements(body);
  const [initialPosition] = useState<[number, number, number]>(() => {
    const computedPosition = orbitPositionFromMeanAnomaly(
      orbit,
      initialMeanAnomaly,
    );
    return [
      computedPosition.x,
      computedPosition.y,
      computedPosition.z,
    ];
  });

  useFrame((_, delta) => {
    if (!positionRef.current) return;
    if (playing) {
      angleRef.current += delta * (0.2 / body.orbitPeriod) * speed;
    }
    const angle = angleRef.current;
    const position = orbitPositionFromMeanAnomaly(orbit, angle);
    positionRef.current.position.set(position.x, position.y, position.z);
  });

  return (
    <group>
      <group
        ref={positionRef}
        name={`body-${body.id}`}
        position={initialPosition}
      >
        <CelestialSphere
          body={body}
          labels={overlays.labels}
          arrows={overlays.arrows}
          interactive
          selected={focusedBody === body.id}
          onSelect={onSelect}
          speed={speed}
          playing={playing}
        />
        {body.id === "earth" && overlays.moon && (
          <OrbitingMoon
            labels={overlays.labels}
            orbitVisible={overlays.orbits}
            playing={playing}
            speed={speed}
          />
        )}
      </group>
    </group>
  );
}

function OrbitingMoon({
  labels,
  orbitVisible,
  playing,
  speed,
}: {
  labels: boolean;
  orbitVisible: boolean;
  playing: boolean;
  speed: number;
}) {
  const moonRef = useRef<THREE.Group>(null);
  const angleRef = useRef(1.2);
  const orbitRadius = 1.32;
  const orbitPoints = useMemo(
    () =>
      Array.from({ length: 65 }, (_, index) => {
        const angle = (index / 64) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(angle) * orbitRadius, 0, Math.sin(angle) * orbitRadius);
      }),
    [],
  );

  useFrame((_, delta) => {
    if (!moonRef.current) return;
    if (playing) angleRef.current += delta * 0.72 * speed;
    moonRef.current.position.set(
      Math.cos(angleRef.current) * orbitRadius,
      0,
      Math.sin(angleRef.current) * orbitRadius,
    );
  });

  return (
    <group rotation={[THREE.MathUtils.degToRad(MOON.orbitTilt), 0, 0]}>
      {orbitVisible && (
        <Line
          points={orbitPoints}
          color="#9c9991"
          transparent
          opacity={0.42}
          lineWidth={0.7}
        />
      )}
      <group ref={moonRef} name="body-moon-overview">
        <CelestialSphere
          body={MOON}
          labels={labels}
          speed={speed}
          playing={playing}
          scale={0.56}
        />
      </group>
    </group>
  );
}

function SolarSystemScene({
  focusedBody,
  playing,
  speed,
  overlays,
  onSelect,
}: {
  focusedBody: string | null;
  playing: boolean;
  speed: number;
  overlays: OverlayState;
  onSelect: (body: CelestialBody) => void;
}) {
  return (
    <>
      <ambientLight intensity={0.82} />
      <hemisphereLight args={["#dbe9ff", "#17131d", 0.72]} />
      {overlays.light && (
        <pointLight
          position={[0, 0, 0]}
          intensity={2800}
          distance={82}
          decay={1.25}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0003}
        />
      )}
      <group name="body-sun">
        <CelestialSphere
          body={SUN}
          labels={overlays.labels}
          interactive
          selected={focusedBody === SUN.id}
          onSelect={onSelect}
          speed={speed}
          playing={playing}
        />
      </group>
      {PLANETS.map((body) =>
        overlays.orbits || overlays.arrows ? (
          <OrbitTrack
            key={`orbit-${body.id}`}
            body={body}
            orbitVisible={overlays.orbits}
            arrowsVisible={overlays.arrows}
            playing={playing}
            speed={speed}
          />
        ) : null,
      )}
      {PLANETS.map((body, index) => (
        <OrbitingPlanet
          key={body.id}
          body={body}
          index={index}
          focusedBody={focusedBody}
          playing={playing}
          speed={speed}
          overlays={overlays}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

function DayNightScene({ playing, speed, overlays }: { playing: boolean; speed: number; overlays: OverlayState }) {
  const earth = PLANETS.find((body) => body.id === "earth")!;
  return (
    <>
      <ambientLight intensity={overlays.light ? 0.22 : 1.5} />
      {overlays.light && (
        <>
          <pointLight
            position={[-7.5, 0, 0]}
            intensity={1900}
            distance={42}
            decay={1.25}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <directionalLight position={[-8, 0, 0]} intensity={2.8} />
        </>
      )}
      <group position={[-7.5, 0, 0]}>
        <CelestialSphere body={SUN} labels={overlays.labels} speed={speed} playing={playing} scale={1.22} />
      </group>
      <group position={[3.2, 0, 0]} name="body-earth">
        <CelestialSphere
          body={earth}
          labels={overlays.labels}
          arrows={overlays.arrows}
          marker
          speed={speed * 1.25}
          playing={playing}
          scale={2.5}
        />
      </group>
      {overlays.light && (
        <LightStream
          from={[-4.7, 0, 0]}
          to={[1.45, 0, 0]}
          sourceRadius={2.35}
          targetRadius={1.5}
          playing={playing}
          speed={speed}
        />
      )}
      <Html center position={[-1.2, 3.1, 0]}>
        <span className="scene-caption">阳光只照亮地球的一半</span>
      </Html>
    </>
  );
}

function drawObservationBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const background = context.createRadialGradient(
    width * 0.52,
    height * 0.45,
    0,
    width * 0.52,
    height * 0.45,
    Math.max(width, height) * 0.72,
  );
  background.addColorStop(0, "#171723");
  background.addColorStop(0.55, "#090a11");
  background.addColorStop(1, "#030407");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "rgba(255, 255, 255, 0.46)";
  for (let index = 0; index < 18; index += 1) {
    const x = (((index * 67 + 23) % 193) / 193) * width;
    const y = (((index * 41 + 17) % 107) / 107) * height;
    const size = index % 5 === 0 ? 1.1 : 0.65;
    context.beginPath();
    context.arc(x, y, size, 0, Math.PI * 2);
    context.fill();
  }
}

function drawSolarObservation(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  phase: number,
) {
  const observation = eclipseObservationState("solar-eclipse", phase);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(height * 0.31, width * 0.19);
  const moonX = centerX + observation.occluderX * radius;
  const moonY = centerY + observation.occluderY * radius;

  drawObservationBackground(context, width, height);

  const corona = context.createRadialGradient(
    centerX,
    centerY,
    radius * 0.72,
    centerX,
    centerY,
    radius * 1.85,
  );
  corona.addColorStop(0, "rgba(255, 250, 213, 0.92)");
  corona.addColorStop(0.22, "rgba(255, 224, 145, 0.38)");
  corona.addColorStop(0.62, "rgba(255, 196, 77, 0.12)");
  corona.addColorStop(1, "rgba(255, 196, 77, 0)");
  context.fillStyle = corona;
  context.beginPath();
  context.arc(centerX, centerY, radius * 1.85, 0, Math.PI * 2);
  context.fill();

  const sun = context.createRadialGradient(
    centerX - radius * 0.26,
    centerY - radius * 0.3,
    radius * 0.08,
    centerX,
    centerY,
    radius,
  );
  sun.addColorStop(0, "#fff7b0");
  sun.addColorStop(0.48, "#ffd24e");
  sun.addColorStop(1, "#f28a20");
  context.fillStyle = sun;
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fill();

  const moon = context.createRadialGradient(
    moonX - radius * 0.18,
    moonY - radius * 0.2,
    radius * 0.05,
    moonX,
    moonY,
    radius * observation.occluderRadius,
  );
  moon.addColorStop(0, "#17191d");
  moon.addColorStop(0.72, "#08090b");
  moon.addColorStop(1, "#020203");
  context.fillStyle = moon;
  context.beginPath();
  context.arc(moonX, moonY, radius * observation.occluderRadius, 0, Math.PI * 2);
  context.fill();

  if (observation.stage === "total") {
    context.strokeStyle = "rgba(255, 247, 214, 0.9)";
    context.lineWidth = Math.max(1, radius * 0.025);
    context.beginPath();
    context.arc(moonX, moonY, radius * observation.occluderRadius * 1.015, 0, Math.PI * 2);
    context.stroke();
  }
}

function drawMoonDisc(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
) {
  const moon = context.createRadialGradient(
    centerX - radius * 0.32,
    centerY - radius * 0.34,
    radius * 0.06,
    centerX,
    centerY,
    radius,
  );
  moon.addColorStop(0, "#fffbe7");
  moon.addColorStop(0.58, "#d8d4c6");
  moon.addColorStop(1, "#8d8b85");
  context.fillStyle = moon;
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fill();

  const craters = [
    [-0.34, -0.22, 0.12],
    [0.26, -0.33, 0.09],
    [0.38, 0.13, 0.14],
    [-0.18, 0.32, 0.1],
    [0.04, 0.04, 0.07],
  ] as const;
  context.fillStyle = "rgba(79, 78, 76, 0.2)";
  craters.forEach(([x, y, craterRadius]) => {
    context.beginPath();
    context.arc(
      centerX + x * radius,
      centerY + y * radius,
      craterRadius * radius,
      0,
      Math.PI * 2,
    );
    context.fill();
  });
}

function drawLunarObservation(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  phase: number,
) {
  const observation = eclipseObservationState("lunar-eclipse", phase);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(height * 0.32, width * 0.19);
  const shadowX = centerX + observation.occluderX * radius;
  const shadowY = centerY + observation.occluderY * radius;

  drawObservationBackground(context, width, height);

  const moonGlow = context.createRadialGradient(
    centerX,
    centerY,
    radius * 0.78,
    centerX,
    centerY,
    radius * 1.48,
  );
  moonGlow.addColorStop(0, "rgba(232, 229, 211, 0.28)");
  moonGlow.addColorStop(1, "rgba(232, 229, 211, 0)");
  context.fillStyle = moonGlow;
  context.beginPath();
  context.arc(centerX, centerY, radius * 1.48, 0, Math.PI * 2);
  context.fill();

  drawMoonDisc(context, centerX, centerY, radius);

  context.save();
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.clip();

  const penumbra = context.createRadialGradient(
    shadowX,
    shadowY,
    radius * observation.occluderRadius * 0.72,
    shadowX,
    shadowY,
    radius * observation.penumbraRadius,
  );
  penumbra.addColorStop(0, "rgba(42, 24, 28, 0.46)");
  penumbra.addColorStop(0.72, "rgba(42, 24, 28, 0.23)");
  penumbra.addColorStop(1, "rgba(42, 24, 28, 0)");
  context.fillStyle = penumbra;
  context.beginPath();
  context.arc(shadowX, shadowY, radius * observation.penumbraRadius, 0, Math.PI * 2);
  context.fill();

  const umbra = context.createRadialGradient(
    shadowX,
    shadowY,
    0,
    shadowX,
    shadowY,
    radius * observation.occluderRadius,
  );
  umbra.addColorStop(0, "rgba(147, 52, 30, 0.82)");
  umbra.addColorStop(0.56, "rgba(105, 34, 27, 0.84)");
  umbra.addColorStop(1, "rgba(29, 16, 21, 0.94)");
  context.fillStyle = umbra;
  context.beginPath();
  context.arc(shadowX, shadowY, radius * observation.occluderRadius, 0, Math.PI * 2);
  context.fill();
  context.restore();

  context.strokeStyle = "rgba(255, 244, 215, 0.28)";
  context.lineWidth = 1;
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.stroke();
}

function EclipseObservationWindow({
  kind,
  phaseRef,
}: {
  kind: EclipseKind;
  phaseRef: MutableRefObject<number>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stageLabel, setStageLabel] = useState(
    kind === "solar-eclipse" ? "日全食" : "月全食",
  );
  const title = kind === "solar-eclipse" ? "从地球看太阳" : "从地球看月亮";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;
    let previousStage = "";

    const draw = () => {
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, bounds.width);
      const height = Math.max(1, bounds.height);
      const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
      const pixelWidth = Math.round(width * pixelRatio);
      const pixelHeight = Math.round(height * pixelRatio);

      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const phase = phaseRef.current;
      const observation = eclipseObservationState(kind, phase);
      if (kind === "solar-eclipse") {
        drawSolarObservation(context, width, height, phase);
      } else {
        drawLunarObservation(context, width, height, phase);
      }

      if (observation.stageLabel !== previousStage) {
        previousStage = observation.stageLabel;
        setStageLabel(observation.stageLabel);
      }
      animationFrame = window.requestAnimationFrame(draw);
    };

    draw();
    return () => window.cancelAnimationFrame(animationFrame);
  }, [kind, phaseRef]);

  return (
    <aside className="eclipse-observation" aria-label={`${title}观测演示`}>
      <div className="eclipse-observation-heading">
        <span>{title}</span>
        <strong aria-live="polite">{stageLabel}</strong>
      </div>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`${title}，当前为${stageLabel}`}
      >
        {title}的食相演示，当前为{stageLabel}。
      </canvas>
    </aside>
  );
}

function EclipseShadowCone({
  kind,
  moonRef,
}: {
  kind: EclipseKind;
  moonRef: RefObject<THREE.Group | null>;
}) {
  const shadowRef = useRef<THREE.Mesh>(null);
  const scratch = useMemo(
    () => ({
      sun: new THREE.Vector3(ECLIPSE_LAYOUT.sunX, 0, 0),
      emitter: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      center: new THREE.Vector3(),
      up: new THREE.Vector3(0, 1, 0),
    }),
    [],
  );
  const isSolarEclipse = kind === "solar-eclipse";
  const length = isSolarEclipse ? 7.4 : 8;
  const emitterRadius = isSolarEclipse
    ? MOON.radius * ECLIPSE_LAYOUT.moonScale
    : PLANETS.find((body) => body.id === "earth")!.radius * ECLIPSE_LAYOUT.earthScale;

  useFrame(() => {
    if (!shadowRef.current) return;
    if (isSolarEclipse) {
      if (!moonRef.current) return;
      moonRef.current.getWorldPosition(scratch.emitter);
    } else {
      scratch.emitter.set(ECLIPSE_LAYOUT.earthX, 0, 0);
    }

    scratch.direction.copy(scratch.emitter).sub(scratch.sun).normalize();
    scratch.center
      .copy(scratch.emitter)
      .addScaledVector(scratch.direction, emitterRadius * 0.82 + length / 2);
    shadowRef.current.position.copy(scratch.center);
    shadowRef.current.quaternion.setFromUnitVectors(scratch.up, scratch.direction);
  });

  return (
    <mesh ref={shadowRef}>
      <cylinderGeometry
        key={kind}
        args={
          isSolarEclipse
            ? [0.16, 0.5, length, 32, 1, true]
            : [0.72, 1.42, length, 32, 1, true]
        }
      />
      <meshBasicMaterial
        color={isSolarEclipse ? "#23211f" : "#241d22"}
        transparent
        opacity={isSolarEclipse ? 0.44 : 0.5}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function EclipseScene({
  kind,
  playing,
  speed,
  overlays,
  reducedMotion,
  phaseRef,
}: {
  kind: EclipseKind;
  playing: boolean;
  speed: number;
  overlays: OverlayState;
  reducedMotion: boolean;
  phaseRef: MutableRefObject<number>;
}) {
  const moonGroup = useRef<THREE.Group>(null);
  const initialPhase = eclipseTargetPhase(kind);
  const phase = useRef(initialPhase);
  const previousKind = useRef(kind);
  const transition = useRef({
    active: false,
    elapsed: 0,
    startPhase: initialPhase,
    targetPhase: initialPhase,
  });
  const earth = PLANETS.find((body) => body.id === "earth")!;
  const sunDisplayRadius = SUN.radius * ECLIPSE_LAYOUT.sunScale;
  const orbitPoints = useMemo(
    () =>
      Array.from({ length: 65 }, (_, index) => {
        const position = eclipseOrbitPosition((index / 64) * Math.PI * 2);
        return new THREE.Vector3(position.x, position.y, position.z);
      }),
    [],
  );

  useEffect(() => {
    phaseRef.current = phase.current;
    if (previousKind.current === kind) {
      if (reducedMotion && transition.current.active) {
        phase.current = transition.current.targetPhase;
        phaseRef.current = phase.current;
        transition.current.active = false;
      }
      return;
    }
    const targetPhase = nextForwardEclipsePhase(phase.current, kind);
    previousKind.current = kind;

    if (reducedMotion) {
      phase.current = targetPhase;
      phaseRef.current = phase.current;
      transition.current.active = false;
      return;
    }

    transition.current = {
      active: true,
      elapsed: 0,
      startPhase: phase.current,
      targetPhase,
    };
  }, [kind, phaseRef, reducedMotion]);

  useFrame((_, delta) => {
    if (!moonGroup.current) return;
    const state = transition.current;

    if (state.active) {
      state.elapsed += delta;
      const progress = Math.min(1, state.elapsed / ECLIPSE_LAYOUT.transitionDuration);
      const eased = 0.5 - Math.cos(progress * Math.PI) / 2;
      phase.current = THREE.MathUtils.lerp(state.startPhase, state.targetPhase, eased);
      if (progress >= 1) {
        phase.current = state.targetPhase;
        state.active = false;
      }
    } else if (playing) {
      phase.current += delta * 0.42 * speed;
    }

    const position = eclipseOrbitPosition(phase.current);
    moonGroup.current.position.set(position.x, position.y, position.z);
    phaseRef.current = phase.current;
  });

  return (
    <>
      <ambientLight intensity={overlays.light ? 0.2 : 1.45} />
      {overlays.light && (
        <>
          <pointLight
            position={[ECLIPSE_LAYOUT.sunX, 0, 0]}
            intensity={2100}
            distance={52}
            decay={1.25}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <directionalLight position={[ECLIPSE_LAYOUT.sunX - 0.5, 0, 0]} intensity={2.4} />
        </>
      )}
      <group position={[ECLIPSE_LAYOUT.sunX, 0, 0]}>
        <CelestialSphere
          body={SUN}
          labels={overlays.labels}
          speed={speed}
          playing={playing}
          scale={ECLIPSE_LAYOUT.sunScale}
        />
      </group>
      <group position={[ECLIPSE_LAYOUT.earthX, 0, 0]} name="body-earth">
        <CelestialSphere
          body={earth}
          labels={overlays.labels}
          speed={speed}
          playing={playing}
          scale={ECLIPSE_LAYOUT.earthScale}
        />
      </group>
      <group ref={moonGroup} name="body-moon">
        <CelestialSphere
          body={MOON}
          labels={overlays.labels}
          speed={speed}
          playing={playing}
          scale={ECLIPSE_LAYOUT.moonScale}
        />
      </group>
      {overlays.light && (
        <>
          <LightStream
            from={[ECLIPSE_LAYOUT.sunX + sunDisplayRadius, 0, 0]}
            to={[ECLIPSE_LAYOUT.orbitRadiusX + 0.7, 0, 0]}
            sourceRadius={2.3}
            targetRadius={1.4}
            playing={playing}
            speed={speed}
            opacity={0.9}
          />
          <EclipseShadowCone kind={kind} moonRef={moonGroup} />
        </>
      )}
      {overlays.orbits && (
        <Line
          points={orbitPoints}
          color="#8e8b82"
          transparent
          opacity={0.34}
          lineWidth={0.8}
        />
      )}
    </>
  );
}

function cameraPreset(mode: Mode, aspect: number) {
  if (mode === "motion") {
    return { position: new THREE.Vector3(0, 17, 28), target: new THREE.Vector3(0, 0, 0) };
  }
  if (mode === "solar-eclipse" || mode === "lunar-eclipse") {
    const sceneHalfWidth = 12;
    const verticalHalfFov = THREE.MathUtils.degToRad(24);
    const distanceToFit = sceneHalfWidth / (Math.tan(verticalHalfFov) * Math.max(0.42, aspect));
    const cameraDistance = Math.max(27.5, distanceToFit * 1.08);
    return {
      position: new THREE.Vector3(-3.7, cameraDistance * 0.21, cameraDistance),
      target: new THREE.Vector3(-3.7, 0, 0),
    };
  }
  return { position: new THREE.Vector3(0, 5.4, 22), target: new THREE.Vector3(0, 0, 0) };
}

function CameraRig({
  controlsRef,
  mode,
  focusedBody,
  resetKey,
  reducedMotion,
}: {
  controlsRef: RefObject<OrbitControlsImpl | null>;
  mode: Mode;
  focusedBody: string | null;
  resetKey: number;
  reducedMotion: boolean;
}) {
  const { camera, scene, size } = useThree();
  const transition = useRef({
    active: false,
    elapsed: 0,
    duration: 0.85,
    startPosition: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endPosition: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
  });
  const lastFollowTarget = useRef(new THREE.Vector3());

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const preset = cameraPreset(mode, size.width / size.height);
    let target = preset.target.clone();
    let position = preset.position.clone();
    if (focusedBody && mode === "motion") {
      const object = scene.getObjectByName(`body-${focusedBody}`);
      if (object) {
        target = object.getWorldPosition(new THREE.Vector3());
        const body = focusedBody === "sun" ? SUN : PLANETS.find((item) => item.id === focusedBody);
        const distance = Math.max(3.5, (body?.radius ?? 0.7) * 5.6);
        position = target.clone().add(new THREE.Vector3(distance * 0.45, distance * 0.55, distance));
      }
    }

    const state = transition.current;
    state.active = !reducedMotion;
    state.elapsed = 0;
    state.startPosition.copy(camera.position);
    state.startTarget.copy(controls.target);
    state.endPosition.copy(position);
    state.endTarget.copy(target);
    lastFollowTarget.current.copy(target);

    if (reducedMotion) {
      camera.position.copy(position);
      controls.target.copy(target);
      controls.update();
    }
  }, [camera, controlsRef, focusedBody, mode, reducedMotion, resetKey, scene, size.height, size.width]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const state = transition.current;

    if (state.active) {
      state.elapsed += delta;
      const progress = Math.min(1, state.elapsed / state.duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      camera.position.lerpVectors(state.startPosition, state.endPosition, eased);
      controls.target.lerpVectors(state.startTarget, state.endTarget, eased);
      if (progress >= 1) state.active = false;
      controls.update();
      return;
    }

    if (focusedBody && mode === "motion") {
      const object = scene.getObjectByName(`body-${focusedBody}`);
      if (object) {
        const worldPosition = object.getWorldPosition(new THREE.Vector3());
        const shift = worldPosition.clone().sub(lastFollowTarget.current);
        camera.position.add(shift);
        controls.target.copy(worldPosition);
        lastFollowTarget.current.copy(worldPosition);
        controls.update();
      }
    }
  });

  return null;
}

function SolarSystemCanvas({
  mode,
  focusedBody,
  playing,
  speed,
  overlays,
  resetKey,
  reducedMotion,
  eclipsePhaseRef,
  onSelect,
}: {
  mode: Mode;
  focusedBody: string | null;
  playing: boolean;
  speed: number;
  overlays: OverlayState;
  resetKey: number;
  reducedMotion: boolean;
  eclipsePhaseRef: MutableRefObject<number>;
  onSelect: (body: CelestialBody) => void;
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  return (
    <Canvas
      shadows={overlays.light}
      dpr={[1, 1.5]}
      camera={{ position: [0, 17, 28], fov: 48, near: 0.1, far: 180 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => gl.setClearColor("#050507")}
      onPointerMissed={() => undefined}
      aria-label="可以拖动和缩放的三维太阳系"
    >
      <fog attach="fog" args={["#050507", 42, 105]} />
      <Stars radius={72} depth={42} count={1700} factor={2.2} saturation={0.24} fade speed={reducedMotion ? 0 : 0.22} />
      {mode === "motion" && (
        <SolarSystemScene
          focusedBody={focusedBody}
          playing={playing}
          speed={speed}
          overlays={overlays}
          onSelect={onSelect}
        />
      )}
      {mode === "day-night" && <DayNightScene playing={playing} speed={speed} overlays={overlays} />}
      {(mode === "solar-eclipse" || mode === "lunar-eclipse") && (
        <EclipseScene
          kind={mode}
          playing={playing}
          speed={speed}
          overlays={overlays}
          reducedMotion={reducedMotion}
          phaseRef={eclipsePhaseRef}
        />
      )}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.075}
        minDistance={3}
        maxDistance={64}
        minPolarAngle={0.18}
        maxPolarAngle={Math.PI - 0.18}
      />
      <CameraRig
        controlsRef={controlsRef}
        mode={mode}
        focusedBody={focusedBody}
        resetKey={resetKey}
        reducedMotion={reducedMotion}
      />
    </Canvas>
  );
}

function Toggle({
  id,
  label,
  settingKey,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  settingKey: OverlayKey;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="switch-row" htmlFor={id} data-setting={settingKey}>
      <span>{label}</span>
      <span className="switch-control">
        <input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span className="switch-track" aria-hidden="true" />
      </span>
    </label>
  );
}

export default function SolarSystemApp() {
  const [mode, setMode] = useState<Mode>("motion");
  const [focusedBody, setFocusedBody] = useState<string | null>(null);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<0.5 | 1 | 4>(1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [overlays, setOverlays] = useState<OverlayState>({
    orbits: true,
    labels: true,
    arrows: true,
    light: true,
    moon: true,
  });
  const eclipsePhaseRef = useRef(eclipseTargetPhase("solar-eclipse"));

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReducedMotion(media.matches);
      if (media.matches) setPlaying(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const activeMode = MODES.find((item) => item.id === mode)!;
  const selectedBody = focusedBody === "sun" ? SUN : PLANETS.find((body) => body.id === focusedBody);
  const visibleOverlayKeys = MODE_OVERLAYS[mode];
  const usesTeachingLight = mode === "day-night" || mode === "solar-eclipse" || mode === "lunar-eclipse";
  const effectiveOverlays: OverlayState = {
    orbits: mode === "day-night" ? false : overlays.orbits,
    labels: overlays.labels,
    arrows: mode === "motion" ? overlays.arrows : false,
    light: usesTeachingLight ? overlays.light : true,
    moon: mode === "motion" ? overlays.moon : true,
  };

  const changeMode = (nextMode: Mode) => {
    const enteringEclipse =
      (nextMode === "solar-eclipse" || nextMode === "lunar-eclipse")
      && mode !== "solar-eclipse"
      && mode !== "lunar-eclipse";
    if (enteringEclipse) {
      eclipsePhaseRef.current = eclipseTargetPhase(nextMode);
    }
    setMode(nextMode);
    setFocusedBody(null);
    setPlaying(!reducedMotion);
    setResetKey((value) => value + 1);
  };

  const changeOverlay = (key: keyof OverlayState, checked: boolean) => {
    setOverlays((value) => ({ ...value, [key]: checked }));
  };

  const selectBody = (body: CelestialBody) => {
    setFocusedBody(body.id);
    setSettingsOpen(false);
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  };

  return (
    <main className="solar-app" data-testid="solar-app">
      <div className="canvas-shell" data-testid="solar-canvas">
        <SolarSystemCanvas
          mode={mode}
          focusedBody={focusedBody}
          playing={playing}
          speed={speed}
          overlays={effectiveOverlays}
          resetKey={resetKey}
          reducedMotion={reducedMotion}
          eclipsePhaseRef={eclipsePhaseRef}
          onSelect={selectBody}
        />
      </div>

      <header className="app-header">
        <div className="header-identity">
          {/* vinext dev currently duplicates React when next/link is imported here. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className="back-to-gallery" href="/" aria-label="返回小小科学馆">
            <ArrowLeft />
            <span>科学馆</span>
          </a>
          <div className="brand-lockup">
            <span className="brand-mark" aria-hidden="true"><Sun /></span>
            <div>
              <h1>小小太阳系</h1>
              <p>和星球一起转起来</p>
            </div>
          </div>
        </div>

        <div className="playback-controls" aria-label="播放控制">
          <button
            type="button"
            className="icon-button primary-action"
            onClick={() => setPlaying((value) => !value)}
            aria-label={playing ? "暂停动画" : "播放动画"}
            data-tooltip={playing ? "暂停" : "播放"}
          >
            {playing ? <Pause /> : <Play />}
          </button>

          <div className="speed-control" aria-label="动画速度">
            {([0.5, 1, 4] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={speed === value ? "is-active" : ""}
                onClick={() => setSpeed(value)}
                aria-pressed={speed === value}
              >
                {value}×
              </button>
            ))}
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={() => {
              setFocusedBody(null);
              setResetKey((value) => value + 1);
            }}
            aria-label="重置镜头"
            data-tooltip="重置镜头"
          >
            <RotateCcw />
          </button>
          <button type="button" className="icon-button desktop-only" onClick={toggleFullscreen} aria-label="切换全屏" data-tooltip="全屏">
            <Maximize />
          </button>
          <button
            type="button"
            className={`icon-button${settingsOpen ? " is-active" : ""}`}
            onClick={() => setSettingsOpen((value) => !value)}
            aria-label="显示设置"
            aria-expanded={settingsOpen}
            data-tooltip="显示设置"
          >
            <Settings />
          </button>
        </div>
      </header>

      {!settingsOpen && (
        <section className="lesson-strip" aria-live="polite">
          <span className="lesson-kicker">{activeMode.label}</span>
          <p>{activeMode.description}</p>
        </section>
      )}

      {!settingsOpen && selectedBody && mode === "motion" && (
        <aside className="body-fact" aria-live="polite">
          <div>
            <span className="fact-label">正在观察</span>
            <strong>{selectedBody.name}</strong>
          </div>
          <p>{selectedBody.fact}</p>
          <button
            type="button"
            className="close-fact"
            onClick={() => {
              setFocusedBody(null);
              setResetKey((value) => value + 1);
            }}
            aria-label="返回公转与自转总览"
          >
            <X />
          </button>
        </aside>
      )}

      {settingsOpen && (
        <aside className="settings-panel" aria-label={`${activeMode.label}显示设置`} aria-live="polite">
          <div className="settings-heading">
            <div>
              <strong>显示设置</strong>
              <span className="settings-context">{activeMode.label}</span>
            </div>
            <button type="button" className="panel-close" onClick={() => setSettingsOpen(false)} aria-label="关闭显示设置">
              <X />
            </button>
          </div>
          {visibleOverlayKeys.map((key) => {
            const option = OVERLAY_OPTIONS[key];
            return (
              <Toggle
                key={key}
                id={option.id}
                label={option.label}
                settingKey={key}
                checked={overlays[key]}
                onChange={(checked) => changeOverlay(key, checked)}
              />
            );
          })}
        </aside>
      )}

      {(mode === "solar-eclipse" || mode === "lunar-eclipse") && (
        <EclipseObservationWindow kind={mode} phaseRef={eclipsePhaseRef} />
      )}

      <div className="bottom-controls">
        {(mode === "solar-eclipse" || mode === "lunar-eclipse") && (
          <p className="eclipse-note">月球轨道倾斜约 5°，所以日食和月食不会每个月都发生。</p>
        )}
        <p className="scale-note">
          {mode === "motion"
            ? "轨道形状与倾角参考真实数据；大小、距离和速度经过教学调整"
            : "为了方便观察，大小和距离经过调整"}
        </p>
        <nav className="mode-bar" aria-label="教学模式">
          {MODES.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={mode === item.id ? "is-active" : ""}
                onClick={() => changeMode(item.id)}
                aria-pressed={mode === item.id}
                data-mode={item.id}
              >
                <Icon aria-hidden="true" />
                <span className="long-label">{item.label}</span>
                <span className="short-label">{item.shortLabel}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </main>
  );
}
