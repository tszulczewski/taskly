import { useRef, useState } from "react";
import { PlacePicker, type NewPlaceValues, type Place, type PlaceText } from "../../src";
import { never } from "./fake-api";
import { nextPlaceColor, placeMessages, placeNameRule } from "./place-data";
import type { ServerMode } from "./TaskScreen";

export interface PlacePickerDemoProps {
  taskTitle?: string;
  initialPlaces: Place[];
  initialSelected?: string[];
  server?: ServerMode;
  /** How long the server takes, in ms. */
  delay?: number;
  text?: Partial<PlaceText>;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The place picker as the row's popover shows it (the overlay's raised panel and edge), with the places of the list
 * and the server simulated (P1): ticks apply at once; create, rename and delete wait for it. The
 * server colours a new place (D26, `nextPlaceColor`).
 */
export function PlacePickerDemo({
  taskTitle = "Hang the curtain rods",
  initialPlaces,
  initialSelected = [],
  server = "ok",
  delay = 500,
  text,
}: PlacePickerDemoProps) {
  const [places, setPlaces] = useState(initialPlaces);
  const [selected, setSelected] = useState(initialSelected);
  const nextId = useRef(0);

  const confirmed = async () => {
    if (server === "slow") await never();
    await wait(delay);
    return server === "ok";
  };

  return (
    <div className="max-w-measure rounded-surface border border-control bg-raised p-inset">
      <PlacePicker
        taskTitle={taskTitle}
        places={places}
        selectedIds={selected}
        onToggle={(placeId, assigned) =>
          setSelected((ids) => (assigned ? [...ids, placeId] : ids.filter((id) => id !== placeId)))
        }
        onCreate={async (values: NewPlaceValues) => {
          if (!(await confirmed())) return { ok: false, formError: placeMessages.createFailed };
          nextId.current += 1;
          const id = `new-place-${nextId.current}`;
          setPlaces((list) => [
            ...list,
            { id, name: values.name.trim(), color: nextPlaceColor(list) },
          ]);
          setSelected((ids) => [...ids, id]);
          return { ok: true };
        }}
        onUpdate={async (placeId, values) => {
          if (!(await confirmed())) return { ok: false, formError: placeMessages.saveFailed };
          setPlaces((list) =>
            list.map((place) =>
              place.id === placeId
                ? { ...place, name: values.name.trim(), color: values.color }
                : place,
            ),
          );
          return { ok: true };
        }}
        onDelete={async (placeId) => {
          if (!(await confirmed())) return false;
          setPlaces((list) => list.filter((place) => place.id !== placeId));
          setSelected((ids) => ids.filter((id) => id !== placeId));
          return true;
        }}
        validateName={placeNameRule(places)}
        atLimit={places.length >= 20}
        text={text}
      />
    </div>
  );
}
