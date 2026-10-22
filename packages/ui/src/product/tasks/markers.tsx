export interface MarkersProps {
  important?: boolean;
  urgent?: boolean;
  importantText?: string;
  urgentText?: string;
}

/**
 * The two independent markers of a task (D07): plain words in the meta line's muted colour, no
 * icon and no accent colour (Luki 4). Renders nothing when neither is set.
 */
export function Markers({
  important = false,
  urgent = false,
  importantText = "Important",
  urgentText = "Urgent",
}: MarkersProps) {
  return (
    <>
      {important ? <span data-slot="marker">{importantText}</span> : null}
      {urgent ? <span data-slot="marker">{urgentText}</span> : null}
    </>
  );
}
