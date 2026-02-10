import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY non configurata" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const {
      destination,
      dayNumber,
      currentDate,
      currentActivities,
      userRequest,
      budget,
      groupSize,
      interests,
    } = body;

    // Validation
    if (!destination || !dayNumber || !userRequest) {
      return NextResponse.json(
        { error: "Parametri mancanti: destination, dayNumber, userRequest" },
        { status: 400 }
      );
    }

    // Models to try with fallback
    const models = [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "gemma2-9b-it",
    ];

    const budgetLabels: Record<string, string> = {
      economico: "ECONOMICO (€0-50/gg) — street food, posti gratis, minimizza costi",
      medio: "MEDIO (€50-100/gg) — ristoranti normali, qualche ingresso",
      comfort: "COMFORT (€100-200/gg) — ristoranti buoni, esperienze di qualità",
      lusso: "LUSSO (€200+/gg) — ristoranti top, nessun limite",
    };

    const groupLabels: Record<string, string> = {
      solo: "da solo",
      coppia: "in coppia",
      famiglia: "in famiglia (con bambini)",
      gruppo: "in gruppo di amici",
    };

    const currentActivitiesText = currentActivities
      ? `\n\nATTIVITÀ ATTUALI DEL GIORNO ${dayNumber}:\n${JSON.stringify(currentActivities, null, 2)}\n\nUSA QUESTE come riferimento se l'utente vuole modifiche parziali, altrimenti RIGENERALE completamente.`
      : "";

    const interestsText = interests && interests.length > 0
      ? `\nInteressi dell'utente: ${interests.join(", ")}`
      : "";

    const prompt = `Sei un esperto travel planner italiano. L'utente sta visitando "${destination}" e vuole RISCHEDULARE il GIORNO ${dayNumber} del suo itinerario.

CONTESTO:
- Destinazione: ${destination}
- Giorno da rischedulare: GIORNO ${dayNumber} (${currentDate || "data non specificata"})
- Budget: ${budgetLabels[budget] || "medio"}
- Viaggia: ${groupLabels[groupSize] || "in coppia"}${interestsText}${currentActivitiesText}

RICHIESTA DELL'UTENTE:
"${userRequest}"

ISTRUZIONI:
1. Analizza la richiesta dell'utente:
   - Se chiede "più festaiolo": aggiungi bar, pub, locali notturni, aperitivi, musica dal vivo
   - Se chiede "più relax": spa, parchi, caffetterie tranquille, passeggiate, lettura in giardini
   - Se chiede "più culturale": musei, gallerie, monumenti storici, chiese, tour guidati
   - Se chiede "più avventura": escursioni, sport, attività outdoor, esperienze adrenaliniche
   - Se chiede "più cibo": food tour, mercati, cooking class, ristoranti tipici, degustazioni
   - Se chiede "meno pieno": riduci attività, aggiungi pause relax, tempo libero
   - Se chiede "più pieno": aggiungi attività extra, ottimizza i tempi
   - Interpreta liberamente qualsiasi altra richiesta

2. Genera un NUOVO piano per il GIORNO ${dayNumber} con:
   - **10-14 ATTIVITÀ** distribuite dalle 07:00/08:00 alle 22:00/23:00
   - Ogni attività DEVE avere:
     * orario preciso (es: "09:00 - 10:30")
     * nome attività
     * descrizione dettagliata (3-4 frasi)
     * luogo con indirizzo specifico
     * costo stimato (es: "€15 a persona" o "Gratis")
     * tipo: visita|cibo|avventura|relax|shopping|trasporto|check-in|check-out|tempo_libero
     * link: URL Google Maps (https://maps.google.com/?q=NOME+LUOGO+CITTÀ) o sito ufficiale
     * linkLabel: "Apri su Maps" o "Sito ufficiale"
   
   - INCLUDI SEMPRE:
     * Colazione (bar/caffetteria REALE con nome)
     * Spuntino metà mattina
     * Pranzo (ristorante/trattoria REALE)
     * Pausa caffè pomeriggio
     * Aperitivo o merenda
     * Cena (ristorante REALE con specialità)
     * Dopocena (bar, pub, passeggiata)
   
   - SUGGERISCI SOLO POSTI REALI:
     * Nomi completi di ristoranti, bar, musei, monumenti
     * Indirizzi specifici (via, piazza, numero civico quando possibile)
     * Link Google Maps per ogni luogo

3. Rispetta il BUDGET e il TIPO DI GRUPPO (${groupLabels[groupSize]})

4. Mantieni coerenza con il giorno ${dayNumber} (se è primo giorno include check-in, se ultimo include check-out)

FORMATO OUTPUT (OBBLIGATORIO — VALIDO JSON):
Rispondi con UN SINGOLO oggetto JSON, senza markdown, senza \`\`\`, senza testo extra.

{
  "giorno": ${dayNumber},
  "titolo": "Titolo descrittivo del giorno (es: 'Festa e divertimento notturno')",
  "data": "${currentDate || "Data non specificata"}",
  "attivita": [
    {
      "orario": "08:00 - 09:00",
      "attivita": "Colazione al Bar Centrale",
      "descrizione": "Inizia la giornata con una colazione italiana autentica al Bar Centrale, locale storico del centro. Cornetto caldo e cappuccino al bancone, guardando la piazza svegliarsi. Ottimo punto di partenza per la giornata.",
      "luogo": "Via Roma 15, Centro Storico",
      "costo": "€5 a persona",
      "tipo": "cibo",
      "link": "https://maps.google.com/?q=Bar+Centrale+${destination.replace(/ /g, "+")}",
      "linkLabel": "Apri su Maps"
    }
  ],
  "consiglioGiorno": "Consiglio utile specifico per questo giorno ripianificato"
}

Genera SOLO il JSON, senza altro testo.`;

    console.log(`🔄 Rischedulo giorno ${dayNumber} per ${destination} con richiesta: "${userRequest}"`);

    let responseText = "";
    let lastError: Error | null = null;

    // Try each model with fallback
    for (const model of models) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.9, // Più alto per più creatività
            max_tokens: 8000,
            response_format: { type: "json_object" },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const errorMsg = errorData?.error?.message || response.statusText;
          
          // If rate limit, try next model
          if (response.status === 429) {
            console.warn(`⚠️ Rate limit su ${model}, provo il successivo...`);
            lastError = new Error(`Rate limit: ${errorMsg}`);
            continue;
          }
          
          throw new Error(`Errore Groq API (${response.status}): ${errorMsg}`);
        }

        const data = await response.json();
        responseText = data?.choices?.[0]?.message?.content?.trim() || "";
        
        if (!responseText) {
          throw new Error("Risposta vuota da Groq");
        }

        // Success! Break the loop
        console.log(`✅ Giorno ${dayNumber} rischedulato con modello: ${model}`);
        break;
      } catch (error: any) {
        console.error(`❌ Errore con ${model}:`, error.message);
        lastError = error;
        
        // If it's not a rate limit, throw immediately
        if (!error.message.includes("Rate limit") && !error.message.includes("429")) {
          throw error;
        }
      }
    }

    // If we exhausted all models
    if (!responseText && lastError) {
      throw lastError;
    }

    if (!responseText) {
      throw new Error("Tutti i modelli hanno fallito");
    }

    // Parse JSON
    const newDay = JSON.parse(responseText);

    console.log(`✅ Giorno ${dayNumber} rischedulato: ${newDay.attivita?.length || 0} attività`);

    return NextResponse.json(newDay);
  } catch (error: any) {
    console.error("❌ Errore rischedulo giorno:", error);
    return NextResponse.json(
      { error: error.message || "Errore nella rischedulo del giorno" },
      { status: 500 }
    );
  }
}
