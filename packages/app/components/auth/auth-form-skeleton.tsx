import { Skeleton } from "@taskly/ui";

export type AuthFormSkeletonVariant = "sign-in" | "sign-up";

interface SkeletonLayout {
  /** One entry per field; `true` when the field has a hint line under it. */
  fields: boolean[];
  footerLink: boolean;
}

// Sign-in matches the form without "Create an account": sign-up is closed by default, so that is
// the usual state. Sign-up matches the open form; the closed message is shorter and the card
// shrinks once when it arrives.
const layouts: Record<AuthFormSkeletonVariant, SkeletonLayout> = {
  "sign-in": { fields: [false, false], footerLink: false },
  "sign-up": { fields: [false, false, true], footerLink: true },
};

export interface AuthFormSkeletonProps {
  variant: AuthFormSkeletonVariant;
}

/**
 * Inside `AuthCard` while the visitor's session is checked: the fields, hint, button and footer
 * link of that page's form, as high as the real ones, so the card does not jump when it arrives.
 */
export function AuthFormSkeleton({ variant }: AuthFormSkeletonProps) {
  const { fields, footerLink } = layouts[variant];
  return (
    <div
      data-slot="auth-form-skeleton"
      data-variant={variant}
      className="flex flex-col gap-between-groups"
    >
      {fields.map((hint, index) => (
        <div key={index} data-slot="auth-form-skeleton-field" className="flex flex-col gap-inline">
          <Skeleton className="w-1/3" />
          <Skeleton className="min-h-control" />
          {hint ? <Skeleton className="w-1/2 text-meta" /> : null}
        </div>
      ))}
      <Skeleton className="min-h-control wide:w-1/3" />
      {footerLink ? <Skeleton className="w-1/3" /> : null}
      <span role="status" className="sr-only">
        Loading…
      </span>
    </div>
  );
}
