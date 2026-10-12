import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry-options";

/**
 * Error reporting on the server and the edge (the proxy). Next.js calls
 * register() once per runtime as it starts; onRequestError reports any error
 * thrown while rendering a page, in a route handler or in a server action,
 * which is how a server-side failure reaches Sentry and its email alert.
 * Settings: src/lib/sentry-options.ts.
 */
export function register() {
  Sentry.init(sentryOptions);
}

export const onRequestError = Sentry.captureRequestError;
