import { Skeleton } from "@taskly/ui";

const fields = ["first", "second"];

/**
 * Inside `AuthCard` while the visitor's session is checked: two fields and the button, as high as
 * the real ones, so the card does not jump when the form arrives.
 */
export function AuthFormSkeleton() {
  return (
    <div data-slot="auth-form-skeleton" className="flex flex-col gap-between-groups">
      {fields.map((field) => (
        <div key={field} className="flex flex-col gap-inline">
          <Skeleton className="w-1/3" />
          <Skeleton className="min-h-control" />
        </div>
      ))}
      <Skeleton className="min-h-control wide:w-1/3" />
      <span role="status" className="sr-only">
        Loading…
      </span>
    </div>
  );
}
