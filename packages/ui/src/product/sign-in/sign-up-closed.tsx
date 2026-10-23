import { Link } from "../../components/ui/link";

export interface SignUpClosedProps {
  signInHref: string;
  message?: string;
  signIn?: string;
}

/** What `/sign-up` shows while sign-up is closed: no form, one sentence and the way back (Q1). */
export function SignUpClosed({
  signInHref,
  message = "Sign-up is closed. Ask the owner of this Taskly.",
  signIn = "Sign in",
}: SignUpClosedProps) {
  return (
    <div data-slot="sign-up-closed" className="flex flex-col items-start gap-group">
      <p>{message}</p>
      <Link href={signInHref}>{signIn}</Link>
    </div>
  );
}
