import { AuthCard } from "@taskly/ui";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFormSkeleton } from "../../../components/auth/auth-form-skeleton";
import { SignInGate } from "../../../components/auth/auth-gates";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <AuthCard title="Sign in">
      <Suspense fallback={<AuthFormSkeleton />}>
        <SignInGate />
      </Suspense>
    </AuthCard>
  );
}
