import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, MessageSquare, Phone } from 'lucide-react';
import { Button } from './Button';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { analytics } from '../lib/analytics';
import { cn } from '../lib/utils';
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    contact: '',
    platform: 'telegram' as 'telegram' | 'whatsapp',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      await addDoc(collection(db, 'support_requests'), {
        userId: user.uid,
        userEmail: user.email,
        ...formData,
        createdAt: serverTimestamp(),
      });
      analytics.trackFormSubmit('support_request');
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setFormData({ contact: '', platform: 'telegram', message: '' });
      }, 2000);
    } catch (error) {
      console.error('Support request error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
              <h2 className="text-xl font-bold">Support the Project</h2>
              <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {success ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <Send size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Thank you!</h3>
                  <p className="text-gray-500">We will contact you soon.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <p className="text-sm text-gray-600">
                    If you want to support the project, leave your contact details and we will get in touch with you.
                  </p>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Nick or Phone Number</label>
                    <input
                      required
                      type="text"
                      value={formData.contact}
                      onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                      placeholder="@username or +7..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Preferred Platform</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, platform: 'telegram' }))}
                        className={cn(
                          "flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all",
                          formData.platform === 'telegram' 
                            ? "border-indigo-600 bg-indigo-50 text-indigo-600" 
                            : "border-gray-100 text-gray-500 hover:border-gray-200"
                        )}
                      >
                        <MessageSquare size={20} />
                        <span className="font-bold">Telegram</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, platform: 'whatsapp' }))}
                        className={cn(
                          "flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all",
                          formData.platform === 'whatsapp' 
                            ? "border-emerald-600 bg-emerald-50 text-emerald-600" 
                            : "border-gray-100 text-gray-500 hover:border-gray-200"
                        )}
                      >
                        <Phone size={20} />
                        <span className="font-bold">WhatsApp</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Message (Optional)</label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 transition-all min-h-[100px] resize-none"
                      placeholder="Tell us something..."
                    />
                  </div>

                  <Button type="submit" loading={loading} className="w-full py-4 rounded-2xl text-lg">
                    Send Request
                  </Button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

import { cn } from '../lib/utils';
