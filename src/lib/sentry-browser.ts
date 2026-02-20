import * as Sentry from '@sentry/nextjs';
import type { SeverityLevel } from '@sentry/core';

type SentryCaptureContext = {
  level?: SeverityLevel;
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
const HAS_BROWSER_SENTRY_DSN = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);

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
  // With @sentry/nextjs module imports, Sentry.captureException / captureMessage are normally callable
  // once HAS_BROWSER_SENTRY_DSN is true, so this retry queue (pendingEvents, pushRetry, scheduleRetryFlush)
  // is a defensive safeguard only and capped by MAX_RETRY_ATTEMPTS.
  if (!HAS_BROWSER_SENTRY_DSN) {
    pendingEvents = [];
    return;
  }

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
  if (!HAS_BROWSER_SENTRY_DSN) {
    return;
  }

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
  if (!HAS_BROWSER_SENTRY_DSN) {
    return;
  }

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
