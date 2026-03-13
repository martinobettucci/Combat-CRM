import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { collection, query, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Calendar, MapPin, Weight, DollarSign, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

interface Opportunity {
  id: string;
  title: string;
  date: string;
  location: string;
  weightCategory: string;
  purse?: string;
  description?: string;
  status: 'open' | 'closed';
  createdBy: string;
  createdAt: string;
}

interface Application {
  id: string;
  opportunityId: string;
  athleteId: string;
  status: 'pending' | 'accepted' | 'rejected';
  appliedAt: string;
}

export default function Opportunities() {
  const { profile, user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [weightCategory, setWeightCategory] = useState('');
  const [purse, setPurse] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'opportunities'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Opportunity));
      setOpportunities(data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'opportunities');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    let q;
    if (profile?.role === 'athlete') {
      q = query(collection(db, 'applications'), where('athleteId', '==', user.uid));
    } else {
      q = query(collection(db, 'applications'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Application));
      setApplications(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'applications');
    });

    return () => unsubscribe();
  }, [user, profile]);

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const oppRef = await addDoc(collection(db, 'opportunities'), {
        title,
        date: new Date(date).toISOString(),
        location,
        weightCategory,
        purse,
        description,
        status: 'open',
        createdBy: user.uid,
        createdAt: new Date().toISOString()
      });

      // Notify all athletes
      const athletesQuery = query(collection(db, 'users'), where('role', '==', 'athlete'));
      const athletesSnapshot = await getDocs(athletesQuery);
      
      const notifications = athletesSnapshot.docs.map(doc => ({
        userId: doc.id,
        title: 'New Fight Opportunity',
        message: `A new fight opportunity "${title}" has been posted for ${weightCategory}.`,
        type: 'opportunity',
        read: false,
        createdAt: new Date().toISOString()
      }));

      // In a real app, use a batch write here
      for (const notification of notifications) {
        await addDoc(collection(db, 'notifications'), notification);
      }

      setIsModalOpen(false);
      // Reset form
      setTitle(''); setDate(''); setLocation(''); setWeightCategory(''); setPurse(''); setDescription('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'opportunities');
    }
  };

  const handleApply = async (opportunityId: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'applications'), {
        opportunityId,
        athleteId: user.uid,
        status: 'pending',
        appliedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'applications');
    }
  };

  const handleCloseOpportunity = async (opportunityId: string) => {
    try {
      await updateDoc(doc(db, 'opportunities', opportunityId), { status: 'closed' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `opportunities/${opportunityId}`);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Fight Opportunities</h1>
          <p className="mt-2 text-sm text-zinc-400">Find and apply for upcoming fights.</p>
        </div>
        {(profile?.role === 'coach' || profile?.role === 'admin') && (
          <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            >
              <Plus className="h-4 w-4" />
              Post Fight
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {opportunities.map((opp) => {
          const hasApplied = applications.some(app => app.opportunityId === opp.id && app.athleteId === user?.uid);
          const oppApplications = applications.filter(app => app.opportunityId === opp.id);

          return (
            <div key={opp.id} className="flex flex-col rounded-2xl bg-zinc-900 border border-zinc-800 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-white">{opp.title}</h3>
                  <div className="mt-1 flex items-center gap-2 text-sm text-zinc-400">
                    <span className={clsx(
                      "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
                      opp.status === 'open' ? "bg-emerald-400/10 text-emerald-400 ring-emerald-400/20" : "bg-zinc-400/10 text-zinc-400 ring-zinc-400/20"
                    )}>
                      {opp.status.toUpperCase()}
                    </span>
                    {profile?.role === 'coach' && (
                      <span className="text-xs">{oppApplications.length} applicants</span>
                    )}
                  </div>
                </div>
              </div>

              <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-zinc-500" />
                  <dd className="text-sm text-zinc-300">{format(new Date(opp.date), 'MMM d, yyyy')}</dd>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-zinc-500" />
                  <dd className="text-sm text-zinc-300">{opp.location}</dd>
                </div>
                <div className="flex items-center gap-3">
                  <Weight className="h-5 w-5 text-zinc-500" />
                  <dd className="text-sm text-zinc-300">{opp.weightCategory}</dd>
                </div>
                {opp.purse && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-zinc-500" />
                    <dd className="text-sm text-zinc-300">{opp.purse}</dd>
                  </div>
                )}
              </dl>

              {opp.description && (
                <p className="mt-6 text-sm text-zinc-400">{opp.description}</p>
              )}

              <div className="mt-6 pt-6 border-t border-zinc-800 flex justify-end gap-3">
                {profile?.role === 'athlete' && opp.status === 'open' && !hasApplied && (
                  <button
                    onClick={() => handleApply(opp.id)}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
                  >
                    Apply for Fight
                  </button>
                )}
                {profile?.role === 'athlete' && hasApplied && (
                  <span className="inline-flex items-center rounded-xl bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-400 cursor-not-allowed">
                    Applied
                  </span>
                )}
                {profile?.role === 'coach' && opp.createdBy === user?.uid && opp.status === 'open' && (
                  <button
                    onClick={() => handleCloseOpportunity(opp.id)}
                    className="rounded-xl bg-zinc-800 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
                  >
                    Close Opportunity
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-zinc-900 p-6 shadow-2xl border border-zinc-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Post Fight Opportunity</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateOpportunity} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white">Title</label>
                <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="mt-1 block w-full rounded-xl border-0 bg-zinc-950 py-2 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white">Date</label>
                  <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full rounded-xl border-0 bg-zinc-950 py-2 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white">Location</label>
                  <input required type="text" value={location} onChange={e => setLocation(e.target.value)} className="mt-1 block w-full rounded-xl border-0 bg-zinc-950 py-2 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white">Weight Category</label>
                  <input required type="text" value={weightCategory} onChange={e => setWeightCategory(e.target.value)} className="mt-1 block w-full rounded-xl border-0 bg-zinc-950 py-2 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white">Purse (Optional)</label>
                  <input type="text" value={purse} onChange={e => setPurse(e.target.value)} className="mt-1 block w-full rounded-xl border-0 bg-zinc-950 py-2 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white">Description</label>
                <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full rounded-xl border-0 bg-zinc-950 py-2 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm" />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-zinc-400 hover:text-white">Cancel</button>
                <button type="submit" className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400">Post Opportunity</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
