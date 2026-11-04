/*
 * Simulatore del reddito universale.
 * Tutti i calcoli avvengono nel browser: nessun dato viene inviato o salvato.
 */
(function () {
  'use strict';

  var P = PARAMS;

  // ---------- Formattazione ----------
  // useGrouping 'always': in italiano anche i numeri a 4 cifre hanno il separatore (9.500)
  var fmtEur = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always' });
  function eur(v) { return fmtEur.format(Math.round(v) || 0); }
  function eurSegno(v) { var r = Math.round(v) || 0; return (r > 0 ? '+' : '') + fmtEur.format(r); }
  function pct(v) { return (v * 100).toLocaleString('it-IT', { maximumFractionDigits: 1 }) + '%'; }
  function mld(v) { return (v / 1e9).toLocaleString('it-IT', { maximumFractionDigits: 0, useGrouping: 'always' }) + ' mld €'; }
  function mln(v) { return (v / 1e6).toLocaleString('it-IT', { maximumFractionDigits: 0 }) + ' mln'; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function num(v) { var n = parseFloat(String(v).replace(',', '.')); return isFinite(n) && n > 0 ? n : 0; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---------- Dati ----------
  var REDDITI = [
    ['dipendente', 'Lavoro dipendente'],
    ['pensione', 'Pensione'],
    ['autonomo', 'Autonomo ordinario'],
    ['forfettario', 'Forfettario'],
    ['affitti', 'Affitti (cedolare secca)'],
    ['rendite', 'Rendite finanziarie']
  ];
  var SUSSIDI = [
    ['assegnoUnico', 'Assegno unico per i figli'],
    ['adi', 'Assegno di inclusione'],
    ['assegnoSociale', 'Assegno sociale'],
    ['integrazione', 'Integrazione al minimo']
  ];
  var TIPI = { adulto: 'Adulto', pensionato: 'Pensionato', minore: 'Minorenne' };

  function membro(tipo, redditi, eta) {
    var m = { tipo: tipo, eta: tipo === 'minore' ? (eta == null ? 6 : eta) : null, redditi: {} };
    REDDITI.forEach(function (r) { m.redditi[r[0]] = (redditi && redditi[r[0]]) || 0; });
    return m;
  }
  function sussidi(v) {
    var s = {};
    SUSSIDI.forEach(function (r) { s[r[0]] = (v && v[r[0]]) || 0; });
    return s;
  }
  function paramsDefault() {
    return {
      importo: P.importoPieno.default,
      quotaPensionati: P.quotaPensionati,
      quotaNascita: P.minori.quotaNascita,
      fasce: P.fasce.map(function (f) { return { fino: f.fino, aliquota: f.aliquota }; })
    };
  }

  var ESEMPI = {
    single: function () { return { membri: [membro('adulto', { dipendente: 25000 })], sussidi: sussidi() }; },
    famiglia: function () {
      return {
        membri: [
          membro('adulto', { dipendente: 32000 }),
          membro('adulto', { dipendente: 18000 }),
          membro('minore', null, 4),
          membro('minore', null, 10)
        ],
        sussidi: sussidi({ assegnoUnico: 220 })
      };
    },
    pensionato: function () {
      return { membri: [membro('pensionato', { pensione: 9000 })], sussidi: sussidi({ integrazione: 150 }) };
    },
    alto: function () {
      return { membri: [membro('adulto', { autonomo: 90000, rendite: 10000 })], sussidi: sussidi() };
    }
  };

  var stato = ESEMPI.single();
  stato.params = paramsDefault();

  // ---------- Calcoli ----------
  function fattore(p) { return p.importo / P.importoRiferimento; }
  function aliquotaEffettiva(f, p) { return clamp(f.aliquota * fattore(p), 0, 1); }

  function tassaAggiuntiva(reddito, p) {
    var t = 0, prec = 0;
    for (var i = 0; i < p.fasce.length; i++) {
      var f = p.fasce[i];
      var sup = f.fino == null ? Infinity : f.fino;
      if (reddito > prec) t += (Math.min(reddito, sup) - prec) * aliquotaEffettiva(f, p);
      prec = sup;
    }
    return t;
  }

  function quota(m, p) {
    if (m.tipo === 'adulto') return 1;
    if (m.tipo === 'pensionato') return p.quotaPensionati;
    var eta = clamp(m.eta || 0, 0, P.minori.etaMaggiore - 1);
    return p.quotaNascita + (1 - p.quotaNascita) * eta / P.minori.etaMaggiore;
  }

  function redditoTotale(m) {
    return REDDITI.reduce(function (s, r) { return s + (m.redditi[r[0]] || 0); }, 0);
  }

  function calcola(st, p) {
    p = p || st.params;
    var righe = st.membri.map(function (m) {
      var reddito = m.tipo === 'minore' ? 0 : redditoTotale(m);
      var q = quota(m, p);
      var ru = p.importo * q * 12;
      var tassa = tassaAggiuntiva(reddito, p);
      return { m: m, reddito: reddito, quota: q, ru: ru, tassa: tassa, saldo: ru - tassa };
    });
    var sussidiPersi = SUSSIDI.reduce(function (s, r) { return s + (st.sussidi[r[0]] || 0); }, 0) * 12;
    var entrate = righe.reduce(function (s, r) { return s + r.ru; }, 0);
    var tasse = righe.reduce(function (s, r) { return s + r.tassa; }, 0);
    return { righe: righe, entrate: entrate, tasse: tasse, sussidiPersi: sussidiPersi, saldo: entrate - tasse - sussidiPersi };
  }

  // Reddito lordo a cui un adulto single senza sussidi va in pareggio
  function pareggioSingle(p) {
    var obiettivo = p.importo * 12;
    if (tassaAggiuntiva(1e8, p) < obiettivo) return null;
    var lo = 0, hi = 1e8;
    for (var i = 0; i < 80; i++) {
      var mid = (lo + hi) / 2;
      if (tassaAggiuntiva(mid, p) < obiettivo) lo = mid; else hi = mid;
    }
    return hi;
  }

  function quadroNazionale(p) {
    var M = P.macro, somma = 0, n = P.minori.etaMaggiore;
    for (var e = 0; e < n; e++) somma += quota({ tipo: 'minore', eta: e }, p);
    var quotaMediaMinori = somma / n;
    var adulti = M.adulti * p.importo * 12;
    var minori = M.minori * quotaMediaMinori * p.importo * 12;
    var pensionati = M.pensionati * p.quotaPensionati * p.importo * 12;
    var lordo = adulti + minori + pensionati;
    var netto = lordo - M.assistenzaSostituita;
    return {
      adulti: adulti, minori: minori, pensionati: pensionati, lordo: lordo, netto: netto,
      quotaMediaMinori: quotaMediaMinori, aliquotaMedia: netto / M.baseImponibile
    };
  }

  // ---------- Riferimenti DOM ----------
  var $ = function (id) { return document.getElementById(id); };
  var elMembri = $('membri');

  // ---------- Rendering del modulo ----------
  function campoEuro(id, label, valore, attrs) {
    return '<label class="field"><span>' + esc(label) + '</span>' +
      '<span class="input-eur"><input type="number" inputmode="decimal" min="0" step="100" id="' + id + '" value="' + (valore || '') + '" placeholder="0" ' + (attrs || '') + '></span></label>';
  }

  function renderMembri() {
    elMembri.innerHTML = stato.membri.map(function (m, i) {
      var opzioni = Object.keys(TIPI).map(function (k) {
        return '<option value="' + k + '"' + (k === m.tipo ? ' selected' : '') + '>' + TIPI[k] + '</option>';
      }).join('');
      var testa =
        '<div class="member-head">' +
          '<span class="member-n">' + (i + 1) + '</span>' +
          '<label class="sr-only" for="tipo-' + i + '">Categoria della persona ' + (i + 1) + '</label>' +
          '<select id="tipo-' + i + '" data-i="' + i + '" data-campo="tipo">' + opzioni + '</select>' +
          (m.tipo === 'minore'
            ? '<label class="eta">Età <input type="number" min="0" max="17" step="1" data-i="' + i + '" data-campo="eta" value="' + m.eta + '"></label>'
            : '') +
          '<button type="button" class="btn-icon" data-rimuovi="' + i + '" aria-label="Rimuovi persona ' + (i + 1) + '"' + (stato.membri.length < 2 ? ' disabled' : '') + '>×</button>' +
        '</div>';
      var corpo = '';
      if (m.tipo !== 'minore') {
        corpo = '<div class="grid-redditi">' + REDDITI.map(function (r) {
          return campoEuro('r-' + i + '-' + r[0], r[1], m.redditi[r[0]], 'data-i="' + i + '" data-campo="reddito" data-k="' + r[0] + '"');
        }).join('') + '</div>';
      }
      return '<div class="member">' + testa + corpo + '</div>';
    }).join('');
  }

  function renderSussidi() {
    $('sussidi').innerHTML = SUSSIDI.map(function (r) {
      return campoEuro('s-' + r[0], r[1], stato.sussidi[r[0]], 'data-sussidio="' + r[0] + '" step="10"');
    }).join('');
  }

  function renderFasce() {
    var p = stato.params;
    var prec = 0;
    $('fasce').innerHTML = p.fasce.map(function (f, i) {
      var da = eur(prec);
      prec = f.fino == null ? prec : f.fino;
      var limite = f.fino == null
        ? '<span class="muted">oltre</span>'
        : '<input type="number" min="0" step="1000" data-fascia="' + i + '" data-k="fino" value="' + f.fino + '" aria-label="Limite superiore fascia ' + (i + 1) + '">';
      return '<tr><td>' + da + '</td><td>' + limite + '</td>' +
        '<td><input type="number" min="0" max="100" step="1" data-fascia="' + i + '" data-k="aliquota" value="' + Math.round(f.aliquota * 1000) / 10 + '" aria-label="Aliquota base fascia ' + (i + 1) + '"> %</td>' +
        '<td class="num" data-eff="' + i + '"></td></tr>';
    }).join('');
  }

  function syncControlli() {
    var p = stato.params;
    $('importo').value = p.importo;
    $('quotaPensionati').value = Math.round(p.quotaPensionati * 100);
    $('quotaNascita').value = Math.round(p.quotaNascita * 100);
    renderFasce();
  }

  // ---------- Rendering dei risultati ----------
  function descrizione(m, i, q) {
    return 'Persona ' + (i + 1) + '<span class="sub">' + TIPI[m.tipo] +
      (m.tipo === 'minore' ? ', ' + m.eta + ' anni' : '') + ' · quota ' + pct(q) + '</span>';
  }

  function aggiorna() {
    var p = stato.params;
    var r = calcola(stato);

    $('importo-val').textContent = eur(p.importo) + ' al mese';
    $('quotaPensionati-val').textContent = pct(p.quotaPensionati) + ' (' + eur(p.importo * p.quotaPensionati) + ')';
    $('quotaNascita-val').textContent = pct(p.quotaNascita) + ' (' + eur(p.importo * p.quotaNascita) + ')';
    p.fasce.forEach(function (f, i) {
      var c = document.querySelector('[data-eff="' + i + '"]');
      if (c) c.textContent = pct(aliquotaEffettiva(f, p));
    });

    // Risultato principale
    var saldo = r.saldo, mese = saldo / 12;
    var hero = $('esito');
    hero.className = 'esito ' + (Math.round(saldo) > 0 ? 'pos' : Math.round(saldo) < 0 ? 'neg' : 'zero');
    $('esito-label').textContent = Math.round(saldo) > 0 ? 'Il tuo nucleo ci guadagnerebbe'
      : Math.round(saldo) < 0 ? 'Il tuo nucleo ci rimetterebbe' : 'Il tuo nucleo sarebbe in pareggio';
    $('esito-mese').textContent = eur(Math.abs(mese));
    $('esito-anno').textContent = eur(Math.abs(saldo)) + ' all\'anno';
    $('esito-sintesi').innerHTML =
      'Ricevi <strong>' + eur(r.entrate) + '</strong> di reddito universale e paghi <strong>' + eur(r.tasse) +
      '</strong> di tassa aggiuntiva' + (r.sussidiPersi ? ', più <strong>' + eur(r.sussidiPersi) + '</strong> di sussidi che non riceveresti più' : '') + '.';

    var pg = pareggioSingle(p);
    $('pareggio').innerHTML = pg == null
      ? 'Con queste aliquote un adulto single senza sussidi ci guadagna a qualsiasi reddito.'
      : 'Un adulto single senza sussidi va in pareggio con circa <strong>' + eur(pg) + '</strong> di reddito lordo annuo.';

    // Dettaglio per membro
    var righe = r.righe.map(function (x, i) {
      return '<tr><th scope="row">' + descrizione(x.m, i, x.quota) + '</th>' +
        '<td class="num">' + (x.m.tipo === 'minore' ? '–' : eur(x.reddito)) + '</td>' +
        '<td class="num">' + eur(x.ru) + '</td>' +
        '<td class="num">' + (x.tassa ? '−' + eur(x.tassa) : eur(0)) + '</td>' +
        '<td class="num ' + segno(x.saldo) + '">' + eurSegno(x.saldo) + '</td></tr>';
    }).join('');
    if (r.sussidiPersi) {
      righe += '<tr><th scope="row">Sussidi persi</th><td class="num">–</td><td class="num">–</td>' +
        '<td class="num">−' + eur(r.sussidiPersi) + '</td><td class="num neg">' + eurSegno(-r.sussidiPersi) + '</td></tr>';
    }
    $('dettaglio').innerHTML =
      '<table class="tab"><thead><tr><th scope="col">Chi</th><th scope="col" class="num">Reddito lordo</th>' +
      '<th scope="col" class="num">Riceve</th><th scope="col" class="num">Paga</th><th scope="col" class="num">Saldo</th></tr></thead>' +
      '<tbody>' + righe + '</tbody><tfoot>' +
      '<tr><th scope="row">Nucleo<span class="sub">all\'anno</span></th><td></td><td class="num">' + eur(r.entrate) + '</td><td class="num">−' + eur(r.tasse + r.sussidiPersi) + '</td><td class="num ' + segno(saldo) + '">' + eurSegno(saldo) + '</td></tr>' +
      '<tr><th scope="row">Nucleo<span class="sub">al mese</span></th><td></td><td class="num">' + eur(r.entrate / 12) + '</td><td class="num">−' + eur((r.tasse + r.sussidiPersi) / 12) + '</td><td class="num ' + segno(saldo) + '">' + eurSegno(mese) + '</td></tr>' +
      '</tfoot></table>';

    renderQuadro();
  }

  function segno(v) { v = Math.round(v); return v > 0 ? 'pos' : v < 0 ? 'neg' : ''; }

  function renderQuadro() {
    var p = stato.params, q = quadroNazionale(p), M = P.macro;
    $('quadro').innerHTML =
      '<table class="tab"><tbody>' +
      '<tr><th scope="row">Adulti in età da lavoro <span class="sub">' + mln(M.adulti) + ' × ' + eur(p.importo) + '</span></th><td class="num">' + mld(q.adulti) + '</td></tr>' +
      '<tr><th scope="row">Minorenni <span class="sub">' + mln(M.minori) + ' × ' + eur(p.importo * q.quotaMediaMinori) + ' in media</span></th><td class="num">' + mld(q.minori) + '</td></tr>' +
      '<tr><th scope="row">Pensionati <span class="sub">' + mln(M.pensionati) + ' × ' + eur(p.importo * p.quotaPensionati) + '</span></th><td class="num">' + mld(q.pensionati) + '</td></tr>' +
      '<tr class="tot"><th scope="row">Costo lordo annuo</th><td class="num">' + mld(q.lordo) + '</td></tr>' +
      '<tr><th scope="row">Assistenza sostituita</th><td class="num">−' + mld(M.assistenzaSostituita) + '</td></tr>' +
      '<tr class="tot"><th scope="row">Costo netto annuo</th><td class="num">' + mld(q.netto) + '</td></tr>' +
      '<tr><th scope="row">Aliquota aggiuntiva media necessaria <span class="sub">costo netto / base imponibile di ' + mld(M.baseImponibile) + '</span></th><td class="num"><strong>' + pct(q.aliquotaMedia) + '</strong></td></tr>' +
      '</tbody></table>';
  }

  // ---------- Eventi ----------
  elMembri.addEventListener('input', function (e) {
    var t = e.target, i = +t.dataset.i;
    if (isNaN(i)) return;
    var m = stato.membri[i];
    if (t.dataset.campo === 'reddito') m.redditi[t.dataset.k] = num(t.value);
    else if (t.dataset.campo === 'eta') m.eta = clamp(Math.floor(num(t.value)), 0, 17);
    aggiorna();
  });
  elMembri.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset.campo === 'tipo') {
      var vecchio = stato.membri[+t.dataset.i];
      var nuovo = membro(t.value, vecchio.redditi);
      stato.membri[+t.dataset.i] = nuovo;
      renderMembri(); aggiorna();
      document.getElementById('tipo-' + t.dataset.i).focus();
    } else if (t.dataset.campo === 'eta') {
      t.value = stato.membri[+t.dataset.i].eta;
    }
  });
  elMembri.addEventListener('click', function (e) {
    var b = e.target.closest('[data-rimuovi]');
    if (!b || stato.membri.length < 2) return;
    stato.membri.splice(+b.dataset.rimuovi, 1);
    renderMembri(); aggiorna();
  });
  document.querySelectorAll('[data-aggiungi]').forEach(function (b) {
    b.addEventListener('click', function () {
      stato.membri.push(membro(b.dataset.aggiungi));
      renderMembri(); aggiorna();
    });
  });
  document.querySelectorAll('[data-esempio]').forEach(function (b) {
    b.addEventListener('click', function () {
      var es = ESEMPI[b.dataset.esempio]();
      stato.membri = es.membri; stato.sussidi = es.sussidi;
      renderMembri(); renderSussidi(); aggiorna();
    });
  });

  $('sussidi').addEventListener('input', function (e) {
    var k = e.target.dataset.sussidio;
    if (k) { stato.sussidi[k] = num(e.target.value); aggiorna(); }
  });

  $('importo').addEventListener('input', function (e) { stato.params.importo = +e.target.value; aggiorna(); });
  $('quotaPensionati').addEventListener('input', function (e) { stato.params.quotaPensionati = +e.target.value / 100; aggiorna(); });
  $('quotaNascita').addEventListener('input', function (e) { stato.params.quotaNascita = +e.target.value / 100; aggiorna(); });

  $('fasce').addEventListener('input', function (e) {
    var t = e.target, i = +t.dataset.fascia;
    if (isNaN(i)) return;
    var f = stato.params.fasce[i];
    if (t.dataset.k === 'aliquota') f.aliquota = clamp(num(t.value), 0, 100) / 100;
    else f.fino = num(t.value);
    aggiorna();
  });
  $('fasce').addEventListener('change', function (e) {
    if (e.target.dataset.k !== 'fino') return;
    // Mantiene le soglie in ordine crescente
    var fasce = stato.params.fasce;
    for (var i = 1; i < fasce.length; i++) {
      if (fasce[i].fino != null && fasce[i].fino < fasce[i - 1].fino) fasce[i].fino = fasce[i - 1].fino;
    }
    renderFasce(); aggiorna();
  });

  $('ripristina').addEventListener('click', function () {
    stato.params = paramsDefault();
    syncControlli(); aggiorna();
  });

  // ---------- Raccolta opinioni ----------
  // Invio al modulo Google: la risposta è "opaca" (no-cors), quindi si
  // considera riuscito ogni invio che non dà errore di rete.
  var form = $('feedback'), stato_fb = $('feedback-stato'), invia = $('feedback-invia');

  function mostraGrazie(si) {
    form.hidden = si;
    $('feedback-grazie').hidden = !si;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var voto = form.querySelector('input[name="voto"]:checked');
    if (!voto) {
      stato_fb.textContent = 'Scegli Sì o No prima di inviare.';
      stato_fb.className = 'feedback-stato err';
      return;
    }
    var dati = new URLSearchParams();
    dati.append(P.feedback.campoVoto, voto.value);
    dati.append(P.feedback.campoCommento, $('commento').value.trim());

    invia.disabled = true;
    stato_fb.textContent = 'Invio in corso…';
    stato_fb.className = 'feedback-stato';
    fetch(P.feedback.action, { method: 'POST', mode: 'no-cors', body: dati })
      .then(function () {
        form.reset();
        stato_fb.textContent = '';
        mostraGrazie(true);
      })
      .catch(function () {
        stato_fb.textContent = 'Invio non riuscito. Controlla la connessione e riprova.';
        stato_fb.className = 'feedback-stato err';
      })
      .then(function () { invia.disabled = false; });
  });

  $('feedback-ancora').addEventListener('click', function () { mostraGrazie(false); });

  // ---------- Avvio ----------
  var imp = $('importo');
  imp.min = P.importoPieno.min; imp.max = P.importoPieno.max; imp.step = P.importoPieno.step;
  $('versione').textContent = 'Versione ' + P.versione + ' · parametri aggiornati a ' + P.aggiornato;
  renderMembri();
  renderSussidi();
  syncControlli();
  aggiorna();
})();
