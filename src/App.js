import React, { Suspense, lazy, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UserProvider } from './contexts/UserContext';
import { ThemeModeProvider, useThemeMode } from './contexts/ThemeModeContext';
import PrivateRoute from './auth/PrivateRoute';
import AdminRoute from './auth/AdminRoute';

import { NotificationProvider } from './contexts/NotificationContext';
import Login from './components/auth/Login';
import AdminDashboard from './components/dashboard/AdminDashboard';
import TeacherDashboard from './components/dashboard/TeacherDashboard';
import Layout from './components/common/Layout';
import Loading from './components/common/Loading';

import getTheme from './theme';
import ErrorBoundary from './components/common/ErrorBoundary';

// Lazy load heavy components
const SchoolManager = lazy(() => import('./components/management/SchoolManager'));
const CategoryManager = lazy(() => import('./components/management/CategoryManager'));
const CourseManager = lazy(() => import('./components/management/CourseManager'));
const ChapterManager = lazy(() => import('./components/management/ChapterManager'));
const VideoManager = lazy(() => import('./components/management/VideoManager'));
const NoteManager = lazy(() => import('./components/management/NoteManager'));
const QuestionManager = lazy(() => import('./components/management/QuestionManager'));
const ExamManager = lazy(() => import('./components/management/ExamManager'));
const PaymentManager = lazy(() => import('./components/management/PaymentManager'));
const UserManager = lazy(() => import('./components/management/UserManager'));
const TeacherManager = lazy(() => import('./components/management/TeacherManager'));
const AdminManager = lazy(() => import('./components/management/AdminManager'));
const NotificationTelegramManager = lazy(() => import('./components/management/NotificationTelegramManager'));
const SettingsManager = lazy(() => import('./components/management/SettingsManager'));
const DeviceManager = lazy(() => import('./components/management/DeviceManager'));
const SystemLogsManager = lazy(() => import('./components/management/SystemLogsManager'));

const DashboardPage = () => {
  const { isAdmin, isTeacher, loading } = useAuth();
  
  if (loading) {
    return (
      <Layout>
        <Loading
          type="page"
          title="Opening your dashboard"
          message="We are loading your summary, alerts, and latest admin activity."
        />
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

const AppContent = () => {
  const { mode } = useThemeMode();
  const theme = useMemo(() => getTheme(mode), [mode]);
  const routeLoadingFallback = (
    <Loading
      type="page"
      title="Opening this page"
      message="We are loading the latest records for this section."
    />
  );

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <NotificationProvider>
          <Router
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <AuthProvider>
              <UserProvider> {/* Add this wrapper */}
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
                        <Suspense fallback={routeLoadingFallback}>
                          <SchoolManager />
                        </Suspense>
                      </AdminRoute>
                    </Layout>
                  </PrivateRoute>
                } />
                
                <Route path="/categories" element={
                  <PrivateRoute>
                    <Layout>
                      <AdminRoute>
                        <Suspense fallback={routeLoadingFallback}>
                          <CategoryManager />
                        </Suspense>
                      </AdminRoute>
                    </Layout>
                  </PrivateRoute>
                } />
                
                <Route path="/courses" element={
                  <PrivateRoute>
                    <Layout>
                      <AdminRoute>
                        <Suspense fallback={routeLoadingFallback}>
                          <CourseManager />
                        </Suspense>
                      </AdminRoute>
                    </Layout>
                  </PrivateRoute>
                } />
                
                <Route path="/payments" element={
                  <PrivateRoute>
                    <Layout>
                      <AdminRoute>
                        <Suspense fallback={routeLoadingFallback}>
                          <PaymentManager />
                        </Suspense>
                      </AdminRoute>
                    </Layout>
                  </PrivateRoute>
                } />
                
                <Route path="/users" element={
                  <PrivateRoute>
                    <Layout>
                      <AdminRoute>
                        <Suspense fallback={routeLoadingFallback}>
                          <UserManager />
                        </Suspense>
                      </AdminRoute>
                    </Layout>
                  </PrivateRoute>
                } />
                
                <Route path="/teachers" element={
                  <PrivateRoute>
                    <Layout>
                      <AdminRoute>
                        <Suspense fallback={routeLoadingFallback}>
                          <TeacherManager />
                        </Suspense>
                      </AdminRoute>
                    </Layout>
                  </PrivateRoute>
                } />

                <Route path="/admins" element={
                  <PrivateRoute>
                    <Layout>
                      <AdminRoute>
                        <Suspense fallback={routeLoadingFallback}>
                          <AdminManager />
                        </Suspense>
                      </AdminRoute>
                    </Layout>
                  </PrivateRoute>
                } />
                
                {/* Admin + Teacher Routes */}
                <Route path="/chapters" element={
                  <PrivateRoute>
                    <Layout>
                      <Suspense fallback={routeLoadingFallback}>
                        <ChapterManager />
                      </Suspense>
                    </Layout>
                  </PrivateRoute>
                } />
                
                <Route path="/videos" element={
                  <PrivateRoute>
                    <Layout>
                      <Suspense fallback={routeLoadingFallback}>
                        <VideoManager />
                      </Suspense>
                    </Layout>
                  </PrivateRoute>
                } />
                
                <Route path="/notes" element={
                  <PrivateRoute>
                    <Layout>
                      <Suspense fallback={routeLoadingFallback}>
                        <NoteManager />
                      </Suspense>
                    </Layout>
                  </PrivateRoute>
                } />
                
                <Route path="/questions" element={
                  <PrivateRoute>
                    <Layout>
                      <Suspense fallback={routeLoadingFallback}>
                        <QuestionManager />
                      </Suspense>
                    </Layout>
                  </PrivateRoute>
                } />
                
                <Route path="/exams" element={
                  <PrivateRoute>
                    <Layout>
                      <Suspense fallback={routeLoadingFallback}>
                        <ExamManager />
                      </Suspense>
                    </Layout>
                  </PrivateRoute>
                } />
                
                {/* Admin Only Routes - continued */}
                <Route path="/notifications" element={
                  <PrivateRoute>
                    <Layout>
                      <AdminRoute>
                        <Suspense fallback={routeLoadingFallback}>
                          <NotificationTelegramManager />
                        </Suspense>
                      </AdminRoute>
                    </Layout>
                  </PrivateRoute>
                } />

                <Route path="/settings" element={
                  <PrivateRoute>
                    <Layout>
                      <AdminRoute>
                        <Suspense fallback={routeLoadingFallback}>
                          <SettingsManager />
                        </Suspense>
                      </AdminRoute>
                    </Layout>
                  </PrivateRoute>
                } />

                <Route path="/devices" element={
                  <PrivateRoute>
                    <Layout>
                      <AdminRoute>
                        <Suspense fallback={routeLoadingFallback}>
                          <DeviceManager />
                        </Suspense>
                      </AdminRoute>
                    </Layout>
                  </PrivateRoute>
                } />
                
                <Route path="/system-logs" element={
                  <PrivateRoute>
                    <Layout>
                      <AdminRoute>
                        <Suspense fallback={routeLoadingFallback}>
                          <SystemLogsManager />
                        </Suspense>
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
              </UserProvider> {/* Close UserProvider */}
            </AuthProvider>
          </Router>
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const App = () => (
  <ErrorBoundary>
    <ThemeModeProvider>
      <AppContent />
    </ThemeModeProvider>
  </ErrorBoundary>
);

export default App;
