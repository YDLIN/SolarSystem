import assert from "node:assert/strict";
import test from "node:test";
import {
  MAGMA_PATH,
  STAGE_DEFINITIONS,
  STAGE_ORDER,
  clampProgress,
  eruptionState,
  magmaPathPosition,
  pillowFormationState,
} from "../app/projects/volcano/volcanoModel.ts";

test("defines the four teaching stages in a fixed order", () => {
  assert.deepEqual(STAGE_ORDER, [
    "melting",
    "rising",
    "eruption",
    "cooling",
  ]);

  for (const stage of STAGE_ORDER) {
    const definition = STAGE_DEFINITIONS[stage];
    assert.equal(definition.id, stage);
    assert.ok(definition.description.length > 20);
    assert.ok(definition.sceneLabel.length > 8);
    assert.equal(definition.cameraPosition.length, 3);
    assert.equal(definition.cameraTarget.length, 3);
  }
});

test("clamps teaching progress into the rendered interval", () => {
  assert.equal(clampProgress(-3), 0);
  assert.equal(clampProgress(0.35), 0.35);
  assert.equal(clampProgress(4), 1);
  assert.equal(clampProgress(Number.NaN), 0);
});

test("magma path rises from the melt zone to the seafloor vent", () => {
  assert.ok(MAGMA_PATH.length >= 5);
  for (let index = 1; index < MAGMA_PATH.length; index += 1) {
    assert.ok(MAGMA_PATH[index][1] > MAGMA_PATH[index - 1][1]);
  }

  let previousY = magmaPathPosition(0)[1];
  for (let index = 1; index <= 100; index += 1) {
    const position = magmaPathPosition(index / 100);
    assert.ok(position[1] >= previousY);
    previousY = position[1];
  }
});

test("eruption progresses from the vent into a lateral lava flow", () => {
  const early = eruptionState(0.1);
  const late = eruptionState(0.9);
  assert.ok(early.ventRise > early.lateralFlow);
  assert.ok(late.lateralFlow > 0.9);
  assert.ok(late.bubbleRise > early.bubbleRise);
});

test("pillow lava forms a shell before the next lobe grows", () => {
  const shellStage = pillowFormationState(0.32);
  const nextLobeStage = pillowFormationState(0.7);

  assert.equal(shellStage.shellProgress, 1);
  assert.equal(shellStage.nextLobeProgress, 0);
  assert.ok(shellStage.coreHeat > 0.9);
  assert.ok(nextLobeStage.nextLobeProgress > 0);
  assert.ok(nextLobeStage.coreHeat > 0);
  assert.ok(nextLobeStage.coreHeat < shellStage.coreHeat);
});
