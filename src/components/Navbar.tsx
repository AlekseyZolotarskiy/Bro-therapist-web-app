import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageCircle, BookOpen, Target, User, LogOut, Languages, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';
import { logAppEvent } from '../lib/events';
import { analytics } from '../lib/analytics';
import { Button } from './Button';
import { SupportModal } from './SupportModal';
import { BRO_AVATAR_URL } from '../constants';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const location = useLocation();
  const [isSupportOpen, setIsSupportOpen] = React.useState(false);

  const navItems = [
    { path: '/chat', icon: MessageCircle, label: t('nav.chat') },
    { path: '/journal', icon: BookOpen, label: t('nav.journal') },
    { path: '/goals', icon: Target, label: t('nav.goals') },
  ];

  if (!user) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2 md:top-0 md:bottom-auto md:border-t-0 md:border-b">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <Link to="/" className="hidden md:flex items-center gap-2 font-bold text-indigo-600 text-xl">
          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center overflow-hidden">
            <img src={BRO_AVATAR_URL} alt="Bro" className="w-full h-full object-cover" />
          </div>
          {t('app.name')}
        </Link>

        <div className="flex flex-1 justify-around md:justify-center md:gap-8">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl transition-colors md:flex-row md:gap-2 md:px-4",
                location.pathname.startsWith(item.path) 
                  ? "text-indigo-600 bg-indigo-50" 
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium md:text-sm">{item.label}</span>
            </Link>
          ))}
          <button
            onClick={() => {
              setIsSupportOpen(true);
              analytics.trackSupportClick();
            }}
            className="flex flex-col items-center gap-1 p-2 rounded-xl transition-colors text-pink-500 hover:bg-pink-50 md:hidden"
          >
            <Heart size={20} fill="currentColor" />
            <span className="text-[10px] font-medium">Support</span>
          </button>
          <button
            onClick={logout}
            className="flex flex-col items-center gap-1 p-2 rounded-xl transition-colors text-gray-500 hover:bg-gray-50 md:hidden"
          >
            <LogOut size={20} />
            <span className="text-[10px] font-medium">Logout</span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsSupportOpen(true);
              analytics.trackSupportClick();
            }}
            className="text-pink-600 hover:text-pink-700 hover:bg-pink-50 gap-2"
          >
            <Heart size={18} fill="currentColor" />
            Support
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const newLang = language === 'ru' ? 'en' : 'ru';
              setLanguage(newLang);
              logAppEvent('language_switched', { to: newLang });
            }}
            title="Switch Language"
          >
            <Languages size={20} />
          </Button>
          <div className="flex items-center gap-2 pl-4 border-l">
            <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-8 h-8 rounded-full" />
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut size={20} />
            </Button>
          </div>
        </div>
      </div>
      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
    </nav>
  );
};
