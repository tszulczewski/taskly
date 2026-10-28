import { cva } from "class-variance-authority";
import type { ComponentProps, MouseEvent } from "react";
import { cn } from "../../lib/cn";

const buttonVariants = cva(
  [
    "inline-flex min-h-control min-w-0 items-center justify-center gap-group rounded-control border",
    "font-base text-body leading-body font-strong text-center",
    "transition-colors duration-quick ease-standard outline-none focus-visible:focus-ring",
    "disabled:pointer-events-none disabled:opacity-disabled",
    "aria-disabled:pointer-events-none aria-disabled:opacity-disabled",
    "[&_svg]:size-icon [&_svg]:shrink-0 [&_svg]:stroke-icon",
  ],
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-action text-on-action hover:bg-action-hover active:bg-action-hover",
        secondary: "border-control text-primary hover:bg-raised active:bg-raised",
        danger: "border-control text-danger hover:bg-raised active:bg-raised",
        ghost:
          "border-transparent text-muted hover:bg-raised hover:text-primary active:bg-raised active:text-primary",
      },
      size: {
        default: "px-control-x py-inline",
        icon: "size-touch",
      },
    },
  },
);

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonBaseProps extends ComponentProps<"button"> {
  /**
   * primary: the one main action of a screen or form. secondary: other actions, including Cancel.
   * danger: the confirming action that deletes something (P3). ghost: icon buttons and quiet
   * actions in the header or a row.
   */
  variant?: ButtonVariant;
  /**
   * Waiting for the server: shows a spinner, keeps focus and ignores further clicks. Change the
   * label to say what is happening ("Signing in…").
   */
  loading?: boolean;
}

interface TextButtonProps extends ButtonBaseProps {
  size?: "default";
}

interface IconButtonProps extends ButtonBaseProps {
  /** A `touch-target-min` square (44px on phones, 36px from 640px) with one 20 px icon. */
  size: "icon";
  /** An icon button has no visible text, so its name is required. */
  "aria-label": string;
}

export type ButtonProps = TextButtonProps | IconButtonProps;

export function Button({
  className,
  variant = "secondary",
  size = "default",
  loading = false,
  type = "button",
  onClick,
  children,
  ...props
}: ButtonProps) {
  // While loading the button stays focusable (aria-disabled, not disabled), so keyboard users
  // keep their place; the click is cancelled so a submit button cannot send the form twice.
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (loading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <button
      {...props}
      type={type}
      data-slot="button"
      data-variant={variant}
      aria-busy={loading || undefined}
      aria-disabled={loading || props["aria-disabled"] || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      onClick={handleClick}
    >
      {loading ? <span data-slot="spinner" aria-hidden="true" className="spinner" /> : null}
      {children}
    </button>
  );
}
