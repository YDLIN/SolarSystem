import assert from "node:assert/strict";
import test from "node:test";
import {
  AXIAL_TILT_DEGREES,
  CITY_ORDER,
  SEASON_KEY_DATES,
  formatDayOfYear,
  getSeasonState,
  normalizeDay,
  seasonForDay,
} from "../app/projects/seasons/seasonModel.ts";

const [springEquinox, summerSolstice, autumnEquinox, winterSolstice] =
  SEASON_KEY_DATES;

test("defaults the city selector order to Guangzhou, Beijing, then Harbin", () => {
  assert.deepEqual(CITY_ORDER, ["guangzhou", "beijing", "harbin"]);
});

test("equinoxes keep all three Chinese cities close to twelve hours of daylight", () => {
  for (const keyDate of [springEquinox, autumnEquinox]) {
    for (const city of ["beijing", "guangzhou", "harbin"]) {
      const state = getSeasonState(keyDate.dayOfYear, city);
      assert.ok(Math.abs(state.daylightHours - 12) < 0.12);
      assert.equal(state.daylightTrend, "balanced");
    }
  }
});

test("summer and winter solstice daylight ordering follows city latitude", () => {
  const summer = ["harbin", "beijing", "guangzhou"].map(
    (city) => getSeasonState(summerSolstice.dayOfYear, city).daylightHours,
  );
  assert.ok(summer[0] > summer[1] && summer[1] > summer[2]);

  const winter = ["guangzhou", "beijing", "harbin"].map(
    (city) => getSeasonState(winterSolstice.dayOfYear, city).daylightHours,
  );
  assert.ok(winter[0] > winter[1] && winter[1] > winter[2]);
});

test("Guangzhou winter stays snow-free while northern cities differ", () => {
  assert.equal(
    getSeasonState(winterSolstice.dayOfYear, "guangzhou").snowLevel,
    0,
  );
  assert.equal(
    getSeasonState(winterSolstice.dayOfYear, "beijing").snowLevel,
    1,
  );
  assert.equal(
    getSeasonState(winterSolstice.dayOfYear, "harbin").snowLevel,
    2,
  );
});

test("astronomical season boundaries and year wrapping stay continuous", () => {
  assert.equal(seasonForDay(springEquinox.dayOfYear), "spring");
  assert.equal(seasonForDay(summerSolstice.dayOfYear), "summer");
  assert.equal(seasonForDay(autumnEquinox.dayOfYear), "autumn");
  assert.equal(seasonForDay(winterSolstice.dayOfYear), "winter");
  assert.equal(seasonForDay(0), "winter");
  assert.equal(normalizeDay(365), 0);
  assert.equal(normalizeDay(-1), 364);
  assert.equal(formatDayOfYear(0), "1月1日");
  assert.equal(formatDayOfYear(364), "12月31日");
});

test("the axial tilt remains fixed throughout Earth's orbit", () => {
  for (const day of [0, 78, 171, 264, 354, 364]) {
    assert.equal(getSeasonState(day, "beijing").axisTilt, AXIAL_TILT_DEGREES);
  }
});
