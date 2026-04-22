import { useState } from 'react';
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
import './index.css';

type Page = 'home'|'payment'|'bureau'|'card'|'emergency'|'treasury'|'admin'|'announcements'|'messages'|'profile'|'admin-members'|'admin-payments'|'emergency-list'|'reports';
type AuthMode = 'register'|'login';

function AppContent() {
  const { currentUser, isLoading } = useAuth();
  const [authMode, setAuthMode] = useState<AuthMode>('register');
  const [page, setPage] = useState<Page>('home');

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
    if (authMode === 'register') return <RegisterPage onSuccess={()=>setPage('home')} onLoginClick={()=>setAuthMode('login')}/>;
    return <LoginPage onSuccess={()=>setPage('home')} onRegisterClick={()=>setAuthMode('register')} onForgotClick={()=>setAuthMode('register')}/>;
  }

  const isAdmin = currentUser.role==='admin';
  const isBureau = currentUser.role==='bureau_member'||isAdmin;

  const navItems = isAdmin
    ? [{k:'home',l:'Accueil',i:'🏠'},{k:'admin',l:'Admin',i:'🛡'},{k:'treasury',l:'Caisse',i:'💰'},{k:'announcements',l:'Infos',i:'📢'},{k:'profile',l:'Profil',i:'👤'}]
    : isBureau
    ? [{k:'home',l:'Accueil',i:'🏠'},{k:'announcements',l:'Infos',i:'📢'},{k:'bureau',l:'Bureau',i:'👥'},{k:'messages',l:'Messages',i:'💬'},{k:'profile',l:'Profil',i:'👤'}]
    : [{k:'home',l:'Accueil',i:'🏠'},{k:'payment',l:'Payer',i:'💳'},{k:'emergency',l:'Urgence',i:'🚨'},{k:'announcements',l:'Infos',i:'📢'},{k:'profile',l:'Profil',i:'👤'}];

  const titles: Record<string,string> = {home:'AMICALE MBOUROIS',payment:'Paiements',bureau:'Bureau Exécutif',card:'Ma Carte',emergency:'Urgences',treasury:'Caisse',admin:'Administration',announcements:'Informations',messages:'Messages',profile:'Mon Profil'};

  const renderPage = () => {
    switch(page){
      case 'home': return <HomePage onNavigate={p=>setPage(p as Page)}/>;
      case 'payment': return <PaymentPage onNavigate={p=>setPage(p as Page)}/>;
      case 'bureau': return <BureauPage/>;
      case 'card': return <CardPage onNavigate={p=>setPage(p as Page)}/>;
      case 'emergency': return <EmergencyPage/>;
      case 'emergency-list': return <EmergencyPage/>;
      case 'treasury': return <TreasuryPage/>;
      case 'admin': return <AdminPage onNavigate={p=>setPage(p as Page)}/>;
      case 'admin-members': return <AdminPage onNavigate={p=>setPage(p as Page)}/>;
      case 'admin-payments': return <AdminPage onNavigate={p=>setPage(p as Page)}/>;
      case 'announcements': return <AnnouncementsPage/>;
      case 'messages': return <MessagesPage/>;
      case 'profile': return <ProfilePage/>;
      case 'reports': return <ReportsPage/>;
      default: return <HomePage onNavigate={p=>setPage(p as Page)}/>;
    }
  };

  return (
    <div className="app-layout">
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
        <button onClick={()=>setPage('profile')} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'50%',width:36,height:36,cursor:'pointer',fontSize:18}}>👤</button>
      </div>

      <div style={{flex:1,overflowY:'auto'}}>{renderPage()}</div>

      <nav className="bottom-nav">
        {navItems.map(item=>(
          <button key={item.k} className={`nav-item ${page===item.k||page.startsWith(item.k+'-')?'active':''}`} onClick={()=>setPage(item.k as Page)}>
            <span style={{fontSize:22}}>{item.i}</span>
            <span className="nav-label">{item.l}</span>
          </button>
        ))}
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
