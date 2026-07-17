"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type LightStreamProps = {
  from: [number, number, number];
  to: [number, number, number];
  sourceRadius: number;
  targetRadius: number;
  playing: boolean;
  speed: number;
  opacity?: number;
};

export default function LightStream({
  from,
  to,
  sourceRadius,
  targetRadius,
  playing,
  speed,
  opacity = 1,
}: LightStreamProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const waveRefs = useRef<Array<THREE.Mesh | null>>([]);
  const layout = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const direction = end.clone().sub(start);
    const length = direction.length();
    const midpoint = start.clone().add(end).multiplyScalar(0.5);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize(),
    );
    const random = (() => {
      let seed = 7231;
      return () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };
    })();
    const positions = new Float32Array(92 * 3);
    for (let index = 0; index < 92; index += 1) {
      const progress = random();
      const radius = THREE.MathUtils.lerp(sourceRadius * 0.84, targetRadius * 0.84, progress);
      const angle = random() * Math.PI * 2;
      positions[index * 3] = Math.cos(angle) * radius * Math.sqrt(random());
      positions[index * 3 + 1] = (progress - 0.5) * length;
      positions[index * 3 + 2] = Math.sin(angle) * radius * Math.sqrt(random());
    }
    return { length, midpoint, quaternion, positions };
  }, [from, sourceRadius, targetRadius, to]);

  useFrame((state, delta) => {
    const positions = particlesRef.current?.geometry.attributes.position;
    if (positions && playing) {
      for (let index = 0; index < positions.count; index += 1) {
        let y = positions.getY(index) + delta * (1.8 + speed * 0.7);
        if (y > layout.length / 2) y -= layout.length;
        positions.setY(index, y);
      }
      positions.needsUpdate = true;
    }
    waveRefs.current.forEach((wave, index) => {
      if (!wave) return;
      const progress = ((state.clock.elapsedTime * (playing ? 0.16 * speed : 0) + index / 4) % 1 + 1) % 1;
      wave.position.y = (progress - 0.5) * layout.length;
      const waveScale = THREE.MathUtils.lerp(sourceRadius, targetRadius, progress);
      wave.scale.setScalar(waveScale);
      const material = wave.material as THREE.MeshBasicMaterial;
      material.opacity = opacity * Math.sin(progress * Math.PI) * 0.18;
    });
  });

  return (
    <group position={layout.midpoint} quaternion={layout.quaternion}>
      <mesh>
        <cylinderGeometry args={[targetRadius, sourceRadius, layout.length, 48, 1, true]} />
        <meshBasicMaterial
          color="#ffd35c"
          transparent
          opacity={opacity * 0.055}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <cylinderGeometry args={[targetRadius * 0.58, sourceRadius * 0.58, layout.length, 48, 1, true]} />
        <meshBasicMaterial
          color="#fff0a8"
          transparent
          opacity={opacity * 0.04}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[layout.positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#ffe797"
          size={0.055}
          sizeAttenuation
          transparent
          opacity={opacity * 0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
      {[0, 1, 2, 3].map((index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            waveRefs.current[index] = mesh;
          }}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.93, 1, 56]} />
          <meshBasicMaterial
            color="#fff1a6"
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
