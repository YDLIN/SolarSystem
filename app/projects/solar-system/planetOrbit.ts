export type PlanetOrbitElements = {
  semiMajorAxis: number;
  eccentricity: number;
  inclinationDeg: number;
  ascendingNodeDeg: number;
  longitudePerihelionDeg: number;
};

const FULL_TURN = Math.PI * 2;
const DEG_TO_RAD = Math.PI / 180;

function normalizeRadians(angle: number) {
  return ((angle + Math.PI) % FULL_TURN + FULL_TURN) % FULL_TURN - Math.PI;
}

export function solveEccentricAnomaly(meanAnomaly: number, eccentricity: number) {
  const normalizedMeanAnomaly = normalizeRadians(meanAnomaly);
  let eccentricAnomaly = eccentricity < 0.8 ? normalizedMeanAnomaly : Math.PI;

  for (let iteration = 0; iteration < 12; iteration += 1) {
    const residual =
      eccentricAnomaly -
      eccentricity * Math.sin(eccentricAnomaly) -
      normalizedMeanAnomaly;
    const derivative = 1 - eccentricity * Math.cos(eccentricAnomaly);
    const correction = residual / derivative;
    eccentricAnomaly -= correction;

    if (Math.abs(correction) < 1e-12) break;
  }

  return eccentricAnomaly;
}

export function orbitPositionFromEccentricAnomaly(
  elements: PlanetOrbitElements,
  eccentricAnomaly: number,
) {
  const {
    semiMajorAxis,
    eccentricity,
  } = elements;
  const orbitalX =
    semiMajorAxis * (Math.cos(eccentricAnomaly) - eccentricity);
  const orbitalY =
    semiMajorAxis *
    Math.sqrt(1 - eccentricity * eccentricity) *
    Math.sin(eccentricAnomaly);

  return transformOrbitalVector(elements, orbitalX, orbitalY);
}

function transformOrbitalVector(
  elements: PlanetOrbitElements,
  orbitalX: number,
  orbitalY: number,
) {
  const {
    inclinationDeg,
    ascendingNodeDeg,
    longitudePerihelionDeg,
  } = elements;
  const inclination = inclinationDeg * DEG_TO_RAD;
  const ascendingNode = ascendingNodeDeg * DEG_TO_RAD;
  const argumentOfPerihelion =
    (longitudePerihelionDeg - ascendingNodeDeg) * DEG_TO_RAD;
  const cosArgument = Math.cos(argumentOfPerihelion);
  const sinArgument = Math.sin(argumentOfPerihelion);
  const cosNode = Math.cos(ascendingNode);
  const sinNode = Math.sin(ascendingNode);
  const cosInclination = Math.cos(inclination);
  const sinInclination = Math.sin(inclination);

  const eclipticX =
    (cosArgument * cosNode - sinArgument * sinNode * cosInclination) *
      orbitalX +
    (-sinArgument * cosNode - cosArgument * sinNode * cosInclination) *
      orbitalY;
  const eclipticY =
    (cosArgument * sinNode + sinArgument * cosNode * cosInclination) *
      orbitalX +
    (-sinArgument * sinNode + cosArgument * cosNode * cosInclination) *
      orbitalY;
  const eclipticZ =
    sinArgument * sinInclination * orbitalX +
    cosArgument * sinInclination * orbitalY;

  // JPL uses the ecliptic XY plane; Three.js uses XZ as the horizontal plane.
  return {
    x: eclipticX,
    y: eclipticZ,
    z: eclipticY,
  };
}

export function orbitTangentFromEccentricAnomaly(
  elements: PlanetOrbitElements,
  eccentricAnomaly: number,
) {
  const orbitalX =
    -elements.semiMajorAxis * Math.sin(eccentricAnomaly);
  const orbitalY =
    elements.semiMajorAxis *
    Math.sqrt(1 - elements.eccentricity * elements.eccentricity) *
    Math.cos(eccentricAnomaly);

  return transformOrbitalVector(elements, orbitalX, orbitalY);
}

export function orbitPositionFromMeanAnomaly(
  elements: PlanetOrbitElements,
  meanAnomaly: number,
) {
  return orbitPositionFromEccentricAnomaly(
    elements,
    solveEccentricAnomaly(meanAnomaly, elements.eccentricity),
  );
}
