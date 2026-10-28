'use strict';
// Erzählung: Texte, Briefe, Namenssplitter, Finale. Die Oberfläche (Dialoge, Chronik) steckt in ui.js.

const NAMES_NEEDED = 40;

const PROLOG = [
  'Vor zwanzig Jahren fiel Asche vom Himmel auf Valdrun.\nDreißigtausend Menschen verschwanden in einer Nacht.\nDie Chroniken nennen es ein Unglück.',
  'Unter den Ruinen aber liegt eine Treppe.\nUnd an ihrem Ende wartet etwas, das keine Namen mag.',
  'Du hast keinen.\nVielleicht ist das der Grund, warum du noch lebst.',
];

const LORE_TEXT = {
  geschichte: 'Valdrun war die Stadt der Glutwacht, eines Ordens von Magiern. Nach der Stillen Seuche, die den Menschen erst ihre Namen nahm und dann das Leben, riefen sie einen Stern herab: Ember. Mit ihm kam das Schweigen, ein Hunger, der Namen frisst. Das Dreigestirn der Glutwacht band es unter der Stadt fest und benutzte dafür die Stadt selbst als Siegel. Das war der Aschenfall. Sie blieben unten als Schlösser des Siegels. Du bist das einzige Kind, das den Tag überlebt hat, mit einem Stück des Sterns in der Brust: dem Funken.',
};

const DEATH_LINES = [
  'Du erinnerst dich nicht mehr an den Geruch von Regen.',
  'Du hast vergessen, wie sich Schnee anfühlt.',
  'Ein Name fällt dir nicht mehr ein. Es war ein schöner.',
  'Die Stimme deiner Ziehmutter klingt jetzt fremd.',
  'Du weißt nicht mehr, was du gestern gegessen hast.',
  'Etwas fehlt. Du weißt nicht, was.',
  'Der Funke zieht dich zurück. Er klingt erschöpft.',
  'Irgendwo hast du ein Lied gekannt. Jetzt nur noch den Rhythmus.',
];

const FLOOR_INTRO = {
  crypt: 'Die Gruft von Valdrun. Hier liegen die, die niemand vergessen durfte.',
  cave: 'Die Kristallhöhle. Jeder Kristall hält ein Stück eines Lebens.',
  lava: 'Die Lavakluft. Hier brennt seit zwanzig Jahren etwas, das nicht erlöschen will.',
  crypt_e: 'Echo-Gruft. Dieselben Gänge, aber die Toten tragen jetzt vertraute Gesichter.',
  cave_e: 'Echo-Kristallhöhle. Die Kristalle zeigen, woran du dich erinnerst.',
  lava_e: 'Echo-Lavakluft. Die Hitze fühlt sich an wie Erinnerung.',
  void: 'Der Stille Thron. Nichts hallt hier. Nicht einmal deine Schritte.',
};

const BOSS_LINES = {
  boss: {
    intro: ['Maldric Voss', 'Noch ein Besucher. Alle kommen, um sich zu erinnern. Ich bleibe, damit niemand vergessen wird.', '#e6c6ff'],
    death: ['Maldric Voss', 'Du hast ihre Hände … Syrael sitzt zwischen den Kristallen. Sag ihr, ich habe gezählt. Jeden Tag.', '#e6c6ff'],
    name: 'Maldric Voss, Hochmeister der Erinnerung',
  },
  queen: {
    intro: ['Syrael', 'Kleines Fädchen. Du willst mich zerreißen? Dann sieh zuerst, was ich gewebt habe.', '#c8f0a0'],
    death: ['Syrael', 'Maldric … er hat gezählt? Dann ist es gut. Geh zu Korath. Und Kind: Glaub nicht alles, was Odalie dir erzählt hat.', '#c8f0a0'],
    name: 'Syrael Anwen, Weberin der Fäden',
  },
  lavalord: {
    intro: ['Korath', 'Zwanzig Jahre brenne ich, damit nichts durch dieses Tor geht. Und ausgerechnet du … du hast ihre Augen.', '#ffb070'],
    death: ['Korath', 'Ich wollte dich in jener Nacht holen. Odalie war schneller. Frag sie, warum.', '#ffb070'],
    name: 'Korath Aschenhand, Feuermeister',
  },
  schweigen: {
    intro: ['Das Schweigen', 'Du hast keinen Namen. Wie schön. Dann kann ich nichts von dir nehmen, außer dir selbst.', '#e8ecf8'],
    name: 'Das Schweigen',
  },
};
const ECHO_BOSS_NAME = { boss: 'Echo des Knochenfürsten', queen: 'Echo der Spinnenkönigin', lavalord: 'Echo des Aschenfürsten' };

// Briefe der Odalie. Der Auslöser ist die Ebene, bei deren Beginn sie ankommen.
const LETTERS = [
  { id: 1, floor: 1, title: 'Der erste Brief', text: 'Mein Funke,\n\nwenn du das liest, bist du unten. Ich bin stolz und habe Angst. Beides. Bleib nicht stehen, aber sieh dich um. Alte Urnen tragen oft Namen. Es lohnt sich, sie zu lesen.\n\nDeine Odalie' },
  { id: 2, floor: 2, title: 'Gruft', text: 'Die Gruft ist kalt. Der Knochenfürst war ein guter Mann, bevor er ein Wächter wurde. Du wirst bald verstehen, wie nah sich beides ist.\n\nTrink deine Glutessenz, bevor du sie brauchst.\n\nO.' },
  { id: 3, floor: 3, title: 'Die Höhle', text: 'Du hast ihn besiegt? Ich … gut. Das war nötig.\n\nGeh weiter. In der Höhle ist alles verknüpft. Zieh nicht an den falschen Fäden. Und wenn dir jemand etwas über mich erzählt: Hör zu, aber glaub nicht gleich.\n\nO.' },
  { id: 4, floor: 5, title: 'Fäden', text: 'Syraels Fäden sind nicht mehr zu retten. Vielleicht waren sie es nie.\n\nSchlaf nicht zu lang. Die Kluft ist heiß, und Korath hat noch nie jemanden vorbeigelassen. Er hasst dich nicht. Das ist das Schlimme.\n\nO.' },
  { id: 5, floor: 7, title: 'Drei Schlösser', text: 'Du hast alle drei Schlösser gelöst. Mehr, als ich je erhoffen durfte.\n\nWas jetzt kommt, ist anders. Die Tiefe wiederholt sich, verzerrt. Das Schweigen kennt dich jetzt. Es baut aus deinen Erinnerungen nach, was es kennt.\n\nVerzeih mir, was noch kommt.\n\nO.' },
  { id: 6, floor: 9, title: 'Der Stille Thron', text: 'Ich habe dir nie gesagt, woher dein Funke kommt. Ich hätte es müssen. Ich habe so viel gesagt, nur nicht das.\n\nWenn du vor dem Thron stehst: Tu, was richtig ist. Ich werde mich nicht dagegen stellen. Nicht einmal, wenn es mich kostet, was ich am meisten wollte.\n\nDeine Odalie' },
];

// Lore zu den legendären Gegenständen
const RELIC_LORE = {
  'Aschenbringer': 'Koraths Stab. Das Holz stammt vom ersten Baum, der nach dem Aschenfall wieder grünte, und verbrannte sofort.',
  'Sturmrufer': 'Syraels Webstab. Jeder Blitz ist ein Faden, der reißt.',
  'Flammenzunge': 'Odalies Lehrstab, mit dem sie dir deinen ersten Zauber zeigte.',
  'Krone des Zwielichts': 'Maldrics Stirnreif, kalt wie die Erinnerung an einen Toten.',
  'Aschenkrone': 'Die Krone der Aschenbrüder. Wer sie trägt, glaubt, der Untergang sei ein Segen gewesen.',
  'Mantel der Nacht': 'Syraels Mantel, gewebt aus einer Nacht, in der niemand schlief.',
  'Glutgewand': 'Die Robe von Koraths Schülern. Man trägt sie nie lange, ohne zu schwitzen.',
  'Seelenband': 'Einer der zwei Eheringe von Maldric und Syrael. Der andere ist irgendwo da unten.',
  'Funkenring': 'Aus einem Splitter von Ember gegossen. Er flüstert, wenn man ihn trägt.',
  'Herz des Sturms': 'Es schlägt, wenn es regnen will. Seit zwanzig Jahren hat es nicht geschlagen.',
  'Auge der Asche': 'Koraths linkes Auge. Es sieht noch, nur sieht es Dinge, die es nicht mehr gibt.',
};

// Bestiarium
const BESTIARY = {
  skeleton: ['Die Gerufenen', 'Tote, die Maldric nicht gehen lassen wollte. Sie erinnern sich an nichts, außer an seinen Ruf.'],
  archer: ['Gerufene Schützen', 'Wer in Valdrun einst Wache stand, steht es noch.'],
  imp: ['Funkenlinge', 'Splitter von Ember, die Gestalt angenommen haben. Sie lachen, aber ohne Stimme.'],
  brute: ['Schlächter', 'Die Totengräber der Gruft. Sie arbeiten noch.'],
  boss: ['Maldric Voss, der Knochenfürst', 'Hochmeister der Erinnerung. Dein Vater. Er hielt die Toten bei sich, damit niemand vergessen wird.'],
  bat: ['Flüsterer', 'Die Stimmen derer, deren Namen niemand mehr kennt.'],
  spider: ['Fadenkinder', 'Aus Syraels Fäden geborene Wesen. Ihr Gift schmeckt nach Vergessen.'],
  golem: ['Kristallwächter', 'Konstrukte des Ordens, vom Siegel am Leben gehalten. Sie bewachen noch immer, nur nicht mehr dich.'],
  queen: ['Syrael, die Spinnenkönigin', 'Weberin der Fäden. Deine Mutter. Sie wob das Netz der Schicksale und verlor sich darin.'],
  hound: ['Aschenhunde', 'Die Wachhunde von Valdrun. Sie verbrannten, und blieben treu.'],
  cultist: ['Aschenbrüder', 'Ein Kult, der den Aschenfall für ein Wunder hält. Sie beten die an, die ihn verursacht haben.'],
  demon: ['Glutgeborene', 'Was das Feuer aus den Toten machte, die es nicht loswurde.'],
  lavalord: ['Korath, der Aschenfürst', 'Feuermeister. Dein Pate. Er widersprach als Einziger und brennt seitdem, damit nichts das letzte Tor passiert.'],
  schweigen: ['Das Schweigen', 'Kein Dämon, kein Gott. Ein Hunger, der Namen frisst, und dich nicht fressen kann, weil du keinen hast.'],
};

const FIRST_NAMES = ['Anselm', 'Liese', 'Bertram', 'Greta', 'Ottilie', 'Konrad', 'Mathilde', 'Jonas', 'Rosalind', 'Emil', 'Hanne', 'Tilman', 'Wilhelmine', 'Lorenz', 'Agnes', 'Cassian', 'Frieda', 'Heinrich', 'Ilse', 'Jakob', 'Katharina', 'Leopold', 'Marta', 'Nikolai', 'Odette', 'Pieter', 'Quirin', 'Resi', 'Sigmund', 'Thea', 'Ulrich', 'Vera', 'Walther', 'Yrsa', 'Zacharias', 'Berta', 'Dorothea', 'Elias', 'Fenna', 'Gustav', 'Hedwig', 'Ingo', 'Jorinde', 'Kaspar', 'Lenz', 'Mirella', 'Norbert', 'Olga', 'Paulina', 'Rupert'];
const LAST_NAMES = ['Vogt', 'Brandt', 'Falk', 'Lindner', 'Wendel', 'Haas', 'Sommer', 'Krüger', 'Adler', 'Berg', 'Dorn', 'Eck', 'Fink', 'Gruber', 'Holm', 'Jung', 'Kern', 'Lorenz', 'Maurer', 'Naumann', 'Ott', 'Pfeil', 'Rau', 'Stein', 'Thal', 'Weiß', 'Zahn', 'Ahorn', 'Bach', 'Cramer', 'Dietz', 'Engel', 'Frey', 'Graf', 'Hahn'];
const JOBS = ['Bäcker', 'Schmied', 'Weberin', 'Gerber', 'Fischer', 'Lehrerin', 'Müller', 'Hebamme', 'Schneider', 'Brauer', 'Bote', 'Köhler', 'Kerzenzieher', 'Glöckner', 'Gärtnerin', 'Uhrmacher', 'Heilerin', 'Wirt', 'Tischler', 'Sängerin', 'Schreiber', 'Maurer', 'Färberin'];

const Story = {
  fresh() { return { name: '', letters: [], names: [], seen: {}, relics: {}, bosses: {}, floorsSeen: {}, ending: 0, intro: false }; },
  S() { return P.story || (P.story = Story.fresh()); },

  deathLine() { return pick(DEATH_LINES); },
  playerName() { return Story.S().name || 'Funke'; },

  // ---- Namen ----
  makeName() {
    const S = Story.S();
    for (let i = 0; i < 40; i++) {
      const f = pick(FIRST_NAMES), r = Math.random();
      const n = r < 0.5 ? `${f} ${pick(LAST_NAMES)}, ${pick(JOBS)}` : r < 0.75 ? `${f}. Nur ${f}.` : `${f} ${pick(LAST_NAMES)} (Kind)`;
      if (!S.names.includes(n)) return n;
    }
    return `Namenlos #${S.names.length + 1}`;
  },
  addName(text) {
    const S = Story.S();
    if (S.names.includes(text)) return false;
    S.names.push(text);
    UI.toast(`Name gefunden: ${text}`, '#ffe8a0');
    Sfx.play('pickupMagic');
    if (S.names.length === Math.floor(NAMES_NEEDED / 2)) UI.say('Odalie', 'Du sammelst sie. Gut. Jeder Name ist ein Faden zurück.', '#ffe8a0');
    if (S.names.length === NAMES_NEEDED) UI.say('Du', 'Vierzig Namen. Das reicht, um etwas zu sagen.', '#ffd84a');
    return true;
  },
  // Chance je nach Objekt
  maybeName(kind) {
    const chance = { urn: 0.55, geode: 0.4, barrel: 0.22 }[kind] || 0;
    if (Math.random() < chance) Story.addName(Story.makeName());
  },

  // ---- Bestiarium / Relikte ----
  seen(type) {
    const S = Story.S();
    if (!BESTIARY[type] || S.seen[type]) return;
    S.seen[type] = 1;
    UI.toast(`Bestiarium: ${BESTIARY[type][0]}`, '#a9c8ff');
  },
  relic(name) {
    const S = Story.S();
    if (!RELIC_LORE[name] || S.relics[name]) return;
    S.relics[name] = 1;
    UI.say(name, RELIC_LORE[name], '#ff9a4a');
  },

  // ---- Ebenen / Briefe ----
  onFloor(f) {
    const S = Story.S(), th = G.theme;
    if (!S.floorsSeen[th.id]) { S.floorsSeen[th.id] = 1; UI.say('', FLOOR_INTRO[th.id] || '', '#cfc8e6', 6000); }
    const l = LETTERS.find(l => l.floor === f);
    if (l && !S.letters.includes(l.id)) { S.letters.push(l.id); UI.showLetter(l); }
  },

  // ---- Bosse ----
  bossIntro(e) {
    const L = BOSS_LINES[e.type];
    if (!L) return;
    UI.say(L.intro[0], L.intro[1], L.intro[2], 7000);
  },
  bossDeath(e) {
    const L = BOSS_LINES[e.type], S = Story.S();
    if (L && L.death) {
      UI.say(L.death[0], L.death[1], L.death[2], 9000);
      S.bosses[e.type] = 1;
    }
    if (L && L.name) Story.addName(L.name);
    if (!G.theme.echo) for (let i = 0; i < 2; i++) Story.addName(Story.makeName());
  },

  // ---- Finale ----
  finale() {
    const S = Story.S();
    S.bossKilled = true;
    const pages = [
      { text: 'Das Schweigen zerfällt.\nWo es stand, bleibt ein Thron aus weißer Stille.\nUnd eine Gestalt, die du kennst.' },
      { who: 'Odalie', text: 'Mein Funke. Du hast es geschafft. Mehr, als ich zu hoffen wagte.', color: '#ffe8a0' },
      { who: 'Odalie', text: 'Gib ihm den Funken. Nur einen Moment. Dann bekommen wir alles zurück: Valdrun. Deine Eltern. Alle.', color: '#ffe8a0' },
      { text: 'Das Schweigen flüstert dir etwas zu, ohne Worte.\nSie wird sie zurückholen. Aber leer.' },
    ];
    UI.sequence(pages, () => {
      const have = S.names.length;
      UI.choice('Was tust du?', [
        { label: 'Das Siegel erneuern', hint: 'Du nimmst Maldrics Platz ein und wirst das neue Schloss.', go: () => Story.ending(1) },
        { label: 'Odalies Weg', hint: 'Du gibst dem Schweigen den Funken.', go: () => Story.ending(2) },
        { label: 'Die Namen nennen', hint: have >= NAMES_NEEDED ? 'Du sprichst jeden Namen aus, den du gesammelt hast.' : `Dafür brauchst du ${NAMES_NEEDED} Namen. Du hast ${have}.`, enabled: have >= NAMES_NEEDED, go: () => Story.ending(3) },
      ]);
    });
  },
  ending(n) {
    const S = Story.S(), me = Story.playerName();
    S.ending = n;
    const E = {
      1: [
        { text: 'Du setzt dich auf den Thron aus Stille.\nDas Siegel schließt sich um dich wie eine Hand.' },
        { text: 'Oben hört der Ascheregen auf.\nDie Welt atmet aus, ohne zu wissen, wem sie es verdankt.' },
        { text: 'Du bleibst. Der Funke brennt ruhig und sehr lange.\nManchmal glaubst du, dass irgendwo jemand deinen Namen sagt, und du weißt ihn nicht mehr.' },
      ],
      2: [
        { text: 'Du gibst dem Schweigen den Funken.\nEs nimmt ihn, wie man ein Geschenk nimmt.' },
        { text: 'Valdrun steht wieder da, Haus für Haus, Straße für Straße.\nDreißigtausend Menschen gehen durch die Gassen.' },
        { text: 'Sie sehen dich nicht an. Sie sagen nichts.\nSie wissen nicht, wer sie sind, und sie fragen nicht.' },
        { who: 'Odalie', text: 'Ich wollte nur, dass sie wieder da sind. Verzeih mir.', color: '#ffe8a0' },
      ],
      3: [
        { text: `Du beginnst zu sprechen.\n${S.names.slice(0, 3).join('.\n')}.\nUnd weiter. Und weiter.` },
        { text: 'Das Schweigen hört zu. Es kennt keine Namen, es kennt nur den Hunger.\nAber ein Name, der ausgesprochen wird, ist keine Beute mehr.' },
        { text: 'Es verstummt. Zum ersten Mal ist die Stille einfach nur Stille.\nOben, über Valdrun, regnet es.' },
        { text: `Dein eigener Name fällt dir als Letztes ein.\nDu sagst ihn laut: „${me}.“` },
      ],
    }[n];
    UI.sequence(E, () => {
      UI.sequence([{ text: 'ENDE', big: true }, { text: 'Die Tiefe geht weiter. Das Echo kennt dich jetzt.', small: true }], () => {
        G.floor = 10; saveGame(); startFloor();
        UI.say('', 'Echo-Modus: Die Tiefe wiederholt sich, schwerer, mit allem, was du gesammelt hast.', '#cfc8e6', 7000);
      });
    });
  },
};
