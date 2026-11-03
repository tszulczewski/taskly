import { placeColors, type Place, type PlaceColor, type PlaceText } from "../../src";

/**
 * Example places and simulated rules for the E02 stories (P1: the app supplies the real ones from
 * `@taskly/core`). The places are the predefined Polish ones and the owner's own (D26: names are the
 * owner's data, so they stay Polish in the English stories). The name rules are decision G4; the
 * message texts are examples (E3).
 */

export const placeMessages = {
  name: "Enter a name.",
  tooLong: "Use at most 30 characters.",
  taken: "A place with this name already exists.",
  createFailed: "Could not create the place. Try again.",
  saveFailed: "Could not save the place. Try again.",
} as const;

/** Not empty, at most 30 characters, unique ignoring case (decision G4, D26). */
export const placeNameRule =
  (places: Place[]) =>
  (name: string, placeId?: string): string | undefined => {
    const value = name.trim();
    if (value === "") return placeMessages.name;
    if (value.length > 30) return placeMessages.tooLong;
    const taken = places.some(
      (place) => place.id !== placeId && place.name.toLowerCase() === value.toLowerCase(),
    );
    return taken ? placeMessages.taken : undefined;
  };

/** The predefined places every owner starts with, coloured in turn (D26). */
export const livingRoom: Place = { id: "living", name: "Salon", color: 1 };
export const bedroom: Place = { id: "bedroom", name: "Sypialnia", color: 2 };
export const bathroom: Place = { id: "bathroom", name: "Łazienka", color: 3 };
export const kitchen: Place = { id: "kitchen", name: "Kuchnia", color: 4 };
export const garage: Place = { id: "garage", name: "Garaż", color: 5 };
export const garden: Place = { id: "garden", name: "Ogródek", color: 6 };
export const attic: Place = { id: "attic", name: "Strych", color: 7 };
export const office: Place = { id: "office", name: "Biuro", color: 8 };

export const predefinedPlaces: Place[] = [
  livingRoom,
  bedroom,
  bathroom,
  kitchen,
  garage,
  garden,
  attic,
  office,
];

/** Places the owner added: the ninth and tenth colours, then the colours repeat (D26). */
export const hall: Place = { id: "hall", name: "Przedpokój", color: 9 };
export const diningRoom: Place = { id: "dining", name: "Jadalnia", color: 10 };

/**
 * The places of an owner whose organized list uses `hall`: a picker must list every place a task
 * already has, or the owner could not see or remove it.
 */
export const organizedPlaces: Place[] = [...predefinedPlaces, hall];

/** Twenty places: the limit (D26); from the eleventh the colours repeat. */
export const twentyPlaces: Place[] = [
  ...predefinedPlaces,
  hall,
  diningRoom,
  { id: "pantry", name: "Spiżarnia", color: 1 },
  { id: "kids", name: "Pokój dziecięcy", color: 2 },
  { id: "toilet", name: "Toaleta", color: 3 },
  { id: "laundry", name: "Pralnia", color: 4 },
  { id: "balcony", name: "Balkon", color: 5 },
  { id: "terrace", name: "Taras", color: 6 },
  { id: "boiler", name: "Kotłownia", color: 7 },
  { id: "cellar", name: "Piwnica", color: 8 },
  { id: "porch", name: "Wiatrołap", color: 9 },
  { id: "study", name: "Gabinet", color: 10 },
];

/**
 * The colour the simulated server gives a new place: the least used one, the lowest number on a
 * tie, so the colours go round in turn and a deleted place's colour is reused first (D26).
 */
export function nextPlaceColor(places: Place[]): PlaceColor {
  const uses = (color: PlaceColor) => places.filter((place) => place.color === color).length;
  return placeColors.reduce((best, color) => (uses(color) < uses(best) ? color : best));
}

/** The longest name the rules allow (30 characters). */
export const longPlace: Place = {
  id: "long",
  name: "Łazienka na parterze przy holu",
  color: 9,
};

/** Polish text for the place components, to check lengths (P5); wording is a proposal. */
export const polishPlaceText: Partial<PlaceText> = {
  placesFor: (title) => `Miejsca „${title}”`,
  noPlaces: "Nie ma jeszcze miejsc.",
  newPlace: "Nowe miejsce",
  create: "Utwórz",
  creating: "Tworzenie…",
  color: "Kolor",
  colorNames: {
    1: "Niebieski",
    2: "Ochra",
    3: "Terakota",
    4: "Zielony",
    5: "Fioletowy",
    6: "Różowy",
    7: "Oliwkowy",
    8: "Śliwkowy",
    9: "Turkusowy",
    10: "Szaroniebieski",
  },
  atLimit: "Możesz mieć najwyżej 20 miejsc. Usuń jedno, aby dodać kolejne.",
  editPlaces: "Edytuj miejsca",
  back: "Wróć do wyboru",
  edit: "Edytuj",
  editPlace: (name) => `Edytuj ${name}`,
  name: "Nazwa",
  save: "Zapisz",
  saving: "Zapisywanie…",
  cancel: "Anuluj",
  deletePlace: "Usuń miejsce",
  deleteQuestion: (name) => `Usunąć „${name}”? Zniknie ze wszystkich zadań.`,
  deleting: "Usuwanie…",
  deleteError: "Nie udało się usunąć miejsca. Spróbuj ponownie.",
  unexpectedError: "Coś poszło nie tak. Spróbuj ponownie.",
};
