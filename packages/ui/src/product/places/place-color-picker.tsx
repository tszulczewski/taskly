"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { cn } from "../../lib/cn";
import { defaultPlaceText, type PlaceText } from "./text";
import { placeColors, placeDotClass, type Place, type PlaceColor } from "./types";

export interface PlaceColorPickerProps {
  value: PlaceColor;
  onValueChange: (color: PlaceColor) => void;
  /** Every place; colours another place uses are shown but cannot be chosen (Luki 3). */
  places: Place[];
  /** The place being edited keeps its own colour available. */
  placeId?: string;
  /** Names the group, e.g. "Colour". */
  label: string;
  text?: Partial<PlaceText>;
}

/** One of the ten place colours, each named in words; a colour in use is disabled (Luki 3, G4). */
export function PlaceColorPicker({
  value,
  onValueChange,
  places,
  placeId,
  label,
  text,
}: PlaceColorPickerProps) {
  const t = { ...defaultPlaceText, ...text };
  return (
    <RadioGroupPrimitive.Root
      data-slot="place-color-picker"
      aria-label={label}
      value={String(value)}
      onValueChange={(next) => onValueChange(Number(next) as PlaceColor)}
      className="flex flex-wrap"
    >
      {placeColors.map((color) => {
        const owner = places.find((place) => place.color === color && place.id !== placeId);
        const name = t.colorNames[color];
        return (
          <RadioGroupPrimitive.Item
            key={color}
            value={String(color)}
            disabled={owner !== undefined}
            aria-label={owner ? `${name}, ${t.usedBy(owner.name)}` : name}
            className={cn(
              "group inline-flex size-touch shrink-0 items-center justify-center rounded-control outline-none",
              "disabled:pointer-events-none disabled:opacity-disabled",
            )}
          >
            <span
              className={cn(
                "size-icon rounded-full",
                placeDotClass[color],
                "group-data-[state=checked]:swatch-selected group-focus-visible:focus-ring",
              )}
            />
          </RadioGroupPrimitive.Item>
        );
      })}
    </RadioGroupPrimitive.Root>
  );
}
