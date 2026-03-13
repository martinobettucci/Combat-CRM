import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, UserProfile } from '../AuthContext';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, updateDoc, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';
import { User as UserIcon, FileText, TrendingUp, Activity, Plus, X, Download, Clock, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import clsx from 'clsx';

interface Document {
  id: string;
  athleteId: string;
  uploaderId: string;
  type: 'license' | 'medical' | 'waiver' | 'other';
  name: string;
  url: string;
  version: number;
  status: 'active' | 'archived';
  createdAt: string;
}

interface ProgressLog {
  id: string;
  athleteId: string;
  coachId: string;
  date: string;
  type: 'training' | 'metric' | 'fight' | 'note';
  metrics?: {
    speed?: number;
    power?: number;
    endurance?: number;
  };
  notes?: string;
  createdAt: string;
}

export default function AthleteDetail() {
  const { id } = useParams<{ id: string }>();
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  
  const [athlete, setAthlete] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'documents'>('overview');
  const [loading, setLoading] = useState(true);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [progressLogs, setProgressLogs] = useState<ProgressLog[]>([]);

  // Modals state
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // Doc form
  const [docType, setDocType] = useState<'license' | 'medical' | 'waiver' | 'other'>('medical');
  const [docName, setDocName] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Log form
  const [logType, setLogType] = useState<'training' | 'metric' | 'fight' | 'note'>('training');
  const [logDate, setLogDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [logNotes, setLogNotes] = useState('');
  const [metricSpeed, setMetricSpeed] = useState('');
  const [metricPower, setMetricPower] = useState('');
  const [metricEndurance, setMetricEndurance] = useState('');

  useEffect(() => {
    if (!id) return;

    const fetchAthlete = async () => {
      try {
        const docRef = doc(db, 'users', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().role === 'athlete') {
          setAthlete(docSnap.data() as UserProfile);
        } else {
          navigate('/');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAthlete();

    // Listen to documents
    const qDocs = query(collection(db, 'documents'), where('athleteId', '==', id));
    const unsubDocs = onSnapshot(qDocs, (snap) => {
      setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Document)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });

    // Listen to progress logs
    const qLogs = query(collection(db, 'progress_logs'), where('athleteId', '==', id));
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      setProgressLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProgressLog)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    });

    return () => {
      unsubDocs();
      unsubLogs();
    };
  }, [id, navigate]);

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !docFile) return;

    setUploadingDoc(true);
    try {
      // Upload file to Storage
      const fileRef = ref(storage, `documents/${id}/${Date.now()}_${docFile.name}`);
      await uploadBytes(fileRef, docFile);
      const downloadUrl = await getDownloadURL(fileRef);

      // Check if there's an existing active document of the same type to archive
      const existingDocs = documents.filter(d => d.type === docType && d.status === 'active');
      for (const d of existingDocs) {
        await updateDoc(doc(db, 'documents', d.id), { status: 'archived' });
      }

      await addDoc(collection(db, 'documents'), {
        athleteId: id,
        uploaderId: user.uid,
        type: docType,
        name: docName,
        url: downloadUrl,
        version: existingDocs.length > 0 ? existingDocs[0].version + 1 : 1,
        status: 'active',
        createdAt: new Date().toISOString()
      });
      setIsDocModalOpen(false);
      setDocName(''); setDocFile(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'documents');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;

    try {
      const metrics: any = {};
      if (logType === 'metric') {
        if (metricSpeed) metrics.speed = Number(metricSpeed);
        if (metricPower) metrics.power = Number(metricPower);
        if (metricEndurance) metrics.endurance = Number(metricEndurance);
      }

      await addDoc(collection(db, 'progress_logs'), {
        athleteId: id,
        coachId: user.uid,
        date: logDate,
        type: logType,
        ...(Object.keys(metrics).length > 0 && { metrics }),
        ...(logNotes && { notes: logNotes }),
        createdAt: new Date().toISOString()
      });
      setIsLogModalOpen(false);
      setLogNotes(''); setMetricSpeed(''); setMetricPower(''); setMetricEndurance('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'progress_logs');
    }
  };

  if (loading || !athlete) return <div className="p-8 text-white">Loading...</div>;

  const chartData = progressLogs
    .filter(log => log.type === 'metric' && log.metrics)
    .map(log => ({
      date: format(new Date(log.date), 'MMM d'),
      speed: log.metrics?.speed || 0,
      power: log.metrics?.power || 0,
      endurance: log.metrics?.endurance || 0,
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-6 rounded-2xl bg-zinc-900 border border-zinc-800 p-6">
        <div className="h-24 w-24 rounded-full bg-zinc-800 overflow-hidden shrink-0">
          {athlete.photoUrl ? (
            <img src={athlete.photoUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <UserIcon className="h-full w-full p-4 text-zinc-500" />
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">{athlete.firstName} {athlete.lastName}</h1>
          <p className="mt-1 text-zinc-400">{athlete.category || 'No category'} • {athlete.isPro ? 'Professional' : 'Amateur'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'progress', 'documents'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={clsx(
                "whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium capitalize transition-colors",
                activeTab === tab
                  ? "border-emerald-500 text-emerald-500"
                  : "border-transparent text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
              )}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="py-4">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl bg-zinc-900 p-6 border border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-400">Weight & Height</h3>
              <p className="mt-2 text-2xl font-semibold text-white">
                {athlete.weight ? `${athlete.weight} kg` : '-'} / {athlete.height ? `${athlete.height} cm` : '-'}
              </p>
            </div>
            <div className="rounded-2xl bg-zinc-900 p-6 border border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-400">Availability</h3>
              <p className="mt-2 text-2xl font-semibold text-white capitalize">{athlete.availability || 'Unknown'}</p>
            </div>
            <div className="rounded-2xl bg-zinc-900 p-6 border border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-400">Target Fights</h3>
              <p className="mt-2 text-2xl font-semibold text-white">{athlete.fightsTarget || 0} per year</p>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 rounded-2xl bg-zinc-900 p-6 border border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-400">Goals & Roadmap</h3>
              <p className="mt-2 text-white whitespace-pre-wrap">{athlete.goals || 'No goals set.'}</p>
            </div>
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Performance Tracking</h2>
              {(profile?.role === 'coach' || profile?.role === 'admin') && (
                <button onClick={() => setIsLogModalOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400">
                  <Plus className="h-4 w-4" /> Log Progress
                </button>
              )}
            </div>

            {chartData.length > 0 ? (
              <div className="h-80 w-full rounded-2xl bg-zinc-900 p-6 border border-zinc-800">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis dataKey="date" stroke="#a1a1aa" />
                    <YAxis stroke="#a1a1aa" />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }} />
                    <Line type="monotone" dataKey="speed" stroke="#10b981" strokeWidth={2} name="Speed" />
                    <Line type="monotone" dataKey="power" stroke="#f43f5e" strokeWidth={2} name="Power" />
                    <Line type="monotone" dataKey="endurance" stroke="#3b82f6" strokeWidth={2} name="Endurance" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="rounded-2xl bg-zinc-900 p-8 text-center border border-zinc-800 text-zinc-400">
                No metric data available to chart.
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Recent Logs</h3>
              {progressLogs.slice().reverse().map(log => (
                <div key={log.id} className="rounded-xl bg-zinc-900 p-4 border border-zinc-800 flex flex-col sm:flex-row gap-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-zinc-800 shrink-0">
                    {log.type === 'metric' ? <Activity className="h-5 w-5 text-blue-400" /> :
                     log.type === 'training' ? <TrendingUp className="h-5 w-5 text-emerald-400" /> :
                     log.type === 'fight' ? <UserIcon className="h-5 w-5 text-red-400" /> :
                     <FileText className="h-5 w-5 text-zinc-400" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium text-white capitalize">{log.type} Log</p>
                      <span className="text-xs text-zinc-500">{format(new Date(log.date), 'MMM d, yyyy')}</span>
                    </div>
                    {log.notes && <p className="mt-1 text-sm text-zinc-400">{log.notes}</p>}
                    {log.metrics && (
                      <div className="mt-2 flex gap-4 text-xs">
                        {log.metrics.speed && <span className="text-emerald-400">Speed: {log.metrics.speed}</span>}
                        {log.metrics.power && <span className="text-red-400">Power: {log.metrics.power}</span>}
                        {log.metrics.endurance && <span className="text-blue-400">Endurance: {log.metrics.endurance}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Document Management</h2>
              {(profile?.role === 'coach' || profile?.role === 'admin' || profile?.uid === athlete.uid) && (
                <button onClick={() => setIsDocModalOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400">
                  <Plus className="h-4 w-4" /> Upload Document
                </button>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800">
              <table className="min-w-full divide-y divide-zinc-800">
                <thead>
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Version</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white flex items-center gap-3">
                        <FileText className="h-5 w-5 text-zinc-500" />
                        {doc.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400 capitalize">{doc.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={clsx("inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset", doc.status === 'active' ? "bg-emerald-400/10 text-emerald-400 ring-emerald-400/20" : "bg-zinc-400/10 text-zinc-400 ring-zinc-400/20")}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400">v{doc.version}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400">{format(new Date(doc.createdAt), 'MMM d, yyyy')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-400 inline-flex items-center gap-1">
                          <Download className="h-4 w-4" /> View
                        </a>
                      </td>
                    </tr>
                  ))}
                  {documents.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-sm text-zinc-500">No documents found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={() => setIsDocModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-zinc-900 p-6 shadow-2xl border border-zinc-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Upload Document</h2>
              <button onClick={() => setIsDocModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUploadDoc} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white">Document Type</label>
                <select value={docType} onChange={e => setDocType(e.target.value as any)} className="mt-1 block w-full rounded-xl border-0 bg-zinc-950 py-2 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm">
                  <option value="medical">Medical Certificate</option>
                  <option value="license">Fighter License</option>
                  <option value="waiver">Waiver / Contract</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white">Document Name</label>
                <input required type="text" value={docName} onChange={e => setDocName(e.target.value)} placeholder="e.g. 2026 Medical Clearance" className="mt-1 block w-full rounded-xl border-0 bg-zinc-950 py-2 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white">File</label>
                <div className="mt-1 flex justify-center rounded-xl border border-dashed border-zinc-700 px-6 py-10">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-zinc-500" aria-hidden="true" />
                    <div className="mt-4 flex text-sm leading-6 text-zinc-400 justify-center">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md bg-zinc-900 font-semibold text-emerald-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-2 hover:text-emerald-400"
                      >
                        <span>Upload a file</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={e => setDocFile(e.target.files?.[0] || null)} required />
                      </label>
                    </div>
                    <p className="text-xs leading-5 text-zinc-500 mt-2">PDF, PNG, JPG up to 10MB</p>
                    {docFile && <p className="text-sm text-emerald-400 mt-2">{docFile.name}</p>}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsDocModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-zinc-400 hover:text-white" disabled={uploadingDoc}>Cancel</button>
                <button type="submit" disabled={uploadingDoc || !docFile} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-50">
                  {uploadingDoc ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Progress Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={() => setIsLogModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-zinc-900 p-6 shadow-2xl border border-zinc-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Log Progress</h2>
              <button onClick={() => setIsLogModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddLog} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white">Log Type</label>
                  <select value={logType} onChange={e => setLogType(e.target.value as any)} className="mt-1 block w-full rounded-xl border-0 bg-zinc-950 py-2 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm">
                    <option value="training">Training Session</option>
                    <option value="metric">Performance Metrics</option>
                    <option value="fight">Fight Record</option>
                    <option value="note">Coach Note</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white">Date</label>
                  <input required type="date" value={logDate} onChange={e => setLogDate(e.target.value)} className="mt-1 block w-full rounded-xl border-0 bg-zinc-950 py-2 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm" />
                </div>
              </div>

              {logType === 'metric' && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400">Speed (1-10)</label>
                    <input type="number" min="1" max="10" value={metricSpeed} onChange={e => setMetricSpeed(e.target.value)} className="mt-1 block w-full rounded-lg border-0 bg-zinc-900 py-1.5 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400">Power (1-10)</label>
                    <input type="number" min="1" max="10" value={metricPower} onChange={e => setMetricPower(e.target.value)} className="mt-1 block w-full rounded-lg border-0 bg-zinc-900 py-1.5 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400">Endurance (1-10)</label>
                    <input type="number" min="1" max="10" value={metricEndurance} onChange={e => setMetricEndurance(e.target.value)} className="mt-1 block w-full rounded-lg border-0 bg-zinc-900 py-1.5 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-white">Notes</label>
                <textarea rows={3} value={logNotes} onChange={e => setLogNotes(e.target.value)} placeholder="Add details about the session..." className="mt-1 block w-full rounded-xl border-0 bg-zinc-950 py-2 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm" />
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsLogModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-zinc-400 hover:text-white">Cancel</button>
                <button type="submit" className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400">Save Log</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
