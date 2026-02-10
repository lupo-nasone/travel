// ── Sistema Achievement — 50 badge con 5 livelli di rarità ──

export type AchievementRarity = "comune" | "non_comune" | "raro" | "epico" | "leggendario";

export type AchievementCategory =
  | "esplorazione"    // related to discovering places
  | "viaggio"         // related to travel modes/distances
  | "pianificazione"  // related to itineraries/saving
  | "sociale"         // related to account/community
  | "sfida"           // challenge-based
  | "segreto";        // hidden achievements

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  category: AchievementCategory;
  condition: string; // human-readable unlock condition
  secret?: boolean;  // hidden until unlocked
}

export const RARITY_CONFIG: Record<AchievementRarity, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  textColor: string;
}> = {
  comune: {
    label: "Comune",
    color: "from-zinc-400 to-zinc-500",
    bgColor: "bg-zinc-500/10",
    borderColor: "border-zinc-500/30",
    glowColor: "shadow-zinc-500/20",
    textColor: "text-zinc-300",
  },
  non_comune: {
    label: "Non Comune",
    color: "from-emerald-400 to-green-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    glowColor: "shadow-emerald-500/20",
    textColor: "text-emerald-300",
  },
  raro: {
    label: "Raro",
    color: "from-blue-400 to-cyan-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    glowColor: "shadow-blue-500/20",
    textColor: "text-blue-300",
  },
  epico: {
    label: "Epico",
    color: "from-purple-400 to-violet-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    glowColor: "shadow-purple-500/30",
    textColor: "text-purple-300",
  },
  leggendario: {
    label: "Leggendario",
    color: "from-amber-400 via-orange-500 to-red-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    glowColor: "shadow-amber-500/40",
    textColor: "text-amber-300",
  },
};

export const ACHIEVEMENTS: Achievement[] = [
  // ═══════════════════════════════════════════
  // 🔘 COMUNI (15) — Facili da ottenere
  // ═══════════════════════════════════════════
  {
    id: "first_spin",
    name: "Prima Roulette",
    description: "Hai premuto il tasto per la prima volta. L'avventura inizia qui!",
    icon: "🎰",
    rarity: "comune",
    category: "esplorazione",
    condition: "Genera la tua prima destinazione",
  },
  {
    id: "first_itinerary",
    name: "Pianificatore Novizio",
    description: "Il tuo primo itinerario è stato generato. Ora hai un piano!",
    icon: "📋",
    rarity: "comune",
    category: "pianificazione",
    condition: "Genera il tuo primo itinerario",
  },
  {
    id: "first_save",
    name: "Collezionista",
    description: "Hai salvato il tuo primo viaggio. I ricordi iniziano così.",
    icon: "💾",
    rarity: "comune",
    category: "pianificazione",
    condition: "Salva il tuo primo viaggio",
  },
  {
    id: "account_created",
    name: "Benvenuto a Bordo",
    description: "Ti sei registrato su WayPoint Roulette. Benvenuto!",
    icon: "👋",
    rarity: "comune",
    category: "sociale",
    condition: "Crea un account",
  },
  {
    id: "tourist_mode",
    name: "Turista Classico",
    description: "Hai usato la modalità Turista per la prima volta.",
    icon: "🧳",
    rarity: "comune",
    category: "viaggio",
    condition: "Genera una destinazione in modalità Turista",
  },
  {
    id: "biker_mode",
    name: "Su Due Ruote",
    description: "Hai usato la modalità Biker per la prima volta. Vroom!",
    icon: "🏍️",
    rarity: "comune",
    category: "viaggio",
    condition: "Genera una destinazione in modalità Biker",
  },
  {
    id: "spin_5",
    name: "Dito Caldo",
    description: "5 destinazioni generate. Stai prendendo gusto!",
    icon: "🔥",
    rarity: "comune",
    category: "esplorazione",
    condition: "Genera 5 destinazioni",
  },
  {
    id: "abroad_first",
    name: "Senza Confini",
    description: "Hai attivato la modalità estero per la prima volta.",
    icon: "✈️",
    rarity: "comune",
    category: "viaggio",
    condition: "Attiva il toggle 'Anche estero'",
  },
  {
    id: "short_trip",
    name: "Gita Fuoriporta",
    description: "Destinazione a meno di 50 km. A volte basta poco!",
    icon: "🚶",
    rarity: "comune",
    category: "viaggio",
    condition: "Trova una destinazione entro 50 km",
  },
  {
    id: "weekend_planner",
    name: "Weekend Planner",
    description: "Hai pianificato un viaggio di 2-3 giorni.",
    icon: "📅",
    rarity: "comune",
    category: "pianificazione",
    condition: "Genera un itinerario di 2 o 3 giorni",
  },
  {
    id: "foodie_interest",
    name: "Buona Forchetta",
    description: "Hai selezionato 'Cibo' tra i tuoi interessi.",
    icon: "🍝",
    rarity: "comune",
    category: "esplorazione",
    condition: "Seleziona l'interesse 'Cibo'",
  },
  {
    id: "nature_lover",
    name: "Amante della Natura",
    description: "Hai selezionato 'Natura' tra i tuoi interessi.",
    icon: "🌿",
    rarity: "comune",
    category: "esplorazione",
    condition: "Seleziona l'interesse 'Natura'",
  },
  {
    id: "culture_vulture",
    name: "Topo di Museo",
    description: "Hai selezionato 'Cultura' tra i tuoi interessi.",
    icon: "🏛️",
    rarity: "comune",
    category: "esplorazione",
    condition: "Seleziona l'interesse 'Cultura'",
  },
  {
    id: "solo_traveler",
    name: "Lupo Solitario",
    description: "Viaggiare da soli è un'arte. Tu la padroneggi.",
    icon: "🐺",
    rarity: "comune",
    category: "viaggio",
    condition: "Genera una destinazione con gruppo 'Solo'",
  },
  {
    id: "train_traveler",
    name: "Pendolare d'Elite",
    description: "Hai scelto il treno come mezzo di trasporto.",
    icon: "🚆",
    rarity: "comune",
    category: "viaggio",
    condition: "Seleziona il trasporto 'Treno'",
  },

  // ═══════════════════════════════════════════
  // 🟢 NON COMUNI (12) — Richiedono un po' di impegno
  // ═══════════════════════════════════════════
  {
    id: "spin_15",
    name: "Esploratore Seriale",
    description: "15 destinazioni generate! Conosci più posti del tuo navigatore.",
    icon: "🧭",
    rarity: "non_comune",
    category: "esplorazione",
    condition: "Genera 15 destinazioni",
  },
  {
    id: "save_5",
    name: "Album dei Ricordi",
    description: "5 viaggi salvati. La tua collezione cresce!",
    icon: "📸",
    rarity: "non_comune",
    category: "pianificazione",
    condition: "Salva 5 viaggi",
  },
  {
    id: "long_distance",
    name: "Maratoneta",
    description: "Una destinazione a più di 300 km. Che determinazione!",
    icon: "🏃",
    rarity: "non_comune",
    category: "viaggio",
    condition: "Trova una destinazione a più di 300 km",
  },
  {
    id: "extreme_first",
    name: "Adrenalina Pura",
    description: "Hai provato la Modalità Estrema. Vivi pericolosamente!",
    icon: "🔥",
    rarity: "non_comune",
    category: "sfida",
    condition: "Usa la Modalità Estrema per la prima volta",
  },
  {
    id: "multi_mode",
    name: "Versatile",
    description: "Hai generato destinazioni sia in Turista che in Biker.",
    icon: "🔄",
    rarity: "non_comune",
    category: "viaggio",
    condition: "Usa entrambe le modalità Turista e Biker",
  },
  {
    id: "budget_traveler",
    name: "Budget Traveler",
    description: "Hai pianificato con budget 'Economico'. L'avventura non ha prezzo!",
    icon: "💰",
    rarity: "non_comune",
    category: "pianificazione",
    condition: "Genera un viaggio con budget economico",
  },
  {
    id: "luxury_traveler",
    name: "Vita da Nabobbo",
    description: "Budget Lusso selezionato. Solo il meglio per te!",
    icon: "💎",
    rarity: "non_comune",
    category: "pianificazione",
    condition: "Genera un viaggio con budget lusso",
  },
  {
    id: "week_trip",
    name: "Vacanziere Serio",
    description: "Un itinerario di 7+ giorni. Questa è una vera vacanza!",
    icon: "🏖️",
    rarity: "non_comune",
    category: "pianificazione",
    condition: "Genera un itinerario di almeno 7 giorni",
  },
  {
    id: "five_interests",
    name: "Eclettico",
    description: "Hai selezionato almeno 5 interessi diversi. Non ti accontenti!",
    icon: "🎯",
    rarity: "non_comune",
    category: "esplorazione",
    condition: "Seleziona 5+ interessi contemporaneamente",
  },
  {
    id: "couple_trip",
    name: "Romanticone",
    description: "Viaggio in coppia pianificato. L'amore è nell'aria!",
    icon: "💑",
    rarity: "non_comune",
    category: "viaggio",
    condition: "Genera un viaggio con gruppo 'Coppia'",
  },
  {
    id: "group_trip",
    name: "Capogruppo",
    description: "Viaggio di gruppo organizzato. Sei il leader nato!",
    icon: "👥",
    rarity: "non_comune",
    category: "viaggio",
    condition: "Genera un viaggio con gruppo 'Gruppo'",
  },
  {
    id: "plane_traveler",
    name: "Frequent Flyer",
    description: "Hai scelto l'aereo. Il cielo non è il limite!",
    icon: "✈️",
    rarity: "non_comune",
    category: "viaggio",
    condition: "Seleziona il trasporto 'Aereo'",
  },

  // ═══════════════════════════════════════════
  // 🔵 RARI (10) — Servono dedizione
  // ═══════════════════════════════════════════
  {
    id: "spin_30",
    name: "Cartografo",
    description: "30 destinazioni! Potresti disegnare una mappa a memoria.",
    icon: "🗺️",
    rarity: "raro",
    category: "esplorazione",
    condition: "Genera 30 destinazioni",
  },
  {
    id: "save_10",
    name: "Archivista di Viaggi",
    description: "10 viaggi salvati. Hai un portfolio invidiabile!",
    icon: "📚",
    rarity: "raro",
    category: "pianificazione",
    condition: "Salva 10 viaggi",
  },
  {
    id: "ultra_distance",
    name: "Oltre l'Orizzonte",
    description: "Destinazione a più di 1000 km. Sei un vero globetrotter!",
    icon: "🌍",
    rarity: "raro",
    category: "viaggio",
    condition: "Trova una destinazione a più di 1000 km",
  },
  {
    id: "all_transports",
    name: "Multimodale",
    description: "Hai usato tutti i mezzi di trasporto turistici.",
    icon: "🚀",
    rarity: "raro",
    category: "viaggio",
    condition: "Usa auto, treno, aereo e traghetto",
  },
  {
    id: "night_explorer",
    name: "Esploratore Notturno",
    description: "Hai generato una destinazione dopo mezzanotte. Chi dorme non piglia pesci!",
    icon: "🌙",
    rarity: "raro",
    category: "sfida",
    condition: "Genera una destinazione tra mezzanotte e le 5",
  },
  {
    id: "all_interests",
    name: "Rinascimentale",
    description: "Hai selezionato tutti gli interessi disponibili. Vuoi tutto!",
    icon: "🎨",
    rarity: "raro",
    category: "esplorazione",
    condition: "Seleziona tutti e 10 gli interessi",
  },
  {
    id: "extreme_3",
    name: "Temerario",
    description: "3 avventure estreme generate. Non hai paura di niente!",
    icon: "⚡",
    rarity: "raro",
    category: "sfida",
    condition: "Usa la Modalità Estrema 3 volte",
  },
  {
    id: "biker_expert",
    name: "Centauro",
    description: "10 destinazioni biker generate. La strada è la tua casa!",
    icon: "🏍️",
    rarity: "raro",
    category: "viaggio",
    condition: "Genera 10 destinazioni in modalità Biker",
  },
  {
    id: "long_itinerary",
    name: "Epopea",
    description: "Un itinerario di 10+ giorni. Questa è un'odissea!",
    icon: "⚓",
    rarity: "raro",
    category: "pianificazione",
    condition: "Genera un itinerario di almeno 10 giorni",
  },
  {
    id: "ferry_traveler",
    name: "Lupo di Mare",
    description: "Hai scelto il traghetto. La brezza del mare ti chiama!",
    icon: "⛴️",
    rarity: "raro",
    category: "viaggio",
    condition: "Seleziona il trasporto 'Traghetto'",
  },

  // ═══════════════════════════════════════════
  // 🟣 EPICI (8) — Solo per i più dedicati
  // ═══════════════════════════════════════════
  {
    id: "spin_50",
    name: "Instancabile",
    description: "50 destinazioni! Niente ti ferma. Sei una forza della natura.",
    icon: "🌪️",
    rarity: "epico",
    category: "esplorazione",
    condition: "Genera 50 destinazioni",
  },
  {
    id: "save_20",
    name: "Enciclopedia Vivente",
    description: "20 viaggi salvati. Potresti scrivere una guida turistica!",
    icon: "📖",
    rarity: "epico",
    category: "pianificazione",
    condition: "Salva 20 viaggi",
  },
  {
    id: "extreme_10",
    name: "Senza Paura",
    description: "10 avventure estreme. La tua assicurazione ti odia.",
    icon: "💀",
    rarity: "epico",
    category: "sfida",
    condition: "Usa la Modalità Estrema 10 volte",
  },
  {
    id: "mega_distance",
    name: "Attraversa-Continenti",
    description: "Destinazione a più di 3000 km. Stai quasi facendo il giro del mondo!",
    icon: "🛸",
    rarity: "epico",
    category: "viaggio",
    condition: "Trova una destinazione a più di 3000 km",
  },
  {
    id: "biker_20",
    name: "Road King",
    description: "20 destinazioni biker. Le curve non hanno più segreti per te.",
    icon: "👑",
    rarity: "epico",
    category: "viaggio",
    condition: "Genera 20 destinazioni in modalità Biker",
  },
  {
    id: "tourist_20",
    name: "Ambasciatore del Turismo",
    description: "20 destinazioni turistiche. Sei praticamente un'agenzia viaggi!",
    icon: "🏆",
    rarity: "epico",
    category: "viaggio",
    condition: "Genera 20 destinazioni in modalità Turista",
  },
  {
    id: "all_budgets",
    name: "Da Zero a Mille",
    description: "Hai provato tutti i livelli di budget. Sai adattarti!",
    icon: "📊",
    rarity: "epico",
    category: "pianificazione",
    condition: "Usa tutti i livelli di budget (economico, medio, comfort, lusso)",
  },
  {
    id: "early_bird",
    name: "Early Bird",
    description: "Hai generato una destinazione alle 6 di mattina. Chi si alza presto...",
    icon: "🐓",
    rarity: "epico",
    category: "sfida",
    condition: "Genera una destinazione tra le 5:00 e le 6:30",
  },

  // ═══════════════════════════════════════════
  // 🟡 LEGGENDARI (5) — Quasi impossibili
  // ═══════════════════════════════════════════
  {
    id: "spin_100",
    name: "Leggenda Vivente",
    description: "100 destinazioni. Sei la persona più avventurosa del pianeta.",
    icon: "⭐",
    rarity: "leggendario",
    category: "esplorazione",
    condition: "Genera 100 destinazioni",
  },
  {
    id: "save_50",
    name: "Biblioteca di Alessandria",
    description: "50 viaggi salvati. La tua collezione è patrimonio dell'umanità.",
    icon: "🏛️",
    rarity: "leggendario",
    category: "pianificazione",
    condition: "Salva 50 viaggi",
  },
  {
    id: "completionist",
    name: "Completista Supremo",
    description: "Hai sbloccato 40 achievement. Sei praticamente un dio dei viaggi.",
    icon: "🌟",
    rarity: "leggendario",
    category: "sfida",
    condition: "Sblocca almeno 40 achievement",
  },
  {
    id: "extreme_master",
    name: "Maestro dell'Estremo",
    description: "25 avventure estreme. Dovresti avere un reality show tutto tuo.",
    icon: "🔱",
    rarity: "leggendario",
    category: "sfida",
    condition: "Usa la Modalità Estrema 25 volte",
  },
  {
    id: "secret_wanderer",
    name: "Il Viandante",
    description: "Hai scoperto questo achievement segreto. Sei un vero esploratore dell'ignoto.",
    icon: "🗝️",
    rarity: "leggendario",
    category: "segreto",
    condition: "Genera 10 destinazioni in giorni diversi",
    secret: true,
  },
];

// Helpers
export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

export function getAchievementsByRarity(rarity: AchievementRarity): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.rarity === rarity);
}

export function getAchievementsByCategory(category: AchievementCategory): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.category === category);
}
