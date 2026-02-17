'use client';
import { useAuth } from '@/contexts/AuthContext';
import AuthPage from '@/components/AuthPage';
import Navbar from '@/components/Navbar';
import HomePage from '@/components/HomePage';

export default function Page() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <div className="animate-balloon" style={{ fontSize: '4rem' }}>🎈</div>
        <p className="gradient-text" style={{ fontSize: '1.2rem', fontWeight: 600 }}>
          Carregando PinkBalloon...
        </p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <>
      <Navbar />
      <HomePage />
    </>
  );
}
