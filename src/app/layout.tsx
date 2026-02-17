import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata: Metadata = {
  title: "PinkBalloon | Turma das Maratonistas TM",
  description: "Plataforma de evolução em programação competitiva para meninas. Exercícios diários, ranking, e desenvolvimento pessoal com Codeforces.",
  keywords: "programação competitiva, codeforces, mulheres programadoras, competitive programming",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
