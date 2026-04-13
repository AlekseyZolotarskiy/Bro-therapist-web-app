import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X, Bot, User, Loader2 } from 'lucide-react';
import { collection, addDoc, query, orderBy, onSnapshot, limit, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { generateCBTResponse } from '../lib/gemini';
import { analytics } from '../lib/analytics';
import { Button } from './Button';
import { cn } from '../lib/utils';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  createdAt: any;
}

interface GoalChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: {
    id: string;
    title: string;
  };
}

export const GoalChatModal: React.FC<GoalChatModalProps> = ({ isOpen, onClose, goal }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !isOpen) return;

    const q = query(
      collection(db, `users/${user.uid}/goals/${goal.id}/messages`),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
    }, (err) => {
      console.error("Snapshot error:", err);
      setError("Permission denied or connection error. Please check your account.");
    });

    return unsubscribe;
  }, [user, goal.id, isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading || !user) return;

    const userText = input;
    setInput('');
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch some context from the main chat to "know who the user is"
      const mainChatQuery = query(
        collection(db, `users/${user.uid}/chats/main/messages`),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const mainChatSnapshot = await getDocs(mainChatQuery);
      const mainChatContext = mainChatSnapshot.docs
        .reverse()
        .map(doc => `${doc.data().role === 'user' ? 'User' : 'Bro'}: ${doc.data().text}`)
        .join('\n');

      // 2. Save user message
      await addDoc(collection(db, `users/${user.uid}/goals/${goal.id}/messages`), {
        role: 'user',
        text: userText,
        createdAt: serverTimestamp(),
      });

      // 3. Build history with context
      const systemInstruction = `You are Bro Therapist. You are helping the user with a specific goal: "${goal.title}". 
      Focus your advice and support on this specific goal. 
      
      Context from your general conversations with this user:
      ${mainChatContext || "No previous general conversation history."}
      
      User is now telling you about their progress on this specific goal. Be encouraging, use CBT principles, and remember your "bro" personality.`;

      const history = messages.concat({ 
        id: 'temp', 
        role: 'user', 
        text: userText, 
        createdAt: Date.now() 
      }).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const responseText = await generateCBTResponse(history, systemInstruction);
      
      // 4. Save AI response
      await addDoc(collection(db, `users/${user.uid}/goals/${goal.id}/messages`), {
        role: 'model',
        text: responseText || '...',
        createdAt: serverTimestamp(),
      });
      
      analytics.trackChatMessage(messages.length + 1);
    } catch (err: any) {
      console.error('Goal chat error:', err);
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl h-[80vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Bot size={24} />
                </div>
                <div>
                  <h2 className="font-bold leading-tight">{goal.title}</h2>
                  <p className="text-xs text-indigo-100 opacity-80">{t('goals.chat_with_bro')}</p>
                </div>
              </div>
              <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-4"
            >
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                  <Bot size={48} />
                  <p className="max-w-xs font-medium">{t('goals.chat_placeholder')}</p>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex items-end gap-2 max-w-[85%]",
                    msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mb-1",
                    msg.role === 'user' ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-600"
                  )}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={cn(
                    "p-4 rounded-2xl shadow-sm",
                    msg.role === 'user' 
                      ? "bg-indigo-600 text-white rounded-br-none" 
                      : "bg-gray-100 text-gray-800 rounded-bl-none"
                  )}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-gray-400 p-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-xs font-medium">Bro is thinking...</span>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium">
                  {error}
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={t('chat.placeholder')}
                  className="flex-1 bg-white border-none rounded-2xl px-4 py-3 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all"
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
