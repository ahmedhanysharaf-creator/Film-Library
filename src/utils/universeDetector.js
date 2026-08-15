// Intelligent detector for Marvel and DC media entries (Movies & Series)

const MARVEL_KEYWORDS = [
  "marvel", "mcu", "avengers", "iron man", "captain america", "thor", "spider-man", "spiderman",
  "black panther", "guardians of the galaxy", "doctor strange", "dr. strange", "ant-man", "antman",
  "deadpool", "wolverine", "x-men", "x men", "hulk", "incredible hulk", "black widow", "shang-chi",
  "shang chi", "eternals", "loki", "wandavision", "moon knight", "daredevil", "punisher", "blade",
  "fantastic four", "fantastic 4", "venom", "morbius", "kraven", "captain marvel", "hawkeye",
  "secret invasion", "ms. marvel", "she-hulk", "what if", "echo", "agatha", "defenders",
  "jessica jones", "luke cage", "iron fist", "agent carter", "agents of s.h.i.e.l.d",
  "agents of shield", "inhumans", "runaways", "cloak & dagger", "stan lee", "multiverse of madness",
  "quantumania", "wakanda forever", "no way home", "far from home", "homecoming", "infinity war",
  "endgame", "age of ultron", "civil war", "ragnarok", "love and thunder", "winter soldier",
  "the first avenger", "dark world", "deadpool & wolverine", "thunderbolts", "daredevil: born again",
  "secret wars", "the marvels", "ghost rider", "electra", "x-force", "new mutants", "madame web"
];

const DC_KEYWORDS = [
  "dc comics", "dceu", "dcu", "batman", "superman", "wonder woman", "justice league", "the flash",
  "aquaman", "joker", "shazam", "green lantern", "suicide squad", "the suicide squad", "peacemaker",
  "harley quinn", "birds of prey", "arrow", "supergirl", "gotham", "titans", "watchmen", "sandman",
  "lucifer", "black adam", "blue beetle", "cyborg", "man of steel", "batman v superman", "dawn of justice",
  "dark knight", "batman begins", "dark knight rises", "batman & robin", "batman returns", "batman forever",
  "zack snyder's justice league", "snyder cut", "batgirl", "pennyworth", "doom patrol", "swamp thing",
  "constantine", "v for vendetta", "superman legacy", "the batman", "penguin", "smallville", "krypton",
  "legends of tomorrow", "batwoman", "stargirl", "young justice", "batman animated", "superman animated",
  "catwoman", "robin", "nightwing", "red hood", "deathstroke", "arkham", "the brave and the bold"
];

export const isMarvelItem = (item) => {
  if (!item) return false;
  const universe = (item.universe || "").toLowerCase();
  if (universe === "marvel" || universe === "mcu") return true;
  
  const franchise = (item.franchise || "").toLowerCase();
  if (franchise.includes("marvel") || franchise.includes("mcu") || franchise.includes("avengers")) return true;

  const title = (item.title || "").toLowerCase();
  const tags = (item.tags || []).map((t) => String(t).toLowerCase());
  const studios = (item.production_companies || []).map((p) => (p.name || String(p)).toLowerCase());

  if (tags.some((t) => t.includes("marvel") || t.includes("mcu") || t.includes("avengers") || t.includes("spider-man"))) {
    return true;
  }

  if (studios.some((s) => s.includes("marvel"))) {
    return true;
  }

  return MARVEL_KEYWORDS.some((kw) => {
    return title.includes(kw);
  });
};

export const isDcItem = (item) => {
  if (!item) return false;
  const universe = (item.universe || "").toLowerCase();
  if (universe === "dc" || universe === "dceu" || universe === "dcu") return true;

  const franchise = (item.franchise || "").toLowerCase();
  if (franchise.includes("dc") || franchise.includes("dceu") || franchise.includes("batman") || franchise.includes("superman")) return true;

  const title = (item.title || "").toLowerCase();
  const tags = (item.tags || []).map((t) => String(t).toLowerCase());
  const studios = (item.production_companies || []).map((p) => (p.name || String(p)).toLowerCase());

  if (tags.some((t) => t.includes("dc comics") || t.includes("dceu") || t.includes("batman") || t.includes("superman") || t.includes("justice league"))) {
    return true;
  }

  if (studios.some((s) => s.includes("dc comics") || s.includes("dc entertainment") || s.includes("dc studios") || s.includes("dc films"))) {
    return true;
  }

  return DC_KEYWORDS.some((kw) => {
    return title.includes(kw);
  });
};

export const detectUniverse = (item) => {
  if (isMarvelItem(item)) return "marvel";
  if (isDcItem(item)) return "dc";
  return null;
};
