import { useAuth } from '../AuthContext';
import { Navigate } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';

export default function Login() {
  const { user, signIn } = useAuth();

  if (user) {
    return <Navigate to="/" />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-zinc-900 p-8 shadow-2xl border border-zinc-800">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <Dumbbell className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-white">
            FightHQ.eu
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Manage your athletes, fights, and gym operations.
          </p>
        </div>
        <button
          onClick={signIn}
          className="group relative flex w-full justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-colors"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
