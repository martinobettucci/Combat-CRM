import { useEffect, useState } from 'react';
import { useAuth, UserProfile } from '../AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Search, Filter, User as UserIcon } from 'lucide-react';
import clsx from 'clsx';

import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (profile?.role === 'coach' || profile?.role === 'admin') {
      const q = query(collection(db, 'users'), where('role', '==', 'athlete'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data() as UserProfile);
        setAthletes(data);
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, [profile]);

  if (loading) {
    return <div className="animate-pulse flex space-x-4">Loading...</div>;
  }

  if (profile?.role === 'athlete') {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-white">Welcome back, {profile.firstName}</h1>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl bg-zinc-900 p-6 border border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-400">Current Category</h3>
            <p className="mt-2 text-3xl font-semibold text-white">{profile.category || 'Not set'}</p>
          </div>
          <div className="rounded-2xl bg-zinc-900 p-6 border border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-400">Status</h3>
            <p className="mt-2 text-3xl font-semibold text-white capitalize">{profile.isPro ? 'Professional' : 'Amateur'}</p>
          </div>
          <div className="rounded-2xl bg-zinc-900 p-6 border border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-400">Availability</h3>
            <p className="mt-2 text-3xl font-semibold text-white capitalize">
              <span className={clsx(
                "inline-flex items-center rounded-md px-2 py-1 text-sm font-medium ring-1 ring-inset",
                profile.availability === 'available' ? "bg-emerald-400/10 text-emerald-400 ring-emerald-400/20" :
                profile.availability === 'injured' ? "bg-red-400/10 text-red-400 ring-red-400/20" :
                "bg-zinc-400/10 text-zinc-400 ring-zinc-400/20"
              )}>
                {profile.availability || 'Not set'}
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const filteredAthletes = athletes.filter(a => 
    `${a.firstName} ${a.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-white">Athletes Roster</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-zinc-500" aria-hidden="true" />
          </div>
          <input
            type="text"
            className="block w-full rounded-xl border-0 bg-zinc-900 py-2.5 pl-10 pr-3 text-white ring-1 ring-inset ring-zinc-800 placeholder:text-zinc-500 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm sm:leading-6"
            placeholder="Search athletes by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-inset ring-zinc-800 hover:bg-zinc-800">
          <Filter className="h-4 w-4 text-zinc-400" />
          Filters
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredAthletes.map((athlete) => (
          <div key={athlete.uid} onClick={() => navigate(`/athletes/${athlete.uid}`)} className="flex flex-col rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden hover:border-zinc-700 transition-colors cursor-pointer">
            <div className="flex flex-1 flex-col p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-full bg-zinc-800 overflow-hidden shrink-0">
                  {athlete.photoUrl ? (
                    <img src={athlete.photoUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon className="h-full w-full p-2 text-zinc-500" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">{athlete.firstName} {athlete.lastName}</h3>
                  <p className="text-sm text-zinc-400">{athlete.category || 'No category'}</p>
                </div>
              </div>
              <dl className="mt-4 flex flex-grow flex-col justify-between gap-4">
                <div className="flex justify-between">
                  <dt className="text-sm text-zinc-500">Status</dt>
                  <dd className="text-sm font-medium text-white">
                    {athlete.isPro ? 'Pro' : 'Amateur'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-zinc-500">Weight</dt>
                  <dd className="text-sm font-medium text-white">
                    {athlete.weight ? `${athlete.weight} kg` : '-'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-zinc-500">Availability</dt>
                  <dd>
                    <span className={clsx(
                      "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
                      athlete.availability === 'available' ? "bg-emerald-400/10 text-emerald-400 ring-emerald-400/20" :
                      athlete.availability === 'injured' ? "bg-red-400/10 text-red-400 ring-red-400/20" :
                      "bg-zinc-400/10 text-zinc-400 ring-zinc-400/20"
                    )}>
                      {athlete.availability || 'Unknown'}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
