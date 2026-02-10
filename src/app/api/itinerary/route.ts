import { NextResponse } from "next/server";

interface ItineraryRequest {
  destination: {
    name: string;
    region: string;
    lat: number;
    lng: number;
    description: string;
    aiPlan?: string;
    transportInfo?: {
      tipo: string;
      andata: {
        compagnia: string;
        partenza: string;
        arrivo: string;
        orario: string;
        durata: string;
        prezzo: string;
        note?: string;
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
    };
    costBreakdown?: {
      totale: number;
      nota?: string;
    };
    nearbyPlaces?: { name: string; type: string; description: string }[];
  };
  mode: "tourist" | "biker";
  userLat: number;
  userLng: number;
  distance: number;
  travelTime: string;
  touristPrefs?: {
    transport: string;
    accommodation: string;
    budget: string;
    interests?: string[];
    pace?: string;
    travelStyle?: string;
    tripDays: number;
    targetDate: string;
    travelMonth?: string;
    departurePoint?: string;
    groupSize: string;
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
    groupSize: string;
    freeText?: string;
  };
}

const MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "gemma2-9b-it",
];

/**
 * Generate guaranteed-working links for each activity based on type + place name.
 * Uses Google Maps Search, Google Search, and TripAdvisor — these URLs always work.
 */
function generateActivityLinks(
  activity: { tipo: string; luogo?: string; attivita: string },
  destinationName: string,
  destinationRegion: string
): { link: string; linkLabel: string } {
  const place = activity.luogo || activity.attivita;
  const searchQuery = encodeURIComponent(`${place} ${destinationName} ${destinationRegion}`);
  const mapsQuery = encodeURIComponent(`${place}, ${destinationName}`);

  switch (activity.tipo) {
    case "cibo":
      // Restaurants/bars → Google Maps (shows reviews, menu, hours, photos)
      return {
        link: `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
        linkLabel: "📍 Vedi su Google Maps",
      };

    case "visita":
      // Museums, monuments, churches → Google Search for official site + info
      return {
        link: `https://www.google.com/search?q=${searchQuery}`,
        linkLabel: "🔎 Info e biglietti",
      };

    case "avventura":
      // Trekking, sports → Google Maps for location
      return {
        link: `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
        linkLabel: "🗺️ Vedi su Maps",
      };

    case "shopping":
      return {
        link: `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
        linkLabel: "🛍️ Vedi su Maps",
      };

    case "trasporto":
      return {
        link: `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`,
        linkLabel: "🧭 Indicazioni stradali",
      };

    case "check-in":
    case "check-out":
      // Accommodation → Google Maps
      return {
        link: `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
        linkLabel: "🏨 Vedi su Maps",
      };

    case "relax":
    case "tempo_libero":
      return {
        link: `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
        linkLabel: "📍 Vedi su Maps",
      };

    case "viaggio":
      return {
        link: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinationName)}`,
        linkLabel: "🧭 Naviga con Maps",
      };

    default:
      return {
        link: `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
        linkLabel: "📍 Vedi su Maps",
      };
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY non configurata." },
      { status: 500 }
    );
  }

  try {
    const body: ItineraryRequest = await request.json();
    const { destination, mode, userLat: _userLat, userLng: _userLng, distance, travelTime, touristPrefs, bikerPrefs } = body;

    // Build context about the trip
    let tripContext = "";

    if (mode === "tourist" && touristPrefs) {
      const transportLabels: Record<string, string> = {
        auto: "in auto",
        treno: "in treno",
        aereo: "in aereo",
        traghetto: "in traghetto",
      };
      const accomLabels: Record<string, string> = {
        hotel_lusso: "hotel di lusso",
        bnb: "B&B",
        campeggio: "campeggio",
        arrangiarsi: "arrangiandosi (ostelli, ecc.)",
      };
      const budgetLabels: Record<string, string> = {
        economico: "economico (€0-50/giorno)",
        medio: "medio (€50-100/giorno)",
        comfort: "comfort (€100-200/giorno)",
        lusso: "lusso (€200+/giorno)",
      };
      const groupLabels: Record<string, string> = {
        solo: "da solo/a",
        coppia: "in coppia",
        famiglia: "con la famiglia",
        gruppo: "in gruppo",
      };
      const paceLabels: Record<string, string> = {
        rilassato: "rilassato (poche tappe, godersi il momento)",
        moderato: "moderato (giusto equilibrio)",
        intenso: "intenso (vedere tutto il possibile)",
      };

      tripContext = `
DETTAGLI VIAGGIO:
- Destinazione: ${destination.name} (${destination.region})
- Distanza: ~${Math.round(distance)} km
- Tempo di viaggio: ${travelTime}
- Trasporto: ${transportLabels[touristPrefs.transport] || "auto"}
- Alloggio: ${accomLabels[touristPrefs.accommodation] || "B&B"}
- Budget: ${budgetLabels[touristPrefs.budget] || "medio"}
- Durata: ${touristPrefs.tripDays} giorn${touristPrefs.tripDays === 1 ? "o" : "i"}
- Viaggia: ${groupLabels[touristPrefs.groupSize] || "in coppia"}
- Ritmo: ${paceLabels[touristPrefs.pace || "moderato"] || "moderato"}
${touristPrefs.travelStyle ? `- Stile: ${touristPrefs.travelStyle}` : ""}
${touristPrefs.interests && touristPrefs.interests.length > 0 ? `- Interessi: ${touristPrefs.interests.join(", ")}` : ""}
${touristPrefs.departurePoint ? `- Punto di partenza: ${touristPrefs.departurePoint}` : ""}
- Data partenza: ${touristPrefs.targetDate}`;

    } else if (mode === "biker" && bikerPrefs) {
      const intentLabels: Record<string, string> = {
        aperitivo: "aperitivo",
        pranzo: "pranzo fuori",
        panorama: "punto panoramico",
        curve: "divertirsi sulle curve",
        tramonto: "vedere il tramonto",
        giornata_intera: "giornata intera in moto",
      };

      tripContext = `
DETTAGLI USCITA IN MOTO:
- Destinazione: ${destination.name} (${destination.region})
- Distanza: ~${Math.round(distance)} km
- Tempo di viaggio: ${travelTime}
- Obiettivo: ${intentLabels[bikerPrefs.intent] || "giro in moto"}
- Esperienza: ${bikerPrefs.experience || "intermedio"}
- Data: ${bikerPrefs.targetDate}
- Orario partenza: ${bikerPrefs.targetTime}
- Viaggia: ${bikerPrefs.groupSize === "coppia" ? "in coppia" : bikerPrefs.groupSize === "gruppo" ? "in gruppo" : "da solo"}
${bikerPrefs.roadTypes && bikerPrefs.roadTypes.length > 0 ? `- Strade preferite: ${bikerPrefs.roadTypes.join(", ")}` : ""}`;
    }

    // Transport info context
    let transportContext = "";
    if (destination.transportInfo) {
      const ti = destination.transportInfo;
      transportContext = `
INFO TRASPORTO GIÀ FORNITE ALL'UTENTE:
- Tipo: ${ti.tipo}
- Andata: ${ti.andata.compagnia}, ${ti.andata.partenza} → ${ti.andata.arrivo}, ${ti.andata.orario}, ${ti.andata.durata}, ${ti.andata.prezzo}
${ti.andata.note ? `  Note: ${ti.andata.note}` : ""}
${ti.ritorno ? `- Ritorno: ${ti.ritorno.compagnia}, ${ti.ritorno.partenza} → ${ti.ritorno.arrivo}, ${ti.ritorno.orario}, ${ti.ritorno.durata}, ${ti.ritorno.prezzo}` : ""}
IMPORTANTE: Usa ESATTAMENTE queste info trasporto nel viaggio andata/ritorno dell'itinerario. Non inventare altri treni/voli/traghetti.`;
    }

    // Nearby places context
    let nearbyContext = "";
    if (destination.nearbyPlaces && destination.nearbyPlaces.length > 0) {
      nearbyContext = `
RISTORANTI/BAR VICINI GIÀ SUGGERITI (usa questi nel piano pasti):
${destination.nearbyPlaces.map(p => `- ${p.name} (${p.type}): ${p.description}`).join("\n")}`;
    }

    // Cost context
    let costContext = "";
    if (destination.costBreakdown) {
      costContext = `\nBUDGET TOTALE STIMATO: €${destination.costBreakdown.totale} ${destination.costBreakdown.nota || ""}`;
    }

    const tripDays = touristPrefs?.tripDays || 1;

    const prompt = `Sei un esperto travel planner italiano. L'utente ha ACCETTATO la destinazione "${destination.name}" e ora vuole un ITINERARIO COMPLETO, DETTAGLIATO, ora per ora, giorno per giorno.

${tripContext}
${transportContext}
${nearbyContext}
${costContext}

DESCRIZIONE DESTINAZIONE:
${destination.description}
${destination.aiPlan ? `\nPIANO GIÀ SUGGERITO (usalo come base e arricchiscilo con orari precisi):\n${destination.aiPlan}` : ""}

ISTRUZIONI PER L'ITINERARIO:
1. Genera un itinerario per ESATTAMENTE ${tripDays} giorn${tripDays === 1 ? "o" : "i"}
2. Ogni giornata deve avere attività con ORARI PRECISI (es: "09:00 - 10:30")
3. Includi TUTTO: viaggio di andata, check-in, visite, pasti (con nomi di ristoranti reali), tempo libero, viaggio di ritorno
4. Il PRIMO giorno deve iniziare con la partenza da casa e il viaggio verso la destinazione
5. L'ULTIMO giorno deve terminare con il viaggio di ritorno a casa
6. Sii REALISTICO con i tempi: considera spostamenti tra un'attività e l'altra
7. Adatta il ritmo alla preferenza dell'utente (rilassato/moderato/intenso)
8. Includi suggerimenti pratici: cosa portare, come vestirsi, dove parcheggiare
9. Per ogni attività specifica il costo se applicabile
10. Le attività devono essere REALI e FATTIBILI
11. I pasti devono essere in RISTORANTI REALI della zona
${mode === "biker" ? "12. Per i motociclisti: specifica le strade da percorrere con nomi reali, dove fare le soste, punti panoramici per le foto, bar/ristoranti biker-friendly." : ""}

REGOLA FONDAMENTALE — ATTIVITÀ CONCRETE, NON VAGHE:
- NON scrivere mai attività vaghe tipo "visita il centro storico", "passeggiata in zona", "esplora i dintorni"
- OGNI attività deve essere SPECIFICA e CONCRETA: un museo preciso, un monumento preciso, un sentiero preciso, un ristorante preciso, un'esperienza precisa
- OGNI attività DEVE avere il campo "luogo" compilato con il nome preciso del posto (es: "Museo Civico, Via Roma 12" oppure "Ristorante Da Mario")
- Le attività devono far venire VOGLIA di farle: "Assaggia i pici cacio e pepe da Mario" > "Pranzo"
- NON includere campi "link" o "linkLabel" nel JSON — i link vengono generati automaticamente dal sistema

Rispondi SOLO con JSON valido (nessun testo prima o dopo):
{
  "riepilogo": "Breve riassunto entusiasmante del viaggio in 2-3 frasi",
  "viaggioAndata": {
    "partenza": "HH:MM — Descrizione partenza (es: 'Partenza da Firenze')",
    "mezzo": "Descrizione mezzo e percorso (es: 'Auto via A1 direzione Roma, uscita Orvieto')",
    "arrivo": "HH:MM — Arrivo a destinazione",
    "note": "Eventuali note (parcheggio, biglietti da comprare, ecc.)"
  },
  "giorni": [
    {
      "giorno": 1,
      "titolo": "Titolo evocativo della giornata (es: 'Arrivo e primo assaggio')",
      "data": "Giorno della settimana e data (es: 'Sabato 14 Febbraio')",
      "attivita": [
        {
          "orario": "09:00 - 10:30",
          "attivita": "Nome attività SPECIFICA (es: 'Visita alla Rocca Albornoz')",
          "descrizione": "Cosa fare nel dettaglio, consigli pratici, perché vale la pena",
          "luogo": "Nome PRECISO del luogo (es: 'Rocca Albornoz, Piazza Cahen, Orvieto')",
          "costo": "€XX o Gratis",
          "tipo": "viaggio|visita|cibo|relax|avventura|shopping|trasporto|check-in|check-out|tempo_libero"
        }
      ],
      "consiglioGiorno": "Un consiglio pratico per questa giornata"
    }
  ],
  "viaggioRitorno": {
    "partenza": "HH:MM — Partenza dalla destinazione",
    "mezzo": "Descrizione mezzo e percorso di ritorno",
    "arrivo": "HH:MM — Arrivo a casa",
    "note": "Eventuali note per il ritorno"
  },
  "cosaDaPortare": ["Cosa 1", "Cosa 2", "Cosa 3"],
  "consigliGenerali": "Consigli generali per il viaggio: prenotazioni da fare, app utili, cose da sapere"
}

REGOLE JSON:
- Ogni giornata DEVE avere almeno 5-8 attività con orari precisi
- OGNI attività DEVE avere il campo "luogo" con nome preciso — nessuna eccezione!
- Gli orari devono essere REALISTICI e in sequenza cronologica
- Il campo "tipo" deve essere UNO dei valori elencati
- "cosaDaPortare" deve avere 5-10 elementi pratici
- I nomi di ristoranti e luoghi devono essere REALI e VERIFICABILI
- Le attività devono essere AZIONI CONCRETE, non descrizioni vaghe`;

    // Try each model
    for (const model of MODELS) {
      try {
        const groqRes = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: "system",
                  content: "Sei un travel planner esperto. Rispondi SOLO con JSON valido, senza testo aggiuntivo, commenti o markdown.",
                },
                { role: "user", content: prompt },
              ],
              temperature: 0.7,
              max_tokens: 4000,
              response_format: { type: "json_object" },
            }),
          }
        );

        if (!groqRes.ok) {
          const errData = await groqRes.json().catch(() => null);
          console.error(`Groq ${model} error:`, JSON.stringify(errData));
          continue;
        }

        const groqData = await groqRes.json();
        const content = groqData.choices?.[0]?.message?.content;

        if (!content) {
          console.warn(`Groq ${model}: no content`);
          continue;
        }

        const parsed = JSON.parse(content);

        // Validate basic structure
        if (!parsed.giorni || !Array.isArray(parsed.giorni) || parsed.giorni.length === 0) {
          console.warn(`Groq ${model}: missing giorni array`);
          continue;
        }

        // Validate each day has activities
        let valid = true;
        for (const day of parsed.giorni) {
          if (!day.attivita || !Array.isArray(day.attivita) || day.attivita.length === 0) {
            valid = false;
            break;
          }
        }
        if (!valid) {
          console.warn(`Groq ${model}: some days have no activities`);
          continue;
        }

        console.log(`✅ Itinerario generato da Groq (${model}): ${parsed.giorni.length} giorni`);

        // Auto-generate guaranteed working links for every activity
        for (const day of parsed.giorni) {
          for (const act of day.attivita) {
            const generated = generateActivityLinks(
              act,
              destination.name,
              destination.region
            );
            // Always overwrite AI-generated links (they're unreliable)
            act.link = generated.link;
            act.linkLabel = generated.linkLabel;
          }
        }

        return NextResponse.json({ itinerary: parsed });
      } catch (err) {
        console.error(`Groq ${model} itinerary error:`, err);
        continue;
      }
    }

    return NextResponse.json(
      { error: "Impossibile generare l'itinerario. Riprova tra poco." },
      { status: 500 }
    );
  } catch (err) {
    console.error("Itinerary API error:", err);
    return NextResponse.json(
      { error: "Errore interno del server." },
      { status: 500 }
    );
  }
}
