// =====================================================================
//  JOURNAL DE QUÊTES – version 2
//  6 sections dans la roue : Routines, Calendrier, Loisirs, Attentions, Courses, Travaux
// =====================================================================

// ===== 1. Les types de quêtes ("thèmes") et les 6 sections de la roue =====
// "delai" = tous les combien de jours par défaut ; "xp" = les points gagnés en la terminant.
const THEMES = {
  jour:       { icone: "☀",  nom: "Jour",        couleur: "#9a7a1e", delai: 1,    xp: 10 },
  semaine:    { icone: "📜", nom: "Semaine",     couleur: "#4f6b3a", delai: 7,    xp: 25 },
  mois:       { icone: "🌙", nom: "Mois",        couleur: "#2f6b6b", delai: 30,   xp: 40 },
  rdv:        { icone: "📅", nom: "Rendez-vous", couleur: "#34557a", delai: null, xp: 30 },
  sorties:    { icone: "🎉", nom: "Sortie",      couleur: "#5e3f6e", delai: null, xp: 20 },
  ponctuel:   { icone: "📌", nom: "Ponctuel",    couleur: "#4b5560", delai: null, xp: 20 },
  loisirs:    { icone: "🎮", nom: "Loisirs",     couleur: "#8a4a1e", delai: null, xp: 15 },
  attentions: { icone: "♥",  nom: "Attentions",  couleur: "#7a2a44", delai: null, xp: 0  },
  courses:    { icone: "🧺", nom: "Courses",     couleur: "#6a5a2a", delai: null, xp: 0  },
  travaux:    { icone: "🔨", nom: "Travaux",     couleur: "#5a3a26", delai: null, xp: 30 },
};

const SECTIONS = [
  { id: "routines",   icone: "🔁", nom: "Routines",   couleur: "#4f6b3a", themes: ["jour", "semaine", "mois"] },
  { id: "calendrier", icone: "📅", nom: "Calendrier", couleur: "#34557a", themes: ["rdv", "sorties", "ponctuel"] },
  { id: "loisirs",    icone: "🎮", nom: "Loisirs",    couleur: "#8a4a1e", themes: ["loisirs"] },
  { id: "attentions", icone: "♥",  nom: "Attentions", couleur: "#7a2a44", themes: ["attentions"] },
  { id: "courses",    icone: "🧺", nom: "Courses",    couleur: "#6a5a2a", themes: ["courses"] },
  { id: "travaux",    icone: "🔨", nom: "Travaux",    couleur: "#5a3a26", themes: ["travaux"] },
];
const sectionDuTheme = (t) => SECTIONS.find(s => s.themes.includes(t)).id;

const RAYONS = ["Fruits & légumes", "Frais", "Épicerie", "Boissons", "Surgelés", "Hygiène", "Entretien", "Animaux", "Autre"];
const SOUS_TRAVAUX = [{ id: "maison", nom: "Maison", icone: "🏠" }, { id: "jardin", nom: "Jardin", icone: "🌿" }];
const SOUS_LOISIRS_DEPART = [
  { id: "cinema", nom: "Cinéma", icone: "🎬" },
  { id: "tele",   nom: "Films télé", icone: "📺" },
  { id: "jeux",   nom: "Jeux vidéo", icone: "🕹" },
];

// ===== 2. Les dates =====
function aujourdhui() { return dateTexte(new Date()); }
function dateTexte(d) { // un objet Date devient "2026-11-23"
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function joursEntre(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 86400000); }
function ajouterJours(date, n) { return new Date(Date.parse(date) + n * 86400000).toISOString().slice(0, 10); }
function joli(date) { return date.slice(8, 10) + "/" + date.slice(5, 7); }
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

// ===== 3. Les données, et leur sauvegarde dans le téléphone =====
const CLE = "journal-de-quetes";
let donnees = JSON.parse(localStorage.getItem(CLE)) || { quetes: [] };

function nouvelId() { return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8); }
function touche(q) { q.maj = Date.now(); } // "cette quête vient de changer" (pour la synchro)

// --- Mises à niveau des anciennes données (versions précédentes) ---
if (!donnees.joueurs) {
  donnees.joueurs = { j1: { nom: "Joueur 1" }, j2: { nom: "Joueur 2" } };
  donnees.joueurActif = "j1";
  donnees.journal = [];
} else if (!donnees.joueurs.j1) { // étape 3 : le nom servait de clé
  const corr = {}, nouveaux = {};
  Object.entries(donnees.joueurs).forEach(([nom, j], i) => {
    const id = "j" + (i + 1); corr[nom] = id; nouveaux[id] = { nom };
    if (j.coeurs) donnees.journal.push({ id: "reprise-" + id, date: aujourdhui(), joueur: id, xp: 0, coeurs: j.coeurs });
  });
  donnees.joueurs = nouveaux;
  for (const g of donnees.journal) { if (corr[g.joueur]) g.joueur = corr[g.joueur]; if (!g.id) g.id = nouvelId(); }
  for (const q of donnees.quetes) if (q.gain && corr[q.gain.joueur]) q.gain.joueur = corr[q.gain.joueur];
  donnees.joueurActif = corr[donnees.joueurActif] || "j1";
}
if (!donnees.supprimees) donnees.supprimees = {};
if (!donnees.sousLoisirs) donnees.sousLoisirs = SOUS_LOISIRS_DEPART;
if (!donnees.sectionActive) {
  donnees.sectionActive = donnees.themeActif && THEMES[donnees.themeActif] ? sectionDuTheme(donnees.themeActif) : "routines";
}
if (!donnees.sousActif) donnees.sousActif = {};
for (const q of donnees.quetes) {
  if (q.theme === "loisirs" && !q.sous) { q.sous = donnees.sousLoisirs[0].id; touche(q); }
  // L'assouplissant du tableau devient un article de courses
  if (q.id === "corvee-assouplissant" && q.theme === "ponctuel" && !q.faite) {
    Object.assign(q, { theme: "courses", titre: "Assouplissant", rayon: "Entretien" }); touche(q);
  }
}

// --- Les corvées du tableau blanc (chargées une seule fois) ---
const CORVEES = [
  ["Eau du chat", "jour", 3, "2026-11-14"], ["Lit", "jour", 7, "2026-11-22"],
  ["Lessive serviettes", "semaine", 7, "2026-11-22"], ["Lessive couleur", "semaine", 7, "2026-11-22"],
  ["Toilettes", "semaine", 7, "2026-11-08"], ["Salle de bain", "semaine", 7, "2026-11-10"],
  ["Plantes", "semaine", 7, "2026-10-23"], ["Lavage des gamelles", "semaine", 7, "2026-10-04"],
  ["Plan de travail", "semaine", 7, "2026-10-04"], ["Lessive blanc", "mois", 14, "2026-11-19"],
  ["Lessive draps", "mois", 14, "2026-11-04"], ["Escaliers", "mois", 14, "2026-11-10"],
  ["Poussières", "mois", 14, "2026-07-30"], ["Lessive plaid", "mois", 30, "2026-10-04"],
  ["Lavage des litières auto", "mois", 30, "2026-10-25"], ["Machine à café", "mois", 60, "2026-07-26"],
];
if (!donnees.corveesChargees) {
  CORVEES.forEach(([titre, theme, delai, derniere], i) => {
    donnees.quetes.push({ id: "corvee-" + i, titre, theme, qui: "Les deux", delai, derniere, aConfirmer: true });
  });
  donnees.quetes.push({ id: "corvee-assouplissant", titre: "Assouplissant", theme: "courses", rayon: "Entretien", qui: "Les deux", faite: false });
  donnees.corveesChargees = true;
}

function sauvegarder() {
  localStorage.setItem(CLE, JSON.stringify(donnees));
  if (window.planifierSynchro) planifierSynchro(); // envoyer au foyer (voir sync.js)
}
sauvegarder();

// ===== 4. L'état d'une quête : en retard, à faire, ou faite =====
function etatDe(q) {
  const auj = aujourdhui();
  if (q.delai) { // quête qui revient
    if (!q.derniere) return { etat: "afaire", texte: `Tous les ${q.delai} j · jamais faite`, jours: 0 };
    const prochaine = ajouterJours(q.derniere, q.delai);
    const reste = joursEntre(auj, prochaine);
    const base = `Tous les ${q.delai} j · `;
    if (reste < 0) return { etat: "retard", texte: base + `en retard de ${-reste} j`, jours: reste };
    if (reste === 0) return { etat: "afaire", texte: base + "aujourd'hui", jours: 0 };
    return { etat: "faite", texte: base + `à refaire le ${joli(prochaine)}`, jours: reste };
  }
  if (q.faite) return { etat: "faite", texte: q.theme === "loisirs" ? "Vu / joué ✔" : "Terminée ✔", jours: 999 };
  if (!q.date) return { etat: "afaire", texte: "", jours: 500 };
  const reste = joursEntre(auj, q.date);
  const h = q.heure ? " à " + q.heure : "";
  if (q.theme === "loisirs") { // un film sorti n'est pas "en retard"
    if (reste <= 0) return { etat: "afaire", texte: `Disponible depuis le ${joli(q.date)}`, jours: reste };
    return { etat: "afaire", texte: `Sortie le ${joli(q.date)} · dans ${reste} j`, jours: reste };
  }
  if (reste < 0) return { etat: "retard", texte: `Prévu le ${joli(q.date)} · en retard de ${-reste} j`, jours: reste };
  if (reste === 0) return { etat: "afaire", texte: "Aujourd'hui" + h, jours: 0 };
  return { etat: "afaire", texte: `Le ${joli(q.date)}${h} · dans ${reste} j`, jours: reste };
}

function cocher(q) {
  if (q.delai) {
    if (q.derniere === aujourdhui() && q.avant !== undefined) { q.derniere = q.avant; delete q.avant; return false; }
    q.avant = q.derniere || null;
    q.derniere = aujourdhui();
    return true;
  }
  q.faite = !q.faite;
  return q.faite;
}

// ===== 5. Le côté jeu : XP, niveaux, cœurs =====
function niveauDe(xp) {
  let niveau = 1, reste = xp;
  while (reste >= 100 * niveau) { reste -= 100 * niveau; niveau++; }
  return { niveau, reste, besoin: 100 * niveau };
}
function gainDe(q) {
  if (q.theme === "attentions") return { xp: 0, coeurs: 1 };
  let xp = THEMES[q.theme].xp;
  if (xp && q.date && !q.delai && aujourdhui() <= q.date) xp += 10; // bonus : fait à temps
  return { xp, coeurs: 0 };
}
function totalDe(joueur) {
  let xp = 0, coeurs = 0;
  for (const g of donnees.journal) if (g.joueur === joueur) { xp += g.xp || 0; coeurs += g.coeurs || 0; }
  return { xp: Math.max(0, xp), coeurs: Math.max(0, coeurs) };
}
function xpDuJour(joueur) {
  return donnees.journal.filter(g => g.date === aujourdhui() && g.joueur === joueur).reduce((t, g) => t + (g.xp || 0), 0);
}
function recompenser(q, terminee) {
  if (terminee) {
    const joueur = donnees.joueurActif;
    const gain = gainDe(q);
    if (!gain.xp && !gain.coeurs) return; // les courses ne rapportent rien
    const avant = niveauDe(totalDe(joueur).xp).niveau;
    donnees.journal.push({ id: nouvelId(), date: aujourdhui(), joueur, xp: gain.xp, coeurs: gain.coeurs });
    q.gain = { ...gain, joueur };
    const apres = niveauDe(totalDe(joueur).xp).niveau;
    if (apres > avant) annoncer(`⚔ NIVEAU ${apres} !`, true);
    else annoncer(gain.coeurs ? "+1 ♥" : `+${gain.xp} XP`);
  } else if (q.gain) {
    const { joueur, xp, coeurs } = q.gain;
    donnees.journal.push({ id: nouvelId(), date: aujourdhui(), joueur, xp: -xp, coeurs: -coeurs });
    delete q.gain;
  }
}
function annoncer(texte, grand) {
  const t = document.getElementById("toast");
  t.textContent = texte;
  t.className = grand ? "grand" : "";
  void t.offsetWidth;
  t.classList.add("montre");
}

// ===== 6. Les joueurs =====
function nomDe(id) { return donnees.joueurs[id] ? donnees.joueurs[id].nom : "?"; }
function afficherHeros() {
  const j = totalDe(donnees.joueurActif), n = niveauDe(j.xp);
  document.getElementById("joueur").textContent = "🛡️ " + nomDe(donnees.joueurActif);
  document.getElementById("niveau").textContent = "NIV. " + n.niveau;
  document.getElementById("coeurs").textContent = "♥ " + j.coeurs;
  document.getElementById("barre-xp").style.width = (100 * n.reste / n.besoin) + "%";
  document.getElementById("texte-xp").textContent = `${n.reste} / ${n.besoin} XP avant le niveau ${n.niveau + 1}`;
}
document.getElementById("joueur").addEventListener("click", () => {
  donnees.joueurActif = Object.keys(donnees.joueurs).find(id => id !== donnees.joueurActif);
  sauvegarder(); afficher();
});
document.getElementById("renommer").addEventListener("click", () => {
  const joueur = donnees.joueurs[donnees.joueurActif];
  const ancien = joueur.nom;
  const nouveau = (prompt("Ton nom de héros :", ancien) || "").trim();
  if (!nouveau || nouveau === ancien || nouveau === "Les deux" || Object.values(donnees.joueurs).some(j => j.nom === nouveau)) return;
  joueur.nom = nouveau; joueur.maj = Date.now();
  for (const q of donnees.quetes) if (q.qui === ancien) { q.qui = nouveau; touche(q); }
  sauvegarder(); afficher();
});
function remplirSelect(sel, choix, valeur) { // choix = [[valeur, texte], ...]
  sel.innerHTML = "";
  for (const [v, t] of choix) { const o = document.createElement("option"); o.value = v; o.textContent = t; sel.appendChild(o); }
  if (valeur !== undefined && choix.some(([v]) => v === valeur)) sel.value = valeur;
}

// ===== 7. Les sous-onglets de chaque section =====
function sousOngletsDe(section) {
  if (section === "routines") return [
    { id: "jour", nom: "Jour", icone: "☀" }, { id: "semaine", nom: "Semaine", icone: "📜" },
    { id: "mois", nom: "Mois", icone: "🌙" }, { id: "tout", nom: "Tout", icone: "" }];
  if (section === "loisirs") return [...donnees.sousLoisirs, { id: "+", nom: "", icone: "＋" }];
  if (section === "travaux") return [...SOUS_TRAVAUX, { id: "tout", nom: "Tout", icone: "" }];
  return [];
}
function sousActif(section) {
  const liste = sousOngletsDe(section);
  if (!liste.length) return null;
  const s = donnees.sousActif[section];
  return liste.some(x => x.id === s) ? s : liste[0].id;
}
function afficherSous() {
  const nav = document.getElementById("sous");
  const section = donnees.sectionActive;
  const liste = sousOngletsDe(section);
  nav.innerHTML = "";
  nav.style.display = liste.length ? "flex" : "none";
  const actif = sousActif(section);
  for (const s of liste) {
    const b = document.createElement("button");
    b.textContent = (s.icone + " " + s.nom).trim();
    if (s.id === actif) b.className = "on";
    b.addEventListener("click", () => {
      if (s.id === "+") return ajouterSousLoisir();
      donnees.sousActif[section] = s.id;
      sauvegarder(); afficher();
    });
    nav.appendChild(b);
  }
}
function ajouterSousLoisir() {
  const nom = (prompt("Nom du nouveau sous-onglet (ex. Séries, Livres) :") || "").trim();
  if (!nom) return;
  const icone = (prompt("Un emoji pour le représenter (facultatif) :", "⭐") || "").trim();
  const id = "l-" + nouvelId();
  donnees.sousLoisirs = [...donnees.sousLoisirs, { id, nom, icone }];
  donnees.sousActif.loisirs = id;
  sauvegarder(); afficher();
}

// ===== 8. L'affichage principal =====
function afficher() {
  afficherHeros();
  afficherRappel();
  const section = SECTIONS.find(s => s.id === donnees.sectionActive) || SECTIONS[0];
  document.documentElement.style.setProperty("--theme", section.couleur);
  document.getElementById("titre-icone").textContent = section.icone;
  document.getElementById("titre-nom").textContent = section.nom;
  afficherSous();
  document.getElementById("ajouter").textContent =
    section.id === "courses" ? "🧺 Ajouter un article" : section.id === "calendrier" ? "📅 Nouvel événement" : "⚔ Nouvelle quête";
  const zone = document.getElementById("contenu");
  zone.innerHTML = "";
  if (section.id === "calendrier") return afficherCalendrier(zone);
  if (section.id === "courses") return afficherCourses(zone);
  afficherListe(zone, quetesVisibles(section.id));
}

function quetesVisibles(section) {
  const sous = sousActif(section);
  return donnees.quetes.filter(q => {
    if (section === "routines") return sous === "tout" ? ["jour", "semaine", "mois"].includes(q.theme) : q.theme === sous;
    if (section === "loisirs") return q.theme === "loisirs" && q.sous === sous;
    if (section === "travaux") return q.theme === "travaux" && (sous === "tout" || (q.sous || "maison") === sous);
    return q.theme === section;
  });
}

// Une liste rangée en 3 parchemins : en retard, à faire, faites
function afficherListe(zone, quetes, titres) {
  const tri = quetes.map(q => ({ q, e: etatDe(q) })).sort((a, b) => a.e.jours - b.e.jours);
  const parties = titres || [["retard", "⚠ En retard"], ["afaire", "À faire"], ["faite", "✔ Faites"]];
  let rien = true;
  for (const [etat, titre] of parties) {
    const groupe = tri.filter(x => x.e.etat === etat);
    if (!groupe.length) continue;
    rien = false;
    zone.appendChild(titreSection(titre, etat === "retard"));
    const p = parchemin();
    for (const { q, e } of groupe) p.appendChild(ligne(q, e));
    zone.appendChild(p);
  }
  if (rien) zone.appendChild(vide("Aucune quête ici. Ajoute-en une !"));
}
function titreSection(texte, rouge) {
  const h = document.createElement("h2"); h.className = "h2" + (rouge ? " rouge" : ""); h.textContent = texte; return h;
}
function parchemin() { const d = document.createElement("div"); d.className = "parchemin"; return d; }
function vide(texte) { const p = document.createElement("p"); p.className = "vide"; p.textContent = texte; return p; }

// Une ligne de quête : la case à cocher, le texte (on touche pour modifier), qui
function ligne(q, e, avecHeure) {
  const li = document.createElement("div");
  li.className = "quete " + e.etat;
  const t = THEMES[q.theme];
  const rappel = q.rappel && q.rappel.actif ? " · 🔔" : "";
  li.innerHTML = `
    <input type="checkbox" class="case" ${e.etat === "faite" ? "checked" : ""}>
    ${avecHeure ? `<span class="pastille" style="background:${e.etat === "retard" ? "#8e1f1f" : t.couleur}"></span><span class="heure"></span>` : ""}
    <span class="texte"><span class="titre"></span><span class="info"></span></span>
    <span class="qui"></span>`;
  li.querySelector(".titre").textContent = q.titre + (q.quantite ? " × " + q.quantite : "");
  const lieu = q.lieu ? " · " + q.lieu : "";
  const deRoutine = donnees.sectionActive === "routines" && sousActif("routines") === "tout" ? t.icone + " " : "";
  li.querySelector(".info").textContent = deRoutine + e.texte + lieu + rappel + (q.aConfirmer ? " · délai à confirmer" : "");
  if (avecHeure) li.querySelector(".heure").textContent = q.heure || "";
  li.querySelector(".qui").textContent = q.qui && q.theme !== "courses" ? q.qui : "";
  li.querySelector("input").addEventListener("change", () => {
    const terminee = cocher(q);
    recompenser(q, terminee);
    touche(q);
    sauvegarder(); afficher();
  });
  li.querySelector(".texte").addEventListener("click", () => ouvrirFormulaire(q));
  return li;
}

// ===== 9. Le calendrier (rendez-vous, sorties, tâches ponctuelles) =====
let moisVu = null;           // le premier jour du mois affiché ("2026-11-01")
let jourChoisi = aujourdhui();
if (!donnees.filtresCal) donnees.filtresCal = { rdv: true, sorties: true, ponctuel: true, loisirs: false };

function afficherCalendrier(zone) {
  if (!moisVu) moisVu = jourChoisi.slice(0, 8) + "01";
  // Les filtres de couleur
  const filtres = document.createElement("div");
  filtres.className = "filtres";
  for (const t of ["rdv", "sorties", "ponctuel", "loisirs"]) {
    const b = document.createElement("button");
    b.innerHTML = `<i style="background:${THEMES[t].couleur}"></i>${t === "sorties" ? "Sorties" : THEMES[t].nom}`;
    if (!donnees.filtresCal[t]) b.className = "eteint";
    b.addEventListener("click", () => { donnees.filtresCal[t] = !donnees.filtresCal[t]; sauvegarder(); afficher(); });
    filtres.appendChild(b);
  }
  zone.appendChild(filtres);

  const types = Object.keys(donnees.filtresCal).filter(t => donnees.filtresCal[t]);
  const datees = donnees.quetes.filter(q => types.includes(q.theme) && q.date);
  const parJour = {};
  for (const q of datees) (parJour[q.date] = parJour[q.date] || []).push(q);

  // L'en-tête du mois avec les flèches
  const d0 = new Date(moisVu + "T12:00:00");
  const tete = document.createElement("div");
  tete.className = "mois";
  tete.innerHTML = `<button data-m="-1">‹</button><span>${MOIS[d0.getMonth()].toUpperCase()} ${d0.getFullYear()}</span><button data-m="1">›</button>`;
  tete.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    const d = new Date(moisVu + "T12:00:00");
    d.setMonth(d.getMonth() + Number(b.dataset.m));
    moisVu = dateTexte(d).slice(0, 8) + "01";
    afficher();
  }));
  zone.appendChild(tete);

  // La grille : 7 colonnes, la semaine commence le lundi
  const p = parchemin();
  const grille = document.createElement("div");
  grille.className = "grille";
  grille.innerHTML = ["L", "M", "M", "J", "V", "S", "D"].map(j => `<div class="jsem">${j}</div>`).join("");
  const decalage = (d0.getDay() + 6) % 7;
  for (let i = 0; i < decalage; i++) grille.insertAdjacentHTML("beforeend", `<div class="jour vide"></div>`);
  const nbJours = new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getDate();
  for (let n = 1; n <= nbJours; n++) {
    const date = moisVu.slice(0, 8) + String(n).padStart(2, "0");
    const c = document.createElement("button");
    c.className = "jour" + (date === aujourdhui() ? " auj" : "") + (date === jourChoisi ? " sel" : "");
    const points = (parJour[date] || []).slice(0, 4).map(q => {
      const rouge = etatDe(q).etat === "retard";
      return `<i style="background:${rouge ? "#8e1f1f" : THEMES[q.theme].couleur}"></i>`;
    }).join("");
    c.innerHTML = `${n}<span class="points">${points}</span>`;
    c.addEventListener("click", () => { jourChoisi = date; afficher(); });
    grille.appendChild(c);
  }
  p.appendChild(grille);
  zone.appendChild(p);

  // La liste du jour choisi
  const dj = new Date(jourChoisi + "T12:00:00");
  zone.appendChild(titreSection(`${JOURS[dj.getDay()]} ${dj.getDate()} ${MOIS[dj.getMonth()]}`));
  const duJour = (parJour[jourChoisi] || []).sort((a, b) => (a.heure || "99").localeCompare(b.heure || "99"));
  const pj = parchemin();
  if (duJour.length) for (const q of duJour) pj.appendChild(ligne(q, etatDe(q), true));
  else pj.appendChild(vide("Rien de prévu ce jour-là."));
  zone.appendChild(pj);

  // Les retards et les tâches sans date
  const tous = donnees.quetes.filter(q => types.includes(q.theme));
  const retards = tous.filter(q => etatDe(q).etat === "retard");
  if (retards.length) {
    zone.appendChild(titreSection("⚠ En retard", true));
    const pr = parchemin();
    for (const q of retards) pr.appendChild(ligne(q, etatDe(q), true));
    zone.appendChild(pr);
  }
  const sansDate = tous.filter(q => !q.date && !q.faite);
  if (sansDate.length) {
    zone.appendChild(titreSection("Sans date"));
    const ps = parchemin();
    for (const q of sansDate) ps.appendChild(ligne(q, etatDe(q), true));
    zone.appendChild(ps);
  }
}

// ===== 10. Les courses =====
function afficherCourses(zone) {
  const articles = donnees.quetes.filter(q => q.theme === "courses");
  const aAcheter = articles.filter(q => !q.faite);
  const p = parchemin();
  for (const rayon of RAYONS) {
    const duRayon = aAcheter.filter(q => (q.rayon || "Autre") === rayon);
    if (!duRayon.length) continue;
    const h = document.createElement("div"); h.className = "rayon"; h.textContent = rayon.toUpperCase();
    p.appendChild(h);
    for (const q of duRayon) p.appendChild(ligne(q, { etat: "afaire", texte: "", jours: 0 }));
  }
  if (!aAcheter.length) p.appendChild(vide("La liste est vide. Ajoute un article !"));
  zone.appendChild(p);

  const dansPanier = articles.filter(q => q.faite);
  if (dansPanier.length) {
    zone.appendChild(titreSection("✔ Dans le panier"));
    const pp = parchemin();
    for (const q of dansPanier) pp.appendChild(ligne(q, { etat: "faite", texte: "", jours: 0 }));
    zone.appendChild(pp);
  }

  const texte = () => {
    let t = "🧺 Liste de courses\n";
    for (const rayon of RAYONS) {
      const duRayon = aAcheter.filter(q => (q.rayon || "Autre") === rayon);
      if (!duRayon.length) continue;
      t += `\n${rayon} :\n` + duRayon.map(q => `- ${q.titre}${q.quantite ? " × " + q.quantite : ""}`).join("\n") + "\n";
    }
    return t;
  };
  const bouton = (libelle, classe, action) => {
    const b = document.createElement("button"); b.className = "bouton " + classe; b.textContent = libelle;
    b.addEventListener("click", action); zone.appendChild(b);
  };
  bouton("📋 Copier la liste", "", async () => {
    try { await navigator.clipboard.writeText(texte()); annoncer("Liste copiée ✔"); }
    catch { prompt("Copie ce texte :", texte()); }
  });
  if (navigator.share) bouton("📤 Partager (Messenger, SMS…)", "fer", () => navigator.share({ text: texte() }).catch(() => {}));
  if (dansPanier.length) bouton("🧹 Retirer les articles du panier", "discret", () => {
    for (const q of dansPanier) donnees.supprimees[q.id] = Date.now();
    donnees.quetes = donnees.quetes.filter(q => !dansPanier.includes(q));
    sauvegarder(); afficher();
  });
  const note = document.createElement("p");
  note.className = "note";
  note.textContent = "Leclerc Drive : sur demande, Claude peut remplir le panier sur le site. La commande et le paiement restent faits par vous.";
  zone.appendChild(note);
}

// ===== 11. Le formulaire : ajouter ou modifier une quête =====
const panneau = document.getElementById("panneau-quete");
const form = document.getElementById("formulaire");
const $ = (id) => document.getElementById(id);
let enCours = null; // la quête qu'on modifie (null = nouvelle)

function ouvrirFormulaire(q) {
  enCours = q || null;
  const section = q ? sectionDuTheme(q.theme) : donnees.sectionActive;
  form.dataset.section = section;
  // Afficher seulement les champs utiles pour cette section
  form.querySelectorAll("[data-pour]").forEach(el => {
    el.style.display = el.dataset.pour.split(" ").includes(section) ? "" : "none";
  });
  // Les listes de choix
  const noms = Object.values(donnees.joueurs).map(j => [j.nom, j.nom]);
  remplirSelect($("f-qui"), [...noms, ["Les deux", "Les deux"]], q ? q.qui : nomDe(donnees.joueurActif));
  remplirSelect($("f-rayon"), RAYONS.map(r => [r, r]), q ? q.rayon || "Autre" : "Épicerie");
  let sous = [];
  if (section === "routines") sous = [["jour", "☀ Jour"], ["semaine", "📜 Semaine"], ["mois", "🌙 Mois"]];
  if (section === "loisirs") sous = donnees.sousLoisirs.map(s => [s.id, (s.icone + " " + s.nom).trim()]);
  if (section === "travaux") sous = SOUS_TRAVAUX.map(s => [s.id, s.icone + " " + s.nom]);
  const sousDefaut = section === "routines" ? (q ? q.theme : (sousActif("routines") === "tout" ? "semaine" : sousActif("routines")))
    : q ? q.sous : (sousActif(section) === "tout" ? sous[0] && sous[0][0] : sousActif(section));
  remplirSelect($("f-sous"), sous, sousDefaut);
  // Les textes qui changent selon la section
  $("f-titre-label").textContent = section === "courses" ? "Article" : section === "attentions" ? "Petite attention" : "Quête";
  $("f-qui-label").textContent = section === "attentions" ? "Pour qui" : "Qui s'en charge";
  $("f-sous-label").textContent = section === "routines" ? "Rythme" : "Catégorie";
  $("f-date-label").textContent = section === "loisirs" ? "Date de sortie / diffusion" : section === "travaux" ? "Date limite (facultatif)" : "Date";
  $("f-rappel-label").textContent = section === "loisirs" ? "Me rappeler le jour J (9 h)" : "Me rappeler";
  $("form-titre").textContent = q ? "Modifier la quête" : section === "courses" ? "Nouvel article" : "Nouvelle quête";
  // Les valeurs
  $("f-type").value = q && SECTIONS[1].themes.includes(q.theme) ? q.theme : "rdv";
  $("f-titre").value = q ? q.titre : "";
  $("f-quantite").value = q && q.quantite ? q.quantite : "";
  $("f-delai").value = q ? (q.delai || "") : THEMES[$("f-sous").value] ? THEMES[$("f-sous").value].delai : "";
  $("f-date").value = q ? (q.date || "") : section === "calendrier" ? jourChoisi : "";
  $("f-heure").value = q ? (q.heure || "") : "";
  $("f-lieu").value = q ? (q.lieu || "") : "";
  $("f-rappel").checked = q ? !!(q.rappel && q.rappel.actif) : section === "calendrier";
  $("f-avant").value = q && q.rappel ? String(q.rappel.avant) : "60";
  $("f-supprimer").style.display = q ? "" : "none";
  panneau.classList.remove("cache");
  if (!q) setTimeout(() => $("f-titre").focus(), 50);
}
// Quand on change le rythme (jour/semaine/mois), on propose le délai qui va avec
$("f-sous").addEventListener("change", () => {
  if (form.dataset.section === "routines" && !enCours) $("f-delai").value = THEMES[$("f-sous").value].delai;
});

function lireFormulaire() {
  const section = form.dataset.section;
  const q = enCours || { id: nouvelId(), faite: false };
  q.titre = $("f-titre").value.trim();
  if (section === "routines") {
    q.theme = $("f-sous").value;
    const n = parseInt($("f-delai").value, 10);
    q.delai = n > 0 ? n : null;
    delete q.aConfirmer;
  } else if (section === "calendrier") {
    q.theme = $("f-type").value;
  } else {
    q.theme = section;
  }
  if (section === "loisirs" || section === "travaux") q.sous = $("f-sous").value;
  if (["routines", "calendrier", "travaux", "attentions"].includes(section)) q.qui = $("f-qui").value;
  if (["calendrier", "loisirs", "travaux"].includes(section)) q.date = $("f-date").value || null;
  if (section === "calendrier") { q.heure = $("f-heure").value || null; q.lieu = $("f-lieu").value.trim() || null; }
  if (section === "calendrier" || section === "loisirs") {
    q.rappel = { actif: $("f-rappel").checked, avant: section === "loisirs" ? 0 : Number($("f-avant").value) };
    if (section === "loisirs") q.heure = "09:00";
  }
  if (section === "courses") { q.quantite = $("f-quantite").value.trim() || null; q.rayon = $("f-rayon").value; }
  touche(q);
  return q;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = lireFormulaire();
  if (!enCours) donnees.quetes.push(q);
  if (q.date && form.dataset.section === "calendrier") { jourChoisi = q.date; moisVu = q.date.slice(0, 8) + "01"; }
  sauvegarder();
  fermerFormulaire();
  afficher();
});
$("f-supprimer").addEventListener("click", () => {
  if (!enCours || !confirm(`Supprimer « ${enCours.titre} » ?`)) return;
  donnees.quetes = donnees.quetes.filter(x => x.id !== enCours.id);
  donnees.supprimees[enCours.id] = Date.now();
  sauvegarder(); fermerFormulaire(); afficher();
});
$("f-agenda").addEventListener("click", () => {
  if (!$("f-titre").value.trim() || !$("f-date").value) return alert("Il faut au moins un titre et une date.");
  ajouterAgenda(lireApercu());
});
function lireApercu() { // les valeurs du formulaire, sans enregistrer
  const section = form.dataset.section;
  return {
    titre: $("f-titre").value.trim(), date: $("f-date").value,
    heure: section === "loisirs" ? null : $("f-heure").value || null, lieu: $("f-lieu").value.trim() || null,
    rappel: { actif: $("f-rappel").checked, avant: section === "loisirs" ? 0 : Number($("f-avant").value) },
  };
}
function fermerFormulaire() { panneau.classList.add("cache"); enCours = null; }
panneau.querySelector("[data-fermer]").addEventListener("click", fermerFormulaire);
$("ajouter").addEventListener("click", () => ouvrirFormulaire(null));

// ===== 12. L'agenda du téléphone =====
// Android : on ouvre Google Agenda avec l'événement prérempli.
// iPhone et autres : on crée un petit fichier .ics que l'agenda sait ouvrir (avec l'alarme).
function ajouterAgenda(ev) {
  const jour = ev.date.replaceAll("-", "");
  const details = "Ajouté depuis le Journal de quêtes";
  if (/android/i.test(navigator.userAgent)) {
    let dates;
    if (ev.heure) {
      const debut = jour + "T" + ev.heure.replace(":", "") + "00";
      const fin = new Date(Date.parse(ev.date + "T" + ev.heure + ":00") + 3600000);
      dates = debut + "/" + dateTexte(fin).replaceAll("-", "") + "T" + String(fin.getHours()).padStart(2, "0") + String(fin.getMinutes()).padStart(2, "0") + "00";
    } else {
      dates = jour + "/" + ajouterJours(ev.date, 1).replaceAll("-", "");
    }
    const url = "https://calendar.google.com/calendar/render?action=TEMPLATE"
      + "&text=" + encodeURIComponent(ev.titre) + "&dates=" + dates
      + "&details=" + encodeURIComponent(details) + (ev.lieu ? "&location=" + encodeURIComponent(ev.lieu) : "");
    window.open(url, "_blank");
    return;
  }
  const debut = ev.heure ? "DTSTART:" + jour + "T" + ev.heure.replace(":", "") + "00" : "DTSTART;VALUE=DATE:" + jour;
  const fin = ev.heure ? "DURATION:PT1H" : "DTEND;VALUE=DATE:" + ajouterJours(ev.date, 1).replaceAll("-", "");
  const alarme = ev.rappel.actif
    ? ["BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + ev.titre, `TRIGGER:-PT${ev.heure ? ev.rappel.avant : 0}M`, "END:VALARM"] : [];
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Journal de quetes//FR", "BEGIN:VEVENT",
    "UID:" + nouvelId() + "@journal-de-quetes", "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z",
    debut, fin, "SUMMARY:" + ev.titre, ev.lieu ? "LOCATION:" + ev.lieu : null, "DESCRIPTION:" + details,
    ...alarme, "END:VEVENT", "END:VCALENDAR"].filter(Boolean).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = "quete.ics";
  a.click();
}

// ===== 13. La roue (6 parts) =====
function point(rayon, angle) { return [187.5 + rayon * Math.cos(angle), 187.5 + rayon * Math.sin(angle)]; }
function compteDe(section) {
  const qs = donnees.quetes.filter(q => section.themes.includes(q.theme)).map(q => ({ q, e: etatDe(q) }));
  const retard = qs.some(x => x.e.etat === "retard");
  let n;
  if (section.id === "calendrier") n = qs.filter(x => x.e.etat === "retard" || (x.q.date && !x.q.faite && x.e.jours >= 0 && x.e.jours <= 7)).length;
  else n = qs.filter(x => x.e.etat !== "faite").length;
  return { n, retard };
}
function dessinerRoue() {
  const R = 178, r = 58, pas = 360 / SECTIONS.length;
  let svg = "";
  SECTIONS.forEach((s, i) => {
    const a0 = (-90 - pas / 2 + pas * i) * Math.PI / 180 + 0.015;
    const a1 = (-90 + pas / 2 + pas * i) * Math.PI / 180 - 0.015;
    const am = (a0 + a1) / 2;
    const actif = s.id === donnees.sectionActive, RR = actif ? R + 6 : R;
    const [x0, y0] = point(RR, a0), [x1, y1] = point(RR, a1), [x2, y2] = point(r, a1), [x3, y3] = point(r, a0);
    const { n, retard } = compteDe(s);
    const [ix, iy] = point(116, am), [bx, by] = point(150, am - 0.36);
    svg += `<g data-section="${s.id}">
      <path d="M${x0},${y0} A${RR},${RR} 0 0 1 ${x1},${y1} L${x2},${y2} A${r},${r} 0 0 0 ${x3},${y3} Z"
            fill="${s.couleur}" stroke="${actif ? "#e9cf7a" : "#c9a24a"}" stroke-width="${actif ? 3 : 1.2}"/>
      <text x="${ix}" y="${iy - 4}" font-size="30" text-anchor="middle" fill="#e8dcc0">${s.icone}</text>
      <text x="${ix}" y="${iy + 19}" class="nom-part" text-anchor="middle">${s.nom.toUpperCase()}</text>
      ${n ? `<circle cx="${bx}" cy="${by}" r="11" fill="${retard ? "#8e1f1f" : "#e8dcc0"}" stroke="#c9a24a"/>
      <text x="${bx}" y="${by + 4}" font-size="12" font-weight="800" text-anchor="middle" fill="${retard ? "#fff" : "#2a1d12"}">${n}</text>` : ""}
    </g>`;
  });
  const joueur = donnees.joueurActif;
  svg += `<circle cx="187.5" cy="187.5" r="${r + 6}" fill="none" stroke="#000" stroke-width="4"/>
    <circle cx="187.5" cy="187.5" r="${r - 3}" fill="#241b15" stroke="#c9a24a" stroke-width="3"/>
    <text x="187.5" y="173" font-size="10" class="cinzel" fill="#c9bfa8" text-anchor="middle" letter-spacing="2">NIVEAU</text>
    <text x="187.5" y="201" font-size="30" class="cinzel" font-weight="800" fill="#c9a24a" text-anchor="middle">${niveauDe(totalDe(joueur).xp).niveau}</text>
    <text x="187.5" y="218" font-size="11" fill="#e8dcc0" text-anchor="middle" font-style="italic">+${xpDuJour(joueur)} XP aujourd'hui</text>`;
  const roue = document.getElementById("roue");
  roue.innerHTML = svg;
  roue.querySelectorAll("g[data-section]").forEach(g => g.addEventListener("click", () => {
    donnees.sectionActive = g.dataset.section;
    sauvegarder(); fermerRoue(); afficher(); window.scrollTo(0, 0);
  }));
}
const fond = document.getElementById("roue-fond");
const bouton = document.getElementById("bouton-roue");
function ouvrirRoue() { dessinerRoue(); fond.classList.remove("cache"); bouton.textContent = "✕"; }
function fermerRoue() { fond.classList.add("cache"); bouton.textContent = "⚔"; }
bouton.addEventListener("click", () => fond.classList.contains("cache") ? ouvrirRoue() : fermerRoue());

// ===== 14. Installation, rappel du jour et notifications =====
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");

let propositionInstall = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault(); propositionInstall = e; $("installer").classList.remove("cache");
});
$("installer").addEventListener("click", async () => {
  if (!propositionInstall) return;
  propositionInstall.prompt(); await propositionInstall.userChoice;
  propositionInstall = null; $("installer").classList.add("cache");
});

function resumeDuJour() {
  let retard = 0, aujourdhuiNb = 0;
  for (const q of donnees.quetes) {
    if (q.theme === "courses") continue;
    const e = etatDe(q);
    if (e.etat === "retard") retard++;
    else if (e.etat === "afaire" && e.jours === 0) aujourdhuiNb++;
  }
  return { retard, aujourdhuiNb };
}
function afficherRappel() {
  const { retard, aujourdhuiNb } = resumeDuJour();
  const zone = $("rappel");
  if (!retard && !aujourdhuiNb) { zone.classList.add("cache"); return; }
  const m = [];
  if (retard) m.push(`<b>${retard}</b> en retard`);
  if (aujourdhuiNb) m.push(`<b>${aujourdhuiNb}</b> pour aujourd'hui`);
  zone.innerHTML = "🔔 Quêtes : " + m.join(" · ");
  zone.classList.toggle("urgent", retard > 0);
  zone.classList.remove("cache");
  if ("setAppBadge" in navigator) navigator.setAppBadge(retard + aujourdhuiNb).catch(() => {});
}

const boutonRappels = $("activer-rappels");
if ("Notification" in window && Notification.permission === "default") boutonRappels.classList.remove("cache");
boutonRappels.addEventListener("click", async () => {
  const rep = await Notification.requestPermission();
  boutonRappels.classList.add("cache");
  if (rep === "granted") { notifierResume(true); verifierRappels(); }
});
async function notifier(titre, texte, tag) {
  const reg = await navigator.serviceWorker?.ready;
  if (reg) reg.showNotification(titre, { body: texte, icon: "icones/icone-192.png", tag });
}
function notifierResume(force) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (!force && donnees.derniereNotif === aujourdhui()) return;
  const { retard, aujourdhuiNb } = resumeDuJour();
  if (!retard && !aujourdhuiNb) return;
  notifier("⚔ Journal de quêtes", `${retard} en retard, ${aujourdhuiNb} pour aujourd'hui`, "rappel-du-jour");
  donnees.derniereNotif = aujourdhui();
  sauvegarder();
}
// Les rappels à l'heure (rendez-vous, sorties, loisirs) : vérifiés toutes les minutes tant que l'appli est ouverte.
// Pour être prévenu appli fermée : le bouton "Ajouter à l'agenda du téléphone".
function momentRappel(q) {
  if (!q.rappel || !q.rappel.actif || !q.date || q.faite) return null;
  return Date.parse(q.date + "T" + (q.heure || "09:00") + ":00") - (q.rappel.avant || 0) * 60000;
}
function verifierRappels() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (!donnees.rappelsEnvoyes) donnees.rappelsEnvoyes = {};
  const maintenant = Date.now();
  let change = false;
  for (const q of donnees.quetes) {
    const m = momentRappel(q);
    if (!m || m > maintenant || maintenant - m > 12 * 3600000) continue;
    const cle = q.id + "@" + m;
    if (donnees.rappelsEnvoyes[cle]) continue;
    notifier("🔔 " + q.titre, etatDe(q).texte + (q.lieu ? " · " + q.lieu : ""), cle);
    donnees.rappelsEnvoyes[cle] = maintenant;
    change = true;
  }
  if (change) localStorage.setItem(CLE, JSON.stringify(donnees));
}
setInterval(verifierRappels, 60000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) { verifierRappels(); afficher(); } });

// ===== 15. C'est parti ! =====
afficher();
notifierResume(false);
verifierRappels();
