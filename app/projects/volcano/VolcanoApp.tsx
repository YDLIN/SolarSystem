"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import {
  ArrowLeft,
  ArrowUp,
  CircleDot,
  Flame,
  Layers3,
  Maximize,
  Mountain,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Sparkles,
  Waves,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import styles from "./VolcanoApp.module.css";
import {
  STAGE_DEFINITIONS,
  STAGE_ORDER,
  eruptionState,
  loopingProgress,
  magmaPathPosition,
  pillowFormationState,
} from "./volcanoModel";
import type {
  Point3,
  VolcanoHotspotId,
  VolcanoOverlayState,
  VolcanoStage,
} from "./volcanoModel";

type Hotspot = {
  id: VolcanoHotspotId;
  name: string;
  eyebrow: string;
  fact: string;
  position: Point3;
  cameraOffset: Point3;
};

const HOTSPOTS: Record<VolcanoHotspotId, Hotspot> = {
  asthenosphere: {
    id: "asthenosphere",
    name: "软流圈",
    eyebrow: "正在观察",
    fact: "这里的岩石温度很高，但大部分仍是固体；它能在漫长时间里缓慢流动。",
    position: [-4.4, -5.4, 4.18],
    cameraOffset: [5.8, 3.2, 7.4],
  },
  "melt-zone": {
    id: "melt-zone",
    name: "部分熔融区",
    eyebrow: "岩浆的起点",
    fact: "地幔上涌时压力降低，只有一部分矿物先熔化，形成玄武质岩浆。",
    position: [-1.4, -4.45, 4.18],
    cameraOffset: [5.4, 3.4, 7],
  },
  "magma-chamber": {
    id: "magma-chamber",
    name: "岩浆储集区",
    eyebrow: "岩浆集合处",
    fact: "分散的小股岩浆在岩层下方汇聚，并寻找裂隙继续向上移动。",
    position: [0.2, -2.45, 4.18],
    cameraOffset: [5.2, 3.2, 7],
  },
  fissure: {
    id: "fissure",
    name: "山顶火山口",
    eyebrow: "岩浆的地表出口",
    fact: "火山体长出海面后，岩浆中的气体更容易膨胀；岩浆、气体和碎屑会从山顶火山口喷出。",
    position: [0, 8.86, 3.7],
    cameraOffset: [5.7, 2.9, 7.4],
  },
  "pillow-lava": {
    id: "pillow-lava",
    name: "枕状熔岩",
    eyebrow: "新生的岩石",
    fact: "海水让熔岩外壳迅速变硬，内部仍热的熔岩继续挤出，形成一团团“石头枕头”。",
    position: [-4.5, 1.02, 1.2],
    cameraOffset: [5, 3.1, 6.2],
  },
};

const HOTSPOT_ORDER = [
  "asthenosphere",
  "melt-zone",
  "magma-chamber",
  "fissure",
  "pillow-lava",
] as const satisfies readonly VolcanoHotspotId[];

const OVERLAY_OPTIONS: Array<{
  key: keyof VolcanoOverlayState;
  label: string;
}> = [
  { key: "labels", label: "名称标签" },
  { key: "arrows", label: "运动箭头" },
  { key: "cutaway", label: "岩层剖面" },
  { key: "particles", label: "环境粒子" },
];

const STAGE_ICONS = {
  melting: Sparkles,
  rising: ArrowUp,
  eruption: Flame,
  cooling: CircleDot,
} satisfies Record<VolcanoStage, typeof Flame>;

function seafloorHeight(x: number, z: number) {
  const ridge = 1.18 * Math.exp(-Math.abs(x) / 1.55);
  const broadRise = 0.26 * Math.exp(-Math.abs(x) / 4.2);
  const rockTexture =
    Math.sin(x * 1.47 + z * 0.74) * 0.055 +
    Math.sin(x * 3.18 - z * 1.26) * 0.025;
  return 0.02 + ridge + broadRise + rockTexture;
}

function createPlateTopGeometry(side: "left" | "right") {
  const xSegments = 32;
  const zSegments = 18;
  const xStart = side === "left" ? -10 : 0.48;
  const xEnd = side === "left" ? -0.48 : 10;
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let zIndex = 0; zIndex <= zSegments; zIndex += 1) {
    const zProgress = zIndex / zSegments;
    const z = -4 + zProgress * 8;
    for (let xIndex = 0; xIndex <= xSegments; xIndex += 1) {
      const xProgress = xIndex / xSegments;
      const x = xStart + (xEnd - xStart) * xProgress;
      vertices.push(x, seafloorHeight(x, z), z);
      uvs.push(xProgress, zProgress);
    }
  }

  for (let zIndex = 0; zIndex < zSegments; zIndex += 1) {
    for (let xIndex = 0; xIndex < xSegments; xIndex += 1) {
      const row = xSegments + 1;
      const topLeft = zIndex * row + xIndex;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + row;
      const bottomRight = bottomLeft + 1;
      indices.push(
        topLeft,
        bottomLeft,
        topRight,
        topRight,
        bottomLeft,
        bottomRight,
      );
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createFrontLayerGeometry(
  side: "left" | "right",
  bottom: number,
  topMode: "surface" | number,
) {
  const segments = 44;
  const xStart = side === "left" ? -10 : 0.48;
  const xEnd = side === "left" ? -0.48 : 10;
  const vertices: number[] = [];
  const indices: number[] = [];

  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments;
    const x = xStart + (xEnd - xStart) * progress;
    const top = topMode === "surface" ? seafloorHeight(x, 4.04) : topMode;
    vertices.push(x, top, 4.04, x, bottom, 4.04);
  }

  for (let index = 0; index < segments; index += 1) {
    const currentTop = index * 2;
    const currentBottom = currentTop + 1;
    const nextTop = currentTop + 2;
    const nextBottom = currentTop + 3;
    indices.push(
      currentTop,
      currentBottom,
      nextTop,
      nextTop,
      currentBottom,
      nextBottom,
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createIrregularRockGeometry(
  radius: number,
  detail: number,
  seed: number,
) {
  const geometry = new THREE.IcosahedronGeometry(radius, detail);
  const position = geometry.getAttribute("position");
  const vertex = new THREE.Vector3();

  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index);
    const noise =
      1 +
      Math.sin(vertex.x * 3.8 + seed) * 0.055 +
      Math.sin(vertex.y * 5.1 - seed * 0.7) * 0.045 +
      Math.sin(vertex.z * 4.3 + seed * 1.3) * 0.04;
    vertex.multiplyScalar(noise);
    position.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

const VOLCANO_BASE_Y = 1.05;
const VOLCANO_SUMMIT_Y = 8.78;
const VOLCANO_SLICE_Z = 3.7;
const SEA_LEVEL = 5.8;

function volcanoRadiusAtHeight(y: number) {
  const progress = THREE.MathUtils.clamp(
    (y - VOLCANO_BASE_Y) / (VOLCANO_SUMMIT_Y - VOLCANO_BASE_Y),
    0,
    1,
  );
  const broadCone = 0.62 + 4.42 * Math.pow(1 - progress, 0.72);
  const shoulder =
    Math.exp(-Math.pow((progress - 0.34) / 0.18, 2)) * 0.28;
  return broadCone + shoulder;
}

function createVolcanoExteriorGeometry() {
  const geometry = new THREE.CylinderGeometry(
    0.66,
    5.05,
    VOLCANO_SUMMIT_Y - VOLCANO_BASE_Y,
    72,
    22,
    true,
    Math.PI / 2,
    Math.PI,
  );
  const position = geometry.getAttribute("position");
  const vertex = new THREE.Vector3();

  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index);
    const verticalProgress =
      (vertex.y + (VOLCANO_SUMMIT_Y - VOLCANO_BASE_Y) / 2) /
      (VOLCANO_SUMMIT_Y - VOLCANO_BASE_Y);
    const angle = Math.atan2(vertex.x, vertex.z);
    const ridgeNoise =
      Math.sin(angle * 7 + verticalProgress * 8.2) * 0.055 +
      Math.sin(angle * 13 - verticalProgress * 5.6) * 0.026 +
      Math.sin(verticalProgress * 31 + angle * 3) * 0.018;
    const radialScale = 1 + ridgeNoise * (1 - verticalProgress * 0.34);
    position.setXYZ(
      index,
      vertex.x * radialScale,
      vertex.y + Math.sin(angle * 9) * 0.045,
      vertex.z * radialScale,
    );
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function createVolcanoBandGeometry(
  bottomY: number,
  topY: number,
  bandIndex: number,
) {
  const rows = 5;
  const columns = 16;
  const vertices: number[] = [];
  const indices: number[] = [];

  for (let row = 0; row <= rows; row += 1) {
    const rowProgress = row / rows;
    const y =
      bottomY +
      (topY - bottomY) * rowProgress +
      Math.sin(row * 1.7 + bandIndex) * 0.025;
    const radius = volcanoRadiusAtHeight(y);
    for (let column = 0; column <= columns; column += 1) {
      const columnProgress = column / columns;
      const x = -radius + radius * 2 * columnProgress;
      const edgeFade = Math.sin(columnProgress * Math.PI);
      const rockRelief =
        Math.sin(column * 1.9 + row * 1.3 + bandIndex * 0.7) *
          0.045 *
          edgeFade +
        Math.sin(column * 0.65 - row * 2.1) * 0.022;
      vertices.push(x, y, VOLCANO_SLICE_Z + rockRelief);
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const stride = columns + 1;
      const topLeft = row * stride + column;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + stride;
      const bottomRight = bottomLeft + 1;
      indices.push(
        topLeft,
        bottomLeft,
        topRight,
        topRight,
        bottomLeft,
        bottomRight,
      );
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createCraterGeometry() {
  const geometry = new THREE.TorusGeometry(0.64, 0.19, 12, 44);
  const position = geometry.getAttribute("position");
  const vertex = new THREE.Vector3();
  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index);
    const noise =
      1 +
      Math.sin(index * 1.31) * 0.09 +
      Math.sin(index * 0.37 + 2.4) * 0.045;
    position.setXYZ(index, vertex.x * noise, vertex.y, vertex.z * noise);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function MantleFlowRibbons() {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const curves = useMemo(
    () => [
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-5.7, -6.6, -0.7),
        new THREE.Vector3(-4.2, -5.8, -0.4),
        new THREE.Vector3(-2.7, -4.65, -0.15),
        new THREE.Vector3(-1.15, -3.45, 0),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(5.7, -6.6, 0.7),
        new THREE.Vector3(4.1, -5.8, 0.4),
        new THREE.Vector3(2.55, -4.65, 0.15),
        new THREE.Vector3(1.05, -3.45, 0),
      ]),
    ],
    [],
  );

  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    materialRef.current.emissiveIntensity =
      0.48 + (Math.sin(clock.elapsedTime * 1.25) + 1) * 0.18;
  });

  return (
    <group>
      {curves.map((curve, index) => (
        <mesh key={index}>
          <tubeGeometry args={[curve, 42, 0.075, 7, false]} />
          <meshStandardMaterial
            ref={index === 0 ? materialRef : undefined}
            color="#8e3e2b"
            emissive="#7b1f0f"
            emissiveIntensity={0.62}
            transparent
            opacity={0.55}
            roughness={0.72}
          />
        </mesh>
      ))}
    </group>
  );
}

function MantleLayer({ cutaway }: { cutaway: boolean }) {
  const glowRef = useRef<THREE.Group>(null);
  const droplets = useMemo(
    () =>
      Array.from({ length: 24 }, (_, index) => {
        const angle = index * 2.39;
        const radius = 0.55 + (index % 7) * 0.24;
        return {
          position: [
            Math.sin(angle) * radius,
            -5.25 + (index % 6) * 0.38,
            Math.cos(angle * 1.27) * (0.35 + (index % 4) * 0.17),
          ] as Point3,
          scale: 0.08 + (index % 5) * 0.018,
        };
      }),
    [],
  );

  useFrame(({ clock }) => {
    if (!glowRef.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 1.15) * 0.025;
    glowRef.current.scale.set(pulse, pulse, pulse);
  });

  return (
    <group>
      <mesh position={[0, -5.72, -0.02]}>
        <boxGeometry args={[20, 5.9, 8]} />
        <meshStandardMaterial
          color="#2d1b19"
          roughness={0.98}
          transparent
          opacity={cutaway ? 0.97 : 0.3}
        />
      </mesh>
      <mesh position={[0, -3.1, 0]}>
        <boxGeometry args={[20, 0.22, 8.03]} />
        <meshStandardMaterial
          color="#673025"
          emissive="#4a150d"
          emissiveIntensity={0.34}
          roughness={0.8}
          transparent
          opacity={cutaway ? 0.68 : 0.16}
        />
      </mesh>
      {[-4.25, -5.55, -6.72].map((y, index) => (
        <Line
          key={y}
          points={[
            [-9.8, y + Math.sin(index) * 0.08, 4.06],
            [-5.8, y + 0.12, 4.06],
            [-1.9, y - 0.08, 4.06],
            [1.9, y + 0.05, 4.06],
            [5.8, y - 0.1, 4.06],
            [9.8, y + 0.06, 4.06],
          ]}
          color={index === 0 ? "#78402f" : "#4b2b27"}
          lineWidth={0.7}
          transparent
          opacity={cutaway ? 0.46 : 0.12}
        />
      ))}
      <group position={[0, 0, 3.72]}>
        <MantleFlowRibbons />
      </group>
      <group ref={glowRef} position={[0, 0, 3.78]}>
        {droplets.map((droplet, index) => (
          <mesh
            key={index}
            position={droplet.position}
            scale={[
              droplet.scale,
              droplet.scale * 1.45,
              droplet.scale,
            ]}
          >
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial
              color={index % 3 === 0 ? "#ff9c3d" : "#d94c23"}
              emissive="#ff3b0a"
              emissiveIntensity={1.45}
              transparent
              opacity={0.82}
              roughness={0.4}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function OceanicCrust({
  cutaway,
  playing,
  speed,
}: {
  cutaway: boolean;
  playing: boolean;
  speed: number;
}) {
  const opacity = cutaway ? 0.9 : 0.32;
  const leftRef = useRef<THREE.Group>(null);
  const rightRef = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  const leftTop = useMemo(() => createPlateTopGeometry("left"), []);
  const rightTop = useMemo(() => createPlateTopGeometry("right"), []);
  const leftUpperFront = useMemo(
    () => createFrontLayerGeometry("left", -0.72, "surface"),
    [],
  );
  const rightUpperFront = useMemo(
    () => createFrontLayerGeometry("right", -0.72, "surface"),
    [],
  );
  const leftLowerFront = useMemo(
    () => createFrontLayerGeometry("left", -2.78, -0.72),
    [],
  );
  const rightLowerFront = useMemo(
    () => createFrontLayerGeometry("right", -2.78, -0.72),
    [],
  );

  useFrame((_, delta) => {
    if (playing) elapsed.current += delta * speed;
    const separation = (Math.sin(elapsed.current * 0.42) + 1) * 0.035;
    if (leftRef.current) leftRef.current.position.x = -separation;
    if (rightRef.current) rightRef.current.position.x = separation;
  });

  const plateMaterial = (
    color: string,
    layerOpacity: number,
    flatShading = false,
  ) => (
    <meshStandardMaterial
      color={color}
      roughness={0.98}
      metalness={0.02}
      transparent
      opacity={layerOpacity}
      flatShading={flatShading}
      side={THREE.DoubleSide}
    />
  );

  return (
    <group>
      <group ref={leftRef}>
        <mesh geometry={leftTop}>
          {plateMaterial("#34484f", 1, true)}
        </mesh>
        <mesh geometry={leftUpperFront}>
          {plateMaterial("#364147", opacity, true)}
        </mesh>
        <mesh geometry={leftLowerFront}>
          {plateMaterial("#202a30", opacity * 0.58)}
        </mesh>
        <mesh position={[-5.24, -1.68, 0]}>
          <boxGeometry args={[9.48, 2.15, 7.96]} />
          {plateMaterial("#202a30", opacity * 0.58)}
        </mesh>
      </group>
      <group ref={rightRef}>
        <mesh geometry={rightTop}>
          {plateMaterial("#34484f", 1, true)}
        </mesh>
        <mesh geometry={rightUpperFront}>
          {plateMaterial("#364147", opacity, true)}
        </mesh>
        <mesh geometry={rightLowerFront}>
          {plateMaterial("#202a30", opacity)}
        </mesh>
        <mesh position={[5.24, -1.68, 0]}>
          <boxGeometry args={[9.48, 2.15, 7.96]} />
          {plateMaterial("#202a30", opacity)}
        </mesh>
      </group>
      {[-6.8, -4.7, -2.6, 2.6, 4.7, 6.8].map((x, index) => (
        <mesh
          key={x}
          position={[x, seafloorHeight(x, 3.9) + 0.035, 3.9]}
          rotation={[-Math.PI / 2, 0, index % 2 === 0 ? 0.18 : -0.12]}
        >
          <planeGeometry args={[0.75, 0.018]} />
          <meshBasicMaterial
            color="#63747a"
            transparent
            opacity={0.38}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

const VOLCANO_BANDS = [
  [1.05, 1.88, "#342720"],
  [1.88, 2.68, "#4a3026"],
  [2.68, 3.47, "#2a2521"],
  [3.47, 4.24, "#56372b"],
  [4.24, 5.03, "#312923"],
  [5.03, 5.82, "#624133"],
  [5.82, 6.6, "#35312c"],
  [6.6, 7.35, "#6a4937"],
  [7.35, 8.08, "#38322d"],
  [8.08, 8.78, "#4e352c"],
] as const;

function SurfaceLavaRills({
  stage,
  playing,
  speed,
}: {
  stage: VolcanoStage;
  playing: boolean;
  speed: number;
}) {
  const glowRef = useRef<THREE.MeshStandardMaterial>(null);
  const paths = useMemo(
    () => [
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.08, 8.7, VOLCANO_SLICE_Z + 0.14),
        new THREE.Vector3(0.48, 8.02, VOLCANO_SLICE_Z + 0.2),
        new THREE.Vector3(0.82, 7.28, VOLCANO_SLICE_Z + 0.22),
        new THREE.Vector3(1.35, 6.5, VOLCANO_SLICE_Z + 0.24),
        new THREE.Vector3(1.92, 5.86, VOLCANO_SLICE_Z + 0.26),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.16, 8.68, VOLCANO_SLICE_Z + 0.12),
        new THREE.Vector3(-0.62, 7.92, VOLCANO_SLICE_Z + 0.18),
        new THREE.Vector3(-1.2, 7.24, VOLCANO_SLICE_Z + 0.2),
        new THREE.Vector3(-1.63, 6.53, VOLCANO_SLICE_Z + 0.24),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.32, 7.65, VOLCANO_SLICE_Z + 0.1),
        new THREE.Vector3(0.82, 7.18, VOLCANO_SLICE_Z + 0.14),
        new THREE.Vector3(1.28, 6.83, VOLCANO_SLICE_Z + 0.18),
      ]),
    ],
    [],
  );

  useFrame(({ clock }) => {
    if (!glowRef.current) return;
    const active = stage === "eruption" || stage === "cooling";
    const pulse = active
      ? 0.72 + (Math.sin(clock.elapsedTime * speed * 2.2) + 1) * 0.18
      : 0.08;
    glowRef.current.emissiveIntensity =
      (playing || !active ? pulse : 0.76) * 2;
  });

  const visible = stage === "eruption" || stage === "cooling";

  return (
    <group>
      {paths.map((curve, index) => (
        <group key={index}>
          <mesh>
            <tubeGeometry args={[curve, 36, 0.078 - index * 0.012, 8, false]} />
            <meshStandardMaterial color="#1f1714" roughness={0.96} />
          </mesh>
          <mesh>
            <tubeGeometry args={[curve, 36, 0.035 - index * 0.005, 8, false]} />
            <meshStandardMaterial
              ref={index === 0 ? glowRef : undefined}
              color={visible ? "#ff8c2d" : "#291915"}
              emissive={visible ? "#ff3006" : "#130706"}
              emissiveIntensity={visible ? 1.5 : 0.03}
              roughness={0.42}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function VolcanoIsland({
  stage,
  cutaway,
  playing,
  speed,
}: {
  stage: VolcanoStage;
  cutaway: boolean;
  playing: boolean;
  speed: number;
}) {
  const exteriorGeometry = useMemo(() => createVolcanoExteriorGeometry(), []);
  const craterGeometry = useMemo(() => createCraterGeometry(), []);
  const bandGeometries = useMemo(
    () =>
      VOLCANO_BANDS.map(([bottom, top], index) =>
        createVolcanoBandGeometry(bottom, top, index),
      ),
    [],
  );

  return (
    <group>
      <mesh
        geometry={exteriorGeometry}
        position={[
          0,
          (VOLCANO_BASE_Y + VOLCANO_SUMMIT_Y) / 2,
          VOLCANO_SLICE_Z - 0.06,
        ]}
      >
        <meshStandardMaterial
          color="#28312d"
          roughness={1}
          metalness={0.01}
          flatShading
          side={THREE.DoubleSide}
        />
      </mesh>

      {bandGeometries.map((geometry, index) => (
        <mesh key={index} geometry={geometry}>
          <meshStandardMaterial
            color={VOLCANO_BANDS[index][2]}
            roughness={0.96}
            metalness={0.01}
            flatShading
            transparent
            opacity={cutaway ? 0.98 : 0.62}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {VOLCANO_BANDS.slice(1).map(([bottom], index) => {
        const radius = volcanoRadiusAtHeight(bottom);
        const points = Array.from({ length: 13 }, (_, pointIndex) => {
          const progress = pointIndex / 12;
          return [
            -radius + progress * radius * 2,
            bottom +
              Math.sin(progress * Math.PI * 3 + index * 0.85) * 0.045,
            VOLCANO_SLICE_Z + 0.07,
          ] as Point3;
        });
        return (
          <Line
            key={bottom}
            points={points}
            color={index % 2 === 0 ? "#9c6a4b" : "#1a1715"}
            lineWidth={0.75}
            transparent
            opacity={cutaway ? 0.62 : 0.26}
          />
        );
      })}

      {[-3.2, -2.35, 2.45, 3.3].map((x, index) => (
        <Line
          key={x}
          points={[
            [x, 1.18, VOLCANO_SLICE_Z + 0.08],
            [x * 0.82, 2.6, VOLCANO_SLICE_Z + 0.1],
            [x * 0.58, 4.35, VOLCANO_SLICE_Z + 0.1],
            [x * 0.34, 6.1, VOLCANO_SLICE_Z + 0.11],
            [x * 0.12, 8.26, VOLCANO_SLICE_Z + 0.12],
          ]}
          color={index % 2 === 0 ? "#72503d" : "#181817"}
          lineWidth={0.55}
          transparent
          opacity={0.46}
        />
      ))}

      <mesh
        geometry={craterGeometry}
        position={[0, VOLCANO_SUMMIT_Y, VOLCANO_SLICE_Z - 0.02]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[1.12, 0.68, 1]}
      >
        <meshStandardMaterial
          color="#171615"
          roughness={0.98}
          flatShading
        />
      </mesh>
      <mesh
        position={[0, VOLCANO_SUMMIT_Y + 0.01, VOLCANO_SLICE_Z + 0.02]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[0.53, 32]} />
        <meshStandardMaterial
          color="#7e2112"
          emissive="#ff3008"
          emissiveIntensity={stage === "eruption" ? 2.4 : 0.72}
          roughness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh
        position={[0, SEA_LEVEL, VOLCANO_SLICE_Z - 0.1]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[1, 0.72, 1]}
      >
        <torusGeometry
          args={[volcanoRadiusAtHeight(SEA_LEVEL), 0.075, 8, 72]}
        />
        <meshStandardMaterial
          color="#87d7dc"
          emissive="#2a7182"
          emissiveIntensity={0.7}
          transparent
          opacity={0.58}
          roughness={0.35}
        />
      </mesh>

      <SurfaceLavaRills stage={stage} playing={playing} speed={speed} />
    </group>
  );
}

function MagmaConduit() {
  const chamberRef = useRef<THREE.Group>(null);
  const chamberGeometry = useMemo(
    () => createIrregularRockGeometry(1, 3, 2.4),
    [],
  );
  const mainConduit = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.15, -2.42, 0),
        new THREE.Vector3(-0.14, -1.72, 0.06),
        new THREE.Vector3(-0.2, -0.82, 0.02),
        new THREE.Vector3(0, 0.2, 0),
        new THREE.Vector3(0, 1.2, 0),
        new THREE.Vector3(0.13, 2.75, 0.02),
        new THREE.Vector3(-0.08, 4.35, -0.02),
        new THREE.Vector3(0.1, 6.1, 0.01),
        new THREE.Vector3(-0.03, 7.55, 0),
        new THREE.Vector3(0, 8.82, 0),
      ]),
    [],
  );
  const branches = useMemo(
    () => [
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.15, -1.05, 0),
        new THREE.Vector3(-0.65, -0.45, 0.08),
        new THREE.Vector3(-0.9, 0.24, 0.12),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.02, 2.45, -0.04),
        new THREE.Vector3(0.62, 2.92, -0.08),
        new THREE.Vector3(1.35, 3.28, -0.12),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.03, 3.78, 0),
        new THREE.Vector3(-0.75, 4.22, 0.04),
        new THREE.Vector3(-1.55, 4.45, 0.08),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.04, 5.38, -0.02),
        new THREE.Vector3(0.8, 5.88, 0.02),
        new THREE.Vector3(1.66, 6.1, 0.06),
      ]),
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.02, 6.62, 0),
        new THREE.Vector3(-0.6, 7.02, 0.04),
        new THREE.Vector3(-1.18, 7.3, 0.08),
      ]),
    ],
    [],
  );

  useFrame(({ clock }) => {
    if (!chamberRef.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 1.45) * 0.025;
    chamberRef.current.scale.set(1.62 * pulse, 0.52 * pulse, 0.88 * pulse);
  });

  return (
    <group>
      <mesh>
        <tubeGeometry args={[mainConduit, 112, 0.22, 12, false]} />
        <meshStandardMaterial
          color="#2d1713"
          roughness={0.9}
          transparent
          opacity={0.86}
        />
      </mesh>
      <mesh>
        <tubeGeometry args={[mainConduit, 112, 0.125, 12, false]} />
        <meshStandardMaterial
          color="#ff7a25"
          emissive="#ff2f05"
          emissiveIntensity={2.15}
          roughness={0.36}
        />
      </mesh>
      {branches.map((curve, index) => (
        <group key={index}>
          <mesh>
            <tubeGeometry args={[curve, 28, 0.078, 8, false]} />
            <meshStandardMaterial color="#2d1713" roughness={0.9} />
          </mesh>
          <mesh>
            <tubeGeometry args={[curve, 28, 0.043, 8, false]} />
            <meshStandardMaterial
              color="#ff6b1c"
              emissive="#ff2e06"
              emissiveIntensity={1.7}
              roughness={0.4}
            />
          </mesh>
        </group>
      ))}
      <group ref={chamberRef} position={[0.15, -2.42, 0]}>
        <mesh geometry={chamberGeometry}>
          <meshStandardMaterial
            color="#d94f1d"
            emissive="#ff2a00"
            emissiveIntensity={1.55}
            roughness={0.52}
            flatShading
          />
        </mesh>
        <mesh geometry={chamberGeometry} scale={1.08}>
          <meshStandardMaterial
            color="#351b18"
            transparent
            opacity={0.22}
            roughness={0.94}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}

function MagmaParticle({
  index,
  stage,
  playing,
  speed,
}: {
  index: number;
  stage: VolcanoStage;
  playing: boolean;
  speed: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const elapsed = useRef(index * 0.31);

  useEffect(() => {
    elapsed.current = index * 0.31;
  }, [index, stage]);

  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    if (playing) elapsed.current += delta * speed;

    if (stage === "melting") {
      const angle = index * 1.7;
      const pulse = elapsed.current * 0.7 + angle;
      mesh.position.set(
        Math.sin(angle) * 1.75,
        -4.8 + (index % 4) * 0.38 + Math.sin(pulse) * 0.2,
        Math.cos(angle * 1.35) * 0.86,
      );
      const scale = 0.8 + Math.sin(pulse * 1.4) * 0.18;
      mesh.scale.setScalar(scale);
      return;
    }

    const progress = loopingProgress(elapsed.current + index * 0.2, 4.4);
    const [x, y, z] = magmaPathPosition(progress);
    mesh.position.set(
      x + Math.sin(index * 2.1) * 0.16,
      y,
      z + Math.cos(index * 1.3) * 0.18,
    );
    mesh.scale.setScalar(stage === "cooling" ? 0.52 : 0.86);
  });

  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[0.075 + (index % 3) * 0.014, 1]} />
      <meshStandardMaterial
        color="#ff9b31"
        emissive="#ff3500"
        emissiveIntensity={2.15}
        roughness={0.28}
        transparent
        opacity={stage === "cooling" ? 0.34 : 0.9}
      />
    </mesh>
  );
}

function MagmaParticles({
  stage,
  playing,
  speed,
}: {
  stage: VolcanoStage;
  playing: boolean;
  speed: number;
}) {
  return (
    <group>
      {Array.from({ length: 24 }, (_, index) => (
        <MagmaParticle
          key={index}
          index={index}
          stage={stage}
          playing={playing}
          speed={speed}
        />
      ))}
    </group>
  );
}

function OceanParticles({ playing, speed }: { playing: boolean; speed: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const values = new Float32Array(240 * 3);
    for (let index = 0; index < 240; index += 1) {
      values[index * 3] = ((index * 47) % 199) / 199 * 19 - 9.5;
      values[index * 3 + 1] = ((index * 83) % 173) / 173 * 5.2 + 0.7;
      values[index * 3 + 2] = ((index * 31) % 151) / 151 * 8 - 4;
    }
    return values;
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current || !playing) return;
    pointsRef.current.rotation.y += delta * 0.012 * speed;
    pointsRef.current.position.x = Math.sin(Date.now() * 0.00008) * 0.12;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#a9e9ef"
        size={0.035}
        transparent
        opacity={0.46}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function CloudCluster({
  position,
  scale,
}: {
  position: Point3;
  scale: number;
}) {
  return (
    <group position={position} scale={scale}>
      {[
        [-0.75, 0, 0, 0.62],
        [-0.2, 0.18, 0.05, 0.86],
        [0.52, 0.04, -0.02, 0.7],
        [1.05, -0.08, 0.02, 0.48],
      ].map(([x, y, z, puffScale], index) => (
        <mesh key={index} position={[x, y, z]} scale={puffScale}>
          <sphereGeometry args={[1, 18, 12]} />
          <meshBasicMaterial
            color={index % 2 === 0 ? "#d8e6e5" : "#f0f4ef"}
            transparent
            opacity={0.16}
            depthWrite={false}
            fog={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function AtmosphericSky() {
  return (
    <group>
      <mesh position={[0, 8.7, -7.8]}>
        <planeGeometry args={[34, 16]} />
        <meshBasicMaterial color="#16435b" fog={false} />
      </mesh>
      <mesh position={[-7.4, 11.1, -7.55]}>
        <circleGeometry args={[1.35, 40]} />
        <meshBasicMaterial
          color="#b8e0df"
          transparent
          opacity={0.22}
          fog={false}
        />
      </mesh>
      <CloudCluster position={[-7.1, 8.8, -6.8]} scale={0.8} />
      <CloudCluster position={[6.8, 9.5, -6.9]} scale={0.62} />
      <CloudCluster position={[-3.8, 10.7, -7]} scale={0.45} />
    </group>
  );
}

function OceanSurface({
  playing,
  speed,
}: {
  playing: boolean;
  speed: number;
}) {
  const geometryRef = useRef<THREE.PlaneGeometry>(null);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    const geometry = geometryRef.current;
    if (!geometry) return;
    if (playing) elapsed.current += delta * speed;
    const position = geometry.getAttribute("position");
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      const y = position.getY(index);
      const wave =
        Math.sin(x * 0.55 + elapsed.current * 0.42) * 0.07 +
        Math.sin(y * 0.72 - elapsed.current * 0.31) * 0.045;
      position.setZ(index, wave);
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return (
    <mesh position={[0, SEA_LEVEL, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry ref={geometryRef} args={[20, 8, 34, 16]} />
      <meshPhysicalMaterial
        color="#318fa0"
        emissive="#123d4a"
        emissiveIntensity={0.34}
        transparent
        opacity={0.42}
        roughness={0.26}
        metalness={0.08}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function LightShafts() {
  return (
    <group position={[0, 2.55, -1.5]}>
      {[
        [-4.8, 0.45, -0.12, 1.15],
        [-0.8, 0.1, 0.08, 1.4],
        [3.6, 0.35, -0.08, 1.05],
      ].map(([x, z, tilt, scale], index) => (
        <mesh
          key={index}
          position={[x, 0, z]}
          rotation={[0, 0, tilt]}
          scale={[scale, 1, scale]}
        >
          <coneGeometry args={[1.15, 6.1, 22, 1, true]} />
          <meshBasicMaterial
            color="#6dc9d3"
            transparent
            opacity={0.035}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

function BubbleStream({
  index,
  playing,
  speed,
  active,
}: {
  index: number;
  playing: boolean;
  speed: number;
  active: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const elapsed = useRef(index * 0.37);

  useFrame((_, delta) => {
    if (!ref.current) return;
    if (playing) elapsed.current += delta * speed;
    const progress = loopingProgress(elapsed.current + index * 0.25, 3.4);
    ref.current.position.set(
      Math.sin(index * 2.3) * 0.28 + Math.sin(progress * Math.PI * 2) * 0.06,
      1.25 + progress * 3.1,
      Math.cos(index * 1.7) * 0.26,
    );
    ref.current.scale.setScalar(active ? 0.35 + progress * 0.55 : 0);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.065 + (index % 3) * 0.014, 14, 10]} />
      <meshPhysicalMaterial
        color="#b9f2f4"
        transparent
        opacity={0.3}
        roughness={0.1}
        transmission={0.2}
        depthWrite={false}
      />
    </mesh>
  );
}

function EjectaSpark({
  index,
  playing,
  speed,
  active,
}: {
  index: number;
  playing: boolean;
  speed: number;
  active: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const elapsed = useRef(index * 0.21);

  useFrame((_, delta) => {
    if (!ref.current) return;
    if (playing) elapsed.current += delta * speed;
    const progress = loopingProgress(elapsed.current + index * 0.17, 2.7);
    const direction = index % 2 === 0 ? -1 : 1;
    ref.current.position.set(
      direction * progress * (0.35 + (index % 4) * 0.1),
      1.28 + Math.sin(progress * Math.PI) * (0.45 + (index % 3) * 0.12),
      Math.sin(index * 1.7) * progress * 0.35,
    );
    const fade = Math.sin(progress * Math.PI);
    ref.current.scale.setScalar(active ? Math.max(0.01, fade) : 0);
  });

  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[0.035 + (index % 3) * 0.008, 0]} />
      <meshStandardMaterial
        color="#ff9a3d"
        emissive="#ff3f0b"
        emissiveIntensity={2}
      />
    </mesh>
  );
}

function AshPuff({
  index,
  stage,
  playing,
  speed,
}: {
  index: number;
  stage: VolcanoStage;
  playing: boolean;
  speed: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const elapsed = useRef(index * 0.33);
  const geometry = useMemo(
    () => createIrregularRockGeometry(1, 1, 10.4 + index * 0.63),
    [index],
  );

  useEffect(() => {
    elapsed.current = index * 0.33;
  }, [index, stage]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    if (playing) elapsed.current += delta * speed;
    const duration = stage === "eruption" ? 5.6 : 7.4;
    const progress = loopingProgress(elapsed.current + index * 0.22, duration);
    const active = stage === "eruption" || stage === "cooling";
    const coolingScale = stage === "cooling" ? 0.42 : 1;
    const spread = 0.3 + progress * 1.7;
    ref.current.position.set(
      Math.sin(index * 2.17) * spread + progress * 0.72,
      VOLCANO_SUMMIT_Y + 0.58 + progress * (stage === "eruption" ? 3.4 : 1.8),
      VOLCANO_SLICE_Z -
        0.18 +
        Math.cos(index * 1.73) * (0.2 + progress * 0.72),
    );
    const fade = Math.sin(progress * Math.PI);
    ref.current.scale.setScalar(
      active
        ? coolingScale *
            Math.max(0.02, fade) *
            (0.28 + progress * 0.92) *
            (0.72 + (index % 4) * 0.09)
        : 0,
    );
  });

  return (
    <mesh ref={ref} geometry={geometry}>
      <meshStandardMaterial
        color={
          stage === "cooling"
            ? index % 2 === 0
              ? "#b8c9c7"
              : "#8fa5a4"
            : index % 3 === 0
              ? "#282a2a"
              : "#404241"
        }
        transparent
        opacity={stage === "cooling" ? 0.2 : 0.42}
        roughness={1}
        depthWrite={false}
      />
    </mesh>
  );
}

function SummitBomb({
  index,
  stage,
  playing,
  speed,
}: {
  index: number;
  stage: VolcanoStage;
  playing: boolean;
  speed: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const elapsed = useRef(index * 0.18);

  useEffect(() => {
    elapsed.current = index * 0.18;
  }, [index, stage]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    if (playing) elapsed.current += delta * speed;
    const progress = loopingProgress(elapsed.current + index * 0.12, 2.8);
    const angle = index * 2.399;
    const distance = progress * (0.55 + (index % 6) * 0.22);
    ref.current.position.set(
      Math.cos(angle) * distance,
      VOLCANO_SUMMIT_Y +
        0.25 +
        Math.sin(progress * Math.PI) * (1.4 + (index % 4) * 0.3) -
        progress * 0.35,
      VOLCANO_SLICE_Z + Math.sin(angle) * distance * 0.5,
    );
    const fade = Math.sin(progress * Math.PI);
    ref.current.scale.setScalar(
      stage === "eruption" ? Math.max(0.01, fade) : 0,
    );
  });

  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[0.055 + (index % 3) * 0.012, 0]} />
      <meshStandardMaterial
        color="#ffc05b"
        emissive="#ff3107"
        emissiveIntensity={3.2}
        roughness={0.3}
      />
    </mesh>
  );
}

function SummitEruption({
  stage,
  playing,
  speed,
}: {
  stage: VolcanoStage;
  playing: boolean;
  speed: number;
}) {
  const fountainRef = useRef<THREE.Group>(null);
  const fountainGeometry = useMemo(
    () => createIrregularRockGeometry(0.48, 2, 4.7),
    [],
  );

  useFrame(({ clock }) => {
    if (!fountainRef.current) return;
    const active = stage === "eruption";
    const pulse =
      0.72 + (Math.sin(clock.elapsedTime * speed * 3.2) + 1) * 0.18;
    fountainRef.current.scale.set(
      active ? pulse : 0,
      active ? pulse * 1.75 : 0,
      active ? pulse : 0,
    );
  });

  return (
    <group>
      <group
        ref={fountainRef}
        position={[0, VOLCANO_SUMMIT_Y + 0.42, VOLCANO_SLICE_Z]}
      >
        <mesh geometry={fountainGeometry}>
          <meshStandardMaterial
            color="#ff7d22"
            emissive="#ff2500"
            emissiveIntensity={2.8}
            roughness={0.36}
            flatShading
          />
        </mesh>
        <mesh geometry={fountainGeometry} scale={0.48}>
          <meshStandardMaterial
            color="#ffd86c"
            emissive="#ff6b12"
            emissiveIntensity={3.5}
            roughness={0.25}
          />
        </mesh>
      </group>
      {Array.from({ length: 18 }, (_, index) => (
        <AshPuff
          key={`ash-${index}`}
          index={index}
          stage={stage}
          playing={playing}
          speed={speed}
        />
      ))}
      {Array.from({ length: 24 }, (_, index) => (
        <SummitBomb
          key={`summit-bomb-${index}`}
          index={index}
          stage={stage}
          playing={playing}
          speed={speed}
        />
      ))}
    </group>
  );
}

function EruptionFlow({
  stage,
  playing,
  speed,
}: {
  stage: VolcanoStage;
  playing: boolean;
  speed: number;
}) {
  const ventRef = useRef<THREE.Group>(null);
  const leftFlowRef = useRef<THREE.Group>(null);
  const rightFlowRef = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  const ventGeometry = useMemo(
    () => createIrregularRockGeometry(0.36, 2, 1.2),
    [],
  );
  const leftGeometry = useMemo(
    () => createIrregularRockGeometry(0.56, 2, 3.6),
    [],
  );
  const rightGeometry = useMemo(
    () => createIrregularRockGeometry(0.53, 2, 5.1),
    [],
  );

  useEffect(() => {
    elapsed.current = stage === "eruption" ? 0.3 : 2.1;
  }, [stage]);

  useFrame((_, delta) => {
    if (playing) elapsed.current += delta * speed;
    const cycle = loopingProgress(elapsed.current, 4.8);
    const state = eruptionState(cycle);
    const intensity = stage === "eruption" ? 1 : stage === "cooling" ? 0.42 : 0;

    if (ventRef.current) {
      ventRef.current.scale.set(
        (0.5 + state.ventRise * 0.5) * intensity,
        (0.3 + state.ventRise * 0.9) * intensity,
        (0.5 + state.ventRise * 0.5) * intensity,
      );
    }
    if (leftFlowRef.current) {
      leftFlowRef.current.scale.set(
        Math.max(0, state.lateralFlow * 1.65 * intensity),
        0.48 * intensity,
        0.72 * intensity,
      );
    }
    if (rightFlowRef.current) {
      rightFlowRef.current.scale.set(
        Math.max(0, state.lateralFlow * 1.3 * intensity),
        0.46 * intensity,
        0.66 * intensity,
      );
    }
  });

  const active = stage === "eruption" || stage === "cooling";

  return (
    <group>
      <mesh position={[0, 1.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.43, 0.12, 12, 28]} />
        <meshStandardMaterial
          color="#1d2426"
          roughness={0.96}
          flatShading
        />
      </mesh>
      <group ref={ventRef} position={[0, 1.32, 0]}>
        <mesh geometry={ventGeometry}>
          <meshStandardMaterial
            color="#d95a20"
            emissive="#ff2600"
            emissiveIntensity={1.9}
            roughness={0.48}
            flatShading
          />
        </mesh>
        <mesh geometry={ventGeometry} scale={0.72}>
          <meshStandardMaterial
            color="#ffd16d"
            emissive="#ff4c10"
            emissiveIntensity={2.6}
            roughness={0.3}
          />
        </mesh>
      </group>
      <group
        ref={leftFlowRef}
        position={[-0.66, 1.24, 0.04]}
        rotation={[0.08, 0.06, -0.18]}
      >
        <mesh geometry={leftGeometry}>
          <meshStandardMaterial
            color="#4a2e29"
            emissive="#c52c0d"
            emissiveIntensity={0.72}
            roughness={0.84}
            flatShading
          />
        </mesh>
        <mesh geometry={leftGeometry} scale={0.64} position={[-0.2, 0.02, 0]}>
          <meshStandardMaterial
            color="#ff7c27"
            emissive="#ff2d06"
            emissiveIntensity={2.15}
            roughness={0.4}
          />
        </mesh>
      </group>
      <group
        ref={rightFlowRef}
        position={[0.62, 1.25, -0.05]}
        rotation={[-0.05, -0.08, 0.16]}
      >
        <mesh geometry={rightGeometry}>
          <meshStandardMaterial
            color="#4a2e29"
            emissive="#bf2a0d"
            emissiveIntensity={0.68}
            roughness={0.84}
            flatShading
          />
        </mesh>
        <mesh geometry={rightGeometry} scale={0.62} position={[0.18, 0.02, 0]}>
          <meshStandardMaterial
            color="#ff7925"
            emissive="#ff2b05"
            emissiveIntensity={2.1}
            roughness={0.4}
          />
        </mesh>
      </group>
      {Array.from({ length: 8 }, (_, index) => (
        <BubbleStream
          key={index}
          index={index}
          playing={playing}
          speed={speed}
          active={active}
        />
      ))}
      {Array.from({ length: 14 }, (_, index) => (
        <EjectaSpark
          key={`spark-${index}`}
          index={index}
          playing={playing}
          speed={speed}
          active={stage === "eruption"}
        />
      ))}
    </group>
  );
}

const PILLOW_POSITIONS = [
  [-3.25, 0.63, 0.25, 0.84],
  [-2.55, 0.82, -0.4, 0.78],
  [-1.85, 0.9, 0.45, 0.72],
  [-1.2, 1.02, -0.35, 0.68],
  [0.88, 1.08, 0.35, 0.62],
  [1.45, 1.01, -0.38, 0.7],
  [2.08, 0.92, 0.4, 0.76],
  [2.75, 0.8, -0.28, 0.8],
  [3.42, 0.64, 0.32, 0.86],
] as const;

function PillowLava({
  index,
  stage,
  playing,
  speed,
}: {
  index: number;
  stage: VolcanoStage;
  playing: boolean;
  speed: number;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const seamMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const elapsed = useRef(index * 0.29);
  const hotColor = useMemo(() => new THREE.Color("#ff6a18"), []);
  const coolColor = useMemo(() => new THREE.Color("#31373b"), []);
  const hotEmissive = useMemo(() => new THREE.Color("#ff2600"), []);
  const darkEmissive = useMemo(() => new THREE.Color("#120503"), []);
  const geometry = useMemo(
    () => createIrregularRockGeometry(1, 2, 7.2 + index * 1.13),
    [index],
  );
  const [x, y, z, size] = PILLOW_POSITIONS[index];

  useEffect(() => {
    elapsed.current = index * 0.29;
  }, [index, stage]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    const material = materialRef.current;
    const seamMaterial = seamMaterialRef.current;
    if (!mesh || !material || !seamMaterial) return;
    if (playing) elapsed.current += delta * speed;

    const stageActive = stage === "cooling";
    const isActiveLobe = index === 4;
    const progress =
      stageActive && isActiveLobe
        ? loopingProgress(elapsed.current, 5.4)
        : 1;
    const state = pillowFormationState(progress);
    const baseVisibility =
      stage === "melting" || stage === "rising"
        ? 0.14
        : stage === "eruption"
          ? 0.62
          : 1;
    const growth = stageActive && isActiveLobe
      ? Math.max(0.08, Math.min(1, state.shellProgress + state.nextLobeProgress * 0.25))
      : stageActive
        ? 1
        : baseVisibility;
    const heatAmount =
      stageActive && isActiveLobe ? Math.pow(state.coreHeat, 2.2) : 0.015;

    mesh.scale.set(size * 1.22 * growth, size * 0.72 * growth, size * growth);
    material.color.copy(coolColor).lerp(hotColor, heatAmount);
    material.emissive
      .copy(darkEmissive)
      .lerp(hotEmissive, heatAmount * 0.72);
    material.emissiveIntensity =
      stageActive && isActiveLobe ? 1.25 * heatAmount : 0.04;
    seamMaterial.opacity =
      stageActive && isActiveLobe
        ? Math.max(0.03, heatAmount * (1 - state.shellProgress * 0.7))
        : 0.025;
    seamMaterial.emissiveIntensity =
      stageActive && isActiveLobe ? 1.8 * heatAmount : 0.06;
  });

  return (
    <group ref={meshRef} position={[x, y, z]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          ref={materialRef}
          color="#343b3e"
          emissive="#120503"
          roughness={0.94}
          flatShading
        />
      </mesh>
      <mesh
        position={[index < 4 ? -0.72 : 0.72, 0.02, 0.02]}
        rotation={[0, index < 4 ? -0.22 : 0.22, Math.PI / 2]}
        scale={[0.6, 0.78, 0.6]}
      >
        <torusGeometry args={[0.42, 0.045, 8, 22]} />
        <meshStandardMaterial
          ref={seamMaterialRef}
          color="#ff8a2b"
          emissive="#ff3608"
          emissiveIntensity={1.5}
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function PillowField({
  stage,
  playing,
  speed,
}: {
  stage: VolcanoStage;
  playing: boolean;
  speed: number;
}) {
  return (
    <group>
      {PILLOW_POSITIONS.map((_, index) => (
        <PillowLava
          key={index}
          index={index}
          stage={stage}
          playing={playing}
          speed={speed}
        />
      ))}
    </group>
  );
}

function TeachingArrows({ stage }: { stage: VolcanoStage }) {
  const plateColor = "#72d6d2";
  const magmaColor = "#ff9c38";

  return (
    <group>
      {(stage === "melting" || stage === "rising") && (
        <>
          <arrowHelper
            args={[
              new THREE.Vector3(-1, 0, 0),
              new THREE.Vector3(-0.9, 0.92, 1.3),
              3.2,
              plateColor,
              0.48,
              0.28,
            ]}
          />
          <arrowHelper
            args={[
              new THREE.Vector3(1, 0, 0),
              new THREE.Vector3(0.9, 0.92, 1.3),
              3.2,
              plateColor,
              0.48,
              0.28,
            ]}
          />
          <arrowHelper
            args={[
              new THREE.Vector3(0, 1, 0),
              new THREE.Vector3(-1.8, -5.6, 1.15),
              2.8,
              magmaColor,
              0.5,
              0.3,
            ]}
          />
          <arrowHelper
            args={[
              new THREE.Vector3(0.18, 0.98, 0),
              new THREE.Vector3(0, -3.15, 1.05),
              3.2,
              magmaColor,
              0.5,
              0.3,
            ]}
          />
        </>
      )}
    </group>
  );
}

function SceneLabels({
  stage,
  selectedHotspot,
}: {
  stage: VolcanoStage;
  selectedHotspot: VolcanoHotspotId | null;
}) {
  return (
    <>
      {stage === "melting" && (
        <>
          <Html center position={[0, -5.75, 0.8]}>
            <span className={styles.sceneLabel}>
              地幔上涌 · 压力逐渐降低
            </span>
          </Html>
          <Html center position={[-4.25, 0.92, 0.8]}>
            <span className={styles.sceneLabel}>洋壳缓慢分开</span>
          </Html>
        </>
      )}
      {stage === "rising" && (
        <>
          <Html center position={[1.55, -2.35, 4.05]}>
            <span className={styles.sceneLabel}>岩浆储集区</span>
          </Html>
          <Html center position={[1.48, 4.45, 4.05]}>
            <span className={styles.sceneLabel}>主通道与岩浆支脉</span>
          </Html>
        </>
      )}
      {stage === "eruption" && (
        <>
          <Html center position={[1.7, 9.35, 3.85]}>
            <span className={styles.sceneLabel}>山顶火山口</span>
          </Html>
          <Html center position={[-4.55, 2.08, 1.2]}>
            <span className={styles.sceneLabel}>侧翼海底喷口</span>
          </Html>
        </>
      )}
      {stage === "cooling" && (
        <>
          <Html center position={[-4.2, 1.72, 1.15]}>
            <span className={styles.sceneLabel}>海下形成枕状熔岩</span>
          </Html>
          <Html center position={[2.35, 6.25, 3.86]}>
            <span className={styles.sceneLabel}>海上熔岩沿山坡冷却</span>
          </Html>
        </>
      )}
      <Html
        center
        position={
          stage === "melting"
            ? [0, -3.55, 4.05]
            : stage === "rising"
              ? [2.2, 5.25, 4.05]
              : stage === "eruption"
                ? [2.65, 10.55, 3.55]
                : [2.75, 7.1, 3.9]
        }
      >
        <span className={styles.sceneCaption}>
          {STAGE_DEFINITIONS[stage].sceneLabel}
        </span>
      </Html>
      {selectedHotspot && (
        <Html center position={HOTSPOTS[selectedHotspot].position}>
          <span className={styles.selectedPin}>{HOTSPOTS[selectedHotspot].name}</span>
        </Html>
      )}
    </>
  );
}

function HotspotMarkers({
  selected,
  onSelect,
}: {
  selected: VolcanoHotspotId | null;
  onSelect: (hotspot: VolcanoHotspotId) => void;
}) {
  return (
    <group>
      {HOTSPOT_ORDER.map((id) => {
        const hotspot = HOTSPOTS[id];
        const isSelected = id === selected;
        return (
          <mesh
            key={id}
            position={hotspot.position}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(id);
            }}
            onPointerEnter={() => {
              document.body.style.cursor = "pointer";
            }}
            onPointerLeave={() => {
              document.body.style.cursor = "";
            }}
            scale={isSelected ? 1.25 : 1}
          >
            <sphereGeometry args={[0.08, 18, 12]} />
            <meshBasicMaterial
              color={isSelected ? "#f7d163" : "#9de8e1"}
              transparent
              opacity={isSelected ? 0.95 : 0.58}
              depthTest={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function VolcanoScene({
  stage,
  selectedHotspot,
  playing,
  speed,
  overlays,
  onSelectHotspot,
}: {
  stage: VolcanoStage;
  selectedHotspot: VolcanoHotspotId | null;
  playing: boolean;
  speed: number;
  overlays: VolcanoOverlayState;
  onSelectHotspot: (hotspot: VolcanoHotspotId) => void;
}) {
  return (
    <>
      <ambientLight intensity={0.7} />
      <hemisphereLight args={["#75c9d7", "#35201b", 1.35]} />
      <pointLight
        position={[0, -1.55, 5.2]}
        color="#ff5a19"
        intensity={26}
        distance={9}
        decay={1.8}
      />
      <pointLight
        position={[0, 1.45, 0.5]}
        color="#ff8d3c"
        intensity={18}
        distance={5.5}
        decay={2}
      />
      <directionalLight position={[2, 7, 9]} color="#91dbe4" intensity={1.55} />
      <directionalLight
        position={[-6, 3, -5]}
        color="#285d70"
        intensity={0.7}
      />
      <directionalLight
        position={[-8, 12, 6]}
        color="#ffd7a3"
        intensity={1.2}
      />

      <AtmosphericSky />
      <mesh position={[0, 3.25, 0]}>
        <boxGeometry args={[20, 5, 8]} />
        <meshPhysicalMaterial
          color="#0c4558"
          transparent
          opacity={0.1}
          roughness={0.12}
          transmission={0.08}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <OceanSurface playing={playing} speed={speed} />
      <LightShafts />

      <MantleLayer cutaway={overlays.cutaway} />
      <OceanicCrust
        cutaway={overlays.cutaway}
        playing={playing}
        speed={speed}
      />
      <VolcanoIsland
        stage={stage}
        cutaway={overlays.cutaway}
        playing={playing}
        speed={speed}
      />
      <group position={[0, 0, VOLCANO_SLICE_Z + 0.1]}>
        <MagmaConduit />
        <MagmaParticles stage={stage} playing={playing} speed={speed} />
      </group>
      <SummitEruption stage={stage} playing={playing} speed={speed} />
      <group position={[-4.55, 0.2, 0.8]} scale={0.62}>
        <EruptionFlow stage={stage} playing={playing} speed={speed} />
      </group>
      <group position={[-4.55, 0.18, 0.8]} scale={0.62}>
        <PillowField stage={stage} playing={playing} speed={speed} />
      </group>
      {overlays.particles && (
        <OceanParticles playing={playing} speed={speed} />
      )}
      {overlays.arrows && <TeachingArrows stage={stage} />}
      {overlays.labels && (
        <SceneLabels stage={stage} selectedHotspot={selectedHotspot} />
      )}
      <HotspotMarkers selected={selectedHotspot} onSelect={onSelectHotspot} />

      <Line
        points={[
          [-0.5, 1.16, VOLCANO_SLICE_Z + 0.06],
          [-0.28, 1.34, VOLCANO_SLICE_Z + 0.12],
          [-0.08, 1.25, VOLCANO_SLICE_Z + 0.16],
          [0.12, 1.38, VOLCANO_SLICE_Z + 0.14],
          [0.34, 1.18, VOLCANO_SLICE_Z + 0.08],
        ]}
        color="#ff8a36"
        lineWidth={1.8}
        transparent
        opacity={0.9}
      />
    </>
  );
}

function CameraRig({
  controlsRef,
  stage,
  selectedHotspot,
  resetKey,
  reducedMotion,
}: {
  controlsRef: RefObject<OrbitControlsImpl | null>;
  stage: VolcanoStage;
  selectedHotspot: VolcanoHotspotId | null;
  resetKey: number;
  reducedMotion: boolean;
}) {
  const { camera } = useThree();
  const transition = useRef({
    active: false,
    elapsed: 0,
    startPosition: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endPosition: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
  });

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const definition = STAGE_DEFINITIONS[stage];
    let endPosition = new THREE.Vector3(...definition.cameraPosition);
    let endTarget = new THREE.Vector3(...definition.cameraTarget);

    if (selectedHotspot) {
      const hotspot = HOTSPOTS[selectedHotspot];
      endTarget = new THREE.Vector3(...hotspot.position);
      endPosition = endTarget.clone().add(new THREE.Vector3(...hotspot.cameraOffset));
    }

    const state = transition.current;
    state.active = !reducedMotion;
    state.elapsed = 0;
    state.startPosition.copy(camera.position);
    state.startTarget.copy(controls.target);
    state.endPosition.copy(endPosition);
    state.endTarget.copy(endTarget);

    if (reducedMotion) {
      camera.position.copy(endPosition);
      controls.target.copy(endTarget);
      controls.update();
    }
  }, [camera, controlsRef, reducedMotion, resetKey, selectedHotspot, stage]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    const state = transition.current;
    if (!controls || !state.active) return;

    state.elapsed += delta;
    const progress = Math.min(1, state.elapsed / 0.8);
    const eased = 1 - Math.pow(1 - progress, 3);
    camera.position.lerpVectors(state.startPosition, state.endPosition, eased);
    controls.target.lerpVectors(state.startTarget, state.endTarget, eased);
    controls.update();
    if (progress >= 1) state.active = false;
  });

  return null;
}

function VolcanoCanvas({
  stage,
  selectedHotspot,
  playing,
  speed,
  overlays,
  resetKey,
  reducedMotion,
  onSelectHotspot,
}: {
  stage: VolcanoStage;
  selectedHotspot: VolcanoHotspotId | null;
  playing: boolean;
  speed: number;
  overlays: VolcanoOverlayState;
  resetKey: number;
  reducedMotion: boolean;
  onSelectHotspot: (hotspot: VolcanoHotspotId) => void;
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const definition = STAGE_DEFINITIONS[stage];

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{
        position: [...definition.cameraPosition],
        fov: 46,
        near: 0.1,
        far: 80,
      }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl, camera }) => {
        gl.setClearColor("#0a2a38");
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.22;
        camera.lookAt(new THREE.Vector3(...definition.cameraTarget));
      }}
      onPointerMissed={() => undefined}
      aria-label="可以拖动和缩放的三维火山岛与海底剖面"
    >
      <fog attach="fog" args={["#0a2430", 22, 46]} />
      <VolcanoScene
        stage={stage}
        selectedHotspot={selectedHotspot}
        playing={playing}
        speed={speed}
        overlays={overlays}
        onSelectHotspot={onSelectHotspot}
      />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.075}
        minDistance={5}
        maxDistance={34}
        minPolarAngle={0.24}
        maxPolarAngle={Math.PI / 2.05}
        minAzimuthAngle={-Math.PI * 0.48}
        maxAzimuthAngle={Math.PI * 0.48}
        target={[...definition.cameraTarget]}
      />
      <CameraRig
        controlsRef={controlsRef}
        stage={stage}
        selectedHotspot={selectedHotspot}
        resetKey={resetKey}
        reducedMotion={reducedMotion}
      />
    </Canvas>
  );
}

function Toggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={styles.switchRow} htmlFor={id}>
      <span>{label}</span>
      <span className={styles.switchControl}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className={styles.switchTrack} aria-hidden="true" />
      </span>
    </label>
  );
}

export default function VolcanoApp() {
  const [stage, setStage] = useState<VolcanoStage>("melting");
  const [selectedHotspot, setSelectedHotspot] =
    useState<VolcanoHotspotId | null>(null);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<0.5 | 1 | 4>(1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [overlays, setOverlays] = useState<VolcanoOverlayState>(
    STAGE_DEFINITIONS.melting.defaultOverlays,
  );

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

  const definition = STAGE_DEFINITIONS[stage];
  const hotspot = selectedHotspot ? HOTSPOTS[selectedHotspot] : null;

  const changeStage = (nextStage: VolcanoStage) => {
    setStage(nextStage);
    setSelectedHotspot(null);
    setSettingsOpen(false);
    setPlaying(!reducedMotion);
    setOverlays({ ...STAGE_DEFINITIONS[nextStage].defaultOverlays });
    setResetKey((value) => value + 1);
  };

  const selectHotspot = (nextHotspot: VolcanoHotspotId) => {
    setSelectedHotspot(nextHotspot);
    setSettingsOpen(false);
    setResetKey((value) => value + 1);
  };

  const resetCamera = () => {
    setSelectedHotspot(null);
    setResetKey((value) => value + 1);
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  };

  return (
    <main className={styles.volcanoApp} data-testid="volcano-app">
      <div className={styles.canvasShell} data-testid="volcano-canvas">
        <VolcanoCanvas
          stage={stage}
          selectedHotspot={selectedHotspot}
          playing={playing}
          speed={speed}
          overlays={overlays}
          resetKey={resetKey}
          reducedMotion={reducedMotion}
          onSelectHotspot={selectHotspot}
        />
      </div>

      <header className={styles.appHeader}>
        <div className={styles.headerIdentity}>
          {/* vinext dev currently duplicates React when next/link is imported here. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            className={styles.backToGallery}
            href="/"
            aria-label="返回小小科学馆"
          >
            <ArrowLeft />
            <span>科学馆</span>
          </a>
          <div className={styles.brandLockup}>
            <span className={styles.brandMark} aria-hidden="true">
              <Mountain />
            </span>
            <div>
              <h1>火山的形成</h1>
              <p>从深海岩浆，到穿出海面的火山岛</p>
            </div>
          </div>
        </div>

        <div className={styles.playbackControls} aria-label="播放控制">
          <button
            type="button"
            className={`${styles.iconButton} ${styles.primaryAction}`}
            onClick={() => setPlaying((value) => !value)}
            aria-label={playing ? "暂停动画" : "播放动画"}
            data-tooltip={playing ? "暂停" : "播放"}
          >
            {playing ? <Pause /> : <Play />}
          </button>

          <div className={styles.speedControl} aria-label="动画速度">
            {([0.5, 1, 4] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={speed === value ? styles.active : ""}
                onClick={() => setSpeed(value)}
                aria-pressed={speed === value}
              >
                {value}×
              </button>
            ))}
          </div>

          <button
            type="button"
            className={styles.iconButton}
            onClick={resetCamera}
            aria-label="重置镜头"
            data-tooltip="重置镜头"
          >
            <RotateCcw />
          </button>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.desktopOnly}`}
            onClick={toggleFullscreen}
            aria-label="切换全屏"
            data-tooltip="全屏"
          >
            <Maximize />
          </button>
          <button
            type="button"
            className={`${styles.iconButton}${settingsOpen ? ` ${styles.active}` : ""}`}
            onClick={() => setSettingsOpen((value) => !value)}
            aria-label="显示设置"
            aria-expanded={settingsOpen}
            data-tooltip="显示设置"
          >
            <Settings />
          </button>
        </div>
      </header>

      {!settingsOpen && !hotspot && (
        <section className={styles.lessonStrip} aria-live="polite">
          <span className={styles.lessonKicker}>{definition.label}</span>
          <p>{definition.description}</p>
        </section>
      )}

      {hotspot && (
        <aside className={styles.factCard} aria-live="polite">
          <div>
            <span>{hotspot.eyebrow}</span>
            <strong>{hotspot.name}</strong>
          </div>
          <p>{hotspot.fact}</p>
          <button
            type="button"
            onClick={resetCamera}
            aria-label={`关闭${hotspot.name}知识卡`}
          >
            <X />
          </button>
        </aside>
      )}

      {settingsOpen && (
        <aside
          className={styles.settingsPanel}
          aria-label={`${definition.label}显示设置`}
          aria-live="polite"
        >
          <div className={styles.settingsHeading}>
            <div>
              <strong>显示设置</strong>
              <span>{definition.label}</span>
            </div>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              aria-label="关闭显示设置"
            >
              <X />
            </button>
          </div>
          {OVERLAY_OPTIONS.map((option) => (
            <Toggle
              key={option.key}
              id={`volcano-toggle-${option.key}`}
              label={option.label}
              checked={overlays[option.key]}
              onChange={(checked) =>
                setOverlays((value) => ({
                  ...value,
                  [option.key]: checked,
                }))
              }
            />
          ))}
        </aside>
      )}

      <nav className={styles.hotspotDock} aria-label="观察地质结构">
        <span>观察点</span>
        <div>
          {HOTSPOT_ORDER.map((id) => {
            const item = HOTSPOTS[id];
            return (
              <button
                key={id}
                type="button"
                className={selectedHotspot === id ? styles.active : ""}
                onClick={() => selectHotspot(id)}
                aria-pressed={selectedHotspot === id}
              >
                <span aria-hidden="true" />
                {item.name}
              </button>
            );
          })}
        </div>
      </nav>

      <div className={styles.bottomControls}>
        <p className={styles.scienceNote}>{definition.fact}</p>
        <p className={styles.scaleNote}>
          岩层比例、颜色与速度经过教学调整
        </p>
        <nav className={styles.stageBar} aria-label="火山形成阶段">
          {STAGE_ORDER.map((id) => {
            const item = STAGE_DEFINITIONS[id];
            const Icon = STAGE_ICONS[id];
            return (
              <button
                key={id}
                type="button"
                className={stage === id ? styles.active : ""}
                onClick={() => changeStage(id)}
                aria-pressed={stage === id}
                data-stage={id}
              >
                <Icon aria-hidden="true" />
                <span className={styles.longLabel}>{item.label}</span>
                <span className={styles.shortLabel}>{item.shortLabel}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className={styles.watermark} aria-hidden="true">
        <Waves />
        <span>火山岛 · 海底剖面</span>
        <Layers3 />
      </div>
    </main>
  );
}
