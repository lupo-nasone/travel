export type TravelMode = "tourist" | "biker";

export interface Destination {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  type: string;
  tags: string[];
  description: string;
  whyGo: string;
  image: string;
  wikiUrl: string;
  altitude?: number;
  roadQuality?: number;
  curvinessRating?: number;
  hiddenGemRating?: number; // 1-5 how hidden the gem is
  aiReview?: string | null; // AI-generated personal review
  source?: "static" | "osm" | "ai"; // where the destination came from
}

export interface DestinationDatabase {
  tourist: Destination[];
  biker: Destination[];
}

export interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  windSpeed: number;
  humidity: number;
  rain: boolean;
  rainIntensity: number;
  code: number;
}

export interface UserPreferences {
  mode: TravelMode;
  radius: number; // in km
}

export interface GeoPosition {
  lat: number;
  lng: number;
}

export interface DestinationResult {
  destination: Destination;
  distance: number;
  weather: WeatherData | null;
  travelTime: string;
  mapsUrl: string;
}
