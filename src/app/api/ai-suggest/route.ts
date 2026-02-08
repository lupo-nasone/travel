import { NextResponse } from "next/server";

interface AiSuggestRequest {
  lat: number;
  lng: number;
  radius: number;
  mode: "tourist" | "biker";
  excludeNames: string[];
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
    const { lat, lng, radius, mode, excludeNames } = body;

    const excludeList =
      excludeNames.length > 0
        ? `\n\nNON suggerire questi posti già visti dall'utente: ${excludeNames.join(", ")}.`
        : "";

    const modeInstructions =
      mode === "tourist"
        ? `L'utente è un TURISTA in auto. Cerca posti con valore storico, artistico o naturale: borghi nascosti, laghi poco conosciuti, abbazie, castelli dimenticati, siti archeologici minori, eremi, parchi naturali poco frequentati. EVITA le mete turistiche famose e mainstream (no Cinque Terre, no Amalfi, no Lago di Garda, no San Gimignano, ecc). Cerca le perle NASCOSTE che solo un locale conosce.`
        : `L'utente è un MOTOCICLISTA. Cerca passi di montagna, strade panoramiche con curve, valichi poco frequentati, strade provinciali spettacolari, percorsi con asfalto buono e alta tortuosità. Privilegia strade statali e provinciali, non autostrade. Includi valutazione qualità asfalto (1-5) e rating curve (1-5). EVITA i passi ultra-famosi (no Stelvio, no Sella, no Gardena). Cerca i passi e le strade SEGRETE che solo i motociclisti locali conoscono.`;

    const prompt = `Sei un esperto viaggiatore italiano che conosce ogni angolo nascosto d'Italia. L'utente si trova a coordinate (${lat}, ${lng}) e cerca una destinazione per una gita fuori porta entro ${radius} km.

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
  "aiReview": "Una mini-recensione personale in prima persona di 1-2 frasi, come se ci fossi stato. Esempio: 'Ci sono stato in un pomeriggio di ottobre e il silenzio era irreale. Il tramonto da lì sopra vale il viaggio.'"
}

${mode === "biker" ? 'Per i biker: "altitude" deve essere un numero (metri slm), "roadQuality" da 1 a 5, "curvinessRating" da 1 a 5.' : '"altitude", "roadQuality" e "curvinessRating" possono essere null per i turisti.'}
"hiddenGemRating" è da 1 a 5 dove 5 = posto segretissimo che quasi nessuno conosce.`;

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
              max_tokens: 1024,
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
