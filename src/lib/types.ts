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
export type TouristBudget = "economico" | "medio" | "comfort" | "lusso";
export type TouristInterest = "natura" | "cultura" | "cibo" | "avventura" | "relax" | "nightlife" | "shopping" | "sport" | "fotografia" | "arte";
export type TouristPace = "rilassato" | "moderato" | "intenso";
export type TouristStyle = "culturale" | "avventuroso" | "romantico" | "gourmet" | "sportivo" | "spirituale";

export interface TouristPreferences {
  transport: TouristTransport;
  accommodation: TouristAccommodation;
  budget: TouristBudget;
  interests: TouristInterest[]; // multi-select: what they want to do
  pace: TouristPace; // how packed the day should be
  travelStyle?: TouristStyle; // optional vibe
  tripDays: number; // 1 = giornata, 2-3 = weekend, 4+ = vacanza
  targetDate: string; // ISO date
  travelMonth?: string; // e.g. "2026-03" — used when transport is treno/aereo/traghetto for flexible booking
  departurePoint?: string; // airport/station/port name e.g. "Firenze SMN", "Pisa (PSA)", "Livorno"
  groupSize: "solo" | "coppia" | "famiglia" | "gruppo";
  freeText?: string; // "vorrei fare..." free-form user input
}

export type BikerExperience = "principiante" | "intermedio" | "esperto";
export type BikerRoadType = "tornanti" | "sterrato" | "costiera" | "montagna" | "collina" | "pianura";

export interface BikerPreferences {
  intent: BikerIntent;
  experience: BikerExperience;
  roadTypes: BikerRoadType[]; // multi-select: what kind of roads
  targetDate: string; // ISO date string e.g. "2026-02-14"
  targetTime: string; // HH:mm e.g. "10:00"
  preferScenic: boolean; // prefer scenic roads vs fastest
  avoidHighways: boolean; // avoid highways/toll roads
  groupSize: "solo" | "coppia" | "gruppo"; // solo, couple, group
  freeText?: string; // "vorrei fare..." free-form user input
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
  freeText?: string; // "vorrei fare..." free-form user input
}

export interface CostBreakdown {
  carburante?: { descrizione: string; costo: number }; // fuel cost based on vehicle + distance
  trasporto?: { descrizione: string; costo: number }; // train/plane/ferry tickets
  alloggio?: { descrizione: string; costo: number }; // per-night accommodation
  cibo?: { descrizione: string; costo: number }; // food & drink estimate
  pedaggi?: { descrizione: string; costo: number }; // highway tolls
  attivita?: { descrizione: string; costo: number }; // tickets, activities
  altro?: { descrizione: string; costo: number }; // other costs
  totale: number; // total estimated cost
  nota?: string; // additional note (e.g. "per persona", "per coppia")
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
  costBreakdown?: CostBreakdown; // itemized cost breakdown
  transportInfo?: {
    tipo: "treno" | "aereo" | "traghetto";
    andata: {
      compagnia: string;       // e.g. "Trenitalia Frecciarossa", "Ryanair", "Tirrenia"
      partenza: string;        // station/airport name
      arrivo: string;          // station/airport name
      orario: string;          // e.g. "08:30 - 11:45"
      durata: string;          // e.g. "3h 15min"
      prezzo: string;          // e.g. "€29-45"
      note?: string;           // e.g. "cambio a Bologna"
    };
    ritorno?: {
      compagnia: string;
      partenza: string;
      arrivo: string;
      orario: string;
      durata: string;
      prezzo: string;
      note?: string;
    };
    consigli?: string;         // e.g. "Prenota su trenitalia.it con 2 settimane di anticipo"
    linkPrenotazione?: string; // booking URL
  };
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

// ── Itinerario completo giorno per giorno ──

export type ActivityType = "viaggio" | "visita" | "cibo" | "relax" | "avventura" | "shopping" | "trasporto" | "check-in" | "check-out" | "tempo_libero";

export interface ItineraryActivity {
  orario: string;        // e.g. "09:00 - 10:30"
  attivita: string;      // e.g. "Visita al Castello Aragonese"
  descrizione: string;   // what to do, tips
  luogo?: string;        // specific place name
  costo?: string;        // e.g. "€10 a persona" or "Gratis"
  link?: string;         // URL: sito ufficiale, Google Maps, prenotazione, ecc.
  linkLabel?: string;    // e.g. "Sito ufficiale", "Prenota", "Vedi su Maps"
  tipo: ActivityType;
}

// ── Espansione attività / dettagli ──

export interface ExpandedActivity extends ItineraryActivity {
  accepted?: boolean;    // user accepted this sub-activity
}

export interface ActivityExpansion {
  originalActivity: string;    // name of the original activity being expanded
  subActivities: ExpandedActivity[];  // 3-4 detailed sub-activities
}

// ── Eventi locali ──

export interface LocalEvent {
  nome: string;           // event name
  descrizione: string;    // what it is
  data: string;           // date/period
  luogo: string;          // where
  orario?: string;        // time
  costo?: string;         // cost
  tipo: "festival" | "mercato" | "concerto" | "sagra" | "mostra" | "sport" | "teatro" | "fiera" | "altro";
  link?: string;          // search link
}

export interface ItineraryDay {
  giorno: number;        // 1, 2, 3...
  titolo: string;        // e.g. "Arrivo e primo giro"
  data?: string;         // e.g. "Sabato 14 Febbraio"
  attivita: ItineraryActivity[];
  consiglioGiorno?: string; // daily tip
}

export interface FullItinerary {
  riepilogo: string;       // short summary of the whole trip
  giorni: ItineraryDay[];
  viaggioAndata?: {
    partenza: string;      // departure time
    mezzo: string;         // transport description
    arrivo: string;        // arrival time
    note?: string;
  };
  viaggioRitorno?: {
    partenza: string;
    mezzo: string;
    arrivo: string;
    note?: string;
  };
  cosaDaPortare?: string[];  // packing list
  consigliGenerali?: string; // general tips
}

// ── Viaggio salvato (Supabase) ──

export interface SavedTrip {
  id: string;                // uuid from Supabase
  user_id: string;           // auth user id
  created_at: string;        // ISO timestamp
  destination_name: string;
  destination_region: string;
  destination_image: string;
  destination_lat: number;
  destination_lng: number;
  mode: TravelMode;
  distance: number;
  trip_days: number;
  destination_data: Destination;    // full destination JSON
  itinerary_data: FullItinerary;   // full itinerary JSON
  result_data: {                   // minimal result info
    travelTime: string;
    mapsUrl: string;
  };
}
