import assert from "node:assert/strict";
import test from "node:test";
import {
  orbitPositionFromEccentricAnomaly,
  orbitPositionFromMeanAnomaly,
  orbitTangentFromEccentricAnomaly,
  solveEccentricAnomaly,
} from "../app/planetOrbit.ts";

const EPSILON = 1e-9;

const referenceOrbit = {
  semiMajorAxis: 10,
  eccentricity: 0,
  inclinationDeg: 0,
  ascendingNodeDeg: 0,
  longitudePerihelionDeg: 0,
};

function distanceFromOrigin(position) {
  return Math.hypot(position.x, position.y, position.z);
}

test("a zero-eccentricity orbit remains a circle in the ecliptic plane", () => {
  for (const angle of [0, Math.PI / 3, Math.PI, Math.PI * 1.7]) {
    const position = orbitPositionFromEccentricAnomaly(referenceOrbit, angle);
    assert.ok(Math.abs(distanceFromOrigin(position) - 10) < EPSILON);
    assert.ok(Math.abs(position.y) < EPSILON);
  }
});

test("perihelion and aphelion match the ellipse eccentricity", () => {
  const orbit = {
    ...referenceOrbit,
    eccentricity: 0.20563593,
    inclinationDeg: 7.00497902,
    ascendingNodeDeg: 48.33076593,
    longitudePerihelionDeg: 77.45779628,
  };
  const perihelion = orbitPositionFromEccentricAnomaly(orbit, 0);
  const aphelion = orbitPositionFromEccentricAnomaly(orbit, Math.PI);

  assert.ok(
    Math.abs(distanceFromOrigin(perihelion) - 10 * (1 - orbit.eccentricity)) <
      EPSILON,
  );
  assert.ok(
    Math.abs(distanceFromOrigin(aphelion) - 10 * (1 + orbit.eccentricity)) <
      EPSILON,
  );
});

test("the Kepler solver accurately maps mean anomaly to eccentric anomaly", () => {
  const meanAnomaly = 2.3;
  const eccentricity = 0.20563593;
  const eccentricAnomaly = solveEccentricAnomaly(meanAnomaly, eccentricity);
  const residual =
    eccentricAnomaly -
    eccentricity * Math.sin(eccentricAnomaly) -
    meanAnomaly;

  assert.ok(Math.abs(residual) < 1e-12);
});

test("inclination and orbital orientation create a genuine 3D orbit", () => {
  const inclinedOrbit = {
    ...referenceOrbit,
    eccentricity: 0.0933941,
    inclinationDeg: 8,
    ascendingNodeDeg: 49.55953891,
    longitudePerihelionDeg: -23.94362959,
  };
  const position = orbitPositionFromMeanAnomaly(inclinedOrbit, Math.PI / 2);

  assert.ok(Math.abs(position.y) > 0.1);
  assert.ok(Math.abs(position.x) > 0.1);
  assert.ok(Math.abs(position.z) > 0.1);
});

test("orbit tangents follow the forward direction of the rendered ellipse", () => {
  const orbit = {
    ...referenceOrbit,
    eccentricity: 0.12,
    inclinationDeg: 6,
    ascendingNodeDeg: 42,
    longitudePerihelionDeg: 118,
  };
  const eccentricAnomaly = 1.37;
  const step = 1e-6;
  const before = orbitPositionFromEccentricAnomaly(
    orbit,
    eccentricAnomaly - step,
  );
  const after = orbitPositionFromEccentricAnomaly(
    orbit,
    eccentricAnomaly + step,
  );
  const tangent = orbitTangentFromEccentricAnomaly(orbit, eccentricAnomaly);
  const numericalTangent = {
    x: (after.x - before.x) / (2 * step),
    y: (after.y - before.y) / (2 * step),
    z: (after.z - before.z) / (2 * step),
  };
  const dot =
    tangent.x * numericalTangent.x +
    tangent.y * numericalTangent.y +
    tangent.z * numericalTangent.z;
  const magnitudes =
    Math.hypot(tangent.x, tangent.y, tangent.z) *
    Math.hypot(
      numericalTangent.x,
      numericalTangent.y,
      numericalTangent.z,
    );

  assert.ok(dot / magnitudes > 0.999999999);
});
