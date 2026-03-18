/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';
import Profile from './pages/Profile';
import Opportunities from './pages/Opportunities';
import AthleteDetail from './pages/AthleteDetail';
import Messages from './pages/Messages';
import Pricing from './pages/Pricing';
import AIAssistant from './components/AIAssistant';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />
            <Route path="opportunities" element={<Opportunities />} />
            <Route path="athletes/:id" element={<AthleteDetail />} />
            <Route path="messages" element={<Messages />} />
            <Route path="pricing" element={<Pricing />} />
          </Route>
        </Routes>
        <AIAssistant />
      </Router>
    </AuthProvider>
  );
}
