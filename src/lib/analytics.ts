import { logEvent } from 'firebase/analytics';
import { analyticsPromise } from '../firebase';

export const trackEvent = async (eventName: string, params?: Record<string, any>) => {
  const analytics = await analyticsPromise;
  if (analytics) {
    logEvent(analytics, eventName, params);
  }
};

export const analytics = {
  // Чат
  trackChatMessage: (count: number) => {
    trackEvent('chat_message_sent', { count });
    if (count === 1) trackEvent('chat_milestone_1');
    if (count === 5) trackEvent('chat_milestone_5');
    if (count === 10) trackEvent('chat_milestone_10');
  },

  // Поддержка
  trackSupportClick: () => {
    trackEvent('support_button_click');
  },

  // Формы
  trackFormSubmit: (formName: string) => {
    trackEvent('form_submission', { form_name: formName });
  },

  // Дневник
  trackJournalEntry: (type: 'morning' | 'evening') => {
    trackEvent(`journal_entry_${type}`);
  },

  // Цели
  trackGoalCreated: (title: string) => {
    trackEvent('goal_created', { goal_title: title });
  },

  trackPromiseClick: (goalTitle: string) => {
    trackEvent('goal_promise_click', { goal_title: goalTitle });
  }
};
