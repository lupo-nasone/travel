import { GeoPosition, Destination, WeatherData, TravelMode } from "./types";

/**
 * Calculate distance between two points using Haversine formula
 */
export function haversineDistance(
  pos1: GeoPosition,
  pos2: GeoPosition
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(pos2.lat - pos1.lat);
  const dLng = toRad(pos2.lng - pos1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(pos1.lat)) *
      Math.cos(toRad(pos2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Estimate travel time based on distance and mode
 */
export function estimateTravelTime(
  distanceKm: number,
  mode: TravelMode
): string {
  // Average speed assumptions
  const avgSpeed = mode === "biker" ? 50 : 70; // km/h (biker takes scenic routes)
  const hours = distanceKm / avgSpeed;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);

  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/**
 * Check if weather is suitable for the given mode
 */
export function isWeatherSuitable(
  weather: WeatherData,
  mode: TravelMode
): boolean {
  if (mode === "biker") {
    // Stricter criteria for bikers
    if (weather.rain && weather.rainIntensity > 0.5) return false;
    if (weather.windSpeed > 40) return false; // km/h
    if (weather.temp < 5) return false;
    return true;
  }

  // Tourist mode: only avoid heavy rain
  if (weather.rain && weather.rainIntensity > 2) return false;
  return true;
}

/**
 * Build Google Maps navigation URL
 */
export function buildMapsUrl(
  origin: GeoPosition,
  destination: Destination,
  mode: TravelMode
): string {
  const params = new URLSearchParams({
    api: "1",
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    travelmode: "driving",
  });

  // For bikers: avoid tolls and highways
  if (mode === "biker") {
    params.set("avoid", "tolls|highways");
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Filter and score destinations, then pick one using WEIGHTED RANDOM selection.
 * This ensures variety — every valid candidate has a chance, but better ones are more likely.
 */
export function selectDestination(
  destinations: Destination[],
  userPos: GeoPosition,
  radius: number,
  mode: TravelMode,
  weatherMap: Map<string, WeatherData>,
  excludeIds: string[] = []
): {
  destination: Destination;
  distance: number;
  weather: WeatherData | null;
} | null {
  // Filter by distance & weather
  const candidates = destinations
    .filter((d) => !excludeIds.includes(d.id))
    .map((d) => ({
      destination: d,
      distance: haversineDistance(userPos, { lat: d.lat, lng: d.lng }),
      weather: weatherMap.get(d.id) || null,
    }))
    .filter((c) => c.distance <= radius)
    .filter((c) => {
      if (!c.weather) return true;
      return isWeatherSuitable(c.weather, mode);
    });

  if (candidates.length === 0) return null;

  // If only one candidate, return it
  if (candidates.length === 1) return candidates[0];

  // Score each candidate (scores are used as relative WEIGHTS, not absolute ranking)
  const scored = candidates.map((c) => {
    let weight = 10; // base weight so every candidate has a chance

    // Small distance bonus (prefer sweet-spot but not too strongly)
    const idealDistance = radius * 0.5;
    const distanceFit = 1 - Math.abs(c.distance - idealDistance) / radius;
    weight += distanceFit * 10;

    // Weather bonus
    if (c.weather) {
      if (!c.weather.rain) weight += 5;
      if (c.weather.temp >= 12 && c.weather.temp <= 30) weight += 5;
    }

    // Biker specific
    if (mode === "biker") {
      const d = c.destination;
      if (d.roadQuality) weight += d.roadQuality * 2;
      if (d.curvinessRating) weight += d.curvinessRating * 2;
    }

    return { ...c, weight };
  });

  // WEIGHTED RANDOM PICK — every candidate can be selected
  const totalWeight = scored.reduce((sum, c) => sum + c.weight, 0);
  let random = Math.random() * totalWeight;

  for (const candidate of scored) {
    random -= candidate.weight;
    if (random <= 0) return candidate;
  }

  // Fallback (should not reach here)
  return scored[Math.floor(Math.random() * scored.length)];
}
