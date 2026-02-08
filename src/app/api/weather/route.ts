import { NextResponse } from "next/server";

interface WeatherRequest {
  locations: { id: string; lat: number; lng: number }[];
}

export async function POST(request: Request) {
  try {
    const body: WeatherRequest = await request.json();
    const { locations } = body;

    // Use Open-Meteo API (free, no API key required)
    const weatherResults = new Map<string, unknown>();

    // Batch locations (Open-Meteo supports multi-point queries)
    const lats = locations.map((l) => l.lat).join(",");
    const lngs = locations.map((l) => l.lng).join(",");

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,rain,precipitation&timezone=auto`;

    const response = await fetch(url);

    if (!response.ok) {
      // Return empty weather data on API failure (app still works without weather)
      return NextResponse.json({ weather: {} });
    }

    const data = await response.json();

    // Handle both single and multiple locations
    const results = Array.isArray(data) ? data : [data];

    results.forEach((result: Record<string, unknown>, index: number) => {
      if (index < locations.length && result.current) {
        const current = result.current as Record<string, number>;
        const weatherCode = current.weather_code || 0;
        weatherResults.set(locations[index].id, {
          temp: Math.round(current.temperature_2m),
          description: getWeatherDescription(weatherCode),
          icon: getWeatherIcon(weatherCode),
          windSpeed: Math.round(current.wind_speed_10m),
          humidity: current.relative_humidity_2m,
          rain: current.rain > 0 || current.precipitation > 0,
          rainIntensity: current.precipitation || 0,
          code: weatherCode,
        });
      }
    });

    return NextResponse.json({
      weather: Object.fromEntries(weatherResults),
    });
  } catch {
    return NextResponse.json({ weather: {} });
  }
}

function getWeatherDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: "Sereno",
    1: "Prevalentemente sereno",
    2: "Parzialmente nuvoloso",
    3: "Nuvoloso",
    45: "Nebbia",
    48: "Nebbia con brina",
    51: "Pioviggine leggera",
    53: "Pioviggine",
    55: "Pioviggine intensa",
    61: "Pioggia leggera",
    63: "Pioggia moderata",
    65: "Pioggia forte",
    71: "Neve leggera",
    73: "Neve moderata",
    75: "Neve forte",
    80: "Rovesci leggeri",
    81: "Rovesci moderati",
    82: "Rovesci violenti",
    95: "Temporale",
    96: "Temporale con grandine leggera",
    99: "Temporale con grandine forte",
  };
  return descriptions[code] || "N/D";
}

function getWeatherIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "⛅";
  if (code === 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 55) return "🌦️";
  if (code <= 65) return "🌧️";
  if (code <= 75) return "🌨️";
  if (code <= 82) return "🌧️";
  if (code >= 95) return "⛈️";
  return "🌤️";
}
