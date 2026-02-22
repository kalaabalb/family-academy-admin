import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import PrivateRoute from './auth/PrivateRoute';
import AdminRoute from './auth/AdminRoute';
import TeacherRoute from './auth/TeacherRoute';

import { NotificationProvider } from './contexts/NotificationContext';
import Login from './components/auth/Login';
import AdminDashboard from './components/dashboard/AdminDashboard';
import TeacherDashboard from './components/dashboard/TeacherDashboard';
import SchoolManager from './components/management/SchoolManager';
import CategoryManager from './components/management/CategoryManager';
import CourseManager from './components/management/CourseManager';
import ChapterManager from './components/management/ChapterManager';
import VideoManager from './components/management/VideoManager';
import NoteManager from './components/management/NoteManager';
import QuestionManager from './components/management/QuestionManager';
import ExamManager from './components/management/ExamManager';
import PaymentManager from './components/management/PaymentManager';
import UserManager from './components/management/UserManager';
import TeacherManager from './components/management/TeacherManager';
import NotificationTelegramManager from './components/management/NotificationTelegramManager';
import SettingsManager from './components/management/SettingsManager';
import DeviceManager from './components/management/DeviceManager';
import SystemLogsManager from './components/management/SystemLogsManager';
import Layout from './components/common/Layout';


import theme from './theme';


const DashboardPage = () => {
  const { isAdmin, isTeacher, loading } = useAuth();
  
  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          Loading dashboard...
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      {isAdmin() && <AdminDashboard />}
      {isTeacher() && <TeacherDashboard />}
      {!isAdmin() && !isTeacher() && (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          You don't have permission to access the dashboard.
        </div>
      )}
    </Layout>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
            <NotificationProvider>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={
              <PrivateRoute>
                <Navigate to="/dashboard" />
              </PrivateRoute>
            } />
            
            <Route path="/dashboard" element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            } />
            
            {/* Admin Only Routes */}
            <Route path="/schools" element={
              <PrivateRoute>
                <Layout>
                  <AdminRoute>
                    <SchoolManager />
                  </AdminRoute>
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/categories" element={
              <PrivateRoute>
                <Layout>
                  <AdminRoute>
                    <CategoryManager />
                  </AdminRoute>
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/courses" element={
              <PrivateRoute>
                <Layout>
                  <AdminRoute>
                    <CourseManager />
                  </AdminRoute>
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/payments" element={
              <PrivateRoute>
                <Layout>
                  <AdminRoute>
                    <PaymentManager />
                  </AdminRoute>
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/users" element={
              <PrivateRoute>
                <Layout>
                  <AdminRoute>
                    <UserManager />
                  </AdminRoute>
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/teachers" element={
              <PrivateRoute>
                <Layout>
                  <AdminRoute>
                    <TeacherManager />
                  </AdminRoute>
                </Layout>
              </PrivateRoute>
            } />
            
            {/* Admin + Teacher Routes */}
            <Route path="/chapters" element={
              <PrivateRoute>
                <Layout>
                  <ChapterManager />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/videos" element={
              <PrivateRoute>
                <Layout>
                  <VideoManager />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/notes" element={
              <PrivateRoute>
                <Layout>
                  <NoteManager />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/questions" element={
              <PrivateRoute>
                <Layout>
                  <QuestionManager />
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/exams" element={
              <PrivateRoute>
                <Layout>
                  <ExamManager />
                </Layout>
              </PrivateRoute>
            } />
            
            {/* Admin Only Routes - continued */}
            <Route path="/notifications" element={
              <PrivateRoute>
                <Layout>
                  <AdminRoute>
                    <NotificationTelegramManager />
                  </AdminRoute>
                </Layout>
              </PrivateRoute>
            } />

            <Route path="/settings" element={
              <PrivateRoute>
                <Layout>
                  <AdminRoute>
                    <SettingsManager />
                  </AdminRoute>
                </Layout>
              </PrivateRoute>
            } />

            <Route path="/devices" element={
              <PrivateRoute>
                <Layout>
                  <AdminRoute>
                    <DeviceManager />
                  </AdminRoute>
                </Layout>
              </PrivateRoute>
            } />
            
            <Route path="/system-logs" element={
              <PrivateRoute>
                <Layout>
                  <AdminRoute>
                    <SystemLogsManager />
                  </AdminRoute>
                </Layout>
              </PrivateRoute>
            } />
            
            {/* Fallback route */}
            <Route path="*" element={
              <PrivateRoute>
                <Navigate to="/dashboard" />
              </PrivateRoute>
            } />
          </Routes>
        </AuthProvider>
      </Router>
            </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;