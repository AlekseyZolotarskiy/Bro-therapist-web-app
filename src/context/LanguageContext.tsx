import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'ru' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  ru: {
    'app.name': 'Бро Терапевт',
    'nav.chat': 'Чат',
    'nav.journal': 'Дневник',
    'nav.goals': 'Цели',
    'nav.profile': 'Профиль',
    'auth.login': 'Войти через Google',
    'auth.logout': 'Выйти',
    'journal.morning': 'Утро',
    'journal.evening': 'Вечер',
    'journal.morning_q1': 'Что я собираюсь сделать сегодня и почему это важно?',
    'journal.morning_q2': 'Почему я выбираю прожить этот день именно так?',
    'journal.evening_q1': 'Как прошел мой день? Насколько я доволен?',
    'journal.evening_q2': 'Что я чувствую прямо сейчас?',
    'journal.save': 'Сохранить',
    'journal.edit': 'Редактировать',
    'goals.add': 'Добавить цель',
    'goals.title': 'Название цели',
    'goals.deadline': 'Дедлайн',
    'goals.tasks': 'Задачи',
    'goals.report': 'Отчет ИИ',
    'chat.placeholder': 'Напиши мне, бро...',
    'chat.new': 'Новый чат',
    'common.save': 'Сохранить',
    'common.cancel': 'Отмена',
    'common.delete': 'Удалить',
  },
  en: {
    'app.name': 'Bro Therapist',
    'nav.chat': 'Chat',
    'nav.journal': 'Journal',
    'nav.goals': 'Goals',
    'nav.profile': 'Profile',
    'auth.login': 'Sign in with Google',
    'auth.logout': 'Logout',
    'journal.morning': 'Morning',
    'journal.evening': 'Evening',
    'journal.morning_q1': 'What am I going to do today and why does it matter?',
    'journal.morning_q2': 'Why do I choose to live this day this way?',
    'journal.evening_q1': 'How was my day? How satisfied am I?',
    'journal.evening_q2': 'What do I feel right now?',
    'journal.save': 'Save',
    'journal.edit': 'Edit',
    'goals.add': 'Add Goal',
    'goals.title': 'Goal Title',
    'goals.deadline': 'Deadline',
    'goals.tasks': 'Tasks',
    'goals.report': 'AI Report',
    'chat.placeholder': 'Write to me, bro...',
    'chat.new': 'New Chat',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'ru';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key: string) => translations[language][key] || key;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
