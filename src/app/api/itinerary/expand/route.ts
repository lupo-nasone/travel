import { NextResponse } from "next/server";

interface ExpandRequest {
  activity: {
    attivita: string;
    descrizione: string;
    luogo?: string;
    orario: string;
    tipo: string;
  };
  destinationName: string;
  destinationRegion: string;
  destinationLat: number;
  destinationLng: number;
  date?: string; // e.g. "Sabato 14 Febbraio"
}

const MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "gemma2-9b-it",
];

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
      return {
        link: `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
        linkLabel: "📍 Vedi su Google Maps",
      };
    case "visita":
      return {
        link: `https://www.google.com/search?q=${searchQuery}`,
        linkLabel: "🔎 Info e biglietti",
      };
    case "avventura":
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
      return {
        link: `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
        linkLabel: "🏨 Vedi su Maps",
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
    const body: ExpandRequest = await request.json();
    const { activity, destinationName, destinationRegion, date } = body;

    // Detect if the activity is vague/generic
    const vaguePatterns = [
      "esplora", "passeggia", "giro", "scopri", "visita il centro",
      "tempo libero", "relax", "zona", "dintorni", "a piacere",
      "mattinata libera", "pomeriggio libero", "serata libera",
      "walk", "stroll", "free time", "explore",
    ];
    const actLower = `${activity.attivita} ${activity.descrizione}`.toLowerCase();
    const isVague = vaguePatterns.some(p => actLower.includes(p));

    // Determine thematic category for coherent suggestions
    const tipoContext: Record<string, string> = {
      viaggio: "L'attività è un VIAGGIO/TRASPORTO (andata/ritorno). Suggerisci SOLO alternative di trasporto: altri orari dello stesso mezzo, mezzi diversi (treno vs auto vs aereo), compagnie alternative, route diverse. NON suggerire ristoranti o cose da fare — SOLO opzioni di viaggio.",
      trasporto: "L'attività è TRASPORTO locale. Suggerisci SOLO alternative per spostarsi: mezzi pubblici diversi, taxi, noleggio auto/moto, percorsi alternativi, orari diversi. NON suggerire attrazioni — SOLO modi per muoversi.",
      cibo: "L'attività è legata al CIBO. Suggerisci SOLO ristoranti, trattorie, street food, enoteche, bar o esperienze gastronomiche REALI nella zona. Ogni suggerimento deve essere un locale specifico con nome reale, specialità e indirizzo.",
      visita: "L'attività è una VISITA culturale. Suggerisci SOLO monumenti, musei, chiese, palazzi storici, siti archeologici o attrazioni culturali REALI nella stessa zona. Ogni suggerimento deve essere un luogo preciso con cosa vedere dentro.",
      avventura: "L'attività è AVVENTURA/outdoor. Suggerisci SOLO sentieri, trekking, sport, escursioni, punti panoramici o esperienze all'aperto REALI nella zona. Specifica difficoltà, durata e attrezzatura necessaria.",
      shopping: "L'attività è SHOPPING. Suggerisci SOLO negozi tipici, botteghe artigiane, mercati, outlet o vie dello shopping REALI nella zona. Specifica cosa si trova e prodotti tipici locali.",
      relax: "L'attività è RELAX. Suggerisci SOLO terme, spa, giardini, parchi, caffè panoramici, spiagge o luoghi tranquilli REALI nella zona dove rilassarsi.",
      "check-in": "L'attività è CHECK-IN in alloggio. Suggerisci SOLO alternative di alloggio nella stessa zona: altri hotel, B&B, agriturismi, ostelli con nome reale, indirizzo, fascia di prezzo e caratteristiche.",
      "check-out": "L'attività è CHECK-OUT. Suggerisci cosa fare DOPO il check-out prima di partire: deposito bagagli, ultimo giro in zona, colazione/pranzo veloce in posti vicini alla struttura.",
      tempo_libero: "L'attività è TEMPO LIBERO generico. Suggerisci cose CONCRETE da fare nella zona: un monumento da vedere, un locale dove mangiare qualcosa, un punto panoramico, un negozio tipico, un evento locale. Ogni opzione deve essere specifica e invitante.",
    };

    const thematicHint = tipoContext[activity.tipo] || tipoContext["tempo_libero"];

    const vagueHint = isVague
      ? `\n\nATTENZIONE: L'attività originale è MOLTO VAGA ("${activity.attivita}"). L'utente NON sa cosa fare. Devi dargli 5 idee CONCRETE e SPECIFICHE di cose da fare nella zona di ${activity.luogo || destinationName}. Non ripetere la vaghezza — digli ESATTAMENTE dove andare, cosa vedere, cosa mangiare. Come se fossi un amico del posto che gli dice "vai lì, fai questo".`
      : "";

    const eventHint = date
      ? `\n\nSe conosci EVENTI, SAGRE, MERCATI, MOSTRE o attività speciali che si tengono a ${destinationName} o nei dintorni in data ${date} o in quel periodo, includili come una delle opzioni (con tipo "tempo_libero" e specifica la data/orario dell'evento nella descrizione).`
      : "";

    const prompt = `Sei un LOCAL EXPERT di ${destinationName} (${destinationRegion}). Conosci ogni angolo, ogni ristorante, ogni vicolo, ogni segreto della zona.

L'utente ha questo nel suo itinerario${date ? ` (data: ${date})` : ""}:
- Attività: "${activity.attivita}"
- Descrizione: "${activity.descrizione}"
- Luogo: "${activity.luogo || "non specificato"}"
- Orario: "${activity.orario}"
- Tipo: "${activity.tipo}"

${thematicHint}
${vagueHint}
${eventHint}

Genera ESATTAMENTE 5 proposte CONCRETE che l'utente può scegliere. Le proposte devono essere:

1. **TEMATICAMENTE COERENTI** con l'attività originale:
   - Se l'originale è "cibo" → suggerisci altri posti dove mangiare/bere nella zona
   - Se è "visita" → suggerisci altri monumenti/musei vicini
   - Se è "esplora la zona" o "tempo libero" → suggerisci un MIX di cose concrete: un posto da vedere, un locale tipico, un punto panoramico, una chicca nascosta
   - Se è "avventura" → suggerisci altre esperienze outdoor simili

2. **ULTRA-SPECIFICHE**: niente "visita il centro storico". Dì "Entra nella Bottega di Mario in Via Cavour 12 e assaggia il loro pecorino stagionato — il migliore della zona"

3. **NELLA STESSA ZONA**: tutte raggiungibili a piedi o in pochi minuti dal luogo originale

4. **CON DETTAGLI PRATICI**: orari di apertura, cosa ordinare, quanto costa, perché vale la pena

5. **REALI e VERIFICABILI**: nomi di posti veri a ${destinationName}

Rispondi SOLO con JSON valido:
{
  "subActivities": [
    {
      "orario": "${activity.orario}",
      "attivita": "Nome SPECIFICO (es: 'Assaggia i pici al ragù da La Grotta')",
      "descrizione": "Perché andarci, cosa fare/vedere/ordinare, consigli da local",
      "luogo": "Indirizzo preciso (es: 'Trattoria La Grotta, Via della Ripa 2, Montepulciano')",
      "costo": "€XX o Gratis",
      "tipo": "visita|cibo|avventura|relax|shopping|tempo_libero"
    }
  ]
}

REGOLE FERREE:
- ESATTAMENTE 5 proposte
- OGNI proposta DEVE avere "luogo" compilato con nome + indirizzo/posizione
- I nomi devono essere REALI — niente nomi inventati
- Se il tipo originale è "cibo", TUTTE le proposte devono essere legate al cibo (altri ristoranti, bar, gelaterie, etc.)
- Se il tipo è generico/vago, proponi un MIX intelligente ma tutto nella stessa zona
- NON includere campi "link" o "linkLabel"
- Le attività devono far venire VOGLIA di farle`;

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
              temperature: 0.8,
              max_tokens: 2000,
              response_format: { type: "json_object" },
            }),
          }
        );

        if (!groqRes.ok) {
          const errData = await groqRes.json().catch(() => null);
          console.error(`Groq ${model} expand error:`, JSON.stringify(errData));
          continue;
        }

        const groqData = await groqRes.json();
        const content = groqData.choices?.[0]?.message?.content;

        if (!content) {
          console.warn(`Groq ${model}: no content`);
          continue;
        }

        const parsed = JSON.parse(content);

        if (!parsed.subActivities || !Array.isArray(parsed.subActivities) || parsed.subActivities.length === 0) {
          console.warn(`Groq ${model}: missing subActivities`);
          continue;
        }

        // Add links to each sub-activity
        for (const act of parsed.subActivities) {
          const generated = generateActivityLinks(
            act,
            destinationName,
            destinationRegion
          );
          act.link = generated.link;
          act.linkLabel = generated.linkLabel;
        }

        console.log(`✅ Espansione attività generata (${model}): ${parsed.subActivities.length} opzioni`);

        return NextResponse.json({ subActivities: parsed.subActivities });
      } catch (err) {
        console.error(`Groq ${model} expand error:`, err);
        continue;
      }
    }

    return NextResponse.json(
      { error: "Impossibile espandere l'attività. Riprova tra poco." },
      { status: 500 }
    );
  } catch (err) {
    console.error("Expand API error:", err);
    return NextResponse.json(
      { error: "Errore interno del server." },
      { status: 500 }
    );
  }
}
