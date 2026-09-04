import { describe, it, expect } from "vitest";
import {
  safeImageUrl,
  safeSiteUrl,
  safePhone,
  readCandidates,
  readOpeningHours,
  readReviews,
  readPhotos,
  buildDraft,
  cityFromAddress,
  suggestCopy,
  type ImportDraft,
} from "./google-import";

/**
 * Import d'une fiche Google.
 *
 * Tout ce qui entre ici vient d'un tiers, qui reprend lui-même du texte écrit
 * par des inconnus. Le fichier n'a donc pas pour rôle de vérifier qu'un cas
 * nominal fonctionne, mais que rien d'anormal ne traverse : une adresse
 * d'image qui ne serait pas chez Google, un avis sans texte, un champ absent
 * transformé en phrase inventée.
 */

describe("adresses d'images", () => {
  it("accepte les domaines d'images Google", () => {
    for (const ok of [
      "https://lh3.googleusercontent.com/p/abc=w400",
      "https://lh5.googleusercontent.com/x",
      "https://streetviewpixels-pa.googleapis.com/v1/thumbnail?x=1",
    ]) {
      expect(safeImageUrl(ok), ok).toBe(ok);
    }
  });

  it("refuse tout autre domaine, protocole ou forme", () => {
    // C'est NOTRE serveur qui ira chercher ces adresses : une seule qui
    // s'échappe, et il peut être dirigé vers une machine interne.
    for (const ko of [
      "https://evil.example/p.png",
      "http://lh3.googleusercontent.com/p",
      "https://lh3.googleusercontent.com.evil.example/p",
      "file:///etc/passwd",
      "http://169.254.169.254/latest/meta-data/",
      "https://localhost/x",
      "javascript:alert(1)",
      "",
      null,
      42,
    ]) {
      expect(safeImageUrl(ko), String(ko)).toBeNull();
    }
  });
});

describe("adresse de site web", () => {
  it("n'accepte que http et https", () => {
    expect(safeSiteUrl("https://coach.fr")).toBe("https://coach.fr/");
    expect(safeSiteUrl("javascript:alert(1)")).toBeNull();
    expect(safeSiteUrl("data:text/html,<script>")).toBeNull();
    expect(safeSiteUrl("pas une url")).toBeNull();
  });
});

describe("téléphone", () => {
  it("garde un numéro lisible et retire le reste", () => {
    expect(safePhone("+33 1 42 68 53 00")).toBe("+33 1 42 68 53 00");
    expect(safePhone(" 01.42.68.53.00 (bureau) ")).toBe("01.42.68.53.00 ()");
  });

  it("refuse ce qui n'a pas assez de chiffres pour être un numéro", () => {
    expect(safePhone("appelez-nous")).toBeNull();
    expect(safePhone("12 34")).toBeNull();
    expect(safePhone("")).toBeNull();
  });
});

describe("résultats de recherche", () => {
  it("écarte une fiche sans identifiant ou sans nom", () => {
    // Sans data_id on ne peut pas aller chercher le détail : la proposer
    // reviendrait à afficher un bouton incapable de faire quoi que ce soit.
    const out = readCandidates([
      { title: "Sans id" },
      { data_id: "0x1", title: "Bonne fiche", address: "12 rue X, 75011 Paris", rating: 4.8, reviews: 132, type: "Salle de sport" },
      { data_id: "0x2" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ dataId: "0x1", name: "Bonne fiche", rating: 4.8, reviewsCount: 132 });
  });

  it("ne propose jamais deux fois la même fiche", () => {
    const out = readCandidates([
      { data_id: "0x1", title: "A" },
      { data_id: "0x1", title: "A (doublon)" },
    ]);
    expect(out).toHaveLength(1);
  });

  it("borne le nombre de propositions", () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ data_id: `0x${i}`, title: `Salle ${i}` }));
    expect(readCandidates(many, 5)).toHaveLength(5);
  });

  it("survit à une réponse qui n'est pas une liste", () => {
    for (const rien of [null, undefined, {}, "", 0]) expect(readCandidates(rien)).toEqual([]);
  });

  it("refuse une note hors échelle plutôt que de l'afficher", () => {
    expect(readCandidates([{ data_id: "0x1", title: "A", rating: 12 }])[0].rating).toBeNull();
  });
});

describe("avis", () => {
  it("ne garde que les avis qui ont un auteur ET un texte", () => {
    // Une note sans commentaire n'est pas un témoignage : il n'y a rien à
    // afficher sur la page.
    const out = readReviews([
      { user: { name: "Marie" }, rating: 5, snippet: "Super accueil.", date: "il y a 2 mois" },
      { user: { name: "Sans texte" }, rating: 5 },
      { rating: 5, snippet: "Sans auteur" },
      { user: "pas un objet", snippet: "x" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({ author: "Marie", rating: 5, body: "Super accueil.", publishedLabel: "il y a 2 mois" });
  });

  it("préfère le texte complet au texte tronqué", () => {
    const out = readReviews([{ user: { name: "A" }, snippet: "Début…", extracted_snippet: "Début et suite." }]);
    expect(out[0].body).toBe("Début et suite.");
  });

  it("nettoie les caractères invisibles collés par les auteurs", () => {
    const out = readReviews([{ user: { name: "A" }, snippet: "Très bien​ !" }]);
    expect(out[0].body).toBe("Très bien !");
  });

  it("borne la longueur d'un avis", () => {
    const out = readReviews([{ user: { name: "A" }, snippet: "x".repeat(2000) }]);
    expect(out[0].body.length).toBe(600);
  });
});

describe("photos", () => {
  it("ne retient que des images Google, sans doublon", () => {
    const out = readPhotos([
      { image: "https://lh3.googleusercontent.com/a" },
      { image: "https://lh3.googleusercontent.com/a" },
      { image: "https://evil.example/b.png" },
      { thumbnail: "https://lh5.googleusercontent.com/c" },
      { image: null },
    ]);
    expect(out).toEqual(["https://lh3.googleusercontent.com/a", "https://lh5.googleusercontent.com/c"]);
  });
});

describe("horaires", () => {
  it("recopie ce que Google écrit, sans interpréter", () => {
    const out = readOpeningHours([{ lundi: "09:00-19:00" }, { mardi: "Ouvert 24h/24" }]);
    expect(out).toEqual([
      { day: "lundi", hours: "09:00-19:00" },
      { day: "mardi", hours: "Ouvert 24h/24" },
    ]);
  });

  it("ne dépasse jamais sept jours", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ [`j${i}`]: "09:00-19:00" }));
    expect(readOpeningHours(many)).toHaveLength(7);
  });
});

describe("brouillon complet", () => {
  const place = {
    title: "Studio Forme",
    address: "12 rue des Lilas, 75011 Paris, France",
    phone: "+33 1 42 68 53 00",
    website: "https://studio-forme.fr",
    type: "Salle de sport",
    description: "Une salle à taille humaine.",
    rating: 4.8,
    reviews: 132,
  };

  it("assemble ce que la fiche dit, et rien d'autre", () => {
    const d = buildDraft(place, { dataId: "0x1" })!;
    expect(d).toMatchObject({
      dataId: "0x1",
      name: "Studio Forme",
      phone: "+33 1 42 68 53 00",
      website: "https://studio-forme.fr/",
      rating: 4.8,
      reviewsCount: 132,
    });
    expect(d.photos).toEqual([]);
    expect(d.reviews).toEqual([]);
  });

  it("refuse une fiche sans nom", () => {
    // Mieux vaut le dire tout de suite que proposer un brouillon vide.
    expect(buildDraft({ address: "x" }, { dataId: "0x1" })).toBeNull();
  });

  it("laisse vides les champs absents au lieu de les inventer", () => {
    const d = buildDraft({ title: "X" }, { dataId: "0x1" })!;
    expect(d.address).toBeNull();
    expect(d.phone).toBeNull();
    expect(d.website).toBeNull();
    expect(d.description).toBeNull();
  });

  it("écarte un site web qui n'est pas une adresse http", () => {
    const d = buildDraft({ ...place, website: "javascript:alert(1)" }, { dataId: "0x1" })!;
    expect(d.website).toBeNull();
  });
});

describe("textes proposés", () => {
  function draft(p: Partial<ImportDraft> = {}): ImportDraft {
    return {
      dataId: "0x1", name: "Studio Forme", address: null, phone: null, website: null,
      category: null, description: null, rating: null, reviewsCount: null,
      openingHours: [], photos: [], reviews: [], ...p,
    };
  }

  it("trouve la ville derrière le code postal", () => {
    expect(cityFromAddress("12 rue des Lilas, 75011 Paris, France")).toBe("Paris");
    expect(cityFromAddress("5 Grand Rue, 69002 Lyon")).toBe("Lyon");
  });

  it("se rabat sur l'avant-dernier segment, le dernier étant le pays", () => {
    expect(cityFromAddress("Chemin du Lac, Annecy, France")).toBe("Annecy");
  });

  it("ne devine pas de ville quand l'adresse manque", () => {
    expect(cityFromAddress(null)).toBeNull();
    expect(cityFromAddress("")).toBeNull();
  });

  it("compose une accroche à partir de ce que la fiche dit", () => {
    const c = suggestCopy(draft({ category: "Salle de sport", address: "1 rue X, 75011 Paris" }));
    expect(c.headline).toBe("Studio Forme");
    expect(c.tagline).toBe("Salle de sport à Paris");
  });

  it("n'invente aucune accroche quand la fiche ne dit rien", () => {
    // Une phrase générique vaudrait moins que rien : elle donne l'impression
    // d'un site laissé à moitié fait.
    expect(suggestCopy(draft()).tagline).toBeNull();
  });

  it("se contente de la catégorie, ou de la ville, quand l'autre manque", () => {
    expect(suggestCopy(draft({ category: "Coach sportif" })).tagline).toBe("Coach sportif");
    expect(suggestCopy(draft({ address: "1 rue X, 69002 Lyon" })).tagline).toBe("Lyon");
  });

  it("reprend la description de la fiche pour la section « à propos »", () => {
    expect(suggestCopy(draft({ description: "Une salle à taille humaine." })).aboutText).toBe(
      "Une salle à taille humaine.",
    );
  });
});
