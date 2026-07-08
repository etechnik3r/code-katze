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
   Objekt mit { blick, karte, ziel } in die passende Liste eintragen.

   'min' ist die Länge der kürzesten Lösung (per Breitensuche berechnet) –
   nur zur Info und für die Sortierung: Innerhalb jeder Stufe sind die
   Level aufsteigend nach 'min' geordnet, damit die Schwierigkeit wirklich
   Schritt für Schritt ansteigt. Zur Laufzeit wird das Minimum immer
   frisch berechnet, 'min' muss also beim Ändern einer Karte nicht
   zwingend gepflegt werden.

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
      { blick: 1, min: 2, ziel: { i: '🐟', n: 'den Fisch' }, karte: [
        '.....',
        '.....',
        '...F.',
        '...K.',
        '.....',
      ]},
      { blick: 0, min: 3, ziel: { i: '🥛', n: 'die Milch' }, karte: [
        '.....',
        '..K.F',
        '.....',
        '.....',
        '.....',
      ]},
      { blick: 0, min: 4, ziel: { i: '🧶', n: 'das Wollknäuel' }, karte: [
        '.....',
        '.....',
        '.....',
        '....K',
        '...F.',
      ]},
      { blick: 3, min: 4, ziel: { i: '🐦', n: 'den Vogel' }, karte: [
        '.K...',
        '.....',
        'F....',
        '.....',
        '.H...',
      ]},
      { blick: 0, min: 4, ziel: { i: '🦋', n: 'den Schmetterling' }, karte: [
        'W....',
        '.....',
        '.K...',
        'F....',
        '.....',
      ]},
      { blick: 1, min: 4, ziel: { i: '🐛', n: 'die Raupe' }, karte: [
        '...K.',
        '..F..',
        '....W',
        '.....',
        '.....',
      ]},
      { blick: 1, min: 5, ziel: { i: '🍗', n: 'das Hähnchen' }, karte: [
        '.....',
        '.F...',
        '.....',
        '.HK..',
        '.....',
      ]},
      { blick: 0, min: 5, ziel: { i: '🐭', n: 'die Maus' }, karte: [
        '..F..',
        'W....',
        '.....',
        'WK...',
        '.....',
      ]},
      { blick: 0, min: 5, ziel: { i: '🧶', n: 'das Wollknäuel' }, karte: [
        '.....',
        '...H.',
        'K....',
        '.....',
        '.FW..',
      ]},
      { blick: 0, min: 6, ziel: { i: '🐭', n: 'die Maus' }, karte: [
        '.....',
        '..F..',
        '.....',
        '.....',
        '....K',
      ]},
      { blick: 0, min: 6, ziel: { i: '🐟', n: 'den Fisch' }, karte: [
        '....K',
        '.FW.W',
        '.....',
        '.....',
        '.....',
      ]},
      { blick: 0, min: 6, ziel: { i: '🥛', n: 'die Milch' }, karte: [
        '....W',
        '....F',
        'W....',
        '.....',
        '..K..',
      ]},
      { blick: 3, min: 6, ziel: { i: '🐦', n: 'den Vogel' }, karte: [
        '......',
        '.....F',
        '..K..H',
        'W.....',
        '.W....',
        '......',
      ]},
      { blick: 1, min: 7, ziel: { i: '🐟', n: 'den Fisch' }, karte: [
        'W.....',
        '..WF..',
        '......',
        '.....W',
        '.....W',
        '.K....',
      ]},
      { blick: 0, min: 8, ziel: { i: '🧶', n: 'das Wollknäuel' }, karte: [
        '...H..',
        '....W.',
        '.K.W..',
        '.....F',
        '.....W',
        '......',
      ]},
      { blick: 2, min: 9, ziel: { i: '🦋', n: 'den Schmetterling' }, karte: [
        '...W.K',
        '.....H',
        '......',
        '..W...',
        '.....F',
        '......',
      ]},
      { blick: 1, min: 9, ziel: { i: '🍗', n: 'das Hähnchen' }, karte: [
        'W..FH.',
        '......',
        '......',
        '......',
        '.....W',
        '....K.',
      ]},
      { blick: 1, min: 9, ziel: { i: '🥛', n: 'die Milch' }, karte: [
        'H..K.W',
        'W.....',
        '......',
        '....H.',
        '......',
        '.....F',
      ]},
      { blick: 0, min: 10, ziel: { i: '🐛', n: 'die Raupe' }, karte: [
        '......',
        'K.....',
        '......',
        'W.W...',
        '......',
        '..W.F.',
      ]},
      { blick: 3, min: 13, ziel: { i: '🐭', n: 'die Maus' }, karte: [
        '..WWHF',
        '.W....',
        '......',
        '......',
        '......',
        'K.....',
      ]},
    ],
  },

  mittel: {
    label: "Mittel",
    farbe: "#ff8a5c",
    levels: [
      { blick: 0, min: 7, ziel: { i: '🐟', n: 'den Fisch' }, karte: [
        '.F...',
        '....W',
        '....K',
        '.....',
        '..W.W',
      ]},
      { blick: 3, min: 7, ziel: { i: '🥛', n: 'die Milch' }, karte: [
        'W....',
        '...H.',
        'KW...',
        '....F',
        '.....',
      ]},
      { blick: 0, min: 7, ziel: { i: '🐭', n: 'die Maus' }, karte: [
        '..WK.',
        'F....',
        '..H..',
        '.....',
        '.WH..',
      ]},
      { blick: 2, min: 7, ziel: { i: '🧶', n: 'das Wollknäuel' }, karte: [
        'K....',
        '..W..',
        'H.F..',
        '...H.',
        'H....',
      ]},
      { blick: 1, min: 8, ziel: { i: '🐦', n: 'den Vogel' }, karte: [
        '.W.F.',
        '.W.H.',
        '.....',
        '...H.',
        '.K.H.',
      ]},
      { blick: 3, min: 9, ziel: { i: '🍗', n: 'das Hähnchen' }, karte: [
        '...FH',
        '....W',
        'WH...',
        'K...W',
        '....H',
      ]},
      { blick: 2, min: 10, ziel: { i: '🦋', n: 'den Schmetterling' }, karte: [
        '....F',
        '.WH..',
        'W....',
        'W.W..',
        'K....',
      ]},
      { blick: 0, min: 10, ziel: { i: '🐛', n: 'die Raupe' }, karte: [
        'WWW..',
        '..W..',
        '.H...',
        'F.H.K',
        '.....',
      ]},
      { blick: 0, min: 10, ziel: { i: '🐟', n: 'den Fisch' }, karte: [
        'F.....',
        '.....W',
        'W.....',
        '.W.W..',
        '..W...',
        'W..WK.',
      ]},
      { blick: 2, min: 11, ziel: { i: '🧶', n: 'das Wollknäuel' }, karte: [
        'K.....',
        'W.WWH.',
        '.H....',
        '..HH..',
        '...H.F',
        '......',
      ]},
      { blick: 3, min: 12, ziel: { i: '🦋', n: 'den Schmetterling' }, karte: [
        '.....W',
        'K.H..W',
        '.WHW..',
        '..W.WF',
        '......',
        '.....W',
      ]},
      { blick: 3, min: 13, ziel: { i: '🐭', n: 'die Maus' }, karte: [
        '.F..W.',
        '..H.W.',
        '.H....',
        '....W.',
        'W..W..',
        '..W..K',
      ]},
      { blick: 0, min: 14, ziel: { i: '🐦', n: 'den Vogel' }, karte: [
        'WW.F..',
        'KW..W.',
        '..W...',
        '..H..W',
        '.....W',
        '....W.',
      ]},
      { blick: 0, min: 14, ziel: { i: '🐛', n: 'die Raupe' }, karte: [
        '....KW',
        '...WH.',
        '.HW...',
        '.HWW..',
        '..W...',
        '..F.W.',
      ]},
      { blick: 1, min: 15, ziel: { i: '🥛', n: 'die Milch' }, karte: [
        '......',
        '..W...',
        '..W...',
        '...W.F',
        '...HWH',
        '.K.W..',
      ]},
      { blick: 2, min: 15, ziel: { i: '🥛', n: 'die Milch' }, karte: [
        '.H.WW.',
        '.....K',
        '.W..H.',
        '..WHHW',
        '....F.',
        '....WH',
      ]},
      { blick: 0, min: 16, ziel: { i: '🍗', n: 'das Hähnchen' }, karte: [
        '.....W',
        'W..K.W',
        'WH....',
        '.WH.W.',
        '.WFH..',
        '......',
      ]},
      { blick: 2, min: 16, ziel: { i: '🐭', n: 'die Maus' }, karte: [
        '.K....',
        '.W....',
        'WH.WW.',
        'HWW...',
        '.W.W.W',
        '.W.F..',
      ]},
      { blick: 0, min: 16, ziel: { i: '🧶', n: 'das Wollknäuel' }, karte: [
        '.HW..W',
        '...WHK',
        'W.WW..',
        'H..W..',
        'F.W..W',
        '......',
      ]},
      { blick: 0, min: 17, ziel: { i: '🐟', n: 'den Fisch' }, karte: [
        'H..WKH',
        '.H....',
        'WH..W.',
        'W.HW..',
        'F....W',
        '......',
      ]},
    ],
  },

  schwer: {
    label: "Schwer",
    farbe: "#e23b3b",
    levels: [
      { blick: 1, min: 11, ziel: { i: '🐟', n: 'den Fisch' }, karte: [
        'H.....',
        '..K.WW',
        '..H...',
        '...H..',
        '.H....',
        '.F.W..',
      ]},
      { blick: 1, min: 13, ziel: { i: '🐭', n: 'die Maus' }, karte: [
        '.....K',
        'WW....',
        '..W.H.',
        'W.H..H',
        'F...H.',
        '......',
      ]},
      { blick: 1, min: 15, ziel: { i: '🧶', n: 'das Wollknäuel' }, karte: [
        '..W...',
        'FH...H',
        '...W.W',
        'W.....',
        '....W.',
        '.W.HK.',
      ]},
      { blick: 1, min: 17, ziel: { i: '🥛', n: 'die Milch' }, karte: [
        '.H....',
        '.WFW..',
        '..HKW.',
        '....H.',
        '......',
        '....H.',
      ]},
      { blick: 0, min: 18, ziel: { i: '🦋', n: 'den Schmetterling' }, karte: [
        'K.W.HH',
        '.....W',
        '.H....',
        'H...W.',
        '..WWWW',
        '....F.',
      ]},
      { blick: 0, min: 19, ziel: { i: '🐛', n: 'die Raupe' }, karte: [
        'K...H.',
        '.W.HFH',
        '.WHW..',
        '..W...',
        'W...W.',
        'WH..H.',
      ]},
      { blick: 0, min: 21, ziel: { i: '🐦', n: 'den Vogel' }, karte: [
        '.KH...',
        '..H.F.',
        '.W..W.',
        '.H..HW',
        '.H.H.W',
        '......',
      ]},
      { blick: 0, min: 21, ziel: { i: '🐭', n: 'die Maus' }, karte: [
        'HWH....',
        '......W',
        '.H.HW..',
        'FW.H...',
        'WW.WW..',
        '..WKW..',
        '.H.....',
      ]},
      { blick: 0, min: 21, ziel: { i: '🧶', n: 'das Wollknäuel' }, karte: [
        '..H..H.',
        'WW..WH.',
        '.H....F',
        '...HHHW',
        '..WH..W',
        'H..W.K.',
        '.......',
      ]},
      { blick: 0, min: 23, ziel: { i: '🍗', n: 'das Hähnchen' }, karte: [
        'FHWWWK',
        '..HH..',
        '...W..',
        '...W.H',
        '...H.H',
        '.W....',
      ]},
      { blick: 3, min: 23, ziel: { i: '🦋', n: 'den Schmetterling' }, karte: [
        '...HHF.',
        'WH.H...',
        'W..HW.H',
        'K.WH...',
        '..H.HH.',
        '.H.....',
        '...W.HW',
      ]},
      { blick: 3, min: 24, ziel: { i: '🥛', n: 'die Milch' }, karte: [
        'F....H.',
        '....HH.',
        '..HW...',
        '...WKW.',
        'WH..WH.',
        '.H.....',
        'H.WH...',
      ]},
      { blick: 3, min: 24, ziel: { i: '🍗', n: 'das Hähnchen' }, karte: [
        '...HWFH',
        '.H..H.H',
        '..KW...',
        '.H..HH.',
        '..H..H.',
        '.WW.W..',
        'WWW...H',
      ]},
      { blick: 2, min: 26, ziel: { i: '🐟', n: 'den Fisch' }, karte: [
        'W.....W',
        '.W....K',
        '....WWW',
        '...H.FW',
        '..HW...',
        '...W..W',
        '.H...W.',
      ]},
      { blick: 1, min: 26, ziel: { i: '🐛', n: 'die Raupe' }, karte: [
        '..H..W.',
        'W...W.H',
        '..H...H',
        'KWWW..H',
        'WF..W.W',
        '.H.....',
        '.WW.HWW',
      ]},
      { blick: 2, min: 27, ziel: { i: '🥛', n: 'die Milch' }, karte: [
        'WW.H.FH',
        '..W..WW',
        'W...WKW',
        'W..W...',
        'W.H..W.',
        '....H..',
        'WW.HWWW',
      ]},
      { blick: 2, min: 28, ziel: { i: '🐭', n: 'die Maus' }, karte: [
        'WHW.W.H',
        '.HFHHHW',
        'W..W...',
        'H.H..W.',
        'W.W..H.',
        'W.W.W.K',
        'W...W..',
      ]},
      { blick: 1, min: 30, ziel: { i: '🐦', n: 'den Vogel' }, karte: [
        '..W.WH.',
        'W..H...',
        '.W...W.',
        '...W.W.',
        '.WW.W..',
        '.FH...H',
        '...WKWW',
      ]},
      { blick: 3, min: 30, ziel: { i: '🐟', n: 'den Fisch' }, karte: [
        'HHW....',
        '.H..W..',
        '.H.WH..',
        'H...WW.',
        'H..WW..',
        '..WK..H',
        'HFH.WHH',
      ]},
      { blick: 3, min: 30, ziel: { i: '🧶', n: 'das Wollknäuel' }, karte: [
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
  profiModus:   false,     // Schleifen & Logik-Bausteine freischalten
  tonAn:        true,      // Geräusche + Vibration
  tempo:        'normal',  // 'langsam' | 'normal' | 'schnell'
};

// Wurde das kleine Start-Tutorial schon gezeigt? (nur beim 1. Besuch)
let tutorialGesehen = false;

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
const elInstallBtn     = document.getElementById('installBtn');
const elInstallHinweis = document.getElementById('installHinweis');

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
let elSpurDreh = null;   // zweites SVG ÜBER der Katze (Dreh-Symbole ↰/↱)

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

  // 3) Status-Anzeige: Stufe + Fortschritt, z. B. "Leicht · 3/20".
  elLevel.textContent =
    SCHWIERIGKEITEN[aktuelleSchwierigkeit].label +
    ' · ' + (index + 1) + '/' + aktuelleLevels().length;
  setzeMeldung('Tippe Befehle, dann ▶︎', false);
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

/**
 * Fügt einen neuen Befehl in die Warteschlange ein: normalerweise hinten,
 * oder – wenn eine Einfügemarke gesetzt ist – genau VOR den markierten Block.
 */
function fuegeBefehlHinzu(typ) {
  if (laeuft) return;              // während des Laufs keine Änderungen
  if (einfuegeIndex !== null && einfuegeIndex <= befehlsQueue.length) {
    befehlsQueue.splice(einfuegeIndex, 0, typ);
    einfuegeIndex++;               // Marke wandert mit (Tipp-Reihenfolge bleibt)
  } else {
    befehlsQueue.push(typ);
  }
  zeichneQueue();
  coachBefehlGelegt();             // Coach beim allerersten Spiel weiterschalten
}

/**
 * Entfernt den Befehl an Position 'index' (Tipp auf das ×-Kreuz = "debuggen").
 */
function loescheBefehl(index) {
  if (laeuft) return;
  befehlsQueue.splice(index, 1);
  // Einfügemarke mitführen, damit sie vor demselben Block bleibt.
  if (einfuegeIndex !== null) {
    if (index < einfuegeIndex) einfuegeIndex--;
    if (einfuegeIndex >= befehlsQueue.length || befehlsQueue.length === 0) {
      einfuegeIndex = null;
    }
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
}

/** Baut die sichtbare Warteschlange aus dem Array neu auf (mehrzeilig). */
function zeichneQueue() {
  elQueue.innerHTML = '';

  if (befehlsQueue.length === 0) {
    elQueue.appendChild(elQueueLeer);   // Platzhalter zeigen
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

    // Kleines ×-Kreuz als ECHTES Element: nur DAS löscht den Block.
    // Ein Tipp auf den Block selbst setzt stattdessen die Einfügemarke.
    const x = document.createElement('span');
    x.className = 'queue-block__x';
    x.textContent = '×';
    x.addEventListener('click', (e) => {
      e.stopPropagation();
      loescheBefehl(index);
    });
    block.appendChild(x);

    block.addEventListener('click', () => setzeEinfuegemarke(index));
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
    if (art === 'bonk')  { blip(150, 0, 0.28, 'sawtooth', 0.10); vibriere(180); }
    if (art === 'sieg')  { // kleine Aufwärts-Melodie (C–E–G)
      blip(523, 0.00, 0.16, 'triangle', 0.09);
      blip(659, 0.14, 0.16, 'triangle', 0.09);
      blip(784, 0.28, 0.30, 'triangle', 0.10);
      vibriere([60, 40, 60]);
    }
  } catch (e) { /* Ton nicht verfügbar – still weiterspielen */ }
}

/** Kurze Vibration auf unterstützten Geräten (Teil von "Ton & Vibration"). */
function vibriere(muster) {
  if (einstellungen.tonAn && navigator.vibrate) navigator.vibrate(muster);
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

  // 1) Programm VOR dem Start prüfen (Klammern + leere Blöcke). Solche
  //    Struktur-Fehler zählen bewusst NICHT als Versuch – das Kind hat ja
  //    noch gar nicht "laufen lassen".
  const programmFehler = pruefeKlammern() || pruefeLeereBloecke();
  if (programmFehler) {
    setzeMeldung(programmFehler, true);
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
    setzeKatzeAufStart();
    setzeMeldung('Gestoppt. Ändere dein Programm und starte neu! ⏹', false);
    beendeAusführung();
  } else {
    // Alles abgearbeitet, aber Ziel nicht erreicht: Katze bleibt "ratlos"
    // stehen -> Fragezeichen als Visualisierung direkt auf dem Feld.
    zeigeMarker(katzeZeile, katzeSpalte, '❓');
    await fehlversuch('Ziel noch nicht erreicht 🎯');
  }
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
    if (raster[katzeZeile][katzeSpalte] === 'F') return 'gewonnen';
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
    for (let runde = 0; runde < MAX_ZIEL_WIEDERHOLUNGEN; runde++) {
      hebeBlockHervor(k.index);
      await warte(blockDelay());
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
    markiereBereich(k.index, k.endeIndex, true);   // ganze Klammer markieren
    while (istVorneFrei()) {
      if (runden++ >= MAX_ZIEL_WIEDERHOLUNGEN) {
        fehlerGrund = 'Die Schleife lief sehr oft, ohne anzuhalten. 🔁';
        return 'fehler';
      }
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
    // ↰ = Linksdrehung, ↱ = Rechtsdrehung (gleiche Symbole wie die Buttons).
    text.textContent = (m.typ === 'links') ? '↰' : '↱';
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
  // benutzt, bekommt einen Bonus-Stern (Schleifen kosten 2 Bausteine
  // "Klammer-Overhead" – der Bonus macht das mehr als wett und belohnt
  // echtes Programmieren).
  const nutztSchleifen = befehlsQueue.some((t) => OEFFNER.has(t));
  let sterne = berechneSterne(bausteine, minimum);
  let bonusText = '';
  if (nutztSchleifen && sterne === 2) {
    sterne = 3;
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
      tempo:           einstellungen.tempo,
      bestSterne:      bestSterne,
      bestKnobel:      bestKnobel,
      versucheStand:   versucheStand,
      tutorialGesehen: tutorialGesehen,
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
  // Aktives Tempo hervorheben.
  document.querySelectorAll('.tempo-btn').forEach((btn) => {
    btn.classList.toggle('tempo-btn--aktiv', btn.dataset.tempo === einstellungen.tempo);
  });
  // Profi-Baustein-Reihe passend zum Modus ein-/ausblenden.
  elProfiAktionen.hidden = !einstellungen.profiModus;
  if (elProfiWrap) elProfiWrap.hidden = !einstellungen.profiModus;
  requestAnimationFrame(aktualisiereProfiFade);   // Wisch-Hinweis prüfen
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
  if (elProfiWrap) elProfiWrap.hidden = !an;
  requestAnimationFrame(aktualisiereProfiFade);
  befehlsQueue = [];
  einfuegeIndex = null;
  zeichneQueue();
  loescheSpur();
  loescheMarker();
  setzeKatzeAufStart();
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
  if (laeuft) return;             // nicht mitten im Lauf öffnen
  levelWahlStufe = aktuelleSchwierigkeit;   // Tabs starten bei der eigenen Stufe
  zeichneLevelWahl();
  zeigeOverlay(elLevelWahl);
}

function zeichneLevelWahl() {
  // --- Stufen-Tabs (Leicht/Mittel/Schwer) direkt im Dialog ---
  elLevelWahlTabs.innerHTML = '';
  for (const stufe of ['leicht', 'mittel', 'schwer']) {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'levelwahl-tab' +
      (stufe === levelWahlStufe ? ' levelwahl-tab--aktiv' : '');
    tab.style.setProperty('--tab-farbe', SCHWIERIGKEITEN[stufe].farbe);
    tab.textContent = SCHWIERIGKEITEN[stufe].label;
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
    const besteS = bestSterne[levelWahlStufe][i] || 0;
    const besteK = bestKnobel[levelWahlStufe][i] || 0;
    const wertungEl = document.createElement('span');
    wertungEl.className = 'levelwahl-btn__sterne';
    wertungEl.textContent = besteS > 0
      ? '★'.repeat(besteS) + (besteK > 0 ? ' 💡' + besteK : '')
      : '·';
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
  elResetBtn.addEventListener('click', () => {
    if (laeuft) return;
    befehlsQueue = [];
    einfuegeIndex = null;
    zeichneQueue();
    loescheSpur();
    loescheMarker();
    setzeKatzeAufStart();
    setzeMeldung('Gelöscht ✨', false);
  });

  // --- Tastatur (für Desktop): Pfeile = Befehle, Enter = Start,
  //     Backspace = letzten Block löschen, Escape = Stopp/Fenster zu. ---
  document.addEventListener('keydown', (e) => {
    // Escape wirkt immer: Lauf stoppen oder offene Fenster schließen.
    if (e.key === 'Escape') {
      if (laeuft) { stoppeAusfuehrung(); return; }
      versteckeOverlay(elSettingsOverlay);
      versteckeOverlay(elLevelWahl);
      return;
    }
    // Übrige Tasten nur, wenn kein Overlay offen ist und nichts läuft.
    const overlayOffen = document.querySelector('.overlay--sichtbar');
    if (overlayOffen || laeuft) return;

    if (e.key === 'ArrowUp')         { e.preventDefault(); fuegeBefehlHinzu('vor'); }
    else if (e.key === 'ArrowLeft')  { e.preventDefault(); fuegeBefehlHinzu('links'); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); fuegeBefehlHinzu('rechts'); }
    else if (e.key === 'Enter')      { e.preventDefault(); starteAusführung(false); }
    else if (e.key === 'Backspace' && befehlsQueue.length > 0) {
      e.preventDefault();
      loescheBefehl(befehlsQueue.length - 1);
    }
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

  // Ton & Vibration.
  elTonToggle.addEventListener('change', () => {
    einstellungen.tonAn = elTonToggle.checked;
    speichereEinstellungen();
    if (einstellungen.tonAn) spieleTon('schritt');   // kurzes Hörbeispiel
  });

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
    zeigeCoach('Tippe ein paar Befehle: ⬆️ ↰ ↱', '.aktionen');
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

  // Profi-Chip-Leiste: rechts andeuten, dass man wischen kann (Fade + ›).
  elProfiAktionen.addEventListener('scroll', aktualisiereProfiFade);
}

/**
 * Zeigt am rechten Rand der Profi-Leiste einen Farbverlauf + Pfeil,
 * solange dort noch weitere Bausteine "versteckt" sind. Ohne diesen
 * Hinweis ist auf Touch-Geräten nicht erkennbar, dass man wischen kann.
 */
function aktualisiereProfiFade() {
  if (!elProfiWrap) return;
  const mehrRechts = elProfiAktionen.scrollLeft + elProfiAktionen.clientWidth
    < elProfiAktionen.scrollWidth - 4;
  elProfiWrap.classList.toggle('profi-wrap--mehr', mehrRechts);
}

/**
 * Bei Größenwechsel (z. B. Gerät drehen) müssen Katze und Spur neu berechnet
 * werden, da sich die Zellengröße ändert. Das Grid selbst regelt das CSS.
 */
function beobachteGroessenwechsel() {
  window.addEventListener('resize', () => {
    passeSpielfeldGroesseAn();  // Brett bleibt quadratisch im freien Platz
    zeichneKatze();
    zeichneSpur();
    zeichneAlleMarker();        // 💥/❓ müssen auf ihren Feldern bleiben
    aktualisiereProfiFade();
  });
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
