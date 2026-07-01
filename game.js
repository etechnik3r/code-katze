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
   Objekt mit { name, blick, karte } in die passende Liste eintragen.
   -------------------------------------------------------------------------- */
const SCHWIERIGKEITEN = {

  leicht: {
    label: 'Leicht',
    farbe: '#3ec96a',
    levels: [
      { name: 'Geradeaus', blick: 1, karte: [
        '.....',
        '.....',
        'K...F',
        '.....',
        '.....',
      ]},
      { name: 'Nach oben', blick: 0, karte: [
        'F....',
        '.....',
        '.....',
        '.....',
        'K....',
      ]},
      { name: 'Um die Ecke', blick: 1, karte: [
        '.....',
        '.....',
        'K....',
        '.....',
        '....F',
      ]},
      { name: 'Große Kurve', blick: 1, karte: [
        '....F',
        '.....',
        '.....',
        '.....',
        'K....',
      ]},
      { name: 'Erste Pfütze', blick: 1, karte: [
        '.....',
        '.....',
        'K.W.F',
        '.....',
        '.....',
      ]},
    ],
  },

  mittel: {
    label: 'Mittel',
    farbe: '#ff8a5c',
    levels: [
      { name: 'Um die Ecke', blick: 1, karte: [
        '.....',
        '...F.',
        'K....',
        '.....',
        '.....',
      ]},
      { name: 'Pfütze im Weg', blick: 1, karte: [
        '.....',
        '..W..',
        'K.WF.',
        '..W..',
        '.....',
      ]},
      { name: 'Der wachsame Hund', blick: 0, karte: [
        '..F..',
        '..W..',
        'K.H..',
        '.....',
        '.....',
      ]},
      { name: 'Zickzack', blick: 1, karte: [
        'K...W',
        'WWW.W',
        '..W..',
        '.WW.W',
        '...F.',
      ]},
      { name: 'Kleines Labyrinth', blick: 1, karte: [
        'K.W..',
        '..WW.',
        '.....',
        'WWW.W',
        '..F..',
      ]},
    ],
  },

  schwer: {
    label: 'Schwer',
    farbe: '#e23b3b',
    levels: [
      { name: 'Verschlungen', blick: 1, karte: [
        'K..WWW',
        'WW.W.W',
        'W....W',
        'WWWW.W',
        'WWWW..',
        'WWWWWF',
      ]},
      { name: 'Der Irrgarten', blick: 1, karte: [
        'K....W',
        'WWWW.W',
        'W....W',
        'W.WWWW',
        'W....W',
        'WWWW.F',
      ]},
      { name: 'Großes Abenteuer', blick: 1, karte: [
        'K..W..',
        'HW.W.W',
        '...W..',
        '.WWW.W',
        '.....W',
        'WWWW.F',
      ]},
      { name: 'Meisterprüfung', blick: 1, karte: [
        'K......',
        'WWWWWW.',
        '.......',
        '.WWWWWW',
        '.......',
        'WWWWWW.',
        '......F',
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

// Vom Nutzer wählbare Einstellungen (werden im Browser gespeichert):
let einstellungen = {
  spurAnzeigen: true,
};


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
const elOverlay     = document.getElementById('gewinnOverlay');
const elOverlayText = document.getElementById('overlayText');
const elWeiterBtn   = document.getElementById('weiterBtn');

// Einstellungs-Overlay
const elSettingsBtn    = document.getElementById('settingsBtn');
const elSettingsOverlay= document.getElementById('settingsOverlay');
const elSettingsClose  = document.getElementById('settingsClose');
const elSettingsFertig = document.getElementById('settingsFertig');
const elSpurToggle     = document.getElementById('spurToggle');

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
  setzeMeldung('Lege Befehle und drücke ▶︎', false);

  // 4) Spur zurücksetzen und Grid zeichnen.
  loescheSpur();
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
        zelle.textContent = '🐟';
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

const BEFEHL_EMOJI = { vor: '⬆️', links: '↩️', rechts: '↪️' };

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
    const block = document.createElement('div');
    block.className = 'queue-block';
    block.textContent = BEFEHL_EMOJI[typ];
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

/** Startet die Abarbeitung der Warteschlange. */
async function starteAusführung() {
  if (laeuft) return;
  if (befehlsQueue.length === 0) {
    setzeMeldung('Lege zuerst ein paar Befehle! 🧩', true);
    return;
  }

  // --- Vorbereitung ---
  laeuft = true;
  setzeEingabenAktiv(false);
  elQueue.classList.add('queue--laeuft');   // blendet die Lösch-Kreuze aus
  setzeKatzeAufStart();

  // Spur frisch beginnen: Startfeld als ersten Punkt aufnehmen.
  spurPfad   = [{ z: katzeZeile, s: katzeSpalte }];
  drehMarker = [];
  zeichneSpur();
  setzeMeldung('Die Katze läuft… 🐾', false);

  await warte(300); // kurz die Startstellung zeigen

  const bloecke = elQueue.querySelectorAll('.queue-block');

  // --- Schleife über alle Befehle ---
  for (let i = 0; i < befehlsQueue.length; i++) {
    // a) Aktuellen Block hervorheben.
    bloecke.forEach((b) => b.classList.remove('queue-block--aktiv'));
    if (bloecke[i]) {
      bloecke[i].classList.add('queue-block--aktiv');
      bloecke[i].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // b) Befehl ausführen (verändert Position/Blickrichtung + Spur).
    const befehl = befehlsQueue[i];
    const ergebnis = fuehreBefehlAus(befehl);

    // c) Bewegung + Spur anzeigen.
    zeichneKatze();
    zeichneSpur();

    // d) Warten, damit der Schritt sichtbar ist.
    await warte(SCHRITT_DELAY);

    // e) Ungültiger Schritt (Wand/Hindernis)? -> abbrechen.
    if (!ergebnis.gueltig) {
      await fehlversuch(ergebnis.grund);
      return; // Queue bleibt erhalten!
    }

    // f) Fisch erreicht? -> gewonnen.
    if (raster[katzeZeile][katzeSpalte] === 'F') {
      await levelGeschafft();
      return;
    }
  }

  // --- Queue abgearbeitet, Ziel nicht erreicht ---
  await fehlversuch('Die Befehle sind zu Ende – aber kein Fisch in Sicht!');
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

    // 1) Außerhalb des Spielfelds? -> Wand.
    if (
      neueZeile < 0 || neueZeile >= zeilenAnzahl ||
      neueSpalte < 0 || neueSpalte >= spaltenAnzahl
    ) {
      return { gueltig: false, grund: 'Die Katze ist gegen die Wand gelaufen! 🧱' };
    }

    // 2) Hindernis?
    const feld = raster[neueZeile][neueSpalte];
    if (feld === 'W') return { gueltig: false, grund: 'Platsch! In die Wasserpfütze. 💧' };
    if (feld === 'H') return { gueltig: false, grund: 'Wuff! Der Hund versperrt den Weg. 🐶' };

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
    // ↺ = Linksdrehung (gegen Uhrzeiger), ↻ = Rechtsdrehung.
    text.textContent = (m.typ === 'links') ? '↺' : '↻';
    elSpur.appendChild(text);
  });
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
  setzeMeldung(grund + ' Versuch es nochmal! 🔁', true);

  await warte(900); // Fehler-Moment kurz wahrnehmen lassen

  if (elKatze) elKatze.classList.remove('katze--bonk');
  setzeKatzeAufStart();   // Katze zurück auf Start – Queue & Spur bleiben!
  beendeAusführung();
}

/** Die Katze hat den Fisch erreicht. */
async function levelGeschafft() {
  setzeMeldung('Super gemacht! 🐟', false);
  await warte(400);

  const istLetztes = aktuellesLevel >= aktuelleLevels().length - 1;
  if (istLetztes) {
    elOverlayText.textContent =
      'Du hast ALLE Level dieser Stufe gelöst. Probiere im ⚙️ die nächste Schwierigkeit! 🌟';
    elWeiterBtn.textContent = 'Von vorne ↺';
  } else {
    elOverlayText.textContent = 'Die Katze hat den Fisch gefunden! Bereit für das nächste Level?';
    elWeiterBtn.textContent = 'Weiter ➜';
  }

  zeigeOverlay(elOverlay);
  beendeAusführung();
}

/** Gemeinsamer Abschluss von Sieg und Fehlversuch: Sperren aufheben. */
function beendeAusführung() {
  laeuft = false;
  setzeEingabenAktiv(true);
  elQueue.classList.remove('queue--laeuft');
  elQueue.querySelectorAll('.queue-block--aktiv')
    .forEach((b) => b.classList.remove('queue-block--aktiv'));
}

/** Lädt das nächste Level (oder beginnt nach dem letzten wieder von vorn). */
function naechstesLevel() {
  versteckeOverlay(elOverlay);
  aktuellesLevel = (aktuellesLevel + 1) % aktuelleLevels().length;

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
  // Spur-Schalter (Checkbox) auf den aktuellen Wert setzen.
  elSpurToggle.checked = einstellungen.spurAnzeigen;
  // Farbpunkt der Level-Anzeige an die Schwierigkeit anpassen.
  elLevel.style.setProperty('--schwierigkeit-farbe',
    SCHWIERIGKEITEN[aktuelleSchwierigkeit].farbe);
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
    setzeKatzeAufStart();
    setzeMeldung('Alles gelöscht. Leg neu los! ✨', false);
  });

  // "Weiter" im Gewinn-Overlay -> nächstes Level.
  elWeiterBtn.addEventListener('click', naechstesLevel);

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
