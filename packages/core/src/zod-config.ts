import { z } from "zod";

// Zod builds fast object parsers with `new Function` unless it is told not to. The app's CSP has
// no 'unsafe-eval' (threat T-07), so Zod's check for it is refused, and the browser reports a CSP
// violation on every page.
z.config({ jitless: true });
