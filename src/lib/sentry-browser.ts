import * as Sentry from '@sentry/nextjs';

type SentryLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';

type SentryCaptureContext = {
  level?: SentryLevel;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  fingerprint?: string[];
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

  const nextQueue: PendingEvent[] = [];
  const pushRetry = (event: PendingEvent): void => {
    const attempts = event.attempts + 1;
    if (attempts < MAX_RETRY_ATTEMPTS) {
      nextQueue.push({ ...event, attempts });
    }
  };

  for (const event of pendingEvents) {
    try {
      if (event.type === 'exception') {
        Sentry.captureException(event.error, event.captureContext);
      } else {
        Sentry.captureMessage(event.message, event.captureContext);
      }
    } catch {
      pushRetry(event);
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
  flushPendingEvents();

  try {
    Sentry.captureException(error, captureContext);
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
  flushPendingEvents();

  try {
    Sentry.captureMessage(message, captureContext);
  } catch {
    enqueuePendingEvent({
      type: 'message',
      message,
      captureContext,
      attempts: 1,
    });
  }
}
