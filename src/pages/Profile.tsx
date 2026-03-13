import React, { useState, useEffect } from 'react';
import { useAuth, UserProfile } from '../AuthContext';
import { Save, Bell } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  types: string[];
}

export default function Profile() {
  const { profile, updateProfile, user } = useAuth();
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    email: true,
    push: true,
    inApp: true,
    types: ['opportunity', 'event', 'schedule', 'message', 'system']
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName,
        lastName: profile.lastName,
        weight: profile.weight,
        height: profile.height,
        category: profile.category,
        isPro: profile.isPro,
        fightsTarget: profile.fightsTarget,
        medicalClearance: profile.medicalClearance,
        goals: profile.goals,
        availability: profile.availability,
        role: profile.role,
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    const fetchPrefs = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'notification_preferences', user.uid));
        if (docSnap.exists()) {
          setPrefs(docSnap.data() as NotificationPreferences);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `notification_preferences/${user.uid}`);
      }
    };
    fetchPrefs();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let finalValue: any = value;
    
    if (type === 'checkbox') {
      finalValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      finalValue = value === '' ? undefined : Number(value);
    }

    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handlePrefChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setPrefs(prev => ({ ...prev, [name]: checked }));
  };

  const handleTypeChange = (type: string, checked: boolean) => {
    setPrefs(prev => {
      const types = checked 
        ? [...prev.types, type]
        : prev.types.filter(t => t !== type);
      return { ...prev, types };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await updateProfile(formData);
    setSaving(false);
  };

  const handleSavePrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingPrefs(true);
    try {
      await setDoc(doc(db, 'notification_preferences', user.uid), {
        userId: user.uid,
        ...prefs
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notification_preferences/${user.uid}`);
    } finally {
      setSavingPrefs(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="space-y-10 divide-y divide-zinc-800">
      <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-3">
        <div className="px-4 sm:px-0">
          <h2 className="text-base font-semibold leading-7 text-white">Personal Information</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-400">
            Update your basic details and physical attributes.
          </p>
        </div>

        <form className="bg-zinc-900 shadow-sm ring-1 ring-zinc-800 sm:rounded-2xl md:col-span-2" onSubmit={handleSubmit}>
          <div className="px-4 py-6 sm:p-8">
            <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="firstName" className="block text-sm font-medium leading-6 text-white">First name</label>
                <div className="mt-2">
                  <input type="text" name="firstName" id="firstName" value={formData.firstName || ''} onChange={handleChange} className="block w-full rounded-xl border-0 bg-zinc-950 py-1.5 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm sm:leading-6" />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="lastName" className="block text-sm font-medium leading-6 text-white">Last name</label>
                <div className="mt-2">
                  <input type="text" name="lastName" id="lastName" value={formData.lastName || ''} onChange={handleChange} className="block w-full rounded-xl border-0 bg-zinc-950 py-1.5 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm sm:leading-6" />
                </div>
              </div>

              <div className="sm:col-span-2 sm:col-start-1">
                <label htmlFor="weight" className="block text-sm font-medium leading-6 text-white">Weight (kg)</label>
                <div className="mt-2">
                  <input type="number" name="weight" id="weight" value={formData.weight || ''} onChange={handleChange} className="block w-full rounded-xl border-0 bg-zinc-950 py-1.5 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm sm:leading-6" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="height" className="block text-sm font-medium leading-6 text-white">Height (cm)</label>
                <div className="mt-2">
                  <input type="number" name="height" id="height" value={formData.height || ''} onChange={handleChange} className="block w-full rounded-xl border-0 bg-zinc-950 py-1.5 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm sm:leading-6" />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="category" className="block text-sm font-medium leading-6 text-white">Category</label>
                <div className="mt-2">
                  <input type="text" name="category" id="category" value={formData.category || ''} onChange={handleChange} placeholder="e.g. Welterweight" className="block w-full rounded-xl border-0 bg-zinc-950 py-1.5 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm sm:leading-6" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-x-6 border-t border-zinc-800 px-4 py-4 sm:px-8">
            <button type="submit" disabled={saving} className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-x-8 gap-y-8 pt-10 md:grid-cols-3">
        <div className="px-4 sm:px-0">
          <h2 className="text-base font-semibold leading-7 text-white">Sporting Profile</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-400">
            Define your goals, availability, and professional status.
          </p>
        </div>

        <form className="bg-zinc-900 shadow-sm ring-1 ring-zinc-800 sm:rounded-2xl md:col-span-2" onSubmit={handleSubmit}>
          <div className="px-4 py-6 sm:p-8">
            <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              
              <div className="sm:col-span-3">
                <label htmlFor="availability" className="block text-sm font-medium leading-6 text-white">Availability</label>
                <div className="mt-2">
                  <select id="availability" name="availability" value={formData.availability || ''} onChange={handleChange} className="block w-full rounded-xl border-0 bg-zinc-950 py-1.5 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm sm:leading-6">
                    <option value="">Select status</option>
                    <option value="available">Available to fight</option>
                    <option value="unavailable">Unavailable (Training/Resting)</option>
                    <option value="injured">Injured</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="fightsTarget" className="block text-sm font-medium leading-6 text-white">Target Fights (Year)</label>
                <div className="mt-2">
                  <input type="number" name="fightsTarget" id="fightsTarget" value={formData.fightsTarget || ''} onChange={handleChange} className="block w-full rounded-xl border-0 bg-zinc-950 py-1.5 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm sm:leading-6" />
                </div>
              </div>

              <div className="col-span-full">
                <label htmlFor="goals" className="block text-sm font-medium leading-6 text-white">Goals & Roadmap</label>
                <div className="mt-2">
                  <textarea id="goals" name="goals" rows={3} value={formData.goals || ''} onChange={handleChange} className="block w-full rounded-xl border-0 bg-zinc-950 py-1.5 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm sm:leading-6" />
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-400">Write down your short and long-term goals.</p>
              </div>

              <div className="col-span-full">
                <div className="flex gap-3">
                  <div className="flex h-6 items-center">
                    <input id="isPro" name="isPro" type="checkbox" checked={formData.isPro || false} onChange={handleChange} className="h-4 w-4 rounded border-zinc-800 bg-zinc-950 text-emerald-600 focus:ring-emerald-600 focus:ring-offset-zinc-900" />
                  </div>
                  <div className="text-sm leading-6">
                    <label htmlFor="isPro" className="font-medium text-white">Professional Status</label>
                    <p className="text-zinc-400">Check this if you compete professionally.</p>
                  </div>
                </div>
              </div>

              <div className="col-span-full">
                <div className="flex gap-3">
                  <div className="flex h-6 items-center">
                    <input id="medicalClearance" name="medicalClearance" type="checkbox" checked={formData.medicalClearance || false} onChange={handleChange} className="h-4 w-4 rounded border-zinc-800 bg-zinc-950 text-emerald-600 focus:ring-emerald-600 focus:ring-offset-zinc-900" />
                  </div>
                  <div className="text-sm leading-6">
                    <label htmlFor="medicalClearance" className="font-medium text-white">Medical Clearance</label>
                    <p className="text-zinc-400">Check this if your medicals are up to date.</p>
                  </div>
                </div>
              </div>

              <div className="col-span-full pt-6 border-t border-zinc-800">
                <label htmlFor="role" className="block text-sm font-medium leading-6 text-white">Role (Demo Mode)</label>
                <div className="mt-2">
                  <select id="role" name="role" value={formData.role || profile.role} onChange={handleChange} className="block w-full rounded-xl border-0 bg-zinc-950 py-1.5 text-white shadow-sm ring-1 ring-inset ring-zinc-800 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm sm:leading-6">
                    <option value="athlete">Athlete</option>
                    <option value="coach">Coach / Manager</option>
                  </select>
                </div>
                <p className="mt-2 text-xs text-zinc-500">Change your role to test different features of the platform.</p>
              </div>

            </div>
          </div>
          <div className="flex items-center justify-end gap-x-6 border-t border-zinc-800 px-4 py-4 sm:px-8">
            <button type="submit" disabled={saving} className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mt-8">
        <div className="border-b border-zinc-800 px-6 py-5">
          <h2 className="text-lg font-medium text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-emerald-500" />
            Notification Preferences
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Manage how and when you receive notifications.
          </p>
        </div>

        <form onSubmit={handleSavePrefs} className="p-6 space-y-8">
          <div>
            <h3 className="text-sm font-medium text-white mb-4">Delivery Methods</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  id="email"
                  name="email"
                  type="checkbox"
                  checked={prefs.email}
                  onChange={handlePrefChange}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900"
                />
                <label htmlFor="email" className="ml-3 text-sm text-zinc-300">
                  Email Notifications
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="push"
                  name="push"
                  type="checkbox"
                  checked={prefs.push}
                  onChange={handlePrefChange}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900"
                />
                <label htmlFor="push" className="ml-3 text-sm text-zinc-300">
                  Push Notifications
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="inApp"
                  name="inApp"
                  type="checkbox"
                  checked={prefs.inApp}
                  onChange={handlePrefChange}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900"
                />
                <label htmlFor="inApp" className="ml-3 text-sm text-zinc-300">
                  In-App Notifications
                </label>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-white mb-4">Notification Types</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  id="type-opportunity"
                  type="checkbox"
                  checked={prefs.types.includes('opportunity')}
                  onChange={(e) => handleTypeChange('opportunity', e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900"
                />
                <label htmlFor="type-opportunity" className="ml-3 text-sm text-zinc-300">
                  New Fight Opportunities
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="type-event"
                  type="checkbox"
                  checked={prefs.types.includes('event')}
                  onChange={(e) => handleTypeChange('event', e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900"
                />
                <label htmlFor="type-event" className="ml-3 text-sm text-zinc-300">
                  Upcoming Events (Fights, Camps)
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="type-schedule"
                  type="checkbox"
                  checked={prefs.types.includes('schedule')}
                  onChange={(e) => handleTypeChange('schedule', e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900"
                />
                <label htmlFor="type-schedule" className="ml-3 text-sm text-zinc-300">
                  Schedule Changes
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="type-message"
                  type="checkbox"
                  checked={prefs.types.includes('message')}
                  onChange={(e) => handleTypeChange('message', e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900"
                />
                <label htmlFor="type-message" className="ml-3 text-sm text-zinc-300">
                  Direct Messages
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-800">
            <button
              type="submit"
              disabled={savingPrefs}
              className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {savingPrefs ? (
                'Saving...'
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
