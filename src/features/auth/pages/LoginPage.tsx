import { useEffect, useState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Input } from "../../../shared/components/ui/Input";
import { useAuthStore } from "../store/auth.store";

export function LoginPage() {
  const authStatus = useAuthStore((s) => s.auth.status);
  const authSession = useAuthStore((s) => s.auth.session);
  const authError = useAuthStore((s) => s.auth.authError);
  const initAuth = useAuthStore((s) => s.initAuth);
  const signInWithPassword = useAuthStore((s) => s.signInWithPassword);
  const clearAuthError = useAuthStore((s) => s.clearAuthError);

  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (!authSession?.user) return;
    const params = new URLSearchParams(location.search);
    const from = params.get("from") || "/";
    navigate(from, { replace: true });
  }, [authSession?.user, location.search, navigate]);

  async function onAuthSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (authBusy || !authEmail.trim() || !authPassword) return;
    setAuthBusy(true);
    clearAuthError();
    try {
      await signInWithPassword(authEmail, authPassword);
      setAuthPassword("");
    } catch (err) {
      console.error(err);
    } finally {
      setAuthBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-4 pb-12 pt-6">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Money Control</h1>
          <p className="text-base-content/70">
            Entre para acessar seus dados na nuvem.
          </p>
        </div>
        <div className="badge badge-outline">
          {authStatus === "loading" || authStatus === "idle"
            ? "Sessão…"
            : authSession?.user
              ? "Logado"
              : "Login"}
        </div>
      </header>

      <section
        className="card border border-base-300 bg-base-100"
        aria-label="Login"
      >
        <div className="card-body">
          <h2 className="card-title">Login</h2>
          {authError ? (
            <div className="alert alert-error" role="alert">
              {authError}
            </div>
          ) : null}
          <form onSubmit={(e) => void onAuthSignIn(e)}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="E-mail"
                type="email"
                name="email"
                autoComplete="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                disabled={authBusy}
              />
              <Input
                label="Senha"
                type="password"
                name="password"
                autoComplete="current-password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                disabled={authBusy}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={authBusy}
                className="btn btn-primary"
              >
                {authBusy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <LogIn className="size-4" aria-hidden />
                )}
                <span>{authBusy ? "Entrando…" : "Entrar"}</span>
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
