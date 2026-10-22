import { useCallback, useState } from 'react';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import WelcomePage from './pages/WelcomePage.jsx';
import EmotionPage from './pages/EmotionPage.jsx';

/**
 * Navegación mínima por estado (sin librería de rutas, para mantener el piloto simple).
 *
 * SESIÓN: el token JWT vive SOLO en memoria (estado de React). No se guarda en localStorage
 * para no exponerlo a robo por XSS. Consecuencia: al recargar la página se pierde la sesión y
 * hay que volver a iniciar sesión. Ver README, sección "Decisión sobre el token".
 */
export default function App() {
  const [view, setView] = useState('login'); // 'login' | 'register'
  const [authenticatedView, setAuthenticatedView] = useState('welcome');
  const [session, setSession] = useState(null); // { user, token } | null
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [loginNotice, setLoginNotice] = useState('');

  const handleAuthSuccess = ({ message, user, token }) => {
    setWelcomeMessage(message);
    setLoginNotice('');
    setAuthenticatedView('welcome');
    setSession({ user, token });
  };

  const handleLogout = useCallback(() => {
    setSession(null);
    setView('login');
    setLoginNotice('');
  }, []);

  const handleSessionExpired = useCallback(() => {
    setSession(null);
    setView('login');
    setLoginNotice('Tu sesión venció. Inicia sesión de nuevo.');
  }, []);

  if (session) {
    if (authenticatedView === 'emotions') {
      return (
        <EmotionPage
          session={session}
          onBack={() => setAuthenticatedView('welcome')}
          onLogout={handleLogout}
          onSessionExpired={handleSessionExpired}
        />
      );
    }
    return (
      <WelcomePage
        session={session}
        message={welcomeMessage}
        onOpenEmotions={() => setAuthenticatedView('emotions')}
        onLogout={handleLogout}
        onSessionExpired={handleSessionExpired}
      />
    );
  }

  return view === 'register' ? (
    <RegisterPage onSuccess={handleAuthSuccess} onGoToLogin={() => setView('login')} />
  ) : (
    <LoginPage
      onSuccess={handleAuthSuccess}
      onGoToRegister={() => setView('register')}
      notice={loginNotice}
    />
  );
}
