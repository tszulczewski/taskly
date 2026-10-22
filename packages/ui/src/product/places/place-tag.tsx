import { cn } from "../../lib/cn";
import { placeDotClass, type Place } from "./types";

export interface PlaceTagProps {
  place: Pick<Place, "name" | "color">;
  className?: string;
}

/**
 * A place in a row: a small coloured dot beside its name, in the surrounding text colour. The
 * name carries the meaning; the dot only helps the eye (Q3, Luki 3, tokens rules 2–3).
 */
export function PlaceTag({ place, className }: PlaceTagProps) {
  return (
    <span data-slot="place-tag" className={cn("inline-flex items-center gap-inline", className)}>
      <span
        aria-hidden="true"
        className={cn("size-dot shrink-0 rounded-full", placeDotClass[place.color])}
      />
      {place.name}
    </span>
  );
}
