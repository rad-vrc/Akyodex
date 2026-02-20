type SentryLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';

type SentryCaptureContext = {
  level?: SentryLevel;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  fingerprint?: string[];
};

type SentryClient = {
  captureException?: (error: unknown, captureContext?: SentryCaptureContext) => string;
  captureMessage?: (message: string, captureContext?: SentryCaptureContext) => string;
};

declare global {
  interface Window {
    Sentry?: SentryClient;
  }
}

function getSentryClient(): SentryClient | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return window.Sentry;
}

export function captureExceptionSafely(
  error: unknown,
  captureContext?: SentryCaptureContext
): void {
  const sentry = getSentryClient();
  if (!sentry?.captureException) {
    return;
  }

  try {
    sentry.captureException(error, captureContext);
  } catch {
    // Ignore client-side Sentry failures to avoid cascading errors.
  }
}

export function captureMessageSafely(
  message: string,
  captureContext?: SentryCaptureContext
): void {
  const sentry = getSentryClient();
  if (!sentry?.captureMessage) {
    return;
  }

  try {
    sentry.captureMessage(message, captureContext);
  } catch {
    // Ignore client-side Sentry failures to avoid cascading errors.
  }
}
