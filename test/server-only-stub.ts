// Remplace le paquet `server-only` sous Vitest. Ce paquet lève dès qu'il est
// importé hors d'un composant serveur React, ce qui empêcherait de tester la
// logique pure des modules serveur. Le code de production garde le vrai garde-fou.
export {};
