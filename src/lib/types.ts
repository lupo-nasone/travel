export type TravelMode = "tourist" | "biker";

export type BikerIntent =
  | "aperitivo"
  | "pranzo"
  | "panorama"
  | "curve"
  | "tramonto"
  | "giornata_intera";

export type TouristTransport = "auto" | "treno" | "aereo" | "traghetto";
export type TouristAccommodation = "hotel_lusso" | "bnb" | "campeggio" | "arrangiarsi";

export interface TouristPreferences {
  transport: TouristTransport;
  accommodation: TouristAccommodation;
  allowAbroad: boolean;
  tripDays: number; // 1 = giornata, 2-3 = weekend, 4+ = vacanza
  targetDate: string; // ISO date
  groupSize: "solo" | "coppia" | "famiglia" | "gruppo";
}

export interface BikerPreferences {
  intent: BikerIntent;
  targetDate: string; // ISO date string e.g. "2026-02-14"
  targetTime: string; // HH:mm e.g. "10:00"
  preferScenic: boolean; // prefer scenic roads vs fastest
  avoidHighways: boolean; // avoid highways/toll roads
  groupSize: "solo" | "coppia" | "gruppo"; // solo, couple, group
}

// ── Extreme Mode ──
export type ExtremeTransport = "auto" | "moto" | "treno" | "aereo" | "autostop" | "bici" | "piedi" | "traghetto" | "qualsiasi";
export type ExtremeBudget = "zero" | "50" | "100" | "200" | "500" | "1000" | "illimitato";
export type ExtremeAccommodation = "tenda" | "sacco_a_pelo" | "ostello" | "hotel" | "bivacco" | "macchina" | "qualsiasi";
export type ExtremeRiskLevel = "soft" | "medio" | "hardcore" | "suicida";

export interface ExtremePreferences {
  // OBBLIGATORI
  transport: ExtremeTransport;
  budget: ExtremeBudget;
  // OPZIONALI — se non selezionati, AI dà roba generica
  accommodation?: ExtremeAccommodation;
  duration?: number; // giorni (1-30)
  companions?: "solo" | "coppia" | "gruppo" | "chiunque";
  riskLevel?: ExtremeRiskLevel;
  allowAbroad?: boolean;
  targetDate?: string;
}

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
  roads?: {
    name: string | null;
    osm_way_id?: number;
    surface?: string | null;
    verification_url?: string;
  }[];
  directions?: string; // brief driving directions for bikers
  sunsetTime?: string; // e.g. "17:42"
  sunriseTime?: string; // e.g. "07:15"
  nearbyPlaces?: {
    name: string;
    type: "ristorante" | "bar" | "trattoria" | "agriturismo" | "rifugio" | "gelateria" | "altro";
    description: string;
  }[];
  aiPlan?: string; // detailed AI explanation: what to do, when, how
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
  sunsetTime?: string;
  sunriseTime?: string;
}
