// ===== 1. Les 8 thématiques =====
// "delai" = le nombre de jours proposé par défaut quand on ajoute une quête ici.
// "xp" = les points gagnés quand on termine une quête de cette thématique (Attentions donne un cœur à la place).
const THEMES = [
  { id: "jour",       icone: "☀️", nom: "Jour",        couleur: "#e8b40c", delai: 1, xp: 10 },
  { id: "semaine",    icone: "📜", nom: "Semaine",     couleur: "#3f9d5a", delai: 7, xp: 25 },
  { id: "mois",       icone: "🌙", nom: "Mois",        couleur: "#16a3a3", delai: 30, xp: 40 },
  { id: "rdv",        icone: "📅", nom: "Rendez-vous", couleur: "#3a7bd5", delai: null, xp: 30 },
  { id: "sorties",    icone: "🎉", nom: "Sorties",     couleur: "#9b59b6", delai: null, xp: 20 },
  { id: "ponctuel",   icone: "📌", nom: "Ponctuel",    couleur: "#607d8b", delai: null, xp: 20 },
  { id: "loisirs",    icone: "🎮", nom: "Loisirs",     couleur: "#e67e22", delai: null, xp: 15 },
  { id: "attentions", icone: "💝", nom: "Attentions",  couleur: "#e84393", delai: null, xp: 0 },
];

// ===== 2. Les dates =====
// On écrit les dates sous la forme "2026-11-22" : c'est simple à comparer et à sauvegarder.
function aujourdhui() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
// Nombre de jours entre deux dates (positif si "b" est après "a").
function joursEntre(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}
function ajouterJours(date, n) {
  const d = new Date(Date.parse(date) + n * 86400000);
  return d.toISOString().slice(0, 10);
}
function joli(date) { // "2026-11-25" devient "25/11"
  return date.slice(8, 10) + "/" + date.slice(5, 7);
}

// ===== 3. Les données, et leur sauvegarde dans le téléphone =====
const CLE = "journal-de-quetes";
let donnees = JSON.parse(localStorage.getItem(CLE)) || { themeActif: "jour", quetes: [] };

// Un identifiant unique (pour les quêtes, les gains…)
function nouvelId() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

// Les joueurs ont un identifiant fixe (j1, j2) et un nom qu'on peut changer.
// L'XP et les cœurs ne sont plus rangés dans le joueur : on les calcule avec le journal des gains.
// (C'est plus sûr pour la synchro : deux téléphones ne peuvent pas s'écraser leurs points.)
if (!donnees.joueurs) {
  donnees.joueurs = { j1: { nom: "Joueur 1" }, j2: { nom: "Joueur 2" } };
  donnees.joueurActif = "j1";
  donnees.journal = []; // l'historique des gains : { id, date, joueur, xp, coeurs }
} else if (!donnees.joueurs.j1) {
  // Les données de l'étape 3 utilisaient le nom comme clé : on les convertit.
  const correspondance = {};
  const nouveaux = {};
  Object.entries(donnees.joueurs).forEach(([nom, j], i) => {
    const id = "j" + (i + 1);
    correspondance[nom] = id;
    nouveaux[id] = { nom };
    if (j.coeurs) donnees.journal.push({ id: "reprise-" + id, date: aujourdhui(), joueur: id, xp: 0, coeurs: j.coeurs });
  });
  donnees.joueurs = nouveaux;
  for (const g of donnees.journal) {
    if (correspondance[g.joueur]) g.joueur = correspondance[g.joueur];
    if (!g.id) g.id = nouvelId();
    if (!g.coeurs) g.coeurs = 0;
  }
  for (const q of donnees.quetes) if (q.gain && correspondance[q.gain.joueur]) q.gain.joueur = correspondance[q.gain.joueur];
  donnees.joueurActif = correspondance[donnees.joueurActif] || "j1";
}
if (!donnees.supprimees) donnees.supprimees = {}; // { idQuete: moment de la suppression }

function nomDe(idJoueur) {
  return donnees.joueurs[idJoueur] ? donnees.joueurs[idJoueur].nom : "?";
}

// Noter "cette quête vient de changer" (sert à la synchro pour savoir quelle version est la plus récente)
function touche(q) {
  q.maj = Date.now();
}

function sauvegarder() {
  localStorage.setItem(CLE, JSON.stringify(donnees));
  if (window.planifierSynchro) planifierSynchro(); // étape 5 : envoyer au foyer (voir sync.js)
}

// ===== 4. Les corvées du tableau blanc (chargées une seule fois) =====
// [titre, thématique, tous les X jours, dernière fois]. Délais et "qui" : à confirmer.
const CORVEES = [
  ["Eau du chat", "jour", 3, "2026-11-14"],
  ["Lit", "jour", 7, "2026-11-22"],
  ["Lessive serviettes", "semaine", 7, "2026-11-22"],
  ["Lessive couleur", "semaine", 7, "2026-11-22"],
  ["Toilettes", "semaine", 7, "2026-11-08"],
  ["Salle de bain", "semaine", 7, "2026-11-10"],
  ["Plantes", "semaine", 7, "2026-10-23"],
  ["Lavage des gamelles", "semaine", 7, "2026-10-04"],
  ["Plan de travail", "semaine", 7, "2026-10-04"],
  ["Lessive blanc", "mois", 14, "2026-11-19"],
  ["Lessive draps", "mois", 14, "2026-11-04"],
  ["Escaliers", "mois", 14, "2026-11-10"],
  ["Poussières", "mois", 14, "2026-07-30"],
  ["Lessive plaid", "mois", 30, "2026-10-04"],
  ["Lavage des litières auto", "mois", 30, "2026-10-25"],
  ["Machine à café", "mois", 60, "2026-07-26"],
];
if (!donnees.corveesChargees) {
  CORVEES.forEach(([titre, theme, delai, derniere], i) => {
    donnees.quetes.push({ id: "corvee-" + i, titre, theme, qui: "Les deux", delai, derniere, aConfirmer: true });
  });
  donnees.quetes.push({ id: "corvee-assouplissant", titre: "Acheter de l'assouplissant (Drive)", theme: "ponctuel", qui: "Les deux", faite: false });
  donnees.corveesChargees = true;
  sauvegarder();
}

// ===== 5. L'état d'une quête : en retard, à faire, ou faite =====
// Renvoie { etat: "retard" | "afaire" | "faite", texte: "...", jours: nombre pour trier }
function etatDe(q) {
  const auj = aujourdhui();
  if (q.delai) { // quête qui revient
    if (!q.derniere) return { etat: "afaire", texte: `Tous les ${q.delai} j · jamais faite`, jours: 0 };
    const prochaine = ajouterJours(q.derniere, q.delai);
    const reste = joursEntre(auj, prochaine);
    const base = `Tous les ${q.delai} j · `;
    if (reste < 0) return { etat: "retard", texte: base + `en retard de ${-reste} j`, jours: reste };
    if (reste === 0) return { etat: "afaire", texte: base + "à faire aujourd'hui", jours: 0 };
    return { etat: "faite", texte: base + `à refaire dans ${reste} j (le ${joli(prochaine)})`, jours: reste };
  }
  // quête simple (une seule fois)
  if (q.faite) return { etat: "faite", texte: "Terminée ✔", jours: 999 };
  if (!q.date) return { etat: "afaire", texte: "", jours: 500 };
  const reste = joursEntre(auj, q.date);
  if (reste < 0) return { etat: "retard", texte: `Prévu le ${joli(q.date)} · en retard de ${-reste} j`, jours: reste };
  if (reste === 0) return { etat: "afaire", texte: "Aujourd'hui", jours: 0 };
  return { etat: "afaire", texte: `Le ${joli(q.date)} · dans ${reste} j`, jours: reste };
}

// Cocher une quête
function cocher(q) {
  if (q.delai) {
    if (q.derniere === aujourdhui() && q.avant !== undefined) {
      q.derniere = q.avant;        // on décoche : on remet l'ancienne date
      delete q.avant;
      return false;
    }
    q.avant = q.derniere || null;   // on garde l'ancienne date au cas où
    q.derniere = aujourdhui();
    return true;
  }
  q.faite = !q.faite;
  return q.faite;
}

// ===== 5 bis. Le côté jeu : XP, niveaux, cœurs =====
// Pour passer du niveau n au niveau n+1, il faut 100 × n XP.
// Niveau 1 → 2 : 100 XP, niveau 2 → 3 : 200 XP, etc.
function niveauDe(xp) {
  let niveau = 1, reste = xp;
  while (reste >= 100 * niveau) {
    reste -= 100 * niveau;
    niveau++;
  }
  return { niveau, reste, besoin: 100 * niveau };
}

function gainDe(q) {
  const theme = THEMES.find(t => t.id === q.theme);
  if (theme.id === "attentions") return { xp: 0, coeurs: 1 };
  let xp = theme.xp;
  if (q.date && !q.delai && aujourdhui() <= q.date) xp += 10; // bonus : fait avant la date
  return { xp, coeurs: 0 };
}

// Le total d'XP et de cœurs d'un joueur = la somme de ses gains dans le journal
function totalDe(joueur) {
  let xp = 0, coeurs = 0;
  for (const g of donnees.journal) {
    if (g.joueur !== joueur) continue;
    xp += g.xp || 0;
    coeurs += g.coeurs || 0;
  }
  return { xp: Math.max(0, xp), coeurs: Math.max(0, coeurs) };
}

function xpDuJour(joueur) {
  return donnees.journal
    .filter(j => j.date === aujourdhui() && j.joueur === joueur)
    .reduce((total, j) => total + (j.xp || 0), 0);
}

// Donner (ou reprendre) la récompense d'une quête
function recompenser(q, terminee) {
  if (terminee) {
    const joueur = donnees.joueurActif;
    const gain = gainDe(q);
    const avant = niveauDe(totalDe(joueur).xp).niveau;
    donnees.journal.push({ id: nouvelId(), date: aujourdhui(), joueur, xp: gain.xp, coeurs: gain.coeurs });
    q.gain = { ...gain, joueur }; // on note qui a gagné quoi, pour pouvoir annuler
    const apres = niveauDe(totalDe(joueur).xp).niveau;
    if (apres > avant) annoncer(`🎉 NIVEAU ${apres} !`, true);
    else annoncer(gain.coeurs ? "+1 ❤️" : `+${gain.xp} XP`);
  } else if (q.gain) {
    const { joueur, xp, coeurs } = q.gain;
    donnees.journal.push({ id: nouvelId(), date: aujourdhui(), joueur, xp: -xp, coeurs: -coeurs });
    delete q.gain;
  }
}

// Le petit message qui s'envole (+25 XP)
function annoncer(texte, grand) {
  const t = document.getElementById("toast");
  t.textContent = texte;
  t.className = grand ? "grand" : "";
  void t.offsetWidth;          // astuce pour relancer l'animation
  t.classList.add("montre");
}

// Le bandeau du héros en haut
function afficherHeros() {
  const joueur = donnees.joueurActif;
  const j = totalDe(joueur);
  const n = niveauDe(j.xp);
  document.getElementById("joueur").textContent = "🛡️ " + nomDe(joueur);
  document.getElementById("niveau").textContent = "Niveau " + n.niveau;
  document.getElementById("coeurs").textContent = "❤️ " + j.coeurs;
  document.getElementById("barre-xp").style.width = (100 * n.reste / n.besoin) + "%";
  document.getElementById("texte-xp").textContent = `${n.reste} / ${n.besoin} XP avant le niveau ${n.niveau + 1}`;
}

// Toucher son nom = changer de joueur
document.getElementById("joueur").addEventListener("click", () => {
  const ids = Object.keys(donnees.joueurs);
  donnees.joueurActif = ids.find(id => id !== donnees.joueurActif);
  sauvegarder();
  afficher();
});

// Le crayon à côté du nom = renommer le joueur affiché (le nom reste dans le téléphone)
document.getElementById("renommer").addEventListener("click", () => {
  const joueur = donnees.joueurs[donnees.joueurActif];
  const ancien = joueur.nom;
  const nouveau = (prompt("Ton nom de héros :", ancien) || "").trim();
  const dejaPris = Object.values(donnees.joueurs).some(j => j.nom === nouveau);
  if (!nouveau || nouveau === ancien || dejaPris || nouveau === "Les deux") return;
  joueur.nom = nouveau;
  joueur.maj = Date.now();
  // on met à jour le nom dans les quêtes ("qui s'en charge")
  for (const q of donnees.quetes) {
    if (q.qui === ancien) { q.qui = nouveau; touche(q); }
  }
  sauvegarder();
  afficher();
});

// La liste "qui s'en charge" du formulaire : les 2 joueurs + "Les deux"
function remplirQui() {
  const liste = document.getElementById("champ-qui");
  const choix = [...Object.values(donnees.joueurs).map(j => j.nom), "Les deux"];
  const avant = liste.value;
  liste.innerHTML = "";
  for (const nom of choix) {
    const option = document.createElement("option");
    option.textContent = nom;
    liste.appendChild(option);
  }
  if (choix.includes(avant)) liste.value = avant;
  else liste.value = nomDe(donnees.joueurActif);
}

// ===== 6. Afficher la liste, rangée en 3 sections =====
function afficher() {
  afficherHeros();
  remplirQui();
  if (typeof afficherRappel === "function") afficherRappel();
  const theme = THEMES.find(t => t.id === donnees.themeActif);
  document.documentElement.style.setProperty("--theme", theme.couleur);
  document.getElementById("theme-icone").textContent = theme.icone;
  document.getElementById("theme-nom").textContent = theme.nom;
  document.getElementById("champ-delai").value = theme.delai || "";

  const liste = document.getElementById("liste");
  liste.innerHTML = "";
  const quetes = donnees.quetes
    .filter(q => q.theme === theme.id)
    .map(q => ({ q, e: etatDe(q) }))
    .sort((a, b) => a.e.jours - b.e.jours); // les plus urgentes en premier

  const sections = [
    ["retard", "⚠️ En retard"],
    ["afaire", "À faire"],
    ["faite", "✅ Faites"],
  ];
  for (const [etat, titreSection] of sections) {
    const groupe = quetes.filter(x => x.e.etat === etat);
    if (!groupe.length) continue;
    const h2 = document.createElement("h2");
    h2.textContent = titreSection;
    liste.appendChild(h2);
    for (const { q, e } of groupe) liste.appendChild(ligne(q, e));
  }
  document.getElementById("vide").style.display = quetes.length ? "none" : "block";
}

function ligne(q, e) {
  const li = document.createElement("li");
  li.className = "quete " + e.etat;
  li.innerHTML = `
    <input type="checkbox" ${e.etat === "faite" ? "checked" : ""}>
    <span class="texte">
      <span class="titre"></span>
      <span class="info"></span>
      ${q.aConfirmer ? '<span class="a-confirmer">délai à confirmer</span>' : ""}
    </span>
    <span class="qui"></span>
    <button class="modifier" title="Changer le délai">✏️</button>
    <button class="supprimer" title="Supprimer">🗑️</button>`;
  li.querySelector(".titre").textContent = q.titre;
  li.querySelector(".info").textContent = e.texte;
  li.querySelector(".qui").textContent = q.qui;

  li.querySelector("input").addEventListener("change", () => {
    const terminee = cocher(q);
    recompenser(q, terminee);
    touche(q);
    sauvegarder();
    afficher();
  });
  li.querySelector(".modifier").addEventListener("click", () => {
    const rep = prompt(`« ${q.titre} » : tous les combien de jours ? (vide = une seule fois)`, q.delai || "");
    if (rep === null) return; // bouton Annuler
    const n = parseInt(rep, 10);
    q.delai = n > 0 ? n : null;
    delete q.aConfirmer;
    touche(q);
    sauvegarder();
    afficher();
  });
  li.querySelector(".supprimer").addEventListener("click", () => {
    if (!confirm(`Supprimer « ${q.titre} » ?`)) return;
    donnees.quetes = donnees.quetes.filter(x => x.id !== q.id);
    donnees.supprimees[q.id] = Date.now(); // pour que la suppression arrive aussi sur les autres appareils
    sauvegarder();
    afficher();
  });
  return li;
}

// ===== 7. Ajouter une quête =====
document.getElementById("formulaire").addEventListener("submit", (e) => {
  e.preventDefault(); // empêche la page de se recharger
  const champ = document.getElementById("champ-titre");
  const delai = parseInt(document.getElementById("champ-delai").value, 10);
  donnees.quetes.push({
    id: nouvelId(),
    maj: Date.now(),
    titre: champ.value.trim(),
    qui: document.getElementById("champ-qui").value,
    theme: donnees.themeActif,
    delai: delai > 0 ? delai : null,
    date: document.getElementById("champ-date").value || null,
    faite: false,
  });
  champ.value = "";
  document.getElementById("champ-date").value = "";
  sauvegarder();
  afficher();
});

// ===== 8. La roue =====
function point(rayon, angle) {
  return [187.5 + rayon * Math.cos(angle), 187.5 + rayon * Math.sin(angle)];
}

function dessinerRoue() {
  const R = 175, r = 55;
  let svg = "";
  let totalAFaire = 0;
  THEMES.forEach((t, i) => {
    const a0 = (-112.5 + 45 * i) * Math.PI / 180 + 0.02;
    const a1 = (-67.5 + 45 * i) * Math.PI / 180 - 0.02;
    const [x0, y0] = point(R, a0), [x1, y1] = point(R, a1);
    const [x2, y2] = point(r, a1), [x3, y3] = point(r, a0);
    const actif = t.id === donnees.themeActif;
    const etats = donnees.quetes.filter(q => q.theme === t.id).map(etatDe);
    const aFaire = etats.filter(e => e.etat !== "faite").length;
    const enRetard = etats.some(e => e.etat === "retard");
    totalAFaire += aFaire;
    const [ix, iy] = point(115, (a0 + a1) / 2);
    const [bx, by] = point(152, (a0 + a1) / 2 + 0.25);
    svg += `<g data-theme="${t.id}">
      <path d="M${x0},${y0} A${R},${R} 0 0 1 ${x1},${y1} L${x2},${y2} A${r},${r} 0 0 0 ${x3},${y3} Z"
            fill="${t.couleur}" stroke="${actif ? "#fff" : "#1d1a16"}" stroke-width="${actif ? 4 : 2}"/>
      <text x="${ix}" y="${iy - 2}" font-size="28" text-anchor="middle">${t.icone}</text>
      <text x="${ix}" y="${iy + 20}" font-size="12" font-weight="700" fill="#fff" text-anchor="middle">${t.nom}</text>
      ${aFaire ? `<circle cx="${bx}" cy="${by}" r="11" fill="${enRetard ? "#c0392b" : "#fff"}"/>
      <text x="${bx}" y="${by + 4}" font-size="12" font-weight="800" fill="${enRetard ? "#fff" : t.couleur}" text-anchor="middle">${aFaire}</text>` : ""}
    </g>`;
  });
  const joueur = donnees.joueurActif;
  const niv = niveauDe(totalDe(joueur).xp).niveau;
  svg += `<circle cx="187.5" cy="187.5" r="${r - 4}" fill="#3b2a1a" stroke="#d9a441" stroke-width="3"/>
    <text x="187.5" y="168" font-size="10" fill="#cbb994" text-anchor="middle">NIVEAU</text>
    <text x="187.5" y="194" font-size="26" font-weight="800" fill="#d9a441" text-anchor="middle">${niv}</text>
    <text x="187.5" y="211" font-size="10" fill="#f3e7cc" text-anchor="middle">+${xpDuJour(joueur)} XP auj.</text>`;
  document.querySelector("#roue-fond .aide").textContent = `Touche une part · ${totalAFaire} quêtes à faire`;
  const roue = document.getElementById("roue");
  roue.innerHTML = svg;

  roue.querySelectorAll("g[data-theme]").forEach(g => {
    g.addEventListener("click", () => {
      donnees.themeActif = g.dataset.theme;
      sauvegarder();
      fermerRoue();
      afficher();
    });
  });
}

const fond = document.getElementById("roue-fond");
const bouton = document.getElementById("bouton-roue");
function ouvrirRoue() { dessinerRoue(); fond.classList.remove("cache"); bouton.textContent = "✕"; }
function fermerRoue() { fond.classList.add("cache"); bouton.textContent = "⚔️"; }
bouton.addEventListener("click", () => fond.classList.contains("cache") ? ouvrirRoue() : fermerRoue());

// ===== 9. Installation sur téléphone et rappels (étape 4) =====

// 9a. On démarre le service worker (sw.js), qui permet le mode hors connexion.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

// 9b. Le bouton "Installer" : Android et PC proposent l'installation, on garde la proposition.
let propositionInstall = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  propositionInstall = e;
  document.getElementById("installer").classList.remove("cache");
});
document.getElementById("installer").addEventListener("click", async () => {
  if (!propositionInstall) return;
  propositionInstall.prompt();
  await propositionInstall.userChoice;
  propositionInstall = null;
  document.getElementById("installer").classList.add("cache");
});

// 9c. Le résumé du jour : combien de quêtes en retard et à faire aujourd'hui.
function resumeDuJour() {
  let retard = 0, aujourdhuiNb = 0;
  for (const q of donnees.quetes) {
    const e = etatDe(q);
    if (e.etat === "retard") retard++;
    else if (e.etat === "afaire" && e.jours === 0) aujourdhuiNb++;
  }
  return { retard, aujourdhuiNb };
}

function afficherRappel() {
  const { retard, aujourdhuiNb } = resumeDuJour();
  const zone = document.getElementById("rappel");
  if (!retard && !aujourdhuiNb) { zone.classList.add("cache"); return; }
  const morceaux = [];
  if (retard) morceaux.push(`<b>${retard}</b> en retard`);
  if (aujourdhuiNb) morceaux.push(`<b>${aujourdhuiNb}</b> pour aujourd'hui`);
  zone.innerHTML = "🔔 Quêtes : " + morceaux.join(" · ");
  zone.classList.toggle("urgent", retard > 0);
  zone.classList.remove("cache");

  // La pastille sur l'icône de l'appli (si le téléphone sait le faire)
  if ("setAppBadge" in navigator) navigator.setAppBadge(retard + aujourdhuiNb).catch(() => {});
}

// 9d. Les notifications : on demande la permission, puis une notification par jour au maximum.
const boutonRappels = document.getElementById("activer-rappels");
if ("Notification" in window && Notification.permission === "default") {
  boutonRappels.classList.remove("cache");
}
boutonRappels.addEventListener("click", async () => {
  const reponse = await Notification.requestPermission();
  boutonRappels.classList.add("cache");
  if (reponse === "granted") notifierSiBesoin(true);
});

async function notifierSiBesoin(force) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (!force && donnees.derniereNotif === aujourdhui()) return; // déjà prévenu aujourd'hui
  const { retard, aujourdhuiNb } = resumeDuJour();
  if (!retard && !aujourdhuiNb) return;
  const texte = `${retard} en retard, ${aujourdhuiNb} pour aujourd'hui`;
  const reg = await navigator.serviceWorker?.ready;
  if (reg) reg.showNotification("⚔️ Journal de quêtes", { body: texte, icon: "icones/icone-192.png", tag: "rappel-du-jour" });
  donnees.derniereNotif = aujourdhui();
  sauvegarder();
}

// ===== 10. C'est parti ! =====
afficher();
notifierSiBesoin(false);
