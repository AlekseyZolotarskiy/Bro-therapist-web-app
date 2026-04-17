import React from 'react';
import { motion } from 'motion/react';
import { LogIn, ShieldCheck, Heart, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/Button';
import { BRO_AVATAR_URL } from '../constants';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const features = [
    { icon: ShieldCheck, text: language === 'ru' ? 'Конфиденциально и безопасно' : 'Confidential and secure' },
    { icon: Heart, text: language === 'ru' ? 'Поддержка 24/7' : '24/7 Support' },
    { icon: Sparkles, text: language === 'ru' ? 'ИИ-терапевт на базе КПТ' : 'AI Therapist based on CBT' },
  ];

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8"
      >
        <div className="space-y-4">
          <div className="mx-auto w-32 h-32 bg-indigo-100 rounded-3xl flex items-center justify-center shadow-inner overflow-hidden border-4 border-white">
            <img src={BRO_AVATAR_URL} alt="Bro" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">{t('app.name')}</h1>
          <p className="text-gray-500 text-lg">
            {language === 'ru' 
              ? 'Твой личный ИИ-терапевт, который всегда рядом. Поможем разобраться в мыслях и чувствах.' 
              : 'Your personal AI therapist, always there for you. Let\'s sort out your thoughts and feelings.'}
          </p>
        </div>

        <div className="space-y-4">
          <Button 
            onClick={login} 
            size="lg" 
            className="w-full h-14 text-lg gap-3"
          >
            <LogIn size={20} />
            {t('auth.login')}
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => setLanguage(language === 'ru' ? 'en' : 'ru')}
            className="w-full"
          >
            {language === 'ru' ? 'Switch to English' : 'Переключить на Русский'}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 pt-8">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="flex items-center gap-3 text-gray-600 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm"
            >
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <f.icon size={20} />
              </div>
              <span className="font-medium">{f.text}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
