export type EclipseKind = "solar-eclipse" | "lunar-eclipse";

export const ECLIPSE_LAYOUT = {
  sunX: -12.2,
  earthX: 0,
  orbitRadiusX: 6.6,
  orbitRadiusY: 2.5,
  orbitDepth: 0.54,
  sunScale: 1.28,
  earthScale: 2.25,
  moonScale: 1.55,
  transitionDuration: 1.2,
} as const;

const FULL_TURN = Math.PI * 2;

export function eclipseTargetPhase(kind: EclipseKind) {
  return kind === "solar-eclipse" ? Math.PI : 0;
}

export function eclipseOrbitPosition(phase: number) {
  return {
    x: ECLIPSE_LAYOUT.earthX + Math.cos(phase) * ECLIPSE_LAYOUT.orbitRadiusX,
    y: Math.sin(phase) * ECLIPSE_LAYOUT.orbitRadiusY,
    z: Math.sin(phase) * ECLIPSE_LAYOUT.orbitDepth,
  };
}

export function nextForwardEclipsePhase(currentPhase: number, kind: EclipseKind) {
  const baseTarget = eclipseTargetPhase(kind);
  const completedTurns = Math.floor((currentPhase - baseTarget) / FULL_TURN) + 1;
  return baseTarget + Math.max(0, completedTurns) * FULL_TURN;
}
