/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { NotificationProvider, useNotification } from './context/NotificationContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ChatPage } from './pages/ChatPage';
import { JournalPage } from './pages/JournalPage';
import { GoalsPage } from './pages/GoalsPage';
import { analyticsPromise, db } from './firebase';
import { logEvent } from 'firebase/analytics';
import { useLocation } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { isAfter, isBefore, addDays, parseISO } from 'date-fns';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-16 h-16 bg-indigo-100 rounded-3xl flex items-center justify-center text-indigo-600 animate-pulse">🧔</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const { language } = useLanguage();
  const location = useLocation();

  // Track page views
  React.useEffect(() => {
    analyticsPromise.then(analytics => {
      if (analytics) {
        logEvent(analytics, 'page_view', {
          page_path: location.pathname,
          page_title: document.title,
          page_location: window.location.href
        });
      }
    });
  }, [location]);

  // Global deadline check
  React.useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, `users/${user.uid}/goals`),
      where('completed', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = new Date();
      const soon = addDays(now, 2);

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.deadline) {
          try {
            const deadline = parseISO(data.deadline);
            if (isAfter(deadline, now) && isBefore(deadline, soon)) {
              const msg = language === 'ru' 
                ? `Напоминание: дедлайн цели "${data.title}" уже скоро!`
                : `Reminder: The deadline for "${data.title}" is coming up soon!`;
              notify(msg, 'warning');
            }
          } catch (e) {
            console.error('Date parsing error', e);
          }
        }
      });
    });

    return unsubscribe;
  }, [user, notify, language]);

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <Layout>
              <ChatPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/journal"
        element={
          <ProtectedRoute>
            <Layout>
              <JournalPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/goals"
        element={
          <ProtectedRoute>
            <Layout>
              <GoalsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <NotificationProvider>
        <AuthProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AuthProvider>
      </NotificationProvider>
    </LanguageProvider>
  );
}

