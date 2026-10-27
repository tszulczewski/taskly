import { AuthCard, SignInForm, type SignInField, type SubmitResult } from "@taskly/ui";
import {
  messages,
  rateLimitedIn,
  validateSignIn,
} from "../../../../packages/ui/.storybook/blocks/fake-api";
import { usePageOpen, type ScreenProps } from "../page-open";
import { navigate } from "../screens";
import { retryAfterSeconds, wait } from "../server";
import { useDemo } from "../store";
import { AuthSkeleton } from "./auth-skeleton";
import { Gate } from "./gate";
import { SimulationNote } from "./simulation-note";

/** s01.11, decided by the agent in L10: a calm sentence, not an Alert (DS02). */
const expiredText = "Your session has expired. Sign in again.";

/** s01: sign-in (sign-in spec, UI/UX; DS screen S1). */
export function SignInScreen(props: ScreenProps) {
  const demo = useDemo();
  const open = usePageOpen(props);

  if (demo.owner) {
    return (
      <Gate
        state="s01.9"
        title={`Signed in as ${demo.owner.name}`}
        actions={[
          { label: "Go to the task list", onClick: () => navigate("s04") },
          { label: "Sign out (K1)", onClick: () => demo.switchAccount("K1") },
        ]}
      >
        A signed-in person who opens /sign-in is sent to the task list (/) by the server.
      </Gate>
    );
  }

  if (!open) return <AuthSkeleton title="Sign in" fields={2} />;

  const submit = async (values: {
    email: string;
    password: string;
  }): Promise<SubmitResult<SignInField>> => {
    const answer = demo.scenarios.signIn;
    await wait(demo.scenarios.delay);
    if (answer === "offline") throw new TypeError("Failed to fetch");
    if (answer === "rateLimited") return { ok: false, formError: rateLimitedIn(retryAfterSeconds) };
    if (answer === "wrong" || !demo.signIn(values.email, values.password)) {
      return { ok: false, formError: messages.wrongCredentials };
    }
    // Always the task list after signing in (sign-in spec, Q7).
    navigate("s04");
    return { ok: true };
  };

  return (
    <>
      <AuthCard title="Sign in">
        {demo.sessionEnd === "expired" ? (
          <p role="status" className="text-muted">
            {expiredText}
          </p>
        ) : null}
        <SignInForm
          validate={validateSignIn}
          onSubmit={submit}
          signUpHref={demo.scenarios.signUpOpen ? "#s02" : undefined}
        />
      </AuthCard>
      <SimulationNote>
        sign-in is simulated and nothing is sent. Use a demo account, e.g. marta@taskly.test /
        remont-demo-2026. Do not type a real password.
      </SimulationNote>
    </>
  );
}
