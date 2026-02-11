import { NextResponse } from "next/server";

interface AiSuggestRequest {
  lat: number;
  lng: number;
  minRadius: number;
  maxRadius: number;
  allowAbroad?: boolean;
  mode: "tourist" | "biker";
  excludeNames: string[];
  extreme?: boolean;
  extremePrefs?: {
    transport: string;
    budget: string;
    accommodation?: string;
    duration?: number;
    companions?: string;
    riskLevel?: string;
    allowAbroad?: boolean;
    targetDate?: string;
    freeText?: string;
  };
  bikerPrefs?: {
    intent: string;
    experience?: string;
    roadTypes?: string[];
    targetDate: string;
    targetTime: string;
    preferScenic: boolean;
    avoidHighways: boolean;
    groupSize: "solo" | "coppia" | "gruppo";
    freeText?: string;
  };
  touristPrefs?: {
    transport: "auto" | "treno" | "aereo" | "traghetto";
    accommodation: "hotel_lusso" | "bnb" | "campeggio" | "arrangiarsi";
    budget: "economico" | "medio" | "comfort" | "lusso";
    interests?: string[];
    pace?: string;
    travelStyle?: string;
    tripDays: number;
    targetDate: string;
    travelMonth?: string;
    departurePoint?: string;
    groupSize: "solo" | "coppia" | "famiglia" | "gruppo";
    freeText?: string;
  };
}

function calcSunTimes(lat: number, lng: number, dateStr?: string) {
  const date = dateStr ? new Date(dateStr) : new Date();
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const zenith = 90.833;
  const D2R = Math.PI / 180;
  const R2D = 180 / Math.PI;
  const lngHour = lng / 15;

  const calc = (baseHour: number, isSunrise: boolean) => {
    const t = dayOfYear + (baseHour - lngHour) / 24;
    const m = 0.9856 * t - 3.289;
    let l = m + 1.916 * Math.sin(m * D2R) + 0.02 * Math.sin(2 * m * D2R) + 282.634;
    l = ((l % 360) + 360) % 360;
    let ra = R2D * Math.atan(0.91764 * Math.tan(l * D2R));
    ra = ((ra % 360) + 360) % 360;
    ra += Math.floor(l / 90) * 90 - Math.floor(ra / 90) * 90;
    ra /= 15;
    const sinDec = 0.39782 * Math.sin(l * D2R);
    const cosDec = Math.cos(Math.asin(sinDec));
    const cosH =
      (Math.cos(zenith * D2R) - sinDec * Math.sin(lat * D2R)) /
      (cosDec * Math.cos(lat * D2R));
    const h = isSunrise ? 360 - R2D * Math.acos(cosH) : R2D * Math.acos(cosH);
    return (h / 15 + ra - 0.06571 * t - 6.622 + 24) % 24;
  };

  const tzOffset = Math.round(lng / 15);
  const rise = (calc(6, true) + tzOffset + 24) % 24;
  const set = (calc(18, false) + tzOffset + 24) % 24;

  const fmt = (h: number) => {
    const hours = Math.floor(h);
    const mins = Math.round((h - hours) * 60);
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  };

  return { sunrise: fmt(rise), sunset: fmt(set) };
}

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "GROQ_API_KEY non configurata. Vai su console.groq.com per ottenere una chiave gratuita.",
      },
      { status: 500 }
    );
  }

  try {
    const body: AiSuggestRequest = await request.json();
    const { lat, lng, minRadius, maxRadius, mode, bikerPrefs, touristPrefs, extremePrefs } = body;
    const excludeNames = body.excludeNames || [];
    const isExtreme = body.extreme === true;
    const allowAbroad = body.allowAbroad === true;

    const excludeList =
      excludeNames.length > 0
        ? `\n\nNON suggerire questi posti già visti dall'utente: ${excludeNames.join(", ")}.`
        : "";

    let prompt: string;

    if (isExtreme) {
      // ═══════════════════════════════════════════════
      // ═══ MODALITÀ ESTREMA — prompt completamente diverso ═══
      // ═══════════════════════════════════════════════

      // Build context from extreme preferences
      const transportLabels: Record<string, string> = {
        auto: "in auto/macchina",
        moto: "in moto",
        treno: "in treno",
        aereo: "in aereo",
        traghetto: "in traghetto/nave",
        bici: "in bicicletta",
        autostop: "facendo autostop",
        piedi: "a piedi",
        qualsiasi: "con qualsiasi mezzo",
      };
      const budgetLabels: Record<string, string> = {
        zero: "ZERO EURO — completamente gratis, niente spese",
        "50": "massimo circa 50 euro totali",
        "100": "massimo circa 100 euro totali",
        "200": "massimo circa 200 euro totali",
        "500": "massimo circa 500 euro totali",
        "1000": "massimo circa 1000 euro totali",
        illimitato: "budget illimitato, può spendere quanto vuole",
      };

      // Mandatory context
      const ep = extremePrefs || { transport: "qualsiasi", budget: "100" };
      let extremeContext = `
VINCOLI OBBLIGATORI (l'avventura DEVE rispettare questi):
- MEZZO DI TRASPORTO: ${transportLabels[ep.transport] || "qualsiasi mezzo"}
- BUDGET: ${budgetLabels[ep.budget] || "circa 100 euro"}`;

      // Optional context
      if (ep.accommodation) {
        const accomLabels: Record<string, string> = {
          tenda: "dormire in tenda",
          sacco_a_pelo: "dormire nel sacco a pelo all'aperto",
          bivacco: "dormire in un bivacco di montagna",
          macchina: "dormire in macchina",
          ostello: "dormire in ostello",
          hotel: "dormire in hotel",
          qualsiasi: "dormire dove capita",
        };
        extremeContext += `\n- ALLOGGIO: ${accomLabels[ep.accommodation] || "dove capita"}`;
      }

      if (ep.duration) {
        extremeContext += `\n- DURATA: ${ep.duration} giorn${ep.duration === 1 ? "o" : "i"}`;
      }

      if (ep.companions) {
        const compLabels: Record<string, string> = {
          solo: "viaggia DA SOLO",
          coppia: "viaggia IN COPPIA",
          gruppo: "viaggia IN GRUPPO (amici)",
          chiunque: "aperto a conoscere gente lungo la strada",
        };
        extremeContext += `\n- COMPAGNIA: ${compLabels[ep.companions] || "da solo"}`;
      }

      if (ep.riskLevel) {
        const riskLabels: Record<string, string> = {
          soft: "livello SOFT — folle ma tranquillo, niente di troppo estremo",
          medio: "livello MEDIO — ci vuole coraggio ma è fattibile",
          hardcore: "livello HARDCORE — roba da pazzi veri, sfide fisiche incluse",
          suicida: "livello FOLLE TOTALE — la cosa più assurda legalmente fattibile che ti viene in mente",
        };
        extremeContext += `\n- LIVELLO FOLLIA: ${riskLabels[ep.riskLevel]}`;
      }

      if (ep.allowAbroad) {
        extremeContext += "\n- PUÒ ANDARE ALL'ESTERO — suggerisci anche mete fuori dall'Italia!";
      } else if (ep.allowAbroad === false) {
        extremeContext += "\n- DEVE RESTARE IN ITALIA — non suggerire mete all'estero.";
      }

      if (ep.targetDate) {
        extremeContext += `\n- DATA PARTENZA: ${ep.targetDate}`;
      }

      if (ep.freeText && ep.freeText.trim()) {
        extremeContext += `\n\n═══════════════════════════════════════════════════════════════
RICHIESTA DELL'UTENTE — PRIORITÀ MASSIMA ASSOLUTA:
"${ep.freeText.trim()}"
═══════════════════════════════════════════════════════════════
Questa è LA RICHIESTA PRINCIPALE. L'avventura DEVE corrispondere a quello che ha chiesto.
Analizza la richiesta parola per parola e crea un'avventura che soddisfi ESATTAMENTE ciò che l'utente vuole.
Se chiede qualcosa di specifico (es: "dormire in un faro", "fare bungee jumping") → trova ESATTAMENTE quello.
NON ignorare nessun dettaglio della richiesta. Questa ha priorità su TUTTO il resto.`;
      }

      prompt = `Sei un pazzo avventuriero italiano senza limiti. L'utente si trova a (${lat}, ${lng}) e vuole fare qualcosa di ESTREMO, ASSURDO, FOLLE ma fattibile nella realtà.
${extremeContext}

Genera un'avventura ESTREMA che rispetti i vincoli dell'utente. L'avventura deve essere calibrata sul mezzo di trasporto e sul budget scelti. Esempi del tipo di follia che cerchiamo:
- Dormire in tenda nel Principato di Monaco per 2 notti
- Andare a mangiare kebab a Istanbul partendo in macchina
- Fare autostop fino a Capo Nord e dormire in sacco a pelo
- Prendere un traghetto per la Sardegna e dormire in spiaggia
- Andare a fare colazione a Parigi e tornare in giornata col Frecciarossa
- Campeggiare sul bordo di un vulcano attivo in Sicilia
- Dormire in un rifugio a 3000m in pieno inverno
- Raggiungere il punto più a sud d'Europa in motorino
- Attraversare le Alpi a piedi in 3 giorni dormendo nei bivacchi
- Dormire in una grotta in Puglia come un troglodita
- Fare il giro della Sicilia in 24 ore senza mai fermarsi
- Partire a mezzanotte per vedere l'alba dalla vetta più alta raggiungibile

REGOLE:
- L'avventura DEVE rispettare il mezzo di trasporto e il budget scelti dall'utente
- L'avventura deve essere REALE e FATTIBILE (non illegale, non mortale)
- Il posto deve ESISTERE davvero con coordinate REALI
- Deve essere qualcosa che fa dire "sei pazzo!" ma poi "aspetta... si può fare!"
- Deve essere DIVERTENTE da raccontare agli amici
- Sii CREATIVO e IMPREVEDIBILE — niente roba noiosa
- Il piano deve essere dettagliato e pratico nonostante la follia
- Includi costi approssimativi REALISTICI e logistica reale
- I costi devono rientrare nel budget indicato dall'utente
${excludeList}

Rispondi SOLO con JSON valido:
{
  "name": "Nome breve dell'avventura (es: 'Tenda a Montecarlo')",
  "region": "Regione/Paese",
  "lat": 00.0000,
  "lng": 00.0000,
  "type": "avventura_estrema",
  "tags": ["estremo", "tag2", "tag3"],
  "description": "Descrizione folle ma entusiasmante di 2-3 frasi. Deve far ridere e venire voglia di farlo.",
  "whyGo": "Frase breve e d'impatto, tipo 'Perché la vita è troppo corta per essere normali'",
  "altitude": null,
  "roadQuality": null,
  "curvinessRating": null,
  "hiddenGemRating": 5,
  "aiReview": "Recensione in prima persona folle, tipo 'L'ho fatto e i carabinieri mi hanno guardato malissimo. 10/10 lo rifarei.'",
  "nearbyPlaces": [{"name": "Posto reale vicino", "type": "bar", "description": "Dove festeggiare dopo l'impresa"}],
  "aiPlan": "Piano DETTAGLIATO e PRATICO dell'avventura estrema: orari, mezzi, cosa portare, dove dormire, costi stimati (che rispettano il budget), consigli di sopravvivenza. Scrivi come un amico pazzo.",
  "directions": "Come arrivarci partendo dalla posizione dell'utente con il mezzo scelto",
  "costBreakdown": {
    "carburante": {"descrizione": "Calcolo carburante A/R con consumo veicolo", "costo": 00.00},
    "trasporto": {"descrizione": "Biglietti trasporto se applicabile", "costo": 00.00},
    "alloggio": {"descrizione": "Dove si dorme e quanto costa", "costo": 00.00},
    "cibo": {"descrizione": "Stima pasti per la durata", "costo": 00.00},
    "attivita": {"descrizione": "Costi attività/esperienze", "costo": 00.00},
    "altro": {"descrizione": "Costi extra (attrezzatura, ecc)", "costo": 00.00},
    "totale": 00.00,
    "nota": "Costo totale stimato per persona"
  }
}`;
    } else {

    // ── Tourist context ──
    let touristContext = "";
    if (mode === "tourist" && touristPrefs) {
      const transportLabels: Record<string, string> = {
        auto: "in auto",
        treno: "in treno",
        aereo: "in aereo",
        traghetto: "in traghetto/nave",
      };
      const accomLabels: Record<string, string> = {
        hotel_lusso: "hotel di lusso o resort",
        bnb: "B&B o affittacamere",
        campeggio: "campeggio o tenda",
        arrangiarsi: "arrangiandosi (ostelli, divano, macchina, zaino in spalla)",
      };
      const groupLabels: Record<string, string> = {
        solo: "da solo/a",
        coppia: "in coppia",
        famiglia: "con la famiglia",
        gruppo: "in gruppo di amici",
      };
      const budgetLabels: Record<string, string> = {
        economico: "ECONOMICO (€0-50 al giorno a persona) — cerca posti gratis o quasi, street food, niente ingressi costosi",
        medio: "MEDIO (€50-100 al giorno a persona) — ristoranti normali, qualche ingresso, spese moderate",
        comfort: "COMFORT (€100-200 al giorno a persona) — ristoranti buoni, ingressi, esperienze di qualità",
        lusso: "LUSSO (€200+ al giorno a persona) — ristoranti top, esperienze premium, nessun limite",
      };
      const daysLabel = touristPrefs.tripDays <= 1
        ? "una giornata (andata e ritorno)"
        : touristPrefs.tripDays <= 2
        ? "un weekend (2 giorni)"
        : touristPrefs.tripDays <= 3
        ? "un ponte lungo (3 giorni)"
        : touristPrefs.tripDays <= 7
        ? `${touristPrefs.tripDays} giorni`
        : "una vacanza lunga (10+ giorni)";

      // Departure point and month info
      const hasDeparture = touristPrefs.departurePoint && touristPrefs.departurePoint.trim();
      const departureLabel = hasDeparture ? touristPrefs.departurePoint!.trim() : `la posizione dell'utente (${lat}, ${lng})`;
      const monthsIt = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
      const travelMonthLabel = touristPrefs.travelMonth
        ? (() => {
            const [y, m] = touristPrefs.travelMonth.split("-");
            return `${monthsIt[parseInt(m, 10) - 1]} ${y}`;
          })()
        : null;

      // Fuel consumption estimates for cost calculation
      const fuelInfo: Record<string, string> = {
        auto: "Consumo medio auto: ~6.5 L/100km, prezzo benzina: ~1.85 €/L. Calcola andata e ritorno.",
        treno: `L'utente viaggia IN TRENO.
STAZIONE DI PARTENZA: ${hasDeparture ? `"${departureLabel}" (OBBLIGATORIA — il treno DEVE partire da questa stazione!)` : `Identifica la stazione più vicina a (${lat}, ${lng})`}
${travelMonthLabel ? `PERIODO: ${travelMonthLabel} — cerca biglietti/prezzi tipici per questo mese.` : ""}

ISTRUZIONI TRENO (OBBLIGATORIE):
1. Il treno DEVE partire dalla stazione "${departureLabel}"
2. Identifica la stazione di arrivo più vicina alla destinazione
3. Suggerisci un TRENO SPECIFICO con: compagnia REALE (Trenitalia Regionale, Trenitalia Frecciarossa/Frecciargento/Frecciabianca, Italo, Trenord), tipo treno, orario plausibile, durata, prezzo stimato
4. Se servono CAMBI, specifica OGNI cambio: stazione, tempo di attesa, treno successivo
5. Per distanze <150km → treni regionali (€5-20). Per 150-500km → Frecce/Italo (€20-70). Per >500km → Alta Velocità (€40-90)
6. PREZZI: Regionale Veloce ~€8-20, InterCity ~€15-35, Frecciarossa/Italo economy ~€25-50, business ~€50-90
7. La destinazione DEVE essere raggiungibile in treno! Se non ha stazione vicina, scegli un'ALTRA destinazione
8. In "directions" spiega come arrivare dalla stazione di arrivo alla destinazione (a piedi, bus, taxi)
9. Compila "transportInfo" con TUTTI i dettagli precisi del viaggio
10. In "consigli" di transportInfo: suggerisci app/siti per comprare (trenitalia.it, italotreno.it), se prenotare in anticipo, offerte speciali
11. In "linkPrenotazione": metti il URL reale per prenotare (https://www.trenitalia.com o https://www.italotreno.it)`,

        aereo: `L'utente viaggia IN AEREO.
AEROPORTO DI PARTENZA: ${hasDeparture ? `"${departureLabel}" (OBBLIGATORIO — il volo DEVE partire da questo aeroporto!)` : `Identifica l'aeroporto più vicino a (${lat}, ${lng})`}
${travelMonthLabel ? `PERIODO: ${travelMonthLabel} — cerca voli/prezzi tipici per questo mese. Considera alta/bassa stagione.` : ""}

ISTRUZIONI VOLO (OBBLIGATORIE):
1. Il volo DEVE partire dall'aeroporto "${departureLabel}"
2. Identifica l'aeroporto di arrivo più vicino alla destinazione
3. Suggerisci un VOLO SPECIFICO con: compagnia aerea REALE (Ryanair, easyJet, Wizz Air, ITA Airways, Vueling, Volotea, ecc.), rotta, orario tipo, durata, prezzo stimato
4. Se serve uno SCALO, specifica: aeroporto di scalo, tempo di attesa
5. PREZZI REALISTICI per il periodo indicato: Ryanair/easyJet Italia €20-60, Europa €30-120. ITA Airways Italia €50-150, Europa €80-250
6. Considera la STAGIONE: estate (giugno-agosto) = prezzi più alti. Inverno = prezzi più bassi. Prenotare 2-3 mesi prima = risparmi
7. La destinazione DEVE avere un aeroporto raggiungibile! Se non c'è, scegli un'ALTRA destinazione
8. In "directions" spiega come arrivare dall'aeroporto alla destinazione (bus, treno locale, taxi, ecc.)
9. Compila "transportInfo" con TUTTI i dettagli precisi del volo
10. In "consigli": siti per confrontare prezzi (skyscanner.it, google.com/flights), trucchi per risparmiare, app delle compagnie
11. In "linkPrenotazione": URL per prenotare (es: https://www.ryanair.com, https://www.skyscanner.it)`,

        traghetto: `L'utente viaggia IN TRAGHETTO.
PORTO DI PARTENZA: ${hasDeparture ? `"${departureLabel}" (OBBLIGATORIO — il traghetto DEVE partire da questo porto!)` : `Identifica il porto più vicino a (${lat}, ${lng})`}
${travelMonthLabel ? `PERIODO: ${travelMonthLabel} — cerca traghetti/prezzi tipici per questo mese. Estate = più frequenze e più caro.` : ""}

ISTRUZIONI TRAGHETTO (OBBLIGATORIE):
1. Il traghetto DEVE partire dal porto "${departureLabel}"
2. Identifica il porto di arrivo più vicino alla destinazione
3. Suggerisci un TRAGHETTO SPECIFICO con: compagnia REALE (Tirrenia, Moby, Corsica Ferries, GNV, Grimaldi Lines, Toremar, Caremar, SNAV, Blu Navy, Liberty Lines), rotta, orario tipo, durata navigazione, prezzo stimato
4. PREZZI REALISTICI: traghetti brevi (<2h) €10-30/persona. Sardegna/Sicilia €40-80/persona, con auto €80-200. Corsica €35-70/persona
5. Specifica SEMPRE: prezzo solo passeggero vs con auto a bordo, tipo di posto (poltrona, cabina)
6. Considera che i traghetti NOTTURNI spesso sono più convenienti e risparmiano una notte di hotel
7. La destinazione DEVE essere raggiungibile via mare! (isole, coste, ecc.)
8. In "directions" spiega come arrivare dal porto alla destinazione
9. Compila "transportInfo" con TUTTI i dettagli precisi del traghetto
10. In "consigli": dove prenotare (directferries.it, sito della compagnia), quanto anticipo serve, offerte early booking
11. In "linkPrenotazione": URL per prenotare (es: https://www.directferries.it, https://www.moby.it)`,
      };

      touristContext = `
Dettagli viaggio turista:
- Mezzo di trasporto: ${transportLabels[touristPrefs.transport] || "auto"}${hasDeparture ? `\n- PUNTO DI PARTENZA: ${departureLabel}` : ""}
- Alloggio preferito: ${accomLabels[touristPrefs.accommodation] || "B&B"}
- Budget: ${budgetLabels[touristPrefs.budget] || "MEDIO"}
- Durata: ${daysLabel}
- Viaggia ${groupLabels[touristPrefs.groupSize] || "in coppia"}
- ${travelMonthLabel ? `Mese di viaggio: ${travelMonthLabel}` : `Data partenza: ${touristPrefs.targetDate || "non specificata"}`}

ISTRUZIONI COSTI TRASPORTO:
${fuelInfo[touristPrefs.transport] || fuelInfo.auto}`;

      // Interests
      if (touristPrefs.interests && touristPrefs.interests.length > 0) {
        touristContext += `\n\nINTERESSI DELL'UTENTE (IMPORTANTE — la destinazione DEVE soddisfare almeno alcuni di questi):
${touristPrefs.interests.map((i: string) => `- ${i}`).join("\n")}
Cerca posti che combinino questi interessi. Ad esempio se l'utente ha scelto "natura" e "cibo", cerca un borgo immerso nella natura con ottima cucina locale.`;
      }

      // Pace
      if (touristPrefs.pace) {
        const paceLabels: Record<string, string> = {
          rilassato: "RILASSATO — poche tappe, niente fretta, godersi il momento. Max 2-3 attività al giorno.",
          moderato: "MODERATO — il giusto equilibrio tra relax e esplorazione. 3-5 attività al giorno.",
          intenso: "INTENSO — vedere tutto il possibile, giornate piene dalla mattina alla sera. 5+ attività al giorno.",
        };
        touristContext += `\n- Ritmo della giornata: ${paceLabels[touristPrefs.pace] || "moderato"}`;
      }

      // Travel style
      if (touristPrefs.travelStyle) {
        const styleLabels: Record<string, string> = {
          culturale: "CULTURALE — musei, monumenti, storia, architettura. Posti con forte valore culturale.",
          avventuroso: "AVVENTUROSO — trekking, grotte, cascate, posti selvaggi. Fuori dai sentieri battuti.",
          romantico: "ROMANTICO — posti intimi, tramonti, cene a lume di candela, atmosfera magica.",
          gourmet: "GOURMET — enogastronomia, cantine, mercati, ristoranti tipici, degustazioni.",
          sportivo: "SPORTIVO — attività fisiche, sport all'aperto, bici, kayak, arrampicata.",
          spirituale: "SPIRITUALE — eremi, abbazie, luoghi di meditazione, natura incontaminata, silenzio.",
        };
        touristContext += `\n- Stile di viaggio: ${styleLabels[touristPrefs.travelStyle] || touristPrefs.travelStyle}`;
      }

      // Free text
      if (touristPrefs.freeText && touristPrefs.freeText.trim()) {
        touristContext += `\n\n═══════════════════════════════════════════════════════════════
RICHIESTA DELL'UTENTE — PRIORITÀ MASSIMA ASSOLUTA:
"${touristPrefs.freeText.trim()}"
═══════════════════════════════════════════════════════════════
Questa è LA RICHIESTA PRINCIPALE dell'utente. La destinazione DEVE corrispondere a quello che ha chiesto.
Analizza la richiesta parola per parola:
- Se menziona un TIPO di posto (mare, montagna, borgo, lago, città, ecc.) → cerca ESATTAMENTE quel tipo
- Se menziona un'ATTIVITÀ (mangiare, trekking, relax, arte, ecc.) → la destinazione DEVE offrire quell'attività
- Se menziona un BUDGET (economico, gratis, lusso, ecc.) → rispetta il budget indicato
- Se menziona uno STILE (romantico, avventuroso, tranquillo, ecc.) → la destinazione deve avere quell'atmosfera
- Se menziona una STAGIONE o PERIODO → scegli un posto adatto a quel periodo
- Se menziona un GRUPPO (famiglia, coppia, amici) → la destinazione deve essere adatta a quel gruppo
- Se menziona CIBO → trova un posto famoso per la cucina locale
- Se menziona qualcosa di SPECIFICO (es: 'cascata', 'grotta', 'terme') → trova ESATTAMENTE quel tipo di posto
NON ignorare nessun dettaglio della richiesta. Se l'utente chiede 'un posto al mare economico per la famiglia', cerca una spiaggia/località balneare economica adatta alle famiglie. Non un borgo medievale in collina.
La richiesta dell'utente ha la priorità su TUTTI gli altri parametri.`;
      }

      // Abroad + short trip warning — restrict AI
      if (allowAbroad) {
        if (touristPrefs.tripDays <= 1 && touristPrefs.transport !== "aereo") {
          touristContext += `\nATTENZIONE: l'utente vuole andare all'estero ma ha solo 1 giorno e viaggia ${transportLabels[touristPrefs.transport]}. Suggerisci comunque una meta in ITALIA vicina al confine, spiegando che per l'estero serve più tempo.`;
        }
        if (touristPrefs.tripDays <= 2 && touristPrefs.transport === "traghetto") {
          touristContext += `\nATTENZIONE: con il traghetto e solo ${touristPrefs.tripDays} giorni, consiglia mete raggiungibili come Sardegna, Sicilia, Corsica, o isole minori. Avverti che è un viaggio serrato.`;
        }
      }

      // Accommodation context
      if (touristPrefs.accommodation === "campeggio") {
        touristContext += "\nCerca posti con aree campeggio o natura dove si può campeggiare. Suggerisci campeggi specifici.";
      }
      if (touristPrefs.accommodation === "hotel_lusso") {
        touristContext += "\nCerca posti eleganti, spa, relais, agriturismi di charme. L'utente vuole essere coccolato.";
      }
      if (touristPrefs.accommodation === "arrangiarsi") {
        touristContext += "\nL'utente ha budget basso, cerca posti economici, ostelli, bivacchi, aree sosta gratis. Niente hotel cari.";
      }
    }

    // ── Biker context ──
    let bikerContext = "";
    if (mode === "biker" && bikerPrefs) {
      const intentLabels: Record<string, string> = {
        aperitivo: "vuole fare un aperitivo",
        pranzo: "vuole andare a pranzo",
        panorama: "cerca un punto panoramico",
        curve: "vuole divertirsi sulle curve",
        tramonto: "vuole vedere il tramonto",
        giornata_intera: "ha una giornata intera",
      };
      bikerContext = `
Dettagli motociclista: ${intentLabels[bikerPrefs.intent] || "vuole fare un giro"}.
Parte il ${bikerPrefs.targetDate || "oggi"} alle ${bikerPrefs.targetTime || "10:00"}.
Viaggia ${bikerPrefs.groupSize === "coppia" ? "in coppia" : bikerPrefs.groupSize === "gruppo" ? "in gruppo" : "da solo"}.
${bikerPrefs.preferScenic ? "Preferisce strade panoramiche." : ""}
${bikerPrefs.avoidHighways ? "Vuole evitare autostrade." : ""}`;

      // Experience level
      if (bikerPrefs.experience) {
        const expLabels: Record<string, string> = {
          principiante: "PRINCIPIANTE — strade facili, larghe, ben asfaltate, niente tornanti stretti o sterrati. Curve dolci e percorsi rilassanti.",
          intermedio: "INTERMEDIO — un mix di strade, può gestire tornanti e qualche tratto impegnativo ma niente di estremo.",
          esperto: "ESPERTO — cerca strade impegnative, tornanti stretti, passi alpini, curve tecniche. Più è difficile meglio è.",
        };
        bikerContext += `\nLivello esperienza: ${expLabels[bikerPrefs.experience] || "intermedio"}`;
      }

      // Preferred road types
      if (bikerPrefs.roadTypes && bikerPrefs.roadTypes.length > 0) {
        const roadLabels: Record<string, string> = {
          tornanti: "tornanti e curve strette",
          sterrato: "tratti sterrati e off-road",
          costiera: "strade costiere sul mare",
          montagna: "strade di montagna e passi",
          collina: "strade collinari panoramiche",
          pianura: "strade di pianura lunghe e rettilinee",
        };
        bikerContext += `\nTipi di strade preferite: ${bikerPrefs.roadTypes.map((r: string) => roadLabels[r] || r).join(", ")}.`;
      }

      // Free text
      if (bikerPrefs.freeText && bikerPrefs.freeText.trim()) {
        bikerContext += `\n\n═══════════════════════════════════════════════════════════════
RICHIESTA DEL MOTOCICLISTA — PRIORITÀ MASSIMA ASSOLUTA:
"${bikerPrefs.freeText.trim()}"
═══════════════════════════════════════════════════════════════
Questa è LA RICHIESTA PRINCIPALE. La destinazione DEVE corrispondere a quello che ha chiesto.
Analizza la richiesta parola per parola:
- Se menziona un TIPO di strada (curve, tornanti, costiera, montagna) → cerca ESATTAMENTE quel tipo
- Se menziona un POSTO specifico (lago, mare, passo, ecc.) → la meta DEVE essere quel tipo di posto
- Se menziona CIBO → trova un posto con un ottimo ristorante/trattoria raggiungibile in moto
- Se menziona un'ESPERIENZA (tramonto, panorama, aperitivo) → la destinazione DEVE offrire quell'esperienza
- Se menziona una DISTANZA o DURATA → rispettala
NON ignorare nessun dettaglio. La richiesta ha priorità su tutto.`;
      }
    }

    // Check if user has a specific free text request
    const hasTouristRequest = touristPrefs?.freeText && touristPrefs.freeText.trim().length > 0;
    const hasBikerRequest = bikerPrefs?.freeText && bikerPrefs.freeText.trim().length > 0;

    const modeInstructions =
      mode === "tourist"
        ? `L'utente è un TURISTA.${hasTouristRequest
            ? ` L'UTENTE HA FATTO UNA RICHIESTA SPECIFICA — leggi attentamente la sezione "RICHIESTA DELL'UTENTE" qui sotto e dai la MASSIMA PRIORITÀ a quella richiesta. La destinazione DEVE corrispondere a ciò che l'utente ha chiesto. Se chiede mare → cerca mare. Se chiede montagna → cerca montagna. Se chiede cibo → cerca un posto famoso per la cucina. NON ignorare la richiesta.`
            : ` Cerca posti con valore storico, artistico o naturale: borghi nascosti, laghi poco conosciuti, abbazie, castelli dimenticati, siti archeologici minori, eremi, parchi naturali poco frequentati.`
          } EVITA le mete turistiche famose e mainstream (no Cinque Terre, no Amalfi, no Lago di Garda, no San Gimignano, ecc). Cerca le perle NASCOSTE che solo un locale conosce.${touristContext}`
        : `L'utente è un MOTOCICLISTA.${hasBikerRequest
            ? ` L'UTENTE HA FATTO UNA RICHIESTA SPECIFICA — leggi attentamente la sezione "RICHIESTA DEL MOTOCICLISTA" qui sotto e dai la MASSIMA PRIORITÀ a quella richiesta. La destinazione DEVE corrispondere a ciò che ha chiesto.`
            : ` Cerca passi di montagna, strade panoramiche con curve, valichi poco frequentati, strade provinciali spettacolari, percorsi con asfalto buono e alta tortuosità.`
          } Privilegia strade statali e provinciali, non autostrade. Includi valutazione qualità asfalto (1-5) e rating curve (1-5). EVITA i passi ultra-famosi (no Stelvio, no Sella, no Gardena). Cerca i passi e le strade SEGRETE che solo i motociclisti locali conoscono.${bikerContext}`;

    const distanceInstruction = allowAbroad
      ? `L'utente può uscire dall'Italia — suggerisci mete in tutta Europa raggiungibili.`
      : `La destinazione DEVE trovarsi a una distanza compresa tra ${minRadius} km e ${maxRadius} km dalla posizione dell'utente. NON suggerire posti più vicini di ${minRadius} km e NON più lontani di ${maxRadius} km. Rispetta RIGOROSAMENTE questo range di distanza.`;

    prompt = `Sei un esperto viaggiatore italiano che conosce ogni angolo nascosto d'Italia. L'utente si trova a coordinate (${lat}, ${lng}).

VINCOLO DISTANZA (OBBLIGATORIO): ${distanceInstruction}

${modeInstructions}
${excludeList}

REGOLE IMPORTANTI:
- Suggerisci UN SOLO posto, diverso ogni volta
- Il posto DEVE esistere realmente ed essere raggiungibile
- Le coordinate DEVONO essere precise e reali (verificabili su Google Maps)
- Preferisci posti POCO CONOSCIUTI ma STUPENDI — gemme nascoste
- Scrivi in italiano con entusiasmo ma senza esagerare
- La descrizione deve far venire voglia di partire SUBITO
- Il campo "whyGo" deve essere una frase breve e d'impatto (max 15 parole)

Rispondi SOLO con un JSON valido (nessun testo prima o dopo), con questa struttura esatta:
{
  "name": "Nome del posto",
  "region": "Regione italiana",
  "lat": 00.0000,
  "lng": 00.0000,
  "type": "borgo|lago|passo|castello|abbazia|valle|sentiero|cascata|eremo|ponte|strada|parco",
  "tags": ["tag1", "tag2", "tag3"],
  "description": "Descrizione evocativa di 2-3 frasi del posto, cosa lo rende speciale e cosa fare una volta arrivati.",
  "whyGo": "Frase breve e d'impatto sul perché andare",
  "altitude": null,
  "roadQuality": null,
  "curvinessRating": null,
  "hiddenGemRating": 5,
  "aiReview": "Una mini-recensione personale in prima persona di 1-2 frasi, come se ci fossi stato.",
  "nearbyPlaces": [{"name": "Nome ristorante/bar reale vicino", "type": "ristorante", "description": "Cosa si mangia bene qui"}],
  "aiPlan": "Piano dettagliato: a che ora partire, che strada fare, cosa vedere, dove fermarsi. Scrivi come un amico.",
  "directions": "Percorso stradale: prendi via X, poi SP45 direzione Y...",
  "costBreakdown": {
    "carburante": {"descrizione": "Benzina A/R ~XXX km, consumo ~6.5L/100km a €1.85/L", "costo": 00.00},
    "trasporto": {"descrizione": "Biglietto treno/aereo/traghetto (se applicabile, altrimenti ometti)", "costo": 00.00},
    "alloggio": {"descrizione": "X notti in [tipo alloggio] a ~€XX/notte", "costo": 00.00},
    "cibo": {"descrizione": "Pasti stimati per X giorni: colazione, pranzo, cena", "costo": 00.00},
    "pedaggi": {"descrizione": "Pedaggi autostradali A/R (se applicabili)", "costo": 00.00},
    "attivita": {"descrizione": "Ingressi, visite, esperienze", "costo": 00.00},
    "totale": 00.00,
    "nota": "Costo stimato per [numero persone] persona/e"
  }${mode === "tourist" && touristPrefs && ["treno", "aereo", "traghetto"].includes(touristPrefs.transport) ? `,
  "transportInfo": {
    "tipo": "${touristPrefs.transport}",
    "andata": {
      "compagnia": "Nome compagnia (es: Trenitalia Frecciarossa, Ryanair, Moby Lines)",
      "partenza": "Stazione/Aeroporto/Porto di partenza più vicino all'utente",
      "arrivo": "Stazione/Aeroporto/Porto di arrivo più vicino alla destinazione",
      "orario": "HH:MM - HH:MM (orario partenza - arrivo stimato)",
      "durata": "Xh XXmin",
      "prezzo": "€XX-XX a persona",
      "note": "Eventuali cambi, scali, info utili"
    },
    "ritorno": {
      "compagnia": "Nome compagnia per il ritorno",
      "partenza": "Stazione/Aeroporto/Porto di partenza ritorno",
      "arrivo": "Stazione/Aeroporto/Porto di arrivo ritorno",
      "orario": "HH:MM - HH:MM",
      "durata": "Xh XXmin",
      "prezzo": "€XX-XX a persona",
      "note": "Eventuali cambi, scali"
    },
    "consigli": "Consigli pratici: dove prenotare, con quanto anticipo, offerte, app da usare",
    "linkPrenotazione": "URL del sito per prenotare (es: trenitalia.it, ryanair.com, directferries.it)"
  }` : ""}
}

${mode === "biker" ? 'Per i biker: "altitude" deve essere un numero (metri slm), "roadQuality" da 1 a 5, "curvinessRating" da 1 a 5.' : '"altitude", "roadQuality" e "curvinessRating" possono essere null per i turisti.'}
"hiddenGemRating" è da 1 a 5 dove 5 = posto segretissimo che quasi nessuno conosce.
"nearbyPlaces" deve avere 1-3 posti REALI dove mangiare/bere vicino alla destinazione.
"aiPlan" deve essere un piano completo e pratico per la giornata.
"directions" deve descrivere il percorso stradale con nomi di strade reali.

REGOLE PER costBreakdown (IMPORTANTISSIMO):
- Calcola i costi in modo REALISTICO e DETTAGLIATO per l'Italia nel 2024-2025.
- "carburante": calcola distanza A/R in km, consumo del veicolo (~6.5 L/100km per auto, ~5 L/100km per moto), prezzo benzina €1.85/L. Scrivi il calcolo nella descrizione.
- "trasporto": se il mezzo è treno/aereo/traghetto, inserisci il costo stimato del biglietto per la tratta. Se è auto, ometti questo campo.
- "alloggio": costo per notte in base al tipo di alloggio scelto. Se è una giornata (trip=1 giorno), ometti.
- "cibo": stima realistica (colazione ~€3-5, pranzo ~€12-25, cena ~€15-35 a persona secondo il budget).
- "pedaggi": stima realistica dei pedaggi autostradali per la tratta (se ci sono). Se non ci sono autostrade, ometti.
- "attivita": eventuali biglietti d'ingresso, guide, noleggi, esperienze.
- "totale": somma di TUTTI i costi sopra. DEVE essere la somma corretta.
- "nota": specifica se i costi sono per persona, per coppia, o per il gruppo. Basati sulla groupSize dell'utente.
- Ometti i campi con costo zero (non includere nel JSON campi con costo 0).
- I costi devono essere COERENTI con il budget scelto dall'utente.${mode === "tourist" && touristPrefs && ["treno", "aereo", "traghetto"].includes(touristPrefs.transport) ? `

REGOLE PER transportInfo (OBBLIGATORIO per ${touristPrefs.transport.toUpperCase()}):
- Il campo "transportInfo" è OBBLIGATORIO perché l'utente ha scelto di viaggiare in ${touristPrefs.transport}.
- Tutti i dati devono essere REALISTICI e basati su compagnie, tratte e prezzi che esistono davvero.
- "compagnia": usa compagnie REALI che operano su quella tratta (Trenitalia, Italo, Ryanair, easyJet, Moby, Tirrenia, ecc.).
- "partenza" e "arrivo": usa nomi REALI di stazioni/aeroporti/porti.
- "orario": suggerisci orari plausibili basati sulla tratta.
- "durata": tempo di viaggio realistico per quella tratta.
- "prezzo": fascia di prezzo realistica per quella tratta e compagnia.
- "ritorno": compila anche il ritorno con stessa cura.
- "consigli": suggerisci il sito/app per prenotare, se prenotare in anticipo, trucchi per risparmiare.
- "linkPrenotazione": URL reale del sito di prenotazione (trenitalia.it, italotreno.it, ryanair.com, easyjet.com, directferries.it, ecc.).
- Nel "directions" spiega come arrivare dalla stazione/aeroporto/porto alla destinazione finale.` : ""}`;
    } // end else (non-extreme)

    // Groq free models — try the best first, then fallbacks
    const models = [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "gemma2-9b-it",
    ];

    let textResponse: string | null = null;
    let lastError = "";

    for (const model of models) {
      try {
        const res = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: "system",
                  content:
                    "Sei un esperto viaggiatore italiano che conosce ogni angolo nascosto d'Italia e d'Europa. Il tuo compito è suggerire destinazioni PERFETTE che corrispondano ESATTAMENTE a ciò che l'utente chiede. Se l'utente descrive un tipo specifico di posto (mare, montagna, lago, borgo, ecc.), trova ESATTAMENTE quel tipo di posto. Se menziona un'attività (mangiare, trekking, relax), la destinazione DEVE offrire quell'attività. Rispondi SOLO con JSON valido, senza markdown, senza commenti, senza testo prima o dopo il JSON.",
                },
                { role: "user", content: prompt },
              ],
              temperature: 1.0,
              max_tokens: 2048,
              response_format: { type: "json_object" },
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          textResponse = data?.choices?.[0]?.message?.content;
          if (textResponse) {
            console.log(`✅ Risposta ottenuta da Groq (${model})`);
            break;
          }
        }

        if (res.status === 429) {
          console.warn(`Rate limit per ${model}, provo il prossimo...`);
          lastError = `Rate limit per ${model}`;
          continue;
        }

        const errText = await res.text();
        console.error(`Groq ${model} error:`, errText);
        lastError = errText;
      } catch (err) {
        console.error(`Groq ${model} fetch error:`, err);
        lastError = String(err);
      }
    }

    if (!textResponse) {
      return NextResponse.json(
        {
          error: "AI non disponibile al momento. Riprova tra qualche secondo!",
          details: lastError,
        },
        { status: 429 }
      );
    }

    // Parse the JSON from the response
    const cleanJson = textResponse
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    const suggestion = JSON.parse(cleanJson);

    // Validate required fields
    if (
      !suggestion.name ||
      !suggestion.lat ||
      !suggestion.lng ||
      !suggestion.description
    ) {
      return NextResponse.json(
        { error: "Dati incompleti dalla risposta AI" },
        { status: 502 }
      );
    }

    // Server-side distance validation (haversine)
    if (!allowAbroad) {
      const R = 6371;
      const dLat = ((suggestion.lat - lat) * Math.PI) / 180;
      const dLng = ((suggestion.lng - lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat * Math.PI) / 180) *
          Math.cos((suggestion.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const actualDistance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      // Allow 15% tolerance (AI coordinates aren't always exact center of town)
      const toleranceMin = minRadius * 0.85;
      const toleranceMax = maxRadius * 1.15;

      if (actualDistance < toleranceMin || actualDistance > toleranceMax) {
        console.warn(
          `⚠️ AI ha suggerito ${suggestion.name} a ${Math.round(actualDistance)}km, ma il range richiesto è ${minRadius}-${maxRadius}km. Rifiutato.`
        );
        return NextResponse.json(
          {
            error: `L'IA ha trovato un posto a ${Math.round(actualDistance)}km, fuori dal range ${minRadius}-${maxRadius}km. Riprova!`,
          },
          { status: 422 }
        );
      }
    }

    // Calculate sunrise/sunset
    const targetDate = extremePrefs?.targetDate || bikerPrefs?.targetDate || touristPrefs?.targetDate || undefined;
    const sunTimes = calcSunTimes(suggestion.lat, suggestion.lng, targetDate);

    // Build Wikipedia URL
    const wikiUrl = `https://it.wikipedia.org/wiki/${encodeURIComponent(suggestion.name.replace(/ /g, "_"))}`;

    // Search for an image via Wikipedia API
    let imageUrl = "";
    try {
      const wikiApiUrl = `https://it.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(suggestion.name)}&prop=pageimages&format=json&pithumbsize=800&origin=*`;
      const wikiRes = await fetch(wikiApiUrl);
      const wikiData = await wikiRes.json();
      const pages = wikiData?.query?.pages;
      if (pages) {
        const page = Object.values(pages)[0] as Record<string, unknown>;
        if (page?.thumbnail) {
          imageUrl = (page.thumbnail as Record<string, string>).source || "";
        }
      }
    } catch {
      // Wikipedia image fetch failed, will use fallback
    }

    // Fallback images if no Wikipedia image found
    if (!imageUrl) {
      const fallbacks = [
        "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80",
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
        "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80",
        "https://images.unsplash.com/photo-1502786129293-79981df4e689?w=800&q=80",
      ];
      imageUrl = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    const destination = {
      id: `ai-${Date.now()}`,
      name: suggestion.name,
      region: suggestion.region || "",
      lat: suggestion.lat,
      lng: suggestion.lng,
      type: suggestion.type || "attrazione",
      tags: suggestion.tags || [],
      description: suggestion.description,
      whyGo: suggestion.whyGo || suggestion.description.slice(0, 80),
      image: imageUrl,
      wikiUrl,
      altitude: suggestion.altitude || undefined,
      roadQuality: suggestion.roadQuality || undefined,
      curvinessRating: suggestion.curvinessRating || undefined,
      hiddenGemRating: suggestion.hiddenGemRating || 3,
      aiReview: suggestion.aiReview || null,
      nearbyPlaces: suggestion.nearbyPlaces || undefined,
      aiPlan: suggestion.aiPlan || undefined,
      directions: suggestion.directions || undefined,
      costBreakdown: suggestion.costBreakdown || undefined,
      transportInfo: suggestion.transportInfo || undefined,
      sunsetTime: sunTimes.sunset,
      sunriseTime: sunTimes.sunrise,
      source: "ai" as const,
    };

    return NextResponse.json({ destination });
  } catch (error) {
    console.error("AI suggest error:", error);
    return NextResponse.json(
      { error: "Errore nella generazione AI" },
      { status: 500 }
    );
  }
}
