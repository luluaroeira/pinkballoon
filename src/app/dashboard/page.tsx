'use client';
import { useAuth } from '@/contexts/AuthContext';
import AuthPage from '@/components/AuthPage';
import Navbar from '@/components/Navbar';
import DashboardView from '@/components/DashboardView';

export default function DashboardPage() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="animate-balloon" style={{ fontSize: '4rem' }}>🎈</div>
            </div>
        );
    }

    if (!user) return <AuthPage />;

    return (
        <>
            <Navbar />
            <DashboardView />
        </>
    );
}
