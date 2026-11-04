# Simulatore reddito universale

Calcola, per un nucleo familiare, il saldo tra il reddito universale che riceverebbe e le tasse aggiuntive che pagherebbe per finanziarlo.

È un sito statico, senza dipendenze né build. Tutti i calcoli avvengono nel browser e nessun dato viene inviato.

## File

| File | Contenuto |
| --- | --- |
| `index.html` | Modulo dei dati e risultati |
| `style.css` | Grafica, con tema chiaro e scuro |
| `app.js` | Logica di calcolo e interfaccia |
| `params.js` | Parametri: importi, quote, fasce, quadro nazionale |
| `metodologia.html` | Ipotesi, formule e fonti |

## Provarlo in locale

Apri `index.html` nel browser.

## Aggiornare i parametri

Modifica `params.js`. Le aliquote delle fasce valgono per `importoRiferimento` (600 €) e vengono scalate in proporzione all'importo scelto con il cursore.

## Pubblicazione

Il sito è pubblicato con GitHub Pages dal branch `main`, cartella `/ (root)`. Ogni push su `main` aggiorna il sito.
