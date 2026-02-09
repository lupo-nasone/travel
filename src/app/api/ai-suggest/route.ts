import { NextResponse } from "next/server";

interface AiSuggestRequest {
  lat: number;
  lng: number;
  radius: number;
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
  };
  bikerPrefs?: {
    intent: string;
    targetDate: string;
    targetTime: string;
    preferScenic: boolean;
    avoidHighways: boolean;
    groupSize: "solo" | "coppia" | "gruppo";
  };
  touristPrefs?: {
    transport: "auto" | "treno" | "aereo" | "traghetto";
    accommodation: "hotel_lusso" | "bnb" | "campeggio" | "arrangiarsi";
    allowAbroad: boolean;
    tripDays: number;
    targetDate: string;
    groupSize: "solo" | "coppia" | "famiglia" | "gruppo";
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
    const { lat, lng, radius, mode, bikerPrefs, touristPrefs, extremePrefs } = body;
    const excludeNames = body.excludeNames || [];
    const isExtreme = body.extreme === true;

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
  "directions": "Come arrivarci partendo dalla posizione dell'utente con il mezzo scelto"
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
      const daysLabel = touristPrefs.tripDays <= 1
        ? "una giornata (andata e ritorno)"
        : touristPrefs.tripDays <= 2
        ? "un weekend (2 giorni)"
        : touristPrefs.tripDays <= 3
        ? "un ponte lungo (3 giorni)"
        : touristPrefs.tripDays <= 7
        ? `${touristPrefs.tripDays} giorni`
        : "una vacanza lunga (10+ giorni)";

      touristContext = `
Dettagli viaggio turista:
- Mezzo di trasporto: ${transportLabels[touristPrefs.transport] || "auto"}
- Alloggio preferito: ${accomLabels[touristPrefs.accommodation] || "B&B"}
- Durata: ${daysLabel}
- Viaggia ${groupLabels[touristPrefs.groupSize] || "in coppia"}
- Data partenza: ${touristPrefs.targetDate || "non specificata"}
- ${touristPrefs.allowAbroad ? "Disponibile ad andare FUORI dall'Italia (suggerisci mete europee raggiungibili)." : "DEVE restare in ITALIA, non suggerire mete all'estero."}`;

      // Abroad + short trip warning — restrict AI
      if (touristPrefs.allowAbroad) {
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
    }

    const modeInstructions =
      mode === "tourist"
        ? `L'utente è un TURISTA. Cerca posti con valore storico, artistico o naturale: borghi nascosti, laghi poco conosciuti, abbazie, castelli dimenticati, siti archeologici minori, eremi, parchi naturali poco frequentati. EVITA le mete turistiche famose e mainstream (no Cinque Terre, no Amalfi, no Lago di Garda, no San Gimignano, ecc). Cerca le perle NASCOSTE che solo un locale conosce.${touristContext}`
        : `L'utente è un MOTOCICLISTA. Cerca passi di montagna, strade panoramiche con curve, valichi poco frequentati, strade provinciali spettacolari, percorsi con asfalto buono e alta tortuosità. Privilegia strade statali e provinciali, non autostrade. Includi valutazione qualità asfalto (1-5) e rating curve (1-5). EVITA i passi ultra-famosi (no Stelvio, no Sella, no Gardena). Cerca i passi e le strade SEGRETE che solo i motociclisti locali conoscono.${bikerContext}`;

    prompt = `Sei un esperto viaggiatore italiano che conosce ogni angolo nascosto d'Italia. L'utente si trova a coordinate (${lat}, ${lng}) e cerca una destinazione per una gita fuori porta entro ${radius} km.

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
  "directions": "Percorso stradale: prendi via X, poi SP45 direzione Y..."
}

${mode === "biker" ? 'Per i biker: "altitude" deve essere un numero (metri slm), "roadQuality" da 1 a 5, "curvinessRating" da 1 a 5.' : '"altitude", "roadQuality" e "curvinessRating" possono essere null per i turisti.'}
"hiddenGemRating" è da 1 a 5 dove 5 = posto segretissimo che quasi nessuno conosce.
"nearbyPlaces" deve avere 1-3 posti REALI dove mangiare/bere vicino alla destinazione.
"aiPlan" deve essere un piano completo e pratico per la giornata.
"directions" deve descrivere il percorso stradale con nomi di strade reali.`;
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
                    "Sei un assistente di viaggio italiano. Rispondi SOLO con JSON valido, senza markdown, senza commenti, senza testo prima o dopo il JSON.",
                },
                { role: "user", content: prompt },
              ],
              temperature: 1.1,
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
