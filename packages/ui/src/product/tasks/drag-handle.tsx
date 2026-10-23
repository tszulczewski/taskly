import { GripVertical } from "lucide-react";
import { Button, type ButtonProps } from "../../components/ui/button";
import { cn } from "../../lib/cn";

export type DragHandleProps = Omit<ButtonProps, "size" | "variant" | "children" | "aria-label"> & {
  /** What it moves, e.g. "Move “Seal the bath”". */
  label: string;
};

/**
 * The six-dot grip a row is dragged by (R02.1, tokens rule 11), and the keyboard way to move it:
 * Space or Enter picks the row up, the arrow keys move it, Space or Enter drops it, Escape
 * cancels. A 44 × 44 px target; the row hides it below 640px (decision G2).
 */
export function DragHandle({ label, className, ...props }: DragHandleProps) {
  return (
    <Button
      {...props}
      variant="ghost"
      size="icon"
      aria-label={label}
      data-drag-handle=""
      className={cn("cursor-grab touch-none active:cursor-grabbing", className)}
    >
      <GripVertical aria-hidden="true" />
    </Button>
  );
}
