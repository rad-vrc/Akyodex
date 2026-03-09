import { createElement } from 'react';

interface LoadingAnnouncementProps {
  text: string;
}

export function LoadingAnnouncement({ text }: LoadingAnnouncementProps) {
  return createElement(
    'div',
    {
      className:
        'fixed bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-full shadow-lg p-4 flex items-center gap-3 z-50',
      role: 'status',
      'aria-live': 'polite',
      'aria-atomic': 'true',
    },
    createElement('div', {
      className: 'animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-red-500',
      'aria-hidden': 'true',
    }),
    createElement(
      'span',
      { className: 'text-sm font-medium text-gray-700' },
      text,
    ),
  );
}
