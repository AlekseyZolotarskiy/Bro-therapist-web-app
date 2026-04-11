import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Plus, CheckCircle2, Circle, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/Button';
import { generateGoalReport } from '../lib/gemini';
import { cn } from '../lib/utils';
import { logAppEvent } from '../lib/events';

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
}

export const GoalsPage: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', deadline: '', tasks: [''] });
  const [report, setReport] = useState<string | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

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
    if (!newGoal.title || !user) return;
    
    try {
      await addDoc(collection(db, `users/${user.uid}/goals`), {
        title: newGoal.title,
        deadline: newGoal.deadline,
        tasks: newGoal.tasks.filter(t => t.trim()).map(t => ({ id: Math.random().toString(), text: t, completed: false })),
        completed: false,
        createdAt: serverTimestamp(),
      });
      
      logAppEvent('goal_created', { title: newGoal.title });
      setNewGoal({ title: '', deadline: '', tasks: [''] });
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
        logAppEvent('goal_completed', { title: goal.title });
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
    try {
      const res = await generateGoalReport(goals, language);
      setReport(res || '...');
    } catch (error) {
      console.error('Report error:', error);
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
                  <h3 className={cn("font-bold text-lg", goal.completed && "line-through text-gray-400")}>
                    {goal.title}
                  </h3>
                  {goal.deadline && (
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Deadline: {goal.deadline}
                    </p>
                  )}
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
                  <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-500" 
                      style={{ width: `${(goal.tasks.filter(t => t.completed).length / goal.tasks.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400">
                    {Math.round((goal.tasks.filter(t => t.completed).length / goal.tasks.length) * 100)}%
                  </span>
                </div>
                {goal.completed && (
                  <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Completed</span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {goals.length > 0 && !report && (
          <button
            onClick={handleGenerateReport}
            disabled={loadingReport}
            className="md:col-span-2 bg-indigo-50 border-2 border-dashed border-indigo-200 p-8 rounded-3xl flex flex-col items-center justify-center gap-4 text-indigo-600 hover:bg-indigo-100 transition-all group"
          >
            {loadingReport ? (
              <Loader2 className="animate-spin" size={32} />
            ) : (
              <Sparkles size={32} className="group-hover:scale-110 transition-transform" />
            )}
            <div className="text-center">
              <p className="font-bold">{t('goals.report')}</p>
              <p className="text-sm opacity-70">Let Bro analyze your progress and give you some tips</p>
            </div>
          </button>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-3xl shadow-xl p-6 space-y-6"
          >
            <h2 className="text-xl font-bold text-gray-900">{t('goals.add')}</h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">{t('goals.title')}</label>
                <input
                  type="text"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
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
    </div>
  );
};
