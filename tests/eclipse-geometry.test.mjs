import assert from "node:assert/strict";
import test from "node:test";
import {
  ECLIPSE_LAYOUT,
  eclipseObservationState,
  eclipseOrbitPosition,
  eclipseTargetPhase,
  nextForwardEclipsePhase,
} from "../app/projects/solar-system/eclipseGeometry.ts";

const EPSILON = 1e-9;

test("solar eclipse places the Moon between the Sun and Earth", () => {
  const moon = eclipseOrbitPosition(eclipseTargetPhase("solar-eclipse"));
  assert.ok(ECLIPSE_LAYOUT.sunX < moon.x);
  assert.ok(moon.x < ECLIPSE_LAYOUT.earthX);
  assert.ok(Math.abs(moon.y) < EPSILON);
  assert.ok(Math.abs(moon.z) < EPSILON);
});

test("lunar eclipse places the Earth between the Sun and Moon", () => {
  const moon = eclipseOrbitPosition(eclipseTargetPhase("lunar-eclipse"));
  assert.ok(ECLIPSE_LAYOUT.sunX < ECLIPSE_LAYOUT.earthX);
  assert.ok(ECLIPSE_LAYOUT.earthX < moon.x);
  assert.ok(Math.abs(moon.y) < EPSILON);
  assert.ok(Math.abs(moon.z) < EPSILON);
});

test("mode transitions always move forward to the opposite eclipse phase", () => {
  const lunarTarget = nextForwardEclipsePhase(Math.PI, "lunar-eclipse");
  const solarTarget = nextForwardEclipsePhase(lunarTarget, "solar-eclipse");

  assert.ok(lunarTarget > Math.PI);
  assert.ok(solarTarget > lunarTarget);
  assert.equal(lunarTarget - Math.PI, Math.PI);
  assert.equal(solarTarget - lunarTarget, Math.PI);
});

test("shared teaching scale leaves clearance between the Sun and Moon orbit", () => {
  const moonAtSolarEclipse = eclipseOrbitPosition(eclipseTargetPhase("solar-eclipse"));
  const sunRightEdge = ECLIPSE_LAYOUT.sunX + 2.25 * ECLIPSE_LAYOUT.sunScale;
  const moonLeftEdge = moonAtSolarEclipse.x - 0.42 * ECLIPSE_LAYOUT.moonScale;

  assert.ok(sunRightEdge < moonLeftEdge);
});

test("solar eclipse observation reaches totality at the aligned phase", () => {
  const observation = eclipseObservationState(
    "solar-eclipse",
    eclipseTargetPhase("solar-eclipse"),
  );

  assert.ok(Math.abs(observation.occluderX) < EPSILON);
  assert.ok(Math.abs(observation.occluderY) < EPSILON);
  assert.equal(observation.stage, "total");
  assert.equal(observation.stageLabel, "日全食");
  assert.ok(observation.coverage >= 0.985);
});

test("lunar eclipse observation places the Moon inside Earth's umbra at peak", () => {
  const observation = eclipseObservationState(
    "lunar-eclipse",
    eclipseTargetPhase("lunar-eclipse"),
  );

  assert.equal(observation.stage, "total");
  assert.equal(observation.stageLabel, "月全食");
  assert.ok(observation.coverage >= 0.985);
});

test("observation does not report an eclipse far from alignment", () => {
  const solar = eclipseObservationState("solar-eclipse", 0);
  const lunar = eclipseObservationState("lunar-eclipse", Math.PI);

  assert.equal(solar.stage, "none");
  assert.equal(lunar.stage, "none");
  assert.equal(solar.coverage, 0);
  assert.equal(lunar.coverage, 0);
});
