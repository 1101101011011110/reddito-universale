/*
 * Parametri del simulatore.
 * Tutte le cifre sono stime approssimative da verificare con i dati ufficiali
 * (ISTAT, MEF, INPS). Modificare qui per aggiornare il simulatore.
 */
const PARAMS = {
  versione: '0.1',
  aggiornato: 'novembre 2026',

  // Importo pieno mensile del reddito universale (cursore)
  importoPieno: { default: 500, min: 100, max: 1000, step: 10 },

  // Le aliquote aggiuntive qui sotto valgono per questo importo pieno.
  // Per importi diversi vengono scalate in proporzione (es. 300 € -> metà aliquote).
  importoRiferimento: 600,

  // Quota dell'importo pieno spettante ai pensionati
  quotaPensionati: 0.5,

  // Minorenni: quota lineare da quotaNascita (0 anni) a 1 (18 anni)
  minori: { quotaNascita: 0.25, etaMaggiore: 18 },

  // Fasce dell'aliquota aggiuntiva sul reddito lordo individuale.
  // "fino" = limite superiore della fascia in euro annui; null = nessun limite.
  fasce: [
    { fino: 15000, aliquota: 0.15 },
    { fino: 50000, aliquota: 0.25 },
    { fino: null, aliquota: 0.35 }
  ],

  // Raccolta opinioni: modulo Google, le risposte finiscono nel foglio collegato.
  // Gli ID "entry.*" si leggono dal codice della pagina del modulo.
  feedback: {
    action: 'https://docs.google.com/forms/d/e/1FAIpQLScNiV6_W62up1K4qegWmNkwi_qDuLFix2kdisGmo_Z1X-lrdQ/formResponse',
    campoVoto: 'entry.1532150670',     // "Sosterresti questa proposta?" (valori: Sì / No)
    campoCommento: 'entry.1024408574'  // "Commento"
  },

  // Quadro nazionale (stime)
  macro: {
    adulti: 35e6,               // adulti in età da lavoro
    minori: 9e6,                // minorenni
    pensionati: 14e6,           // pensionati
    assistenzaSostituita: 45e9, // assegno unico, ADI, assegno sociale, integrazioni al minimo (40-50 mld)
    baseImponibile: 1150e9      // IRPEF ~950 + forfettari ~50 + cedolare secca ~50 + rendite finanziarie ~90
  }
};
