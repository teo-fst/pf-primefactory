import itMessages from "../../../messages/admin.it.json";

// Testi del pannello. Oggi solo in italiano (il pannello lo usano i soci), ma con la stessa
// struttura delle altre aree: per aggiungere l'inglese crea messages/admin.en.json con le stesse
// chiavi e scegli il file in base a `locale`. I testi arrivano ai componenti client come proprietà
// (come fa il modulo d'interesse): non finiscono nel bundle delle pagine pubbliche.
export type AdminMessages = (typeof itMessages)["admin"];

export function getAdminMessages(locale?: string): AdminMessages {
  void locale;
  return itMessages.admin;
}
