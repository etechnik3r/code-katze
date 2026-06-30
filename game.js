/* ==========================================================================
   CODE-KATZE · game.js  ·  JONFIE STUDIOS
   --------------------------------------------------------------------------
   Die komplette Spiel-Logik in reinem Vanilla JavaScript (ES6+).
   Aufbau dieser Datei:
     A) Level-Daten          – die Spielfelder als einfache Text-Karten
     B) Spielzustand         – globale Variablen (wo steht die Katze etc.)
     C) DOM-Referenzen       – Verweise auf die HTML-Elemente
     D) Spielfeld aufbauen   – Grid zeichnen, Katze platzieren
     E) Befehls-Warteschlange– Befehle hinzufügen / löschen / anzeigen
     F) Ausführung           – die Queue zeitgesteuert Schritt für Schritt
                               abarbeiten (das HERZSTÜCK des Spiels)
     G) Feedback & Levelwechsel
     H) Start (Event-Listener verbinden)
   ========================================================================== */

'use strict';


/* ==========================================================================
   A) LEVEL-DATEN
   --------------------------------------------------------------------------
   Jedes Level ist eine einfache "Karte" aus Textzeilen. Ein Zeichen pro Feld:
       .  = freies Feld
       K  = Katze (Startposition)
       F  = Fisch (Ziel)
       W  = Wasserpfütze (Hindernis 💧)
       H  = Hund (Hindernis 🐶)
   Die Levels werden von Level zu Level etwas schwerer (mehr Drehungen,
   mehr Hindernisse). Diese Darstellung ist absichtlich super einfach,
   damit ein Hobby-Programmierer neue Level in Sekunden selbst hinzufügen
   kann: einfach ein neues Array von Zeilen anhängen.

   'blick' = Startblickrichtung der Katze:
       0 = nach oben, 1 = nach rechts, 2 = nach unten, 3 = nach links
   -------------------------------------------------------------------------- */
const LEVELS = [
  {
    name: 'Erster Schritt',
    blick: 1, // schaut nach rechts – einfach geradeaus laufen
    karte: [
      '.....',
      '.....',
      'K..F.',
      '.....',
      '.....',
    ],
  },
  {
    name: 'Um die Ecke',
    blick: 1,
    karte: [
      '.....',
      '...F.',
      'K....',
      '.....',
      '.....',
    ],
  },
  {
    name: 'Pfütze im Weg',
    blick: 1,
    karte: [
      '.....',
      '..W..',
      'K.WF.',
      '..W..',
      '.....',
    ],
  },
  {
    name: 'Der wachsame Hund',
    blick: 0, // schaut nach oben
    karte: [
      '..F..',
      '..W..',
      'K.H..',
      '.....',
      '.....',
    ],
  },
  {
    name: 'Kleines Labyrinth',
    blick: 1,
    karte: [
      'K.W..',
      '.WW.W',
      '...W.',
      'WW.WF',
      '...W.',
    ],
  },
  {
    name: 'Großes Abenteuer',
    blick: 1,
    karte: [
      'K..W..',
      'HW.W.W',
      '...W..',
      '.WWW.W',
      '.....W',
      'WWWW.F',
    ],
  },
];


/* ==========================================================================
   B) SPIELZUSTAND (globale Variablen)
   -------------------------------------------------------------------------- */

let aktuellesLevel = 0;   // Index in LEVELS

// Das aktuelle Spielfeld als 2D-Array, plus Start-Infos der Katze:
let raster        = [];   // raster[zeile][spalte] = Zeichen ('.', 'W', 'H', 'F')
let spaltenAnzahl = 0;
let zeilenAnzahl  = 0;

// Aktuelle Position & Blickrichtung der Katze während des Spiels:
let katzeZeile  = 0;
let katzeSpalte = 0;
let katzeBlick  = 0;      // 0=oben, 1=rechts, 2=unten, 3=links

// Startwerte (zum Zurücksetzen nach einem Fehlversuch):
let startZeile  = 0;
let startSpalte = 0;
let startBlick  = 0;

// Die Befehls-Warteschlange: ein Array aus Strings, z. B. ['vor','rechts','vor']
let befehlsQueue = [];

// Läuft gerade eine Ausführung? (verhindert Doppelstarts / Eingaben)
let laeuft = false;


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
const elOverlay     = document.getElementById('gewinnOverlay');
const elOverlayText = document.getElementById('overlayText');
const elWeiterBtn   = document.getElementById('weiterBtn');

// Element der Katze (wird beim Spielfeldaufbau neu erzeugt)
let elKatze = null;


/* ==========================================================================
   D) SPIELFELD AUFBAUEN
   -------------------------------------------------------------------------- */

/**
 * Lädt das Level mit dem angegebenen Index und baut das Grid komplett neu auf.
 */
function ladeLevel(index) {
  const level = LEVELS[index];

  // 1) Karte (Textzeilen) in ein 2D-Array umwandeln und Größen merken.
  //    Wir kopieren jedes Zeichen, damit wir die Original-Karte nicht ändern.
  raster        = level.karte.map((zeile) => zeile.split(''));
  zeilenAnzahl  = raster.length;
  spaltenAnzahl = raster[0].length;

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

  // 3) Status-Anzeige aktualisieren.
  elLevel.textContent = 'Level ' + (index + 1);
  setzeMeldung('Lege Befehle und drücke ▶︎', false);

  // 4) Das Grid im HTML zeichnen.
  zeichneRaster();

  // 5) Die Katze auf die Startposition setzen.
  setzeKatzeAufStart();
}

/**
 * Erzeugt die einzelnen Zellen (DIVs) des Grids und das Katzen-Element.
 * Hindernisse und das Ziel werden direkt als Emoji in die Zelle geschrieben.
 */
function zeichneRaster() {
  // Bisherigen Inhalt leeren.
  elSpielfeld.innerHTML = '';

  // Anzahl der Spalten dynamisch als CSS-Grid-Vorgabe setzen.
  elSpielfeld.style.gridTemplateColumns = `repeat(${spaltenAnzahl}, 1fr)`;
  elSpielfeld.style.gridTemplateRows    = `repeat(${zeilenAnzahl}, 1fr)`;

  // Für jede Position eine Zelle erzeugen.
  for (let z = 0; z < zeilenAnzahl; z++) {
    for (let s = 0; s < spaltenAnzahl; s++) {
      const zelle = document.createElement('div');
      zelle.className = 'zelle';

      const inhalt = raster[z][s];
      if (inhalt === 'F') {
        zelle.classList.add('zelle--ziel');
        zelle.textContent = '🐟';
      } else if (inhalt === 'W') {
        zelle.textContent = '💧';
      } else if (inhalt === 'H') {
        zelle.textContent = '🐶';
      }

      elSpielfeld.appendChild(zelle);
    }
  }

  // Katzen-Element neu erzeugen und ins Spielfeld legen.
  elKatze = document.createElement('div');
  elKatze.className = 'katze';
  elKatze.textContent = '🐱';
  elSpielfeld.appendChild(elKatze);
}

/**
 * Setzt die Katze (Variablen + Anzeige) auf die Startposition zurück.
 * Wird beim Levelstart UND nach jedem Fehlversuch aufgerufen.
 */
function setzeKatzeAufStart() {
  katzeZeile  = startZeile;
  katzeSpalte = startSpalte;
  katzeBlick  = startBlick;
  zeichneKatze();
}

/**
 * Berechnet aus Zeile/Spalte/Blickrichtung die konkrete CSS-Position der
 * Katze und schreibt sie als transform. Die CSS-transition sorgt dafür,
 * dass die Bewegung sanft animiert wird.
 */
function zeichneKatze() {
  if (!elKatze) return;

  // Größe einer Zelle inkl. Lücke berechnen (Spielfeld ist quadratisch).
  // Wir nutzen die tatsächliche Pixelbreite des gezeichneten Grids.
  const padding = 8;   // muss zum padding in .spielfeld (CSS) passen
  const gap     = 4;   // muss zum gap in .spielfeld (CSS) passen

  const innen     = elSpielfeld.clientWidth - padding * 2;
  const zellGroesse = (innen - gap * (spaltenAnzahl - 1)) / spaltenAnzahl;

  // Pixel-Position der oberen linken Ecke der Zielzelle.
  const x = padding + katzeSpalte * (zellGroesse + gap);
  const y = padding + katzeZeile  * (zellGroesse + gap);

  // Katzen-Element exakt auf Zellengröße bringen.
  elKatze.style.width  = zellGroesse + 'px';
  elKatze.style.height = zellGroesse + 'px';

  // Drehung: jede Blickrichtung entspricht 90°. 0=oben heißt 0°, da das
  // Katzen-Emoji "neutral" steht; die Drehung macht die Blickrichtung sichtbar.
  const grad = katzeBlick * 90;

  // Position + Drehung in EINER transform-Eigenschaft kombinieren.
  elKatze.style.transform =
    `translate(${x}px, ${y}px) rotate(${grad}deg)`;
}


/* ==========================================================================
   E) BEFEHLS-WARTESCHLANGE (COMMAND QUEUE)
   --------------------------------------------------------------------------
   Kernidee des Spiels: Tippt das Kind auf einen Aktions-Button, wird NICHT
   sofort etwas bewegt. Stattdessen wird der Befehl nur als Eintrag in das
   Array 'befehlsQueue' gelegt und unten als Block angezeigt. Erst der
   Start-Button arbeitet diese Liste später ab.
   -------------------------------------------------------------------------- */

// Zuordnung Befehl -> Emoji für die Anzeige in der Queue.
const BEFEHL_EMOJI = {
  vor:    '⬆️',
  links:  '↩️',
  rechts: '↪️',
};

/**
 * Hängt einen neuen Befehl an die Warteschlange an.
 * @param {string} typ  'vor' | 'links' | 'rechts'
 */
function fuegeBefehlHinzu(typ) {
  // Während die Katze läuft, sind keine Änderungen erlaubt.
  if (laeuft) return;

  befehlsQueue.push(typ);   // Befehl ans Ende der Liste setzen
  zeichneQueue();           // Anzeige neu aufbauen

  // Komfort: automatisch ganz nach rechts scrollen, damit der neue
  // (zuletzt gelegte) Block sichtbar ist.
  elQueue.scrollLeft = elQueue.scrollWidth;
}

/**
 * Entfernt den Befehl an Position 'index' aus der Warteschlange.
 * Wird ausgelöst, wenn das Kind auf einen Block in der Queue tippt
 * ("Debugging": einzelne Schritte gezielt löschen und korrigieren).
 */
function loescheBefehl(index) {
  if (laeuft) return;
  befehlsQueue.splice(index, 1); // genau einen Eintrag entfernen
  zeichneQueue();
}

/**
 * Baut die sichtbare Warteschlange aus dem Array 'befehlsQueue' neu auf.
 * Jeder Eintrag wird zu einem anklickbaren Block. Ein Klick löscht ihn.
 */
function zeichneQueue() {
  // Erst alles leeren …
  elQueue.innerHTML = '';

  if (befehlsQueue.length === 0) {
    // … und den Platzhalter "Noch keine Befehle…" zeigen.
    elQueue.appendChild(elQueueLeer);
    return;
  }

  // Für jeden Befehl einen Block erzeugen.
  befehlsQueue.forEach((typ, index) => {
    const block = document.createElement('div');
    block.className = 'queue-block';
    block.textContent = BEFEHL_EMOJI[typ];

    // Den Index merken, damit der Klick weiß, WELCHEN Befehl er löscht.
    block.dataset.index = index;

    // Tippen auf den Block = diesen Befehl entfernen.
    block.addEventListener('click', () => loescheBefehl(index));

    elQueue.appendChild(block);
  });
}


/* ==========================================================================
   F) AUSFÜHRUNG – das Herzstück: die Queue zeitgesteuert abarbeiten
   --------------------------------------------------------------------------
   Ablauf, wenn das Kind auf "Start" tippt:
     1. Eingaben sperren (kein Hinzufügen/Löschen, kein zweiter Start).
     2. Die Befehle der Reihe nach durchgehen – aber NICHT alle sofort,
        sondern mit einer kleinen Pause dazwischen (Delay), damit die
        Bewegung sichtbar und nachvollziehbar ist.
     3. Den gerade ausgeführten Block in der Queue farblich hervorheben.
     4. Nach jedem Schritt prüfen: Ist die Katze auf ein Hindernis oder aus
        dem Feld gelaufen? -> Fehlversuch. Steht sie auf dem Fisch? -> Sieg.
     5. Ist die Queue zu Ende und der Fisch wurde nicht erreicht -> Fehlversuch.

   Wir nutzen 'async/await' mit einer kleinen warte()-Hilfsfunktion. Das
   liest sich von oben nach unten wie ein normaler Ablauf, obwohl zwischen
   den Schritten jeweils echte Zeit vergeht.
   -------------------------------------------------------------------------- */

const SCHRITT_DELAY = 500; // Millisekunden Pause zwischen zwei Befehlen

/**
 * Kleine Hilfsfunktion: gibt ein Promise zurück, das nach 'ms' Millisekunden
 * erfüllt wird. Zusammen mit 'await' entsteht eine Pause im Ablauf.
 */
function warte(ms) {
  return new Promise((aufloesen) => setTimeout(aufloesen, ms));
}

/**
 * Startet die Abarbeitung der Warteschlange.
 */
async function starteAusführung() {
  // Nichts tun, wenn schon etwas läuft oder die Queue leer ist.
  if (laeuft) return;
  if (befehlsQueue.length === 0) {
    setzeMeldung('Lege zuerst ein paar Befehle! 🧩', true);
    return;
  }

  // --- Vorbereitung: Eingaben sperren ---
  laeuft = true;
  setzeEingabenAktiv(false);
  elQueue.classList.add('queue--laeuft');   // blendet die Lösch-Kreuze aus
  setzeKatzeAufStart();                      // immer sauber vom Start beginnen
  setzeMeldung('Die Katze läuft… 🐾', false);

  // Kurze Pause, damit man die Katze zuerst auf Start sieht.
  await warte(300);

  // Alle Befehlsblöcke (für die Hervorhebung) einsammeln.
  const bloecke = elQueue.querySelectorAll('.queue-block');

  // --- Die eigentliche Schleife über alle Befehle ---
  for (let i = 0; i < befehlsQueue.length; i++) {
    // a) Aktuellen Block hervorheben, vorherige Hervorhebung entfernen.
    bloecke.forEach((b) => b.classList.remove('queue-block--aktiv'));
    if (bloecke[i]) {
      bloecke[i].classList.add('queue-block--aktiv');
      // Den aktiven Block bei Bedarf in den sichtbaren Bereich scrollen.
      bloecke[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

    // b) Den Befehl ausführen (Position/Blickrichtung ändern).
    const befehl = befehlsQueue[i];
    const ergebnis = fuehreBefehlAus(befehl);

    // c) Bewegung anzeigen.
    zeichneKatze();

    // d) Warten, damit der Schritt sichtbar ist.
    await warte(SCHRITT_DELAY);

    // e) Bei einem ungültigen Schritt (Wand/Hindernis) sofort abbrechen.
    if (!ergebnis.gueltig) {
      await fehlversuch(ergebnis.grund);
      return; // Ausführung beenden – Queue bleibt erhalten!
    }

    // f) Hat die Katze den Fisch erreicht? Dann sofort gewonnen.
    if (raster[katzeZeile][katzeSpalte] === 'F') {
      await levelGeschafft();
      return;
    }
  }

  // --- Queue komplett abgearbeitet, aber Ziel NICHT erreicht ---
  await fehlversuch('Die Befehle sind zu Ende – aber kein Fisch in Sicht!');
}

/**
 * Führt EINEN einzelnen Befehl aus, indem er die globalen Katzen-Variablen
 * verändert. Gibt ein Ergebnis-Objekt zurück:
 *   { gueltig: true }                 -> Schritt war erlaubt
 *   { gueltig: false, grund: '...' }  -> Schritt war ungültig (Wand/Hindernis)
 *
 * Drehbefehle sind immer gültig (man kann sich auf dem eigenen Feld drehen).
 */
function fuehreBefehlAus(befehl) {
  if (befehl === 'links') {
    // Gegen den Uhrzeigersinn drehen: 0->3->2->1->0 …
    // '+ 3' statt '- 1', damit das Ergebnis nicht negativ wird.
    katzeBlick = (katzeBlick + 3) % 4;
    return { gueltig: true };
  }

  if (befehl === 'rechts') {
    // Im Uhrzeigersinn drehen: 0->1->2->3->0 …
    katzeBlick = (katzeBlick + 1) % 4;
    return { gueltig: true };
  }

  if (befehl === 'vor') {
    // Zielfeld je nach Blickrichtung berechnen.
    // Reihenfolge passend zu 0=oben,1=rechts,2=unten,3=links:
    const dz = [-1, 0, 1, 0][katzeBlick]; // Veränderung der Zeile
    const ds = [0, 1, 0, -1][katzeBlick]; // Veränderung der Spalte

    const neueZeile  = katzeZeile  + dz;
    const neueSpalte = katzeSpalte + ds;

    // 1) Außerhalb des Spielfelds? -> ungültig (gegen die Wand).
    if (
      neueZeile < 0 || neueZeile >= zeilenAnzahl ||
      neueSpalte < 0 || neueSpalte >= spaltenAnzahl
    ) {
      return { gueltig: false, grund: 'Die Katze ist gegen die Wand gelaufen! 🧱' };
    }

    // 2) Steht dort ein Hindernis? -> ungültig.
    const feld = raster[neueZeile][neueSpalte];
    if (feld === 'W') {
      return { gueltig: false, grund: 'Platsch! In die Wasserpfütze. 💧' };
    }
    if (feld === 'H') {
      return { gueltig: false, grund: 'Wuff! Der Hund versperrt den Weg. 🐶' };
    }

    // 3) Feld ist frei (oder der Fisch) -> Schritt ausführen.
    katzeZeile  = neueZeile;
    katzeSpalte = neueSpalte;
    return { gueltig: true };
  }

  // Unbekannter Befehl (sollte nicht vorkommen) – sicherheitshalber gültig.
  return { gueltig: true };
}


/* ==========================================================================
   G) FEEDBACK & LEVELWECHSEL
   -------------------------------------------------------------------------- */

/**
 * Setzt den Text der Statusmeldung. 'istFehler' steuert die rote Hervorhebung
 * inkl. kleiner Wackel-Animation.
 */
function setzeMeldung(text, istFehler) {
  elMeldung.textContent = text;
  elMeldung.classList.toggle('status__meldung--fehler', !!istFehler);
}

/**
 * Sperrt oder erlaubt alle Eingabe-Buttons (Aktionen + Start/Reset).
 * Während die Ausführung läuft, sollen keine Eingaben möglich sein.
 */
function setzeEingabenAktiv(aktiv) {
  document.querySelectorAll('.aktion-btn').forEach((b) => (b.disabled = !aktiv));
  elPlayBtn.disabled  = !aktiv;
  // Reset/Löschen erlauben wir auch während des Laufs NICHT, um die Logik
  // einfach zu halten (die Queue darf währenddessen nicht verändert werden).
  elResetBtn.disabled = !aktiv;
}

/**
 * Wird nach einem FEHLVERSUCH aufgerufen.
 * WICHTIG (Fehlerkultur): Die Befehls-Warteschlange bleibt erhalten, damit
 * das Kind seinen "Code" prüfen, den Fehler suchen und korrigieren kann.
 * Es gibt unendlich viele Versuche.
 */
async function fehlversuch(grund) {
  // Kleinen "Bonk"-Effekt auf der Katze zeigen.
  if (elKatze) {
    elKatze.classList.add('katze--bonk');
  }
  setzeMeldung(grund + ' Versuch es nochmal! 🔁', true);

  // Kurz warten, damit man den Fehler-Moment wahrnimmt …
  await warte(900);

  // … dann Katze zurück auf Start, Queue aber NICHT löschen.
  if (elKatze) {
    elKatze.classList.remove('katze--bonk');
  }
  setzeKatzeAufStart();
  beendeAusführung();
}

/**
 * Wird aufgerufen, wenn die Katze den Fisch erreicht hat.
 */
async function levelGeschafft() {
  setzeMeldung('Super gemacht! 🐟', false);
  await warte(400);

  // Ist das das letzte Level? -> Glückwunsch-Text anpassen.
  const istLetztes = aktuellesLevel >= LEVELS.length - 1;
  if (istLetztes) {
    elOverlayText.textContent =
      'Du hast ALLE Level der Code-Katze gelöst. Du bist ein echter Programmier-Profi! 🌟';
    elWeiterBtn.textContent = 'Von vorne ↺';
  } else {
    elOverlayText.textContent = 'Die Katze hat den Fisch gefunden! Bereit für das nächste Level?';
    elWeiterBtn.textContent = 'Weiter ➜';
  }

  // Overlay einblenden.
  elOverlay.classList.add('overlay--sichtbar');
  elOverlay.setAttribute('aria-hidden', 'false');

  beendeAusführung();
}

/**
 * Hebt die Eingabesperre wieder auf und setzt die Hervorhebungen zurück.
 * Gemeinsamer Abschluss von Sieg UND Fehlversuch.
 */
function beendeAusführung() {
  laeuft = false;
  setzeEingabenAktiv(true);
  elQueue.classList.remove('queue--laeuft');
  elQueue.querySelectorAll('.queue-block--aktiv')
    .forEach((b) => b.classList.remove('queue-block--aktiv'));
}

/**
 * Lädt das nächste Level (oder beginnt nach dem letzten wieder von vorn).
 * Wird über den "Weiter"-Button im Gewinn-Overlay ausgelöst.
 */
function naechstesLevel() {
  // Overlay ausblenden.
  elOverlay.classList.remove('overlay--sichtbar');
  elOverlay.setAttribute('aria-hidden', 'true');

  // Nach dem letzten Level wieder bei Level 1 starten.
  aktuellesLevel = (aktuellesLevel + 1) % LEVELS.length;

  // Bei einem neuen Level beginnt man mit leerer Warteschlange.
  befehlsQueue = [];
  zeichneQueue();

  ladeLevel(aktuellesLevel);
}


/* ==========================================================================
   H) START – Event-Listener verbinden und erstes Level laden
   -------------------------------------------------------------------------- */

/**
 * Verbindet alle Buttons mit ihren Funktionen.
 */
function verbindeButtons() {
  // Aktions-Buttons: jeder fügt seinen Befehl zur Queue hinzu.
  document.querySelectorAll('.aktion-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      fuegeBefehlHinzu(btn.dataset.aktion);
    });
  });

  // Start-Button startet die Ausführung der Queue.
  elPlayBtn.addEventListener('click', starteAusführung);

  // Reset/Löschen leert die komplette Warteschlange und setzt die Katze
  // auf Start (praktisch, um ganz neu anzufangen).
  elResetBtn.addEventListener('click', () => {
    if (laeuft) return;
    befehlsQueue = [];
    zeichneQueue();
    setzeKatzeAufStart();
    setzeMeldung('Alles gelöscht. Leg neu los! ✨', false);
  });

  // "Weiter"-Button im Gewinn-Overlay lädt das nächste Level.
  elWeiterBtn.addEventListener('click', naechstesLevel);
}

/**
 * Wenn sich die Fenstergröße ändert (z. B. Gerät drehen), muss die
 * Pixel-Position der Katze neu berechnet werden, da sich die Zellengröße
 * ändert. Die Rasterzellen selbst regelt das CSS-Grid von allein.
 */
function beobachteGroessenwechsel() {
  window.addEventListener('resize', () => {
    zeichneKatze();
  });
}

// --- Spiel initialisieren ---
verbindeButtons();
beobachteGroessenwechsel();
ladeLevel(aktuellesLevel);
