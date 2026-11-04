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
| `ricadute.html` | Possibili effetti sulla società ed evidenze delle sperimentazioni |
| `metodologia.html` | Ipotesi, formule e fonti |

## Provarlo in locale

Apri `index.html` nel browser.

## Aggiornare i parametri

Modifica `params.js`. Le aliquote delle fasce valgono per `importoRiferimento` (600 €) e vengono scalate in proporzione all'importo scelto con il cursore.

## Pubblicazione

Il sito è pubblicato con GitHub Pages dal branch `main`, cartella `/ (root)`. Ogni push su `main` aggiorna il sito.

GitHub Pages fa tenere i file in cache ai browser per circa 10 minuti. Quando modifichi `app.js`, `params.js` o `style.css`, aumenta il numero `?v=` nei link delle pagine HTML e `versione` in `params.js`. Così i visitatori scaricano subito i file nuovi.
