'use client';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Navbar() {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    if (!user) return null;

    const isAdmin = user.role === 'admin';

    const links = [
        { href: '/', label: 'Home', icon: '🏠' },
        { href: '/ranking', label: 'Ranking', icon: '🏆' },
        { href: '/dashboard', label: 'Meu Desenvolvimento', icon: '📊' },
        { href: '/profile', label: 'Meu Perfil', icon: '👤' },
        ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: '⚙️' }] : []),
    ];

    return (
        <nav className="nav">
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: '64px',
            }}>
                {/* Logo */}
                <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.5rem' }}>🎈</span>
                    <span className="gradient-text" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                        PinkBalloon
                    </span>
                </Link>

                {/* Desktop nav */}
                {!isMobile && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    }}>
                        {links.map(link => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`nav-link ${pathname === link.href ? 'active' : ''}`}
                            >
                                <span style={{ marginRight: '4px' }}>{link.icon}</span>
                                {link.label}
                            </Link>
                        ))}
                    </div>
                )}

                {/* User menu */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {!isMobile && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'var(--accent-gradient)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                            }}>
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                {user.name}
                            </span>
                        </div>
                    )}

                    <button onClick={logout} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                        Sair
                    </button>

                    {/* Mobile hamburger */}
                    {isMobile && (
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-primary)',
                                fontSize: '1.5rem',
                                cursor: 'pointer',
                                padding: '4px',
                            }}
                        >
                            {menuOpen ? '✕' : '☰'}
                        </button>
                    )}
                </div>
            </div>

            {/* Mobile dropdown */}
            {isMobile && menuOpen && (
                <div style={{
                    padding: '8px 16px 16px',
                    borderTop: '1px solid var(--card-border)',
                }}>
                    {links.map(link => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`nav-link ${pathname === link.href ? 'active' : ''}`}
                            onClick={() => setMenuOpen(false)}
                            style={{ display: 'block', padding: '12px 16px' }}
                        >
                            <span style={{ marginRight: '8px' }}>{link.icon}</span>
                            {link.label}
                        </Link>
                    ))}
                </div>
            )}
        </nav>
    );
}
