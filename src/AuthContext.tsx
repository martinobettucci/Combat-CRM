import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { signInWithPopup, signOut, User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, deleteField } from 'firebase/firestore';

export type Role = 'athlete' | 'coach' | 'admin';

export interface UserProfile {
  uid: string;
  role: Role;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl?: string;
  weight?: number;
  height?: number;
  category?: string;
  isPro?: boolean;
  fightsTarget?: number;
  medicalClearance?: boolean;
  goals?: string;
  availability?: 'available' | 'unavailable' | 'injured';
  createdAt: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) {
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              role: 'athlete',
              firstName: currentUser.displayName?.split(' ')[0] || '',
              lastName: currentUser.displayName?.split(' ').slice(1).join(' ') || '',
              email: currentUser.email || '',
              photoUrl: currentUser.photoURL || undefined,
              createdAt: new Date().toISOString(),
            };
            
            // Remove undefined values
            const cleanProfile = Object.fromEntries(
              Object.entries(newProfile).filter(([_, v]) => v !== undefined)
            );
            
            await setDoc(docRef, cleanProfile);
          }
          
          const unsubscribeProfile = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
              setProfile(snap.data() as UserProfile);
            }
            setLoading(false);
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
            setLoading(false);
          });
          return () => unsubscribeProfile();
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in", error);
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const cleanData: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (value === undefined) {
          cleanData[key] = deleteField();
        } else {
          cleanData[key] = value;
        }
      }
      await setDoc(doc(db, 'users', user.uid), cleanData, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, logOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
