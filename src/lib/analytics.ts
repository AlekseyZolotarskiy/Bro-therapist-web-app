import { logEvent } from 'firebase/analytics';
import { analyticsPromise } from '../firebase';
import { logAppEvent } from './events';

export const trackEvent = async (eventName: string, params?: Record<string, any>) => {
  const analytics = await analyticsPromise;
  if (analytics) {
    logEvent(analytics, eventName, params);
  }
};

export const analytics = {
  // Auth
  trackLogin: () => {
    trackEvent('login');
    logAppEvent('login', {}, true);
  },

  // Чат
  trackChatMessage: (count: number) => {
    trackEvent('chat_message_sent', { count });
    if (count === 1) {
      trackEvent('chat_milestone_1');
      logAppEvent('chat_milestone', { count: 1 }, true);
    }
    if (count === 5) {
      trackEvent('chat_milestone_5');
      logAppEvent('chat_milestone', { count: 5 }, true);
    }
    if (count === 10) {
      trackEvent('chat_milestone_10');
      logAppEvent('chat_milestone', { count: 10 }, true);
    }
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
    const eventName = `journal_entry_${type}`;
    trackEvent(eventName);
    logAppEvent('journal_saved', { type }, true);
  },

  // Цели
  trackGoalCreated: (params: { 
    title: string; 
    tasksCount: number; 
    isPromise: boolean; 
    durationDays: number;
  }) => {
    trackEvent('goal_created', {
      goal_title: params.title,
      tasks_count: params.tasksCount,
      is_promise: params.isPromise,
      duration_days: params.durationDays
    });
    logAppEvent(params.isPromise ? 'promise_created' : 'goal_created', params, true);
  },

  trackGoalCompleted: (params: { title: string; onTime: boolean }) => {
    trackEvent('goal_completed', {
      goal_title: params.title,
      on_time: params.onTime
    });
    logAppEvent('goal_completed', params, true);
  },

  trackPromiseClick: (goalTitle: string) => {
    trackEvent('goal_promise_click', { goal_title: goalTitle });
  }
};
