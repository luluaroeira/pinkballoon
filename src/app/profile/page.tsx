'use client';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import ProfileView from '@/components/ProfileView';

export default function ProfilePage() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <div className="animate-balloon" style={{ fontSize: '4rem' }}>🎈</div>
            </div>
        );
    }

    if (!user) {
        if (typeof window !== 'undefined') window.location.href = '/';
        return null;
    }

    return (
        <>
            <Navbar />
            <ProfileView />
        </>
    );
}
