import React from 'react';
import { motion } from 'motion/react';
import { MessageCircle, BookOpen, Target, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/Button';
import { cn } from '../lib/utils';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const cards = [
    { 
      path: '/chat', 
      icon: MessageCircle, 
      label: t('nav.chat'), 
      color: 'bg-indigo-500', 
      desc: language === 'ru' ? 'Поговори с бро-терапевтом' : 'Talk to your bro therapist' 
    },
    { 
      path: '/journal', 
      icon: BookOpen, 
      label: t('nav.journal'), 
      color: 'bg-amber-500', 
      desc: language === 'ru' ? 'Запиши свои мысли' : 'Write down your thoughts' 
    },
    { 
      path: '/goals', 
      icon: Target, 
      label: t('nav.goals'), 
      color: 'bg-emerald-500', 
      desc: language === 'ru' ? 'Ставь цели и достигай их' : 'Set goals and achieve them' 
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {language === 'ru' ? `Привет, ${user?.displayName?.split(' ')[0]}! 👋` : `Hey, ${user?.displayName?.split(' ')[0]}! 👋`}
          </h1>
          <p className="text-gray-500 font-medium">
            {language === 'ru' ? 'Как ты сегодня? Давай поработаем над собой.' : 'How are you today? Let\'s work on ourselves.'}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-2xl text-indigo-600 font-bold text-sm">
          <Sparkles size={18} />
          <span>Bro Premium</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card, i) => (
          <motion.div
            key={card.path}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link 
              to={card.path}
              className="group block bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all h-full"
            >
              <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center text-white mb-6 shadow-lg", card.color)}>
                <card.icon size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{card.label}</h2>
              <p className="text-gray-500 font-medium mb-6">{card.desc}</p>
              <div className="flex items-center gap-2 text-indigo-600 font-bold group-hover:gap-4 transition-all">
                <span>{language === 'ru' ? 'Перейти' : 'Go to'}</span>
                <ArrowRight size={20} />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <section className="bg-indigo-600 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <Sparkles size={200} />
        </div>
        <div className="max-w-xl space-y-6 relative z-10">
          <h2 className="text-3xl font-bold leading-tight">
            {language === 'ru' ? 'Твой путь к спокойствию начинается здесь.' : 'Your journey to peace starts here.'}
          </h2>
          <p className="text-indigo-100 text-lg font-medium leading-relaxed">
            {language === 'ru' 
              ? 'Используй КПТ-чат, чтобы разобраться с тревогами, и дневник, чтобы закрепить результат.' 
              : 'Use CBT chat to deal with anxieties and a journal to consolidate the result.'}
          </p>
          <Button variant="secondary" size="lg" className="h-14 px-8 text-indigo-600 font-bold rounded-2xl">
            {language === 'ru' ? 'Начать сессию' : 'Start Session'}
          </Button>
        </div>
      </section>
    </div>
  );
};
