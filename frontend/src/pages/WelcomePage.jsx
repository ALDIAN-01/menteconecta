import { useEffect, useState } from 'react';
import { Logo } from '../components/AuthLayout.jsx';
import { ApiError, getCurrentUser } from '../api/authApi.js';

/**
 * Pantalla de confirmación posterior a registro/login.
 * Consulta GET /api/auth/me con el token para mostrar los datos reales del servidor.
 * (El resto de la app —registro emocional, biblioteca, etc.— son módulos futuros.)
 */
export default function WelcomePage({ session, message, onOpenEmotions, onLogout, onSessionExpired }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getCurrentUser(session.token)
      .then((data) => !cancelled && setUser(data.user))
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) onSessionExpired();
        else setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [session.token, onSessionExpired]);

  return (
    <div className="auth-page">
      <main className="welcome-card">
        <Logo />
        {message && (
          <p className="alert alert-success" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}
        {!user && !error && <p className="muted">Cargando tu información…</p>}
        {user && (
          <>
            <h1 className="auth-title">Hola, {user.nombre}.</h1>
            <p className="muted">Sesión iniciada con {user.correo}.</p>
            <p className="muted">
              Consulta tu registro emocional personal y guarda cómo te sientes.
            </p>
            <button type="button" className="btn btn-primary" onClick={onOpenEmotions}>
              Mi registro emocional
            </button>
          </>
        )}
        <button type="button" className="btn btn-secondary" onClick={onLogout}>
          Cerrar sesión
        </button>
      </main>
    </div>
  );
}
