import React from 'react';
import { UserProfile } from '../AuthContext';
import { format } from 'date-fns';

interface Document {
  id: string;
  type: string;
  name: string;
  url: string;
  status: string;
  expiryDate?: string;
}

interface ProgressLog {
  id: string;
  date: string;
  type: string;
  metrics?: any;
  notes?: string;
}

interface PrintableProfileProps {
  athlete: UserProfile;
  documents: Document[];
  progressLogs: ProgressLog[];
}

export const PrintableProfile = React.forwardRef<HTMLDivElement, PrintableProfileProps>(({ athlete, documents, progressLogs }, ref) => {
  const headshot = documents.find(d => d.type === 'photo-headshot' && d.status === 'active')?.url || athlete.photoUrl;
  const stancePhoto = documents.find(d => d.type === 'photo-stance' && d.status === 'active')?.url;
  const fullBodyPhoto = documents.find(d => d.type === 'photo-fullbody' && d.status === 'active')?.url;

  const activeMedical = documents.find(d => d.type === 'medical' && d.status === 'active');

  return (
    <div ref={ref} className="p-10 bg-white text-black min-h-screen font-sans" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto' }}>
      {/* Header Section */}
      <div className="flex items-center justify-between border-b-4 border-black pb-6 mb-6">
        <div className="flex items-center gap-6">
          {headshot ? (
            <img src={headshot} alt="Headshot" className="w-32 h-32 rounded-full object-cover border-2 border-gray-300" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 border-2 border-gray-300">
              No Photo
            </div>
          )}
          <div>
            <h1 className="text-5xl font-black uppercase tracking-tighter">{athlete.firstName} {athlete.lastName}</h1>
            <p className="text-2xl text-gray-600 font-medium mt-1">{athlete.category || 'Uncategorized'} • {athlete.isPro ? 'Professional' : 'Amateur'}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-gray-400 uppercase tracking-widest">Fighter Profile</div>
          <div className="text-lg font-bold mt-2">{format(new Date(), 'MMM d, yyyy')}</div>
        </div>
      </div>

      {/* Stats & Info Grid */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h2 className="text-xl font-bold uppercase border-b-2 border-gray-200 pb-2 mb-4">Physical Stats</h2>
          <ul className="space-y-3 text-lg">
            <li className="flex justify-between"><span className="text-gray-500">Weight:</span> <span className="font-bold">{athlete.weight ? `${athlete.weight} kg` : 'N/A'}</span></li>
            <li className="flex justify-between"><span className="text-gray-500">Height:</span> <span className="font-bold">{athlete.height ? `${athlete.height} cm` : 'N/A'}</span></li>
            <li className="flex justify-between"><span className="text-gray-500">Availability:</span> <span className="font-bold capitalize">{athlete.availability || 'N/A'}</span></li>
          </ul>
        </div>
        <div>
          <h2 className="text-xl font-bold uppercase border-b-2 border-gray-200 pb-2 mb-4">Medical & Licensing</h2>
          <ul className="space-y-3 text-lg">
            <li className="flex justify-between">
              <span className="text-gray-500">Medical Clearance:</span> 
              <span className="font-bold text-green-600">
                {activeMedical ? (activeMedical.expiryDate ? `Valid until ${format(new Date(activeMedical.expiryDate), 'MMM yyyy')}` : 'Cleared') : 'Missing'}
              </span>
            </li>
            <li className="flex justify-between"><span className="text-gray-500">Target Fights/Yr:</span> <span className="font-bold">{athlete.fightsTarget || 'N/A'}</span></li>
          </ul>
        </div>
      </div>

      {/* Photos Section */}
      {(stancePhoto || fullBodyPhoto) && (
        <div className="mb-8">
          <h2 className="text-xl font-bold uppercase border-b-2 border-gray-200 pb-2 mb-4">Media</h2>
          <div className="flex gap-4">
            {stancePhoto && (
              <div className="flex-1">
                <p className="text-sm text-gray-500 font-bold uppercase mb-2">Fight Stance</p>
                <img src={stancePhoto} alt="Stance" className="w-full h-64 object-cover rounded-lg border border-gray-200" referrerPolicy="no-referrer" />
              </div>
            )}
            {fullBodyPhoto && (
              <div className="flex-1">
                <p className="text-sm text-gray-500 font-bold uppercase mb-2">Full Body</p>
                <img src={fullBodyPhoto} alt="Full Body" className="w-full h-64 object-cover rounded-lg border border-gray-200" referrerPolicy="no-referrer" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Goals & Notes */}
      <div className="mb-8">
        <h2 className="text-xl font-bold uppercase border-b-2 border-gray-200 pb-2 mb-4">Goals & Roadmap</h2>
        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
          {athlete.goals || 'No specific goals recorded.'}
        </p>
      </div>

      {/* Recent Performance */}
      <div>
        <h2 className="text-xl font-bold uppercase border-b-2 border-gray-200 pb-2 mb-4">Recent Performance Logs</h2>
        {progressLogs.length > 0 ? (
          <div className="space-y-4">
            {progressLogs.slice(0, 5).map(log => (
              <div key={log.id} className="border-l-4 border-black pl-4 py-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold capitalize">{log.type}</span>
                  <span className="text-sm text-gray-500">{format(new Date(log.date), 'MMM d, yyyy')}</span>
                </div>
                {log.notes && <p className="text-gray-700 mt-1">{log.notes}</p>}
                {log.metrics && (
                  <div className="mt-2 flex gap-4 text-sm font-medium">
                    {log.metrics.speed && <span>Speed: {log.metrics.speed}/10</span>}
                    {log.metrics.power && <span>Power: {log.metrics.power}/10</span>}
                    {log.metrics.endurance && <span>Endurance: {log.metrics.endurance}/10</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No recent logs available.</p>
        )}
      </div>
      
      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-400">
        Generated by FightHQ.eu • {format(new Date(), 'MMMM d, yyyy')}
      </div>
    </div>
  );
});

PrintableProfile.displayName = 'PrintableProfile';
