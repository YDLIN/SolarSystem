export type EclipseKind = "solar-eclipse" | "lunar-eclipse";

export type EclipseObservationStage =
  | "none"
  | "penumbral"
  | "partial"
  | "total";

export type EclipseObservationState = {
  kind: EclipseKind;
  targetRadius: number;
  occluderRadius: number;
  penumbraRadius: number;
  occluderX: number;
  occluderY: number;
  coverage: number;
  penumbraCoverage: number;
  stage: EclipseObservationStage;
  stageLabel: string;
};

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

function normalizeAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function circleOverlapFraction(
  targetRadius: number,
  occluderRadius: number,
  distance: number,
) {
  if (distance >= targetRadius + occluderRadius) return 0;
  if (distance <= Math.abs(occluderRadius - targetRadius)) {
    return Math.min(1, (occluderRadius * occluderRadius) / (targetRadius * targetRadius));
  }

  const targetAngle = Math.acos(
    (distance * distance + targetRadius * targetRadius - occluderRadius * occluderRadius)
      / (2 * distance * targetRadius),
  );
  const occluderAngle = Math.acos(
    (distance * distance + occluderRadius * occluderRadius - targetRadius * targetRadius)
      / (2 * distance * occluderRadius),
  );
  const lensArea =
    targetRadius * targetRadius * targetAngle
    + occluderRadius * occluderRadius * occluderAngle
    - 0.5
      * Math.sqrt(
        Math.max(
          0,
          (-distance + targetRadius + occluderRadius)
            * (distance + targetRadius - occluderRadius)
            * (distance - targetRadius + occluderRadius)
            * (distance + targetRadius + occluderRadius),
        ),
      );

  return Math.min(1, lensArea / (Math.PI * targetRadius * targetRadius));
}

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

export function eclipseObservationState(
  kind: EclipseKind,
  phase: number,
): EclipseObservationState {
  const phaseFromPeak = normalizeAngle(phase - eclipseTargetPhase(kind));
  const targetRadius = 1;
  const occluderRadius = kind === "solar-eclipse" ? 1.02 : 1.34;
  const penumbraRadius = kind === "solar-eclipse" ? occluderRadius : 1.82;
  const occluderX = Math.sin(phaseFromPeak / 2) * 5;
  const occluderY = Math.sin(phaseFromPeak) * 0.54;
  const distance = Math.hypot(occluderX, occluderY);
  const coverage = circleOverlapFraction(targetRadius, occluderRadius, distance);
  const penumbraCoverage = circleOverlapFraction(targetRadius, penumbraRadius, distance);

  let stage: EclipseObservationStage = "none";
  let stageLabel = kind === "solar-eclipse" ? "等待下一次日食" : "等待下一次月食";

  if (kind === "solar-eclipse") {
    if (coverage >= 0.985) {
      stage = "total";
      stageLabel = "日全食";
    } else if (coverage > 0.001) {
      stage = "partial";
      stageLabel = "日偏食";
    }
  } else if (coverage >= 0.985) {
    stage = "total";
    stageLabel = "月全食";
  } else if (coverage > 0.001) {
    stage = "partial";
    stageLabel = "月偏食";
  } else if (penumbraCoverage > 0.02) {
    stage = "penumbral";
    stageLabel = "半影月食";
  }

  return {
    kind,
    targetRadius,
    occluderRadius,
    penumbraRadius,
    occluderX,
    occluderY,
    coverage,
    penumbraCoverage,
    stage,
    stageLabel,
  };
}
