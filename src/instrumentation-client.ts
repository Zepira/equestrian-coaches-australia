import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry-options";

/**
 * Error reporting in the browser: anything that breaks in a page after it
 * loads. Reports go through our own /monitoring address (tunnelRoute in
 * next.config.ts) so ad blockers don't drop them. Settings:
 * src/lib/sentry-options.ts.
 */
Sentry.init(sentryOptions);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
