'use client';
import { useAuth } from '@/contexts/AuthContext';
import AuthPage from '@/components/AuthPage';
import Navbar from '@/components/Navbar';
import AdminView from '@/components/AdminView';

export default function AdminPage() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="animate-balloon" style={{ fontSize: '4rem' }}>🎈</div>
            </div>
        );
    }

    if (!user) return <AuthPage />;

    if (user.role !== 'admin') {
        return (
            <>
                <Navbar />
                <div className="page-container" style={{ textAlign: 'center', padding: '80px 20px' }}>
                    <span style={{ fontSize: '4rem', display: 'block', marginBottom: '16px' }}>🚫</span>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>Acesso Restrito</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Esta área é exclusiva para administradoras.</p>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <AdminView />
        </>
    );
}
