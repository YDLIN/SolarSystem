import assert from "node:assert/strict";
import test from "node:test";
import {
  STAGE_DEFINITIONS,
  STAGE_ORDER,
  TOTAL_DURATION,
  TYPHOON_TRACKS,
  cloudFormationState,
  eyeFormationState,
  stageStartTime,
  tangentialWindVector,
  timelineState,
  trackPosition,
} from "../app/projects/typhoon/typhoonModel.ts";

test("defines a sixty-second typhoon story in six ordered stages", () => {
  assert.deepEqual(STAGE_ORDER, [
    "warm-ocean",
    "convection",
    "clustering",
    "rotation",
    "eye",
    "track",
  ]);
  assert.equal(TOTAL_DURATION, 60);

  for (const stage of STAGE_ORDER) {
    const definition = STAGE_DEFINITIONS[stage];
    assert.equal(definition.id, stage);
    assert.ok(definition.description.length > 20);
    assert.ok(definition.fact.length > 16);
    assert.equal(definition.cameraPosition.length, 3);
  }
});

test("maps global time into stable stage-local progress", () => {
  assert.deepEqual(timelineState(-4), {
    stage: "warm-ocean",
    stageProgress: 0,
    totalProgress: 0,
  });
  assert.equal(timelineState(stageStartTime("rotation")).stage, "rotation");
  assert.equal(timelineState(60).stage, "track");
  assert.equal(timelineState(60).stageProgress, 1);
  assert.equal(timelineState(100).totalProgress, 1);
});

test("clouds gather and organize before a mature eye appears", () => {
  const convection = cloudFormationState("convection", 0.5);
  const clustering = cloudFormationState("clustering", 0.8);
  const rotation = cloudFormationState("rotation", 0.8);

  assert.ok(clustering.density > convection.density);
  assert.ok(rotation.organization > clustering.organization);
  assert.equal(eyeFormationState("rotation", 1).eyeOpening, 0);
  assert.ok(eyeFormationState("eye", 0.9).eyeOpening > 0.9);
  assert.ok(
    eyeFormationState("eye", 0.9).eyewallIntensity >
      eyeFormationState("rotation", 1).eyewallIntensity,
  );
});

test("northern-hemisphere tangential flow turns counterclockwise", () => {
  assert.deepEqual(tangentialWindVector(1, 0), [0, 1]);
  assert.deepEqual(tangentialWindVector(0, 1), [-1, 0]);
  assert.deepEqual(tangentialWindVector(0, 0), [0, 0]);
});

test("all teaching tracks remain on the globe and weaken at the end", () => {
  for (const kind of Object.keys(TYPHOON_TRACKS)) {
    const start = trackPosition(kind, 0, 5);
    const middle = trackPosition(kind, 0.5, 5);
    const end = trackPosition(kind, 1, 5);

    for (const state of [start, middle, end]) {
      const radius = Math.hypot(...state.position);
      assert.ok(Math.abs(radius - 5) < 1e-10);
      assert.ok(Number.isFinite(state.lat));
      assert.ok(Number.isFinite(state.lon));
    }

    assert.ok(middle.intensity > start.intensity);
    assert.ok(end.intensity < middle.intensity);
    assert.equal(end.phase, "weakening");
  }
});
