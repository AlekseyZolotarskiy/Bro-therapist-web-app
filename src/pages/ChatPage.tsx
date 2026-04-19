import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Trash2, Bot, User, Loader2, MessageSquare, Sparkles, RotateCcw, X } from 'lucide-react';
import { collection, addDoc, query, orderBy, onSnapshot, limit, serverTimestamp, Timestamp, doc, updateDoc, onSnapshot as onDocSnapshot, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { generateCBTResponse, extractNameFromChat, summarizeChatContext, CBT_SYSTEM_INSTRUCTION } from '../lib/gemini';
import { logAppEvent } from '../lib/events';
import { analytics } from '../lib/analytics';
import { Button } from '../components/Button';
import { cn } from '../lib/utils';
import { BRO_AVATAR_URL } from '../constants';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  createdAt: any;
}

export const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferredName, setPreferredName] = useState<string | null>(null);
  const [persistentContext, setPersistentContext] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    // Listen to profile data
    const unsubName = onDocSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setPreferredName(data.preferredName || null);
        setPersistentContext(data.aiContext || null);
      }
    });

    const q = query(
      collection(db, `users/${user.uid}/chats/main/messages`),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      
      // Filter out messages with null createdAt if they are not from the current session
      // or handle the null value for sorting
      const sortedMsgs = [...msgs].sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || a.createdAt || Date.now();
        const timeB = b.createdAt?.toMillis?.() || b.createdAt || Date.now();
        return timeA - timeB;
      });
      
      setMessages(sortedMsgs);
    }, (err) => {
      console.error('Firestore snapshot error:', err);
      setError('Failed to load messages. Please refresh.');
    });

    return () => {
      unsubName();
      unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleClearChat = async (keepContext: boolean) => {
    if (!user || clearing) return;
    setClearing(true);
    try {
      if (keepContext && messages.length > 0) {
        // Summarize and save context
        const newContext = await summarizeChatContext(messages, persistentContext);
        await updateDoc(doc(db, 'users', user.uid), {
          aiContext: newContext
        });
      } else if (!keepContext) {
        // Reset context
        await updateDoc(doc(db, 'users', user.uid), {
          aiContext: null
        });
      }

      // Delete all main messages
      const msgsQuery = query(collection(db, `users/${user.uid}/chats/main/messages`));
      const snaps = await getDocs(msgsQuery);
      const batch = writeBatch(db);
      snaps.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();

      setShowClearModal(false);
      logAppEvent('chat_cleared', { keepContext });
    } catch (err) {
      console.error('Error clearing chat:', err);
    } finally {
      setClearing(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading || !user) return;

    const userText = input;
    setInput('');
    setLoading(true);
    setError(null);

    // Optimistic update
    const tempId = Math.random().toString(36).substring(7);
    const optimisticMsg: Message = {
      id: tempId,
      role: 'user',
      text: userText,
      createdAt: new Date(),
    };
    
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      // 1. Save user message to Firestore
      await addDoc(collection(db, `users/${user.uid}/chats/main/messages`), {
        role: 'user',
        text: userText,
        createdAt: serverTimestamp(),
      });

      // Track analytics
      analytics.trackChatMessage(messages.length + 1);

      // 2. Generate AI response
      const history = messages.concat(optimisticMsg).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      // Inject persistent context into system instruction
      let systemPrompt = CBT_SYSTEM_INSTRUCTION;
      if (persistentContext) {
        systemPrompt += `\n\nUSER CONTEXT (Remember these key things about the user):\n${persistentContext}`;
      }

      const responseText = await generateCBTResponse(history, systemPrompt);
      
      // 3. Save AI response to Firestore
      await addDoc(collection(db, `users/${user.uid}/chats/main/messages`), {
        role: 'model',
        text: responseText || '...',
        createdAt: serverTimestamp(),
      });

      // 4. Try to extract name if not set
      if (!preferredName) {
        const extractedName = await extractNameFromChat(history);
        if (extractedName && extractedName.length < 50) {
          await updateDoc(doc(db, 'users', user.uid), {
            preferredName: extractedName
          });
          logAppEvent('chat_milestone', { type: 'name_extracted', name: extractedName }, true);
        }
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      setError(error.message || 'Failed to connect to Bro. Check your internet or API key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] md:h-[calc(100vh-8rem)] bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 overflow-hidden shadow-sm border border-gray-50 uppercase font-bold tracking-widest text-xs">
            <img 
              src={BRO_AVATAR_URL} 
              alt="Bro" 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer" 
              crossOrigin="anonymous"
            />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 leading-tight">Bro Therapist</h2>
            <p className="text-xs text-green-500 font-medium">Online</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowClearModal(true)}
          className="text-gray-400 hover:text-red-500 hover:bg-red-50"
        >
          <Trash2 size={18} className="mr-2" />
          <span className="text-sm font-semibold">{t('chat.clear_btn') || 'Очистить историю'}</span>
        </Button>
      </div>

      <AnimatePresence>
        {showClearModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl overflow-hidden relative border border-gray-100"
            >
              <div className="flex flex-col items-center text-center space-y-4 mb-8">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center">
                  <RotateCcw size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-gray-900">{t('chat.clear_title') || 'Очистить чат?'}</h3>
                  <p className="text-gray-500 leading-relaxed">
                    {t('chat.clear_desc') || 'Выбери, как мы начнем заново. Бро может всё забыть или сохранить самое важное.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  className="w-full flex items-center p-4 gap-4 bg-indigo-50 hover:bg-indigo-100 rounded-2xl transition-all group border border-indigo-100/50"
                  disabled={clearing}
                  onClick={() => handleClearChat(true)}
                >
                  <div className="w-12 h-12 bg-white text-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-110">
                    <Sparkles size={24} />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-gray-900 text-lg">{t('chat.keep_context') || 'Сохранить контекст'}</div>
                    <div className="text-sm text-indigo-600/80 font-medium">{t('chat.keep_context_desc') || 'Я запомню твое имя и главные темы.'}</div>
                  </div>
                </button>

                <button 
                  className="w-full flex items-center p-4 gap-4 bg-white hover:bg-red-50 rounded-2xl transition-all group border border-gray-100 hover:border-red-100"
                  disabled={clearing}
                  onClick={() => handleClearChat(false)}
                >
                  <div className="w-12 h-12 bg-gray-50 text-gray-400 group-hover:bg-white group-hover:text-red-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-110">
                    <Trash2 size={24} />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-gray-900 text-lg group-hover:text-red-600">{t('chat.reset_all') || 'Полный сброс'}</div>
                    <div className="text-sm text-gray-500">{t('chat.reset_all_desc') || 'Начнем с нуля, как в первый раз.'}</div>
                  </div>
                </button>

                <div className="pt-4 flex gap-3">
                  <Button 
                    className="flex-1 h-12 rounded-2xl"
                    variant="ghost"
                    disabled={clearing}
                    onClick={() => setShowClearModal(false)}
                  >
                    {t('common.cancel') || 'Отмена'}
                  </Button>
                </div>
              </div>

              {clearing && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-[2px] flex flex-col items-center justify-center z-10">
                  <Loader2 className="animate-spin text-indigo-600 mb-2" size={32} />
                  <p className="text-sm font-bold text-gray-900">Бро переваривает информацию...</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6"
      >
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-40 py-12"
            >
              <div className="w-24 h-24 bg-gray-100 rounded-3xl flex items-center justify-center overflow-hidden border border-gray-50">
                <img 
                  src={BRO_AVATAR_URL} 
                  alt="Bro" 
                  className="w-full h-full object-cover grayscale opacity-60" 
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                />
              </div>
              <div className="space-y-2">
                <p className="max-w-xs text-lg font-medium text-gray-900 leading-relaxed">
                  {t('chat.placeholder') || 'Бро на связи. Как прошёл твой день?'}
                </p>
                {persistentContext && (
                  <p className="text-sm text-indigo-600 italic">
                    {language === 'ru' ? '(Я помню наше прошлое общение)' : '(I remember our previous talk)'}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex items-end gap-2 max-w-[85%]",
                msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mb-1 overflow-hidden border shadow-sm",
                msg.role === 'user' ? "bg-indigo-600 text-white border-indigo-700 font-bold text-xs" : "bg-white border-gray-100"
              )}>
                {msg.role === 'user' ? (
                  user?.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="You" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                      crossOrigin="anonymous"
                    />
                  ) : <User size={20} />
                ) : (
                  <img 
                    src={BRO_AVATAR_URL} 
                    alt="Bro" 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer" 
                    crossOrigin="anonymous"
                  />
                )}
              </div>
              <div className={cn(
                "p-4 rounded-2xl shadow-sm",
                msg.role === 'user' 
                  ? "bg-indigo-600 text-white rounded-br-none" 
                  : "bg-gray-100 text-gray-800 rounded-bl-none"
              )}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-gray-400 p-2"
          >
            <Loader2 size={16} className="animate-spin" />
            <div className="w-6 h-6 rounded-lg overflow-hidden bg-gray-100 border border-gray-50 shadow-xs">
              <img 
                src={BRO_AVATAR_URL} 
                alt="Bro" 
                className="w-full h-full object-cover grayscale opacity-60" 
                referrerPolicy="no-referrer" 
                crossOrigin="anonymous"
              />
            </div>
            <span className="text-xs font-medium">Bro is thinking...</span>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100 mx-4"
          >
            {error}
          </motion.div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t('chat.placeholder')}
            className="flex-1 bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
          />
          <Button 
            onClick={handleSend} 
            disabled={!input.trim() || loading}
            size="icon"
            className="h-12 w-12 rounded-2xl"
          >
            <Send size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
};
