import { Suspense } from "react";
import { SignedInShell } from "../components/shell/signed-in-shell";

export default function Home() {
  return (
    <Suspense>
      <SignedInShell>
        <h1 className="text-heading font-strong">Your tasks will appear here</h1>
      </SignedInShell>
    </Suspense>
  );
}
