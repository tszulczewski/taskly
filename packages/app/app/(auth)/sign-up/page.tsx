import { AuthCard } from "@taskly/ui";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFormSkeleton } from "../../../components/auth/auth-form-skeleton";
import { SignUpGate } from "../../../components/auth/auth-gates";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <AuthCard title="Create an account">
      <Suspense fallback={<AuthFormSkeleton />}>
        <SignUpGate />
      </Suspense>
    </AuthCard>
  );
}
