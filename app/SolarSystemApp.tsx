"use client";

import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls, Stars } from "@react-three/drei";
import {
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
import type { RefObject } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

export type Mode =
  | "solar-system"
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
  "solar-system": ["orbits", "labels", "moon"],
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
  rotationDirection: 1,
  color: "#ffb229",
  accent: "#fff0a5",
  texture: "sun",
  fact: "太阳是一颗会自己发光、发热的恒星。",
};

const PLANETS: CelestialBody[] = [
  {
    id: "mercury",
    name: "水星",
    radius: 0.38,
    orbitRadius: 4.2,
    orbitPeriod: 0.38,
    rotationSpeed: 0.04,
    axialTilt: 0.03,
    orbitTilt: 7,
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
    orbitTilt: 3.4,
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
    orbitTilt: 1.85,
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
    orbitTilt: 1.3,
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
    orbitTilt: 2.5,
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
    orbitTilt: 0.77,
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
    orbitTilt: 1.77,
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
    id: "solar-system",
    label: "太阳系",
    shortLabel: "太阳系",
    description: "拖动星空，点一点行星，看看谁离太阳近、谁离太阳远。",
    icon: Orbit,
  },
  {
    id: "motion",
    label: "公转与自转",
    shortLabel: "转动",
    description: "行星一边自己转，一边沿着轨道绕太阳转。",
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

function createBodyTexture(body: CelestialBody) {
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
  return texture;
}

function RotationIndicator({ radius }: { radius: number }) {
  return (
    <group position={[0, radius * 1.32, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <torusGeometry args={[radius * 1.22, Math.max(0.025, radius * 0.035), 8, 56, Math.PI * 1.62]} />
        <meshBasicMaterial color="#70e2cf" transparent opacity={0.8} />
      </mesh>
      <mesh position={[-radius * 1.22, radius * 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[Math.max(0.07, radius * 0.12), Math.max(0.18, radius * 0.32), 14]} />
        <meshBasicMaterial color="#70e2cf" />
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
  const texture = useMemo(() => createBodyTexture(body), [body]);
  const radius = body.radius * scale;

  useEffect(() => () => texture?.dispose(), [texture]);

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
            <meshBasicMaterial map={texture ?? undefined} color={body.color} />
          ) : (
            <meshStandardMaterial
              map={texture ?? undefined}
              color="#ffffff"
              roughness={0.86}
              metalness={0.02}
            />
          )}
        </mesh>

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
        <mesh scale={1.09}>
          <sphereGeometry args={[radius, 40, 28]} />
          <meshBasicMaterial color="#ff9f2d" transparent opacity={0.13} side={THREE.BackSide} />
        </mesh>
      )}

      {arrows && body.id !== "sun" && <RotationIndicator radius={radius} />}

      {labels && (
        <Html center position={[0, radius + 0.68, 0]}>
          <span className={`body-label${selected ? " is-selected" : ""}`}>{body.name}</span>
        </Html>
      )}
    </group>
  );
}

function OrbitTrack({ body, active }: { body: CelestialBody; active: boolean }) {
  const points = useMemo(
    () =>
      Array.from({ length: 97 }, (_, index) => {
        const angle = (index / 96) * Math.PI * 2;
        return new THREE.Vector3(
          Math.cos(angle) * body.orbitRadius,
          0,
          Math.sin(angle) * body.orbitRadius,
        );
      }),
    [body],
  );

  return (
    <group rotation={[THREE.MathUtils.degToRad(body.orbitTilt), 0, 0]}>
      <Line
        points={points}
        color={active ? "#70e2cf" : "#77766f"}
        transparent
        opacity={active ? 0.58 : 0.27}
        lineWidth={active ? 1.25 : 0.7}
      />
      {active && (
        <mesh position={[body.orbitRadius * 0.62, 0.04, body.orbitRadius * 0.78]} rotation={[0, 0.6, Math.PI / 2]}>
          <coneGeometry args={[0.11, 0.35, 14]} />
          <meshBasicMaterial color="#70e2cf" />
        </mesh>
      )}
    </group>
  );
}

function OrbitingPlanet({
  body,
  index,
  mode,
  focusedBody,
  playing,
  speed,
  overlays,
  onSelect,
}: {
  body: CelestialBody;
  index: number;
  mode: Mode;
  focusedBody: string | null;
  playing: boolean;
  speed: number;
  overlays: OverlayState;
  onSelect: (body: CelestialBody) => void;
}) {
  const positionRef = useRef<THREE.Group>(null);
  const angleRef = useRef(index * 0.78 + 0.42);

  useFrame((_, delta) => {
    if (!positionRef.current) return;
    if (playing) {
      angleRef.current += delta * (0.2 / body.orbitPeriod) * speed;
    }
    const angle = angleRef.current;
    positionRef.current.position.set(
      Math.cos(angle) * body.orbitRadius,
      0,
      Math.sin(angle) * body.orbitRadius,
    );
  });

  return (
    <group rotation={[THREE.MathUtils.degToRad(body.orbitTilt), 0, 0]}>
      <group ref={positionRef} name={`body-${body.id}`}>
        <CelestialSphere
          body={body}
          labels={overlays.labels}
          arrows={overlays.arrows && mode === "motion"}
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
  mode,
  focusedBody,
  playing,
  speed,
  overlays,
  onSelect,
}: {
  mode: Mode;
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
        overlays.orbits ? <OrbitTrack key={`orbit-${body.id}`} body={body} active={mode === "motion"} /> : null,
      )}
      {PLANETS.map((body, index) => (
        <OrbitingPlanet
          key={body.id}
          body={body}
          index={index}
          mode={mode}
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
        <Line
          points={[new THREE.Vector3(-5, 2.4, 0), new THREE.Vector3(1.4, 2.4, 0)]}
          color="#ffd564"
          transparent
          opacity={0.5}
          lineWidth={1.2}
          dashed
        />
      )}
      <Html center position={[-1.2, 3.1, 0]}>
        <span className="scene-caption">阳光只照亮地球的一半</span>
      </Html>
    </>
  );
}

function SolarEclipseScene({ playing, speed, overlays }: { playing: boolean; speed: number; overlays: OverlayState }) {
  const moonGroup = useRef<THREE.Group>(null);
  const phase = useRef(Math.PI - 0.86);
  const earth = PLANETS.find((body) => body.id === "earth")!;
  const earthX = 8;
  const moonOrbitRadius = 6.35;
  const moonOrbitTilt = THREE.MathUtils.degToRad(MOON.orbitTilt);

  useFrame((_, delta) => {
    if (!moonGroup.current) return;
    if (playing) phase.current += delta * 0.42 * speed;
    const orbitDepth = Math.sin(phase.current) * moonOrbitRadius;
    moonGroup.current.position.set(
      earthX + Math.cos(phase.current) * moonOrbitRadius,
      orbitDepth * Math.sin(moonOrbitTilt),
      orbitDepth * Math.cos(moonOrbitTilt),
    );
  });

  return (
    <>
      <ambientLight intensity={overlays.light ? 0.2 : 1.45} />
      {overlays.light && (
        <>
          <pointLight
            position={[-8.5, 0, 0]}
            intensity={2100}
            distance={42}
            decay={1.25}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <directionalLight position={[-9, 0, 0]} intensity={2.4} />
        </>
      )}
      <group position={[-8.5, 0, 0]}>
        <CelestialSphere body={SUN} labels={overlays.labels} speed={speed} playing={playing} scale={1.28} />
      </group>
      <group ref={moonGroup} name="body-moon">
        <CelestialSphere body={MOON} labels={overlays.labels} speed={speed} playing={playing} scale={1.42} />
        {overlays.light && (
          <mesh position={[3.4, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <cylinderGeometry args={[0.18, 0.58, 6.8, 32, 1, true]} />
            <meshBasicMaterial color="#23211f" transparent opacity={0.42} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        )}
      </group>
      <group position={[earthX, 0, 0]} name="body-earth">
        <CelestialSphere body={earth} labels={overlays.labels} speed={speed} playing={playing} scale={2.18} />
      </group>
      {overlays.orbits && (
        <Line
          points={Array.from({ length: 65 }, (_, index) => {
            const angle = (index / 64) * Math.PI * 2;
            const orbitDepth = Math.sin(angle) * moonOrbitRadius;
            return new THREE.Vector3(
              earthX + Math.cos(angle) * moonOrbitRadius,
              orbitDepth * Math.sin(moonOrbitTilt),
              orbitDepth * Math.cos(moonOrbitTilt),
            );
          })}
          color="#8e8b82"
          transparent
          opacity={0.34}
          lineWidth={0.8}
        />
      )}
    </>
  );
}

function LunarEclipseScene({ playing, speed, overlays }: { playing: boolean; speed: number; overlays: OverlayState }) {
  const moonGroup = useRef<THREE.Group>(null);
  const phase = useRef(-0.86);
  const earth = PLANETS.find((body) => body.id === "earth")!;

  useFrame((_, delta) => {
    if (!moonGroup.current) return;
    if (playing) phase.current += delta * 0.42 * speed;
    moonGroup.current.position.y = Math.sin(phase.current) * 2.7;
  });

  return (
    <>
      <ambientLight intensity={overlays.light ? 0.2 : 1.45} />
      {overlays.light && (
        <>
          <pointLight
            position={[-8.5, 0, 0]}
            intensity={2100}
            distance={44}
            decay={1.25}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <directionalLight position={[-9, 0, 0]} intensity={2.4} />
        </>
      )}
      <group position={[-8.5, 0, 0]}>
        <CelestialSphere body={SUN} labels={overlays.labels} speed={speed} playing={playing} scale={1.28} />
      </group>
      <group position={[0, 0, 0]} name="body-earth">
        <CelestialSphere body={earth} labels={overlays.labels} speed={speed} playing={playing} scale={2.25} />
      </group>
      {overlays.light && (
        <mesh position={[4, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.72, 1.46, 8, 32, 1, true]} />
          <meshBasicMaterial color="#241d22" transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
      <group ref={moonGroup} position={[8, -2, 0]} name="body-moon">
        <CelestialSphere body={MOON} labels={overlays.labels} speed={speed} playing={playing} scale={1.55} />
      </group>
      {overlays.orbits && (
        <Line
          points={Array.from({ length: 65 }, (_, index) => {
            const angle = (index / 64) * Math.PI * 2;
            return new THREE.Vector3(Math.cos(angle) * 8, Math.sin(angle) * 2.7, Math.sin(angle) * 0.58);
          })}
          color="#8e8b82"
          transparent
          opacity={0.34}
          lineWidth={0.8}
        />
      )}
    </>
  );
}

function cameraPreset(mode: Mode) {
  if (mode === "solar-system" || mode === "motion") {
    return { position: new THREE.Vector3(0, 17, 28), target: new THREE.Vector3(0, 0, 0) };
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
  const { camera, scene } = useThree();
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

    const preset = cameraPreset(mode);
    let target = preset.target.clone();
    let position = preset.position.clone();
    if (focusedBody && (mode === "solar-system" || mode === "motion")) {
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
  }, [camera, controlsRef, focusedBody, mode, reducedMotion, resetKey, scene]);

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

    if (focusedBody && (mode === "solar-system" || mode === "motion")) {
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
  onSelect,
}: {
  mode: Mode;
  focusedBody: string | null;
  playing: boolean;
  speed: number;
  overlays: OverlayState;
  resetKey: number;
  reducedMotion: boolean;
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
      {(mode === "solar-system" || mode === "motion") && (
        <SolarSystemScene
          mode={mode}
          focusedBody={focusedBody}
          playing={playing}
          speed={speed}
          overlays={overlays}
          onSelect={onSelect}
        />
      )}
      {mode === "day-night" && <DayNightScene playing={playing} speed={speed} overlays={overlays} />}
      {mode === "solar-eclipse" && <SolarEclipseScene playing={playing} speed={speed} overlays={overlays} />}
      {mode === "lunar-eclipse" && <LunarEclipseScene playing={playing} speed={speed} overlays={overlays} />}
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
  const [mode, setMode] = useState<Mode>("solar-system");
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
    moon: mode === "solar-system" || mode === "motion" ? overlays.moon : true,
  };

  const changeMode = (nextMode: Mode) => {
    setMode(nextMode);
    setFocusedBody(null);
    setPlaying(true);
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
          onSelect={selectBody}
        />
      </div>

      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true"><Sun /></span>
          <div>
            <h1>小小太阳系</h1>
            <p>和星球一起转起来</p>
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

      {!settingsOpen && selectedBody && (mode === "solar-system" || mode === "motion") && (
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
            aria-label="返回太阳系总览"
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

      <div className="bottom-controls">
        {(mode === "solar-eclipse" || mode === "lunar-eclipse") && (
          <p className="eclipse-note">月球轨道倾斜约 5°，所以日食和月食不会每个月都发生。</p>
        )}
        <p className="scale-note">为了方便观察，大小和距离经过调整</p>
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
