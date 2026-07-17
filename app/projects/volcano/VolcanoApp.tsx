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
    position: [-4.4, -5.4, 1.2],
    cameraOffset: [5.8, 3.2, 7.4],
  },
  "melt-zone": {
    id: "melt-zone",
    name: "部分熔融区",
    eyebrow: "岩浆的起点",
    fact: "地幔上涌时压力降低，只有一部分矿物先熔化，形成玄武质岩浆。",
    position: [-1.4, -4.45, 0.5],
    cameraOffset: [5.4, 3.4, 7],
  },
  "magma-chamber": {
    id: "magma-chamber",
    name: "岩浆储集区",
    eyebrow: "岩浆集合处",
    fact: "分散的小股岩浆在岩层下方汇聚，并寻找裂隙继续向上移动。",
    position: [0.2, -2.45, 0],
    cameraOffset: [5.2, 3.2, 7],
  },
  fissure: {
    id: "fissure",
    name: "喷发裂口",
    eyebrow: "海床出口",
    fact: "张开的板块边界为岩浆提供通道，岩浆可以从海床裂口挤入海水。",
    position: [0, 1.2, 0],
    cameraOffset: [5.3, 3.4, 6.6],
  },
  "pillow-lava": {
    id: "pillow-lava",
    name: "枕状熔岩",
    eyebrow: "新生的岩石",
    fact: "海水让熔岩外壳迅速变硬，内部仍热的熔岩继续挤出，形成一团团“石头枕头”。",
    position: [1.65, 1.22, 0.15],
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

function MantleLayer({ cutaway }: { cutaway: boolean }) {
  const glowRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!glowRef.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 1.15) * 0.045;
    glowRef.current.scale.set(pulse, pulse, pulse);
  });

  return (
    <group>
      <mesh position={[0, -5.6, 0]}>
        <boxGeometry args={[20, 6, 8]} />
        <meshStandardMaterial
          color="#47251f"
          roughness={0.92}
          transparent
          opacity={cutaway ? 0.95 : 0.34}
        />
      </mesh>
      <mesh position={[0, -3.15, 0]}>
        <boxGeometry args={[20, 0.34, 8.02]} />
        <meshStandardMaterial
          color="#8d3c28"
          emissive="#5c170c"
          emissiveIntensity={0.65}
          roughness={0.8}
          transparent
          opacity={cutaway ? 0.72 : 0.2}
        />
      </mesh>
      <group ref={glowRef}>
        {[
          [-2.45, -5.25, 0.8, 0.64],
          [-1.45, -4.65, -0.3, 0.48],
          [-0.52, -4.08, 0.6, 0.4],
          [1.35, -4.72, 0.2, 0.46],
          [2.25, -5.22, -0.6, 0.58],
        ].map(([x, y, z, size], index) => (
          <mesh key={index} position={[x, y, z]} scale={[size, size * 1.35, size]}>
            <sphereGeometry args={[1, 20, 14]} />
            <meshStandardMaterial
              color="#d74e22"
              emissive="#ff3d0a"
              emissiveIntensity={1.8}
              transparent
              opacity={0.74}
              roughness={0.48}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function OceanicCrust({ cutaway }: { cutaway: boolean }) {
  const opacity = cutaway ? 1 : 0.42;

  return (
    <group>
      <mesh position={[-5.35, -1.38, 0]}>
        <boxGeometry args={[9.4, 2.8, 8]} />
        <meshStandardMaterial
          color="#28323a"
          roughness={0.96}
          transparent
          opacity={opacity}
        />
      </mesh>
      <mesh position={[5.35, -1.38, 0]}>
        <boxGeometry args={[9.4, 2.8, 8]} />
        <meshStandardMaterial
          color="#28323a"
          roughness={0.96}
          transparent
          opacity={opacity}
        />
      </mesh>
      <mesh position={[-2.55, 0.2, 0]} rotation={[0, 0, -0.09]}>
        <boxGeometry args={[5.1, 0.58, 8.05]} />
        <meshStandardMaterial color="#465058" roughness={0.94} />
      </mesh>
      <mesh position={[2.55, 0.2, 0]} rotation={[0, 0, 0.09]}>
        <boxGeometry args={[5.1, 0.58, 8.05]} />
        <meshStandardMaterial color="#465058" roughness={0.94} />
      </mesh>
      <mesh position={[-7.35, -0.03, 0]}>
        <boxGeometry args={[5.4, 0.58, 8.05]} />
        <meshStandardMaterial color="#3b464e" roughness={0.98} />
      </mesh>
      <mesh position={[7.35, -0.03, 0]}>
        <boxGeometry args={[5.4, 0.58, 8.05]} />
        <meshStandardMaterial color="#3b464e" roughness={0.98} />
      </mesh>
      <mesh position={[0, -0.58, 0]}>
        <cylinderGeometry args={[0.24, 0.62, 3.75, 20]} />
        <meshStandardMaterial
          color="#ff4b16"
          emissive="#ff2700"
          emissiveIntensity={2}
          roughness={0.42}
        />
      </mesh>
    </group>
  );
}

function MagmaChamber() {
  const chamberRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!chamberRef.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 1.7) * 0.04;
    chamberRef.current.scale.set(2.15 * pulse, 0.72 * pulse, 1.18 * pulse);
  });

  return (
    <mesh ref={chamberRef} position={[0.15, -2.4, 0]}>
      <sphereGeometry args={[1, 32, 22]} />
      <meshStandardMaterial
        color="#ff6a1a"
        emissive="#ff2a00"
        emissiveIntensity={2.4}
        roughness={0.34}
      />
    </mesh>
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
      <sphereGeometry args={[0.13 + (index % 3) * 0.022, 14, 10]} />
      <meshStandardMaterial
        color="#ff9b31"
        emissive="#ff3500"
        emissiveIntensity={2.5}
        roughness={0.28}
        transparent
        opacity={stage === "cooling" ? 0.42 : 0.94}
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
      {Array.from({ length: 16 }, (_, index) => (
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
      Math.sin(index * 2.3) * 0.35 + Math.sin(progress * Math.PI * 2) * 0.08,
      1.25 + progress * 3.1,
      Math.cos(index * 1.7) * 0.34,
    );
    ref.current.scale.setScalar(active ? 0.45 + progress * 0.8 : 0);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.11 + (index % 3) * 0.025, 14, 10]} />
      <meshPhysicalMaterial
        color="#b9f2f4"
        transparent
        opacity={0.38}
        roughness={0.1}
        transmission={0.2}
        depthWrite={false}
      />
    </mesh>
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
  const ventRef = useRef<THREE.Mesh>(null);
  const leftFlowRef = useRef<THREE.Mesh>(null);
  const rightFlowRef = useRef<THREE.Mesh>(null);
  const elapsed = useRef(0);

  useEffect(() => {
    elapsed.current = stage === "eruption" ? 0.3 : 2.1;
  }, [stage]);

  useFrame((_, delta) => {
    if (playing) elapsed.current += delta * speed;
    const cycle = loopingProgress(elapsed.current, 4.8);
    const state = eruptionState(cycle);
    const visible = stage === "eruption" || stage === "cooling";
    const intensity = visible ? 1 : 0.08;

    if (ventRef.current) {
      ventRef.current.scale.set(
        0.5 + state.ventRise * 0.5,
        (0.3 + state.ventRise * 0.9) * intensity,
        0.5 + state.ventRise * 0.5,
      );
    }
    if (leftFlowRef.current) {
      leftFlowRef.current.scale.set(
        Math.max(0.05, state.lateralFlow * 1.65 * intensity),
        0.52,
        0.72,
      );
    }
    if (rightFlowRef.current) {
      rightFlowRef.current.scale.set(
        Math.max(0.05, state.lateralFlow * 1.3 * intensity),
        0.46,
        0.66,
      );
    }
  });

  const active = stage === "eruption" || stage === "cooling";

  return (
    <group>
      <mesh ref={ventRef} position={[0, 1.32, 0]}>
        <sphereGeometry args={[0.48, 24, 16]} />
        <meshStandardMaterial
          color="#ff8b22"
          emissive="#ff2600"
          emissiveIntensity={2.8}
          roughness={0.32}
        />
      </mesh>
      <mesh
        ref={leftFlowRef}
        position={[-0.66, 1.24, 0.04]}
        rotation={[0.08, 0.06, -0.18]}
      >
        <sphereGeometry args={[0.72, 24, 16]} />
        <meshStandardMaterial
          color="#ff6d18"
          emissive="#ff2200"
          emissiveIntensity={2.45}
          roughness={0.38}
        />
      </mesh>
      <mesh
        ref={rightFlowRef}
        position={[0.62, 1.25, -0.05]}
        rotation={[-0.05, -0.08, 0.16]}
      >
        <sphereGeometry args={[0.68, 24, 16]} />
        <meshStandardMaterial
          color="#ff711c"
          emissive="#ff2200"
          emissiveIntensity={2.45}
          roughness={0.38}
        />
      </mesh>
      {Array.from({ length: 10 }, (_, index) => (
        <BubbleStream
          key={index}
          index={index}
          playing={playing}
          speed={speed}
          active={active}
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
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const elapsed = useRef(index * 0.29);
  const hotColor = useMemo(() => new THREE.Color("#ff6a18"), []);
  const coolColor = useMemo(() => new THREE.Color("#31373b"), []);
  const hotEmissive = useMemo(() => new THREE.Color("#ff2600"), []);
  const darkEmissive = useMemo(() => new THREE.Color("#120503"), []);
  const [x, y, z, size] = PILLOW_POSITIONS[index];

  useEffect(() => {
    elapsed.current = index * 0.29;
  }, [index, stage]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    const material = materialRef.current;
    if (!mesh || !material) return;
    if (playing) elapsed.current += delta * speed;

    const stageActive = stage === "cooling";
    const stagger = Math.max(0, elapsed.current - index * 0.24);
    const progress = stageActive ? Math.min(1, stagger / 3.6) : 1;
    const state = pillowFormationState(progress);
    const baseVisibility =
      stage === "melting" || stage === "rising"
        ? 0.28
        : stage === "eruption"
          ? 0.62
          : 1;
    const growth = stageActive
      ? Math.max(0.08, Math.min(1, state.shellProgress + state.nextLobeProgress * 0.25))
      : baseVisibility;

    mesh.scale.set(size * 1.22 * growth, size * 0.72 * growth, size * growth);
    material.color.copy(coolColor).lerp(hotColor, state.coreHeat * (stageActive ? 0.9 : 0.1));
    material.emissive
      .copy(darkEmissive)
      .lerp(hotEmissive, state.coreHeat * (stageActive ? 0.72 : 0.04));
    material.emissiveIntensity = stageActive ? 1.45 * state.coreHeat : 0.08;
  });

  return (
    <mesh ref={meshRef} position={[x, y, z]}>
      <sphereGeometry args={[1, 24, 16]} />
      <meshStandardMaterial
        ref={materialRef}
        color="#343b3e"
        emissive="#120503"
        roughness={0.88}
      />
    </mesh>
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
      {(stage === "melting" || stage === "rising") && (
        <>
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
      <Html center position={[0, -6.25, 0]}>
        <span className={styles.sceneLabel}>软流圈 · 高温但大部分仍是固体</span>
      </Html>
      <Html center position={[-5.8, -0.2, 0]}>
        <span className={styles.sceneLabel}>向左移动的洋壳</span>
      </Html>
      <Html center position={[5.8, -0.2, 0]}>
        <span className={styles.sceneLabel}>向右移动的洋壳</span>
      </Html>
      <Html center position={[0, stage === "melting" ? -3.55 : 2.2, 0]}>
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
            <sphereGeometry args={[0.2, 18, 12]} />
            <meshBasicMaterial
              color={isSelected ? "#f7d163" : "#9de8e1"}
              transparent
              opacity={isSelected ? 1 : 0.76}
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
      <ambientLight intensity={0.62} />
      <hemisphereLight args={["#6bb4c6", "#32170f", 1.25]} />
      <pointLight
        position={[0, -1.8, 2.5]}
        color="#ff5a19"
        intensity={76}
        distance={12}
        decay={1.8}
      />
      <directionalLight position={[2, 7, 8]} color="#8ad8e4" intensity={1.15} />

      <mesh position={[0, 3.25, 0]}>
        <boxGeometry args={[20, 5, 8]} />
        <meshPhysicalMaterial
          color="#0d5267"
          transparent
          opacity={0.13}
          roughness={0.12}
          transmission={0.08}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 5.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 8, 24, 12]} />
        <meshStandardMaterial
          color="#1e7787"
          transparent
          opacity={0.2}
          roughness={0.32}
          side={THREE.DoubleSide}
        />
      </mesh>

      <MantleLayer cutaway={overlays.cutaway} />
      <OceanicCrust cutaway={overlays.cutaway} />
      <MagmaChamber />
      <MagmaParticles stage={stage} playing={playing} speed={speed} />
      <EruptionFlow stage={stage} playing={playing} speed={speed} />
      <PillowField stage={stage} playing={playing} speed={speed} />
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
          [-0.42, 1.02, 2.2],
          [0, 1.28, 2.2],
          [0.42, 1.02, 2.2],
        ]}
        color="#ffb052"
        lineWidth={1.3}
        transparent
        opacity={0.75}
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
      onCreated={({ gl }) => gl.setClearColor("#06141c")}
      onPointerMissed={() => undefined}
      aria-label="可以拖动和缩放的三维海底火山剖面"
    >
      <fog attach="fog" args={["#06141c", 18, 48]} />
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
              <p>潜入深海，寻找岩浆的旅程</p>
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
        <span>洋中脊剖面</span>
        <Layers3 />
      </div>
    </main>
  );
}
