import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Plus, CheckCircle2, Circle, Trash2, Sparkles, Loader2, ShieldCheck, Clock, RefreshCw, DollarSign, MessageCircle } from 'lucide-react';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/Button';
import { generateGoalReport } from '../lib/gemini';
import { analytics } from '../lib/analytics';
import { GoalChatModal } from '../components/GoalChatModal';
import { cn } from '../lib/utils';
import { logAppEvent } from '../lib/events';
import { format, addDays, addWeeks, addMonths, parseISO, differenceInDays, isAfter } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

interface Goal {
  id: string;
  title: string;
  deadline: string;
  tasks: Task[];
  completed: boolean;
  isPromise?: boolean;
  deposit?: number;
  frequency?: 'daily' | '3days' | 'weekly';
  duration?: '1week' | '2weeks' | '1month';
}

export const GoalsPage: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newGoal, setNewGoal] = useState({ 
    title: '', 
    deadline: '', 
    tasks: [''],
    isPromise: false,
    frequency: 'daily' as 'daily' | '3days' | 'weekly',
    deposit: 10
  });
  const [report, setReport] = useState<string | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [selectedGoalForChat, setSelectedGoalForChat] = useState<Goal | null>(null);

  const dateLocale = language === 'ru' ? ru : enUS;

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, `users/${user.uid}/goals`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const g = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Goal[];
      setGoals(g);
    });

    return unsubscribe;
  }, [user]);

  const handleAddGoal = async () => {
    if (!newGoal.title || !user || !newGoal.deadline) return;
    
    const now = new Date();
    const deadlineDate = parseISO(newGoal.deadline);
    const durationDays = differenceInDays(deadlineDate, now);

    try {
      const tasks = newGoal.tasks.filter(t => t.trim()).map(t => ({ id: Math.random().toString(), text: t, completed: false }));
      
      await addDoc(collection(db, `users/${user.uid}/goals`), {
        title: newGoal.title,
        deadline: newGoal.deadline,
        tasks,
        completed: false,
        isPromise: newGoal.isPromise,
        deposit: newGoal.isPromise ? newGoal.deposit : 0,
        frequency: newGoal.isPromise ? newGoal.frequency : null,
        createdAt: serverTimestamp(),
      });
      
      analytics.trackGoalCreated({
        title: newGoal.title,
        tasksCount: tasks.length,
        isPromise: newGoal.isPromise,
        durationDays
      });

      setNewGoal({ 
        title: '', 
        deadline: '', 
        tasks: [''], 
        isPromise: false, 
        frequency: 'daily', 
        deposit: 10 
      });
      setShowAdd(false);
    } catch (error) {
      console.error('Add goal error:', error);
    }
  };

  const toggleTask = async (goalId: string, taskId: string) => {
    if (!user) return;
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const newTasks = goal.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
    const completed = newTasks.every(t => t.completed);

    try {
      await updateDoc(doc(db, `users/${user.uid}/goals/${goalId}`), {
        tasks: newTasks,
        completed
      });
      if (completed && !goal.completed) {
        const now = new Date();
        const deadline = parseISO(goal.deadline);
        const onTime = !isAfter(now, deadline);
        analytics.trackGoalCompleted({ title: goal.title, onTime });
      }
    } catch (error) {
      console.error('Toggle task error:', error);
    }
  };

  const deleteGoal = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/goals/${id}`));
    } catch (error) {
      console.error('Delete goal error:', error);
    }
  };

  const handleGenerateReport = async () => {
    if (goals.length === 0) return;
    setLoadingReport(true);
    setReportError(null);
    try {
      const res = await generateGoalReport(goals, language);
      setReport(res || '...');
    } catch (error: any) {
      console.error('Report error:', error);
      setReportError(error.message || 'Failed to generate report');
    } finally {
      setLoadingReport(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="flex items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
            <Target size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('nav.goals')}</h1>
            <p className="text-sm text-gray-500 font-medium">{goals.length} active goals</p>
          </div>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus size={20} />
          <span className="hidden sm:inline">{t('goals.add')}</span>
        </Button>
      </header>

      {report && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-indigo-600 text-white p-6 rounded-3xl shadow-lg space-y-4 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Sparkles size={120} />
          </div>
          <div className="flex items-center gap-2">
            <Sparkles size={20} />
            <h2 className="font-bold text-lg">{t('goals.report')}</h2>
          </div>
          <p className="text-indigo-50 leading-relaxed whitespace-pre-wrap relative z-10">{report}</p>
          <Button variant="secondary" size="sm" onClick={() => setReport(null)}>Dismiss</Button>
        </motion.div>
      )}

      {reportError && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium border border-red-100">
          {reportError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnimatePresence>
          {goals.map((goal) => (
            <motion.div
              key={goal.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {goal.isPromise && <ShieldCheck size={16} className="text-amber-500" />}
                    <h3 className={cn("font-bold text-lg", goal.completed && "line-through text-gray-400")}>
                      {goal.title}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {goal.deadline && (
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 px-2 py-0.5 rounded-md">
                        Deadline: {format(parseISO(goal.deadline), 'd MMM yyyy', { locale: dateLocale })}
                      </p>
                    )}
                    {goal.isPromise && (
                      <>
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <DollarSign size={10} /> Deposit: ${goal.deposit}
                        </p>
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <RefreshCw size={10} /> {goal.frequency}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteGoal(goal.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={18} className="text-red-400" />
                </Button>
              </div>

              <div className="space-y-3 flex-1">
                {goal.tasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => toggleTask(goal.id, task.id)}
                    className="flex items-center gap-3 w-full text-left p-2 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    {task.completed ? (
                      <CheckCircle2 size={20} className="text-green-500" />
                    ) : (
                      <Circle size={20} className="text-gray-300" />
                    )}
                    <span className={cn("text-sm", task.completed ? "text-gray-400 line-through" : "text-gray-700")}>
                      {task.text}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedGoalForChat(goal)}
                    className="text-indigo-600 hover:bg-indigo-50 text-[10px] font-bold uppercase tracking-wider h-8"
                  >
                    <MessageCircle size={14} className="mr-1" />
                    {t('goals.chat_with_bro')}
                  </Button>
                </div>
                {goal.completed && (
                  <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Completed</span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[120] flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-3xl shadow-xl p-6 space-y-6 my-8"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{t('goals.add')}</h2>
              <button
                onClick={() => setNewGoal(prev => ({ ...prev, isPromise: !prev.isPromise }))}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                  newGoal.isPromise 
                    ? "bg-amber-100 text-amber-700 ring-2 ring-amber-500" 
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                )}
              >
                <ShieldCheck size={14} />
                {newGoal.isPromise ? "Promise Mode ON" : "Make a Promise"}
              </button>
            </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('goals.title')}</label>
                  <input
                    type="text"
                    value={newGoal.title}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                    placeholder={newGoal.isPromise ? "I promise to..." : "Goal title"}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{t('goals.deadline')}</label>
                  <input
                    type="date"
                    value={newGoal.deadline}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, deadline: e.target.value }))}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {newGoal.isPromise && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Frequency</label>
                      <select
                        value={newGoal.frequency}
                        onChange={(e) => setNewGoal(prev => ({ ...prev, frequency: e.target.value as any }))}
                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="daily">Daily Report</option>
                        <option value="3days">Every 3 Days</option>
                        <option value="weekly">Weekly Report</option>
                      </select>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Deposit Amount ($)</label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="5"
                          max="100"
                          step="5"
                          value={newGoal.deposit}
                          onChange={(e) => setNewGoal(prev => ({ ...prev, deposit: parseInt(e.target.value) }))}
                          className="flex-1 accent-amber-500"
                        />
                        <span className="font-bold text-amber-600 w-12">${newGoal.deposit}</span>
                      </div>
                    </div>
                  </div>
                )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t('goals.tasks')}</label>
                {newGoal.tasks.map((task, i) => (
                  <input
                    key={i}
                    type="text"
                    value={task}
                    onChange={(e) => {
                      const newTasks = [...newGoal.tasks];
                      newTasks[i] = e.target.value;
                      setNewGoal(prev => ({ ...prev, tasks: newTasks }));
                    }}
                    placeholder={`Task ${i + 1}`}
                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  />
                ))}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setNewGoal(prev => ({ ...prev, tasks: [...prev.tasks, ''] }))}
                  className="w-full border-2 border-dashed border-gray-100"
                >
                  <Plus size={16} className="mr-2" /> Add Task
                </Button>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>
                {t('common.cancel')}
              </Button>
              <Button className="flex-1" onClick={handleAddGoal}>
                {t('common.save')}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
      {selectedGoalForChat && (
        <GoalChatModal 
          isOpen={!!selectedGoalForChat}
          onClose={() => setSelectedGoalForChat(null)}
          goal={selectedGoalForChat}
        />
      )}
    </div>
  );
};
