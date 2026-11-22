// =====================================================================
//  Étape 5 : la synchro entre appareils (Supabase)
// =====================================================================
//  - Chaque appareil garde ses données dans le téléphone (comme avant).
//  - En plus, il les envoie dans le "foyer" en ligne, et récupère celles des autres.
//  - Si deux appareils ont changé des choses en même temps, on FUSIONNE :
//    pour chaque quête, on garde la version la plus récente (champ "maj").
// =====================================================================

// L'adresse du projet et sa clé publique (faite pour être visible : la sécurité est dans la base).
const SUPABASE_URL = "https://jvvrpecshltmpnjepiou.supabase.co";
const SUPABASE_CLE = "sb_publishable_i_kGm51HG5k_YtOQhPPEdA_XXN9_Kfi";

// Si la librairie Supabase n'a pas pu se charger (hors connexion), l'appli marche quand même en local.
const client = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_CLE) : null;

// Les infos du foyer de cet appareil : { id, code, version }
const CLE_CLOUD = "journal-de-quetes-foyer";
let foyer = JSON.parse(localStorage.getItem(CLE_CLOUD) || "null");
function sauverFoyer() {
  if (foyer) localStorage.setItem(CLE_CLOUD, JSON.stringify(foyer));
  else localStorage.removeItem(CLE_CLOUD);
}

// Ces réglages restent propres à chaque appareil (on ne les partage pas).
const CHAMPS_LOCAUX = ["themeActif", "joueurActif", "derniereNotif"];
function partageable(d) {
  const copie = { ...d };
  for (const c of CHAMPS_LOCAUX) delete copie[c];
  return copie;
}

// Comparer deux journaux sans tenir compte de l'ordre des champs
// (la base range les champs à sa façon, donc on les trie avant de comparer)
function empreinte(o) {
  if (Array.isArray(o)) return "[" + o.map(empreinte).join(",") + "]";
  if (o && typeof o === "object") {
    return "{" + Object.keys(o).sort().filter(k => o[k] !== undefined)
      .map(k => JSON.stringify(k) + ":" + empreinte(o[k])).join(",") + "}";
  }
  return JSON.stringify(o);
}

// ----- 1. La fusion de deux journaux -----
function fusionner(local, distant) {
  const res = { ...distant, ...local }; // les réglages locaux gagnent

  // Les suppressions : on garde la plus récente pour chaque quête
  const supp = { ...(distant.supprimees || {}) };
  for (const [id, t] of Object.entries(local.supprimees || {})) supp[id] = Math.max(t, supp[id] || 0);
  res.supprimees = supp;

  // Les quêtes : pour chaque identifiant, la version la plus récente
  const parId = new Map();
  for (const q of [...(distant.quetes || []), ...(local.quetes || [])]) {
    const deja = parId.get(q.id);
    if (!deja || (q.maj || 0) >= (deja.maj || 0)) parId.set(q.id, q);
  }
  res.quetes = [...parId.values()].filter(q => !(supp[q.id] >= (q.maj || 0)))
    .sort((a, b) => String(a.id).localeCompare(String(b.id))); // même ordre sur tous les appareils

  // Les joueurs : le nom le plus récent
  res.joueurs = { ...(distant.joueurs || {}) };
  for (const [id, j] of Object.entries(local.joueurs || {})) {
    if (!res.joueurs[id] || (j.maj || 0) >= (res.joueurs[id].maj || 0)) res.joueurs[id] = j;
  }

  // Le journal des gains : on additionne tout, sans doublon
  const gains = new Map();
  for (const g of [...(distant.journal || []), ...(local.journal || [])]) gains.set(g.id, g);
  res.journal = [...gains.values()].sort((a, b) => String(a.id).localeCompare(String(b.id)));

  res.corveesChargees = true;
  return res;
}

// ----- 2. La synchro -----
let etatSynchro = "local"; // "local" | "ok" | "encours" | "erreur"
let minuteur = null;

function planifierSynchro() {
  if (!foyer || !client) return;
  clearTimeout(minuteur);
  minuteur = setTimeout(synchroniser, 1500); // on attend 1,5 s pour regrouper les clics
  afficherNuage("encours");
}

let synchroEnCours = false;
async function synchroniser() {
  if (!foyer || !client || synchroEnCours) return;
  synchroEnCours = true;
  afficherNuage("encours");
  try {
    for (let essai = 0; essai < 4; essai++) {
      const { data, error } = await client.from("foyers").select("donnees, version").eq("id", foyer.id).single();
      if (error) throw error;
      const fusion = fusionner(donnees, data.donnees || {});
      const aEnvoyer = partageable(fusion);
      const rien = empreinte(aEnvoyer) === empreinte(partageable(data.donnees || {}));
      if (rien) {
        appliquer(fusion, data.version);
        break;
      }
      const rep = await client.rpc("enregistrer", { f: foyer.id, nouvelles: aEnvoyer, version_attendue: data.version });
      if (rep.error) throw rep.error;
      if (rep.data !== null) {           // c'est enregistré
        appliquer(fusion, rep.data);
        break;
      }
      // sinon : quelqu'un a enregistré juste avant nous, on recommence la fusion
    }
    afficherNuage("ok");
  } catch (e) {
    console.warn("Synchro impossible pour l'instant :", e.message || e);
    afficherNuage("erreur");
  } finally {
    synchroEnCours = false;
  }
}

function appliquer(fusion, version) {
  donnees = fusion;
  foyer.version = version;
  foyer.derniere = Date.now();
  sauverFoyer();
  localStorage.setItem(CLE, JSON.stringify(donnees)); // sans relancer de synchro
  afficher();
}

// Être prévenu en direct quand un autre appareil change le journal
let canal = null;
async function ecouter() {
  if (!foyer || !client || canal) return;
  // On donne au "temps réel" la connexion de cet appareil (sinon la base refuse de nous prévenir)
  const { data } = await client.auth.getSession();
  if (!data.session) return;
  client.realtime.setAuth(data.session.access_token);
  if (canal) return;
  canal = client.channel("foyer-" + foyer.id)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "foyers", filter: "id=eq." + foyer.id },
        (p) => { if (p.new.version !== foyer.version) synchroniser(); })
    .subscribe();
}

// On resynchronise quand on revient sur l'appli ou quand Internet revient
document.addEventListener("visibilitychange", () => { if (!document.hidden) synchroniser(); });
window.addEventListener("online", synchroniser);

// ----- 3. Se connecter (sans e-mail : un compte "anonyme" propre à cet appareil) -----
async function connecter() {
  const { data } = await client.auth.getSession();
  if (data.session) return;
  const { error } = await client.auth.signInAnonymously();
  if (error) throw error;
}

async function creerFoyer() {
  await connecter();
  const { data, error } = await client.rpc("creer_foyer", { donnees_depart: partageable(donnees) });
  if (error) throw error;
  foyer = { id: data.id, code: data.code, version: data.version, derniere: Date.now() };
  sauverFoyer();
  await ecouter();
}

async function rejoindreFoyer(code) {
  await connecter();
  const { data, error } = await client.rpc("rejoindre_foyer", { code_saisi: code });
  if (error) throw error;
  // On prend le journal du foyer à la place de celui de cet appareil (pour éviter les doublons)
  const locaux = { themeActif: donnees.themeActif, derniereNotif: donnees.derniereNotif };
  donnees = { ...data.donnees, ...locaux, joueurActif: "j2" };
  foyer = { id: data.id, code: data.code, version: data.version, derniere: Date.now() };
  sauverFoyer();
  localStorage.setItem(CLE, JSON.stringify(donnees));
  await ecouter();
  afficher();
}

async function quitterFoyer() {
  if (foyer && client) await client.rpc("quitter_foyer", { f: foyer.id });
  if (canal) { client.removeChannel(canal); canal = null; }
  foyer = null;
  sauverFoyer();
  afficherNuage("local");
}

// ----- 4. L'affichage : le petit nuage et son panneau -----
function joliCode(c) { return c.slice(0, 4) + "-" + c.slice(4, 8) + "-" + c.slice(8); }

function afficherNuage(etat) {
  etatSynchro = foyer ? etat : "local";
  const b = document.getElementById("nuage");
  b.textContent = { local: "☁️", ok: "☁️✓", encours: "☁️…", erreur: "☁️!" }[etatSynchro];
  b.className = "nuage-" + etatSynchro;
}

function ouvrirPanneau() {
  const p = document.getElementById("panneau-cloud");
  const corps = document.getElementById("panneau-corps");
  if (!client) {
    corps.innerHTML = `<p>Pas de connexion à Internet : la synchro reviendra toute seule.</p>`;
  } else if (!foyer) {
    corps.innerHTML = `
      <p>Partage ton journal avec ton foyer : tout ce qui est coché sur un appareil apparaît sur les autres.</p>
      <button id="btn-creer">🏠 Créer notre foyer</button>
      <p class="petit">Le journal de cet appareil sera envoyé dans le foyer.</p>
      <hr>
      <p>Tu as déjà un code ?</p>
      <input id="champ-code" placeholder="ABCD-EFGH-JK" autocomplete="off" autocapitalize="characters">
      <button id="btn-rejoindre">🔑 Rejoindre</button>
      <p class="petit">⚠️ Le journal du foyer remplacera celui de cet appareil.</p>
      <p id="panneau-erreur"></p>`;
    document.getElementById("btn-creer").onclick = () => action(creerFoyer);
    document.getElementById("btn-rejoindre").onclick = () => {
      const code = document.getElementById("champ-code").value;
      if (!confirm("Remplacer le journal de cet appareil par celui du foyer ?")) return;
      action(() => rejoindreFoyer(code));
    };
  } else {
    const quand = foyer.derniere ? new Date(foyer.derniere).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—";
    corps.innerHTML = `
      <p>🏠 Foyer connecté. Code à donner aux autres appareils :</p>
      <p class="code-foyer">${joliCode(foyer.code)}</p>
      <p class="petit">Dernière synchro : ${quand}</p>
      <button id="btn-synchro">🔄 Synchroniser maintenant</button>
      <button id="btn-quitter" class="discret">Quitter le foyer</button>
      <p id="panneau-erreur"></p>`;
    document.getElementById("btn-synchro").onclick = () => action(synchroniser);
    document.getElementById("btn-quitter").onclick = () => {
      if (!confirm("Quitter le foyer ? Ton journal reste sur cet appareil, mais n'est plus partagé.")) return;
      action(quitterFoyer);
    };
  }
  p.classList.remove("cache");
}

async function action(f) {
  const err = document.getElementById("panneau-erreur");
  if (err) err.textContent = "⏳ …";
  try {
    await f();
    ouvrirPanneau(); // on réaffiche le panneau à jour
  } catch (e) {
    const msg = String(e.message || e);
    const traduit = msg.includes("code inconnu") ? "Ce code n'existe pas. Vérifie les lettres."
      : msg.includes("Anonymous sign-ins are disabled") ? "La connexion anonyme n'est pas encore activée dans Supabase."
      : msg.includes("Could not find the function") ? "La base n'est pas encore installée (script SQL à lancer)."
      : "Oups : " + msg;
    const zone = document.getElementById("panneau-erreur");
    if (zone) zone.textContent = traduit;
  }
}

document.getElementById("nuage").addEventListener("click", ouvrirPanneau);
document.getElementById("fermer-panneau").addEventListener("click", () =>
  document.getElementById("panneau-cloud").classList.add("cache"));

// ----- 5. Au démarrage -----
afficherNuage("local");
if (foyer) { ecouter(); synchroniser(); }
