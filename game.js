/* ==========================================================================
   CODE-KATZE · game.js  ·  JONFIE STUDIOS
   --------------------------------------------------------------------------
   Die komplette Spiel-Logik in reinem Vanilla JavaScript (ES6+).
   Aufbau dieser Datei:
     A) Level-Daten          – Spielfelder, sortiert nach Schwierigkeit
     B) Spielzustand         – globale Variablen (wo steht die Katze etc.)
     C) DOM-Referenzen       – Verweise auf die HTML-Elemente
     D) Spielfeld aufbauen   – Grid zeichnen, Katze (aus CSS) platzieren
     E) Befehls-Warteschlange– Befehle hinzufügen / löschen / anzeigen
     F) Ausführung           – die Queue zeitgesteuert Schritt für Schritt
                               abarbeiten (das HERZSTÜCK des Spiels)
     G) Gelaufene Spur       – Linie + Dreh-Symbole zeichnen
     H) Feedback & Levelwechsel
     I) Einstellungen        – Zahnrad, Schwierigkeit, Spur-Schalter, Legende
     J) Start (Event-Listener verbinden)
   ========================================================================== */

'use strict';


/* ==========================================================================
   A) LEVEL-DATEN  ·  ausgelagert nach levels.js
   --------------------------------------------------------------------------
   STANDARD_ZIEL und SCHWIERIGKEITEN werden in levels.js definiert (die Datei
   wird in index.html VOR game.js geladen). Dort steht auch die Legende der
   Kartenzeichen (., K, F, W, H, Z, S) und der Spezial-Felder pro Level:
       budget  -> Baustein-Budget (erzwingt Schleifen)
       nebel   -> Nebel-Level (nur die Umgebung der Katze ist sichtbar)
       sammel  -> Emoji/Name der Sammelobjekte (Standard: Wollknäuel)
   ========================================================================== */


/* ==========================================================================
   B) SPIELZUSTAND (globale Variablen)
   -------------------------------------------------------------------------- */

let aktuelleSchwierigkeit = 'leicht'; // 'leicht' | 'mittel' | 'schwer'
let aktuellesLevel        = 0;        // Index innerhalb der Schwierigkeitsliste

// Das aktuelle Spielfeld als 2D-Array, plus Größen:
let raster        = [];   // raster[zeile][spalte] = Zeichen ('.', 'W', 'H', 'F')
let spaltenAnzahl = 0;
let zeilenAnzahl  = 0;

// Aktuelle Position & Blickrichtung der Katze während des Spiels:
let katzeZeile  = 0;
let katzeSpalte = 0;
let katzeBlick  = 0;      // 0=oben, 1=rechts, 2=unten, 3=links
let katzeGrad   = 0;      // fortlaufender Drehwinkel (für sanftes Drehen)

// Startwerte (zum Zurücksetzen nach einem Fehlversuch):
let startZeile  = 0;
let startSpalte = 0;
let startBlick  = 0;

// Die Befehls-Warteschlange: z. B. ['vor','rechts','vor']
let befehlsQueue = [];

// Läuft gerade eine Ausführung? (verhindert Doppelstarts / Eingaben)
let laeuft = false;

// Aufzeichnung der gelaufenen Spur (für die Linie und die Dreh-Symbole):
let spurPfad   = [];      // Liste besuchter Felder: [{ z, s }, …]
let drehMarker = [];      // Drehpunkte: [{ z, s, typ:'links'|'rechts' }, …]

// Das aktuelle Ziel (Emoji + Name), wird pro Level gesetzt:
let aktuellesZiel = STANDARD_ZIEL;

// Sammelobjekte ('S' auf der Karte): Sie müssen VOR dem Ziel eingesammelt
// werden. 'gesammelt' enthält die Schlüssel 'z,s' der schon abgeholten.
const STANDARD_SAMMEL = { i: '🧶', n: 'das Wollknäuel' };
let sammelFelder    = [];              // [{ z, s }] aus der Karte
let gesammelt       = new Set();
let aktuellesSammel = STANDARD_SAMMEL;

// Nebel-Level: Nur die Umgebung der Katze ist sichtbar. Einmal aufgedeckte
// Felder bleiben sichtbar (das ist fairer beim Knobeln).
let nebelAktiv      = false;
let nebelAufgedeckt = new Set();       // 'z,s'

// Baustein-Budget des Levels (null = unbegrenzt). Budget-Level erzwingen
// kurze Programme – und machen so Schleifen wirklich notwendig.
let bausteinBudget = null;

// Zählt die im Lauf tatsächlich ausgeführten Aktionen. Der 🔁-Bonus-Stern
// gibt es nur, wenn der Code KÜRZER ist als das, was er ausführt – eine
// angehängte Deko-Schleife bringt also nichts.
let ausgefuehrteAktionen = 0;

// Zuletzt per 🧹 gelöschtes Programm – kann "zurückgeholt" werden.
let geloeschtesProgramm = null;

// Vom Nutzer wählbare Einstellungen (werden im Browser gespeichert):
let einstellungen = {
  spurAnzeigen: true,
  profiModus:   false,     // Schleifen & Logik-Bausteine freischalten
  tonAn:        true,      // Geräusche
  vibrationAn:  true,      // Vibration (getrennt vom Ton schaltbar)
  tempo:        'normal',  // 'langsam' | 'normal' | 'schnell'
};

// Wurde das kleine Start-Tutorial schon gezeigt? (nur beim 1. Besuch)
let tutorialGesehen = false;

// Wurde das Schleifen-Freischalt-Fenster schon angeboten? (einmalig)
let profiAngeboten = false;
let profiUnlockAusstehend = false;   // Fenster nach dem nächsten "Weiter" zeigen

// Wurde die Einfügemarke schon einmal erklärt? (einmalige Hinweis-Blase)
let markeErklaert = false;

// Beste Sterne-Zahl pro Level, getrennt je Stufe: bestSterne.leicht['3'] = 2
// (wird für die Level-Auswahl angezeigt und im Browser gespeichert).
let bestSterne = { leicht: {}, mittel: {}, schwer: {} };

// Grund des letzten Fehlschlags (wird vom Interpreter gesetzt):
let fehlerGrund = '';

// Die Befehlsblöcke der Queue als DOM-Liste (für die Hervorhebung im Lauf):
let queueBloecke = [];

// Zähler, wie oft in diesem Level "Start" gedrückt wurde (für den 💡-Bonus:
// gleich beim 1. Versuch schaffen = mehr Köpfchen-Punkte).
let versuche = 0;

// Versuche werden PRO LEVEL gemerkt (und mitgespeichert), damit kurzes
// Level-Wechseln den Zähler nicht heimlich zurücksetzt. Nur der
// "Nochmal"-Button setzt ihn ganz bewusst auf 0.
let versucheStand = { leicht: {}, mittel: {}, schwer: {} };

// Beste 💡-Zahl pro Level (wie bestSterne, für die Level-Auswahl).
let bestKnobel = { leicht: {}, mittel: {}, schwer: {} };

// Levelstand PRO Stufe: Wo ging es in leicht/mittel/schwer zuletzt weiter?
// So geht beim Stufen-Wechsel kein Fortschritt mehr verloren.
let levelStand = { leicht: 0, mittel: 0, schwer: 0 };

// Wurde während des Laufs der ⏹-Stopp-Knopf gedrückt?
let abbruchGewuenscht = false;

// Einzelschritt-Modus: Programm pausiert nach jedem Befehl, bis der
// 🐾-Schritt-Knopf erneut gedrückt wird (kleiner "Debugger" für Kinder).
let schrittweise      = false;
let schrittGuthaben   = 0;      // wie viele Schritte schon "freigegeben" sind
let schrittAufloeser  = null;   // Promise-Auflöser, wartet auf den Knopf

// Alle aktuell sichtbaren Crash-/Stopp-Marker (für Neuzeichnen bei Resize):
let crashMarker = [];           // [{ z, s, emoji, klein }]

// Einfügemarke in der Queue: Neue Befehle landen VOR diesem Index.
// null = normal hinten anhängen.
let einfuegeIndex = null;

// Gemerktes "beforeinstallprompt"-Event für den Installieren-Button (PWA).
let installPromptEvent = null;

// Welche Stufe zeigt die Level-Auswahl gerade an? (Tabs im Dialog)
let levelWahlStufe = 'leicht';

// Kleiner interaktiver Coach beim allerersten Spiel (geführtes 1. Level):
// 0 = aus · 1 = "Tippe Befehle" · 2 = "Drücke Start".
let coachSchritt = 0;

// Abwechslungsreiche Sieg-Meldungen (statt immer "Super!").
const LOB = ['Super!', 'Toll gemacht!', 'Miau-tastisch!', 'Spitze!',
             'Klasse!', 'Schnurr-fekt!', 'Stark!'];


/* ==========================================================================
   C) DOM-REFERENZEN  (einmal holen, dann wiederverwenden)
   -------------------------------------------------------------------------- */
const elSpielfeld   = document.getElementById('spielfeld');
const elQueue       = document.getElementById('queue');
const elQueueLeer   = document.getElementById('queueLeer');
const elLevel       = document.getElementById('levelAnzeige');
const elMeldung     = document.getElementById('meldung');
const elPlayBtn     = document.getElementById('playBtn');
const elResetBtn    = document.getElementById('resetBtn');
const elStepBtn     = document.getElementById('stepBtn');

// Gewinn-Overlay
const elOverlay      = document.getElementById('gewinnOverlay');
const elOverlayText  = document.getElementById('overlayText');
const elWeiterBtn    = document.getElementById('weiterBtn');
const elSterne       = document.getElementById('sterne');
const elKnobel       = document.getElementById('knobel');
const elBewertung    = document.getElementById('bewertungText');
const elNochmalBtn   = document.getElementById('nochmalBtn');

// Einstellungs-Overlay
const elSettingsBtn    = document.getElementById('settingsBtn');
const elSettingsOverlay= document.getElementById('settingsOverlay');
const elSettingsClose  = document.getElementById('settingsClose');
const elSettingsFertig = document.getElementById('settingsFertig');
const elSpurToggle     = document.getElementById('spurToggle');
const elProfiToggle    = document.getElementById('profiToggle');
const elProfiAktionen  = document.getElementById('profiAktionen');
const elProfiWrap      = document.getElementById('profiWrap');
const elTonToggle      = document.getElementById('tonToggle');
const elVibToggle      = document.getElementById('vibToggle');
const elInstallBtn     = document.getElementById('installBtn');
const elInstallHinweis = document.getElementById('installHinweis');

// Budget-Anzeige neben "Dein Programm:" und der Queue-Bereich (Scroll-Fade)
const elQueueBudget    = document.getElementById('queueBudget');
const elQueueBereich   = document.querySelector('.queue-bereich');

// Schleifen-Freischalt-Fenster (erscheint einmalig nach genug Grundlagen)
const elUnlockOverlay  = document.getElementById('unlockOverlay');
const elUnlockJa       = document.getElementById('unlockJa');
const elUnlockSpaeter  = document.getElementById('unlockSpaeter');

// Tutorial-Overlay (nur beim ersten Start)
const elTutorial       = document.getElementById('tutorialOverlay');
const elTutorialBtn    = document.getElementById('tutorialBtn');

// Level-Auswahl-Overlay
const elLevelWahl      = document.getElementById('levelWahlOverlay');
const elLevelWahlGrid  = document.getElementById('levelWahlGrid');
const elLevelWahlTabs  = document.getElementById('levelWahlTabs');
const elLevelWahlClose = document.getElementById('levelWahlClose');

// Coach-Sprechblase (geführtes erstes Level)
const elCoach          = document.getElementById('coach');

// Diese Elemente werden bei jedem Levelaufbau neu erzeugt:
let elKatze    = null;   // die CSS-Katze
let elSpur     = null;   // das SVG-Overlay für die Spur (Linie + Startpunkt)
let elSpurDreh = null;   // zweites SVG ÜBER der Katze (Dreh-Symbole ↺/↻)

// Namensraum, den SVG-Elemente zwingend brauchen:
const SVG_NS = 'http://www.w3.org/2000/svg';


/* ==========================================================================
   D) SPIELFELD AUFBAUEN
   -------------------------------------------------------------------------- */

/** Kurzform: gibt die Level-Liste der aktuellen Schwierigkeit zurück. */
function aktuelleLevels() {
  return SCHWIERIGKEITEN[aktuelleSchwierigkeit].levels;
}

/**
 * Lädt das Level mit dem angegebenen Index und baut das Grid komplett neu auf.
 */
function ladeLevel(index) {
  const level = aktuelleLevels()[index];

  // 1) Karte (Textzeilen) in ein 2D-Array umwandeln und Größen merken.
  raster        = level.karte.map((zeile) => zeile.split(''));
  zeilenAnzahl  = raster.length;
  spaltenAnzahl = raster[0].length;

  // Ziel dieses Levels merken (Fisch, Milch, Maus … – Standard: Fisch).
  aktuellesZiel = level.ziel || STANDARD_ZIEL;

  // Spezial-Eigenschaften des Levels: Sammelobjekte, Nebel, Baustein-Budget.
  aktuellesSammel = level.sammel || STANDARD_SAMMEL;
  bausteinBudget  = Number.isInteger(level.budget) ? level.budget : null;
  nebelAktiv      = !!level.nebel;
  nebelAufgedeckt = new Set();
  sammelFelder    = [];
  gesammelt       = new Set();
  geloeschtesProgramm = null;   // "Zurückholen" gilt nur im selben Level

  // 2) Start-Position & -Blickrichtung der Katze aus der Karte ermitteln
  //    (und dabei die Sammelobjekte 'S' einsammeln – als Liste, nicht real).
  startBlick = level.blick;
  for (let z = 0; z < zeilenAnzahl; z++) {
    for (let s = 0; s < spaltenAnzahl; s++) {
      if (raster[z][s] === 'K') {
        startZeile  = z;
        startSpalte = s;
        // Auf der Karte ist die Katze ab jetzt ein freies Feld – sie
        // bewegt sich als eigenes Overlay-Element darüber.
        raster[z][s] = '.';
      } else if (raster[z][s] === 'S') {
        sammelFelder.push({ z, s });
      }
    }
  }

  // 3) Status-Anzeige: Stufe + Fortschritt, z. B. "Leicht · 3/22".
  elLevel.textContent =
    SCHWIERIGKEITEN[aktuelleSchwierigkeit].label +
    ' · ' + (index + 1) + '/' + aktuelleLevels().length;
  // Spezial-Level begrüßen ihr eigenes Konzept, sonst Standard-Hinweis.
  if (bausteinBudget !== null) {
    setzeMeldung('Schaffst du es mit höchstens ' + bausteinBudget + ' Bausteinen? 🔁', false);
  } else if (nebelAktiv) {
    setzeMeldung('Nebel! Du siehst nur, was nah bei der Katze ist. 🌫️', false);
  } else if (sammelFelder.length > 0) {
    setzeMeldung('Sammle erst ' + aktuellesSammel.i + ', dann zum Ziel!', false);
  } else {
    setzeMeldung('Tippe Befehle, dann ▶︎', false);
  }
  // Versuchszähler pro Level gemerkt: Kurz weg- und zurückwechseln setzt
  // ihn NICHT zurück (nur "Nochmal" tut das – ganz bewusst).
  versuche = versucheStand[aktuelleSchwierigkeit][index] || 0;
  einfuegeIndex = null;   // Einfügemarke gehört zum alten Programm

  // 4) Spur und Crash-Markierungen zurücksetzen, Grid zeichnen.
  loescheSpur();
  loescheMarker();
  zeichneRaster();

  // 5) Die Katze auf die Startposition setzen.
  setzeKatzeAufStart();

  // 6) Profi-Leiste passend zeigen (Budget-Level brauchen sie IMMER) und
  //    an den Anfang zurückspulen, damit die Schleifen-Chips sichtbar sind.
  aktualisiereProfiLeiste();
  elProfiAktionen.scrollLeft = 0;
  aktualisiereBudgetAnzeige();
  aktualisiereResetKnopf();     // "↩ Zurückholen" gilt nicht über Level hinweg
}

/**
 * Setzt das Spielbrett IMMER exakt quadratisch auf den verfügbaren Platz
 * (begrenzt durch Breite UND Höhe). Reines CSS konnte das Quadrat bei
 * flachen Fenstern nicht halten – dann stimmte die Pixel-Mathematik von
 * Katze, Spur und Markern nicht mehr und alles "schwebte" außerhalb.
 */
function passeSpielfeldGroesseAn() {
  const rahmen = elSpielfeld.parentElement;
  const stil   = getComputedStyle(rahmen);
  const verfB  = rahmen.clientWidth
    - (parseFloat(stil.paddingLeft) || 0) - (parseFloat(stil.paddingRight)  || 0);
  const verfH  = rahmen.clientHeight
    - (parseFloat(stil.paddingTop)  || 0) - (parseFloat(stil.paddingBottom) || 0);
  const groesse = Math.max(120, Math.min(verfB, verfH, 520));
  elSpielfeld.style.width  = groesse + 'px';
  elSpielfeld.style.height = groesse + 'px';
}

/**
 * Erzeugt die Zellen des Grids, das SVG-Spur-Overlay und die CSS-Katze.
 */
function zeichneRaster() {
  passeSpielfeldGroesseAn();
  elSpielfeld.innerHTML = '';

  // Anzahl der Spalten/Zeilen als CSS-Grid-Vorgabe setzen.
  elSpielfeld.style.gridTemplateColumns = `repeat(${spaltenAnzahl}, 1fr)`;
  elSpielfeld.style.gridTemplateRows    = `repeat(${zeilenAnzahl}, 1fr)`;

  // Für jede Position eine Zelle erzeugen; Hindernisse/Ziel als Emoji.
  for (let z = 0; z < zeilenAnzahl; z++) {
    for (let s = 0; s < spaltenAnzahl; s++) {
      const zelle = document.createElement('div');
      zelle.className = 'zelle';

      const inhalt = raster[z][s];
      if (inhalt === 'F') {
        zelle.classList.add('zelle--ziel');
        zelle.textContent = aktuellesZiel.i;   // variables Ziel-Emoji
        zelle.setAttribute('aria-label', 'Ziel: ' + aktuellesZiel.n);
      } else if (inhalt === 'W') {
        zelle.textContent = '💧';
        zelle.setAttribute('aria-label', 'Wasserpfütze (Hindernis)');
      } else if (inhalt === 'H') {
        zelle.textContent = '🐶';
        zelle.setAttribute('aria-label', 'Hund (Hindernis)');
      } else if (inhalt === 'Z') {
        zelle.textContent = '🚧';
        zelle.setAttribute('aria-label', 'Zaun (Hindernis)');
      } else if (inhalt === 'S') {
        zelle.classList.add('zelle--sammel');
        zelle.textContent = aktuellesSammel.i;
        zelle.setAttribute('aria-label', 'Sammelobjekt: ' + aktuellesSammel.n);
      }
      elSpielfeld.appendChild(zelle);
    }
  }

  // SVG-Overlay für die Spur (liegt über den Zellen, unter der Katze).
  elSpur = document.createElementNS(SVG_NS, 'svg');
  elSpur.setAttribute('class', 'spur');
  elSpielfeld.appendChild(elSpur);

  // Zweites SVG NUR für die Dreh-Symbole – liegt ÜBER der Katze, damit
  // Drehungen auch auf dem Feld sichtbar sind, auf dem die Katze sitzt.
  elSpurDreh = document.createElementNS(SVG_NS, 'svg');
  elSpurDreh.setAttribute('class', 'spur spur--dreh');
  elSpielfeld.appendChild(elSpurDreh);

  // Katze aus reinen CSS-Formen zusammensetzen (kein Emoji-Gesicht mehr!).
  // Grundausrichtung: schaut nach OBEN. Vorne = Ohren/Augen/Nase, hinten = Schweif.
  elKatze = document.createElement('div');
  elKatze.className = 'katze';
  elKatze.innerHTML = `
    <div class="katze__schweif"></div>
    <div class="katze__koerper"></div>
    <div class="katze__ohr katze__ohr--l"></div>
    <div class="katze__ohr katze__ohr--r"></div>
    <div class="katze__kopf">
      <div class="katze__auge katze__auge--l"></div>
      <div class="katze__auge katze__auge--r"></div>
      <div class="katze__nase"></div>
    </div>`;
  elSpielfeld.appendChild(elKatze);
}

/**
 * Setzt die Katze (Variablen + Anzeige) auf die Startposition zurück.
 */
function setzeKatzeAufStart() {
  katzeZeile  = startZeile;
  katzeSpalte = startSpalte;
  katzeBlick  = startBlick;
  katzeGrad   = startBlick * 90;   // fortlaufenden Drehwinkel synchronisieren
  zeichneKatze();
}

/**
 * Berechnet die Pixel-Größe einer Zelle (inkl. Lücke). Wird an mehreren
 * Stellen gebraucht (Katze positionieren, Spur zeichnen).
 */
function zellenGeometrie() {
  // Padding und Gap direkt aus dem CSS auslesen – so kann das Stylesheet
  // geändert werden, ohne dass hier Zahlen mitgepflegt werden müssen.
  const stil    = getComputedStyle(elSpielfeld);
  const padding = parseFloat(stil.paddingLeft) || 0;
  const gap     = parseFloat(stil.columnGap) || 0;
  const innen   = elSpielfeld.clientWidth - padding * 2;
  const groesse = (innen - gap * (spaltenAnzahl - 1)) / spaltenAnzahl;
  return { padding, gap, groesse };
}

/**
 * Positioniert und dreht die Katze passend zu Zeile/Spalte/Blickwinkel.
 * Die CSS-transition sorgt für die sanfte Animation von Bewegung UND Drehung.
 */
function zeichneKatze() {
  if (!elKatze) return;
  const { padding, gap, groesse } = zellenGeometrie();

  // Pixel-Position der oberen linken Ecke der Zielzelle.
  const x = padding + katzeSpalte * (groesse + gap);
  const y = padding + katzeZeile  * (groesse + gap);

  // Katzen-Element exakt auf Zellengröße bringen.
  elKatze.style.width  = groesse + 'px';
  elKatze.style.height = groesse + 'px';

  // Position + fortlaufende Drehung kombinieren. Wir verwenden 'katzeGrad'
  // (statt blick*90), damit z. B. eine Linksdrehung wirklich nach links
  // dreht und nicht einmal andersherum "zurückspringt".
  elKatze.style.transform =
    `translate(${x}px, ${y}px) rotate(${katzeGrad}deg)`;

  // In Nebel-Leveln deckt die Katze ihre Umgebung auf.
  aktualisiereNebel();
}

/* --------------------------------------------------------------------------
   NEBEL-LEVEL: Nur Felder in der Nähe der Katze sind sichtbar. Einmal
   aufgedeckte Felder BLEIBEN sichtbar – so entsteht beim Erkunden nach und
   nach die Karte. (Hier lohnen sich „solange frei" & Co. wirklich, weil man
   den Weg eben NICHT komplett sieht.)
   -------------------------------------------------------------------------- */
const NEBEL_SICHTWEITE = 2;   // Manhattan-Abstand, der sichtbar ist

function aktualisiereNebel() {
  if (!nebelAktiv || !elSpielfeld) return;
  for (let z = 0; z < zeilenAnzahl; z++) {
    for (let s = 0; s < spaltenAnzahl; s++) {
      const key = z + ',' + s;
      const nah = Math.abs(z - katzeZeile) + Math.abs(s - katzeSpalte)
        <= NEBEL_SICHTWEITE;
      if (nah) nebelAufgedeckt.add(key);
      const zelle = elSpielfeld.children[z * spaltenAnzahl + s];
      if (zelle) zelle.classList.toggle('zelle--nebel', !nebelAufgedeckt.has(key));
    }
  }
}

/* --------------------------------------------------------------------------
   SAMMELOBJEKTE: 'S'-Felder sind begehbar; die Katze nimmt das Objekt beim
   Betreten mit. Das Ziel zählt erst, wenn ALLES eingesammelt ist.
   -------------------------------------------------------------------------- */
function aktualisiereSammelAnzeige() {
  for (const f of sammelFelder) {
    const zelle = elSpielfeld.children[f.z * spaltenAnzahl + f.s];
    if (!zelle) continue;
    const weg = gesammelt.has(f.z + ',' + f.s);
    zelle.textContent = weg ? '' : aktuellesSammel.i;
    zelle.classList.toggle('zelle--gesammelt', weg);
  }
}

/** Setzt eingesammelte Objekte zurück (vor jedem neuen Lauf). */
function setzeSammelZurueck() {
  if (sammelFelder.length === 0) return;
  gesammelt = new Set();
  aktualisiereSammelAnzeige();
}

/** Die Katze betritt ein Sammelfeld: Objekt einsammeln + kleine Feier. */
function sammleEin(z, s) {
  gesammelt.add(z + ',' + s);
  aktualisiereSammelAnzeige();
  spieleTon('sammel');
  zeigeFeier(z, s);
  const rest = sammelFelder.length - gesammelt.size;
  setzeMeldung(rest > 0
    ? aktuellesSammel.i + ' geschnappt! Noch ' + rest + ' übrig …'
    : aktuellesSammel.i + ' geschnappt! Jetzt zum Ziel ' + aktuellesZiel.i, false);
}

/** Bitmaske der schon eingesammelten Objekte (für die Rest-Weg-Berechnung). */
function sammelMaske() {
  let maske = 0;
  sammelFelder.forEach((f, i) => {
    if (gesammelt.has(f.z + ',' + f.s)) maske |= (1 << i);
  });
  return maske;
}


/* ==========================================================================
   E) BEFEHLS-WARTESCHLANGE (COMMAND QUEUE)
   --------------------------------------------------------------------------
   Kernidee: Ein Tipp auf einen Aktions-Button bewegt NICHT sofort etwas.
   Der Befehl wird nur in das Array 'befehlsQueue' gelegt und unten als Block
   angezeigt. Erst der Start-Button arbeitet diese Liste später ab.
   -------------------------------------------------------------------------- */

/*
  Info zu jedem Baustein-Typ: Beschriftung in der Queue + optische Klasse.
  Basis-Bausteine (vor/links/rechts) sowie die Profi-Bausteine (Schleifen,
  Logik, Klammer zu). Die Dreh-Symbole ↺/↻ sind ROTATIONS-Pfeile – bewusst
  keine Abbiege-Pfeile (↰/↱), denn die würden aussehen wie "gehe nach links":
      ↺ = auf der Stelle nach links drehen (gegen den Uhrzeigersinn)
      ↻ = auf der Stelle nach rechts drehen (im Uhrzeigersinn)
  'name' ist die Vorlese-Beschreibung (aria-label) für Screenreader.
*/
const BLOCK_INFO = {
  vor:         { text: '⬆️',     klasse: '', name: 'Ein Schritt vor' },
  links:       { text: '↺',      klasse: '', name: 'Nach links drehen' },
  rechts:      { text: '↻',      klasse: '', name: 'Nach rechts drehen' },
  loop2:       { text: '🔁2 (',  klasse: 'queue-block--logik', name: 'Schleife: 2-mal wiederholen' },
  loop3:       { text: '🔁3 (',  klasse: 'queue-block--logik', name: 'Schleife: 3-mal wiederholen' },
  loopZiel:    { text: '🎯 (',   klasse: 'queue-block--logik', name: 'Schleife: bis zum Ziel wiederholen' },
  solangeFrei: { text: '➰ (',   klasse: 'queue-block--logik', name: 'Schleife: solange vorne frei ist' },
  wennFrei:    { text: '❓ (',   klasse: 'queue-block--logik', name: 'Bedingung: wenn vorne frei ist' },
  wennWand:    { text: '🧱 (',   klasse: 'queue-block--logik', name: 'Bedingung: wenn vorne eine Wand ist' },
  ende:        { text: ')',      klasse: 'queue-block--klammer', name: 'Klammer zu' },
};

// Welche Baustein-Typen öffnen eine Klammer (Schleife/Logik)?
const OEFFNER = new Set(['loop2', 'loop3', 'loopZiel', 'solangeFrei', 'wennFrei', 'wennWand']);

/**
 * Fügt einen neuen Befehl in die Warteschlange ein: normalerweise hinten,
 * oder – wenn eine Einfügemarke gesetzt ist – genau VOR den markierten Block.
 *
 * KLAMMERN KOMMEN AUTOMATISCH ALS PAAR: Ein Schleifen-/Logik-Öffner legt
 * gleich seine schließende ")" mit dazu, und die Einfügemarke springt
 * DAZWISCHEN. So können gar keine Klammer-Fehler mehr entstehen – der
 * ")"-Knopf bedeutet jetzt "Klammer fertig" (siehe schliesseKlammer).
 */
function fuegeBefehlHinzu(typ) {
  if (laeuft) return;              // während des Laufs keine Änderungen
  if (typ === 'ende') { schliesseKlammer(); return; }

  const pos = (einfuegeIndex !== null && einfuegeIndex <= befehlsQueue.length)
    ? einfuegeIndex : befehlsQueue.length;

  if (OEFFNER.has(typ)) {
    befehlsQueue.splice(pos, 0, typ, 'ende');   // Paar "( )" auf einmal
    einfuegeIndex = pos + 1;                    // Marke IN die Klammer
    setzeMeldung('Lege jetzt Befehle IN die Klammer – ")" = fertig.', false);
  } else {
    befehlsQueue.splice(pos, 0, typ);
    if (einfuegeIndex !== null) einfuegeIndex = pos + 1;  // Marke wandert mit
  }
  zeichneQueue();
  coachBefehlGelegt();             // Coach beim allerersten Spiel weiterschalten
}

/**
 * ")"-Knopf. Da Öffner ihre ")" automatisch mitbringen, heißt der Knopf
 * jetzt "Klammer fertig": Die Einfügemarke springt hinter die schließende
 * Klammer der Schleife, in der sie gerade steht. Fehlt im Programm doch
 * einmal eine ")" (z. B. weil Blöcke gelöscht wurden), wird sie ganz
 * normal eingefügt.
 */
function schliesseKlammer() {
  // Fall 1: Es fehlt wirklich eine ")" -> einfügen wie früher.
  let tiefe = 0;
  for (const t of befehlsQueue) {
    if (OEFFNER.has(t)) tiefe++;
    else if (t === 'ende') tiefe = Math.max(0, tiefe - 1);
  }
  if (tiefe > 0) {
    const pos = (einfuegeIndex !== null && einfuegeIndex <= befehlsQueue.length)
      ? einfuegeIndex : befehlsQueue.length;
    befehlsQueue.splice(pos, 0, 'ende');
    if (einfuegeIndex !== null) einfuegeIndex = pos + 1;
    zeichneQueue();
    return;
  }

  // Fall 2: Marke steht in einer Klammer -> hinter deren ")" springen.
  if (einfuegeIndex !== null) {
    let t = 0;
    for (let i = einfuegeIndex; i < befehlsQueue.length; i++) {
      if (OEFFNER.has(befehlsQueue[i])) t++;
      else if (befehlsQueue[i] === 'ende') {
        if (t === 0) {
          einfuegeIndex = (i + 1 >= befehlsQueue.length) ? null : i + 1;
          zeichneQueue();
          setzeMeldung('Klammer fertig – weiter geht’s dahinter! ✔', false);
          return;
        }
        t--;
      }
    }
  }
  setzeMeldung('Alle Klammern sind schon zu. ✔', false);
}

/** Sucht zum Öffner an 'index' die passende ")" (oder -1). */
function findePartnerEnde(index) {
  let tiefe = 0;
  for (let i = index + 1; i < befehlsQueue.length; i++) {
    if (OEFFNER.has(befehlsQueue[i])) tiefe++;
    else if (befehlsQueue[i] === 'ende') {
      if (tiefe === 0) return i;
      tiefe--;
    }
  }
  return -1;
}

/** Sucht zur ")" an 'index' den passenden Öffner (oder -1). */
function findePartnerOeffner(index) {
  let tiefe = 0;
  for (let i = index - 1; i >= 0; i--) {
    if (befehlsQueue[i] === 'ende') tiefe++;
    else if (OEFFNER.has(befehlsQueue[i])) {
      if (tiefe === 0) return i;
      tiefe--;
    }
  }
  return -1;
}

/**
 * Entfernt den Befehl an Position 'index' (Tipp auf das ×-Kreuz = "debuggen").
 * Klammern werden PAARWEISE gelöscht: Wer den Öffner löscht, löscht auch
 * die zugehörige ")" (und umgekehrt) – der Inhalt bleibt erhalten.
 */
function loescheBefehl(index) {
  if (laeuft) return;
  const typ = befehlsQueue[index];
  let partner = -1;
  if (OEFFNER.has(typ))    partner = findePartnerEnde(index);
  else if (typ === 'ende') partner = findePartnerOeffner(index);

  const raus = (partner === -1) ? [index] : [index, partner].sort((a, b) => b - a);
  for (const i of raus) {
    befehlsQueue.splice(i, 1);
    // Einfügemarke mitführen, damit sie vor demselben Block bleibt.
    if (einfuegeIndex !== null && i < einfuegeIndex) einfuegeIndex--;
  }
  if (einfuegeIndex !== null &&
      (einfuegeIndex >= befehlsQueue.length || befehlsQueue.length === 0)) {
    einfuegeIndex = null;
  }
  zeichneQueue();
}

/**
 * Tipp auf einen Block (nicht das ×): setzt die Einfügemarke VOR diesen
 * Block bzw. entfernt sie wieder. So kann mitten im Programm ein
 * vergessener Befehl eingefügt werden.
 */
function setzeEinfuegemarke(index) {
  if (laeuft) return;
  einfuegeIndex = (einfuegeIndex === index) ? null : index;
  zeichneQueue();
  setzeMeldung(einfuegeIndex === null
    ? 'Neue Befehle kommen wieder ans Ende.'
    : 'Neue Befehle kommen vor die Marke ⌄', false);
  // Die Marke ist leicht zu übersehen – beim allerersten Mal kurz erklären.
  if (einfuegeIndex !== null && !markeErklaert) {
    markeErklaert = true;
    speichereEinstellungen();
    zeigeHinweisBlase('💡 Einfügemarke gesetzt: Neue Befehle landen vor der ' +
      'Marke. Tipp nochmal auf den Block, um sie wegzunehmen.');
  }
}

/* Einmalige Hinweis-Blase (nutzt die Coach-Blase, wenn der Coach frei ist). */
let hinweisTimer = null;
function zeigeHinweisBlase(text) {
  if (coachSchritt !== 0 || !elCoach) return;   // der echte Coach hat Vorrang
  elCoach.textContent = text;
  elCoach.hidden = false;
  positioniereCoach();
  clearTimeout(hinweisTimer);
  hinweisTimer = setTimeout(() => {
    if (coachSchritt === 0) elCoach.hidden = true;
  }, 5000);
}

/**
 * Setzt die Coach-/Hinweis-Blase direkt ÜBER die Aktions-Buttons – so
 * verdeckt sie weder die Knöpfe, auf die sie zeigt, noch das Queue-Label
 * (auf jeder Bildschirmgröße).
 */
function positioniereCoach() {
  if (!elCoach) return;
  const aktionen = document.querySelector('.aktionen');
  if (!aktionen) return;
  const oben = aktionen.getBoundingClientRect().top;
  elCoach.style.bottom = Math.max(90, window.innerHeight - oben + 8) + 'px';
}

/** Baut die sichtbare Warteschlange aus dem Array neu auf (mehrzeilig). */
function zeichneQueue() {
  elQueue.innerHTML = '';
  aktualisiereBudgetAnzeige();
  aktualisiereResetKnopf();

  if (befehlsQueue.length === 0) {
    elQueue.appendChild(elQueueLeer);   // Platzhalter zeigen
    requestAnimationFrame(aktualisiereQueueFade);
    return;
  }

  befehlsQueue.forEach((typ, index) => {
    // Sichtbare Einfügemarke vor dem markierten Block.
    if (einfuegeIndex === index) {
      const caret = document.createElement('div');
      caret.className = 'queue-caret';
      caret.setAttribute('aria-hidden', 'true');
      elQueue.appendChild(caret);
    }

    const info = BLOCK_INFO[typ];
    const block = document.createElement('div');
    block.className = 'queue-block' + (info.klasse ? ' ' + info.klasse : '');
    block.textContent = info.text;
    block.dataset.index = index;
    block.setAttribute('aria-label', info.name);   // Vorlese-Hilfe

    // Kleines ×-Kreuz als ECHTES Element: nur DAS löscht den Block.
    // Ein Tipp auf den Block selbst setzt stattdessen die Einfügemarke.
    const x = document.createElement('span');
    x.className = 'queue-block__x';
    x.textContent = '×';
    x.setAttribute('aria-label', info.name + ' löschen');
    x.addEventListener('click', (e) => {
      e.stopPropagation();
      loescheBefehl(index);
    });
    block.appendChild(x);

    block.addEventListener('click', () => setzeEinfuegemarke(index));
    elQueue.appendChild(block);
  });

  requestAnimationFrame(aktualisiereQueueFade);
}

/**
 * Budget-Anzeige neben "Dein Programm:": zeigt bei Budget-Leveln, wie viele
 * Bausteine schon liegen und wie viele erlaubt sind (z. B. "3 / 5").
 */
function aktualisiereBudgetAnzeige() {
  if (!elQueueBudget) return;
  if (bausteinBudget === null) {
    elQueueBudget.hidden = true;
    return;
  }
  elQueueBudget.hidden = false;
  elQueueBudget.textContent = '🧩 ' + befehlsQueue.length + ' / ' + bausteinBudget;
  elQueueBudget.classList.toggle('queue-budget--voll',
    befehlsQueue.length > bausteinBudget);
}

/**
 * Zeigt unter der Queue einen Fade + ⌄, solange dort weitere Befehls-Zeilen
 * "versteckt" sind (die Queue scrollt ab einer gewissen Höhe).
 */
function aktualisiereQueueFade() {
  if (!elQueueBereich) return;
  const mehr = elQueue.scrollTop + elQueue.clientHeight < elQueue.scrollHeight - 4;
  elQueueBereich.classList.toggle('queue-bereich--mehr', mehr);
}

/** Der 🧹-Knopf wird zum ↩-Zurückhol-Knopf, wenn es etwas zurückzuholen gibt. */
function aktualisiereResetKnopf() {
  if (!elResetBtn) return;
  const undoBereit = befehlsQueue.length === 0 && !!geloeschtesProgramm;
  elResetBtn.textContent = undoBereit ? '↩ Zurückholen' : '🧹 Löschen';
}


/* ==========================================================================
   F) AUSFÜHRUNG – das Herzstück: die Queue zeitgesteuert abarbeiten
   --------------------------------------------------------------------------
   Ablauf bei "Start":
     1. Eingaben sperren und die Katze sauber auf den Start setzen.
     2. Die Befehle NACHEINANDER mit kleiner Pause (Delay) ausführen, damit
        die Bewegung sichtbar und nachvollziehbar ist.
     3. Den gerade ausgeführten Block in der Queue farblich hervorheben.
     4. Nach jedem Schritt prüfen: Hindernis/Wand? -> Fehlversuch.
        Auf dem Fisch? -> gewonnen.
     5. Queue zu Ende ohne Ziel -> Fehlversuch.
   Wir nutzen 'async/await' mit einer warte()-Hilfsfunktion, damit sich der
   Ablauf von oben nach unten liest, obwohl echte Zeit vergeht.
   -------------------------------------------------------------------------- */

/*
  Tempo: Wie lange die Pause zwischen zwei Befehlen ist (in Millisekunden).
  Über die Einstellungen wählbar: 🐢 langsam · 🐾 normal · 🐇 schnell.
*/
const TEMPO_DELAY = { langsam: 750, normal: 500, schnell: 280 };

/** Aktuelle Schritt-Pause je nach gewähltem Tempo. */
function schrittDelay() {
  return TEMPO_DELAY[einstellungen.tempo] || TEMPO_DELAY.normal;
}

/** Kurze Pause beim Hervorheben von Schleifen-Köpfen (skaliert mit Tempo). */
function blockDelay() {
  return Math.round(schrittDelay() * 0.45);
}

/** Pause: Promise, das nach 'ms' Millisekunden erfüllt wird. */
function warte(ms) {
  return new Promise((aufloesen) => setTimeout(aufloesen, ms));
}

/* --------------------------------------------------------------------------
   TON & VIBRATION (abschaltbar über die Einstellungen)
   --------------------------------------------------------------------------
   Alle Geräusche werden mit der WebAudio-API direkt im Browser erzeugt –
   es werden also KEINE Audiodateien benötigt. Jeder Ton ist ein kurzer
   Sinus-/Dreieck-Ton, dessen Lautstärke schnell ausklingt ("Blip").
   -------------------------------------------------------------------------- */
let audioCtx = null;   // wird beim ersten Ton angelegt (Browser-Vorgabe)

/**
 * iOS/Safari erlaubt Ton erst nach einer ECHTEN Nutzergeste. Deshalb wird
 * der AudioContext beim allerersten Tippen angelegt und aufgeweckt –
 * sonst bliebe das Spiel auf iPhones stumm.
 */
function entsperreAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) { /* kein WebAudio verfügbar – still weiterspielen */ }
}

function spieleTon(art) {
  // Vibration ist GETRENNT vom Ton schaltbar – deshalb zuerst und
  // unabhängig davon auslösen, ob der Ton an ist.
  if (art === 'bonk') vibriere(180);
  if (art === 'sieg') vibriere([60, 40, 60]);
  if (!einstellungen.tonAn) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime;

    // Hilfsfunktion: einen kurzen, ausklingenden Ton einplanen.
    const blip = (freq, start, dauer, wellenform, lautstaerke) => {
      const osc  = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = wellenform;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(lautstaerke, t + start);
      gain.gain.exponentialRampToValueAtTime(0.001, t + start + dauer);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t + start);
      osc.stop(t + start + dauer);
    };

    if (art === 'schritt') blip(520, 0, 0.09, 'triangle', 0.07);
    if (art === 'dreh')    blip(392, 0, 0.09, 'triangle', 0.05);
    if (art === 'bonk')    blip(150, 0, 0.28, 'sawtooth', 0.10);
    if (art === 'sammel') { // fröhliches Pling beim Einsammeln
      blip(660, 0.00, 0.10, 'triangle', 0.08);
      blip(880, 0.09, 0.14, 'triangle', 0.08);
    }
    if (art === 'sieg')  { // kleine Aufwärts-Melodie (C–E–G)
      blip(523, 0.00, 0.16, 'triangle', 0.09);
      blip(659, 0.14, 0.16, 'triangle', 0.09);
      blip(784, 0.28, 0.30, 'triangle', 0.10);
    }
  } catch (e) { /* Ton nicht verfügbar – still weiterspielen */ }
}

/** Kurze Vibration auf unterstützten Geräten (eigener Schalter 📳). */
function vibriere(muster) {
  if (einstellungen.vibrationAn && navigator.vibrate) navigator.vibrate(muster);
}

// Sicherheitsgrenze für die "bis Ziel"-Schleife, damit sie nie ewig läuft.
const MAX_ZIEL_WIEDERHOLUNGEN = 60;

/**
 * Startet die Abarbeitung der Warteschlange.
 *
 * Ablauf:
 *   1. Klammern prüfen (Schleifen/Logik müssen sauber geschlossen sein).
 *   2. Aus der flachen Befehlsliste einen verschachtelten "Baum" (AST) bauen.
 *   3. Diesen Baum rekursiv und zeitgesteuert ausführen.
 * Der Rückgabewert der Ausführung steuert das Ende:
 *   'gewonnen' -> Ziel erreicht · 'fehler' -> Hindernis/Problem · 'weiter'
 *   -> alles abgearbeitet, aber Ziel nicht erreicht.
 */
async function starteAusführung(einzelschritt = false) {
  if (laeuft) return;
  if (befehlsQueue.length === 0) {
    setzeMeldung('Erst Befehle tippen! 🧩', true);
    return;
  }

  // 1) Programm VOR dem Start prüfen (Klammern + leere Blöcke + Budget).
  //    Solche Struktur-Fehler zählen bewusst NICHT als Versuch – das Kind
  //    hat ja noch gar nicht "laufen lassen".
  const programmFehler = pruefeKlammern() || pruefeLeereBloecke();
  if (programmFehler) {
    setzeMeldung(programmFehler, true);
    return;
  }
  if (bausteinBudget !== null && befehlsQueue.length > bausteinBudget) {
    setzeMeldung('Zu viele Bausteine! Höchstens ' + bausteinBudget +
      ' – eine 🔁 Schleife macht den Code kürzer.', true);
    return;
  }

  // --- Vorbereitung ---
  laeuft            = true;
  abbruchGewuenscht = false;
  schrittweise      = einzelschritt;
  schrittGuthaben   = einzelschritt ? 1 : 0;  // 1. Schritt sofort ausführen
  versuche++;                                 // dieser Start zählt als Versuch
  versucheStand[aktuelleSchwierigkeit][aktuellesLevel] = versuche;
  speichereEinstellungen();
  versteckeCoach();                           // Coach hat seinen Job getan
  einfuegeIndex = null;                       // Einfügemarke ausblenden
  zeichneQueue();
  setzeEingabenAktiv(false);
  elQueue.classList.add('queue--laeuft');   // blendet die Lösch-Kreuze aus
  ausgefuehrteAktionen = 0;                 // für den 🔁-Bonus-Stern zählen
  setzeSammelZurueck();                     // Sammelobjekte zurücklegen
  setzeKatzeAufStart();
  loescheMarker();                          // alte Crash-Markierungen weg

  // Spur frisch beginnen: Startfeld als ersten Punkt aufnehmen.
  spurPfad   = [{ z: katzeZeile, s: katzeSpalte }];
  drehMarker = [];
  zeichneSpur();
  setzeMeldung(einzelschritt ? 'Schritt für Schritt… 🐾' : 'Die Katze läuft… 🐾', false);

  // Alle Blöcke einsammeln (für die Hervorhebung des aktiven Bausteins).
  queueBloecke = elQueue.querySelectorAll('.queue-block');
  fehlerGrund = '';

  await warte(300); // kurz die Startstellung zeigen

  // 2) Baum bauen und 3) ausführen.
  const programm = baueProgramm();
  const status = await fuehreProgramm(programm);

  // Auswertung des Endergebnisses.
  if (status === 'gewonnen') {
    await levelGeschafft();
  } else if (status === 'fehler') {
    await fehlversuch(fehlerGrund);
  } else if (status === 'abbruch') {
    // ⏹ gedrückt: Katze ruhig zurück auf Start, kein Fehler-Drama.
    // Ein Abbruch zählt NICHT als Versuch – das Kind wollte ja nur
    // stoppen und nachdenken, nicht "falsch laufen lassen".
    versuche = Math.max(0, versuche - 1);
    versucheStand[aktuelleSchwierigkeit][aktuellesLevel] = versuche;
    speichereEinstellungen();
    setzeKatzeAufStart();
    setzeMeldung('Gestoppt. Ändere dein Programm und starte neu! ⏹', false);
    beendeAusführung();
  } else {
    // Alles abgearbeitet, aber Ziel nicht erreicht: Katze bleibt "ratlos"
    // stehen -> Fragezeichen auf dem Feld, das Ziel blinkt kurz, und die
    // Meldung verrät, wie nah die Katze schon dran war (BFS ab hier).
    zeigeMarker(katzeZeile, katzeSpalte, '❓');
    lasseZielBlinken();
    const rest = minimaleAktionen(katzeZeile, katzeSpalte, katzeBlick, sammelMaske());
    const fehltNoch = sammelFelder.length - gesammelt.size;
    let hinweis = 'Ziel noch nicht erreicht 🎯';
    if (fehltNoch > 0) {
      hinweis = 'Erst ' + aktuellesSammel.i + ' einsammeln! Noch ' + fehltNoch + ' übrig.';
    } else if (isFinite(rest) && rest > 0) {
      hinweis = 'Fast! Nur noch ' + rest + ' Züge bis zum Ziel 🎯';
    }
    await fehlversuch(hinweis);
  }
}

/** Lässt das Zielfeld kurz blinken (Hilfe: "DA musst du hin"). */
function lasseZielBlinken() {
  if (!elSpielfeld) return;
  elSpielfeld.querySelectorAll('.zelle--ziel').forEach((zelle) => {
    zelle.classList.remove('zelle--blink');
    void zelle.offsetWidth;               // Animation sicher neu starten
    zelle.classList.add('zelle--blink');
    setTimeout(() => zelle.classList.remove('zelle--blink'), 2400);
  });
}

/**
 * ⏹ Stopp: bricht den laufenden Programmlauf so schnell wie möglich ab.
 * Wichtig gegen "gefangen sein": Lange Schleifen (bis zu 60 Runden) würden
 * sonst bei langsamem Tempo alle Eingaben über eine Minute sperren.
 */
function stoppeAusfuehrung() {
  if (!laeuft) return;
  abbruchGewuenscht = true;
  gibSchrittFrei();          // falls der Lauf gerade im Einzelschritt wartet
}

/** Gibt im Einzelschritt-Modus den nächsten Befehl frei (🐾-Knopf). */
function gibSchrittFrei() {
  if (schrittAufloeser) {
    const aufloeser = schrittAufloeser;
    schrittAufloeser = null;
    aufloeser();
  } else {
    schrittGuthaben++;
  }
}

/** Wartet im Einzelschritt-Modus, bis der nächste Schritt freigegeben ist. */
function warteAufSchritt() {
  if (!schrittweise || abbruchGewuenscht) return Promise.resolve();
  if (schrittGuthaben > 0) {
    schrittGuthaben--;
    return Promise.resolve();
  }
  setzeMeldung('Pause – 🐾 für den nächsten Schritt', false);
  return new Promise((aufloesen) => { schrittAufloeser = aufloesen; });
}

/**
 * Prüft, ob alle Schleifen-/Logik-Klammern sauber geöffnet und geschlossen
 * sind. Gibt bei einem Problem eine kindgerechte Meldung zurück, sonst null.
 */
function pruefeKlammern() {
  let tiefe = 0;
  for (const typ of befehlsQueue) {
    if (OEFFNER.has(typ)) {
      tiefe++;
    } else if (typ === 'ende') {
      tiefe--;
      if (tiefe < 0) return 'Eine „)" hat keine passende Schleife davor. 🧩';
    }
  }
  if (tiefe > 0) return 'Es fehlt noch eine schließende „)". 🧩';
  return null;
}

/**
 * Prüft VOR dem Start, ob eine Schleife oder Bedingung leer ist – also
 * direkt hinter dem Öffner die „)" folgt. Früher fiel das erst während
 * des Laufs auf und kostete unfairerweise einen 💡-Versuch.
 */
function pruefeLeereBloecke() {
  const NAMEN = {
    loop2: 'Wiederhol-Schleife', loop3: 'Wiederhol-Schleife',
    loopZiel: '„bis Ziel"-Schleife', solangeFrei: '„solange frei"-Schleife',
    wennFrei: '„wenn frei"-Bedingung', wennWand: '„wenn Wand"-Bedingung',
  };
  for (let i = 0; i < befehlsQueue.length; i++) {
    if (OEFFNER.has(befehlsQueue[i]) && befehlsQueue[i + 1] === 'ende') {
      return 'Die ' + NAMEN[befehlsQueue[i]] + ' ist leer. Lege Befehle hinein! 🧩';
    }
  }
  return null;
}

/**
 * Baut aus der flachen 'befehlsQueue' einen verschachtelten Programmbaum.
 * Jeder Knoten merkt sich seinen Platz (index) in der Queue, damit der
 * passende Block beim Ausführen hervorgehoben werden kann.
 *
 * Knoten-Formen:
 *   { art:'simpel', typ, index }
 *   { art:'block',  typ, index, kinder:[…] }
 */
function baueProgramm() {
  // Tokens mit ihrer ursprünglichen Position in der Queue.
  const tokens = befehlsQueue.map((typ, index) => ({ typ, index }));
  let i = 0;

  function leseListe() {
    const liste = [];
    while (i < tokens.length && tokens[i].typ !== 'ende') {
      const t = tokens[i];
      if (OEFFNER.has(t.typ)) {
        i++;                       // Öffner überspringen
        const kinder = leseListe();
        // Position der schließenden ')' merken – damit beim Ausführen der
        // GANZE Klammer-Bereich in der Queue hervorgehoben werden kann.
        let endeIndex = t.index;
        if (i < tokens.length && tokens[i].typ === 'ende') {
          endeIndex = tokens[i].index;
          i++;                     // ')' überspringen
        }
        liste.push({ art: 'block', typ: t.typ, index: t.index, endeIndex, kinder });
      } else {
        liste.push({ art: 'simpel', typ: t.typ, index: t.index });
        i++;
      }
    }
    return liste;
  }

  return leseListe();
}

/**
 * Führt eine Liste von Knoten NACHEINANDER aus.
 * Gibt den Status des ersten "besonderen" Ereignisses zurück
 * ('gewonnen' | 'fehler') oder 'weiter', wenn alles normal durchlief.
 */
async function fuehreProgramm(knoten) {
  for (const k of knoten) {
    if (abbruchGewuenscht) return 'abbruch';  // ⏹ gedrückt
    const status = await fuehreKnoten(k);
    if (status !== 'weiter') return status;   // sofort nach oben durchreichen
  }
  return 'weiter';
}

/**
 * Führt EINEN Knoten aus: entweder einen einfachen Befehl oder einen ganzen
 * Block (Schleife/Bedingung), der wiederum Kinder enthält (Rekursion!).
 */
async function fuehreKnoten(k) {
  // --- einfacher Baustein (vor / links / rechts) ---
  if (k.art === 'simpel') {
    await warteAufSchritt();                  // Einzelschritt-Modus: pausieren
    if (abbruchGewuenscht) return 'abbruch';
    hebeBlockHervor(k.index);
    const ergebnis = fuehreBefehlAus(k.typ);
    zeichneKatze();
    zeichneSpur();
    // Passendes Geräusch zum Schritt bzw. zur Drehung.
    spieleTon(!ergebnis.gueltig ? 'bonk' : (k.typ === 'vor' ? 'schritt' : 'dreh'));
    await warte(schrittDelay());

    if (!ergebnis.gueltig) {
      // Zusammenstoß direkt auf dem Feld sichtbar machen (💥 auf dem Feld,
      // gegen das die Katze gelaufen ist – bzw. am Rand auf ihrem Feld).
      zeigeMarker(ergebnis.z, ergebnis.s, '💥');
      fehlerGrund = ergebnis.grund;
      return 'fehler';
    }
    // Gewonnen ist erst, wenn auch ALLE Sammelobjekte eingesammelt sind.
    if (raster[katzeZeile][katzeSpalte] === 'F') {
      if (gesammelt.size >= sammelFelder.length) return 'gewonnen';
      setzeMeldung('Erst ' + aktuellesSammel.i + ' einsammeln, dann zählt das Ziel!', false);
    }
    return 'weiter';
  }

  // --- Block-Bausteine ---

  // Wiederhol-Schleife mit fester Anzahl (2× oder 3×).
  if (k.typ === 'loop2' || k.typ === 'loop3') {
    const anzahl = (k.typ === 'loop2') ? 2 : 3;
    markiereBereich(k.index, k.endeIndex, true);   // ganze Klammer markieren
    for (let runde = 0; runde < anzahl; runde++) {
      hebeBlockHervor(k.index);
      await warte(blockDelay());
      const status = await fuehreProgramm(k.kinder);
      if (status !== 'weiter') return status;
    }
    markiereBereich(k.index, k.endeIndex, false);
    return 'weiter';
  }

  // "bis Ziel": wiederholt den Inhalt, bis das Ziel erreicht ist.
  if (k.typ === 'loopZiel') {
    if (k.kinder.length === 0) {
      fehlerGrund = 'Die „bis Ziel"-Schleife ist leer. Lege Befehle hinein! 🧩';
      return 'fehler';
    }
    markiereBereich(k.index, k.endeIndex, true);   // ganze Klammer markieren
    // KREIS-ERKENNUNG: Das Spiel ist deterministisch. Steht die Katze am
    // Schleifenkopf in einem Zustand, den sie hier schon einmal hatte,
    // würde die Schleife EWIG laufen -> sofort freundlich abbrechen,
    // statt das Kind eine Minute lang warten zu lassen.
    const gesehen = new Set();
    for (let runde = 0; runde < MAX_ZIEL_WIEDERHOLUNGEN; runde++) {
      const zustand = katzeZeile + ',' + katzeSpalte + ',' + katzeBlick + ',' + gesammelt.size;
      if (gesehen.has(zustand)) {
        fehlerGrund = 'Die Katze dreht sich im Kreis – so findet sie das Ziel nie. 🌀';
        return 'fehler';
      }
      gesehen.add(zustand);
      hebeBlockHervor(k.index);
      await warte(blockDelay());
      const status = await fuehreProgramm(k.kinder);
      if (status !== 'weiter') return status;   // gewonnen oder fehler
    }
    fehlerGrund = 'Die Schleife lief sehr oft, ohne das Ziel zu finden. 🔁';
    return 'fehler';
  }

  // "solange frei": wiederholt den Inhalt, SOLANGE das Feld voraus frei ist
  // (eine "while"-Schleife). Kreis-Erkennung wie bei "bis Ziel".
  if (k.typ === 'solangeFrei') {
    if (k.kinder.length === 0) {
      fehlerGrund = 'Die „solange frei"-Schleife ist leer. Lege Befehle hinein! 🧩';
      return 'fehler';
    }
    let runden = 0;
    const gesehen = new Set();
    markiereBereich(k.index, k.endeIndex, true);   // ganze Klammer markieren
    while (istVorneFrei()) {
      const zustand = katzeZeile + ',' + katzeSpalte + ',' + katzeBlick + ',' + gesammelt.size;
      if (gesehen.has(zustand) || runden++ >= MAX_ZIEL_WIEDERHOLUNGEN) {
        fehlerGrund = 'Die Katze dreht sich im Kreis – die Schleife hört nie auf. 🌀';
        return 'fehler';
      }
      gesehen.add(zustand);
      hebeBlockHervor(k.index);
      await warte(blockDelay());
      const status = await fuehreProgramm(k.kinder);
      if (status !== 'weiter') return status;
    }
    markiereBereich(k.index, k.endeIndex, false);
    return 'weiter';
  }

  // "wenn frei": Inhalt nur ausführen, wenn das Feld vor der Katze frei ist.
  if (k.typ === 'wennFrei') {
    markiereBereich(k.index, k.endeIndex, true);
    hebeBlockHervor(k.index);
    await warte(blockDelay());
    let status = 'weiter';
    if (istVorneFrei()) {
      status = await fuehreProgramm(k.kinder);
    }
    markiereBereich(k.index, k.endeIndex, false);
    return status;   // Bedingung nicht erfüllt -> Inhalt übersprungen
  }

  // "wenn Wand": Inhalt nur ausführen, wenn das Feld voraus BLOCKIERT ist
  // (Wand oder Hindernis). Gegenstück zu "wenn frei".
  if (k.typ === 'wennWand') {
    markiereBereich(k.index, k.endeIndex, true);
    hebeBlockHervor(k.index);
    await warte(blockDelay());
    let status = 'weiter';
    if (!istVorneFrei()) {
      status = await fuehreProgramm(k.kinder);
    }
    markiereBereich(k.index, k.endeIndex, false);
    return status;
  }

  return 'weiter';
}

/**
 * Hebt den Block an Position 'index' in der Queue hervor (aktiver Schritt).
 * Die Bereichs-Markierung von Schleifen (siehe markiereBereich) bleibt
 * dabei absichtlich bestehen – sie zeigt, WAS gerade wiederholt wird,
 * während der gelbe "aktiv"-Block den EINZELNEN Schritt zeigt.
 */
function hebeBlockHervor(index) {
  queueBloecke.forEach((b) => b.classList.remove('queue-block--aktiv'));
  const block = queueBloecke[index];
  if (block) {
    block.classList.add('queue-block--aktiv');
    block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/**
 * Markiert (an=true) oder entmarkiert (an=false) den gesamten Klammer-
 * Bereich einer Schleife/Bedingung in der Queue – Öffner bis Schließer.
 * Bei verschachtelten Schleifen überlagern sich die Markierungen einfach.
 */
function markiereBereich(von, bis, an) {
  for (let i = von; i <= bis; i++) {
    if (queueBloecke[i]) {
      queueBloecke[i].classList.toggle('queue-block--bereich', an);
    }
  }
}

/** Prüft, ob das Feld direkt vor der Katze frei (begehbar) ist. */
function istVorneFrei() {
  const dz = [-1, 0, 1, 0][katzeBlick];
  const ds = [0, 1, 0, -1][katzeBlick];
  const z = katzeZeile + dz;
  const s = katzeSpalte + ds;
  if (z < 0 || z >= zeilenAnzahl || s < 0 || s >= spaltenAnzahl) return false;
  return !istBlockiert(raster[z][s]);
}

/** Zentrale Hindernis-Prüfung: Wasser, Hund und Zaun blockieren. */
function istBlockiert(feld) {
  return feld === 'W' || feld === 'H' || feld === 'Z';
}

/**
 * Führt EINEN Befehl aus und verändert dabei die Katzen-Variablen.
 * Rückgabe:
 *   { gueltig: true }                 -> Schritt war erlaubt
 *   { gueltig: false, grund: '...' }  -> ungültig (Wand/Hindernis)
 * Nebenbei wird die Spur (spurPfad / drehMarker) fortgeschrieben.
 */
function fuehreBefehlAus(befehl) {
  if (befehl === 'links') {
    ausgefuehrteAktionen++;
    katzeBlick = (katzeBlick + 3) % 4;         // gegen den Uhrzeigersinn
    katzeGrad -= 90;                            // sanft nach links drehen
    drehMarker.push({ z: katzeZeile, s: katzeSpalte, typ: 'links' });
    return { gueltig: true };
  }

  if (befehl === 'rechts') {
    ausgefuehrteAktionen++;
    katzeBlick = (katzeBlick + 1) % 4;         // im Uhrzeigersinn
    katzeGrad += 90;                           // sanft nach rechts drehen
    drehMarker.push({ z: katzeZeile, s: katzeSpalte, typ: 'rechts' });
    return { gueltig: true };
  }

  if (befehl === 'vor') {
    // Zielfeld je nach Blickrichtung (0=oben,1=rechts,2=unten,3=links).
    const dz = [-1, 0, 1, 0][katzeBlick];
    const ds = [0, 1, 0, -1][katzeBlick];
    const neueZeile  = katzeZeile  + dz;
    const neueSpalte = katzeSpalte + ds;

    // 1) Außerhalb des Spielfelds? -> Wand. Das 💥 sitzt dann auf dem
    //    aktuellen Feld der Katze (das Nachbarfeld gibt es ja nicht).
    if (
      neueZeile < 0 || neueZeile >= zeilenAnzahl ||
      neueSpalte < 0 || neueSpalte >= spaltenAnzahl
    ) {
      return { gueltig: false, grund: 'Aua, eine Wand! 🧱', z: katzeZeile, s: katzeSpalte };
    }

    // 2) Hindernis? -> 💥 kommt auf das blockierte Nachbarfeld.
    const feld = raster[neueZeile][neueSpalte];
    if (feld === 'W') return { gueltig: false, grund: 'Platsch, Wasser! 💧', z: neueZeile, s: neueSpalte };
    if (feld === 'H') return { gueltig: false, grund: 'Wuff, ein Hund! 🐶', z: neueZeile, s: neueSpalte };
    if (feld === 'Z') return { gueltig: false, grund: 'Rums, ein Zaun! 🚧', z: neueZeile, s: neueSpalte };

    // 3) Frei -> Schritt ausführen und Spur verlängern.
    ausgefuehrteAktionen++;
    katzeZeile  = neueZeile;
    katzeSpalte = neueSpalte;
    spurPfad.push({ z: katzeZeile, s: katzeSpalte });
    // Sammelobjekt auf dem neuen Feld? Mitnehmen!
    if (feld === 'S' && !gesammelt.has(neueZeile + ',' + neueSpalte)) {
      sammleEin(neueZeile, neueSpalte);
    }
    return { gueltig: true };
  }

  return { gueltig: true }; // unbekannter Befehl (sollte nicht vorkommen)
}


/* ==========================================================================
   G) GELAUFENE SPUR ZEICHNEN (SVG-Linie + Dreh-Symbole)
   --------------------------------------------------------------------------
   Aus den Logikdaten (spurPfad / drehMarker) wird die Anzeige berechnet.
   So bleibt die Spur auch nach einem Größenwechsel (Gerät drehen) korrekt.
   -------------------------------------------------------------------------- */

/** Löscht die aufgezeichnete Spur und die Anzeige. */
function loescheSpur() {
  spurPfad   = [];
  drehMarker = [];
  if (elSpur)     elSpur.innerHTML = '';
  if (elSpurDreh) elSpurDreh.innerHTML = '';
}

/** Baut die SVG-Overlays aus den aktuellen Spurdaten neu auf. */
function zeichneSpur() {
  if (!elSpur) return;
  elSpur.innerHTML = '';
  if (elSpurDreh) elSpurDreh.innerHTML = '';

  // In den Einstellungen abschaltbar.
  const anzeigen = einstellungen.spurAnzeigen ? 'block' : 'none';
  elSpur.style.display = anzeigen;
  if (elSpurDreh) elSpurDreh.style.display = anzeigen;
  if (!einstellungen.spurAnzeigen) return;

  const breite = elSpielfeld.clientWidth;
  const hoehe  = elSpielfeld.clientHeight;
  const { padding, gap, groesse } = zellenGeometrie();

  // Beide SVGs an die Spielfeldgröße anpassen.
  for (const svg of [elSpur, elSpurDreh]) {
    if (!svg) continue;
    svg.setAttribute('width', breite);
    svg.setAttribute('height', hoehe);
    svg.setAttribute('viewBox', `0 0 ${breite} ${hoehe}`);
  }

  // Mittelpunkt einer Zelle in Pixeln.
  const mitte = (idx) => padding + idx * (groesse + gap) + groesse / 2;

  // 1) Die Linie durch alle besuchten Feld-Mittelpunkte.
  if (spurPfad.length > 1) {
    const punkte = spurPfad.map((p) => `${mitte(p.s)},${mitte(p.z)}`).join(' ');
    const linie = document.createElementNS(SVG_NS, 'polyline');
    linie.setAttribute('points', punkte);
    linie.setAttribute('class', 'spur__linie');
    elSpur.appendChild(linie);
  }

  // 2) Startpunkt als kleiner Kreis markieren.
  if (spurPfad.length > 0) {
    const start = spurPfad[0];
    const kreis = document.createElementNS(SVG_NS, 'circle');
    kreis.setAttribute('cx', mitte(start.s));
    kreis.setAttribute('cy', mitte(start.z));
    kreis.setAttribute('r', Math.max(3, groesse * 0.09));
    kreis.setAttribute('class', 'spur__punkt');
    elSpur.appendChild(kreis);
  }

  // 3) Dreh-Symbole dort einblenden, wo die Katze abgebogen ist.
  //    Sie liegen im OBEREN SVG (über der Katze) und werden bei mehreren
  //    Drehungen auf demselben Feld leicht versetzt gestapelt, statt sich
  //    deckungsgleich zu überlagern.
  const proFeld = {};   // zählt Drehungen pro Feld für den Versatz
  drehMarker.forEach((m) => {
    const key = m.z + ',' + m.s;
    const nummer = proFeld[key] || 0;
    proFeld[key] = nummer + 1;

    const text = document.createElementNS(SVG_NS, 'text');
    // Versatz: 1. Drehung mittig, weitere wandern nach rechts unten.
    const versatz = Math.min(nummer, 3) * groesse * 0.18;
    text.setAttribute('x', mitte(m.s) + versatz);
    text.setAttribute('y', mitte(m.z) + versatz * 0.6);
    text.setAttribute('class', 'spur__dreh');
    // ↺ = Linksdrehung, ↻ = Rechtsdrehung (gleiche Symbole wie die Buttons).
    text.textContent = (m.typ === 'links') ? '↺' : '↻';
    (elSpurDreh || elSpur).appendChild(text);
  });
}

/* --------------------------------------------------------------------------
   CRASH-/STOPP-MARKIERUNGEN auf dem Spielbrett
   --------------------------------------------------------------------------
   Kleine Emoji-Markierung (z. B. 💥 beim Zusammenstoß, ❓ wenn das Ziel nicht
   erreicht wurde) direkt auf einem Feld. So sieht das Kind SOFORT, WO und
   WARUM es nicht weiterging – nicht nur als Text oben. Markierungen liegen
   über der Katze und werden beim nächsten Start/Level wieder entfernt.
   -------------------------------------------------------------------------- */
function zeigeMarker(zeile, spalte, emoji) {
  const daten = { z: zeile, s: spalte, emoji, klein: false };
  crashMarker.push(daten);
  zeichneAlleMarker();
  // Nach einem Moment schrumpft der Marker in die Ecke des Feldes, damit
  // das Hindernis darunter (Hund/Pfütze) wieder sichtbar wird.
  setTimeout(() => {
    if (crashMarker.includes(daten)) {
      daten.klein = true;
      zeichneAlleMarker();
    }
  }, 1300);
}

/**
 * Zeichnet alle gespeicherten Marker neu – wird auch bei Größenwechsel
 * (Gerät drehen) aufgerufen, damit die Marker auf ihren Feldern bleiben.
 */
function zeichneAlleMarker() {
  if (!elSpielfeld) return;
  elSpielfeld.querySelectorAll('.marker').forEach((m) => m.remove());
  const { padding, gap, groesse } = zellenGeometrie();
  for (const m of crashMarker) {
    const el = document.createElement('div');
    el.className = 'marker' + (m.klein ? ' marker--klein' : '');
    el.textContent = m.emoji;
    el.style.width  = groesse + 'px';
    el.style.height = groesse + 'px';
    // Positionierung über left/top, damit 'transform' frei für Animationen bleibt.
    el.style.left = (padding + m.s * (groesse + gap)) + 'px';
    el.style.top  = (padding + m.z * (groesse + gap)) + 'px';
    elSpielfeld.appendChild(el);
  }
}

/** Entfernt alle Crash-/Stopp-Markierungen vom Spielbrett. */
function loescheMarker() {
  crashMarker = [];
  if (!elSpielfeld) return;
  elSpielfeld.querySelectorAll('.marker').forEach((m) => m.remove());
}


/* ==========================================================================
   H) FEEDBACK & LEVELWECHSEL
   -------------------------------------------------------------------------- */

/** Setzt den Text der Statusmeldung (rot + Wackeln bei Fehlern). */
function setzeMeldung(text, istFehler) {
  elMeldung.textContent = text;
  elMeldung.classList.toggle('status__meldung--fehler', !!istFehler);
}

/**
 * Sperrt/erlaubt die Eingabe-Buttons während der Ausführung.
 * WICHTIG: Der Start-Knopf bleibt IMMER bedienbar – während des Laufs wird
 * er zum ⏹-Stopp-Knopf, damit das Kind nie "gefangen" ist (z. B. in einer
 * langen Schleife bei langsamem Tempo).
 */
function setzeEingabenAktiv(aktiv) {
  document.querySelectorAll('.aktion-btn').forEach((b) => (b.disabled = !aktiv));
  elResetBtn.disabled = !aktiv;

  if (aktiv) {
    elPlayBtn.textContent = '▶︎ Start';
    elPlayBtn.classList.remove('steuer-btn--stopp');
    elStepBtn.textContent = '🐾 1 Schritt';
    elStepBtn.disabled = false;
  } else {
    elPlayBtn.textContent = '⏹ Stopp';
    elPlayBtn.classList.add('steuer-btn--stopp');
    // Im Einzelschritt-Modus gibt der 🐾-Knopf den nächsten Befehl frei.
    elStepBtn.textContent = '🐾 Weiter';
    elStepBtn.disabled = !schrittweise;
  }
}

/**
 * FEHLVERSUCH. WICHTIG (Fehlerkultur): Die Warteschlange bleibt erhalten,
 * damit das Kind seinen "Code" prüfen, den Fehler suchen und korrigieren
 * kann. Es gibt unendlich viele Versuche. Die gelaufene Spur bleibt sichtbar.
 */
async function fehlversuch(grund) {
  if (elKatze) elKatze.classList.add('katze--bonk');
  setzeMeldung(grund, true);   // kurz halten – das 💥/❓ auf dem Feld zeigt das WO

  await warte(1100); // Fehler-Moment (inkl. Markierung) kurz wahrnehmen lassen

  if (elKatze) elKatze.classList.remove('katze--bonk');
  setzeKatzeAufStart();   // Katze zurück auf Start – Queue & Spur bleiben!
  beendeAusführung();
}

/* --------------------------------------------------------------------------
   EFFIZIENZ-BEWERTUNG (Sterne)
   --------------------------------------------------------------------------
   Idee: Wir kennen die theoretisch KÜRZESTE Lösung – die minimale Anzahl
   an Aktionen (Schritte + Drehungen), um vom Start (über alle Sammel-
   objekte) zum Ziel zu kommen. Das berechnen wir sicher per Breitensuche
   über alle Zustände (Zeile, Spalte, Blickrichtung, Sammel-Maske).

   Der Spieler wird danach bewertet, wie viele BAUSTEINE sein Programm hat
   (befehlsQueue.length). Wer clever Schleifen benutzt, kommt mit weniger
   Bausteinen aus – deshalb belohnt diese Metrik effizienten Code.

   Die Toleranz WÄCHST mit der Levelgröße: Bei einem Mini-Level (min 2)
   wären 2 "Gratis-Bausteine" ja schon die halbe Lösung – dort zählt
   jeder Baustein. Bei langen Wegen darf der Code etwas großzügiger sein.
   -------------------------------------------------------------------------- */

/** Erlaubte Zusatz-Bausteine für 3 bzw. 2 Sterne, abhängig vom Minimum. */
function sterneToleranzen(minimum) {
  if (minimum <= 4)  return { drei: 0, zwei: 2 };   // Mini-Level: exakt!
  if (minimum <= 12) return { drei: 2, zwei: 6 };
  return { drei: 4, zwei: 9 };                      // lange Wege: großzügiger
}

/**
 * Berechnet per BFS die minimale Anzahl an Aktionen (Schritt/Drehung), um
 * von einem Zustand aus ALLE Sammelobjekte zu holen und das Ziel 'F' zu
 * erreichen. Ohne Argumente wird vom Level-Start aus gerechnet; mit
 * Argumenten von einer beliebigen Position (für den "Fast!"-Hinweis).
 * Gibt Infinity zurück, falls das Ziel nicht erreichbar ist.
 */
function minimaleAktionen(vonZeile = startZeile, vonSpalte = startSpalte,
                          vonBlick = startBlick, vonMaske = 0) {
  // Ziel-Feld suchen.
  let zielZ = -1, zielS = -1;
  for (let z = 0; z < zeilenAnzahl; z++) {
    for (let s = 0; s < spaltenAnzahl; s++) {
      if (raster[z][s] === 'F') { zielZ = z; zielS = s; }
    }
  }
  if (zielZ === -1) return Infinity;

  const volleMaske = (1 << sammelFelder.length) - 1;
  const maskeFuer = (z, s) => {
    const i = sammelFelder.findIndex((f) => f.z === z && f.s === s);
    return i >= 0 ? (1 << i) : 0;
  };

  const schluessel = (z, s, b, m) => z + ',' + s + ',' + b + ',' + m;
  const gesehen = new Set([schluessel(vonZeile, vonSpalte, vonBlick, vonMaske)]);
  // Warteschlange der BFS: [zeile, spalte, blick, maske, kosten]
  const queue = [[vonZeile, vonSpalte, vonBlick, vonMaske, 0]];

  while (queue.length > 0) {
    const [z, s, b, m, kosten] = queue.shift();
    if (z === zielZ && s === zielS && m === volleMaske) return kosten;

    // Mögliche Folgezustände: links drehen, rechts drehen, vorwärts.
    const kandidaten = [];
    kandidaten.push([z, s, (b + 3) % 4, m]);         // links
    kandidaten.push([z, s, (b + 1) % 4, m]);         // rechts
    const dz = [-1, 0, 1, 0][b];
    const ds = [0, 1, 0, -1][b];
    const nz = z + dz, ns = s + ds;
    if (nz >= 0 && nz < zeilenAnzahl && ns >= 0 && ns < spaltenAnzahl &&
        !istBlockiert(raster[nz][ns])) {
      kandidaten.push([nz, ns, b, m | maskeFuer(nz, ns)]);   // vorwärts
    }

    for (const [kz, ks, kb, km] of kandidaten) {
      const key = schluessel(kz, ks, kb, km);
      if (!gesehen.has(key)) {
        gesehen.add(key);
        queue.push([kz, ks, kb, km, kosten + 1]);
      }
    }
  }
  return Infinity; // unerreichbar (kommt bei geprüften Leveln nicht vor)
}

/** Ermittelt die Sterne (1–3) aus Bausteinzahl und Minimum (Effizienz). */
function berechneSterne(bausteine, minimum) {
  if (!isFinite(minimum)) return 1;
  const toleranz = sterneToleranzen(minimum);
  if (bausteine <= minimum + toleranz.drei) return 3;
  if (bausteine <= minimum + toleranz.zwei) return 2;
  return 1;
}

/**
 * Ermittelt die 💡-Punkte (1–3) aus der Zahl der Versuche.
 * Belohnt "gleich beim ersten Mal richtig gedacht" statt Ausprobieren.
 */
function berechneKnobel(anzahlVersuche) {
  if (anzahlVersuche <= 1) return 3;   // erster Versuch = Volltreffer
  if (anzahlVersuche <= 3) return 2;
  return 1;
}

/** Zeichnet eine Bewertungs-Reihe (3 Symbole, voll/leer) in ein Element. */
function zeichneReihe(el, anzahl, vollSymbol, leerSymbol) {
  el.innerHTML = '';
  for (let i = 1; i <= 3; i++) {
    const span = document.createElement('span');
    const voll = i <= anzahl;
    span.className = 'sterne__stern' + (voll ? ' sterne__stern--voll' : '');
    span.textContent = voll ? vollSymbol : leerSymbol;
    el.appendChild(span);
  }
}

/**
 * Kleine Feier direkt AUF dem Spielbrett (Konfetti-Emojis am Zielfeld),
 * BEVOR das Overlay alles verdeckt – so sieht das Kind den schönen Moment
 * "Katze sitzt beim Fisch" wirklich.
 */
function zeigeFeier(zeile, spalte) {
  if (!elSpielfeld) return;
  const { padding, gap, groesse } = zellenGeometrie();
  const cx = padding + spalte * (groesse + gap) + groesse / 2;
  const cy = padding + zeile  * (groesse + gap) + groesse / 2;
  const teilchen = ['🎉', '✨', '💖', '⭐', '🎊', '✨'];
  teilchen.forEach((emoji, i) => {
    const el = document.createElement('div');
    el.className = 'feier';
    el.textContent = emoji;
    el.style.left = cx + 'px';
    el.style.top  = cy + 'px';
    // Flugrichtung pro Teilchen (CSS-Variablen für die Animation).
    const winkel = (i / teilchen.length) * Math.PI * 2;
    el.style.setProperty('--fx', Math.cos(winkel) * groesse * 1.1 + 'px');
    el.style.setProperty('--fy', Math.sin(winkel) * groesse * 1.1 - groesse * 0.4 + 'px');
    elSpielfeld.appendChild(el);
    setTimeout(() => el.remove(), 1400);
  });
}

/** Die Katze hat das Ziel erreicht. */
async function levelGeschafft() {
  // Abwechslungsreiches Lob statt immer "Super!".
  const lob = LOB[Math.floor(Math.random() * LOB.length)];
  setzeMeldung(lob + ' ' + aktuellesZiel.i, false);
  spieleTon('sieg');

  // Erst kurz auf dem Brett feiern, DANN das Overlay zeigen.
  zeigeFeier(katzeZeile, katzeSpalte);
  await warte(1200);

  // --- Bewertung berechnen ---
  const minimum   = minimaleAktionen();
  const bausteine = befehlsQueue.length;
  const knobel    = berechneKnobel(versuche);             // gleich richtig?

  // ⭐ Effizienz: Bausteine im Vergleich zum kürzesten Weg. Wer SCHLEIFEN
  // benutzt, bekommt einen Bonus-Stern – aber nur, wenn die Schleife den
  // Code wirklich VERKÜRZT (weniger Bausteine als ausgeführte Aktionen).
  // Eine angehängte "Deko-Schleife" ohne Wirkung bringt nichts.
  const nutztSchleifen = befehlsQueue.some((t) => OEFFNER.has(t));
  const schleifeLohnt  = nutztSchleifen && bausteine < ausgefuehrteAktionen;
  let sterne = berechneSterne(bausteine, minimum);
  let bonusText = '';
  if (schleifeLohnt && sterne < 3) {
    sterne += 1;
    bonusText = ' 🔁 Schleifen-Bonus: +1 ⭐!';
  }

  // Zwei beschriftete Reihen: ⭐ "Kurzer Code", 💡 "Wenig Versuche".
  zeichneReihe(elSterne, sterne, '★', '☆');
  zeichneReihe(elKnobel, knobel, '💡', '💡');

  // Erklärte Zahlen in einfachen Wörtern. WICHTIG: 'minimum' zählt
  // SCHRITTE & DREHUNGEN (den kürzesten Weg), nicht Bausteine – mit
  // Schleifen kann der Code sogar kürzer sein als der Weg.
  let codeText;
  if (bausteine < minimum) {
    codeText = 'Dein Code: nur ' + bausteine + ' Bausteine für ' + minimum +
               ' Schritte – Schleifen-Magie! 🤯';
  } else if (bausteine <= minimum) {
    codeText = 'Dein Code: ' + bausteine + ' Bausteine – kürzer geht es nicht!';
  } else {
    codeText = 'Dein Code: ' + bausteine + ' Bausteine · kürzester Weg: ' +
               minimum + ' Schritte & Drehungen.';
  }
  const versuchText = (versuche === 1)
    ? 'Gleich beim 1. Versuch! 🎉'
    : 'Das war Versuch Nr. ' + versuche + '.';
  elBewertung.textContent = codeText + bonusText + ' ' + versuchText;

  // Beste Sterne- und 💡-Zahl für die Level-Auswahl merken und speichern.
  const bisherS = bestSterne[aktuelleSchwierigkeit][aktuellesLevel] || 0;
  bestSterne[aktuelleSchwierigkeit][aktuellesLevel] = Math.max(bisherS, sterne);
  const bisherK = bestKnobel[aktuelleSchwierigkeit][aktuellesLevel] || 0;
  bestKnobel[aktuelleSchwierigkeit][aktuellesLevel] = Math.max(bisherK, knobel);
  speichereEinstellungen();

  // 🔁 SCHLEIFEN FREISCHALTEN: Wer genug Grundlagen geschafft hat, bekommt
  // die Profi-Bausteine aktiv ANGEBOTEN (statt sie im ⚙️-Menü suchen zu
  // müssen). Das Fenster erscheint einmalig nach dem nächsten "Weiter".
  if (!profiAngeboten && !einstellungen.profiModus &&
      aktuelleSchwierigkeit === 'leicht' && aktuellesLevel >= 9) {
    profiAngeboten = true;
    profiUnlockAusstehend = true;
    speichereEinstellungen();
  }

  // Der Coach ist fertig, sobald das erste Level geschafft ist.
  if (!tutorialGesehen) {
    tutorialGesehen = true;
    versteckeCoach();
    speichereEinstellungen();
  }

  // Haupttext (kurz, mit Ziel-Emoji) + Buttons.
  const istLetzteStufe = (aktuelleSchwierigkeit === 'schwer');
  const istLetztes = aktuellesLevel >= aktuelleLevels().length - 1;
  if (istLetztes && istLetzteStufe) {
    elOverlayText.textContent = 'Wow! Alles geschafft! 🏆';
    // Bewusst NICHT "Nochmal" – das hieße sonst dasselbe wie der
    // Nochmal-Button daneben, würde aber etwas ganz anderes tun.
    elWeiterBtn.textContent = 'Von vorn 🏁';
  } else if (istLetztes) {
    elOverlayText.textContent = 'Stufe geschafft! Weiter geht’s 💪';
    elWeiterBtn.textContent = 'Weiter ➜';
  } else {
    elOverlayText.textContent = aktuellesZiel.i + ' gefunden!';
    elWeiterBtn.textContent = 'Weiter ➜';
  }

  // "Nochmal" nur anbieten, wenn es noch Luft nach oben gibt.
  elNochmalBtn.hidden = (sterne === 3 && knobel === 3);

  zeigeOverlay(elOverlay);
  beendeAusführung();
}

/**
 * "Nochmal versuchen": Das Level startet KOMPLETT frisch – Programm weg,
 * Versuchszähler auf 0. Denn "Nochmal" heißt: noch einmal ganz neu
 * probieren und diesmal mit weniger Versuchen (und kürzerem Code) schaffen.
 */
function nochmalVersuchen() {
  versteckeOverlay(elOverlay);
  befehlsQueue = [];        // altes Programm verschwindet
  einfuegeIndex = null;
  zeichneQueue();
  versuche = 0;             // Versuchszähler frisch – volle 💡 wieder möglich
  versucheStand[aktuelleSchwierigkeit][aktuellesLevel] = 0;
  speichereEinstellungen();
  loescheSpur();
  loescheMarker();
  setzeSammelZurueck();
  setzeKatzeAufStart();
  setzeMeldung('Neuer Versuch! 💪', false);
}

/** Gemeinsamer Abschluss von Sieg und Fehlversuch: Sperren aufheben. */
function beendeAusführung() {
  laeuft            = false;
  schrittweise      = false;
  schrittGuthaben   = 0;
  schrittAufloeser  = null;
  abbruchGewuenscht = false;
  setzeEingabenAktiv(true);
  elQueue.classList.remove('queue--laeuft');
  elQueue.querySelectorAll('.queue-block--aktiv, .queue-block--bereich')
    .forEach((b) => b.classList.remove('queue-block--aktiv', 'queue-block--bereich'));
}

/**
 * Lädt das nächste Level. Am Ende einer Stufe geht es AUTOMATISCH eine Stufe
 * höher (leicht -> mittel -> schwer). Nach "schwer" bleibt es bei "schwer" –
 * es wird NIE selbstständig auf eine leichtere Stufe zurückgeschaltet.
 */
function naechstesLevel() {
  versteckeOverlay(elOverlay);

  // Steht die Schleifen-Freischaltung an? Fenster EINMALIG zeigen –
  // das nächste Level lädt darunter ganz normal weiter.
  if (profiUnlockAusstehend) {
    profiUnlockAusstehend = false;
    zeigeOverlay(elUnlockOverlay);
  }

  const anzahl = aktuelleLevels().length;
  if (aktuellesLevel < anzahl - 1) {
    aktuellesLevel++;                       // einfach nächstes Level
  } else if (aktuelleSchwierigkeit === 'leicht') {
    aktuelleSchwierigkeit = 'mittel';       // Stufe rauf
    aktuellesLevel = levelStand.mittel;     // dort weiter, wo man ggf. war
    aktualisiereEinstellungsUI();
  } else if (aktuelleSchwierigkeit === 'mittel') {
    aktuelleSchwierigkeit = 'schwer';       // Stufe rauf
    aktuellesLevel = levelStand.schwer;
    aktualisiereEinstellungsUI();
  } else {
    aktuellesLevel = 0;                     // schwer bleibt schwer (von vorn)
  }
  levelStand[aktuelleSchwierigkeit] = aktuellesLevel;

  befehlsQueue = [];   // neues Level = leere Warteschlange
  einfuegeIndex = null;
  zeichneQueue();
  ladeLevel(aktuellesLevel);
  speichereEinstellungen();   // Fortschritt merken (weiter beim nächsten Mal)
}


/* ==========================================================================
   I) EINSTELLUNGEN (Zahnrad-Menü)
   --------------------------------------------------------------------------
   Enthält: Schwierigkeit (3 Farben), Spur ein-/ausblenden und eine
   Symbol-Legende. Die Auswahl wird im Browser (localStorage) gespeichert,
   sodass sie beim nächsten Öffnen erhalten bleibt.
   -------------------------------------------------------------------------- */

const SPEICHER_KEY = 'codekatze_einstellungen';

/** Einstellungen UND Spielfortschritt aus dem Browser-Speicher laden. */
function ladeEinstellungen() {
  try {
    const roh = localStorage.getItem(SPEICHER_KEY);
    if (!roh) return;
    const daten = JSON.parse(roh);
    if (daten.schwierigkeit && SCHWIERIGKEITEN[daten.schwierigkeit]) {
      aktuelleSchwierigkeit = daten.schwierigkeit;
    }
    if (typeof daten.spurAnzeigen === 'boolean') {
      einstellungen.spurAnzeigen = daten.spurAnzeigen;
    }
    if (typeof daten.profiModus === 'boolean') {
      einstellungen.profiModus = daten.profiModus;
    }
    if (typeof daten.tonAn === 'boolean') {
      einstellungen.tonAn = daten.tonAn;
    }
    if (typeof daten.vibrationAn === 'boolean') {
      einstellungen.vibrationAn = daten.vibrationAn;
    } else if (typeof daten.tonAn === 'boolean') {
      // Migration: früher war die Vibration an den Ton gekoppelt.
      einstellungen.vibrationAn = daten.tonAn;
    }
    if (daten.tempo && TEMPO_DELAY[daten.tempo]) {
      einstellungen.tempo = daten.tempo;
    }
    // Fortschritt PRO Stufe: bei welchem Level ging es zuletzt weiter?
    if (daten.levelStand && typeof daten.levelStand === 'object') {
      for (const stufe of ['leicht', 'mittel', 'schwer']) {
        const n = daten.levelStand[stufe];
        if (Number.isInteger(n) && n >= 0 && n < SCHWIERIGKEITEN[stufe].levels.length) {
          levelStand[stufe] = n;
        }
      }
    } else if (Number.isInteger(daten.level) &&
        daten.level >= 0 && daten.level < aktuelleLevels().length) {
      // Migration alter Speicherstände (nur EIN globaler Levelstand).
      levelStand[aktuelleSchwierigkeit] = daten.level;
    }
    aktuellesLevel = levelStand[aktuelleSchwierigkeit];
    // Beste Sterne/💡 und Versuche pro Level (für Level-Auswahl & Bewertung).
    for (const stufe of ['leicht', 'mittel', 'schwer']) {
      if (daten.bestSterne && daten.bestSterne[stufe])   bestSterne[stufe]   = daten.bestSterne[stufe];
      if (daten.bestKnobel && daten.bestKnobel[stufe])   bestKnobel[stufe]   = daten.bestKnobel[stufe];
      if (daten.versucheStand && daten.versucheStand[stufe]) versucheStand[stufe] = daten.versucheStand[stufe];
    }
    if (daten.tutorialGesehen === true) tutorialGesehen = true;
    if (daten.profiAngeboten === true)  profiAngeboten  = true;
    if (daten.markeErklaert === true)   markeErklaert   = true;
  } catch (e) {
    /* Speicher nicht verfügbar (z. B. privater Modus) – dann Standardwerte. */
  }
}

/** Einstellungen und Fortschritt im Browser-Speicher sichern. */
function speichereEinstellungen() {
  try {
    localStorage.setItem(SPEICHER_KEY, JSON.stringify({
      schwierigkeit:   aktuelleSchwierigkeit,
      levelStand:      levelStand,
      spurAnzeigen:    einstellungen.spurAnzeigen,
      profiModus:      einstellungen.profiModus,
      tonAn:           einstellungen.tonAn,
      vibrationAn:     einstellungen.vibrationAn,
      tempo:           einstellungen.tempo,
      bestSterne:      bestSterne,
      bestKnobel:      bestKnobel,
      versucheStand:   versucheStand,
      tutorialGesehen: tutorialGesehen,
      profiAngeboten:  profiAngeboten,
      markeErklaert:   markeErklaert,
    }));
  } catch (e) { /* still ignorieren */ }
}

/** Aktualisiert die Anzeige der Einstellungs-Bedienelemente. */
function aktualisiereEinstellungsUI() {
  // Aktive Schwierigkeit hervorheben.
  document.querySelectorAll('.schwer-btn').forEach((btn) => {
    btn.classList.toggle('schwer-btn--aktiv',
      btn.dataset.schwierigkeit === aktuelleSchwierigkeit);
  });
  // Schalter (Checkboxen) auf die aktuellen Werte setzen.
  elSpurToggle.checked  = einstellungen.spurAnzeigen;
  elProfiToggle.checked = einstellungen.profiModus;
  elTonToggle.checked   = einstellungen.tonAn;
  if (elVibToggle) elVibToggle.checked = einstellungen.vibrationAn;
  // Aktives Tempo hervorheben.
  document.querySelectorAll('.tempo-btn').forEach((btn) => {
    btn.classList.toggle('tempo-btn--aktiv', btn.dataset.tempo === einstellungen.tempo);
  });
  aktualisiereProfiLeiste();
  // Farbpunkt der Level-Anzeige an die Schwierigkeit anpassen.
  elLevel.style.setProperty('--schwierigkeit-farbe',
    SCHWIERIGKEITEN[aktuelleSchwierigkeit].farbe);
}

/**
 * Zeigt/versteckt die Profi-Baustein-Reihe. Sie ist sichtbar, wenn der
 * Profi-Modus an ist ODER das aktuelle Level ein Baustein-Budget hat
 * (Budget-Level brauchen Schleifen – auch ohne eingeschalteten Modus).
 */
function aktualisiereProfiLeiste() {
  const sichtbar = einstellungen.profiModus || bausteinBudget !== null;
  elProfiAktionen.hidden = !sichtbar;
  if (elProfiWrap) elProfiWrap.hidden = !sichtbar;
  requestAnimationFrame(aktualisiereProfiFade);   // Wisch-Hinweis prüfen
}

/**
 * Schaltet den Profi-Modus um. Das Programm bleibt dabei ERHALTEN – nur
 * wenn es beim Ausschalten Schleifen-/Logik-Bausteine enthält, wird es
 * geleert (sonst blieben unsichtbare Klammern im Programm zurück).
 */
function setzeProfiModus(an) {
  einstellungen.profiModus = an;
  aktualisiereProfiLeiste();
  if (!an && befehlsQueue.some((t) => OEFFNER.has(t) || t === 'ende')) {
    befehlsQueue = [];
    einfuegeIndex = null;
    zeichneQueue();
    loescheSpur();
    loescheMarker();
    setzeKatzeAufStart();
  }
  speichereEinstellungen();
  setzeMeldung(an ? 'Profi-Modus an 🧠' : 'Profi-Modus aus ✨', false);
}

/**
 * Wechselt die Schwierigkeit. Es geht dort weiter, wo man in dieser Stufe
 * zuletzt war – ein kurzer Ausflug in eine andere Stufe kostet also keinen
 * Fortschritt mehr.
 */
function setzeSchwierigkeit(stufe, levelIndex = null) {
  if (!SCHWIERIGKEITEN[stufe]) return;
  aktuelleSchwierigkeit = stufe;
  if (levelIndex !== null) levelStand[stufe] = levelIndex;
  aktuellesLevel = levelStand[stufe] || 0;
  befehlsQueue = [];
  einfuegeIndex = null;
  zeichneQueue();
  aktualisiereEinstellungsUI();
  speichereEinstellungen();
  ladeLevel(aktuellesLevel);
}

/* ---- kleine Overlay-Helfer (für alle Fenster) ---- */
function zeigeOverlay(el) {
  el.classList.add('overlay--sichtbar');
  el.setAttribute('aria-hidden', 'false');
  // Barrierefreiheit: Fokus in das Fenster holen (erster Knopf),
  // damit Tastatur-Nutzer nicht "draußen" weitertippen.
  const erster = el.querySelector('button');
  if (erster) erster.focus();
}
function versteckeOverlay(el) {
  el.classList.remove('overlay--sichtbar');
  el.setAttribute('aria-hidden', 'true');
}

/* --------------------------------------------------------------------------
   LEVEL-AUSWAHL  ·  öffnet sich beim Tippen auf die Level-Anzeige oben
   --------------------------------------------------------------------------
   Zeigt alle Level der aktuellen Stufe als Knöpfe. Unter gelösten Leveln
   steht die beste erreichte Sterne-Zahl. Jedes Level ist frei wählbar –
   so kann man gelöste Level erneut spielen und die Wertung verbessern.
   -------------------------------------------------------------------------- */
function oeffneLevelWahl() {
  if (laeuft) {                   // nicht mitten im Lauf öffnen
    setzeMeldung('Erst ⏹ Stopp drücken!', true);
    return;
  }
  levelWahlStufe = aktuelleSchwierigkeit;   // Tabs starten bei der eigenen Stufe
  zeichneLevelWahl();
  zeigeOverlay(elLevelWahl);
}

function zeichneLevelWahl() {
  // --- Stufen-Tabs (Leicht/Mittel/Schwer) direkt im Dialog ---
  // Jeder Tab zeigt zusätzlich die gesammelten Sterne dieser Stufe an.
  elLevelWahlTabs.innerHTML = '';
  for (const stufe of ['leicht', 'mittel', 'schwer']) {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'levelwahl-tab' +
      (stufe === levelWahlStufe ? ' levelwahl-tab--aktiv' : '');
    tab.style.setProperty('--tab-farbe', SCHWIERIGKEITEN[stufe].farbe);

    const name = document.createElement('span');
    name.textContent = SCHWIERIGKEITEN[stufe].label;
    tab.appendChild(name);

    let summe = 0;
    for (const key in bestSterne[stufe]) summe += bestSterne[stufe][key] || 0;
    const gesamt = SCHWIERIGKEITEN[stufe].levels.length * 3;
    const sterneEl = document.createElement('span');
    sterneEl.className = 'levelwahl-tab__sterne';
    sterneEl.textContent = '★ ' + summe + '/' + gesamt;
    tab.appendChild(sterneEl);

    tab.addEventListener('click', () => {
      levelWahlStufe = stufe;
      zeichneLevelWahl();          // Grid für die gewählte Stufe neu aufbauen
    });
    elLevelWahlTabs.appendChild(tab);
  }

  // --- Level-Knöpfe der angezeigten Stufe ---
  elLevelWahlGrid.innerHTML = '';
  const anzahl = SCHWIERIGKEITEN[levelWahlStufe].levels.length;

  for (let i = 0; i < anzahl; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'levelwahl-btn' +
      (levelWahlStufe === aktuelleSchwierigkeit && i === aktuellesLevel
        ? ' levelwahl-btn--aktiv' : '');

    // Level-Nummer …
    const nummer = document.createElement('span');
    nummer.textContent = i + 1;
    btn.appendChild(nummer);

    // … darunter beste Sterne UND beste 💡-Zahl (falls schon gelöst).
    // Ungelöste Spezial-Level zeigen stattdessen ihr Symbol (🔁/🌫️/🧶).
    const lv = SCHWIERIGKEITEN[levelWahlStufe].levels[i];
    const spezial = lv.nebel ? '🌫️'
      : (lv.budget !== undefined ? '🔁'
      : (lv.karte.some((r) => r.includes('S')) ? '🧶' : '·'));
    const besteS = bestSterne[levelWahlStufe][i] || 0;
    const besteK = bestKnobel[levelWahlStufe][i] || 0;
    const wertungEl = document.createElement('span');
    wertungEl.className = 'levelwahl-btn__sterne';
    wertungEl.textContent = besteS > 0
      ? '★'.repeat(besteS) + (besteK > 0 ? ' 💡' + besteK : '')
      : spezial;
    btn.appendChild(wertungEl);

    btn.addEventListener('click', () => {
      versteckeOverlay(elLevelWahl);
      // setzeSchwierigkeit übernimmt auch den reinen Levelwechsel und
      // merkt sich den Stand pro Stufe.
      setzeSchwierigkeit(levelWahlStufe, i);
    });

    elLevelWahlGrid.appendChild(btn);
  }
}

/* --------------------------------------------------------------------------
   TUTORIAL & COACH  ·  nur beim allerersten Öffnen des Spiels
   --------------------------------------------------------------------------
   Erst ein kurzes "Hallo"-Fenster, danach führt eine kleine Coach-
   Sprechblase INTERAKTIV durch das erste Level:
     Schritt 1: "Tippe Befehle"  (Aktions-Buttons pulsieren)
     Schritt 2: "Drücke ▶ Start" (Start-Button pulsiert)
   Der Coach verschwindet beim Start; nach dem ersten Sieg ist das
   Tutorial dauerhaft erledigt.
   -------------------------------------------------------------------------- */
function zeigeTutorialFallsNoetig() {
  if (tutorialGesehen) return;
  zeigeOverlay(elTutorial);
}

/** Zeigt die Coach-Blase mit Text und lässt das Ziel-Element pulsieren. */
function zeigeCoach(text, zielSelektor) {
  coachSchritt = zielSelektor === '.aktionen' ? 1 : 2;
  elCoach.textContent = text;
  elCoach.hidden = false;
  positioniereCoach();
  document.querySelectorAll('.coach-puls')
    .forEach((el) => el.classList.remove('coach-puls'));
  const ziel = document.querySelector(zielSelektor);
  if (ziel) ziel.classList.add('coach-puls');
}

/** Blendet den Coach samt Puls-Markierung aus. */
function versteckeCoach() {
  coachSchritt = 0;
  if (elCoach) elCoach.hidden = true;
  document.querySelectorAll('.coach-puls')
    .forEach((el) => el.classList.remove('coach-puls'));
}

/** Wird nach jedem gelegten Befehl gerufen: schaltet den Coach weiter. */
function coachBefehlGelegt() {
  if (coachSchritt === 1 && befehlsQueue.length >= 1) {
    zeigeCoach('Toll! Leg noch mehr Befehle – und drücke dann ▶ Start!', '#playBtn');
  }
}


/* ==========================================================================
   J) START – Event-Listener verbinden und erstes Level laden
   -------------------------------------------------------------------------- */

function verbindeButtons() {
  // iOS/Safari: Ton beim allerersten Tippen entsperren (siehe entsperreAudio).
  document.addEventListener('pointerdown', entsperreAudio, { once: true });

  // Aktions-Buttons: jeder fügt seinen Befehl zur Queue hinzu.
  document.querySelectorAll('.aktion-btn').forEach((btn) => {
    btn.addEventListener('click', () => fuegeBefehlHinzu(btn.dataset.aktion));
  });

  // Start-Button: startet die Ausführung – bzw. STOPPT sie während des Laufs.
  elPlayBtn.addEventListener('click', () => {
    if (laeuft) stoppeAusfuehrung();
    else starteAusführung(false);
  });

  // 🐾-Schritt-Button: startet im Einzelschritt-Modus bzw. gibt den
  // nächsten Befehl frei (kleiner "Debugger" zum Nachvollziehen).
  elStepBtn.addEventListener('click', () => {
    if (!laeuft) starteAusführung(true);
    else if (schrittweise) gibSchrittFrei();
  });

  // Reset/Löschen: Queue leeren, Katze auf Start, Spur löschen.
  // Das gelöschte Programm wird gemerkt – ein zweiter Tipp auf den (jetzt
  // "↩ Zurückholen" beschrifteten) Knopf stellt es wieder her. So kostet
  // ein versehentlicher 🧹-Tipp kein mühsam gebautes Programm mehr.
  elResetBtn.addEventListener('click', () => {
    if (laeuft) return;
    if (befehlsQueue.length === 0 && geloeschtesProgramm) {
      befehlsQueue = geloeschtesProgramm;
      geloeschtesProgramm = null;
      zeichneQueue();
      setzeMeldung('Wieder da! ↩', false);
      return;
    }
    geloeschtesProgramm = befehlsQueue.length > 0 ? befehlsQueue.slice() : null;
    befehlsQueue = [];
    einfuegeIndex = null;
    zeichneQueue();
    loescheSpur();
    loescheMarker();
    setzeSammelZurueck();
    setzeKatzeAufStart();
    setzeMeldung(geloeschtesProgramm
      ? 'Gelöscht – ↩ holt es zurück.' : 'Gelöscht ✨', false);
  });

  // --- Tastatur (für Desktop): Pfeile = Befehle, Enter = Start,
  //     Leertaste = 1 Schritt, Backspace = Block vor der Marke (bzw. den
  //     letzten) löschen, Escape = Stopp/Fenster zu. Im Profi-Modus:
  //     2/3 = Schleifen, z = bis Ziel, f = solange frei, w = wenn frei,
  //     m = wenn Wand, 0 oder ) = Klammer fertig. ---
  document.addEventListener('keydown', (e) => {
    // Escape wirkt immer: Lauf stoppen oder offene Fenster schließen.
    if (e.key === 'Escape') {
      if (laeuft) { stoppeAusfuehrung(); return; }
      versteckeOverlay(elSettingsOverlay);
      versteckeOverlay(elLevelWahl);
      return;
    }
    const overlayOffen = document.querySelector('.overlay--sichtbar');
    // Leertaste steuert den Einzelschritt – auch WÄHREND des Laufs.
    if (e.key === ' ' && !overlayOffen) {
      e.preventDefault();
      if (!laeuft) starteAusführung(true);
      else if (schrittweise) gibSchrittFrei();
      return;
    }
    // Übrige Tasten nur, wenn kein Overlay offen ist und nichts läuft.
    if (overlayOffen || laeuft) return;

    if (e.key === 'ArrowUp')         { e.preventDefault(); fuegeBefehlHinzu('vor'); }
    else if (e.key === 'ArrowLeft')  { e.preventDefault(); fuegeBefehlHinzu('links'); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); fuegeBefehlHinzu('rechts'); }
    else if (e.key === 'Enter')      { e.preventDefault(); starteAusführung(false); }
    else if (e.key === 'Backspace' && befehlsQueue.length > 0) {
      e.preventDefault();
      // Mit gesetzter Einfügemarke löscht Backspace den Block DAVOR.
      const ziel = (einfuegeIndex !== null && einfuegeIndex > 0)
        ? einfuegeIndex - 1 : befehlsQueue.length - 1;
      loescheBefehl(ziel);
    } else if (!elProfiAktionen.hidden) {
      // Profi-Bausteine per Taste (nur wenn die Leiste sichtbar ist).
      const PROFI_TASTEN = {
        '2': 'loop2', '3': 'loop3', 'z': 'loopZiel', 'f': 'solangeFrei',
        'w': 'wennFrei', 'm': 'wennWand', '0': 'ende', ')': 'ende',
      };
      const typ = PROFI_TASTEN[e.key.toLowerCase()];
      if (typ) { e.preventDefault(); fuegeBefehlHinzu(typ); }
    }
  });

  // "Weiter" im Gewinn-Overlay -> nächstes Level.
  elWeiterBtn.addEventListener('click', naechstesLevel);

  // "Nochmal versuchen" -> gleiches Level, Programm bleibt zum Verbessern.
  elNochmalBtn.addEventListener('click', nochmalVersuchen);

  // Schleifen-Freischalt-Fenster: "Ausprobieren" schaltet den Profi-Modus
  // gleich ein, "Später" merkt sich, dass das ⚙️-Menü ihn auch kann.
  elUnlockJa.addEventListener('click', () => {
    versteckeOverlay(elUnlockOverlay);
    setzeProfiModus(true);
    aktualisiereEinstellungsUI();
    zeigeHinweisBlase('🔁 Ein Schleifen-Chip legt "( )" – lege Befehle ' +
      'dazwischen und tippe dann ") Ende".');
  });
  elUnlockSpaeter.addEventListener('click', () => {
    versteckeOverlay(elUnlockOverlay);
    setzeMeldung('Schleifen findest du jederzeit im ⚙️-Menü.', false);
  });

  // --- Einstellungen ---
  elSettingsBtn.addEventListener('click', () => {
    if (laeuft) {                          // nicht mitten im Lauf öffnen
      setzeMeldung('Erst ⏹ Stopp drücken!', true);
      return;
    }
    aktualisiereEinstellungsUI();
    zeigeOverlay(elSettingsOverlay);
  });
  elSettingsClose.addEventListener('click', () => versteckeOverlay(elSettingsOverlay));
  elSettingsFertig.addEventListener('click', () => versteckeOverlay(elSettingsOverlay));

  // Klick auf den dunklen Hintergrund schließt das Einstellungs-Fenster.
  elSettingsOverlay.addEventListener('click', (e) => {
    if (e.target === elSettingsOverlay) versteckeOverlay(elSettingsOverlay);
  });

  // Schwierigkeitsauswahl.
  document.querySelectorAll('.schwer-btn').forEach((btn) => {
    btn.addEventListener('click', () => setzeSchwierigkeit(btn.dataset.schwierigkeit));
  });

  // Spur-Schalter.
  elSpurToggle.addEventListener('change', () => {
    einstellungen.spurAnzeigen = elSpurToggle.checked;
    speichereEinstellungen();
    zeichneSpur();   // sofort ein-/ausblenden
  });

  // Profi-Modus-Schalter.
  elProfiToggle.addEventListener('change', () => {
    setzeProfiModus(elProfiToggle.checked);
  });

  // Ton und Vibration (getrennt schaltbar).
  elTonToggle.addEventListener('change', () => {
    einstellungen.tonAn = elTonToggle.checked;
    speichereEinstellungen();
    if (einstellungen.tonAn) spieleTon('schritt');   // kurzes Hörbeispiel
  });
  if (elVibToggle) {
    elVibToggle.addEventListener('change', () => {
      einstellungen.vibrationAn = elVibToggle.checked;
      speichereEinstellungen();
      if (einstellungen.vibrationAn) vibriere(60);   // kurzes Fühlbeispiel
    });
  }

  // Tempo-Auswahl (🐢 / 🐾 / 🐇).
  document.querySelectorAll('.tempo-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      einstellungen.tempo = btn.dataset.tempo;
      aktualisiereEinstellungsUI();
      speichereEinstellungen();
    });
  });

  // Level-Anzeige oben öffnet die Level-Auswahl.
  elLevel.addEventListener('click', oeffneLevelWahl);
  elLevelWahlClose.addEventListener('click', () => versteckeOverlay(elLevelWahl));
  elLevelWahl.addEventListener('click', (e) => {
    if (e.target === elLevelWahl) versteckeOverlay(elLevelWahl);
  });

  // Tutorial-Button ("Los geht's!") schließt das Hallo-Fenster und startet
  // den interaktiven Coach (dauerhaft erledigt erst nach dem ersten Sieg).
  elTutorialBtn.addEventListener('click', () => {
    versteckeOverlay(elTutorial);
    zeigeCoach('Tippe ein paar Befehle: ⬆️ ↺ ↻', '.aktionen');
  });

  // 📲 PWA-Installieren-Button in den Einstellungen: Der Browser meldet
  // per 'beforeinstallprompt', DASS installiert werden kann – erst dann
  // wird der Button eingeblendet.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPromptEvent = e;
    elInstallBtn.hidden = false;
    elInstallHinweis.hidden = true;
  });
  elInstallBtn.addEventListener('click', async () => {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    await installPromptEvent.userChoice;
    installPromptEvent = null;
    elInstallBtn.hidden = true;
  });
  window.addEventListener('appinstalled', () => {
    installPromptEvent = null;
    elInstallBtn.hidden = true;
    elInstallHinweis.hidden = true;
    setzeMeldung('Als App installiert 📲✨', false);
  });
  // iPhone/iPad kennen 'beforeinstallprompt' nicht – dort stattdessen
  // eine kurze Anleitung zeigen (Teilen-Menü -> "Zum Home-Bildschirm").
  const istIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const istInstalliert = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  if (istIOS && !istInstalliert) elInstallHinweis.hidden = false;

  // Profi-Chip-Leiste: an beiden Rändern andeuten, dass man wischen kann.
  elProfiAktionen.addEventListener('scroll', aktualisiereProfiFade);

  // Queue: unten andeuten, wenn weitere Befehls-Zeilen versteckt sind.
  elQueue.addEventListener('scroll', aktualisiereQueueFade);
}

/**
 * Zeigt an den Rändern der Profi-Leiste einen Farbverlauf, solange dort
 * noch weitere Bausteine "versteckt" sind (links UND rechts). Ohne diesen
 * Hinweis ist auf Touch-Geräten nicht erkennbar, dass man wischen kann.
 */
function aktualisiereProfiFade() {
  if (!elProfiWrap) return;
  const mehrRechts = elProfiAktionen.scrollLeft + elProfiAktionen.clientWidth
    < elProfiAktionen.scrollWidth - 4;
  const mehrLinks = elProfiAktionen.scrollLeft > 4;
  elProfiWrap.classList.toggle('profi-wrap--mehr', mehrRechts);
  elProfiWrap.classList.toggle('profi-wrap--links', mehrLinks);
}

/**
 * Bei Größenwechsel müssen Katze, Spur und Marker neu berechnet werden, da
 * sich die Zellengröße ändert. Das passiert nicht nur beim Gerät-Drehen
 * (resize), sondern AUCH, wenn die Queue mehrzeilig wird und dem Brett
 * Platz wegnimmt – dafür sorgen die ResizeObserver (Bugfix: vorher blieb
 * die Katze dann falsch positioniert in alter Größe stehen).
 */
function beobachteGroessenwechsel() {
  const neuZeichnen = () => {
    zeichneKatze();
    zeichneSpur();
    zeichneAlleMarker();        // 💥/❓ müssen auf ihren Feldern bleiben
  };
  window.addEventListener('resize', () => {
    passeSpielfeldGroesseAn();  // Brett bleibt quadratisch im freien Platz
    neuZeichnen();
    aktualisiereProfiFade();
    aktualisiereQueueFade();
  });
  if (window.ResizeObserver) {
    // Ändert sich der verfügbare RAHMEN (z. B. weil die Queue wächst),
    // wird die Brettgröße neu berechnet …
    new ResizeObserver(() => passeSpielfeldGroesseAn())
      .observe(elSpielfeld.parentElement);
    // … und ändert sich das BRETT selbst, werden alle Overlays nachgezogen.
    new ResizeObserver(neuZeichnen).observe(elSpielfeld);
  }
}

/**
 * Service Worker registrieren: macht das Spiel offline spielbar und
 * (zusammen mit manifest.webmanifest) als App installierbar.
 * Bei file:// gibt es keine Service Worker – dann läuft das Spiel
 * einfach wie bisher ohne.
 */
function registriereServiceWorker() {
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* Registrierung fehlgeschlagen – Spiel funktioniert trotzdem. */
    });
  }
}

// --- Spiel initialisieren ---
ladeEinstellungen();          // Einstellungen + Fortschritt wiederherstellen
verbindeButtons();
aktualisiereEinstellungsUI();
beobachteGroessenwechsel();
registriereServiceWorker();   // PWA: offline + installierbar
ladeLevel(aktuellesLevel);    // beim gemerkten Level weitermachen
zeigeTutorialFallsNoetig();   // kleines Tutorial nur beim allerersten Start
