// Étapes de préparation et astuces, une entrée par recette du catalogue.
//
// POURQUOI UN FICHIER SÉPARÉ. Le catalogue (aliments, ingrédients, macros) est
// lu par l'écran nutrition du client, donc envoyé au navigateur : il sert à
// composer la journée type ET la liste de courses, qui doivent être calculées
// à chaque changement de jour sans aller-retour serveur. Les étapes, elles, ne
// servent qu'à la fiche recette, rendue côté serveur. Les garder ici évite
// d'expédier plusieurs centaines de lignes de texte de cuisine dans le bundle
// mobile de tous les clients.
//
// Les étapes ne citent JAMAIS de quantité : elles sont écrites une fois pour
// toutes alors que les quantités, elles, changent d'un client à l'autre. Une
// étape qui dirait « verse 80 g de riz » mentirait à la première mise à
// l'échelle. Les épices, l'ail, le sel, le poivre et les herbes sont cités
// librement : ce sont des fonds de placard, ils ne pèsent rien dans les macros
// et n'ont pas leur place dans la liste de courses.

export interface RecipeSteps {
  etapes: string[];
  astuce: string;
}

export const RECIPE_STEPS: Record<string, RecipeSteps> = {
  "pdj-avoine-skyr": {
    etapes: [
      "Verse les flocons d'avoine dans une casserole avec deux fois leur volume d'eau ou de lait.",
      "Chauffe à feu moyen 4 à 5 minutes en remuant, jusqu'à ce que le mélange épaississe.",
      "Hors du feu, laisse tiédir 2 minutes puis incorpore le skyr : ajouté trop chaud, il se sépare.",
      "Dépose les fruits rouges et le beurre de cacahuète sur le dessus.",
    ],
    astuce: "Prépare-le la veille au frigo, sans cuisson : l'avoine s'attendrit toute seule dans le skyr.",
  },
  "pdj-omelette-pain": {
    etapes: [
      "Fais revenir les champignons émincés à feu vif dans un filet d'huile, jusqu'à ce qu'ils rendent leur eau.",
      "Bats les œufs à la fourchette avec du sel et du poivre.",
      "Baisse le feu, verse les œufs et laisse prendre sans remuer 2 à 3 minutes.",
      "Replie l'omelette en deux, sers-la avec le pain grillé.",
    ],
    astuce: "Feu doux et couvercle : l'omelette reste moelleuse au lieu de sécher.",
  },
  "pdj-pancakes": {
    etapes: [
      "Écrase la banane à la fourchette dans un saladier.",
      "Ajoute les œufs, le fromage blanc et la farine, mélange jusqu'à obtenir une pâte lisse et épaisse.",
      "Fais chauffer une poêle antiadhésive à feu moyen, sans matière grasse.",
      "Verse de petites louches, laisse cuire 2 minutes jusqu'aux premières bulles, puis retourne 1 minute.",
      "Empile les pancakes et nappe de sirop d'érable.",
    ],
    astuce: "La pâte doit tomber lentement de la louche. Trop liquide, ajoute une cuillère de farine.",
  },
  "pdj-bowl-coco": {
    etapes: [
      "Réchauffe le riz déjà cuit avec le lait de coco à feu doux, 3 à 4 minutes.",
      "Hors du feu, laisse tiédir puis incorpore la whey en fouettant pour éviter les grumeaux.",
      "Verse dans un bol, ajoute la banane en rondelles.",
      "Parsème de graines de courge pour le croquant.",
    ],
    astuce: "Le riz de la veille convient parfaitement : c'est même lui qui donne la meilleure texture.",
  },
  "pdj-toast-avocat": {
    etapes: [
      "Porte une casserole d'eau à frémissement avec un filet de vinaigre, sans jamais la faire bouillir.",
      "Casse chaque œuf dans un bol, fais-le glisser dans l'eau et compte 3 minutes.",
      "Pendant ce temps, écrase l'avocat avec le jus de citron, du sel et du poivre.",
      "Étale sur le pain grillé, dépose les œufs pochés et les tomates en rondelles.",
    ],
    astuce: "Un œuf bien frais tient tout seul en pochant. Sinon, entoure-le d'un film alimentaire huilé.",
  },
  "pdj-skyr-express": {
    etapes: [
      "Verse le skyr dans un bol.",
      "Ajoute les flocons d'avoine crus et mélange.",
      "Nappe de miel et parsème d'amandes concassées.",
    ],
    astuce: "Préparé la veille dans un bocal, il se transporte et se mange froid au bureau.",
  },
  "pdj-tofu-brouille": {
    etapes: [
      "Égoutte le tofu et écrase-le grossièrement à la fourchette.",
      "Fais revenir les poivrons en dés 4 minutes dans l'huile chaude.",
      "Ajoute le tofu, du curcuma, du sel et du poivre, poursuis 3 minutes en remuant.",
      "Sers avec le pain grillé.",
    ],
    astuce: "Une pincée de curcuma donne la couleur des œufs brouillés, un peu de levure maltée en donne le goût.",
  },
  "pdj-porridge-chia": {
    etapes: [
      "Mélange les graines de chia, les flocons d'avoine, le fromage blanc et le cacao dans un bocal.",
      "Laisse au frais au moins 2 heures, idéalement toute la nuit : les graines gonflent et prennent en gel.",
      "Au moment de servir, ajoute la banane en rondelles et le miel.",
    ],
    astuce: "Prépare trois bocaux d'un coup le dimanche soir : trois petits-déjeuners réglés d'avance.",
  },
  "pdj-cottage-fruits": {
    etapes: [
      "Répartis le cottage cheese dans un bol.",
      "Ajoute les fraises coupées en deux et les cerneaux de noix.",
      "Sers avec les galettes de riz à côté, à tremper.",
    ],
    astuce: "Un tour de moulin à poivre sur le cottage : ça relève le goût sans ajouter une calorie.",
  },
  "pdj-wrap-jambon": {
    etapes: [
      "Bats les œufs et fais-les cuire en omelette fine dans une poêle huilée.",
      "Réchauffe la galette 20 secondes à la poêle sèche pour l'assouplir.",
      "Dépose l'omelette, le jambon et la salade, roule serré.",
      "Coupe en deux en biais.",
    ],
    astuce: "Roule le wrap dans du papier cuisson : il se tient et se mange d'une main.",
  },
  "dej-poulet-riz": {
    etapes: [
      "Sors le poulet du frigo 10 minutes avant : une viande froide cuit mal à cœur.",
      "Saisis-le à feu vif 3 minutes par face dans un filet d'huile, puis baisse le feu et couvre 5 minutes.",
      "Fais revenir les courgettes en rondelles à feu vif dans la même poêle.",
      "Laisse reposer la viande 3 minutes avant de la trancher, sers avec le riz.",
    ],
    astuce: "Le repos après cuisson n'est pas un détail : c'est lui qui garde le jus dans la viande.",
  },
  "dej-boeuf-patate": {
    etapes: [
      "Préchauffe le four à 200 °C. Coupe la patate douce en cubes, mélange-les avec l'huile, sel et paprika.",
      "Enfourne 25 minutes en remuant à mi-cuisson.",
      "Fais cuire les haricots verts 8 minutes à l'eau bouillante salée, puis égoutte.",
      "Poêle le bœuf haché 5 minutes à feu vif en l'écrasant à la spatule.",
      "Assemble dans l'assiette.",
    ],
    astuce: "Ne surcharge pas la plaque : des cubes serrés cuisent à la vapeur au lieu de rôtir.",
  },
  "dej-cabillaud-quinoa": {
    etapes: [
      "Préchauffe le four à 180 °C.",
      "Dépose le cabillaud sur une feuille de papier cuisson, arrose d'huile et de jus de citron, sale et poivre.",
      "Referme la papillote hermétiquement et enfourne 15 minutes.",
      "Fais rôtir les poivrons en lanières à la poêle pendant ce temps.",
      "Sers le poisson dans sa papillote ouverte à table, avec le quinoa.",
    ],
    astuce: "Le poisson est cuit quand la chair se détache en lamelles sous la fourchette, pas avant.",
  },
  "dej-dahl": {
    etapes: [
      "Fais revenir l'oignon émincé 5 minutes, ajoute curry, cumin et gingembre, laisse torréfier 30 secondes.",
      "Ajoute les lentilles corail rincées et trois fois leur volume d'eau.",
      "Laisse mijoter 15 à 18 minutes à couvert, en remuant de temps en temps.",
      "Verse le lait de coco et les épinards, poursuis 3 minutes jusqu'à ce qu'ils tombent.",
      "Sers sur le riz.",
    ],
    astuce: "Les épices se réveillent dans le gras chaud avant l'eau. Les jeter dans le liquide leur enlève tout.",
  },
  "dej-tofu-sarrasin": {
    etapes: [
      "Presse le tofu 10 minutes entre deux feuilles de papier absorbant, puis coupe-le en cubes.",
      "Saisis-le à feu vif dans l'huile sans le remuer trop souvent, jusqu'à ce que chaque face dore.",
      "Déglace avec la sauce soja hors du feu.",
      "Fais cuire le brocoli 5 minutes à la vapeur, il doit rester croquant.",
      "Dresse sur le sarrasin.",
    ],
    astuce: "Un tofu qu'on remue sans arrêt ne dore jamais. Laisse-le tranquille deux minutes par face.",
  },
  "dej-dinde-pates": {
    etapes: [
      "Fais cuire les pâtes dans un grand volume d'eau bien salée, une minute de moins que le paquet.",
      "Coupe la dinde en lanières, saisis-la 4 minutes à feu vif.",
      "Ajoute les tomates concassées et laisse réduire 5 minutes.",
      "Verse les pâtes égouttées dans la poêle avec une louche d'eau de cuisson, mélange 1 minute.",
      "Râpe le parmesan par-dessus.",
    ],
    astuce: "L'eau de cuisson des pâtes lie la sauce mieux que n'importe quelle crème.",
  },
  "dej-buddha-pois-chiches": {
    etapes: [
      "Préchauffe le four à 200 °C, coupe la patate douce en cubes et enfourne 25 minutes.",
      "Ajoute les pois chiches égouttés sur la plaque les 10 dernières minutes, avec du paprika.",
      "Prépare une sauce avec le jus de citron, de l'huile, du sel et du poivre.",
      "Dresse la salade au fond du bol, puis les légumes tièdes, l'avocat en tranches, et la sauce.",
    ],
    astuce: "Sèche bien les pois chiches avant le four : c'est la seule façon qu'ils croustillent.",
  },
  "dej-thon-boulgour": {
    etapes: [
      "Verse le boulgour dans un saladier, couvre d'eau bouillante et laisse gonfler 10 minutes à couvert.",
      "Égrène-le à la fourchette.",
      "Ajoute le thon égoutté, le concombre et les tomates en dés.",
      "Assaisonne avec l'huile, le citron, du sel, du poivre et des herbes fraîches.",
    ],
    astuce: "Elle se bonifie au frigo : prépare-la la veille pour un déjeuner à emporter.",
  },
  "dej-poulet-wrap": {
    etapes: [
      "Coupe le poulet en lanières et poêle-le 5 minutes à feu vif avec du paprika.",
      "Réchauffe les galettes 20 secondes par face à la poêle sèche.",
      "Étale le houmous, garnis de poulet, salade et tomates.",
      "Roule serré et coupe en deux.",
    ],
    astuce: "Laisse une marge de deux doigts en bas et replie-la avant de rouler : rien ne tombe.",
  },
  "dej-crevettes-riz": {
    etapes: [
      "Fais chauffer une grande poêle à feu très vif avec l'huile.",
      "Saisis les crevettes 2 minutes, réserve-les : au-delà, elles deviennent caoutchouteuses.",
      "Verse le riz froid et les petits pois, fais sauter 3 minutes sans trop remuer.",
      "Pousse le riz sur un côté, casse l'œuf dans l'espace libre et brouille-le, puis mélange.",
      "Remets les crevettes, déglace à la sauce soja, sers aussitôt.",
    ],
    astuce: "Le riz de la veille, froid et sec, est le seul qui saute vraiment. Le riz frais colle.",
  },
  "dej-seitan-poelee": {
    etapes: [
      "Fais précuire les pommes de terre en cubes 8 minutes à l'eau bouillante, puis égoutte.",
      "Dans une grande poêle, fais dorer l'oignon et les carottes en rondelles 6 minutes.",
      "Ajoute les pommes de terre et laisse colorer sans remuer 4 minutes.",
      "Ajoute le seitan en tranches, thym et laurier, poursuis 4 minutes.",
    ],
    astuce: "Précuire les pommes de terre évite le duo classique : brûlées dehors, crues dedans.",
  },
  "dej-omelette-pois-chiches": {
    etapes: [
      "Mélange les pois chiches égouttés, la salade et la feta émiettée, assaisonne à l'huile et au citron.",
      "Bats les œufs avec du sel, du poivre et des herbes.",
      "Cuis l'omelette à feu doux dans une poêle légèrement huilée, 4 minutes environ.",
      "Roule-la et sers-la tiède à côté de la salade.",
    ],
    astuce: "Feu doux du début à la fin : une omelette qui grésille fort devient sèche et caoutchouteuse.",
  },
  "din-saumon-patate": {
    etapes: [
      "Préchauffe le four à 200 °C et enfourne la patate douce en cubes 25 minutes.",
      "Pose le saumon peau vers le bas sur la plaque les 12 dernières minutes.",
      "Fais tomber les épinards 2 minutes à la poêle avec l'ail écrasé.",
      "Sale, poivre, sers avec un trait de citron.",
    ],
    astuce: "Le saumon est à point quand le centre reste légèrement translucide. Opaque partout, il est déjà sec.",
  },
  "din-dinde-puree": {
    etapes: [
      "Fais cuire les pommes de terre et les carottes en morceaux 20 minutes à l'eau salée.",
      "Écrase-les au presse-purée avec un peu d'eau de cuisson et l'huile, sale et muscade.",
      "Poêle l'escalope de dinde 4 minutes par face à feu moyen.",
      "Laisse-la reposer 2 minutes avant de trancher.",
    ],
    astuce: "Jamais de mixeur pour une purée de pomme de terre : elle devient élastique. Le presse-purée suffit.",
  },
  "din-curry-legumes": {
    etapes: [
      "Fais revenir l'oignon 5 minutes, ajoute la pâte de curry et laisse chauffer 30 secondes.",
      "Ajoute le chou-fleur en petits bouquets et un verre d'eau, couvre 10 minutes.",
      "Verse les pois chiches et le lait de coco, laisse mijoter 8 minutes à découvert.",
      "Rectifie le sel, sers sur le riz avec de la coriandre.",
    ],
    astuce: "Le curry est meilleur réchauffé le lendemain : les épices ont eu la nuit pour se diffuser.",
  },
  "din-cabillaud-polenta": {
    etapes: [
      "Prépare la polenta selon le paquet, en fouettant pour éviter les grumeaux.",
      "Hors du feu, ajoute le parmesan et un filet d'huile, couvre.",
      "Fais cuire le brocoli 5 minutes à la vapeur.",
      "Poêle le cabillaud 3 minutes par face à feu moyen, sale en fin de cuisson.",
    ],
    astuce: "Sale le poisson au dernier moment : salé trop tôt, il rend son eau et grille mal.",
  },
  "din-poulet-ratatouille": {
    etapes: [
      "Préchauffe le four à 190 °C.",
      "Coupe tous les légumes en morceaux réguliers, mélange-les avec l'huile, l'ail et les herbes de Provence.",
      "Étale sur une plaque, pose le poulet au milieu.",
      "Enfourne 35 minutes, en remuant les légumes à mi-cuisson.",
    ],
    astuce: "Des morceaux de taille égale, c'est toute la différence entre un plat cuit et un plat inégal.",
  },
  "din-tortilla-pdt": {
    etapes: [
      "Coupe les pommes de terre en fines rondelles et fais-les confire à feu doux dans l'huile avec l'oignon, 15 minutes.",
      "Bats les œufs dans un saladier, sale, et verse les pommes de terre égouttées dedans. Laisse reposer 5 minutes.",
      "Reverse le tout dans la poêle et cuis 5 minutes à feu doux.",
      "Retourne la tortilla à l'aide d'une assiette et poursuis 4 minutes.",
      "Sers tiède avec la salade.",
    ],
    astuce: "Confire, pas frire : les pommes de terre doivent fondre dans l'huile tiède, jamais dorer.",
  },
  "din-sardines-salade": {
    etapes: [
      "Fais cuire les pommes de terre en robe des champs 20 minutes, les haricots verts 8 minutes.",
      "Coupe les pommes de terre encore tièdes en rondelles : elles absorbent mieux l'assaisonnement.",
      "Assaisonne avec l'huile, le citron, l'oignon émincé, du sel et du poivre.",
      "Dépose les sardines par-dessus au dernier moment.",
    ],
    astuce: "Assaisonner tiède, servir frais : c'est la règle de toutes les salades de pommes de terre.",
  },
  "din-tempeh-legumes": {
    etapes: [
      "Coupe le tempeh en tranches et fais-le dorer 3 minutes par face dans l'huile.",
      "Mélange sauce soja, miel et un peu d'eau, verse sur le tempeh et laisse réduire 2 minutes.",
      "Fais cuire brocoli et carottes 6 minutes à la vapeur.",
      "Sers sur le riz complet, nappé de la sauce.",
    ],
    astuce: "Fais bouillir le tempeh 10 minutes avant de le cuisiner si son amertume te gêne.",
  },
  "din-soupe-lentilles": {
    etapes: [
      "Fais revenir l'oignon, les carottes et les pommes de terre en dés 6 minutes dans l'huile.",
      "Couvre d'eau à hauteur, ajoute une feuille de laurier, porte à ébullition.",
      "Ajoute les lentilles et laisse mijoter 20 minutes à couvert.",
      "Écrase grossièrement une louche de soupe pour l'épaissir, rectifie le sel.",
      "Sers avec le pain grillé.",
    ],
    astuce: "Sale les légumineuses en fin de cuisson : trop tôt, elles restent fermes.",
  },
  "din-poulet-salade-cesar": {
    etapes: [
      "Fais cuire l'œuf 9 minutes à l'eau bouillante, puis passe-le sous l'eau froide.",
      "Coupe le pain en cubes et fais-le dorer à la poêle avec un peu d'huile et de l'ail.",
      "Poêle le poulet en lanières 5 minutes.",
      "Mélange le yaourt grec, du citron, du sel et du poivre pour la sauce.",
      "Assemble la salade, le poulet, l'œuf coupé en deux, les croûtons, et nappe de sauce.",
    ],
    astuce: "Assaisonne au dernier moment : une salade sauçée d'avance retombe en dix minutes.",
  },
  "din-chili-vegetarien": {
    etapes: [
      "Fais revenir le poivron en dés 5 minutes dans l'huile, avec cumin et paprika fumé.",
      "Ajoute les tomates concassées et laisse réduire 10 minutes.",
      "Ajoute les haricots rouges et le maïs égouttés, poursuis 8 minutes à feu doux.",
      "Rectifie le sel et le piment, sers sur le riz.",
    ],
    astuce: "Un carré de chocolat noir dans le chili en fin de cuisson : ça arrondit l'acidité de la tomate.",
  },
  "col-skyr-miel": {
    etapes: [
      "Verse le skyr dans un bol.",
      "Nappe de miel et ajoute les amandes.",
    ],
    astuce: "Prépare-le dans un bocal à visser : il tient dans un sac de sport sans couler.",
  },
  "din-gratin-courgettes": {
    etapes: [
      "Préchauffe le four à 190 °C.",
      "Fais revenir les courgettes en rondelles 8 minutes à la poêle pour leur faire rendre leur eau.",
      "Précuis les pommes de terre en rondelles 10 minutes à l'eau salée.",
      "Alterne les couches dans un plat avec le thon émietté, verse l'œuf battu, couvre de mozzarella.",
      "Enfourne 20 minutes jusqu'à ce que le dessus soit doré.",
    ],
    astuce: "Faire dégorger les courgettes à la poêle avant : sans ça, le gratin baigne dans l'eau.",
  },
  "col-banane-cacahuete": {
    etapes: [
      "Étale le beurre de cacahuète sur les galettes de riz.",
      "Dispose la banane en rondelles par-dessus.",
      "Sers le skyr à côté, nature ou avec un peu de cannelle.",
    ],
    astuce: "Une pincée de cannelle transforme cette collation banale en quelque chose qu'on attend.",
  },
  "col-toast-houmous": {
    etapes: [
      "Fais griller le pain.",
      "Étale le houmous, ajoute les tomates coupées en deux et la feta émiettée.",
      "Poivre et arrose d'un filet d'huile d'olive.",
    ],
    astuce: "Grille le pain juste avant : refroidi, il ramollit sous le houmous.",
  },
  "col-shake-avoine": {
    etapes: [
      "Mets tous les ingrédients dans un blender avec 250 ml d'eau ou de lait.",
      "Mixe 30 secondes jusqu'à obtenir une texture lisse.",
    ],
    astuce: "Une banane congelée en rondelles donne une texture de milk-shake sans une calorie de plus.",
  },
  "col-fruits-noix": {
    etapes: [
      "Coupe la pomme en quartiers.",
      "Sers avec le fromage blanc, la compote et les cerneaux de noix.",
    ],
    astuce: "Garde la peau de la pomme : c'est là que se trouvent les fibres qui calent.",
  },
  "col-oeufs-durs": {
    etapes: [
      "Plonge les œufs dans l'eau bouillante et compte 9 minutes.",
      "Refroidis-les aussitôt sous l'eau froide, l'écalage sera plus facile.",
      "Coupe les carottes et le concombre en bâtonnets, sers avec le houmous et le pain.",
    ],
    astuce: "Cuits d'avance, les œufs durs se gardent trois jours au frigo dans leur coquille.",
  },
  "pdj-overnight-soja": {
    etapes: [
      "Verse les flocons d'avoine dans un bocal, ajoute le yaourt de soja, la protéine et les graines de lin.",
      "Mélange, ferme le bocal et laisse au frais toute la nuit.",
      "Le matin, écrase la banane dessus et remue une dernière fois.",
    ],
    astuce: "Un bocal préparé le dimanche soir tient trois jours au frigo. Prépares-en trois d'un coup.",
  },
  "pdj-porridge-millet": {
    etapes: [
      "Fais chauffer le millet cuit avec la boisson au soja à feu doux, en remuant.",
      "Laisse épaissir 4 à 5 minutes, jusqu'à une texture de crème, puis incorpore la protéine hors du feu.",
      "Coupe la poire en dés, dépose-la sur le porridge avec les graines de tournesol.",
    ],
    astuce: "Sans gluten et sans lactose, et le millet passe mieux que l'avoine si tu as le ventre sensible.",
  },
  "pdj-skyr-kiwi-graines": {
    etapes: [
      "Verse le skyr dans un bol.",
      "Pèle et coupe le kiwi en rondelles, dépose-les dessus.",
      "Nappe de miel et parsème de graines de tournesol.",
    ],
    astuce: "Le kiwi bien mûr se coupe en deux et se mange à la cuillère : zéro épluchage.",
  },
  "pdj-oeufs-pdt": {
    etapes: [
      "Coupe les pommes de terre en petits dés et fais-les sauter à feu vif dans l'huile, 8 à 10 minutes.",
      "Ajoute le poivron en lanières, poursuis 3 minutes.",
      "Bats les œufs, verse-les dans la poêle à feu doux et remue sans arrêt jusqu'à ce qu'ils prennent.",
      "Sale, poivre, sers aussitôt.",
    ],
    astuce: "Des pommes de terre cuites la veille sautent deux fois plus vite et dorent mieux.",
  },
  "pdj-pain-perdu": {
    etapes: [
      "Bats les œufs avec le lait et une bonne pincée de cannelle dans une assiette creuse.",
      "Trempe les tranches de pain des deux côtés, laisse-les s'imbiber 30 secondes.",
      "Fais dorer à feu moyen dans une poêle antiadhésive, 2 minutes par face.",
      "Nappe de miel au moment de servir.",
    ],
    astuce: "Du pain de la veille, un peu sec, absorbe mieux l'appareil : c'est la recette anti-gaspi par excellence.",
  },
  "pdj-cottage-ananas": {
    etapes: [
      "Verse le cottage cheese dans un bol.",
      "Ajoute l'ananas en morceaux.",
      "Termine par le muesli et les graines de lin, juste avant de manger pour garder le croustillant.",
    ],
    astuce: "L'ananas frais attendrit le fromage blanc si tu le prépares la veille : mélange-le au dernier moment.",
  },
  "pdj-tartine-ricotta-raisin": {
    etapes: [
      "Fais griller les tranches de pain.",
      "Étale la ricotta généreusement dessus.",
      "Coupe les grains de raisin en deux, répartis-les et termine par un filet de miel.",
    ],
    astuce: "Un tour de moulin à poivre sur la ricotta : le contraste sucré-poivré réveille toute la tartine.",
  },
  "pdj-shake-vegetal": {
    etapes: [
      "Verse la boisson au soja dans un blender.",
      "Ajoute la banane coupée, la protéine et le cacao.",
      "Mixe 30 secondes, jusqu'à ce qu'il n'y ait plus de morceaux.",
    ],
    astuce: "Congèle les bananes trop mûres en rondelles : le shake devient onctueux sans glaçons.",
  },
  "pdj-omelette-feta": {
    etapes: [
      "Fais tomber les épinards 2 minutes dans l'huile chaude, ils doivent juste réduire.",
      "Bats les œufs, verse-les sur les épinards à feu doux.",
      "Émiette la feta sur le dessus, couvre et laisse prendre 3 minutes.",
      "Sers avec le pain grillé.",
    ],
    astuce: "La feta sale déjà beaucoup : goûte avant d'ajouter du sel.",
  },
  "pdj-galette-mais-jambon": {
    etapes: [
      "Fais chauffer la galette de maïs à sec dans une poêle, 30 secondes par face.",
      "Casse les œufs dans la poêle et laisse-les cuire au plat.",
      "Garnis la galette du jambon, des œufs et de l'emmental, plie-la en deux.",
    ],
    astuce: "Sans gluten grâce à la galette de maïs, et ça se mange à la main dans la voiture.",
  },
  "pdj-son-avoine-whey": {
    etapes: [
      "Mélange le son d'avoine et le lait dans un bol, passe 90 secondes au micro-ondes.",
      "Remue, laisse tiédir deux minutes.",
      "Incorpore la whey hors du feu pour qu'elle ne granule pas, puis ajoute les myrtilles.",
    ],
    astuce: "La whey versée dans un liquide brûlant fait des grumeaux. Laisse toujours tiédir avant.",
  },
  "pdj-yaourt-coco-mangue": {
    etapes: [
      "Fouette la protéine avec un fond d'eau pour obtenir une crème lisse.",
      "Mélange-la au yaourt de coco.",
      "Ajoute la mangue en dés et la noix de coco râpée.",
    ],
    astuce: "Sans lait, sans gluten, sans œuf et sans fruits à coque : c'est le petit-déjeuner qui passe partout.",
  },
  "pdj-tofu-epinards": {
    etapes: [
      "Émiette le tofu à la fourchette et fais-le revenir dans l'huile à feu vif 4 minutes.",
      "Ajoute le curcuma, le paprika, du sel : c'est ce qui lui donne la couleur et le goût d'œuf brouillé.",
      "Jette les épinards, remue 2 minutes jusqu'à ce qu'ils tombent.",
      "Sers sur le pain grillé.",
    ],
    astuce: "Presse le tofu 10 minutes entre deux assiettes avant de l'émietter : il rend son eau et grille au lieu de bouillir.",
  },
  "pdj-muesli-kefir": {
    etapes: [
      "Mélange le kéfir et le skyr dans un bol.",
      "Ajoute le muesli et laisse-le s'imbiber deux minutes.",
      "Termine par la poire en dés et les noisettes concassées.",
    ],
    astuce: "Le kéfir apporte des ferments que le yaourt classique n'a pas. Utile si l'entraînement te noue le ventre.",
  },
  "pdj-crepes-avoine": {
    etapes: [
      "Mixe les flocons d'avoine en poudre fine.",
      "Ajoute les œufs, la banane et le lait, mixe encore jusqu'à obtenir une pâte fluide.",
      "Laisse reposer 10 minutes : la pâte épaissit et les crêpes se tiennent mieux.",
      "Fais cuire à feu moyen dans une poêle à peine huilée, 1 minute par face.",
    ],
    astuce: "Pas de sucre dans la pâte : la banane suffit, et les crêpes ne brûlent pas.",
  },
  "pdj-fromage-blanc-abricots": {
    etapes: [
      "Verse le fromage blanc dans un bol.",
      "Coupe les abricots secs en lamelles et la pomme en dés.",
      "Mélange le tout et parsème de graines de tournesol.",
    ],
    astuce: "Sans gluten, et les abricots secs remplacent le sucre ajouté sans faire chuter l'énergie à 10 h.",
  },
  "pdj-toast-saumon-fume": {
    etapes: [
      "Fais griller le pain.",
      "Étale le fromage de chèvre frais, poivre généreusement.",
      "Dépose le saumon fumé et les rondelles de concombre, termine par un filet de citron.",
    ],
    astuce: "Le concombre apporte le croquant que le saumon n'a pas. Ne le sale pas, il rendrait son eau.",
  },
  "pdj-riz-au-lait": {
    etapes: [
      "Fais chauffer le riz cuit avec le lait à feu doux, 5 minutes, en remuant.",
      "Ajoute les raisins secs, coupe le feu et laisse gonfler 3 minutes.",
      "Quand c'est tiède, incorpore la whey en fouettant.",
    ],
    astuce: "Sans gluten, et ça se mange aussi froid : prépare une double portion la veille.",
  },
  "pdj-smoothie-bowl-rouge": {
    etapes: [
      "Mixe les fraises, les framboises et le skyr jusqu'à obtenir une crème épaisse.",
      "Verse dans un bol.",
      "Parsème de flocons d'avoine et de graines de chia.",
    ],
    astuce: "Fruits rouges surgelés : moins chers hors saison, et ils donnent la texture glacée sans glaçons.",
  },
  "pdj-wrap-oeuf-avocat": {
    etapes: [
      "Fais cuire les œufs brouillés à feu doux, sel et poivre.",
      "Écrase l'avocat à la fourchette avec un filet de citron.",
      "Étale l'avocat sur la galette, ajoute les œufs et la tomate en dés, roule serré.",
    ],
    astuce: "Le citron sur l'avocat n'est pas décoratif : il l'empêche de noircir si tu prépares le wrap à l'avance.",
  },
  "pdj-porridge-sarrasin": {
    etapes: [
      "Fais chauffer le sarrasin cuit avec un peu d'eau et de la cannelle, 4 minutes.",
      "Râpe la pomme dessus et laisse compoter 2 minutes.",
      "Hors du feu, incorpore la protéine et les graines de lin.",
    ],
    astuce: "Sans gluten, sans lait, sans œuf, sans soja et sans fruits à coque : peu de petits-déjeuners cochent toutes ces cases.",
  },
  "pdj-smoothie-vert": {
    etapes: [
      "Mets les épinards, la banane et un grand verre d'eau dans le blender, mixe 30 secondes.",
      "Ajoute la protéine et mixe encore 15 secondes.",
      "Verse dans un grand verre et parsème de graines de courge.",
    ],
    astuce: "Les épinards ne se goûtent pas derrière la banane. Commence par une petite poignée si tu es sceptique.",
  },
  "dej-poulet-quinoa-brocoli": {
    etapes: [
      "Fais cuire le brocoli 6 minutes à la vapeur, il doit rester ferme sous la fourchette.",
      "Saisis le poulet 4 minutes par face dans l'huile chaude, sel, poivre, une pointe d'ail.",
      "Laisse la viande reposer 3 minutes avant de la trancher : elle garde son jus.",
      "Dresse le quinoa, le brocoli et le poulet tranché.",
    ],
    astuce: "Le poulet est cuit quand il est ferme au toucher, pas quand il est blanc partout. Trop cuit, il devient sec.",
  },
  "dej-poulet-patate-haricots": {
    etapes: [
      "Coupe la patate douce en cubes, enrobe-les d'huile, de paprika et de sel.",
      "Enfourne à 200 °C pour 25 minutes avec les cuisses de poulet à côté.",
      "Fais cuire les haricots verts 8 minutes à l'eau bouillante salée.",
      "Sers le tout dès la sortie du four.",
    ],
    astuce: "La cuisse coûte deux fois moins cher que le blanc et sèche beaucoup moins. Retire la peau, pas le goût.",
  },
  "dej-steak-riz-poivrons": {
    etapes: [
      "Fais sauter les poivrons en lanières à feu vif 6 minutes dans l'huile.",
      "Pousse-les sur le côté, saisis le steak haché 3 minutes en l'écrasant à la spatule.",
      "Mélange, assaisonne au paprika fumé, sers sur le riz chaud.",
    ],
    astuce: "Feu vif et poêle non couverte : la viande dore. À feu doux, elle bout et rend son eau.",
  },
  "dej-colin-pdt-brocoli": {
    etapes: [
      "Mets les pommes de terre en morceaux à cuire 18 minutes à la vapeur, le brocoli sur le panier du dessus les 7 dernières minutes.",
      "Pose le colin sur le brocoli les 6 dernières minutes : il cuit à la vapeur sans se dessécher.",
      "Arrose d'huile d'olive, de citron et de persil au moment de servir.",
    ],
    astuce: "Le poisson est cuit quand la chair se sépare en lamelles sous la fourchette. Une minute de trop et il devient cotonneux.",
  },
  "dej-maquereau-boulgour": {
    etapes: [
      "Fais griller les filets de maquereau côté peau 4 minutes, puis 1 minute de l'autre côté.",
      "Mélange le boulgour avec la tomate en dés, beaucoup de persil et le jus de citron.",
      "Arrose d'huile d'olive et sers le poisson posé dessus.",
    ],
    astuce: "Le maquereau est le poisson gras le moins cher du rayon, et celui qui apporte le plus d'oméga 3 par euro.",
  },
  "dej-salade-thon-pois-chiches": {
    etapes: [
      "Égoutte le thon et les pois chiches, rince ces derniers à l'eau froide.",
      "Coupe les tomates cerises en deux et émince finement l'oignon rouge.",
      "Mélange tout, assaisonne d'huile d'olive, de vinaigre, de sel et de poivre.",
    ],
    astuce: "Zéro cuisson, sans gluten, et ça se transporte dans une boîte sans se dégrader jusqu'au soir.",
  },
  "dej-salade-poulet-avocat": {
    etapes: [
      "Utilise un reste de poulet cuit, coupé en lanières.",
      "Mélange la salade, le maïs égoutté, la tomate en quartiers et l'avocat en dés.",
      "Ajoute le poulet, assaisonne au citron, à l'huile et au poivre.",
    ],
    astuce: "Fais cuire deux blancs de poulet quand tu cuisines le soir : le déjeuner du lendemain est déjà prêt.",
  },
  "dej-curry-lentilles-corail": {
    etapes: [
      "Fais revenir l'oignon et l'ail avec du curry et du cumin 2 minutes.",
      "Ajoute les lentilles corail, les tomates concassées et deux fois leur volume d'eau.",
      "Laisse mijoter 15 minutes à couvert, jusqu'à ce que les lentilles se défassent.",
      "Ajoute le lait de coco et les épinards, coupe le feu, sers avec le riz.",
    ],
    astuce: "Végétalien et sans gluten pour moins de deux euros la portion. Il se garde trois jours et gagne en goût.",
  },
  "dej-chili-quinoa": {
    etapes: [
      "Fais revenir le poivron et l'oignon 5 minutes.",
      "Ajoute les haricots rouges égouttés, le maïs, le coulis de tomate, le cumin et le paprika fumé.",
      "Laisse mijoter 15 minutes à feu doux, le temps que ça épaississe.",
      "Sers sur le quinoa.",
    ],
    astuce: "Une pointe de cacao non sucré dans le chili : c'est le truc qui lui donne de la profondeur sans le sucrer.",
  },
  "dej-bowl-tofu-nouilles": {
    etapes: [
      "Coupe le tofu en cubes et fais-le dorer 6 minutes à feu vif, sans y toucher les deux premières minutes.",
      "Ajoute la carotte râpée et le chou rouge émincé, saute 3 minutes.",
      "Verse les nouilles cuites et la sauce soja, mélange 1 minute et sers.",
    ],
    astuce: "Sans gluten grâce aux nouilles de riz. Vérifie l'étiquette de la sauce soja, certaines contiennent du blé.",
  },
  "dej-tempeh-riz-complet": {
    etapes: [
      "Tranche le tempeh et fais-le dorer 4 minutes par face dans l'huile.",
      "Déglace avec la sauce soja, du gingembre râpé et une pointe de miel ou de sirop.",
      "Ajoute le brocoli vapeur, mélange 1 minute et sers sur le riz complet.",
    ],
    astuce: "Le tempeh fermenté se digère mieux que le tofu et tient mieux à la poêle : il ne s'effrite pas.",
  },
  "dej-falafel-pita": {
    etapes: [
      "Fais réchauffer les falafels 10 minutes au four à 200 °C, ils redeviennent croustillants.",
      "Assaisonne le skyr de citron, d'ail et de menthe : c'est la sauce blanche.",
      "Ouvre le pain pita, tartine l'intérieur de houmous.",
      "Garnis de salade, de tomate et de falafels, nappe de sauce au yaourt et ajoute une pointe de harissa.",
    ],
    astuce: "Au four et non à la poêle : les falafels absorbent beaucoup moins de gras et restent secs à l'extérieur.",
  },
  "dej-buddha-millet-feves": {
    etapes: [
      "Dispose le millet tiède au fond du bol.",
      "Ajoute les fèves, la betterave en dés et la roquette par zones plutôt que mélangées.",
      "Délaye la purée de sésame avec du citron et un peu d'eau, verse cette sauce sur le bol.",
    ],
    astuce: "La sauce au sésame se fige au frigo : rallonge-la d'une cuillère d'eau tiède et elle redevient nappante.",
  },
  "dej-omelette-pdt-salade": {
    etapes: [
      "Fais sauter les pommes de terre en rondelles 10 minutes à feu moyen.",
      "Bats les œufs avec du sel et du persil, verse-les sur les pommes de terre.",
      "Couvre et laisse prendre 5 minutes à feu doux, puis retourne l'omelette dans une assiette.",
      "Sers avec la salade assaisonnée.",
    ],
    astuce: "Le couvercle cuit le dessus par la vapeur : plus besoin de retourner l'omelette si tu n'es pas à l'aise.",
  },
  "dej-pates-thon-tomate": {
    etapes: [
      "Fais chauffer le coulis de tomate avec de l'ail et de l'origan 8 minutes.",
      "Ajoute le thon égoutté et les olives, laisse 2 minutes sans remuer trop fort.",
      "Verse les pâtes égouttées dans la sauce et mélange hors du feu.",
    ],
    astuce: "Garde une louche d'eau de cuisson : versée dans la sauce, elle la rend nappante sans ajouter de gras.",
  },
  "dej-pates-pesto-poulet": {
    etapes: [
      "Fais cuire les pâtes al dente.",
      "Pendant ce temps, saisis le poulet en lanières 6 minutes avec les tomates cerises coupées en deux.",
      "Mélange les pâtes, le poulet et le pesto hors du feu : chauffé, le pesto perd son parfum.",
    ],
    astuce: "Le pesto ne se cuit jamais. Ajoute-le toujours au dernier moment, feu éteint.",
  },
  "dej-riz-saute-oeuf": {
    etapes: [
      "Fais sauter la carotte en petits dés 4 minutes à feu vif.",
      "Ajoute les petits pois et le riz froid, remue 3 minutes.",
      "Pousse le riz sur le côté, casse les œufs dans la poêle, brouille-les puis mélange au riz.",
      "Assaisonne à la sauce soja.",
    ],
    astuce: "Le riz de la veille, bien froid, ne colle pas. Du riz chaud donne une bouillie.",
  },
  "dej-galette-mais-haricots": {
    etapes: [
      "Écrase grossièrement les haricots rouges à la fourchette avec du cumin et du piment.",
      "Fais chauffer les galettes de maïs 30 secondes par face à sec.",
      "Garnis de haricots, de maïs, d'avocat écrasé et de salade, plie et sers.",
    ],
    astuce: "Végétalien et sans gluten. Les galettes de maïs se réchauffent aussi au grille-pain.",
  },
  "dej-salade-lentilles-chevre": {
    etapes: [
      "Mélange les lentilles cuites avec la betterave en dés et la mâche.",
      "Émiette le fromage de chèvre par-dessus.",
      "Assaisonne d'huile de colza, de moutarde et de vinaigre, mélangés à part.",
    ],
    astuce: "L'huile de colza apporte des oméga 3 que l'huile d'olive n'a pas. Garde-la pour le cru, elle ne supporte pas la cuisson.",
  },
  "dej-dinde-hachee-patate": {
    etapes: [
      "Fais rôtir la patate douce en cubes 25 minutes à 200 °C.",
      "Saisis la dinde hachée à feu vif 5 minutes, ajoute les courgettes en rondelles.",
      "Assaisonne au thym et au paprika, mélange à la patate douce.",
    ],
    astuce: "La dinde hachée est plus maigre que le bœuf : ne la cuis pas plus de 6 minutes ou elle devient farineuse.",
  },
  "dej-truite-quinoa-asperges": {
    etapes: [
      "Poêle les asperges 6 minutes à feu vif dans l'huile, elles doivent rester croquantes.",
      "Cuis la truite côté peau 4 minutes, puis 1 minute de l'autre côté.",
      "Sers sur le quinoa avec beaucoup de citron.",
    ],
    astuce: "Peau bien sèche et poêle très chaude : c'est la seule façon d'obtenir une peau croustillante.",
  },
  "dej-moules-riz": {
    etapes: [
      "Fais revenir l'oignon et l'ail 3 minutes dans l'huile.",
      "Ajoute la tomate en dés, laisse compoter 5 minutes.",
      "Verse les moules, couvre et laisse 5 minutes, jusqu'à ce qu'elles s'ouvrent.",
      "Sers avec le riz et beaucoup de persil.",
    ],
    astuce: "Jette les moules restées fermées après cuisson, sans exception.",
  },
  "dej-sandwich-poulet": {
    etapes: [
      "Tartine le pain de moutarde.",
      "Garnis de poulet cuit tranché, de salade et de tomate.",
      "Presse le sandwich et emballe-le : il se tient mieux au moment de le manger.",
    ],
    astuce: "La moutarde remplace la mayonnaise : même relief en bouche, dix fois moins de calories.",
  },
  "dej-wrap-thon-houmous": {
    etapes: [
      "Étale le houmous sur la galette en laissant deux centimètres de bord libre.",
      "Répartis le thon égoutté, le concombre et la tomate en bâtonnets.",
      "Roule serré, coupe en deux en biais.",
    ],
    astuce: "Bâtonnets plutôt que rondelles : le wrap se roule serré et ne s'ouvre pas dans le sac.",
  },
  "dej-soupe-pois-casses": {
    etapes: [
      "Fais suer le poireau et la carotte en rondelles 5 minutes dans l'huile.",
      "Ajoute les pois cassés cuits et de l'eau à hauteur, laisse mijoter 15 minutes.",
      "Mixe la moitié seulement, pour garder de la mâche.",
      "Ajoute le jambon en dés hors du feu.",
    ],
    astuce: "Mixer la moitié suffit : la soupe est crémeuse mais on mâche encore quelque chose, et on la trouve plus rassasiante.",
  },
  "dej-wrap-seitan": {
    etapes: [
      "Fais sauter le seitan en lanières 5 minutes à feu vif.",
      "Ajoute le poivron et l'oignon émincés, poursuis 5 minutes.",
      "Déglace à la sauce soja, garnis les galettes et roule.",
    ],
    astuce: "Le seitan est la source végétale la plus riche en protéines, mais elle est faite de gluten : à éviter si tu y es intolérant.",
  },
  "dej-salade-quinoa-feta": {
    etapes: [
      "Mélange le quinoa refroidi avec le concombre et la tomate en dés.",
      "Ajoute la feta émiettée et les olives.",
      "Assaisonne à l'huile d'olive, au citron et à la menthe ciselée.",
    ],
    astuce: "Prépare-la la veille : les légumes rendent leur jus et le quinoa s'en imprègne, c'est meilleur le lendemain.",
  },
  "dej-poulet-semoule-legumes": {
    etapes: [
      "Fais mijoter la carotte et la courgette en gros morceaux 15 minutes dans un bouillon aux épices.",
      "Ajoute les pois chiches et le poulet en morceaux, poursuis 8 minutes.",
      "Verse l'eau bouillante sur la semoule, couvre 5 minutes, égraine à la fourchette.",
      "Sers les légumes et leur bouillon sur la semoule.",
    ],
    astuce: "Une pointe de harissa délayée dans le bouillon à part : chacun dose son piment dans l'assiette.",
  },
  "dej-saumon-riz-edamame": {
    etapes: [
      "Cuis le saumon 10 minutes au four à 180 °C, ou 4 minutes par face à la poêle.",
      "Fais chauffer les edamame 3 minutes à l'eau bouillante.",
      "Dresse le riz, le saumon émietté, les edamame et la carotte râpée, arrose de sauce soja.",
    ],
    astuce: "Le saumon légèrement rosé au centre reste fondant. Cuit à cœur, il devient sec et se délite.",
  },
  "dej-haricots-blancs-thon": {
    etapes: [
      "Rince et égoutte les haricots blancs.",
      "Mélange-les au thon, aux tomates cerises coupées en deux et à la roquette.",
      "Assaisonne d'huile d'olive, de citron, de sel et de beaucoup de poivre.",
    ],
    astuce: "Sans cuisson, sans gluten, sans lactose : c'est le déjeuner de secours quand la journée déborde.",
  },
  "din-poulet-legumes-rotis": {
    etapes: [
      "Coupe la courge et la courgette en gros cubes, enrobe-les d'huile, de thym et de sel.",
      "Étale-les sur une plaque sans les superposer, enfourne 25 minutes à 200 °C.",
      "Ajoute le poulet à mi-cuisson et laisse dorer.",
      "Sers directement dans le plat, avec le jus de cuisson.",
    ],
    astuce: "Des légumes serrés cuisent à la vapeur et restent mous. Une seule couche, bien espacée : ils rôtissent.",
  },
  "din-colin-poireaux-riz": {
    etapes: [
      "Fais fondre les poireaux émincés 12 minutes à feu doux, à couvert.",
      "Ajoute la crème et un peu de moutarde, mélange.",
      "Pose le colin sur les poireaux, couvre et laisse cuire 8 minutes à feu doux.",
      "Sers sur le riz.",
    ],
    astuce: "Le poisson cuit à l'étouffée sur les légumes ne se dessèche jamais et prend leur parfum.",
  },
  "din-truite-butternut": {
    etapes: [
      "Cuis la courge en cubes 20 minutes à la vapeur, puis écrase-la avec l'huile, du sel et de la muscade.",
      "Fais tomber les épinards 2 minutes à la poêle avec de l'ail.",
      "Cuis la truite 4 minutes côté peau, 1 minute de l'autre côté.",
      "Dresse la purée, les épinards et le poisson.",
    ],
    astuce: "La courge butternut se pèle plus facilement passée 2 minutes au micro-ondes.",
  },
  "din-omelette-champignons-pdt": {
    etapes: [
      "Fais sauter les pommes de terre en dés 10 minutes, ajoute les champignons 4 minutes.",
      "Bats les œufs avec du persil, verse dans la poêle à feu doux.",
      "Couvre 4 minutes, jusqu'à ce que le dessus soit juste pris.",
      "Sers avec la salade assaisonnée.",
    ],
    astuce: "Les champignons rendent beaucoup d'eau : cuis-les à feu vif et à part si tu veux qu'ils dorent.",
  },
  "din-soupe-butternut-lentilles": {
    etapes: [
      "Fais revenir l'oignon 3 minutes, ajoute la courge en cubes et les lentilles corail.",
      "Couvre d'eau, ajoute du curry et du gingembre, laisse mijoter 20 minutes.",
      "Mixe finement, puis incorpore le lait de coco hors du feu.",
    ],
    astuce: "Les lentilles corail fondent complètement : elles épaississent le velouté et lui apportent les protéines qui manquent aux soupes.",
  },
  "din-gratin-chou-fleur-jambon": {
    etapes: [
      "Cuis le chou-fleur et les pommes de terre 15 minutes à la vapeur.",
      "Range-les dans un plat avec le jambon en dés, verse le lait assaisonné de muscade.",
      "Couvre d'emmental râpé et enfourne 20 minutes à 200 °C.",
    ],
    astuce: "Un chou-fleur trop cuit avant le four devient de la bouillie. Arrête la vapeur quand il résiste encore un peu.",
  },
  "din-crevettes-courgettes": {
    etapes: [
      "Fais sauter les courgettes en demi-rondelles 6 minutes à feu vif.",
      "Ajoute l'ail et les crevettes, saute 3 minutes, pas une de plus.",
      "Déglace au citron, sers sur le riz avec du persil.",
    ],
    astuce: "Les crevettes sont cuites dès qu'elles deviennent roses et se recourbent. Au-delà, elles caoutchoutent.",
  },
  "din-boulettes-dinde": {
    etapes: [
      "Mélange la dinde hachée avec l'oignon râpé, du persil, du sel et du poivre, forme des boulettes.",
      "Fais-les dorer 5 minutes dans l'huile, sur toutes leurs faces.",
      "Verse le coulis de tomate, couvre et laisse mijoter 15 minutes.",
      "Sers sur les pâtes.",
    ],
    astuce: "Mouille-toi les mains avant de rouler les boulettes : la viande ne colle plus aux doigts.",
  },
  "din-curry-tofu-epinards": {
    etapes: [
      "Fais dorer le tofu en cubes 6 minutes à feu vif, réserve.",
      "Fais revenir l'oignon, l'ail, le gingembre et le curry 2 minutes.",
      "Ajoute les tomates concassées, laisse réduire 8 minutes, puis le lait de coco et les épinards.",
      "Remets le tofu, mélange et sers sur le riz.",
    ],
    astuce: "Dore le tofu à part et remets-le à la fin : mijoté dès le début, il se désagrège dans la sauce.",
  },
  "din-salade-tiede-pois-chiches": {
    etapes: [
      "Enrobe les pois chiches égouttés de paprika, de cumin et d'huile.",
      "Enfourne 20 minutes à 200 °C avec les poivrons en lanières, ils doivent croustiller.",
      "Verse le tout tiède sur la roquette, émiette la feta dessus.",
    ],
    astuce: "Sèche bien les pois chiches au torchon avant de les rôtir : c'est la seule façon qu'ils croustillent.",
  },
  "din-cabillaud-fenouil": {
    etapes: [
      "Émince le fenouil, mets-le à braiser 10 minutes avec un fond d'eau et l'huile.",
      "Ajoute les pommes de terre en rondelles fines, poursuis 10 minutes à couvert.",
      "Pose le cabillaud dessus, ajoute des rondelles de citron, couvre et laisse 8 minutes.",
    ],
    astuce: "Le fenouil braisé perd son amertume et devient presque sucré. Il n'a rien à voir avec le fenouil cru.",
  },
  "din-poelee-haricots-blancs": {
    etapes: [
      "Fais revenir l'aubergine en cubes 8 minutes à feu vif, elle boit l'huile puis la rend.",
      "Ajoute la courgette, poursuis 5 minutes.",
      "Verse les tomates concassées et les haricots blancs, laisse mijoter 10 minutes.",
      "Termine par du basilic et un tour de poivre, sers avec le riz.",
    ],
    astuce: "Végétalien, sans gluten et à moins de deux euros. Encore meilleur réchauffé le lendemain.",
  },
  "din-frittata-courgettes": {
    etapes: [
      "Fais sauter les pommes de terre et les courgettes en rondelles 12 minutes.",
      "Bats les œufs, verse-les dessus, émiette le chèvre.",
      "Couvre et laisse prendre 6 minutes à feu doux, ou passe 3 minutes sous le gril.",
    ],
    astuce: "La frittata se mange aussi froide : coupe-la en parts, c'est le déjeuner du lendemain déjà emballé.",
  },
  "din-saumon-polenta": {
    etapes: [
      "Verse la polenta en pluie dans l'eau bouillante salée, remue 5 minutes jusqu'à ce qu'elle épaississe.",
      "Hors du feu, ajoute le parmesan râpé.",
      "Fais tomber les épinards à l'ail 2 minutes.",
      "Cuis le saumon 4 minutes par face et dresse le tout.",
    ],
    astuce: "La polenta durcit en refroidissant. Sers-la immédiatement, ou rallonge-la d'un peu d'eau chaude.",
  },
  "din-veloute-brocoli-oeuf": {
    etapes: [
      "Fais cuire le brocoli et les pommes de terre 18 minutes dans un bouillon.",
      "Mixe, ajuste avec un peu d'eau de cuisson jusqu'à la texture voulue.",
      "Poche les œufs 3 minutes dans une eau frémissante vinaigrée.",
      "Sers le velouté avec l'œuf posé dessus et un filet d'huile.",
    ],
    astuce: "L'œuf poché transforme une soupe en vrai repas : le jaune coulant fait la sauce.",
  },
  "din-poulet-endives": {
    etapes: [
      "Braise les endives coupées en deux 15 minutes à couvert, avec un fond d'eau et une pincée de sucre.",
      "Cuis les pommes de terre à la vapeur, écrase-les grossièrement.",
      "Range endives, poulet cuit et purée dans un plat, couvre d'emmental.",
      "Gratine 15 minutes à 200 °C.",
    ],
    astuce: "La pincée de sucre à la cuisson des endives coupe leur amertume. Une pincée suffit.",
  },
  "din-nouilles-tofu-champignons": {
    etapes: [
      "Fais dorer le tofu en cubes 6 minutes à feu vif.",
      "Ajoute les champignons émincés et le chou rouge, saute 4 minutes.",
      "Verse les nouilles cuites et la sauce soja, mélange 1 minute.",
    ],
    astuce: "Wok ou grande poêle très chaude, et on ne remue pas trop : c'est le contact avec le métal qui donne le goût grillé.",
  },
  "din-maquereau-lentilles": {
    etapes: [
      "Fais chauffer les lentilles avec l'oignon rouge émincé.",
      "Prépare une vinaigrette moutarde, huile et vinaigre, verse-la sur les lentilles chaudes.",
      "Grille les filets de maquereau 4 minutes côté peau et pose-les dessus.",
    ],
    astuce: "La vinaigrette versée sur des lentilles encore chaudes est absorbée : le plat a beaucoup plus de goût.",
  },
  "din-risotto-quinoa-champignons": {
    etapes: [
      "Fais revenir l'oignon puis les champignons à feu vif 6 minutes.",
      "Ajoute le quinoa et un bouillon chaud, louche par louche, en remuant.",
      "Quand le quinoa est crémeux, coupe le feu et incorpore la ricotta puis le parmesan.",
    ],
    astuce: "Le bouillon doit être chaud : versé froid, il stoppe la cuisson et le risotto devient collant.",
  },
  "din-minestrone": {
    etapes: [
      "Fais suer la carotte, la courgette et l'oignon 6 minutes.",
      "Ajoute le coulis de tomate, de l'eau et les haricots blancs, laisse mijoter 15 minutes.",
      "Jette les pâtes les 8 dernières minutes, elles finissent de cuire dans la soupe.",
      "Sers avec du basilic et un filet d'huile d'olive.",
    ],
    astuce: "Cuire les pâtes directement dans la soupe l'épaissit. Si tu comptes la garder deux jours, cuis-les à part.",
  },
  "din-aubergines-farcies": {
    etapes: [
      "Coupe les aubergines en deux, quadrille la chair et enfourne 20 minutes à 200 °C.",
      "Fais revenir la viande avec l'oignon, ajoute le coulis et le riz cuit.",
      "Creuse les aubergines, mélange la chair à la farce, remplis les demi-aubergines.",
      "Couvre d'emmental et repasse 15 minutes au four.",
    ],
    astuce: "Sale la chair des aubergines 10 minutes avant cuisson et éponge-la : elles boivent moitié moins d'huile.",
  },
  "din-poulet-champignons-creme": {
    etapes: [
      "Saisis le poulet en lanières 5 minutes, réserve.",
      "Fais dorer les champignons à feu vif 6 minutes, sans les saler tout de suite.",
      "Remets le poulet, ajoute la crème et une pointe de moutarde, laisse épaissir 3 minutes.",
      "Sers sur le riz.",
    ],
    astuce: "Saler les champignons en début de cuisson les fait rendre leur eau. Sale à la fin, ils dorent.",
  },
  "din-galettes-pois-chiches": {
    etapes: [
      "Écrase les pois chiches à la fourchette avec l'œuf, du cumin, de l'ail et du persil.",
      "Forme des galettes épaisses d'un centimètre.",
      "Fais-les dorer 4 minutes par face à feu moyen.",
      "Sers avec la salade et la tomate assaisonnées.",
    ],
    astuce: "Une pâte trop humide se défait à la cuisson. Ajoute une cuillère de farine ou de flocons si besoin.",
  },
  "din-colin-tomates-olives": {
    etapes: [
      "Fais compoter la tomate en dés avec l'ail et le thym 10 minutes.",
      "Ajoute les olives, pose le colin dessus, couvre et laisse 8 minutes à feu doux.",
      "Sers avec les pommes de terre vapeur.",
    ],
    astuce: "Les olives sont déjà salées : goûte la sauce avant d'ajouter du sel.",
  },
  "din-wok-boeuf-legumes": {
    etapes: [
      "Fais saisir le bœuf 2 minutes à feu très vif, réserve-le aussitôt.",
      "Saute les poivrons et les champignons 5 minutes.",
      "Remets la viande, ajoute les nouilles et la sauce soja, mélange 1 minute.",
    ],
    astuce: "Le bœuf se saisit en deux minutes et se réserve. Laissé dans le wok, il durcit pendant que les légumes cuisent.",
  },
  "din-dahl-millet": {
    etapes: [
      "Fais revenir l'oignon, l'ail et les épices 3 minutes dans l'huile.",
      "Ajoute les lentilles et les tomates concassées, laisse mijoter 12 minutes.",
      "Jette les épinards en fin de cuisson, ils tombent en une minute.",
      "Sers sur le millet.",
    ],
    astuce: "Végétalien et sans gluten. Une cuillère de citron à la fin réveille tout le plat.",
  },
  "din-pizza-pita": {
    etapes: [
      "Étale le coulis de tomate sur les pains pita, ajoute l'origan.",
      "Répartis la mozzarella, les poivrons en lanières et les olives.",
      "Enfourne 10 minutes à 220 °C, jusqu'à ce que le fromage bulle.",
    ],
    astuce: "Pose la pita directement sur la grille du four : le dessous croustille au lieu de ramollir.",
  },
  "din-poulet-curry-coco": {
    etapes: [
      "Saisis le poulet en morceaux 5 minutes, réserve.",
      "Fais revenir l'oignon, l'ail et le curry 2 minutes, ajoute le poivron.",
      "Verse le lait de coco, remets le poulet et laisse mijoter 10 minutes à feu doux.",
      "Sers sur le riz avec de la coriandre.",
    ],
    astuce: "Le lait de coco ne doit jamais bouillir fort, il se sépare. Petits frémissements uniquement.",
  },
  "din-salade-betterave-oeuf": {
    etapes: [
      "Utilise des pommes de terre cuites la veille, coupées en rondelles.",
      "Dispose la mâche, la betterave en dés et les pommes de terre.",
      "Ajoute les œufs durs coupés en quartiers.",
      "Assaisonne d'huile de colza, de moutarde et de vinaigre.",
    ],
    astuce: "Œufs durs : 9 minutes à l'eau bouillante, puis eau froide immédiatement. Ils s'écalent sans arracher le blanc.",
  },
  "din-curry-pois-chiches-butternut": {
    etapes: [
      "Fais revenir l'oignon, l'ail et le curry 3 minutes.",
      "Ajoute la courge en cubes et un peu d'eau, laisse cuire 15 minutes à couvert.",
      "Verse les pois chiches, le lait de coco et les épinards, poursuis 5 minutes.",
      "Sers sur le riz.",
    ],
    astuce: "Végétalien, sans gluten, sans soja et sans fruits à coque : peu de plats complets cochent autant de cases.",
  },
  "col-fromage-blanc-framboises": {
    etapes: [
      "Verse le fromage blanc dans un bol.",
      "Ajoute les framboises, le miel et les graines de lin.",
    ],
    astuce: "Les graines de lin doivent être moulues pour être assimilées. Entières, elles traversent sans rien apporter.",
  },
  "col-pomme-cacahuete": {
    etapes: [
      "Coupe la pomme en quartiers épais.",
      "Trempe-les dans le beurre de cacahuète.",
    ],
    astuce: "Choisis un beurre de cacahuète dont la liste d'ingrédients tient en un mot : cacahuètes.",
  },
  "col-yaourt-soja-dattes": {
    etapes: [
      "Fouette la protéine avec une cuillère de yaourt pour obtenir une crème lisse, puis mélange au reste.",
      "Dénoyaute et coupe les dattes en morceaux.",
      "Ajoute-les avec les noix de cajou concassées.",
    ],
    astuce: "Deux dattes suffisent à sucrer un yaourt entier. Au-delà, on empile du sucre sans s'en rendre compte.",
  },
  "col-tartine-banane-tahini": {
    etapes: [
      "Fais griller le pain.",
      "Étale la purée de sésame, dépose les rondelles de banane.",
    ],
    astuce: "La purée de sésame remplace les purées de fruits à coque si tu y es allergique : même onctuosité, autre famille.",
  },
  "col-shake-vegetal-banane": {
    etapes: [
      "Mets la banane, la protéine et la boisson au soja dans un shaker ou un blender.",
      "Mixe ou secoue 30 secondes.",
    ],
    astuce: "Le shaker suffit si tu écrases la banane à la fourchette d'abord. Sinon il reste des morceaux.",
  },
  "col-cottage-fruits-secs": {
    etapes: [
      "Verse le cottage cheese dans un bol.",
      "Ajoute les raisins secs et les graines de courge, mélange.",
    ],
    astuce: "Sans gluten et transportable. Le cottage cheese tient mieux hors du frigo qu'un yaourt classique.",
  },
  "col-thon-galettes-riz": {
    etapes: [
      "Écrase l'avocat à la fourchette avec du poivre et un peu de citron.",
      "Ajoute le thon égoutté et mélange grossièrement.",
      "Répartis la tartinade sur les galettes de riz, ajoute les rondelles de tomate.",
    ],
    astuce: "Sans gluten et 100 % rayon épicerie : c'est la collation qui se garde au bureau.",
  },
  "col-houmous-crudites": {
    etapes: [
      "Coupe la carotte et le concombre en bâtonnets.",
      "Verse le houmous dans un bol, arrose d'un filet d'huile et de paprika.",
      "Coupe le pain pita en triangles et sers le tout.",
    ],
    astuce: "Prépare les bâtonnets pour la semaine dans une boîte avec un fond d'eau : ils restent croquants quatre jours.",
  },
  "col-skyr-cacao-noisettes": {
    etapes: [
      "Mélange le cacao au skyr jusqu'à ce qu'il n'y ait plus de grumeaux.",
      "Ajoute le miel, puis les noisettes concassées.",
    ],
    astuce: "Délaye le cacao avec une cuillère de skyr d'abord, puis mélange au reste : plus aucun grumeau.",
  },
  "col-smoothie-mangue-coco": {
    etapes: [
      "Mets la mangue, la banane et le yaourt de coco dans le blender.",
      "Ajoute la protéine et un peu d'eau, mixe 30 secondes.",
    ],
    astuce: "Sans lait, sans gluten, sans œuf, sans soja et sans fruits à coque : une des rares collations qui passe tous les filtres.",
  },
  "col-edamame": {
    etapes: [
      "Fais cuire les edamame 4 minutes à l'eau bouillante salée.",
      "Égoutte, sale au gros sel et presse les gousses entre les dents pour en sortir les fèves.",
      "Sers avec les galettes de riz.",
    ],
    astuce: "Les edamame surgelés sont aussi bons que frais et coûtent moitié moins cher.",
  },
  "col-oeuf-dur-tartine": {
    etapes: [
      "Cuis les œufs 9 minutes à l'eau bouillante, puis plonge-les dans l'eau froide.",
      "Fais griller le pain, frotte-le à l'ail et couvre-le de tomate écrasée.",
      "Écale les œufs, coupe-les en deux, sale et poivre.",
    ],
    astuce: "Cuis six œufs d'un coup le dimanche : ils se gardent une semaine au frigo, coquille intacte.",
  },
  "col-fromage-blanc-poire": {
    etapes: [
      "Coupe la poire en dés.",
      "Mélange-la au fromage blanc avec les flocons d'avoine et le miel.",
    ],
    astuce: "Les flocons crus donnent du croquant. Ajoute-les juste avant de manger, sinon ils ramollissent.",
  },
  "col-barres-dattes-avoine": {
    etapes: [
      "Mixe les dattes dénoyautées jusqu'à obtenir une pâte collante.",
      "Ajoute les flocons d'avoine, le beurre de cacahuète et le cacao, mixe par à-coups.",
      "Tasse la pâte dans un moule, place 1 heure au frais puis coupe en barres.",
    ],
    astuce: "Une portion, c'est une barre. Prépare la plaque entière et emballe-les à l'unité, sinon la plaque part en un après-midi.",
  },
  "col-crackers-chevre-raisin": {
    etapes: [
      "Fais griller le pain sans gluten.",
      "Étale le fromage de chèvre, poivre.",
      "Coupe les grains de raisin en deux et répartis-les.",
    ],
    astuce: "Le pain sans gluten est meilleur grillé : il retrouve une tenue que la mie n'a pas à froid.",
  },
  "col-compote-son-avoine": {
    etapes: [
      "Mélange le son d'avoine à la compote, laisse gonfler 2 minutes.",
      "Ajoute le fromage blanc et les graines de lin.",
    ],
    astuce: "Le son d'avoine gonfle dans l'estomac : c'est la collation qui cale le plus pour le moins de calories.",
  },
  "col-tomate-mozzarella": {
    etapes: [
      "Coupe la mozzarella et les tomates cerises en deux.",
      "Assaisonne d'origan, d'huile et de poivre, ajoute les olives.",
      "Sers avec le pain.",
    ],
    astuce: "Sors la mozzarella du frigo 15 minutes avant : froide, elle n'a aucun goût.",
  },
  "col-smoothie-kefir-fraises": {
    etapes: [
      "Mets le kéfir, le skyr, les fraises et les flocons d'avoine dans le blender.",
      "Mixe 30 secondes.",
    ],
    astuce: "Les fraises surgelées donnent un smoothie glacé et coûtent trois fois moins cher hors saison.",
  },
  "col-abricots-cacahuetes": {
    etapes: [
      "Mets les abricots secs et les cacahuètes dans une boîte.",
      "Emporte la pomme entière à côté.",
    ],
    astuce: "Pèse ta portion une fois pour voir à quoi elle ressemble. Les fruits secs se mangent vite et pèsent lourd.",
  },
  "col-pois-chiches-rotis": {
    etapes: [
      "Égoutte et sèche soigneusement les pois chiches dans un torchon.",
      "Mélange-les à l'huile, au paprika fumé, au cumin et au sel.",
      "Enfourne 25 minutes à 200 °C en secouant la plaque à mi-cuisson.",
      "Sers tièdes avec les galettes de riz.",
    ],
    astuce: "Ils croustillent en sortant du four et ramollissent en refroidissant. Fais-en de petites quantités.",
  },
  "col-graines-courge-raisins": {
    etapes: [
      "Mélange les graines de courge et les raisins secs dans une petite boîte.",
      "Croque la pomme à côté.",
    ],
    astuce: "Aucun des huit allergènes du questionnaire, aucune cuisson, et ça vit dans un sac de sport.",
  },
  "col-yaourt-grec-miel-fruits": {
    etapes: [
      "Verse le yaourt grec dans un bol.",
      "Ajoute les myrtilles, le miel et les graines de tournesol.",
    ],
    astuce: "Le yaourt grec est plus gras et plus rassasiant que le skyr. Le bon choix les jours où la collation doit tenir jusqu'au dîner.",
  },
  "dej-salade-pois-chiches-crudites": {
    etapes: [
      "Rince et égoutte les pois chiches et le maïs.",
      "Coupe le concombre en dés et les tomates cerises en deux.",
      "Mélange, assaisonne d'huile d'olive, de citron, de cumin et de poivre.",
    ],
    astuce: "Végétalien, sans gluten, sans cuisson. La boîte de pois chiches rincée perd son goût de conserve.",
  },
  "dej-wrap-houmous-vegan": {
    etapes: [
      "Étale le houmous sur la galette.",
      "Écrase grossièrement les pois chiches à la fourchette avec du cumin et du citron.",
      "Répartis-les avec la carotte râpée et la salade, roule serré.",
    ],
    astuce: "Écraser les pois chiches plutôt que les laisser entiers évite qu'ils roulent hors du wrap à la première bouchée.",
  },
  "dej-salade-haricots-rouges": {
    etapes: [
      "Rince les haricots rouges et le maïs.",
      "Coupe le poivron en dés, émince l'oignon rouge finement.",
      "Ajoute l'avocat en cubes, assaisonne de citron vert, de coriandre et de piment.",
    ],
    astuce: "Ajoute l'avocat au dernier moment et garde le citron : c'est ce qui l'empêche de noircir dans la boîte.",
  },
  "din-salade-lentilles-betterave": {
    etapes: [
      "Mélange les lentilles cuites, le maïs et la betterave en dés.",
      "Ajoute les tomates cerises coupées en deux.",
      "Assaisonne à la moutarde, au vinaigre et à l'huile, parsème de graines de courge.",
    ],
    astuce: "Une boîte de lentilles cuites rincée fait le même travail qu'une cuisson d'une heure, un soir où tu rentres tard.",
  },
  "din-assiette-mezze": {
    etapes: [
      "Dispose le houmous dans un ramequin, arrose d'huile et saupoudre de paprika.",
      "Assaisonne les haricots blancs de citron, d'ail et de persil.",
      "Ajoute le concombre, la tomate en quartiers et les olives, sers avec le pain pita.",
    ],
    astuce: "Végétalien et sans cuisson. Tout se prépare dans une boîte le matin et se mange froid le soir.",
  },
  "din-salade-quinoa-pois-chiches": {
    etapes: [
      "Mélange le quinoa refroidi et les pois chiches rincés.",
      "Ajoute les tomates cerises coupées en deux et la roquette.",
      "Assaisonne au citron, à l'huile d'olive et au cumin.",
    ],
    astuce: "Cuis une grande casserole de quinoa le dimanche : elle sert trois salades dans la semaine.",
  },
  "din-assiette-saumon-fume": {
    etapes: [
      "Fais griller le pain et coupe-le en mouillettes.",
      "Assaisonne le fromage de chèvre frais de poivre, d'aneth et de citron.",
      "Dresse le saumon fumé et le concombre en rubans, arrose d'un filet d'huile.",
    ],
    astuce: "Un économe donne des rubans de concombre : ça change la texture d'une assiette froide sans rien coûter.",
  },
  "din-salade-poulet-riz": {
    etapes: [
      "Utilise un reste de riz et de poulet cuits, bien froids.",
      "Ajoute le poivron en dés et le maïs rincé.",
      "Assaisonne à la moutarde, au vinaigre et à l'huile.",
    ],
    astuce: "Cuis toujours le double de riz : la salade du lendemain ne demande alors plus aucune cuisson.",
  },
  "din-salade-thon-pdt": {
    etapes: [
      "Coupe en rondelles des pommes de terre cuites la veille.",
      "Ajoute les haricots verts, la tomate en quartiers, le thon égoutté et les olives.",
      "Assaisonne d'huile, de vinaigre et d'échalote.",
    ],
    astuce: "Assaisonne les pommes de terre encore tièdes si tu peux : elles absorbent la vinaigrette au lieu de la laisser au fond.",
  },
  "pdj-bol-riz-fruits": {
    etapes: [
      "Délaye la protéine dans un fond d'eau ou de boisson végétale jusqu'à obtenir une crème.",
      "Mélange-la au riz cuit froid.",
      "Ajoute la banane en rondelles et les graines de courge.",
    ],
    astuce: "Sans aucun des huit allergènes du questionnaire, et sans allumer le feu.",
  },
  "pdj-compote-galettes": {
    etapes: [
      "Fouette la protéine avec la compote jusqu'à obtenir une crème lisse.",
      "Étale sur les galettes de riz.",
      "Parsème de graines de tournesol et de cannelle.",
    ],
    astuce: "Sans gluten, sans lait, sans œuf, sans soja et sans fruits à coque : le petit-déjeuner des profils les plus contraints.",
  },
  "col-banane-tournesol": {
    etapes: [
      "Mange la banane avec la compote.",
      "Ajoute les graines de tournesol par-dessus ou à part.",
    ],
    astuce: "Tout tient dans un sac de sport et rien ne craint la chaleur d'un casier.",
  },
  "col-yaourt-coco-fruits-rouges": {
    etapes: [
      "Fouette la protéine avec une cuillère de yaourt de coco, puis mélange au reste.",
      "Ajoute les fraises coupées et le miel.",
    ],
    astuce: "Sans lait et sans soja : la collation qui reste possible quand presque tout est exclu.",
  },
};
