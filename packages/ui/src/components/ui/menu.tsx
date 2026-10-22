import { Check } from "lucide-react";
import { DropdownMenu as MenuPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { overlayPlacement, overlaySurfaceClass } from "./overlay";

/** A list of actions behind one "…" button, e.g. a task row's actions (R02.1, A01.3, P2). */
export function Menu(props: ComponentProps<typeof MenuPrimitive.Root>) {
  return <MenuPrimitive.Root {...props} />;
}

/** Use `asChild` with `Button variant="ghost" size="icon" aria-label="More actions"`. */
export function MenuTrigger(props: ComponentProps<typeof MenuPrimitive.Trigger>) {
  return <MenuPrimitive.Trigger {...props} data-slot="menu-trigger" />;
}

export function MenuContent({
  className,
  align = "end",
  ...props
}: ComponentProps<typeof MenuPrimitive.Content>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        {...overlayPlacement()}
        {...props}
        align={align}
        data-slot="menu-content"
        className={cn(overlaySurfaceClass, "flex max-w-overlay flex-col p-inline", className)}
      />
    </MenuPrimitive.Portal>
  );
}

const itemClass = [
  "flex min-h-control cursor-default items-center gap-group rounded-control px-field-x outline-none select-none",
  "data-[highlighted]:bg-raised-hover focus-visible:focus-ring-field",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-disabled",
  "[&_svg]:size-icon [&_svg]:shrink-0 [&_svg]:stroke-icon",
].join(" ");

export interface MenuItemProps extends ComponentProps<typeof MenuPrimitive.Item> {
  /** danger: the item that deletes, written in `color-text-danger` (R02 code `.menu .danger`, P3). */
  tone?: "default" | "danger";
}

export function MenuItem({ className, tone = "default", ...props }: MenuItemProps) {
  return (
    <MenuPrimitive.Item
      {...props}
      data-slot="menu-item"
      className={cn(itemClass, tone === "danger" && "text-danger", className)}
    />
  );
}

/** An on/off item, e.g. "Ważne" or "Pilne" (backlog E02-S02). The check mark shows the state. */
export function MenuCheckboxItem({
  className,
  children,
  ...props
}: ComponentProps<typeof MenuPrimitive.CheckboxItem>) {
  return (
    <MenuPrimitive.CheckboxItem
      {...props}
      data-slot="menu-checkbox-item"
      className={cn(itemClass, className)}
    >
      <span className="flex size-icon items-center justify-center">
        <MenuPrimitive.ItemIndicator>
          <Check aria-hidden="true" />
        </MenuPrimitive.ItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
}

/** A 1px divider between groups of items, e.g. before "Delete". */
export function MenuSeparator({
  className,
  ...props
}: ComponentProps<typeof MenuPrimitive.Separator>) {
  return (
    <MenuPrimitive.Separator
      {...props}
      data-slot="menu-separator"
      className={cn("my-inline border-t border-divider", className)}
    />
  );
}
