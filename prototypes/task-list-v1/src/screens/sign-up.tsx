import { useState } from "react";
import {
  AuthCard,
  SignUpClosed,
  SignUpForm,
  type SignUpField,
  type SignUpValues,
  type SubmitResult,
} from "@taskly/ui";
import {
  messages,
  rateLimitedIn,
  validateSignUp,
} from "../../../../packages/ui/.storybook/blocks/fake-api";
import { janSignUp } from "../data";
import { usePageOpen, type ScreenProps } from "../page-open";
import { navigate } from "../screens";
import { retryAfterSeconds, wait } from "../server";
import { useDemo, type Demo } from "../store";
import { AuthSkeleton } from "./auth-skeleton";
import { Gate } from "./gate";
import { SimulationNote } from "./simulation-note";

/** s02.7: the owner's wording for L11. */
const turnedOffText = "Sign-up has been turned off. Ask the owner of this Taskly.";

/** s01.9 / s02.10 / s03.2: a signed-in person never sees the sign-up page. */
function SignedInGate({ demo, state, name }: { demo: Demo; state: string; name: string }) {
  return (
    <Gate
      state={state}
      title={`Signed in as ${name}`}
      actions={[
        { label: "Go to the task list", onClick: () => navigate("s04") },
        { label: "Sign out (K1)", onClick: () => demo.switchAccount("K1") },
      ]}
    >
      A signed-in person who opens /sign-up is sent to the task list (/) by the server.
    </Gate>
  );
}

/** s02: sign-up while it is open (sign-in spec, UI/UX; DS screen S2). */
export function SignUpScreen(props: ScreenProps) {
  const demo = useDemo();
  const open = usePageOpen(props);
  // Sign-up turned off while this form was open (s02.7): the form stays, with the message.
  const [turnedOff, setTurnedOff] = useState(false);

  if (demo.owner) return <SignedInGate demo={demo} state="s02.10" name={demo.owner.name} />;

  if (!demo.scenarios.signUpOpen && !turnedOff) {
    return (
      <Gate
        state="P01"
        title="Sign-up is closed"
        actions={[
          { label: "Go to s03", onClick: () => navigate("s03") },
          { label: "Open sign-up (P01)", onClick: () => demo.setScenario("signUpOpen", true) },
        ]}
      >
        With sign-up closed (the default), /sign-up shows the closed page, s03.
      </Gate>
    );
  }

  if (!open) return <AuthSkeleton title="Create an account" fields={3} />;

  const submit = async (values: SignUpValues): Promise<SubmitResult<SignUpField>> => {
    const answer = demo.scenarios.signUp;
    await wait(demo.scenarios.delay);
    if (answer === "offline") throw new TypeError("Failed to fetch");
    if (answer === "rateLimited") return { ok: false, formError: rateLimitedIn(retryAfterSeconds) };
    if (answer === "rejected") return { ok: false, formError: messages.invalidSignUp };
    if (answer === "closed") {
      // The server turned sign-up off meanwhile, so it stays off for the next visit too.
      setTurnedOff(true);
      demo.setScenario("signUpOpen", false);
      return { ok: false, formError: turnedOffText };
    }
    // A used email gets the same answer as any refusal: no hint that the account exists.
    if (answer === "emailUsed" || !demo.signUp(values.name, values.email, values.password)) {
      return { ok: false, formError: messages.signUpFailed };
    }
    // The new account is signed in at once and lands on its empty list (s02.11).
    navigate("s04");
    return { ok: true };
  };

  return (
    <>
      <AuthCard title="Create an account">
        <SignUpForm validate={validateSignUp} onSubmit={submit} signInHref="#s01" />
      </AuthCard>
      <SimulationNote>
        no account is created anywhere and no email is sent. Try {janSignUp.name}, {janSignUp.email}
        , {janSignUp.password}. Do not type a real password.
      </SimulationNote>
    </>
  );
}

/** s03: sign-up closed, the default (sign-in spec, Q1; DS screen S3). */
export function SignUpClosedScreen(props: ScreenProps) {
  const demo = useDemo();
  const open = usePageOpen(props);

  if (demo.owner) return <SignedInGate demo={demo} state="s03.2" name={demo.owner.name} />;

  if (demo.scenarios.signUpOpen) {
    return (
      <Gate
        state="P01"
        title="Sign-up is open"
        actions={[
          { label: "Go to s02", onClick: () => navigate("s02") },
          { label: "Close sign-up (P01)", onClick: () => demo.setScenario("signUpOpen", false) },
        ]}
      >
        With sign-up open, /sign-up shows the form, s02.
      </Gate>
    );
  }

  if (!open) return <AuthSkeleton title="Create an account" fields={0} />;

  return (
    <AuthCard title="Create an account">
      <SignUpClosed signInHref="#s01" />
    </AuthCard>
  );
}
