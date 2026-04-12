import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Plus, Bot, User, Loader2 } from 'lucide-react';
import { collection, addDoc, query, orderBy, onSnapshot, limit, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { generateCBTResponse } from '../lib/gemini';
import { logAppEvent } from '../lib/events';
import { analytics } from '../lib/analytics';
import { Button } from '../components/Button';
import { cn } from '../lib/utils';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  createdAt: any;
}

export const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, `users/${user.uid}/chats/main/messages`),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
    });

    return unsubscribe;
  }, [user]);

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

    try {
      if (messages.length === 0) {
        logAppEvent('chat_started');
      }
      // 1. Save user message to Firestore
      await addDoc(collection(db, `users/${user.uid}/chats/main/messages`), {
        role: 'user',
        text: userText,
        createdAt: serverTimestamp(),
      });

      // Track analytics
      analytics.trackChatMessage(messages.length + 1);

      // 2. Generate AI response
      const history = messages.concat({ 
        id: 'temp', 
        role: 'user', 
        text: userText, 
        createdAt: Date.now() 
      }).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const responseText = await generateCBTResponse(history);
      
      // 3. Save AI response to Firestore
      await addDoc(collection(db, `users/${user.uid}/chats/main/messages`), {
        role: 'model',
        text: responseText || '...',
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] md:h-[calc(100vh-8rem)] bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
            <Bot size={24} />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 leading-tight">Bro Therapist</h2>
            <p className="text-xs text-green-500 font-medium">Online</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMessages([])}>
          <Plus size={20} />
        </Button>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
            <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center text-gray-400">🧔</div>
            <p className="max-w-xs">{t('chat.placeholder')}</p>
          </div>
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
            <span className="text-xs font-medium">Bro is thinking...</span>
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
