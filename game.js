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
   A) LEVEL-DATEN
   --------------------------------------------------------------------------
   Jedes Level ist eine "Karte" aus Textzeilen. Ein Zeichen pro Feld:
       .  = freies Feld
       K  = Katze (Startposition)
       F  = Fisch (Ziel)
       W  = Wasserpfütze (Hindernis 💧)
       H  = Hund (Hindernis 🐶)
   'blick' = Startblickrichtung: 0=oben, 1=rechts, 2=unten, 3=links.

   Die Level sind nach DREI Schwierigkeiten gruppiert (für verschiedene
   Altersstufen) – wie die drei Farben in anderen JonFie-Spielen:
       leicht (grün)  · mittel (orange)  · schwer (rot)
   Neue Level lassen sich super einfach anhängen: einfach ein weiteres
   Objekt mit { name, blick, karte, ziel } in die passende Liste eintragen.

   'ziel' bestimmt, WAS die Katze am Zielfeld (Zeichen 'F') findet – nicht
   immer nur ein Fisch, sondern auch andere Sachen, die Katzen mögen.
   Es ist ein Objekt: { i: '🐟' (Emoji), n: 'den Fisch' (Name im Satz) }.
   Fehlt 'ziel', wird automatisch der Fisch verwendet.
   -------------------------------------------------------------------------- */
const STANDARD_ZIEL = { i: '🐟', n: 'den Fisch' };

const SCHWIERIGKEITEN = {

  leicht: {
    label: "Leicht",
    farbe: "#3ec96a",
    levels: [
      { name: 'L1', blick: 1, ziel: { i: '🐟', n: 'den Fisch' }, karte: [
        '.....',
        '.....',
        '...F.',
        '...K.',
        '.....',
      ]},
      { name: 'L2', blick: 0, ziel: { i: '🥛', n: 'die Milch' }, karte: [
        '.....',
        '..K.F',
        '.....',
        '.....',
        '.....',
      ]},
      { name: 'L3', blick: 0, ziel: { i: '🐭', n: 'die Maus' }, karte: [
        '.....',
        '..F..',
        '.....',
        '.....',
        '....K',
      ]},
      { name: 'L4', blick: 0, ziel: { i: '🧶', n: 'das Wollknäuel' }, karte: [
        '.....',
        '.....',
        '.....',
        '....K',
        '...F.',
      ]},
      { name: 'L5', blick: 3, ziel: { i: '🐦', n: 'den Vogel' }, karte: [
        '.K...',
        '.....',
        'F....',
        '.....',
        '.H...',
      ]},
      { name: 'L6', blick: 0, ziel: { i: '🦋', n: 'den Schmetterling' }, karte: [
        'W....',
        '.....',
        '.K...',
        'F....',
        '.....',
      ]},
      { name: 'L7', blick: 1, ziel: { i: '🍗', n: 'das Hähnchen' }, karte: [
        '.....',
        '.F...',
        '.....',
        '.HK..',
        '.....',
      ]},
      { name: 'L8', blick: 1, ziel: { i: '🐛', n: 'die Raupe' }, karte: [
        '...K.',
        '..F..',
        '....W',
        '.....',
        '.....',
      ]},
      { name: 'L9', blick: 0, ziel: { i: '🐟', n: 'den Fisch' }, karte: [
        '....K',
        '.FW.W',
        '.....',
        '.....',
        '.....',
      ]},
      { name: 'L10', blick: 0, ziel: { i: '🥛', n: 'die Milch' }, karte: [
        '....W',
        '....F',
        'W....',
        '.....',
        '..K..',
      ]},
      { name: 'L11', blick: 0, ziel: { i: '🐭', n: 'die Maus' }, karte: [
        '..F..',
        'W....',
        '.....',
        'WK...',
        '.....',
      ]},
      { name: 'L12', blick: 0, ziel: { i: '🧶', n: 'das Wollknäuel' }, karte: [
        '.....',
        '...H.',
        'K....',
        '.....',
        '.FW..',
      ]},
      { name: 'L13', blick: 3, ziel: { i: '🐦', n: 'den Vogel' }, karte: [
        '......',
        '.....F',
        '..K..H',
        'W.....',
        '.W....',
        '......',
      ]},
      { name: 'L14', blick: 2, ziel: { i: '🦋', n: 'den Schmetterling' }, karte: [
        '...W.K',
        '.....H',
        '......',
        '..W...',
        '.....F',
        '......',
      ]},
      { name: 'L15', blick: 1, ziel: { i: '🍗', n: 'das Hähnchen' }, karte: [
        'W..FH.',
        '......',
        '......',
        '......',
        '.....W',
        '....K.',
      ]},
      { name: 'L16', blick: 0, ziel: { i: '🐛', n: 'die Raupe' }, karte: [
        '......',
        'K.....',
        '......',
        'W.W...',
        '......',
        '..W.F.',
      ]},
      { name: 'L17', blick: 1, ziel: { i: '🐟', n: 'den Fisch' }, karte: [
        'W.....',
        '..WF..',
        '......',
        '.....W',
        '.....W',
        '.K....',
      ]},
      { name: 'L18', blick: 1, ziel: { i: '🥛', n: 'die Milch' }, karte: [
        'H..K.W',
        'W.....',
        '......',
        '....H.',
        '......',
        '.....F',
      ]},
      { name: 'L19', blick: 3, ziel: { i: '🐭', n: 'die Maus' }, karte: [
        '..WWHF',
        '.W....',
        '......',
        '......',
        '......',
        'K.....',
      ]},
      { name: 'L20', blick: 0, ziel: { i: '🧶', n: 'das Wollknäuel' }, karte: [
        '...H..',
        '....W.',
        '.K.W..',
        '.....F',
        '.....W',
        '......',
      ]},
    ],
  },

  mittel: {
    label: "Mittel",
    farbe: "#ff8a5c",
    levels: [
      { name: 'L1', blick: 0, ziel: { i: '🐟', n: 'den Fisch' }, karte: [
        '.F...',
        '....W',
        '....K',
        '.....',
        '..W.W',
      ]},
      { name: 'L2', blick: 3, ziel: { i: '🥛', n: 'die Milch' }, karte: [
        'W....',
        '...H.',
        'KW...',
        '....F',
        '.....',
      ]},
      { name: 'L3', blick: 0, ziel: { i: '🐭', n: 'die Maus' }, karte: [
        '..WK.',
        'F....',
        '..H..',
        '.....',
        '.WH..',
      ]},
      { name: 'L4', blick: 2, ziel: { i: '🧶', n: 'das Wollknäuel' }, karte: [
        'K....',
        '..W..',
        'H.F..',
        '...H.',
        'H....',
      ]},
      { name: 'L5', blick: 1, ziel: { i: '🐦', n: 'den Vogel' }, karte: [
        '.W.F.',
        '.W.H.',
        '.....',
        '...H.',
        '.K.H.',
      ]},
      { name: 'L6', blick: 2, ziel: { i: '🦋', n: 'den Schmetterling' }, karte: [
        '....F',
        '.WH..',
        'W....',
        'W.W..',
        'K....',
      ]},
      { name: 'L7', blick: 3, ziel: { i: '🍗', n: 'das Hähnchen' }, karte: [
        '...FH',
        '....W',
        'WH...',
        'K...W',
        '....H',
      ]},
      { name: 'L8', blick: 0, ziel: { i: '🐛', n: 'die Raupe' }, karte: [
        'WWW..',
        '..W..',
        '.H...',
        'F.H.K',
        '.....',
      ]},
      { name: 'L9', blick: 0, ziel: { i: '🐟', n: 'den Fisch' }, karte: [
        'F.....',
        '.....W',
        'W.....',
        '.W.W..',
        '..W...',
        'W..WK.',
      ]},
      { name: 'L10', blick: 1, ziel: { i: '🥛', n: 'die Milch' }, karte: [
        '......',
        '..W...',
        '..W...',
        '...W.F',
        '...HWH',
        '.K.W..',
      ]},
      { name: 'L11', blick: 3, ziel: { i: '🐭', n: 'die Maus' }, karte: [
        '.F..W.',
        '..H.W.',
        '.H....',
        '....W.',
        'W..W..',
        '..W..K',
      ]},
      { name: 'L12', blick: 2, ziel: { i: '🧶', n: 'das Wollknäuel' }, karte: [
        'K.....',
        'W.WWH.',
        '.H....',
        '..HH..',
        '...H.F',
        '......',
      ]},
      { name: 'L13', blick: 0, ziel: { i: '🐦', n: 'den Vogel' }, karte: [
        'WW.F..',
        'KW..W.',
        '..W...',
        '..H..W',
        '.....W',
        '....W.',
      ]},
      { name: 'L14', blick: 3, ziel: { i: '🦋', n: 'den Schmetterling' }, karte: [
        '.....W',
        'K.H..W',
        '.WHW..',
        '..W.WF',
        '......',
        '.....W',
      ]},
      { name: 'L15', blick: 0, ziel: { i: '🍗', n: 'das Hähnchen' }, karte: [
        '.....W',
        'W..K.W',
        'WH....',
        '.WH.W.',
        '.WFH..',
        '......',
      ]},
      { name: 'L16', blick: 0, ziel: { i: '🐛', n: 'die Raupe' }, karte: [
        '....KW',
        '...WH.',
        '.HW...',
        '.HWW..',
        '..W...',
        '..F.W.',
      ]},
      { name: 'L17', blick: 0, ziel: { i: '🐟', n: 'den Fisch' }, karte: [
        'H..WKH',
        '.H....',
        'WH..W.',
        'W.HW..',
        'F....W',
        '......',
      ]},
      { name: 'L18', blick: 2, ziel: { i: '🥛', n: 'die Milch' }, karte: [
        '.H.WW.',
        '.....K',
        '.W..H.',
        '..WHHW',
        '....F.',
        '....WH',
      ]},
      { name: 'L19', blick: 2, ziel: { i: '🐭', n: 'die Maus' }, karte: [
        '.K....',
        '.W....',
        'WH.WW.',
        'HWW...',
        '.W.W.W',
        '.W.F..',
      ]},
      { name: 'L20', blick: 0, ziel: { i: '🧶', n: 'das Wollknäuel' }, karte: [
        '.HW..W',
        '...WHK',
        'W.WW..',
        'H..W..',
        'F.W..W',
        '......',
      ]},
    ],
  },

  schwer: {
    label: "Schwer",
    farbe: "#e23b3b",
    levels: [
      { name: 'L1', blick: 1, ziel: { i: '🐟', n: 'den Fisch' }, karte: [
        'H.....',
        '..K.WW',
        '..H...',
        '...H..',
        '.H....',
        '.F.W..',
      ]},
      { name: 'L2', blick: 1, ziel: { i: '🥛', n: 'die Milch' }, karte: [
        '.H....',
        '.WFW..',
        '..HKW.',
        '....H.',
        '......',
        '....H.',
      ]},
      { name: 'L3', blick: 1, ziel: { i: '🐭', n: 'die Maus' }, karte: [
        '.....K',
        'WW....',
        '..W.H.',
        'W.H..H',
        'F...H.',
        '......',
      ]},
      { name: 'L4', blick: 1, ziel: { i: '🧶', n: 'das Wollknäuel' }, karte: [
        '..W...',
        'FH...H',
        '...W.W',
        'W.....',
        '....W.',
        '.W.HK.',
      ]},
      { name: 'L5', blick: 0, ziel: { i: '🐦', n: 'den Vogel' }, karte: [
        '.KH...',
        '..H.F.',
        '.W..W.',
        '.H..HW',
        '.H.H.W',
        '......',
      ]},
      { name: 'L6', blick: 0, ziel: { i: '🦋', n: 'den Schmetterling' }, karte: [
        'K.W.HH',
        '.....W',
        '.H....',
        'H...W.',
        '..WWWW',
        '....F.',
      ]},
      { name: 'L7', blick: 0, ziel: { i: '🍗', n: 'das Hähnchen' }, karte: [
        'FHWWWK',
        '..HH..',
        '...W..',
        '...W.H',
        '...H.H',
        '.W....',
      ]},
      { name: 'L8', blick: 0, ziel: { i: '🐛', n: 'die Raupe' }, karte: [
        'K...H.',
        '.W.HFH',
        '.WHW..',
        '..W...',
        'W...W.',
        'WH..H.',
      ]},
      { name: 'L9', blick: 2, ziel: { i: '🐟', n: 'den Fisch' }, karte: [
        'W.....W',
        '.W....K',
        '....WWW',
        '...H.FW',
        '..HW...',
        '...W..W',
        '.H...W.',
      ]},
      { name: 'L10', blick: 3, ziel: { i: '🥛', n: 'die Milch' }, karte: [
        'F....H.',
        '....HH.',
        '..HW...',
        '...WKW.',
        'WH..WH.',
        '.H.....',
        'H.WH...',
      ]},
      { name: 'L11', blick: 0, ziel: { i: '🐭', n: 'die Maus' }, karte: [
        'HWH....',
        '......W',
        '.H.HW..',
        'FW.H...',
        'WW.WW..',
        '..WKW..',
        '.H.....',
      ]},
      { name: 'L12', blick: 0, ziel: { i: '🧶', n: 'das Wollknäuel' }, karte: [
        '..H..H.',
        'WW..WH.',
        '.H....F',
        '...HHHW',
        '..WH..W',
        'H..W.K.',
        '.......',
      ]},
      { name: 'L13', blick: 1, ziel: { i: '🐦', n: 'den Vogel' }, karte: [
        '..W.WH.',
        'W..H...',
        '.W...W.',
        '...W.W.',
        '.WW.W..',
        '.FH...H',
        '...WKWW',
      ]},
      { name: 'L14', blick: 3, ziel: { i: '🦋', n: 'den Schmetterling' }, karte: [
        '...HHF.',
        'WH.H...',
        'W..HW.H',
        'K.WH...',
        '..H.HH.',
        '.H.....',
        '...W.HW',
      ]},
      { name: 'L15', blick: 3, ziel: { i: '🍗', n: 'das Hähnchen' }, karte: [
        '...HWFH',
        '.H..H.H',
        '..KW...',
        '.H..HH.',
        '..H..H.',
        '.WW.W..',
        'WWW...H',
      ]},
      { name: 'L16', blick: 1, ziel: { i: '🐛', n: 'die Raupe' }, karte: [
        '..H..W.',
        'W...W.H',
        '..H...H',
        'KWWW..H',
        'WF..W.W',
        '.H.....',
        '.WW.HWW',
      ]},
      { name: 'L17', blick: 3, ziel: { i: '🐟', n: 'den Fisch' }, karte: [
        'HHW....',
        '.H..W..',
        '.H.WH..',
        'H...WW.',
        'H..WW..',
        '..WK..H',
        'HFH.WHH',
      ]},
      { name: 'L18', blick: 2, ziel: { i: '🥛', n: 'die Milch' }, karte: [
        'WW.H.FH',
        '..W..WW',
        'W...WKW',
        'W..W...',
        'W.H..W.',
        '....H..',
        'WW.HWWW',
      ]},
      { name: 'L19', blick: 2, ziel: { i: '🐭', n: 'die Maus' }, karte: [
        'WHW.W.H',
        '.HFHHHW',
        'W..W...',
        'H.H..W.',
        'W.W..H.',
        'W.W.W.K',
        'W...W..',
      ]},
      { name: 'L20', blick: 3, ziel: { i: '🧶', n: 'das Wollknäuel' }, karte: [
        'F.WHK.W',
        'W..HH..',
        'HW.WWW.',
        '.W..W..',
        'WHH...W',
        'W.WH..W',
        '..WW.H.',
      ]},
    ],
  },
};


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

// Vom Nutzer wählbare Einstellungen (werden im Browser gespeichert):
let einstellungen = {
  spurAnzeigen: true,
  profiModus:   false,   // Schleifen & Logik-Bausteine freischalten
};

// Grund des letzten Fehlschlags (wird vom Interpreter gesetzt):
let fehlerGrund = '';

// Die Befehlsblöcke der Queue als DOM-Liste (für die Hervorhebung im Lauf):
let queueBloecke = [];

// Zähler, wie oft in diesem Level "Start" gedrückt wurde (für den 💡-Bonus:
// gleich beim 1. Versuch schaffen = mehr Köpfchen-Punkte).
let versuche = 0;


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

// Diese Elemente werden bei jedem Levelaufbau neu erzeugt:
let elKatze = null;   // die CSS-Katze
let elSpur  = null;   // das SVG-Overlay für die Spur

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

  // 2) Start-Position & -Blickrichtung der Katze aus der Karte ermitteln.
  startBlick = level.blick;
  for (let z = 0; z < zeilenAnzahl; z++) {
    for (let s = 0; s < spaltenAnzahl; s++) {
      if (raster[z][s] === 'K') {
        startZeile  = z;
        startSpalte = s;
        // Auf der Karte ist die Katze ab jetzt ein freies Feld – sie
        // bewegt sich als eigenes Overlay-Element darüber.
        raster[z][s] = '.';
      }
    }
  }

  // 3) Status-Anzeige aktualisieren (Levelname + Schwierigkeitsfarbe).
  elLevel.textContent = 'Level ' + (index + 1);
  setzeMeldung('Tippe Befehle, dann ▶︎', false);
  versuche = 0;   // neuer Level -> Versuchszähler zurücksetzen (für 💡-Bonus)

  // 4) Spur und Crash-Markierungen zurücksetzen, Grid zeichnen.
  loescheSpur();
  loescheMarker();
  zeichneRaster();

  // 5) Die Katze auf die Startposition setzen.
  setzeKatzeAufStart();
}

/**
 * Erzeugt die Zellen des Grids, das SVG-Spur-Overlay und die CSS-Katze.
 */
function zeichneRaster() {
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
      } else if (inhalt === 'W') {
        zelle.textContent = '💧';
      } else if (inhalt === 'H') {
        zelle.textContent = '🐶';
      }
      elSpielfeld.appendChild(zelle);
    }
  }

  // SVG-Overlay für die Spur (liegt über den Zellen, unter der Katze).
  elSpur = document.createElementNS(SVG_NS, 'svg');
  elSpur.setAttribute('class', 'spur');
  elSpielfeld.appendChild(elSpur);

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
  const padding = 8;   // muss zum padding in .spielfeld (CSS) passen
  const gap     = 4;   // muss zum gap in .spielfeld (CSS) passen
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
  Logik, Klammer zu). Die Dreh-Symbole ↺/↻ sind bewusst eindeutig gewählt:
      ↺ = Linksdrehung (gegen den Uhrzeigersinn)
      ↻ = Rechtsdrehung (im Uhrzeigersinn)
*/
const BLOCK_INFO = {
  vor:         { text: '⬆️',     klasse: '' },
  links:       { text: '↰',      klasse: '' },
  rechts:      { text: '↱',      klasse: '' },
  loop2:       { text: '🔁2 (',  klasse: 'queue-block--logik' },
  loop3:       { text: '🔁3 (',  klasse: 'queue-block--logik' },
  loopZiel:    { text: '🎯 (',   klasse: 'queue-block--logik' },
  solangeFrei: { text: '➰ (',   klasse: 'queue-block--logik' },
  wennFrei:    { text: '❓ (',   klasse: 'queue-block--logik' },
  wennWand:    { text: '🧱 (',   klasse: 'queue-block--logik' },
  ende:        { text: ')',      klasse: 'queue-block--klammer' },
};

// Welche Baustein-Typen öffnen eine Klammer (Schleife/Logik)?
const OEFFNER = new Set(['loop2', 'loop3', 'loopZiel', 'solangeFrei', 'wennFrei', 'wennWand']);

/** Hängt einen neuen Befehl an die Warteschlange an. */
function fuegeBefehlHinzu(typ) {
  if (laeuft) return;              // während des Laufs keine Änderungen
  befehlsQueue.push(typ);
  zeichneQueue();
}

/**
 * Entfernt den Befehl an Position 'index' (Tipp auf einen Block = "debuggen").
 */
function loescheBefehl(index) {
  if (laeuft) return;
  befehlsQueue.splice(index, 1);
  zeichneQueue();
}

/** Baut die sichtbare Warteschlange aus dem Array neu auf (mehrzeilig). */
function zeichneQueue() {
  elQueue.innerHTML = '';

  if (befehlsQueue.length === 0) {
    elQueue.appendChild(elQueueLeer);   // Platzhalter zeigen
    return;
  }

  befehlsQueue.forEach((typ, index) => {
    const info = BLOCK_INFO[typ];
    const block = document.createElement('div');
    block.className = 'queue-block' + (info.klasse ? ' ' + info.klasse : '');
    block.textContent = info.text;
    block.dataset.index = index;              // welchen Befehl löschen?
    block.addEventListener('click', () => loescheBefehl(index));
    elQueue.appendChild(block);
  });
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

const SCHRITT_DELAY = 500; // Millisekunden Pause zwischen zwei Befehlen

/** Pause: Promise, das nach 'ms' Millisekunden erfüllt wird. */
function warte(ms) {
  return new Promise((aufloesen) => setTimeout(aufloesen, ms));
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
async function starteAusführung() {
  if (laeuft) return;
  if (befehlsQueue.length === 0) {
    setzeMeldung('Erst Befehle tippen! 🧩', true);
    return;
  }

  // 1) Klammern der Schleifen/Logikblöcke prüfen.
  const klammerFehler = pruefeKlammern();
  if (klammerFehler) {
    setzeMeldung(klammerFehler, true);
    return;
  }

  // --- Vorbereitung ---
  laeuft = true;
  versuche++;                               // dieser Start zählt als Versuch
  setzeEingabenAktiv(false);
  elQueue.classList.add('queue--laeuft');   // blendet die Lösch-Kreuze aus
  setzeKatzeAufStart();
  loescheMarker();                          // alte Crash-Markierungen weg

  // Spur frisch beginnen: Startfeld als ersten Punkt aufnehmen.
  spurPfad   = [{ z: katzeZeile, s: katzeSpalte }];
  drehMarker = [];
  zeichneSpur();
  setzeMeldung('Die Katze läuft… 🐾', false);

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
  } else {
    // Alles abgearbeitet, aber Ziel nicht erreicht: Katze bleibt "ratlos"
    // stehen -> Fragezeichen als Visualisierung direkt auf dem Feld.
    zeigeMarker(katzeZeile, katzeSpalte, '❓');
    await fehlversuch('Ziel noch nicht erreicht 🎯');
  }
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
        if (i < tokens.length && tokens[i].typ === 'ende') i++; // ')' überspringen
        liste.push({ art: 'block', typ: t.typ, index: t.index, kinder });
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
    hebeBlockHervor(k.index);
    const ergebnis = fuehreBefehlAus(k.typ);
    zeichneKatze();
    zeichneSpur();
    await warte(SCHRITT_DELAY);

    if (!ergebnis.gueltig) {
      // Zusammenstoß direkt auf dem Feld sichtbar machen (💥 auf dem Feld,
      // gegen das die Katze gelaufen ist – bzw. am Rand auf ihrem Feld).
      zeigeMarker(ergebnis.z, ergebnis.s, '💥');
      fehlerGrund = ergebnis.grund;
      return 'fehler';
    }
    if (raster[katzeZeile][katzeSpalte] === 'F') return 'gewonnen';
    return 'weiter';
  }

  // --- Block-Bausteine ---

  // Wiederhol-Schleife mit fester Anzahl (2× oder 3×).
  if (k.typ === 'loop2' || k.typ === 'loop3') {
    const anzahl = (k.typ === 'loop2') ? 2 : 3;
    for (let runde = 0; runde < anzahl; runde++) {
      hebeBlockHervor(k.index);
      await warte(230);
      const status = await fuehreProgramm(k.kinder);
      if (status !== 'weiter') return status;
    }
    return 'weiter';
  }

  // "bis Ziel": wiederholt den Inhalt, bis das Ziel erreicht ist.
  if (k.typ === 'loopZiel') {
    if (k.kinder.length === 0) {
      fehlerGrund = 'Die „bis Ziel"-Schleife ist leer. Lege Befehle hinein! 🧩';
      return 'fehler';
    }
    for (let runde = 0; runde < MAX_ZIEL_WIEDERHOLUNGEN; runde++) {
      hebeBlockHervor(k.index);
      await warte(230);
      const status = await fuehreProgramm(k.kinder);
      if (status !== 'weiter') return status;   // gewonnen oder fehler
    }
    fehlerGrund = 'Die Schleife lief sehr oft, ohne das Ziel zu finden. 🔁';
    return 'fehler';
  }

  // "solange frei": wiederholt den Inhalt, SOLANGE das Feld voraus frei ist
  // (eine "while"-Schleife). Sicherheitsgrenze gegen Endlosschleifen.
  if (k.typ === 'solangeFrei') {
    if (k.kinder.length === 0) {
      fehlerGrund = 'Die „solange frei"-Schleife ist leer. Lege Befehle hinein! 🧩';
      return 'fehler';
    }
    let runden = 0;
    while (istVorneFrei()) {
      if (runden++ >= MAX_ZIEL_WIEDERHOLUNGEN) {
        fehlerGrund = 'Die Schleife lief sehr oft, ohne anzuhalten. 🔁';
        return 'fehler';
      }
      hebeBlockHervor(k.index);
      await warte(230);
      const status = await fuehreProgramm(k.kinder);
      if (status !== 'weiter') return status;
    }
    return 'weiter';
  }

  // "wenn frei": Inhalt nur ausführen, wenn das Feld vor der Katze frei ist.
  if (k.typ === 'wennFrei') {
    hebeBlockHervor(k.index);
    await warte(230);
    if (istVorneFrei()) {
      return await fuehreProgramm(k.kinder);
    }
    return 'weiter';   // Bedingung nicht erfüllt -> Inhalt überspringen
  }

  // "wenn Wand": Inhalt nur ausführen, wenn das Feld voraus BLOCKIERT ist
  // (Wand oder Hindernis). Gegenstück zu "wenn frei".
  if (k.typ === 'wennWand') {
    hebeBlockHervor(k.index);
    await warte(230);
    if (!istVorneFrei()) {
      return await fuehreProgramm(k.kinder);
    }
    return 'weiter';
  }

  return 'weiter';
}

/** Hebt den Block an Position 'index' in der Queue hervor (aktiver Schritt). */
function hebeBlockHervor(index) {
  queueBloecke.forEach((b) => b.classList.remove('queue-block--aktiv'));
  const block = queueBloecke[index];
  if (block) {
    block.classList.add('queue-block--aktiv');
    block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/** Prüft, ob das Feld direkt vor der Katze frei (begehbar) ist. */
function istVorneFrei() {
  const dz = [-1, 0, 1, 0][katzeBlick];
  const ds = [0, 1, 0, -1][katzeBlick];
  const z = katzeZeile + dz;
  const s = katzeSpalte + ds;
  if (z < 0 || z >= zeilenAnzahl || s < 0 || s >= spaltenAnzahl) return false;
  const feld = raster[z][s];
  return feld !== 'W' && feld !== 'H';
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
    katzeBlick = (katzeBlick + 3) % 4;         // gegen den Uhrzeigersinn
    katzeGrad -= 90;                            // sanft nach links drehen
    drehMarker.push({ z: katzeZeile, s: katzeSpalte, typ: 'links' });
    return { gueltig: true };
  }

  if (befehl === 'rechts') {
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

    // 3) Frei -> Schritt ausführen und Spur verlängern.
    katzeZeile  = neueZeile;
    katzeSpalte = neueSpalte;
    spurPfad.push({ z: katzeZeile, s: katzeSpalte });
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
  if (elSpur) elSpur.innerHTML = '';
}

/** Baut das SVG-Overlay aus den aktuellen Spurdaten neu auf. */
function zeichneSpur() {
  if (!elSpur) return;
  elSpur.innerHTML = '';

  // In den Einstellungen abschaltbar.
  elSpur.style.display = einstellungen.spurAnzeigen ? 'block' : 'none';
  if (!einstellungen.spurAnzeigen) return;

  const breite = elSpielfeld.clientWidth;
  const hoehe  = elSpielfeld.clientHeight;
  const { padding, gap, groesse } = zellenGeometrie();

  // SVG an die Spielfeldgröße anpassen.
  elSpur.setAttribute('width', breite);
  elSpur.setAttribute('height', hoehe);
  elSpur.setAttribute('viewBox', `0 0 ${breite} ${hoehe}`);

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
  drehMarker.forEach((m) => {
    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', mitte(m.s));
    text.setAttribute('y', mitte(m.z));
    text.setAttribute('class', 'spur__dreh');
    // ↰ = Linksdrehung, ↱ = Rechtsdrehung (gleiche Symbole wie die Buttons).
    text.textContent = (m.typ === 'links') ? '↰' : '↱';
    elSpur.appendChild(text);
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
  if (!elSpielfeld) return;
  const { padding, gap, groesse } = zellenGeometrie();
  const el = document.createElement('div');
  el.className = 'marker';
  el.textContent = emoji;
  el.style.width  = groesse + 'px';
  el.style.height = groesse + 'px';
  // Positionierung über left/top, damit 'transform' frei für die Pop-Animation bleibt.
  el.style.left = (padding + spalte * (groesse + gap)) + 'px';
  el.style.top  = (padding + zeile  * (groesse + gap)) + 'px';
  elSpielfeld.appendChild(el);
}

/** Entfernt alle Crash-/Stopp-Markierungen vom Spielbrett. */
function loescheMarker() {
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

/** Sperrt/erlaubt alle Eingabe-Buttons während der Ausführung. */
function setzeEingabenAktiv(aktiv) {
  document.querySelectorAll('.aktion-btn').forEach((b) => (b.disabled = !aktiv));
  elPlayBtn.disabled  = !aktiv;
  elResetBtn.disabled = !aktiv;
}

/**
 * FEHLVERSUCH. WICHTIG (Fehlerkultur): Die Warteschlange bleibt erhalten,
 * damit das Kind seinen "Code" prüfen, den Fehler suchen und korrigieren
 * kann. Es gibt unendlich viele Versuche. Die gelaufene Spur bleibt sichtbar.
 */
async function fehlversuch(grund) {
  if (elKatze) elKatze.classList.add('katze--bonk');
  setzeMeldung(grund + ' 🔁', true);   // kurz halten – das 💥/❓ auf dem Feld zeigt das WO

  await warte(1100); // Fehler-Moment (inkl. Markierung) kurz wahrnehmen lassen

  if (elKatze) elKatze.classList.remove('katze--bonk');
  setzeKatzeAufStart();   // Katze zurück auf Start – Queue & Spur bleiben!
  beendeAusführung();
}

/* --------------------------------------------------------------------------
   EFFIZIENZ-BEWERTUNG (Sterne)
   --------------------------------------------------------------------------
   Idee: Wir kennen die theoretisch KÜRZESTE Lösung – die minimale Anzahl
   an Aktionen (Schritte + Drehungen), um vom Start zum Ziel zu kommen. Das
   berechnen wir sicher per Breitensuche (BFS) über alle Zustände
   (Zeile, Spalte, Blickrichtung). Jede Aktion kostet 1.

   Der Spieler wird danach bewertet, wie viele BAUSTEINE sein Programm hat
   (befehlsQueue.length). Wer clever Schleifen benutzt, kommt mit weniger
   Bausteinen aus – deshalb belohnt diese Metrik effizienten Code.
     3 Sterne: höchstens (Minimum + 2) Bausteine   -> sehr effizient
     2 Sterne: höchstens (Minimum + 6) Bausteine
     1 Stern : geschafft, aber deutlich mehr
   -------------------------------------------------------------------------- */
const STERNE_TOLERANZ_3 = 2;
const STERNE_TOLERANZ_2 = 6;

/**
 * Berechnet per BFS die minimale Anzahl an Aktionen (Schritt/Drehung), um
 * vom Startfeld/-blick zum Ziel 'F' zu gelangen. Das ist eine bewiesen
 * korrekte untere Schranke ("so kurz geht es mindestens").
 * Gibt Infinity zurück, falls das Ziel nicht erreichbar ist.
 */
function minimaleAktionen() {
  // Ziel-Feld suchen.
  let zielZ = -1, zielS = -1;
  for (let z = 0; z < zeilenAnzahl; z++) {
    for (let s = 0; s < spaltenAnzahl; s++) {
      if (raster[z][s] === 'F') { zielZ = z; zielS = s; }
    }
  }
  if (zielZ === -1) return Infinity;

  const schluessel = (z, s, b) => z + ',' + s + ',' + b;
  const gesehen = new Set([schluessel(startZeile, startSpalte, startBlick)]);
  // Warteschlange der BFS: [zeile, spalte, blick, kosten]
  const queue = [[startZeile, startSpalte, startBlick, 0]];

  while (queue.length > 0) {
    const [z, s, b, kosten] = queue.shift();
    if (z === zielZ && s === zielS) return kosten;   // Ziel erreicht

    // Mögliche Folgezustände: links drehen, rechts drehen, vorwärts.
    const kandidaten = [];
    kandidaten.push([z, s, (b + 3) % 4]);            // links
    kandidaten.push([z, s, (b + 1) % 4]);            // rechts
    const dz = [-1, 0, 1, 0][b];
    const ds = [0, 1, 0, -1][b];
    const nz = z + dz, ns = s + ds;
    if (nz >= 0 && nz < zeilenAnzahl && ns >= 0 && ns < spaltenAnzahl) {
      const feld = raster[nz][ns];
      if (feld !== 'W' && feld !== 'H') kandidaten.push([nz, ns, b]); // vorwärts
    }

    for (const [kz, ks, kb] of kandidaten) {
      const key = schluessel(kz, ks, kb);
      if (!gesehen.has(key)) {
        gesehen.add(key);
        queue.push([kz, ks, kb, kosten + 1]);
      }
    }
  }
  return Infinity; // unerreichbar (kommt bei geprüften Leveln nicht vor)
}

/** Ermittelt die Sterne (1–3) aus Bausteinzahl und Minimum (Effizienz). */
function berechneSterne(bausteine, minimum) {
  if (!isFinite(minimum)) return 1;
  if (bausteine <= minimum + STERNE_TOLERANZ_3) return 3;
  if (bausteine <= minimum + STERNE_TOLERANZ_2) return 2;
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

/** Die Katze hat das Ziel erreicht. */
async function levelGeschafft() {
  setzeMeldung('Super! ' + aktuellesZiel.i, false);
  await warte(400);

  // --- Bewertung berechnen ---
  const minimum   = minimaleAktionen();
  const bausteine = befehlsQueue.length;
  const sterne    = berechneSterne(bausteine, minimum);   // Effizienz (Code)
  const knobel    = berechneKnobel(versuche);             // gleich richtig?

  // Zwei Icon-Reihen: ⭐ = cleverer Code, 💡 = beim 1. Mal geschafft.
  zeichneReihe(elSterne, sterne, '★', '☆');
  zeichneReihe(elKnobel, knobel, '💡', '💡');

  // Sehr kurze Rückmeldung (wenig Text, dafür klare Zahlen mit Icons).
  const versuchText = (versuche === 1) ? '1. Versuch 🎉' : (versuche + ' Versuche');
  elBewertung.textContent = '🧩 ' + bausteine + '  ·  🎯 ' + minimum + '  ·  ' + versuchText;

  // Haupttext (kurz, mit Ziel-Emoji) + Buttons.
  const istLetzteStufe = (aktuelleSchwierigkeit === 'schwer');
  const istLetztes = aktuellesLevel >= aktuelleLevels().length - 1;
  if (istLetztes && istLetzteStufe) {
    elOverlayText.textContent = 'Wow! Alles geschafft! 🏆';
    elWeiterBtn.textContent = 'Nochmal 🔁';
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
 * "Nochmal versuchen": schließt das Overlay, setzt die Katze auf Start –
 * ABER die Warteschlange bleibt erhalten, damit man sein Programm gezielt
 * verbessern (kürzen) und mehr Sterne holen kann.
 */
function nochmalVersuchen() {
  versteckeOverlay(elOverlay);
  loescheSpur();
  loescheMarker();
  setzeKatzeAufStart();
  setzeMeldung('Nochmal – mit weniger Bausteinen! 💪', false);
}

/** Gemeinsamer Abschluss von Sieg und Fehlversuch: Sperren aufheben. */
function beendeAusführung() {
  laeuft = false;
  setzeEingabenAktiv(true);
  elQueue.classList.remove('queue--laeuft');
  elQueue.querySelectorAll('.queue-block--aktiv')
    .forEach((b) => b.classList.remove('queue-block--aktiv'));
}

/**
 * Lädt das nächste Level. Am Ende einer Stufe geht es AUTOMATISCH eine Stufe
 * höher (leicht -> mittel -> schwer). Nach "schwer" bleibt es bei "schwer" –
 * es wird NIE selbstständig auf eine leichtere Stufe zurückgeschaltet.
 */
function naechstesLevel() {
  versteckeOverlay(elOverlay);

  const anzahl = aktuelleLevels().length;
  if (aktuellesLevel < anzahl - 1) {
    aktuellesLevel++;                       // einfach nächstes Level
  } else if (aktuelleSchwierigkeit === 'leicht') {
    aktuelleSchwierigkeit = 'mittel';       // Stufe rauf
    aktuellesLevel = 0;
    aktualisiereEinstellungsUI();
    speichereEinstellungen();
  } else if (aktuelleSchwierigkeit === 'mittel') {
    aktuelleSchwierigkeit = 'schwer';       // Stufe rauf
    aktuellesLevel = 0;
    aktualisiereEinstellungsUI();
    speichereEinstellungen();
  } else {
    aktuellesLevel = 0;                     // schwer bleibt schwer (von vorn)
  }

  befehlsQueue = [];   // neues Level = leere Warteschlange
  zeichneQueue();
  ladeLevel(aktuellesLevel);
}


/* ==========================================================================
   I) EINSTELLUNGEN (Zahnrad-Menü)
   --------------------------------------------------------------------------
   Enthält: Schwierigkeit (3 Farben), Spur ein-/ausblenden und eine
   Symbol-Legende. Die Auswahl wird im Browser (localStorage) gespeichert,
   sodass sie beim nächsten Öffnen erhalten bleibt.
   -------------------------------------------------------------------------- */

const SPEICHER_KEY = 'codekatze_einstellungen';

/** Einstellungen aus dem Browser-Speicher laden (falls vorhanden). */
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
  } catch (e) {
    /* Speicher nicht verfügbar (z. B. privater Modus) – dann Standardwerte. */
  }
}

/** Einstellungen im Browser-Speicher sichern. */
function speichereEinstellungen() {
  try {
    localStorage.setItem(SPEICHER_KEY, JSON.stringify({
      schwierigkeit: aktuelleSchwierigkeit,
      spurAnzeigen:  einstellungen.spurAnzeigen,
      profiModus:    einstellungen.profiModus,
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
  // Profi-Baustein-Reihe passend zum Modus ein-/ausblenden.
  elProfiAktionen.hidden = !einstellungen.profiModus;
  // Farbpunkt der Level-Anzeige an die Schwierigkeit anpassen.
  elLevel.style.setProperty('--schwierigkeit-farbe',
    SCHWIERIGKEITEN[aktuelleSchwierigkeit].farbe);
}

/**
 * Schaltet den Profi-Modus um. Zusätzliche Bausteine erscheinen bzw.
 * verschwinden. Da sich die verfügbaren Bausteine ändern, wird das aktuelle
 * Programm geleert (sonst blieben evtl. nun versteckte Schleifen zurück).
 */
function setzeProfiModus(an) {
  einstellungen.profiModus = an;
  elProfiAktionen.hidden = !an;
  befehlsQueue = [];
  zeichneQueue();
  loescheSpur();
  loescheMarker();
  setzeKatzeAufStart();
  speichereEinstellungen();
  setzeMeldung(an ? 'Profi-Modus an 🧠' : 'Profi-Modus aus ✨', false);
}

/** Wechselt die Schwierigkeit und startet bei Level 1 der neuen Stufe. */
function setzeSchwierigkeit(stufe) {
  if (!SCHWIERIGKEITEN[stufe]) return;
  aktuelleSchwierigkeit = stufe;
  aktuellesLevel = 0;
  befehlsQueue = [];
  zeichneQueue();
  aktualisiereEinstellungsUI();
  speichereEinstellungen();
  ladeLevel(aktuellesLevel);
}

/* ---- kleine Overlay-Helfer (für Gewinn- UND Einstellungs-Fenster) ---- */
function zeigeOverlay(el) {
  el.classList.add('overlay--sichtbar');
  el.setAttribute('aria-hidden', 'false');
}
function versteckeOverlay(el) {
  el.classList.remove('overlay--sichtbar');
  el.setAttribute('aria-hidden', 'true');
}


/* ==========================================================================
   J) START – Event-Listener verbinden und erstes Level laden
   -------------------------------------------------------------------------- */

function verbindeButtons() {
  // Aktions-Buttons: jeder fügt seinen Befehl zur Queue hinzu.
  document.querySelectorAll('.aktion-btn').forEach((btn) => {
    btn.addEventListener('click', () => fuegeBefehlHinzu(btn.dataset.aktion));
  });

  // Start-Button startet die Ausführung.
  elPlayBtn.addEventListener('click', starteAusführung);

  // Reset/Löschen: Queue leeren, Katze auf Start, Spur löschen.
  elResetBtn.addEventListener('click', () => {
    if (laeuft) return;
    befehlsQueue = [];
    zeichneQueue();
    loescheSpur();
    loescheMarker();
    setzeKatzeAufStart();
    setzeMeldung('Gelöscht ✨', false);
  });

  // "Weiter" im Gewinn-Overlay -> nächstes Level.
  elWeiterBtn.addEventListener('click', naechstesLevel);

  // "Nochmal versuchen" -> gleiches Level, Programm bleibt zum Verbessern.
  elNochmalBtn.addEventListener('click', nochmalVersuchen);

  // --- Einstellungen ---
  elSettingsBtn.addEventListener('click', () => {
    if (laeuft) return;                    // nicht mitten im Lauf öffnen
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
}

/**
 * Bei Größenwechsel (z. B. Gerät drehen) müssen Katze und Spur neu berechnet
 * werden, da sich die Zellengröße ändert. Das Grid selbst regelt das CSS.
 */
function beobachteGroessenwechsel() {
  window.addEventListener('resize', () => {
    zeichneKatze();
    zeichneSpur();
  });
}

// --- Spiel initialisieren ---
ladeEinstellungen();
verbindeButtons();
aktualisiereEinstellungsUI();
beobachteGroessenwechsel();
ladeLevel(aktuellesLevel);
