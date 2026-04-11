import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sun, Moon, Save, Edit2, Calendar } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/Button';
import { logAppEvent } from '../lib/events';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';

export const JournalPage: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [morning, setMorning] = useState({ q1: '', q2: '' });
  const [evening, setEvening] = useState({ q1: '', q2: '' });
  const [editing, setEditing] = useState({ morning: true, evening: true });

  const dateLocale = language === 'ru' ? ru : enUS;
  const todayDate = format(new Date(), 'yyyy-MM-dd');
  const todayDisplay = format(new Date(), 'd MMMM, EEEE', { locale: dateLocale });

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, `users/${user.uid}/journal/${todayDate}`), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.morning) {
          setMorning(data.morning);
          setEditing(prev => ({ ...prev, morning: false }));
        }
        if (data.evening) {
          setEvening(data.evening);
          setEditing(prev => ({ ...prev, evening: false }));
        }
      }
    });

    return unsubscribe;
  }, [user, todayDate]);

  const handleSave = async (type: 'morning' | 'evening') => {
    if (!user) return;
    
    try {
      await setDoc(doc(db, `users/${user.uid}/journal/${todayDate}`), {
        [type]: type === 'morning' ? morning : evening,
        date: todayDate,
      }, { merge: true });
      
      logAppEvent('journal_saved', { type });
      setEditing(prev => ({ ...prev, [type]: false }));
    } catch (error) {
      console.error('Journal save error:', error);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-12">
      <header className="flex items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
            <Calendar size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('nav.journal')}</h1>
            <p className="text-sm text-gray-500 font-medium capitalize">{todayDisplay}</p>
          </div>
        </div>
      </header>

      <section className="space-y-4">
        <div className="flex items-center gap-2 text-amber-500 mb-2">
          <Sun size={20} />
          <h2 className="text-lg font-bold">{t('journal.morning')}</h2>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{t('journal.morning_q1')}</label>
            <textarea
              value={morning.q1}
              onChange={(e) => setMorning(prev => ({ ...prev, q1: e.target.value }))}
              disabled={!editing.morning}
              className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-amber-500 transition-all min-h-[100px] resize-none disabled:bg-transparent disabled:px-0"
              placeholder="..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{t('journal.morning_q2')}</label>
            <textarea
              value={morning.q2}
              onChange={(e) => setMorning(prev => ({ ...prev, q2: e.target.value }))}
              disabled={!editing.morning}
              className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-amber-500 transition-all min-h-[100px] resize-none disabled:bg-transparent disabled:px-0"
              placeholder="..."
            />
          </div>
          <div className="flex justify-end">
            {editing.morning ? (
              <Button onClick={() => handleSave('morning')} className="bg-amber-500 hover:bg-amber-600 gap-2">
                <Save size={18} />
                {t('journal.save')}
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setEditing(prev => ({ ...prev, morning: true }))} className="gap-2">
                <Edit2 size={18} />
                {t('journal.edit')}
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 text-indigo-500 mb-2">
          <Moon size={20} />
          <h2 className="text-lg font-bold">{t('journal.evening')}</h2>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{t('journal.evening_q1')}</label>
            <textarea
              value={evening.q1}
              onChange={(e) => setEvening(prev => ({ ...prev, q1: e.target.value }))}
              disabled={!editing.evening}
              className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all min-h-[100px] resize-none disabled:bg-transparent disabled:px-0"
              placeholder="..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{t('journal.evening_q2')}</label>
            <textarea
              value={evening.q2}
              onChange={(e) => setEvening(prev => ({ ...prev, q2: e.target.value }))}
              disabled={!editing.evening}
              className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all min-h-[100px] resize-none disabled:bg-transparent disabled:px-0"
              placeholder="..."
            />
          </div>
          <div className="flex justify-end">
            {editing.evening ? (
              <Button onClick={() => handleSave('evening')} className="gap-2">
                <Save size={18} />
                {t('journal.save')}
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setEditing(prev => ({ ...prev, evening: true }))} className="gap-2">
                <Edit2 size={18} />
                {t('journal.edit')}
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
