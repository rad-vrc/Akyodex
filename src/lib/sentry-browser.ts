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

type PendingEvent =
  | {
    type: 'exception';
    error: unknown;
    captureContext?: SentryCaptureContext;
    attempts: number;
  }
  | {
    type: 'message';
    message: string;
    captureContext?: SentryCaptureContext;
    attempts: number;
  };

const MAX_PENDING_EVENTS = 30;
const MAX_RETRY_ATTEMPTS = 10;
const RETRY_DELAY_MS = 500;

let pendingEvents: PendingEvent[] = [];
let retryTimer: number | null = null;

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

function scheduleRetryFlush(): void {
  if (typeof window === 'undefined' || retryTimer) {
    return;
  }

  retryTimer = window.setTimeout(() => {
    retryTimer = null;
    flushPendingEvents();
  }, RETRY_DELAY_MS);
}

function enqueuePendingEvent(event: PendingEvent): void {
  if (pendingEvents.length >= MAX_PENDING_EVENTS) {
    pendingEvents.shift();
  }
  pendingEvents.push(event);
  scheduleRetryFlush();
}

function flushPendingEvents(): void {
  if (pendingEvents.length === 0) {
    return;
  }

  const sentry = getSentryClient();
  if (!sentry) {
    pendingEvents = pendingEvents
      .map((event) => ({ ...event, attempts: event.attempts + 1 }))
      .filter((event) => event.attempts < MAX_RETRY_ATTEMPTS);
    if (pendingEvents.length > 0) {
      scheduleRetryFlush();
    }
    return;
  }

  const nextQueue: PendingEvent[] = [];
  for (const event of pendingEvents) {
    try {
      if (event.type === 'exception') {
        if (sentry.captureException) {
          sentry.captureException(event.error, event.captureContext);
        }
      } else if (sentry.captureMessage) {
        sentry.captureMessage(event.message, event.captureContext);
      }
    } catch {
      const attempts = event.attempts + 1;
      if (attempts < MAX_RETRY_ATTEMPTS) {
        nextQueue.push({ ...event, attempts });
      }
    }
  }

  pendingEvents = nextQueue;
  if (pendingEvents.length > 0) {
    scheduleRetryFlush();
  }
}

export function captureExceptionSafely(
  error: unknown,
  captureContext?: SentryCaptureContext
): void {
  const sentry = getSentryClient();
  if (!sentry?.captureException) {
    enqueuePendingEvent({
      type: 'exception',
      error,
      captureContext,
      attempts: 0,
    });
    return;
  }

  flushPendingEvents();

  try {
    sentry.captureException(error, captureContext);
  } catch {
    enqueuePendingEvent({
      type: 'exception',
      error,
      captureContext,
      attempts: 1,
    });
  }
}

export function captureMessageSafely(
  message: string,
  captureContext?: SentryCaptureContext
): void {
  const sentry = getSentryClient();
  if (!sentry?.captureMessage) {
    enqueuePendingEvent({
      type: 'message',
      message,
      captureContext,
      attempts: 0,
    });
    return;
  }

  flushPendingEvents();

  try {
    sentry.captureMessage(message, captureContext);
  } catch {
    enqueuePendingEvent({
      type: 'message',
      message,
      captureContext,
      attempts: 1,
    });
  }
}
