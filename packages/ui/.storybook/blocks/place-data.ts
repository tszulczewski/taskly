import type { Place, PlaceText } from "../../src";

/**
 * Example places and simulated rules for the E02 stories (P1: the app supplies the real ones from
 * `@taskly/core`). The name rules are decision G4; the message texts are examples (E3).
 */

export const placeMessages = {
  name: "Enter a name.",
  tooLong: "Use at most 30 characters.",
  taken: "A place with this name already exists.",
  createFailed: "Could not create the place. Try again.",
  saveFailed: "Could not save the place. Try again.",
} as const;

/** Not empty, at most 30 characters, unique ignoring case (decision G4). */
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

export const bathroom: Place = { id: "bathroom", name: "Bathroom", color: 1 };
export const kitchen: Place = { id: "kitchen", name: "Kitchen", color: 2 };
export const hall: Place = { id: "hall", name: "Hall", color: 3 };
export const bedroom: Place = { id: "bedroom", name: "Bedroom", color: 4 };
export const livingRoom: Place = { id: "living", name: "Living room", color: 5 };
export const balcony: Place = { id: "balcony", name: "Balcony", color: 6 };

/** A typical flat: five places, colours given automatically. */
export const somePlaces: Place[] = [bathroom, kitchen, hall, bedroom, livingRoom];

/** Six places: the seventh asks for a colour (decision G4). */
export const sixPlaces: Place[] = [...somePlaces, balcony];

/** Ten places: the limit (decision G5). */
export const tenPlaces: Place[] = [
  ...sixPlaces,
  { id: "pantry-room", name: "Pantry", color: 7 },
  { id: "attic", name: "Attic", color: 8 },
  { id: "garage", name: "Garage", color: 9 },
  { id: "kids", name: "Kids' room", color: 10 },
];

/** The longest name the rules allow (30 characters). */
export const longPlace: Place = {
  id: "long",
  name: "Downstairs bathroom by the gym",
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
  usedBy: (name) => `używa go ${name}`,
  atLimit: "Możesz mieć najwyżej 10 miejsc. Usuń jedno, aby dodać kolejne.",
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

export const polishPlaces: Place[] = [
  { id: "pl-lazienka", name: "Łazienka", color: 1 },
  { id: "pl-kuchnia", name: "Kuchnia", color: 2 },
  { id: "pl-przedpokoj", name: "Przedpokój", color: 3 },
  { id: "pl-sypialnia", name: "Sypialnia", color: 4 },
];
