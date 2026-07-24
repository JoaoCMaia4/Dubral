import { Toaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';

// Auth pages
import Login from '@/pages/Login';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import AtivarConta from '@/pages/AtivarConta';

// Layout
import AppLayout from '@/components/layout/AppLayout';

// Pages
import Dashboard from '@/pages/Dashboard';
import Profile from '@/pages/Profile';
import Employees from '@/pages/Employees';
import Sectors from '@/pages/Sectors';
import ManualSurveyResponse from "@/pages/ManualSurveyResponse";
import Positions from '@/pages/Positions';
import Surveys from '@/pages/Surveys';
import SurveyBuilder from '@/pages/SurveyBuilder';
import SurveyRespond from '@/pages/SurveyRespond';
import SurveyResults from '@/pages/SurveyResults';
import Templates from '@/pages/Templates';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">A carregar...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      {/* Auth routes - public */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/ativar-conta" element={<AtivarConta />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/sectors" element={<Sectors />} />
          <Route path="/positions" element={<Positions />} />
          <Route path="/surveys" element={<Surveys />} />
          <Route path="/surveys/new" element={<SurveyBuilder />} />
          <Route path="/surveys/:id/edit" element={<SurveyBuilder />} />
          <Route path="/surveys/:id/respond" element={<SurveyRespond />} />
          <Route path="/surveys/:id/results" element={<SurveyResults />} />
          <Route path="/surveys/:id/manual-response" element={<ManualSurveyResponse />} />
          <Route path="/surveys/:id/manual-response/:responseId" element={<ManualSurveyResponse />}/>
          <Route path="/results" element={<Reports />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster position="bottom-right" richColors closeButton duration={4000} />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App