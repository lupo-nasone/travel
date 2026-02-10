import { NextResponse } from "next/server";

interface EventsRequest {
  destinationName: string;
  destinationRegion: string;
  destinationLat: number;
  destinationLng: number;
  date: string;       // e.g. "2025-02-14" or "Sabato 14 Febbraio"
  month?: string;     // e.g. "Febbraio"
  tripDays?: number;  // how many days the trip lasts
}

const MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "gemma2-9b-it",
];

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY non configurata." },
      { status: 500 }
    );
  }

  try {
    const body: EventsRequest = await request.json();
    const { destinationName, destinationRegion, date, month, tripDays } = body;

    const dateContext = month
      ? `nel mese di ${month}`
      : tripDays && tripDays > 1
      ? `a partire dal ${date} per ${tripDays} giorni`
      : `il giorno ${date}`;

    const prompt = `Sei un esperto di eventi e cultura italiana. L'utente sta pianificando un viaggio a "${destinationName}" (${destinationRegion}) ${dateContext}.

Trova e suggerisci 6-8 EVENTI, SAGRE, MERCATI, FESTIVAL, CONCERTI, MOSTRE o attività speciali che si tengono a ${destinationName} e nei dintorni in quel periodo.

IMPORTANTE:
- Includi eventi REALI e TIPICI della zona (sagre locali, mercati settimanali, festival annuali, mostre permanenti, etc.)
- Se non conosci eventi specifici per quella data esatta, suggerisci eventi RICORRENTI/TIPICI della stagione e della zona
- Specifica chiaramente se un evento è ricorrente (es: "ogni sabato") o stagionale (es: "da giugno a settembre")
- Includi anche mercati rionali, mercatini dell'antiquariato, eventi enogastronomici tipici
- Per la zona di ${destinationName}, considera anche eventi nei paesi limitrofi (entro 30km)

Rispondi SOLO con JSON valido:
{
  "events": [
    {
      "nome": "Nome dell'evento (es: 'Sagra del Cinghiale di Suvereto')",
      "descrizione": "Descrizione dettagliata: cosa aspettarsi, perché andarci, atmosfera",
      "data": "Quando si tiene (es: 'Ogni primo weekend di Dicembre' o '14-16 Febbraio 2025')",
      "luogo": "Luogo preciso (es: 'Piazza dei Giudici, Suvereto')",
      "orario": "Orario (es: '19:00 - 23:00' o 'Tutto il giorno')",
      "costo": "Costo (es: 'Ingresso libero' o '€5 ingresso')",
      "tipo": "festival|mercato|concerto|sagra|mostra|sport|teatro|fiera|altro"
    }
  ],
  "nota": "Nota generale sugli eventi nella zona in questo periodo"
}

REGOLE:
- Minimo 4, massimo 8 eventi
- OGNI evento DEVE avere il campo "luogo" compilato
- I tipi validi sono: festival, mercato, concerto, sagra, mostra, sport, teatro, fiera, altro
- Privilegia eventi locali e autentici, non troppo turistici
- NON includere campi "link" o "linkLabel"`;

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
                  content: "Sei un esperto di eventi e cultura locale italiana. Rispondi SOLO con JSON valido, senza testo aggiuntivo, commenti o markdown.",
                },
                { role: "user", content: prompt },
              ],
              temperature: 0.8,
              max_tokens: 2500,
              response_format: { type: "json_object" },
            }),
          }
        );

        if (!groqRes.ok) {
          const errData = await groqRes.json().catch(() => null);
          console.error(`Groq ${model} events error:`, JSON.stringify(errData));
          continue;
        }

        const groqData = await groqRes.json();
        const content = groqData.choices?.[0]?.message?.content;

        if (!content) {
          console.warn(`Groq ${model}: no content`);
          continue;
        }

        const parsed = JSON.parse(content);

        if (!parsed.events || !Array.isArray(parsed.events) || parsed.events.length === 0) {
          console.warn(`Groq ${model}: missing events`);
          continue;
        }

        // Add search links to each event
        for (const evt of parsed.events) {
          const searchQuery = encodeURIComponent(`${evt.nome} ${destinationName} ${destinationRegion}`);
          evt.link = `https://www.google.com/search?q=${searchQuery}`;
        }

        console.log(`✅ Eventi generati (${model}): ${parsed.events.length} eventi`);

        return NextResponse.json({
          events: parsed.events,
          nota: parsed.nota || null,
        });
      } catch (err) {
        console.error(`Groq ${model} events error:`, err);
        continue;
      }
    }

    return NextResponse.json(
      { error: "Impossibile trovare eventi. Riprova tra poco." },
      { status: 500 }
    );
  } catch (err) {
    console.error("Events API error:", err);
    return NextResponse.json(
      { error: "Errore interno del server." },
      { status: 500 }
    );
  }
}
