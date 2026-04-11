import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sun, Moon, Save, Edit2, Calendar, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { doc, onSnapshot, setDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/Button';
import { logAppEvent } from '../lib/events';
import { format, subDays, addDays, parseISO } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { cn } from '../lib/utils';

export const JournalPage: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [morning, setMorning] = useState({ q1: '', q2: '' });
  const [evening, setEvening] = useState({ q1: '', q2: '' });
  const [editing, setEditing] = useState({ morning: true, evening: true });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const dateLocale = language === 'ru' ? ru : enUS;
  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const dateDisplay = format(selectedDate, 'd MMMM, EEEE', { locale: dateLocale });
  const isToday = format(new Date(), 'yyyy-MM-dd') === dateKey;

  useEffect(() => {
    if (!user) return;

    // Fetch history list
    const fetchHistory = async () => {
      const q = query(
        collection(db, `users/${user.uid}/journal`),
        orderBy('date', 'desc'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      setHistory(snapshot.docs.map(doc => doc.id));
    };
    fetchHistory();

    const unsubscribe = onSnapshot(doc(db, `users/${user.uid}/journal/${dateKey}`), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setMorning(data.morning || { q1: '', q2: '' });
        setEvening(data.evening || { q1: '', q2: '' });
        setEditing({ morning: false, evening: false });
      } else {
        setMorning({ q1: '', q2: '' });
        setEvening({ q1: '', q2: '' });
        setEditing({ morning: true, evening: true });
      }
    });

    return unsubscribe;
  }, [user, dateKey]);

  const handleSave = async (type: 'morning' | 'evening') => {
    if (!user) return;
    
    try {
      await setDoc(doc(db, `users/${user.uid}/journal/${dateKey}`), {
        [type]: type === 'morning' ? morning : evening,
        date: dateKey,
      }, { merge: true });
      
      logAppEvent('journal_saved', { type, date: dateKey });
      setEditing(prev => ({ ...prev, [type]: false }));
      
      if (!history.includes(dateKey)) {
        setHistory(prev => [dateKey, ...prev].sort().reverse());
      }
    } catch (error) {
      console.error('Journal save error:', error);
    }
  };

  const navigateDate = (days: number) => {
    setSelectedDate(prev => addDays(prev, days));
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto pb-12">
      <header className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <Calendar size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('nav.journal')}</h1>
              <p className="text-sm text-gray-500 font-medium capitalize">{dateDisplay}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setShowHistory(!showHistory)} className={cn(showHistory && "bg-indigo-50 text-indigo-600")}>
              <History size={20} />
            </Button>
            <div className="flex bg-gray-50 rounded-xl p-1">
              <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-white rounded-lg transition-all text-gray-500">
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={() => setSelectedDate(new Date())} 
                disabled={isToday}
                className="px-3 text-xs font-bold text-gray-400 hover:text-indigo-600 disabled:opacity-0 transition-all"
              >
                {t('journal.today') || 'Today'}
              </button>
              <button 
                onClick={() => navigateDate(1)} 
                disabled={isToday}
                className="p-2 hover:bg-white rounded-lg transition-all text-gray-500 disabled:opacity-30"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        {showHistory && history.length > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="flex flex-wrap gap-2 pt-4 border-t border-gray-50"
          >
            {history.map(date => (
              <button
                key={date}
                onClick={() => {
                  setSelectedDate(parseISO(date));
                  setShowHistory(false);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-medium transition-all",
                  dateKey === date 
                    ? "bg-indigo-600 text-white" 
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                )}
              >
                {format(parseISO(date), 'd MMM', { locale: dateLocale })}
              </button>
            ))}
          </motion.div>
        )}
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
