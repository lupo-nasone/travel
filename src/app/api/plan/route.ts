import { NextResponse } from "next/server";

interface PlanRequest {
  destination: string;
  departureFrom: string;
  startDate: string;
  tripDays: number;
  transport: "auto" | "treno" | "aereo" | "moto";
  accommodation: "hotel" | "bnb" | "campeggio" | "casa_amici";
  wantsStops: boolean;
  interests: string[];
  budget: "economico" | "medio" | "comfort" | "lusso";
  groupSize: "solo" | "coppia" | "famiglia" | "gruppo";
  freeText?: string;
  userLat?: number;
  userLng?: number;
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
    const body: PlanRequest = await request.json();
    const {
      destination,
      departureFrom,
      startDate,
      tripDays,
      transport,
      accommodation,
      wantsStops,
      interests,
      budget,
      groupSize,
      freeText,
    } = body;

    // Models to try with fallback
    const models = [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "gemma2-9b-it",
    ];

    // Build the prompt
    const transportLabels: Record<string, string> = {
      auto: "AUTO — calcola percorso, soste interessanti, pedaggi, parcheggi",
      treno: "TRENO — trova stazioni, orari realistici, cambi, prezzi",
      aereo: "AEREO — trova aeroporti, voli realistici, compagnie, transfer",
      moto: "MOTO — curve panoramiche, strade secondarie, soste strategiche",
    };

    const accomLabels: Record<string, string> = {
      hotel: "HOTEL — suggerisci hotel reali nella zona, range di prezzi",
      bnb: "B&B o AIRBNB — suggerisci quartieri dove cercare, prezzi medi",
      campeggio: "CAMPEGGIO — trova campeggi reali nella zona, servizi, prezzi",
      casa_amici: "CASA DI AMICI/FAMIGLIA — nessun alloggio da cercare, ma suggerisci zona dove cenare fuori",
    };

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

    const interestsText = interests.length > 0
      ? `Interessi principali: ${interests.join(", ")}`
      : "Nessun interesse specifico — proponi un mix equilibrato";

    const stopsText = wantsStops
      ? "L'utente VUOLE fare soste lungo il percorso — suggerisci 2-3 tappe interessanti (borghi, panorami, curiosità) sul tragitto tra partenza e destinazione."
      : "L'utente vuole andare DIRETTO alla destinazione — nessuna sosta intermedia.";

    const freeTextSection = freeText ? `\n\nNOTE DELL'UTENTE:\n"${freeText}"\n→ RISPETTA QUESTE RICHIESTE nella pianificazione!` : "";

    const prompt = `Sei un esperto travel planner italiano. L'utente vuole andare a "${destination}" e ha bisogno di aiuto per organizzare il viaggio.

DETTAGLI VIAGGIO:
- DESTINAZIONE: ${destination}
- PARTENZA DA: ${departureFrom}
- DATA PARTENZA: ${startDate}
- DURATA: ${tripDays} giorn${tripDays === 1 ? "o" : "i"}
- MEZZO DI TRASPORTO: ${transportLabels[transport]}
- ALLOGGIO: ${accomLabels[accommodation]}
- BUDGET: ${budgetLabels[budget]}
- VIAGGIA: ${groupLabels[groupSize]}
- ${interestsText}
- ${stopsText}${freeTextSection}

ISTRUZIONI (OBBLIGATORIE):

1. **VIAGGIO ANDATA**:
   ${transport === "auto" || transport === "moto" ? `
   - Calcola il percorso stradale da "${departureFrom}" a "${destination}"
   - Stima distanza (km), tempo di viaggio, pedaggi (se presenti), costo carburante
   - Se wantsStops=true: suggerisci 2-3 soste interessanti lungo il percorso (borghi, panorami, pause caffè)
   - Orario partenza consigliato (es: "Partenza ore 08:00")
   - Per MOTO: preferisci strade panoramiche, evita autostrade quando possibile, segnala curve famose
   ` : transport === "treno" ? `
   - Trova la stazione di partenza più vicina a "${departureFrom}"
   - Trova la stazione di arrivo più vicina a "${destination}"
   - Suggerisci un treno REALE (Trenitalia Regionale, Frecciarossa, Italo, ecc.)
   - Specifica: compagnia, tipo treno, orario plausibile (es: "09:30 - 12:45"), durata, prezzo stimato
   - Se servono CAMBI: indica ogni cambio (stazione, tempo attesa, treno successivo)
   - Consigli per prenotare (trenitalia.it, italotreno.it)
   ` : transport === "aereo" ? `
   - Trova l'aeroporto di partenza più vicino a "${departureFrom}"
   - Trova l'aeroporto di arrivo più vicino a "${destination}"
   - Suggerisci un volo REALE (Ryanair, easyJet, ITA Airways, Vueling, ecc.)
   - Specifica: compagnia, rotta, orario tipo, durata, prezzo stimato
   - Come raggiungere la destinazione finale dall'aeroporto (bus, treno, taxi)
   - Consigli per prenotare (skyscanner.it, siti compagnie)
   ` : ""}

2. **ALLOGGIO** (FONDAMENTALE — CERCA STRUTTURE REALI):
   ${accommodation === "hotel" ? `
   - CERCA e suggerisci 3-4 HOTEL REALI specifici a "${destination}" nel budget ${budget}
   - Per ogni hotel: NOME COMPLETO, indirizzo esatto, zona/quartiere, stelle (se applicabile)
   - Servizi offerti (wifi, colazione, parcheggio, spa, piscina, ecc.)
   - Prezzo indicativo per notte (range min-max)
   - Link a booking.com o sito ufficiale dell'hotel
   - Distanza dal centro e dai punti di interesse principali
   - Recensioni generali (es: "Ottimo rapporto qualità-prezzo, 4.2★ su Booking")
   ` : accommodation === "bnb" ? `
   - Identifica 3-4 QUARTIERI SPECIFICI di "${destination}" ideali per B&B/Airbnb
   - Per ogni quartiere: nome, caratteristiche, atmosfera, servizi zona
   - Prezzo medio a notte per ${groupSize} (range)
   - Pro e contro di ogni quartiere
   - Link di ricerca Airbnb o Booking per quella zona
   - Suggerisci 2-3 B&B REALI se li conosci (nome completo, via, prezzo)
   ` : accommodation === "campeggio" ? `
   - CERCA 3-4 CAMPEGGI REALI vicino a "${destination}"
   - Per ogni campeggio: NOME COMPLETO, indirizzo, distanza dal centro
   - Servizi: piazzole, bungalow, elettricità, bagni, docce, wi-fi, ristorante, piscina
   - Prezzo indicativo per notte (per ${groupSize})
   - Periodo di apertura e consigli prenotazione
   - Link sito ufficiale o contatti
   ` : accommodation === "casa_amici" ? `
   - L'utente dorme da amici/famiglia — non serve cercare alloggio
   - Suggerisci invece 3-4 RISTORANTI/TRATTORIE REALI nella zona per cene fuori
   - Per ogni ristorante: nome, cucina, prezzo medio, specialità
   ` : ""}

3. **ITINERARIO GIORNO PER GIORNO** (COMPLETO E DETTAGLIATO):
   - Pianifica OGNI giorno dal giorno 1 al giorno ${tripDays}
   - Per ogni giorno: titolo descrittivo, data (calcola da ${startDate}), **10-14 ATTIVITÀ**
   - RIEMPI COMPLETAMENTE LA GIORNATA dalle 07:00/08:00 fino alle 22:00/23:00
   - Ogni attività DEVE avere: orario preciso, nome, descrizione dettagliata (3-4 frasi), luogo con indirizzo specifico, costo stimato, tipo
   - **OBBLIGATORIO includere**:
     * Colazione (bar/caffetteria REALE con nome e via)
     * Spuntino metà mattina (gelateria, pasticceria, ecc.)
     * Pranzo (ristorante/trattoria REALE con specialità)
     * Pausa caffè pomeriggio (bar, locale tipico)
     * Aperitivo/merenda pomeridiana
     * Cena (ristorante REALE con cucina e piatti consigliati)
     * Dopocena (bar, pub, passeggiata serale)
   - **ATTIVITÀ tra i pasti**:
     * Visite a monumenti, chiese, musei (con orari apertura REALI)
     * Passeggiate in quartieri specifici (nomi vie/piazze)
     * Parchi, giardini, panorami
     * Shopping in vie/mercati specifici
     * Esperienze locali (degustazioni, tour, laboratori)
     * Relax strategico (panchine panoramiche, giardini pubblici)
   - Suggerisci SOLO posti REALI: nomi completi, indirizzi, descrizioni accurate
   - Per OGNI attività: aggiungi link Google Maps (formato: https://maps.google.com/?q=NOME+LUOGO+CITTÀ) o sito ufficiale
   - Distribuisci le attività in modo intelligente: mattina energica, pomeriggio più rilassato, sera vivace
   - Tieni conto degli interessi dell'utente e del budget
   - Ultimo giorno: prevedi check-out alloggio e preparazione per viaggio di ritorno

4. **EVENTI LOCALI**:
   - Cerca eventi/sagre/festival/concerti/mostre che si svolgono a "${destination}" nelle date del viaggio (${startDate}, ${tripDays} giorni)
   - Se trovi eventi interessanti, inseriscili nell'itinerario nei giorni giusti

5. **VIAGGIO RITORNO**:
   - Pianifica il viaggio di ritorno da "${destination}" a "${departureFrom}"
   - Stesso mezzo di trasporto dell'andata
   - Orario partenza consigliato dall'ultimo giorno
   - Stima arrivo a casa

6. **COSA PORTARE**:
   - Lista di 8-12 cose specifiche da mettere in valigia
   - Dividi per categoria: abbigliamento (considerando meteo ${startDate}), accessori tech, documenti, medicinali/igiene, attrezzatura specifica per attività
   - Sii SPECIFICO: non dire "vestiti comodi" ma "scarpe da trekking, giacca impermeabile, cappello da sole"

7. **CONSIGLI GENERALI**:
   - 4-6 consigli CONCRETI e utili per il viaggio
   - Include: quando prenotare (alloggio, trasporti), cosa evitare, trucchi locali, app utili, numeri emergenza, orari negozi/musei tipici
   - Consigli su trasporti locali (bus, metro, bike sharing specifici di ${destination})

8. **COSTI TOTALI** (DETTAGLIATI):
   - Stima REALISTICA dei costi totali per ${groupSize}
   - Breakdown dettagliato:
     * Trasporto: andata + ritorno + trasporti locali + parcheggi/carburante
     * Alloggio: numero notti × prezzo medio
     * Cibo: colazioni + pranzi + cene + spuntini (stima per giorno × giorni)
     * Attività e ingressi: somma biglietti musei/attrazioni
     * Shopping e extra: budget suggerito
     * Margine imprevisti: 10-15% del totale
   - Indica chiaramente se è PER PERSONA o TOTALE GRUPPO

FORMATO OUTPUT (OBBLIGATORIO — VALIDO JSON):
Rispondi con UN SINGOLO oggetto JSON valido, senza markdown, senza \`\`\`, senza testo extra.

{
  "riepilogo": "Breve summary del viaggio (1 frase)",
  "viaggioAndata": {
    "partenza": "Orario/luogo partenza",
    "mezzo": "Descrizione mezzo (es: Auto via A1, Treno Frecciarossa 9320, Volo Ryanair FR1234)",
    "arrivo": "Orario/luogo arrivo",
    "note": "Dettagli aggiuntivi (soste, cambi, ecc)"
  },
  "giorni": [
    {
      "giorno": 1,
      "titolo": "es: Arrivo e primo giro",
      "data": "Sabato 15 Febbraio",
      "attivita": [
        {
          "orario": "09:00 - 10:30",
          "attivita": "Nome attività",
          "descrizione": "Descrizione dettagliata cosa fare",
          "luogo": "Indirizzo o zona specifica",
          "costo": "€10 a persona o Gratis",
          "tipo": "visita|cibo|avventura|relax|shopping|trasporto|check-in|check-out|tempo_libero",
          "link": "URL Google Maps o sito ufficiale",
          "linkLabel": "Apri su Maps | Sito ufficiale | ecc"
        }
      ],
      "consiglioGiorno": "Tip utile per la giornata"
    }
  ],
  "viaggioRitorno": {
    "partenza": "Orario/luogo partenza ritorno",
    "mezzo": "Descrizione mezzo ritorno",
    "arrivo": "Orario arrivo a casa",
    "note": "Note ritorno"
  },
  "alloggioSuggerito": {
    "tipo": "hotel|bnb|campeggio|casa_amici",
    "suggerimenti": [
      {
        "nome": "Nome struttura o zona",
        "descrizione": "Dettagli, servizi, perché è consigliato",
        "prezzo": "Prezzo indicativo a notte",
        "link": "URL prenotazione se disponibile"
      }
    ]
  },
  "cosaDaPortare": ["Abbigliamento comodo", "Documenti", "..."],
  "consigliGenerali": "Consigli utili e trucchi per il viaggio",
  "costiTotali": {
    "trasporto": { "descrizione": "Dettagli", "costo": 150 },
    "alloggio": { "descrizione": "Dettagli", "costo": 200 },
    "cibo": { "descrizione": "Dettagli", "costo": 120 },
    "attivita": { "descrizione": "Dettagli", "costo": 80 },
    "altro": { "descrizione": "Dettagli", "costo": 50 },
    "totale": 600,
    "nota": "Costi totali per coppia"
  }
}

Genera SOLO il JSON, senza altro testo.`;

    console.log("🗺️ Genero piano di viaggio per:", destination);

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
            temperature: 0.8,
            max_tokens: 16000,
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
        console.log(`✅ Risposta ottenuta con modello: ${model}`);
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
    const planData = JSON.parse(responseText);

    console.log(`✅ Piano generato per ${destination}: ${planData.giorni?.length || 0} giorni`);

    return NextResponse.json(planData);
  } catch (error: any) {
    console.error("❌ Errore generazione piano:", error);
    return NextResponse.json(
      { error: error.message || "Errore nella generazione del piano" },
      { status: 500 }
    );
  }
}
