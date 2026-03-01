import { Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Dashboard } from './pages/Dashboard';
import { SleepPage } from './pages/Sleep';
import { WorkoutsPage } from './pages/Workouts';
import { Insights } from './pages/Insights';
import { FeedPage } from './pages/Feed';
import { DiscoverPage } from './pages/Discover';
import { ProfilePage } from './pages/Profile';
import { fitiqApi } from './api/client';
import { Spinner } from './components/ui/Spinner';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: fitiqApi.getMe,
    retry: false,
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !data) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"            element={<Login />} />
      <Route path="/register"         element={<Register />} />
      <Route path="/forgot-password"  element={<ForgotPassword />} />
      <Route path="/reset-password"   element={<ResetPassword />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"        element={<Dashboard />} />
        <Route path="sleep"            element={<SleepPage />} />
        <Route path="workouts"         element={<WorkoutsPage />} />
        <Route path="insights"         element={<Insights />} />
        <Route path="feed"             element={<FeedPage />} />
        <Route path="discover"         element={<DiscoverPage />} />
        <Route path="profile"          element={<ProfilePage />} />
        <Route path="profile/:userId"  element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
