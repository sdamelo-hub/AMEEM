import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { User, BUREAU_MEMBERS, ADMIN_EMAIL, ADMIN_PASSWORD } from '../types';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  register: (data: Partial<User> & { password: string; _forcedRole?: string }) => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  verifyPassword: (password: string) => Promise<boolean>;
  isFirstTime: boolean;
  setIsFirstTime: (v: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('amicale_user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        setCurrentUser(user);
        setIsFirstTime(false);
      } catch { 
        localStorage.removeItem('amicale_user');
        setIsFirstTime(true);
      }
    } else {
      setIsFirstTime(true);
    }
    setIsLoading(false);
  }, []);

  const checkIfBureauMember = (email: string, phone: string, firstName: string, lastName: string): { isMember: boolean; bureauRole?: string } => {
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phone.replace(/\s/g, '');
    const normalizedFirstName = firstName.toLowerCase().trim();
    const normalizedLastName = lastName.toLowerCase().trim();

    for (const member of BUREAU_MEMBERS) {
      const memberEmail = member.email.toLowerCase().trim();
      const memberPhone = member.phone.replace(/\s/g, '');
      const memberFirst = member.firstName.toLowerCase().trim();
      const memberLast = member.lastName.toLowerCase().trim();

      if (
        (memberEmail && normalizedEmail === memberEmail) ||
        (normalizedPhone && normalizedPhone === memberPhone) ||
        (normalizedFirstName.includes(memberFirst.split(' ')[0]) && normalizedLastName === memberLast)
      ) {
        return { isMember: true, bureauRole: member.role };
      }
    }
    return { isMember: false };
  };

  const register = async (data: Partial<User> & { password: string; _forcedRole?: string }) => {
    const { password, _forcedRole, ...userData } = data as any;
    const hashedPwd = simpleHash(password);
    
    const { isMember, bureauRole } = checkIfBureauMember(
      userData.email || '', 
      userData.phone || '',
      userData.firstName || '',
      userData.lastName || ''
    );

    let role: User['role'] = 'student';
    if (userData.email === ADMIN_EMAIL) role = 'admin';
    else if (_forcedRole === 'student') role = 'student'; // explicitly forced to student
    else if (isMember) role = 'bureau_member';

    const uid = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const user: User = {
      uid,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      email: userData.email || '',
      phone: userData.phone || '',
      address: userData.address || '',
      role,
      bureauRole: (role === 'bureau_member' && isMember) ? (bureauRole || '') : '',
      level: userData.level || '',
      major: userData.major || '',
      createdAt: new Date().toISOString(),
      isBureauMember: role === 'bureau_member',
      password: hashedPwd,
    };

    await setDoc(doc(db, 'users', uid), user);
    
    localStorage.setItem('amicale_user', JSON.stringify(user));
    setCurrentUser(user);
    setIsFirstTime(false);
  };

  const login = async (email: string, password: string): Promise<User> => {
    const hashedPwd = simpleHash(password);
    
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const adminUser: User = {
        uid: 'admin_001',
        firstName: 'Admin',
        lastName: 'AMICALE',
        email: ADMIN_EMAIL,
        phone: '',
        address: '',
        role: 'admin',
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('amicale_user', JSON.stringify(adminUser));
      setCurrentUser(adminUser);
      setIsFirstTime(false);
      return adminUser;
    }

    const q = query(collection(db, 'users'), where('email', '==', email));
    const snap = await getDocs(q);
    if (snap.empty) throw new Error('Utilisateur non trouvé');
    
    const userDoc = snap.docs[0].data() as User;
    if (userDoc.password !== hashedPwd) throw new Error('Mot de passe incorrect');
    
    localStorage.setItem('amicale_user', JSON.stringify(userDoc));
    setCurrentUser(userDoc);
    setIsFirstTime(false);
    return userDoc;
  };

  const logout = () => {
    localStorage.removeItem('amicale_user');
    try { sessionStorage.removeItem('amicale_page'); } catch {}
    setCurrentUser(null);
    setIsFirstTime(true);
  };

  const verifyPassword = async (password: string): Promise<boolean> => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin' && password === ADMIN_PASSWORD) return true;
    const hashedPwd = simpleHash(password);
    return currentUser.password === hashedPwd;
  };

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, register, login, logout, verifyPassword, isFirstTime, setIsFirstTime }}>
      {children}
    </AuthContext.Provider>
  );
};
