"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Billboard, Html, Line, OrbitControls } from "@react-three/drei";
import {
  ArrowLeft,
  Cloud,
  Eye,
  Gauge,
  Globe2,
  Maximize,
  Pause,
  Play,
  RotateCcw,
  Route,
  Settings,
  ThermometerSun,
  Waves,
  Wind,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import styles from "./TyphoonApp.module.css";
import {
  DEFAULT_OVERLAYS,
  STAGE_DEFINITIONS,
  STAGE_ORDER,
  TOTAL_DURATION,
  TYPHOON_TRACKS,
  cloudFormationState,
  eyeFormationState,
  latLonToCartesian,
  stageStartTime,
  timelineState,
  trackPosition,
} from "./typhoonModel";
import type {
  Point3,
  TyphoonHotspotId,
  TyphoonOverlayState,
  TyphoonStage,
  TyphoonTrackKind,
} from "./typhoonModel";

type Hotspot = {
  id: TyphoonHotspotId;
  label: string;
  eyebrow: string;
  fact: string;
  stage: TyphoonStage;
  stageProgress: number;
  position: Point3;
  cameraOffset: Point3;
};

const HOTSPOTS: Record<TyphoonHotspotId, Hotspot> = {
  "warm-pool": {
    id: "warm-pool",
    label: "暖海面",
    eyebrow: "台风的能量来源",
    fact: "海面约 26.5°C 以上、而且暖水有一定深度时，海洋才能持续向空气输送热量和水汽。",
    stage: "warm-ocean",
    stageProgress: 0.55,
    position: [-2.8, 0.08, 1],
    cameraOffset: [7.5, 4.5, 8.5],
  },
  "low-pressure": {
    id: "low-pressure",
    label: "低压中心",
    eyebrow: "空气汇聚的地方",
    fact: "空气上升后，海面附近气压降低；四周空气会向中心补充，带来更多暖湿水汽。",
    stage: "convection",
    stageProgress: 0.6,
    position: [0, 0.18, 0],
    cameraOffset: [6.8, 5.6, 8.2],
  },
  cumulonimbus: {
    id: "cumulonimbus",
    label: "积雨云",
    eyebrow: "会长高的雷暴云",
    fact: "水汽上升、冷却、凝结后形成高耸的积雨云；凝结释放的热量还能继续推动上升气流。",
    stage: "convection",
    stageProgress: 0.82,
    position: [-1.7, 4.8, 0.7],
    cameraOffset: [6.5, 3.2, 7.5],
  },
  rainbands: {
    id: "rainbands",
    label: "螺旋雨带",
    eyebrow: "向中心卷入的云带",
    fact: "成串雷暴沿螺旋状云带排列，带来一阵阵大风和强降雨，并把水汽继续送向中心。",
    stage: "rotation",
    stageProgress: 0.78,
    position: [4.5, 3, -1.8],
    cameraOffset: [5.5, 6.2, 7.4],
  },
  eyewall: {
    id: "eyewall",
    label: "眼墙",
    eyebrow: "最猛烈的风雨区域",
    fact: "台风眼周围的环状高云叫眼墙，最强的上升气流、风和暴雨通常集中在这里。",
    stage: "eye",
    stageProgress: 0.78,
    position: [1.4, 5.5, 0],
    cameraOffset: [5.4, 4.8, 6.5],
  },
  eye: {
    id: "eye",
    label: "台风眼",
    eyebrow: "风暴中心的相对平静区",
    fact: "台风眼内空气下沉、云较少、风相对平静；眼墙另一侧的危险风雨仍会继续到来。",
    stage: "eye",
    stageProgress: 0.9,
    position: [0, 3.2, 0],
    cameraOffset: [4.6, 7.3, 5.2],
  },
  "subtropical-high": {
    id: "subtropical-high",
    label: "副热带高压",
    eyebrow: "台风路径的引导者",
    fact: "大范围环境气流像一条会变化的“河流”。副热带高压的位置和强弱会影响台风向西、向西北或转向。",
    stage: "track",
    stageProgress: 0.58,
    position: latLonToCartesian(29, 153, 5.35),
    cameraOffset: [3.5, 2.2, 7.5],
  },
};

const HOTSPOT_ORDER = [
  "warm-pool",
  "low-pressure",
  "cumulonimbus",
  "rainbands",
  "eyewall",
  "eye",
  "subtropical-high",
] as const satisfies readonly TyphoonHotspotId[];

const TRACK_LABELS: Record<
  TyphoonTrackKind,
  { label: string; short: string; description: string }
> = {
  westward: {
    label: "西行路径",
    short: "西行",
    description: "从菲律宾以东洋面偏西移动，常影响南海与华南沿海。",
  },
  northwest: {
    label: "西北路径",
    short: "西北",
    description: "向西北靠近台湾、福建或浙江一带，是默认教学路线。",
  },
  recurving: {
    label: "转向路径",
    short: "转向",
    description: "先向西北，随后受中纬度西风影响转向东北。",
  },
};

const STAGE_ICONS = {
  "warm-ocean": ThermometerSun,
  convection: Cloud,
  clustering: Waves,
  rotation: Wind,
  eye: Eye,
  track: Globe2,
} satisfies Record<TyphoonStage, typeof Cloud>;

const OVERLAY_OPTIONS: Array<{
  key: keyof TyphoonOverlayState;
  label: string;
}> = [
  { key: "labels", label: "名称标签" },
  { key: "airflow", label: "气流箭头" },
  { key: "pressure", label: "温度与气压" },
  { key: "clouds", label: "云层粒子" },
  { key: "tracks", label: "路径引导" },
];

const COASTLINES: readonly (readonly [number, number][])[] = [
  [
    [42, 130],
    [39, 127],
    [35, 126],
    [31, 122],
    [28, 121],
    [25, 120],
    [22, 114],
    [20, 110],
    [18, 109],
    [15, 108],
  ],
  [
    [46, 142],
    [43, 141],
    [40, 140],
    [37, 138],
    [35, 136],
    [33, 131],
    [31, 130],
  ],
  [
    [25.3, 121.5],
    [23.5, 121],
    [21.9, 120.8],
  ],
  [
    [19.5, 121],
    [17, 122],
    [14.5, 121],
    [12, 124],
    [9, 125],
    [6, 126],
  ],
  [
    [22, 106],
    [18, 106],
    [14, 109],
    [10, 107],
    [7, 105],
    [3, 104],
  ],
];

function deterministic(index: number, offset: number) {
  return (
    Math.abs(Math.sin(index * 12.9898 + offset * 78.233) * 43758.5453) % 1
  );
}

function CameraRig({
  stage,
  selectedHotspot,
  resetKey,
  controlsRef,
  reducedMotion,
}: {
  stage: TyphoonStage;
  selectedHotspot: TyphoonHotspotId | null;
  resetKey: number;
  controlsRef: RefObject<OrbitControlsImpl | null>;
  reducedMotion: boolean;
}) {
  const { camera } = useThree();
  const transition = useRef(1);
  const fromPosition = useRef(new THREE.Vector3());
  const fromTarget = useRef(new THREE.Vector3());

  const targetPosition = useMemo(() => {
    if (!selectedHotspot) {
      return new THREE.Vector3(...STAGE_DEFINITIONS[stage].cameraPosition);
    }
    const hotspot = HOTSPOTS[selectedHotspot];
    return new THREE.Vector3(
      hotspot.position[0] + hotspot.cameraOffset[0],
      hotspot.position[1] + hotspot.cameraOffset[1],
      hotspot.position[2] + hotspot.cameraOffset[2],
    );
  }, [selectedHotspot, stage]);

  const targetLookAt = useMemo(
    () =>
      new THREE.Vector3(
        ...(selectedHotspot
          ? HOTSPOTS[selectedHotspot].position
          : STAGE_DEFINITIONS[stage].cameraTarget),
      ),
    [selectedHotspot, stage],
  );

  useEffect(() => {
    fromPosition.current.copy(camera.position);
    fromTarget.current.copy(
      controlsRef.current?.target ??
        new THREE.Vector3(...STAGE_DEFINITIONS[stage].cameraTarget),
    );
    transition.current = reducedMotion ? 1 : 0;
    if (reducedMotion) {
      camera.position.copy(targetPosition);
      controlsRef.current?.target.copy(targetLookAt);
      controlsRef.current?.update();
    }
  }, [
    camera,
    controlsRef,
    reducedMotion,
    resetKey,
    stage,
    selectedHotspot,
    targetLookAt,
    targetPosition,
  ]);

  useFrame((_, delta) => {
    if (transition.current >= 1) return;
    transition.current = Math.min(1, transition.current + delta * 1.05);
    const eased = 1 - Math.pow(1 - transition.current, 3);
    camera.position.lerpVectors(
      fromPosition.current,
      targetPosition,
      eased,
    );
    if (controlsRef.current) {
      controlsRef.current.target.lerpVectors(
        fromTarget.current,
        targetLookAt,
        eased,
      );
      controlsRef.current.update();
    } else {
      camera.lookAt(targetLookAt);
    }
  });

  return null;
}

function WarmOcean({
  progress,
  playing,
  overlays,
}: {
  progress: number;
  playing: boolean;
  overlays: TyphoonOverlayState;
}) {
  const heatRef = useRef<THREE.Group>(null);
  const vaporRef = useRef<THREE.InstancedMesh>(null);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const position = useMemo(() => new THREE.Vector3(), []);
  const quaternion = useMemo(() => new THREE.Quaternion(), []);
  const scale = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const time = playing ? state.clock.elapsedTime : 0.8;
    if (heatRef.current) {
      heatRef.current.rotation.z = Math.sin(time * 0.28) * 0.08;
    }
    if (!vaporRef.current) return;
    for (let index = 0; index < 72; index += 1) {
      const angle = deterministic(index, 1) * Math.PI * 2;
      const radius = 0.7 + deterministic(index, 2) * 5.2;
      const rise = (deterministic(index, 3) + time * 0.12) % 1;
      position.set(
        Math.cos(angle) * radius,
        0.35 + rise * (2.4 + progress * 1.5),
        Math.sin(angle) * radius,
      );
      const size = 0.035 + deterministic(index, 4) * 0.065;
      scale.setScalar(size * (0.8 + rise * 0.6));
      matrix.compose(position, quaternion, scale);
      vaporRef.current.setMatrixAt(index, matrix);
    }
    vaporRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[28, 28, 44, 44]} />
        <meshPhysicalMaterial
          color="#052b3c"
          roughness={0.25}
          metalness={0.08}
          clearcoat={0.42}
          emissive="#042431"
          emissiveIntensity={0.35}
        />
      </mesh>
      <gridHelper
        args={[28, 28, "#13536a", "#0b3c4e"]}
        position={[0, 0.03, 0]}
      />
      <group ref={heatRef} position={[0, 0.055, 0]}>
        {[2.2, 3.7, 5.2].map((radius, index) => (
          <mesh
            key={radius}
            rotation={[-Math.PI / 2, 0, index * 0.22]}
          >
            <ringGeometry args={[radius - 0.28, radius, 72]} />
            <meshBasicMaterial
              color={index === 0 ? "#ff8c68" : "#39d6cf"}
              transparent
              opacity={0.22 - index * 0.035}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
      {overlays.pressure && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.065, 0]}>
          <circleGeometry args={[5.9, 72]} />
          <meshBasicMaterial
            color="#ff754f"
            transparent
            opacity={0.065}
            depthWrite={false}
          />
        </mesh>
      )}
      <instancedMesh
        ref={vaporRef}
        args={[undefined, undefined, 72]}
        visible={overlays.airflow}
      >
        <sphereGeometry args={[1, 7, 7]} />
        <meshBasicMaterial
          color="#7ee8e2"
          transparent
          opacity={0.58}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
}

function CloudSystem({
  stage,
  progress,
  playing,
  visible,
}: {
  stage: TyphoonStage;
  progress: number;
  playing: boolean;
  visible: boolean;
}) {
  const cloudRef = useRef<THREE.InstancedMesh>(null);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const position = useMemo(() => new THREE.Vector3(), []);
  const quaternion = useMemo(() => new THREE.Quaternion(), []);
  const scale = useMemo(() => new THREE.Vector3(), []);
  const formation = cloudFormationState(stage, progress);
  const eyeState = eyeFormationState(stage, progress);

  useFrame((state) => {
    if (!cloudRef.current) return;
    const time = playing ? state.clock.elapsedTime : 1.2;
    const visibleCount = Math.floor(240 * formation.density);

    for (let index = 0; index < 240; index += 1) {
      if (index >= visibleCount) {
        scale.setScalar(0);
        matrix.compose(position, quaternion, scale);
        cloudRef.current.setMatrixAt(index, matrix);
        continue;
      }

      const normalized = (index + 0.5) / 240;
      const seedA = deterministic(index, 5);
      const seedB = deterministic(index, 6);
      const arm = index % 4;
      const randomAngle = seedA * Math.PI * 2;
      const clusterRadius = 1.2 + seedB * 6.2;
      const clusterAngle =
        randomAngle +
        Math.floor(index / 24) * 0.72 +
        Math.sin(index * 0.8) * 0.16;
      const spiralRadius =
        eyeState.eyeRadius * eyeState.eyeOpening +
        0.9 +
        Math.pow(normalized, 0.78) * (6.4 - eyeState.eyeOpening * 0.5);
      const spiralAngle =
        arm * (Math.PI / 2) +
        spiralRadius * 0.72 +
        normalized * Math.PI * 2.1 +
        time * formation.rotationSpeed;
      const organizedX =
        Math.cos(spiralAngle) *
        (spiralRadius + Math.sin(index * 1.7) * 0.26);
      const organizedZ =
        Math.sin(spiralAngle) *
        (spiralRadius + Math.cos(index * 1.3) * 0.24);
      const scatteredX = Math.cos(clusterAngle) * clusterRadius;
      const scatteredZ = Math.sin(clusterAngle) * clusterRadius;
      const x = THREE.MathUtils.lerp(
        scatteredX,
        organizedX,
        formation.organization,
      );
      const z = THREE.MathUtils.lerp(
        scatteredZ,
        organizedZ,
        formation.organization,
      );
      const distance = Math.hypot(x, z);
      const eyewallBoost =
        Math.exp(
          -Math.pow(
            (distance - Math.max(1.25, eyeState.eyeRadius + 0.2)) / 0.65,
            2,
          ),
        ) *
        eyeState.eyewallIntensity *
        3.2;
      const tower =
        (0.45 + seedA * 2.5) * formation.towerHeight + eyewallBoost;
      const bob = playing ? Math.sin(time * 0.8 + index) * 0.08 : 0;
      position.set(x, 1.35 + tower + bob, z);
      const baseScale = 0.28 + seedB * 0.48;
      scale.set(
        baseScale * (1.15 + formation.organization * 0.25),
        baseScale * (0.68 + tower * 0.14),
        baseScale,
      );
      matrix.compose(position, quaternion, scale);
      cloudRef.current.setMatrixAt(index, matrix);
    }
    cloudRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={cloudRef}
      args={[undefined, undefined, 240]}
      visible={visible}
      castShadow
    >
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial
        color="#dce9ec"
        roughness={0.88}
        transparent
        opacity={0.88}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function Airflow({
  stage,
  progress,
  visible,
}: {
  stage: TyphoonStage;
  progress: number;
  visible: boolean;
}) {
  const organization = cloudFormationState(stage, progress).organization;
  if (!visible) return null;

  return (
    <group>
      {[0, 1, 2, 3].map((arm) => {
        const points: Point3[] = [];
        for (let index = 0; index <= 32; index += 1) {
          const p = index / 32;
          const radius = 6.8 - p * 5.4;
          const angle =
            arm * (Math.PI / 2) +
            p * Math.PI * (1.25 + organization * 0.8);
          points.push([
            Math.cos(angle) * radius,
            0.45 + p * 0.55,
            Math.sin(angle) * radius,
          ]);
        }
        return (
          <Line
            key={arm}
            points={points}
            color="#69ded8"
            lineWidth={1.4}
            transparent
            opacity={0.28 + organization * 0.42}
          />
        );
      })}
      {(stage === "convection" ||
        stage === "clustering" ||
        stage === "rotation" ||
        stage === "eye") &&
        [-2.2, 0, 2.2].map((x) => (
          <Line
            key={x}
            points={[
              [x, 0.6, 0],
              [x * 0.86, 2.2, 0],
              [x * 0.72, 5.2, 0],
              [x * 1.25, 6.8, 0],
            ]}
            color="#b6a8ff"
            lineWidth={2}
            transparent
            opacity={0.7}
          />
        ))}
      {stage === "eye" && (
        <>
          <Line
            points={[
              [0, 6.7, 0],
              [0, 4.9, 0],
              [0, 3.2, 0],
            ]}
            color="#ff9b7c"
            lineWidth={2.4}
          />
          {[-1, 1].map((direction) => (
            <Line
              key={direction}
              points={[
                [direction * 1.35, 1, 0],
                [direction * 1.45, 4.8, 0],
                [direction * 3.7, 6.8, 0],
              ]}
              color="#b6a8ff"
              lineWidth={2.4}
            />
          ))}
        </>
      )}
    </group>
  );
}

function OceanLabels({
  stage,
  overlays,
}: {
  stage: TyphoonStage;
  overlays: TyphoonOverlayState;
}) {
  if (!overlays.labels) return null;
  return (
    <group>
      <Html position={[-4.4, 0.35, 2.8]} center>
        <span className={styles.sceneLabel}>暖海面 · 约 26.5°C 以上</span>
      </Html>
      {stage !== "warm-ocean" && (
        <Html position={[0, 0.45, 0]} center>
          <span className={`${styles.sceneLabel} ${styles.pressureLabel}`}>
            L · 低压中心
          </span>
        </Html>
      )}
      {(stage === "convection" || stage === "clustering") && (
        <Html position={[-2, 5.5, 0.4]} center>
          <span className={styles.sceneLabel}>积雨云向上生长</span>
        </Html>
      )}
      {(stage === "rotation" || stage === "eye") && (
        <Html position={[4.4, 3.5, -2.3]} center>
          <span className={styles.sceneLabel}>螺旋雨带</span>
        </Html>
      )}
      {stage === "eye" && (
        <>
          <Html position={[0, 3.4, 0]} center>
            <span className={`${styles.sceneLabel} ${styles.eyeLabel}`}>
              台风眼 · 空气下沉
            </span>
          </Html>
          <Html position={[1.55, 5.9, 0]} center>
            <span className={`${styles.sceneLabel} ${styles.dangerLabel}`}>
              眼墙 · 最强风雨
            </span>
          </Html>
        </>
      )}
    </group>
  );
}

function OceanScene({
  stage,
  progress,
  playing,
  overlays,
}: {
  stage: TyphoonStage;
  progress: number;
  playing: boolean;
  overlays: TyphoonOverlayState;
}) {
  const eyeState = eyeFormationState(stage, progress);
  return (
    <group visible={stage !== "track"}>
      <WarmOcean
        progress={progress}
        playing={playing}
        overlays={overlays}
      />
      <CloudSystem
        stage={stage}
        progress={progress}
        playing={playing}
        visible={overlays.clouds}
      />
      <Airflow
        stage={stage}
        progress={progress}
        visible={overlays.airflow}
      />
      {stage === "eye" && (
        <group position={[0, 1.02, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[eyeState.eyeRadius * 0.9, 64]} />
            <meshBasicMaterial
              color="#082936"
              transparent
              opacity={0.9}
            />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 1.45, 0]}>
            <torusGeometry
              args={[eyeState.eyeRadius + 0.22, 0.12, 12, 72]}
            />
            <meshBasicMaterial
              color="#ff8d70"
              transparent
              opacity={0.72}
            />
          </mesh>
        </group>
      )}
      <OceanLabels stage={stage} overlays={overlays} />
    </group>
  );
}

function EarthGrid() {
  const lines = useMemo(() => {
    const items: Point3[][] = [];
    for (const latitude of [-60, -30, 0, 30, 60]) {
      const points: Point3[] = [];
      for (let longitude = -180; longitude <= 180; longitude += 5) {
        points.push(latLonToCartesian(latitude, longitude, 5.015));
      }
      items.push(points);
    }
    for (const longitude of [-180, -120, -60, 0, 60, 120]) {
      const points: Point3[] = [];
      for (let latitude = -85; latitude <= 85; latitude += 5) {
        points.push(latLonToCartesian(latitude, longitude, 5.015));
      }
      items.push(points);
    }
    return items;
  }, []);

  return (
    <>
      {lines.map((points, index) => (
        <Line
          key={index}
          points={points}
          color="#5f9bad"
          lineWidth={0.55}
          transparent
          opacity={0.18}
        />
      ))}
    </>
  );
}

function Coastlines() {
  return (
    <>
      {COASTLINES.map((coastline, index) => (
        <Line
          key={index}
          points={coastline.map(([lat, lon]) =>
            latLonToCartesian(lat, lon, 5.045),
          )}
          color="#b7d8cb"
          lineWidth={1.25}
          transparent
          opacity={0.75}
        />
      ))}
    </>
  );
}

function TrackMarker({
  position,
  intensity,
}: {
  position: Point3;
  intensity: number;
}) {
  const puffs = useMemo(
    () =>
      Array.from({ length: 11 }, (_, index) => {
        const angle = (index / 11) * Math.PI * 2;
        const radius = index === 0 ? 0 : 0.2 + (index % 3) * 0.09;
        return [
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          0,
        ] as const;
      }),
    [],
  );
  return (
    <Billboard position={position}>
      <group scale={0.72 + intensity * 0.72}>
        {puffs.map((point, index) => (
          <mesh key={index} position={point}>
            <circleGeometry args={[index === 0 ? 0.16 : 0.13, 18]} />
            <meshBasicMaterial
              color={index === 0 ? "#082a38" : "#eef8f7"}
              transparent
              opacity={0.92}
              side={THREE.DoubleSide}
              depthTest={false}
            />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.01]}>
          <ringGeometry args={[0.08, 0.13, 24]} />
          <meshBasicMaterial
            color="#ff8e72"
            side={THREE.DoubleSide}
            depthTest={false}
          />
        </mesh>
      </group>
    </Billboard>
  );
}

function GlobeScene({
  progress,
  trackKind,
  overlays,
}: {
  progress: number;
  trackKind: TyphoonTrackKind;
  overlays: TyphoonOverlayState;
}) {
  const path = useMemo(
    () =>
      Array.from({ length: 81 }, (_, index) =>
        trackPosition(trackKind, index / 80, 5.08).position,
      ),
    [trackKind],
  );
  const marker = trackPosition(trackKind, progress, 5.28);
  const highPosition = latLonToCartesian(29, 153, 5.35);

  return (
    <group visible>
      <mesh>
        <sphereGeometry args={[5, 80, 54]} />
        <meshPhysicalMaterial
          color="#06384c"
          roughness={0.72}
          metalness={0.04}
          clearcoat={0.18}
          emissive="#042531"
          emissiveIntensity={0.45}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[5.08, 64, 42]} />
        <meshBasicMaterial
          color="#56dcd3"
          transparent
          opacity={0.025}
          side={THREE.BackSide}
        />
      </mesh>
      <EarthGrid />
      <Coastlines />
      {overlays.tracks && (
        <>
          <Line
            points={path}
            color="#ff9478"
            lineWidth={3.2}
            transparent
            opacity={0.92}
          />
          {TYPHOON_TRACKS[trackKind].map((point) => {
            const position = latLonToCartesian(point.lat, point.lon, 5.12);
            return (
              <mesh
                key={`${point.lat}-${point.lon}`}
                position={position}
                scale={0.6 + point.intensity * 0.7}
              >
                <sphereGeometry args={[0.09, 14, 14]} />
                <meshBasicMaterial
                  color={
                    point.phase === "mature"
                      ? "#ff8d70"
                      : point.phase === "weakening"
                        ? "#a9b9c2"
                        : "#6be3dc"
                  }
                />
              </mesh>
            );
          })}
        </>
      )}
      <TrackMarker position={marker.position} intensity={marker.intensity} />
      {overlays.airflow && (
        <>
          <mesh position={highPosition}>
            <sphereGeometry args={[0.72, 24, 16]} />
            <meshBasicMaterial
              color="#aa9bf6"
              transparent
              opacity={0.16}
              depthWrite={false}
            />
          </mesh>
          <Line
            points={[
              latLonToCartesian(33, 162, 5.35),
              latLonToCartesian(32, 150, 5.35),
              latLonToCartesian(30, 139, 5.35),
            ]}
            color="#b6a8ff"
            lineWidth={2.4}
            transparent
            opacity={0.72}
          />
          <Line
            points={[
              latLonToCartesian(38, 125, 5.35),
              latLonToCartesian(41, 137, 5.35),
              latLonToCartesian(43, 151, 5.35),
            ]}
            color="#79dcd7"
            lineWidth={2.2}
            transparent
            opacity={0.7}
          />
        </>
      )}
      {overlays.labels && (
        <>
          {[
            ["中国沿海", 27, 119],
            ["菲律宾", 13, 122],
            ["日本", 36, 138],
            ["西北太平洋", 17, 153],
          ].map(([label, lat, lon]) => (
            <Html
              key={label}
              position={latLonToCartesian(
                lat as number,
                lon as number,
                5.4,
              )}
              center
            >
              <span className={styles.globeLabel}>{label}</span>
            </Html>
          ))}
          <Html position={highPosition} center>
            <span className={`${styles.globeLabel} ${styles.highLabel}`}>
              H · 副热带高压
            </span>
          </Html>
        </>
      )}
    </group>
  );
}

function TyphoonCanvas({
  stage,
  stageProgress,
  trackKind,
  selectedHotspot,
  playing,
  overlays,
  resetKey,
  reducedMotion,
}: {
  stage: TyphoonStage;
  stageProgress: number;
  trackKind: TyphoonTrackKind;
  selectedHotspot: TyphoonHotspotId | null;
  playing: boolean;
  overlays: TyphoonOverlayState;
  resetKey: number;
  reducedMotion: boolean;
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  return (
    <Canvas
      dpr={[1, 1.65]}
      shadows
      camera={{
        position: STAGE_DEFINITIONS["warm-ocean"].cameraPosition,
        fov: 47,
        near: 0.1,
        far: 120,
      }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#031018"]} />
      <fog attach="fog" args={["#031018", 22, 54]} />
      <ambientLight intensity={1.15} color="#bde8ed" />
      <directionalLight
        position={[6, 14, 10]}
        intensity={2.1}
        color="#e8fbff"
        castShadow
      />
      <pointLight position={[-8, 4, 2]} intensity={15} color="#52d6d0" />
      <pointLight position={[6, 7, -5]} intensity={11} color="#a69af0" />
      {stage !== "track" && (
        <OceanScene
          stage={stage}
          progress={stageProgress}
          playing={playing && !reducedMotion}
          overlays={overlays}
        />
      )}
      {stage === "track" && (
        <GlobeScene
          progress={stageProgress}
          trackKind={trackKind}
          overlays={overlays}
        />
      )}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.06}
        enablePan={false}
        minDistance={stage === "track" ? 8 : 6}
        maxDistance={stage === "track" ? 24 : 25}
        minPolarAngle={stage === "track" ? 0.18 : 0.12}
        maxPolarAngle={stage === "track" ? Math.PI - 0.18 : Math.PI / 2.08}
      />
      <CameraRig
        stage={stage}
        selectedHotspot={selectedHotspot}
        resetKey={resetKey}
        controlsRef={controlsRef}
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

export default function TyphoonApp() {
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<0.5 | 1 | 4>(1);
  const [selectedHotspot, setSelectedHotspot] =
    useState<TyphoonHotspotId | null>(null);
  const [trackKind, setTrackKind] =
    useState<TyphoonTrackKind>("northwest");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [overlays, setOverlays] =
    useState<TyphoonOverlayState>(DEFAULT_OVERLAYS);
  const [resetKey, setResetKey] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const lastTick = useRef<number | null>(null);
  const timeline = timelineState(elapsed);
  const definition = STAGE_DEFINITIONS[timeline.stage];
  const hotspot = selectedHotspot ? HOTSPOTS[selectedHotspot] : null;

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

  useEffect(() => {
    if (!playing || reducedMotion) {
      lastTick.current = null;
      return;
    }
    let animationFrame = 0;
    const tick = (timestamp: number) => {
      if (lastTick.current === null) lastTick.current = timestamp;
      const delta = Math.min(0.1, (timestamp - lastTick.current) / 1000);
      lastTick.current = timestamp;
      setElapsed((value) => {
        const next = Math.min(TOTAL_DURATION, value + delta * speed);
        if (next >= TOTAL_DURATION) {
          window.setTimeout(() => setPlaying(false), 0);
        }
        return next;
      });
      animationFrame = window.requestAnimationFrame(tick);
    };
    animationFrame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [playing, reducedMotion, speed]);

  const changeStage = (stage: TyphoonStage) => {
    setElapsed(stageStartTime(stage));
    setSelectedHotspot(null);
    setSettingsOpen(false);
    setResetKey((value) => value + 1);
  };

  const selectHotspot = (id: TyphoonHotspotId) => {
    const next = HOTSPOTS[id];
    setElapsed(
      stageStartTime(next.stage) +
        STAGE_DEFINITIONS[next.stage].duration * next.stageProgress,
    );
    setSelectedHotspot(id);
    setSettingsOpen(false);
    setResetKey((value) => value + 1);
  };

  const resetView = () => {
    setSelectedHotspot(null);
    setResetKey((value) => value + 1);
  };

  const replay = () => {
    setElapsed(0);
    setSelectedHotspot(null);
    setTrackKind("northwest");
    setSettingsOpen(false);
    setPlaying(!reducedMotion);
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
    <main className={styles.typhoonApp} data-testid="typhoon-app">
      <div className={styles.canvasShell} data-testid="typhoon-canvas">
        <TyphoonCanvas
          stage={timeline.stage}
          stageProgress={timeline.stageProgress}
          trackKind={trackKind}
          selectedHotspot={selectedHotspot}
          playing={playing}
          overlays={overlays}
          resetKey={resetKey}
          reducedMotion={reducedMotion}
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
              <Wind />
            </span>
            <div>
              <h1>台风的形成</h1>
              <p>从一片暖海，到有风眼的巨大旋涡</p>
            </div>
          </div>
        </div>

        <div className={styles.playbackControls} aria-label="播放控制">
          <button
            type="button"
            className={`${styles.iconButton} ${styles.primaryAction}`}
            onClick={() =>
              elapsed >= TOTAL_DURATION ? replay() : setPlaying((value) => !value)
            }
            aria-label={
              elapsed >= TOTAL_DURATION
                ? "重新播放"
                : playing
                  ? "暂停动画"
                  : "播放动画"
            }
            data-tooltip={
              elapsed >= TOTAL_DURATION ? "重播" : playing ? "暂停" : "播放"
            }
          >
            {elapsed >= TOTAL_DURATION ? (
              <RotateCcw />
            ) : playing ? (
              <Pause />
            ) : (
              <Play />
            )}
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
            onClick={resetView}
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
            <strong>{hotspot.label}</strong>
          </div>
          <p>{hotspot.fact}</p>
          <button
            type="button"
            onClick={resetView}
            aria-label={`关闭${hotspot.label}知识卡`}
          >
            <X />
          </button>
        </aside>
      )}

      {settingsOpen && (
        <aside className={styles.settingsPanel} aria-label="台风显示设置">
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
              id={`typhoon-toggle-${option.key}`}
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

      <nav className={styles.hotspotDock} aria-label="观察台风结构">
        <span>观察点</span>
        <div>
          {HOTSPOT_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              className={selectedHotspot === id ? styles.active : ""}
              onClick={() => selectHotspot(id)}
              aria-pressed={selectedHotspot === id}
            >
              <span aria-hidden="true" />
              {HOTSPOTS[id].label}
            </button>
          ))}
        </div>
      </nav>

      {timeline.stage === "track" && (
        <aside className={styles.trackPanel} aria-label="典型台风路径">
          <div className={styles.trackHeading}>
            <span>
              <Route />
              典型路径
            </span>
            <small>教学示意 · 非实时预报</small>
          </div>
          <div className={styles.trackOptions}>
            {(Object.keys(TRACK_LABELS) as TyphoonTrackKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                className={trackKind === kind ? styles.active : ""}
                onClick={() => {
                  setTrackKind(kind);
                  setElapsed(stageStartTime("track"));
                  setSelectedHotspot(null);
                }}
                aria-pressed={trackKind === kind}
              >
                {TRACK_LABELS[kind].short}
              </button>
            ))}
          </div>
          <p>{TRACK_LABELS[trackKind].description}</p>
          <div className={styles.intensityLegend} aria-label="强度变化图例">
            <span><i className={styles.disturbanceDot} />扰动</span>
            <span><i className={styles.matureDot} />成熟</span>
            <span><i className={styles.weakeningDot} />减弱</span>
          </div>
        </aside>
      )}

      <div className={styles.bottomControls}>
        <div className={styles.progressRow}>
          <p className={styles.scienceNote}>{definition.fact}</p>
          <div className={styles.progressMeta}>
            <span>{Math.round(timeline.totalProgress * 100)}%</span>
            <button type="button" onClick={replay}>
              从头演示
            </button>
          </div>
        </div>
        <div className={styles.progressTrack} aria-hidden="true">
          <span style={{ width: `${timeline.totalProgress * 100}%` }} />
        </div>
        <nav className={styles.stageBar} aria-label="台风形成阶段">
          {STAGE_ORDER.map((stage) => {
            const item = STAGE_DEFINITIONS[stage];
            const Icon = STAGE_ICONS[stage];
            return (
              <button
                key={stage}
                type="button"
                className={timeline.stage === stage ? styles.active : ""}
                onClick={() => changeStage(stage)}
                aria-pressed={timeline.stage === stage}
                data-stage={stage}
              >
                <Icon aria-hidden="true" />
                <span className={styles.longLabel}>{item.label}</span>
                <span className={styles.shortLabel}>{item.shortLabel}</span>
              </button>
            );
          })}
        </nav>
        <p className={styles.scaleNote}>
          温度阈值参考气象资料；云层、大小、速度与路径经过教学调整
        </p>
      </div>

      <div className={styles.watermark} aria-hidden="true">
        <Gauge />
        <span>西北太平洋 · 台风实验室</span>
        <Globe2 />
      </div>
    </main>
  );
}
