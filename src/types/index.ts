export interface User {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  role: 'student' | 'admin' | 'pcs' | 'bureau_member';
  bureauRole?: string;
  level?: string;
  major?: string;
  createdAt: string;
  isBureauMember?: boolean;
  password?: string; // stored hashed for local auth
}

export interface Payment {
  id?: string;
  userId: string;
  userName: string;
  amount: number;
  month: string;
  year: number;
  status: 'pending' | 'completed';
  type: 'mensualite' | 'carte';
  timestamp: string;
  description?: string;
}

export interface Withdrawal {
  id?: string;
  amount: number;
  reason: string;
  pcsName: string;
  timestamp: string;
  balanceBefore: number;
  balanceAfter: number;
}

export interface Emergency {
  id?: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
  status: 'active' | 'resolved';
}

export interface Announcement {
  id?: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  title: string;
  content: string;
  timestamp: string;
  visibleTo: 'bureau' | 'all';
}

export interface Message {
  id?: string;
  fromId: string;
  fromName: string;
  toRole: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface Treasury {
  balance: number;
  lastUpdated: string;
}

export const BUREAU_MEMBERS = [
  { firstName: "Aliou", lastName: "BARRO", role: "Président", email: "aliou.barro@univ-thies.sn", phone: "774483674", address: "Mbour, Diamaguene2" },
  { firstName: "Amy", lastName: "Ndong", role: "Présidente Commission Féminine", email: "ndongyma@gmail.com", phone: "772360559", address: "Mbour/Thiocé Est ONCAD" },
  { firstName: "Khady", lastName: "DIOUF", role: "Présidente Commission Organisation", email: "Khady.diouf6@univ-thies.sn", phone: "784157476", address: "Mbour, Aïnoumane" },
  { firstName: "Cheikh Ahmadou Bamba", lastName: "WADE", role: "Vice-Président", email: "", phone: "778832160", address: "Mbour, Thioce Est" },
  { firstName: "Khane", lastName: "Diouf", role: "Secrétaire Générale", email: "khane.diouf@univ-thies.sn", phone: "774768174", address: "Mbour liberté 1" },
  { firstName: "Ibou", lastName: "DIOUF", role: "1er Adjoint PCS", email: "ibou.diouf@univ-thies.sn", phone: "777769624", address: "Mbour Oncad" },
  { firstName: "Saër", lastName: "Diop", role: "Président Commission Religieuse et Culturelle", email: "saer.diop@univ-thies.sn", phone: "769532901", address: "Oncad Mbour" },
  { firstName: "Abdoulaye Sidya", lastName: "Gassama", role: "2ème PCO", email: "gassamaabdoulaye344@gmail.com", phone: "770368599", address: "Mbour, Medine" },
  { firstName: "Iba", lastName: "SOW", role: "1er Adjoint PCO", email: "iba.sow@univ-thies.sn", phone: "777075306", address: "Mbour, Grand 1" },
  { firstName: "Ali", lastName: "Diouf", role: "2ème Adjoint PCS", email: "ali.diouf@univ-thies.sn", phone: "773163791", address: "Santessou" },
  { firstName: "Mamadou", lastName: "Ngom", role: "Président Commission Sociale", email: "mamadou.ngom2@univ-thies.sn", phone: "772493624", address: "Mbour-Oncad" },
  { firstName: "Fatimatou Zahra", lastName: "DIOUF", role: "Présidente Commission Pédagogique", email: "fzahra.diouf@univ-thies.sn", phone: "788235551", address: "Mbour Santessou" },
  { firstName: "Rama", lastName: "KA", role: "Adjointe Commission Communication et Relations Extérieures", email: "rama.ka@univ-thies.sn", phone: "779664294", address: "Mbour/Oncad/Santhie" },
  { firstName: "Jamal Widade", lastName: "Ndiaye", role: "Adjoint Trésorier", email: "jamalndiaye20066@icloud.com", phone: "777226804", address: "Mbour Oncad" },
  { firstName: "Mamadou Diop", lastName: "Sow", role: "Adjoint SG", email: "mamadoudiopsow53@gmail.com", phone: "778564917", address: "Grand Mbour" },
  { firstName: "Mouhamadou Moustapha", lastName: "Diallo", role: "Adjoint PCS", email: "diallomouhamedmoustapha6@gmail.com", phone: "771035742", address: "Diamegueune 2" },
  { firstName: "Dibor", lastName: "Cama", role: "2ème Adjoint Président Commission Sportive", email: "falloukama546@gmail.com", phone: "785935280", address: "Diamaguéne 2" },
  { firstName: "Serigne Dame", lastName: "Lo", role: "Président Communication et Relations Extérieures", email: "serignedamelolo54@gmail.com", phone: "768891195", address: "Oncad" },
  { firstName: "El Hadji Ndiouga", lastName: "Thiam", role: "2ème Adjoint Commission Pédagogique", email: "ndiougathiam1709@gmail.com", phone: "785650876", address: "Mbour Diamagueune2" },
  { firstName: "Coumba Fatou", lastName: "Diop", role: "Adjointe Commission Culturelle et Religieuse", email: "cfatou.diop@univ-thies.sn", phone: "770311958", address: "Mbour Sérére Kao" },
  { firstName: "Ma Anta", lastName: "Seye", role: "Trésorière", email: "seyemaanta249@gmail.com", phone: "768758763", address: "Grand Mbour" },
];

export const WAVE_LINK = "https://pay.wave.com/m/M_sn_bA-FWwigYgSz/c/sn/?amount=8080";
export const MENSUALITE_AMOUNT = 8000;
export const CARTE_AMOUNT = 1000;
export const ADMIN_EMAIL = "admin@amicale-mbour.sn";
export const ADMIN_PASSWORD = "Admin@2024!";
