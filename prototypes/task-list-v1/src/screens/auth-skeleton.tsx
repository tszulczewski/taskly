import { AuthCard, Skeleton } from "@taskly/ui";

/**
 * s01.12, s02.12, s03.3: the sign-in pages while the session is read (L12, decision DS03).
 * DESIGN-SYSTEM GAP (report: DS03): `AuthCard` has no loading state yet. This is the simplest
 * version from existing parts: the card with its heading and static Skeleton bars where the
 * labels, fields and button go, sized with token utilities only.
 */
export function AuthSkeleton({ title, fields }: { title: string; fields: number }) {
  return (
    <AuthCard title={title}>
      <div aria-busy="true" className="flex flex-col gap-between-groups">
        {Array.from({ length: fields }, (_, index) => (
          <div key={index} className="flex flex-col gap-inline">
            <Skeleton className="w-1/3" />
            <Skeleton className="h-control" />
          </div>
        ))}
        <Skeleton className="h-control w-1/3" />
        <span role="status" className="sr-only">
          Loading…
        </span>
      </div>
    </AuthCard>
  );
}
