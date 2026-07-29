"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls, Stars } from "@react-three/drei";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  SunMedium,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  CelestialSphere,
  EARTH,
  SUN,
} from "../solar-system/SolarSystemApp";
import styles from "./SeasonApp.module.css";
import {
  AXIAL_TILT_DEGREES,
  CITIES,
  CITY_ORDER,
  DAYS_IN_YEAR,
  SEASON_KEY_DATES,
  formatDaylightHours,
  getSeasonState,
} from "./seasonModel";
import type { CityId, SeasonState } from "./seasonModel";

const ORBIT_RADIUS = 8.2;
const AXIS_TILT_RADIANS = THREE.MathUtils.degToRad(AXIAL_TILT_DEGREES);
const SUN_SCALE = 1.42 / SUN.radius;
const EARTH_SCALE = 0.9 / EARTH.radius;
const SEASON_EARTH = { ...EARTH, axialTilt: 0 };

function OrbitTrack() {
  const points = useMemo(
    () =>
      Array.from({ length: 129 }, (_, index) => {
        const angle = (index / 128) * Math.PI * 2;
        return new THREE.Vector3(
          Math.cos(angle) * ORBIT_RADIUS,
          0,
          Math.sin(angle) * ORBIT_RADIUS,
        );
      }),
    [],
  );

  return (
    <>
      <Line
        points={points}
        color="#8cb9cb"
        lineWidth={1.1}
        transparent
        opacity={0.48}
      />
      <Line
        points={[
          [-ORBIT_RADIUS - 1.2, 0, 0],
          [ORBIT_RADIUS + 1.2, 0, 0],
        ]}
        color="#d8e7e6"
        transparent
        opacity={0.12}
        lineWidth={0.8}
      />
    </>
  );
}

function SunBody() {
  return (
    <group>
      <pointLight
        intensity={720}
        distance={34}
        decay={1.3}
        color="#fff0b0"
      />
      <CelestialSphere
        body={SUN}
        labels={false}
        speed={1}
        playing={false}
        scale={SUN_SCALE}
      />
      <Html center position={[0, 2.05, 0]}>
        <span className={styles.bodyLabel}>太阳</span>
      </Html>
    </group>
  );
}

function SunRays({ earthPosition }: { earthPosition: THREE.Vector3 }) {
  const rays = useMemo(() => {
    const direction = earthPosition.clone().normalize();
    const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
    return [-1.1, -0.55, 0, 0.55, 1.1].map((offset) => {
      const start = direction
        .clone()
        .multiplyScalar(1.8)
        .add(perpendicular.clone().multiplyScalar(offset));
      const end = earthPosition
        .clone()
        .add(direction.clone().multiplyScalar(-1.05))
        .add(perpendicular.clone().multiplyScalar(offset * 0.54));
      return [start, end] as [THREE.Vector3, THREE.Vector3];
    });
  }, [earthPosition]);

  return (
    <>
      {rays.map((points, index) => (
        <Line
          key={index}
          points={points}
          color="#ffd96a"
          lineWidth={0.8}
          transparent
          opacity={index === 2 ? 0.5 : 0.28}
        />
      ))}
    </>
  );
}

function EarthBody({
  state,
  position,
}: {
  state: SeasonState;
  position: THREE.Vector3;
}) {
  const sunDirection = useMemo(
    () => position.clone().multiplyScalar(-1).normalize(),
    [position],
  );
  const localSunDirection = useMemo(() => {
    const direction = sunDirection.clone();
    direction.applyAxisAngle(new THREE.Vector3(0, 0, 1), AXIS_TILT_RADIANS);
    return direction;
  }, [sunDirection]);
  const desiredLongitude = Math.atan2(
    localSunDirection.z,
    localSunDirection.x,
  );
  const cityLongitude = THREE.MathUtils.degToRad(state.city.longitude);
  const spinAngle = cityLongitude - desiredLongitude;
  const latitude = THREE.MathUtils.degToRad(state.city.latitude);
  const longitude = THREE.MathUtils.degToRad(state.city.longitude);
  const markerPosition = new THREE.Vector3(
    Math.cos(latitude) * Math.cos(longitude),
    Math.sin(latitude),
    Math.cos(latitude) * Math.sin(longitude),
  ).multiplyScalar(0.93);

  return (
    <group position={position}>
      <group rotation={[0, 0, -AXIS_TILT_RADIANS]}>
        <Line
          points={[
            [0, -1.55, 0],
            [0, 1.55, 0],
          ]}
          color="#fff4b8"
          lineWidth={1.4}
        />
        <Html center position={[0, 1.72, 0]}>
          <span className={`${styles.bodyLabel} ${styles.northLabel}`}>北</span>
        </Html>
        <Line
          points={Array.from({ length: 65 }, (_, index) => {
            const angle = (index / 64) * Math.PI * 2;
            return [
              Math.cos(angle) * 0.92,
              0,
              Math.sin(angle) * 0.92,
            ] as [number, number, number];
          })}
          color="#d8f5ef"
          lineWidth={0.75}
          transparent
          opacity={0.42}
        />

        <group rotation={[0, spinAngle, 0]}>
          <CelestialSphere
            body={SEASON_EARTH}
            labels={false}
            speed={1}
            playing={false}
            scale={EARTH_SCALE}
          />
          <group position={markerPosition}>
            <mesh>
              <sphereGeometry args={[0.072, 20, 20]} />
              <meshBasicMaterial color="#ffed75" />
            </mesh>
            <Html center position={[0, 0.28, 0]}>
              <span className={styles.cityMarker}>
                <MapPin aria-hidden="true" />
                {state.city.name}
              </span>
            </Html>
          </group>
        </group>
      </group>

      <Html center position={[0, -1.62, 0]}>
        <span className={styles.tiltLabel}>地轴倾斜 23.4°</span>
      </Html>
    </group>
  );
}

function CameraRig({
  controlsRef,
  resetKey,
}: {
  controlsRef: RefObject<OrbitControlsImpl | null>;
  resetKey: number;
}) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 11.2, 17.8);
    camera.lookAt(0, 0, 0);
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [camera, controlsRef, resetKey]);

  return null;
}

function SeasonScene({
  state,
  resetKey,
}: {
  state: SeasonState;
  resetKey: number;
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const earthPosition = useMemo(
    () =>
      new THREE.Vector3(
        Math.cos(state.orbitAngle) * ORBIT_RADIUS,
        0,
        Math.sin(state.orbitAngle) * ORBIT_RADIUS,
      ),
    [state.orbitAngle],
  );

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 11.2, 17.8], fov: 46, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => gl.setClearColor("#07141f")}
      aria-label="可以拖动和缩放的太阳与地球四季关系三维模型"
    >
      <fog attach="fog" args={["#07141f", 24, 68]} />
      <ambientLight intensity={0.33} color="#8ba4b6" />
      <Stars
        radius={54}
        depth={28}
        count={900}
        factor={1.4}
        saturation={0.18}
        fade
        speed={0}
      />
      <OrbitTrack />
      <SunRays earthPosition={earthPosition} />
      <SunBody />
      <EarthBody state={state} position={earthPosition} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={8}
        maxDistance={34}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI / 2.05}
      />
      <CameraRig controlsRef={controlsRef} resetKey={resetKey} />
    </Canvas>
  );
}

function LandscapeAnimation({
  state,
  reducedMotion,
}: {
  state: SeasonState;
  reducedMotion: boolean;
}) {
  return (
    <div
      className={styles.landscape}
      data-season={state.season}
      data-city={state.city.id}
      data-snow={state.snowLevel}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      aria-hidden="true"
    >
      <span className={styles.landscapeSun} />
      <span className={styles.cloud}>
        <i />
        <i />
      </span>
      <span className={styles.rain}>
        {Array.from({ length: 7 }, (_, index) => <i key={index} />)}
      </span>
      <span className={styles.snow}>
        {Array.from({ length: 10 }, (_, index) => <i key={index}>✦</i>)}
      </span>
      <span className={styles.tree}>
        <i className={styles.trunk} />
        <i className={styles.crown} />
        <i className={styles.bloom}>✿</i>
      </span>
      <span className={styles.fallingLeaves}>
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className={styles.ground} />
      <span className={styles.citySilhouette}>
        <i />
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

function ObservationPanel({
  state,
  city,
  onCityChange,
  reducedMotion,
}: {
  state: SeasonState;
  city: CityId;
  onCityChange: (city: CityId) => void;
  reducedMotion: boolean;
}) {
  return (
    <aside className={styles.observation} aria-label="中国四季观察窗">
      <div className={styles.observationHeading}>
        <div>
          <span>中国四季观察窗</span>
          <strong>{state.seasonLabel}</strong>
        </div>
        <div className={styles.cityTabs} aria-label="选择观察城市">
          {CITY_ORDER.map((cityId) => (
            <button
              key={cityId}
              type="button"
              className={city === cityId ? styles.activeCity : ""}
              onClick={() => onCityChange(cityId)}
              aria-pressed={city === cityId}
            >
              {CITIES[cityId].name}
            </button>
          ))}
        </div>
      </div>

      <LandscapeAnimation state={state} reducedMotion={reducedMotion} />

      <div className={styles.observationCopy}>
        <div className={styles.observationStats}>
          <span>
            <CalendarDays aria-hidden="true" />
            {state.dateLabel}
          </span>
          <span className={styles.daylightBadge} data-trend={state.daylightTrend}>
            <SunMedium aria-hidden="true" />
            {state.daylightLabel}
          </span>
        </div>
        <p>{state.cityNote}</p>
        <small>
          {state.city.latitudeLabel} · 白天约 {formatDaylightHours(state.daylightHours)}
        </small>
      </div>
    </aside>
  );
}

export default function SeasonApp() {
  const [dayOfYear, setDayOfYear] = useState(SEASON_KEY_DATES[0].dayOfYear);
  const [city, setCity] = useState<CityId>("guangzhou");
  const [playing, setPlaying] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const lastFrameRef = useRef<number | null>(null);
  const state = useMemo(
    () => getSeasonState(dayOfYear, city),
    [city, dayOfYear],
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

  useEffect(() => {
    if (!playing || reducedMotion) {
      lastFrameRef.current = null;
      return;
    }

    let animationFrame = 0;
    const animate = (time: number) => {
      if (lastFrameRef.current !== null) {
        const elapsed = Math.min(80, time - lastFrameRef.current);
        setDayOfYear(
          (current) => (current + (elapsed * DAYS_IN_YEAR) / 28_000) % DAYS_IN_YEAR,
        );
      }
      lastFrameRef.current = time;
      animationFrame = window.requestAnimationFrame(animate);
    };
    animationFrame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [playing, reducedMotion]);

  const selectDay = (day: number) => {
    setPlaying(false);
    setDayOfYear(day);
  };

  return (
    <main className={styles.app} data-testid="seasons-app">
      <div className={styles.canvasShell} data-testid="seasons-canvas">
        <SeasonScene state={state} resetKey={resetKey} />
      </div>

      <header className={styles.header}>
        <div className={styles.identity}>
          {/* vinext dev currently duplicates React when next/link is imported here. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className={styles.backLink} aria-label="返回小小科学馆">
            <ArrowLeft aria-hidden="true" />
            <span>科学馆</span>
          </a>
          <div className={styles.brand}>
            <span className={styles.brandMark} aria-hidden="true">
              <SunMedium />
            </span>
            <div>
              <h1>地球的四季</h1>
              <p>中国为什么会有春夏秋冬？</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          className={styles.resetButton}
          onClick={() => setResetKey((value) => value + 1)}
          aria-label="重置三维视角"
        >
          <RotateCcw aria-hidden="true" />
          <span>重置视角</span>
        </button>
      </header>

      <section className={styles.lesson} aria-live="polite">
        <span>{state.seasonLabel}</span>
        <p>{state.explanation}</p>
      </section>

      <aside className={styles.coreFact}>
        <strong>记住这个关键</strong>
        <p>四季主要来自地轴倾斜，不是因为地球离太阳忽远忽近。</p>
      </aside>

      <ObservationPanel
        state={state}
        city={city}
        onCityChange={(nextCity) => {
          setCity(nextCity);
          setPlaying(false);
        }}
        reducedMotion={reducedMotion}
      />

      <section className={styles.timelinePanel} aria-label="全年时间控制">
        <div className={styles.timelineTopline}>
          <button
            type="button"
            className={styles.playButton}
            onClick={() => setPlaying((value) => !value)}
            aria-label={playing ? "暂停全年动画" : "播放全年动画"}
          >
            {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
            <span>{playing ? "暂停" : "播放一年"}</span>
          </button>
          <div className={styles.currentDate} aria-live="polite">
            <strong>{state.dateLabel}</strong>
            <span>{state.city.name} · {state.seasonLabel}</span>
          </div>
          <p>拖动时间，观察太阳和地球的位置关系</p>
        </div>

        <div className={styles.rangeWrap}>
          <span>1月1日</span>
          <input
            type="range"
            min={0}
            max={DAYS_IN_YEAR - 1}
            step={1}
            value={Math.min(DAYS_IN_YEAR - 1, Math.round(state.dayOfYear))}
            onPointerDown={() => setPlaying(false)}
            onChange={(event) => selectDay(Number(event.target.value))}
            aria-label="选择一年中的日期"
            aria-valuetext={`${state.dateLabel}，${state.seasonLabel}`}
          />
          <span>12月31日</span>
        </div>

        <nav className={styles.keyDates} aria-label="四季关键日期">
          {SEASON_KEY_DATES.map((keyDate) => (
            <button
              key={keyDate.id}
              type="button"
              data-season={keyDate.season}
              onClick={() => selectDay(keyDate.dayOfYear)}
            >
              <strong>{keyDate.label}</strong>
              <span>{keyDate.shortDate}</span>
            </button>
          ))}
        </nav>
        <p className={styles.scaleNote}>
          太阳、地球与距离按教学需要调整，画面不按真实比例展示
        </p>
      </section>
    </main>
  );
}
