"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { cn } from "../../lib/cn";
import { defaultPlaceText, type PlaceText } from "./text";
import { placeColors, placeDotClass, type PlaceColor } from "./types";

export interface PlaceColorPickerProps {
  value: PlaceColor;
  onValueChange: (color: PlaceColor) => void;
  /** Names the group, e.g. "Colour". */
  label: string;
  text?: Partial<PlaceText>;
}

/**
 * One of the ten place colours, each named in words. Every colour can be chosen: from the eleventh
 * place colours repeat, so one already in use is not blocked (D26; the name always stands beside
 * the dot, Luki 3).
 */
export function PlaceColorPicker({ value, onValueChange, label, text }: PlaceColorPickerProps) {
  const t = { ...defaultPlaceText, ...text };
  return (
    <RadioGroupPrimitive.Root
      data-slot="place-color-picker"
      aria-label={label}
      value={String(value)}
      onValueChange={(next) => onValueChange(Number(next) as PlaceColor)}
      className="flex flex-wrap"
    >
      {placeColors.map((color) => (
        <RadioGroupPrimitive.Item
          key={color}
          value={String(color)}
          aria-label={t.colorNames[color]}
          // Focus rings the whole target and "chosen" rings the dot, so the two never look alike
          // and a focused chosen swatch shows both (WCAG 2.4.7).
          className="group inline-flex size-touch shrink-0 items-center justify-center rounded-control outline-none focus-visible:focus-ring"
        >
          <span
            className={cn(
              "size-icon rounded-full",
              placeDotClass[color],
              "group-data-[state=checked]:swatch-selected",
            )}
          />
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}
