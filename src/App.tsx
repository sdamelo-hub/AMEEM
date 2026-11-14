import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import PaymentPage from './pages/PaymentPage';
import BureauPage from './pages/BureauPage';
import CardPage from './pages/CardPage';
import EmergencyPage from './pages/EmergencyPage';
import TreasuryPage from './pages/TreasuryPage';
import AdminPage from './pages/AdminPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import MessagesPage from './pages/MessagesPage';
import ProfilePage from './pages/ProfilePage';
import ReportsPage from './pages/ReportsPage';
import { House, Megaphone, MessageCircle, User, Users, Shield, Wallet, CreditCard } from 'lucide-react';
import './index.css';

type Page = 'home'|'payment'|'bureau'|'card'|'emergency'|'treasury'|'admin'|'announcements'|'messages'|'profile'|'admin-members'|'admin-payments'|'emergency-list'|'reports';
type AuthMode = 'register'|'login';

function AppContent() {
  const { currentUser, isLoading } = useAuth();
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  
  // Restore last page from sessionStorage for navigation persistence
  const [page, setPage] = useState<Page>(() => {
    try {
      const saved = sessionStorage.getItem('amicale_page') as Page | null;
      return saved || 'home';
    } catch { return 'home'; }
  });

  const navigate = (p: string) => {
    const newPage = p as Page;
    setPage(newPage);
    try { sessionStorage.setItem('amicale_page', newPage); } catch {}
  };

  useEffect(() => {
    if (!currentUser) {
      try { sessionStorage.removeItem('amicale_page'); } catch {}
      setPage('home');
    }
  }, [currentUser]);

  if (isLoading) {
    return (
      <div className="loading-spinner">
        <div style={{width:72,height:72,borderRadius:'50%',overflow:'hidden',margin:'0 auto 8px'}}>
          <img src="/icons/icon-128.png" alt="AMEEM" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}} />
        </div>
        <div className="spinner"/>
        <div style={{fontSize:14,color:'#6b7280',fontWeight:500}}>AMICALE MBOUROIS</div>
      </div>
    );
  }

  if (!currentUser) {
    if (authMode === 'register') return <RegisterPage onSuccess={()=>navigate('home')} onLoginClick={()=>setAuthMode('login')}/>;
    return <LoginPage onSuccess={()=>navigate('home')} onRegisterClick={()=>setAuthMode('register')} onForgotClick={()=>setAuthMode('register')}/>;
  }

  const isAdmin = currentUser.role==='admin';
  const isBureau = currentUser.role==='bureau_member'||isAdmin;

  const navItems = isAdmin
    ? [{k:'home',l:'Accueil'},{k:'admin',l:'Admin'},{k:'treasury',l:'Caisse'},{k:'announcements',l:'Annonces'},{k:'profile',l:'Profil'}]
    : isBureau
    ? [{k:'home',l:'Accueil'},{k:'announcements',l:'Annonces'},{k:'bureau',l:'Bureau'},{k:'messages',l:'Messages'},{k:'profile',l:'Profil'}]
    : [{k:'home',l:'Accueil'},{k:'announcements',l:'Annonces'},{k:'messages',l:'Messages'},{k:'profile',l:'Profil'}];

  const navIcons: Record<string, typeof House> = { home: House, announcements: Megaphone, messages: MessageCircle, profile: User, bureau: Users, admin: Shield, treasury: Wallet, payment: CreditCard };

  const titles: Record<string,string> = {home:'AMICALE MBOUROIS',payment:'Paiements',bureau:'Bureau Exécutif',card:'Ma Carte',emergency:'Urgences',treasury:'Caisse',admin:'Administration','admin-members':'Administration','admin-payments':'Administration',announcements:'Informations',messages:'Messages',profile:'Mon Profil',reports:'Rapports','emergency-list':'Urgences'};

  const isNavActive = (k: string) => {
    if (k === 'admin') return ['admin','admin-members','admin-payments','reports'].includes(page);
    return page === k || page.startsWith(k + '-');
  };

  const renderPage = () => {
    switch(page){
      case 'home': return <HomePage onNavigate={navigate}/>;
      case 'payment': return <PaymentPage onNavigate={navigate}/>;
      case 'bureau': return <BureauPage/>;
      case 'card': return <CardPage onNavigate={navigate}/>;
      case 'emergency': return <EmergencyPage/>;
      case 'emergency-list': return <EmergencyPage/>;
      case 'treasury': return <TreasuryPage/>;
      case 'admin': return <AdminPage onNavigate={navigate}/>;
      case 'admin-members': return <AdminPage onNavigate={navigate}/>;
      case 'admin-payments': return <AdminPage onNavigate={navigate}/>;
      case 'announcements': return <AnnouncementsPage/>;
      case 'messages': return <MessagesPage/>;
      case 'profile': return <ProfilePage onNavigate={navigate}/>;
      case 'reports': return <ReportsPage/>;
      default: return <HomePage onNavigate={navigate}/>;
    }
  };

  return (
       <div className={`app-layout ${['home','profile','payment','card'].includes(page)?'is-home':''}`}>
      {page!=='home' && (
        <div className="header">
          <div className="header-logo">
            <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid rgba(255,255,255,0.4)',overflow:'hidden'}}>
              <img src="/icons/icon-128.png" alt="AMEEM" style={{width:32,height:32,borderRadius:'50%',objectFit:'cover'}} onError={(e)=>{(e.target as HTMLImageElement).src='/icons/logo.jpg';}} />
            </div>
            <div>
              <div className="header-title">{titles[page]||'AMEEM'}</div>
              <div className="header-subtitle">Amicale des Étudiants de Mbour</div>
            </div>
          </div>
          <button onClick={()=>navigate('profile')} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'50%',width:36,height:36,cursor:'pointer',fontSize:18}}>👤</button>
        </div>
      )}

      <div style={{flex:1,overflowY:'auto'}}>{renderPage()}</div>

      <nav className="bottom-nav">
        {navItems.map(item=>{
          const Icon = navIcons[item.k];
          return (
            <button key={item.k} className={`nav-item ${isNavActive(item.k)?'active':''}`} onClick={()=>navigate(item.k)}>
              {Icon && <Icon size={24}/>}
              <span className="nav-label">{item.l}</span>
            </button>
          );
        })}
      </nav>
      <PWAInstallPrompt/>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent/>
      </ToastProvider>
    </AuthProvider>
  );
}