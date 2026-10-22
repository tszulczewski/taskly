import { Moon, Sun } from "lucide-react";
import { RadioGroup, RadioGroupSegment } from "../../components/ui/radio-group";

export type Theme = "dark" | "light";

export interface ThemeToggleText {
  label: string;
  dark: string;
  light: string;
}

const defaultText: ThemeToggleText = { label: "Theme", dark: "Dark", light: "Light" };

export interface ThemeToggleProps {
  value: Theme;
  /** The app stores the choice and sets `data-theme` on the root element. */
  onValueChange: (theme: Theme) => void;
  text?: Partial<ThemeToggleText>;
}

/**
 * Dark / Light, two positions, no "system" (Q1, Luki 2). Below 640px only the icons show and the
 * words stay as the segments' names (R02.11: the top bar narrows to the name and icons).
 */
export function ThemeToggle({ value, onValueChange, text }: ThemeToggleProps) {
  const t = { ...defaultText, ...text };
  return (
    <RadioGroup
      aria-label={t.label}
      variant="segmented"
      value={value}
      onValueChange={(next) => onValueChange(next === "light" ? "light" : "dark")}
    >
      <RadioGroupSegment value="dark">
        <Moon aria-hidden="true" />
        <span className="sr-only wide:not-sr-only">{t.dark}</span>
      </RadioGroupSegment>
      <RadioGroupSegment value="light">
        <Sun aria-hidden="true" />
        <span className="sr-only wide:not-sr-only">{t.light}</span>
      </RadioGroupSegment>
    </RadioGroup>
  );
}
