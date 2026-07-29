export type CityId = "beijing" | "guangzhou" | "harbin";

export type SeasonId = "spring" | "summer" | "autumn" | "winter";

export type SeasonKeyDate = {
  id: "spring-equinox" | "summer-solstice" | "autumn-equinox" | "winter-solstice";
  label: string;
  shortDate: string;
  dayOfYear: number;
  season: SeasonId;
};

export type CityProfile = {
  id: CityId;
  name: string;
  latitude: number;
  longitude: number;
  latitudeLabel: string;
  character: string;
};

export type SeasonState = {
  dayOfYear: number;
  dateLabel: string;
  season: SeasonId;
  seasonLabel: string;
  orbitAngle: number;
  solarLongitude: number;
  solarDeclination: number;
  solarNoonAltitude: number;
  daylightHours: number;
  daylightLabel: string;
  daylightTrend: "long" | "balanced" | "short";
  axisTilt: number;
  city: CityProfile;
  explanation: string;
  cityNote: string;
  snowLevel: 0 | 1 | 2;
};

export const AXIAL_TILT_DEGREES = 23.44;
export const DAYS_IN_YEAR = 365;
export const CITY_ORDER: readonly CityId[] = [
  "guangzhou",
  "beijing",
  "harbin",
];

export const CITIES: Record<CityId, CityProfile> = {
  beijing: {
    id: "beijing",
    name: "北京",
    latitude: 39.9,
    longitude: 116.4,
    latitudeLabel: "北纬约 40°",
    character: "四季分明",
  },
  guangzhou: {
    id: "guangzhou",
    name: "广州",
    latitude: 23.1,
    longitude: 113.3,
    latitudeLabel: "北纬约 23°",
    character: "冬季温和",
  },
  harbin: {
    id: "harbin",
    name: "哈尔滨",
    latitude: 45.8,
    longitude: 126.6,
    latitudeLabel: "北纬约 46°",
    character: "冬季漫长",
  },
};

export const SEASON_KEY_DATES: readonly SeasonKeyDate[] = [
  {
    id: "spring-equinox",
    label: "春分",
    shortDate: "3月20日",
    dayOfYear: 78,
    season: "spring",
  },
  {
    id: "summer-solstice",
    label: "夏至",
    shortDate: "6月21日",
    dayOfYear: 171,
    season: "summer",
  },
  {
    id: "autumn-equinox",
    label: "秋分",
    shortDate: "9月22日",
    dayOfYear: 264,
    season: "autumn",
  },
  {
    id: "winter-solstice",
    label: "冬至",
    shortDate: "12月21日",
    dayOfYear: 354,
    season: "winter",
  },
] as const;

export const SEASON_LABELS: Record<SeasonId, string> = {
  spring: "春季",
  summer: "夏季",
  autumn: "秋季",
  winter: "冬季",
};

const MONTHS = [
  { name: "1月", days: 31 },
  { name: "2月", days: 28 },
  { name: "3月", days: 31 },
  { name: "4月", days: 30 },
  { name: "5月", days: 31 },
  { name: "6月", days: 30 },
  { name: "7月", days: 31 },
  { name: "8月", days: 31 },
  { name: "9月", days: 30 },
  { name: "10月", days: 31 },
  { name: "11月", days: 30 },
  { name: "12月", days: 31 },
] as const;

function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function radiansToDegrees(radians: number) {
  return (radians * 180) / Math.PI;
}

export function normalizeDay(dayOfYear: number) {
  return ((dayOfYear % DAYS_IN_YEAR) + DAYS_IN_YEAR) % DAYS_IN_YEAR;
}

export function formatDayOfYear(dayOfYear: number) {
  let remaining = Math.floor(normalizeDay(dayOfYear));
  for (const month of MONTHS) {
    if (remaining < month.days) return `${month.name}${remaining + 1}日`;
    remaining -= month.days;
  }
  return "12月31日";
}

export function seasonForDay(dayOfYear: number): SeasonId {
  const day = normalizeDay(dayOfYear);
  if (day >= 78 && day < 171) return "spring";
  if (day >= 171 && day < 264) return "summer";
  if (day >= 264 && day < 354) return "autumn";
  return "winter";
}

function daylightForLatitude(latitude: number, declination: number) {
  const latitudeRadians = degreesToRadians(latitude);
  const declinationRadians = degreesToRadians(declination);
  const cosineHourAngle =
    -Math.tan(latitudeRadians) * Math.tan(declinationRadians);
  const clamped = Math.max(-1, Math.min(1, cosineHourAngle));
  return (24 * Math.acos(clamped)) / Math.PI;
}

function describeDaylight(daylightHours: number) {
  if (daylightHours > 13) {
    return {
      label: "白天较长",
      trend: "long" as const,
    };
  }
  if (daylightHours < 11) {
    return {
      label: "白天较短",
      trend: "short" as const,
    };
  }
  return {
    label: "昼夜接近",
    trend: "balanced" as const,
  };
}

function seasonExplanation(season: SeasonId) {
  if (season === "summer") {
    return "北半球更朝向太阳，阳光照得更直，白天也更长。";
  }
  if (season === "winter") {
    return "北半球背向太阳，阳光照得更斜，白天也更短。";
  }
  return "太阳照向赤道附近，南北半球得到的阳光比较接近。";
}

function citySeasonNote(city: CityId, season: SeasonId) {
  const notes: Record<CityId, Record<SeasonId, string>> = {
    beijing: {
      spring: "天气慢慢回暖，树枝抽出新芽，春风也更常见。",
      summer: "阳光强、绿树茂盛，午后有时会出现阵雨。",
      autumn: "天空更清爽，树叶渐渐由绿色变成金黄色。",
      winter: "天气寒冷干燥，树木落叶，偶尔会迎来降雪。",
    },
    guangzhou: {
      spring: "暖湿空气带来细雨，植物很早就开始旺盛生长。",
      summer: "夏季很长，天气炎热湿润，也常有雷阵雨。",
      autumn: "天气仍然温暖，雨水减少，天空变得更清朗。",
      winter: "冬季比较温和，许多植物依然保持绿色。",
    },
    harbin: {
      spring: "冰雪逐渐消融，但真正暖起来通常比北京更晚。",
      summer: "白天很长，短暂的夏季里植物快速生长。",
      autumn: "秋天来得早，树叶很快变黄，天气迅速转凉。",
      winter: "冬季漫长而寒冷，积雪会停留很长时间。",
    },
  };
  return notes[city][season];
}

function snowFor(city: CityId, season: SeasonId): 0 | 1 | 2 {
  if (season !== "winter") return 0;
  if (city === "harbin") return 2;
  if (city === "beijing") return 1;
  return 0;
}

function solarLongitudeForDay(dayOfYear: number) {
  const day = normalizeDay(dayOfYear);
  const adjustedDay = day < 78 ? day + DAYS_IN_YEAR : day;
  const anchors = [
    { day: 78, longitude: 0 },
    { day: 171, longitude: Math.PI / 2 },
    { day: 264, longitude: Math.PI },
    { day: 354, longitude: (Math.PI * 3) / 2 },
    { day: 78 + DAYS_IN_YEAR, longitude: Math.PI * 2 },
  ];

  for (let index = 0; index < anchors.length - 1; index += 1) {
    const start = anchors[index];
    const end = anchors[index + 1];
    if (adjustedDay >= start.day && adjustedDay <= end.day) {
      const progress = (adjustedDay - start.day) / (end.day - start.day);
      return start.longitude + (end.longitude - start.longitude) * progress;
    }
  }

  return 0;
}

export function getSeasonState(
  dayOfYear: number,
  cityId: CityId,
): SeasonState {
  const day = normalizeDay(dayOfYear);
  const city = CITIES[cityId];
  const season = seasonForDay(day);

  // Teaching approximation anchored to the four astronomical season markers.
  const solarLongitude = solarLongitudeForDay(day);
  const tiltRadians = degreesToRadians(AXIAL_TILT_DEGREES);
  const solarDeclination = radiansToDegrees(
    Math.asin(Math.sin(tiltRadians) * Math.sin(solarLongitude)),
  );
  const daylightHours = daylightForLatitude(
    city.latitude,
    solarDeclination,
  );
  const daylight = describeDaylight(daylightHours);

  return {
    dayOfYear: day,
    dateLabel: formatDayOfYear(day),
    season,
    seasonLabel: SEASON_LABELS[season],
    // Earth is opposite the apparent Sun in a heliocentric teaching view.
    orbitAngle: solarLongitude + Math.PI,
    solarLongitude,
    solarDeclination,
    solarNoonAltitude: 90 - Math.abs(city.latitude - solarDeclination),
    daylightHours,
    daylightLabel: daylight.label,
    daylightTrend: daylight.trend,
    axisTilt: AXIAL_TILT_DEGREES,
    city,
    explanation: seasonExplanation(season),
    cityNote: citySeasonNote(cityId, season),
    snowLevel: snowFor(cityId, season),
  };
}

export function formatDaylightHours(hours: number) {
  const totalMinutes = Math.round(hours * 6) * 10;
  const displayHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${displayHours}小时${minutes === 0 ? "" : `${minutes}分`}`;
}
