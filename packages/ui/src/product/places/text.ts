import type { PlaceColor } from "./types";

/** Every string the place components show; pass a `Partial` to translate. */
export interface PlaceText {
  placesFor: (title: string) => string;
  noPlaces: string;
  newPlace: string;
  create: string;
  creating: string;
  color: string;
  colorNames: Record<PlaceColor, string>;
  atLimit: string;
  editPlaces: string;
  back: string;
  edit: string;
  /** The accessible name of a place's "Edit"; it starts with the visible word (WCAG 2.5.3). */
  editPlace: (name: string) => string;
  name: string;
  save: string;
  saving: string;
  cancel: string;
  deletePlace: string;
  deleteQuestion: (name: string) => string;
  deleting: string;
  deleteError: string;
  unexpectedError: string;
}

/** English first (P5); the words for colours are the raw token names (tokens, Luki 3). */
export const defaultPlaceText: PlaceText = {
  placesFor: (title) => `Places for “${title}”`,
  noPlaces: "No places yet.",
  newPlace: "New place",
  create: "Create",
  creating: "Creating…",
  color: "Colour",
  colorNames: {
    1: "Blue",
    2: "Ochre",
    3: "Terracotta",
    4: "Green",
    5: "Violet",
    6: "Pink",
    7: "Olive",
    8: "Plum",
    9: "Teal",
    10: "Slate",
  },
  atLimit: "You can have up to 20 places. Delete one to add another.",
  editPlaces: "Edit places",
  back: "Back to choosing",
  edit: "Edit",
  editPlace: (name) => `Edit ${name}`,
  name: "Name",
  save: "Save",
  saving: "Saving…",
  cancel: "Cancel",
  deletePlace: "Delete place",
  deleteQuestion: (name) => `Delete “${name}”? It is removed from every task.`,
  deleting: "Deleting…",
  deleteError: "Could not delete the place. Try again.",
  unexpectedError: "Something went wrong. Try again.",
};
