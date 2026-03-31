/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  addDoc, 
  serverTimestamp, 
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { QRCodeSVG } from 'qrcode.react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis
} from 'recharts';
import { 
  Shield, 
  AlertTriangle, 
  Map as MapIcon, 
  Settings, 
  Plus, 
  Users, 
  Bell, 
  LogOut, 
  ChevronRight,
  Navigation,
  Info,
  X,
  Send,
  Zap,
  CheckCircle2,
  Clock,
  Activity as ActivityIcon,
  QrCode,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Types ---
interface Room {
  id: string;
  name: string;
  duration: number;
  createdAt: Timestamp;
  adminUid: string;
  volunteerKey: string;
  headKey: string;
  organizerKey: string;
}

interface Alert {
  id: string;
  roomId: string;
  type: 'everyone' | 'role';
  targetRole?: string;
  message: string;
  senderUid: string;
  senderRole: string;
  createdAt: Timestamp;
}

interface UserProfile {
  uid: string;
  name: string;
  role: 'admin' | 'volunteer' | 'head' | 'organizer';
  roomId: string;
  lastSeen?: Timestamp;
}

interface Activity {
  id: string;
  roomId: string;
  type: 'alert' | 'task' | 'user' | 'panic';
  message: string;
  userUid: string;
  userName: string;
  createdAt: Timestamp;
}

interface UserLocation {
  uid: string;
  roomId: string;
  role: string;
  userName: string;
  lat: number;
  lng: number;
  updatedAt: Timestamp;
  placeName?: string;
}

interface ChatMessage {
  id: string;
  roomId: string;
  senderUid: string;
  senderName: string;
  senderRole: string;
  message: string;
  targetRole?: string;
  createdAt: Timestamp;
}

interface Task {
  id: string;
  roomId: string;
  title: string;
  description: string;
  assignedTo?: string;
  assignedToName?: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  createdAt: Timestamp;
}

// --- Security Utilities ---
async function hashKey(key: string) {
  const msgBuffer = new TextEncoder().encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- Components ---

const Button = ({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) => {
  const variants = {
    primary: 'bg-[#E2FF6F] text-[#121212] hover:bg-[#d4f05e]',
    secondary: 'bg-[#2A2A2A] text-white hover:bg-[#3A3A3A]',
    danger: 'bg-[#FF6F6F] text-white hover:bg-[#ff5e5e]',
    ghost: 'bg-transparent text-white hover:bg-[#2A2A2A]',
    outline: 'bg-transparent border border-[#2A2A2A] text-white hover:bg-[#2A2A2A]'
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg font-bold'
  };
  return (
    <button 
      className={cn(
        'rounded-full transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2',
        variants[variant],
        sizes[size],
        className
      )} 
      {...props} 
    />
  );
};

const Card = ({ className, children, onClick, key }: { className?: string; children: React.ReactNode; onClick?: () => void; key?: string }) => (
  <div key={key} onClick={onClick} className={cn('bg-[#1A1A1A] border border-[#2A2A2A] rounded-3xl p-6', className)}>
    {children}
  </div>
);

const Input = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    className={cn(
      'w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-2xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E2FF6F] transition-colors',
      className
    )}
    {...props}
  />
);

const Badge = ({ children, className, variant = 'default' }: { children: React.ReactNode; className?: string; variant?: 'default' | 'admin' | 'volunteer' | 'head' | 'organizer' }) => {
  const variants = {
    default: 'bg-[#2A2A2A] text-gray-400',
    admin: 'bg-[#E2FF6F]/10 text-[#E2FF6F]',
    volunteer: 'bg-blue-500/10 text-blue-400',
    head: 'bg-purple-500/10 text-purple-400',
    organizer: 'bg-orange-500/10 text-orange-400'
  };
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider', variants[variant], className)}>
      {children}
    </span>
  );
};

const ChatSection = ({ room, profile, user }: { room: Room; profile: UserProfile; user: FirebaseUser }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [targetRole, setTargetRole] = useState('everyone');
  const [sending, setSending] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'chats'),
      where('roomId', '==', room.id),
      orderBy('createdAt', 'asc'),
      limit(50)
    );
    return onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage));
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'chats');
    });
  }, [room.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'chats'), {
        roomId: room.id,
        senderUid: user.uid,
        senderName: profile.name,
        senderRole: profile.role,
        message: newMessage,
        targetRole: targetRole === 'everyone' ? null : targetRole,
        createdAt: serverTimestamp()
      });
      setNewMessage('');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'chats');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="flex flex-col h-[500px] p-0 overflow-hidden border-[#2A2A2A]">
      <div className="p-4 border-b border-[#2A2A2A] bg-[#222] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#E2FF6F]" />
          <h3 className="text-sm font-bold text-white">Team Chat</h3>
        </div>
        <select 
          className="bg-[#1A1A1A] text-[10px] font-bold text-gray-400 border border-[#3A3A3A] rounded-full px-2 py-1 focus:outline-none focus:border-[#E2FF6F]"
          value={targetRole}
          onChange={e => setTargetRole(e.target.value)}
        >
          <option value="everyone">Everyone</option>
          <option value="volunteer">Volunteers Only</option>
          <option value="head">Heads Only</option>
          <option value="organizer">Organizers Only</option>
        </select>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar bg-[#121212]">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex flex-col", msg.senderUid === user.uid ? "items-end" : "items-start")}>
            <div className={cn(
              "max-w-[80%] p-3 rounded-2xl relative",
              msg.senderUid === user.uid ? "bg-[#056162] text-white rounded-tr-none" : "bg-[#262D31] text-white rounded-tl-none"
            )}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold opacity-70">{msg.senderName}</span>
                <Badge variant={msg.senderRole as any} className="scale-75 origin-left">{msg.senderRole}</Badge>
                {msg.targetRole && <span className="text-[8px] text-[#E2FF6F] font-bold uppercase">@{msg.targetRole}</span>}
              </div>
              <p className="text-sm leading-relaxed">{msg.message}</p>
              <span className="text-[8px] opacity-50 block text-right mt-1">
                {msg.createdAt ? format(msg.createdAt.toDate(), 'HH:mm') : '...'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSendMessage} className="p-3 bg-[#222] border-t border-[#2A2A2A] flex gap-2">
        <Input 
          value={newMessage} 
          onChange={e => setNewMessage(e.target.value)} 
          placeholder="Type a message..." 
          className="flex-1 py-2"
        />
        <Button type="submit" disabled={sending || !newMessage.trim()} className="p-3">
          <Send className="w-5 h-5" />
        </Button>
      </form>
    </Card>
  );
};

const ChatPage = ({ room, profile, user }: { room: Room; profile: UserProfile; user: FirebaseUser }) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#121212] flex flex-col">
      <div className="sticky top-0 z-10 bg-[#121212]/80 backdrop-blur-xl border-b border-[#2A2A2A] p-6 flex items-center gap-4">
        <Button onClick={() => navigate(-1)} variant="ghost" size="sm" className="p-2">
          <ChevronRight className="w-5 h-5 rotate-180" />
        </Button>
        <h1 className="text-xl font-bold text-white">Team Chat</h1>
      </div>
      <div className="flex-1 p-6">
        <ChatSection room={room} profile={profile} user={user} />
      </div>
    </div>
  );
};

const TaskCard = ({ task, onStatusChange }: { task: Task; onStatusChange: (id: string, status: Task['status']) => void | Promise<void>; key?: any }) => {
  const priorityColors = {
    low: 'text-blue-400 bg-blue-400/10',
    medium: 'text-orange-400 bg-orange-400/10',
    high: 'text-red-400 bg-red-400/10'
  };

  return (
    <Card className="p-4 space-y-3 border-[#2A2A2A] hover:border-[#E2FF6F]/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-white">{task.title}</h4>
          <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>
        </div>
        <span className={cn("text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest", priorityColors[task.priority])}>
          {task.priority}
        </span>
      </div>
      
      <div className="flex items-center justify-between pt-2 border-t border-[#2A2A2A]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-[#2A2A2A] flex items-center justify-center text-[8px] font-bold text-gray-400">
            {task.assignedToName?.charAt(0) || '?'}
          </div>
          <span className="text-[10px] text-gray-400 font-medium">{task.assignedToName || 'Unassigned'}</span>
        </div>
        
        <select 
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value as any)}
          className="bg-[#1A1A1A] text-[10px] font-bold text-[#E2FF6F] border border-[#2A2A2A] rounded-lg px-2 py-1 focus:outline-none"
        >
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>
    </Card>
  );
};

const WeatherWidget = () => {
  const [weather, setWeather] = useState<{ temp: number; condition: string; city: string } | null>(null);

  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const data = await res.json();
        const code = data.current_weather.weathercode;
        
        let condition = 'Clear';
        if (code >= 1 && code <= 3) condition = 'Partly Cloudy';
        if (code >= 45 && code <= 48) condition = 'Foggy';
        if (code >= 51 && code <= 67) condition = 'Rainy';
        if (code >= 71 && code <= 77) condition = 'Snowy';
        if (code >= 80 && code <= 82) condition = 'Showers';
        if (code >= 95) condition = 'Thunderstorm';

        setWeather({
          temp: Math.round(data.current_weather.temperature),
          condition,
          city: 'Local'
        });
      } catch (e) {
        console.error(e);
      }
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
      () => fetchWeather(37.7749, -122.4194)
    );
  }, []);

  if (!weather) return null;

  return (
    <div className="flex flex-col justify-between h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Weather</h3>
        <span className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">{weather?.city || 'Loading...'}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-3xl font-black text-white tracking-tighter">{weather?.temp ?? '--'}°C</span>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-[#E2FF6F] uppercase tracking-tighter leading-none">{weather?.condition || '...'}</span>
          <span className="text-[8px] text-gray-600 font-bold uppercase mt-0.5">Forecast</span>
        </div>
      </div>
      <div className="flex gap-1 mt-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex-1 h-1 bg-[#2A2A2A] rounded-full overflow-hidden">
            <div className="h-full bg-[#E2FF6F]/40" style={{ width: `${Math.random() * 100}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
};

const TeamPage = ({ room }: { room: Room }) => {
  const [team, setTeam] = useState<UserProfile[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, 'users'), where('roomId', '==', room.id));
    return onSnapshot(q, (snap) => {
      setTeam(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
    });
  }, [room.id]);

  const isOnline = (lastSeen?: Timestamp) => {
    if (!lastSeen) return false;
    const diff = (Date.now() - lastSeen.toDate().getTime()) / 1000;
    return diff < 60; // Online if seen in last 60s
  };

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col">
      <div className="sticky top-0 z-10 bg-[#121212]/80 backdrop-blur-xl border-b border-[#2A2A2A] p-6 flex items-center gap-4">
        <Button onClick={() => navigate(-1)} variant="ghost" size="sm" className="p-2">
          <ChevronRight className="w-5 h-5 rotate-180" />
        </Button>
        <h1 className="text-xl font-bold text-white">Team Presence</h1>
      </div>
      <div className="p-6 space-y-4">
        {team.map(member => (
          <Card key={member.uid} className="p-4 flex items-center justify-between border-[#2A2A2A]">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-[#2A2A2A] flex items-center justify-center text-lg font-bold text-white">
                  {member.name.charAt(0)}
                </div>
                {isOnline(member.lastSeen) && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#E2FF6F] rounded-full border-2 border-[#121212]" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{member.name}</h4>
                <Badge variant={member.role}>{member.role}</Badge>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                {isOnline(member.lastSeen) ? 'Online' : 'Offline'}
              </span>
              {member.lastSeen && !isOnline(member.lastSeen) && (
                <p className="text-[8px] text-gray-600">
                  Last seen {format(member.lastSeen.toDate(), 'HH:mm')}
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const TaskStats = ({ tasks }: { tasks: Task[] }) => {
  const data = [
    { name: 'Pending', value: tasks.filter(t => t.status === 'pending').length, color: '#3A3A3A' },
    { name: 'In Progress', value: tasks.filter(t => t.status === 'in-progress').length, color: '#E2FF6F' },
    { name: 'Completed', value: tasks.filter(t => t.status === 'completed').length, color: '#22C55E' }
  ].filter(d => d.value > 0);

  if (tasks.length === 0) return (
    <div className="h-full flex items-center justify-center text-gray-600 text-[10px] uppercase font-bold">No Task Data</div>
  );

  return (
    <div className="h-[120px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={30}
            outerRadius={45}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <RechartsTooltip 
            contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '12px', fontSize: '10px' }}
            itemStyle={{ color: '#fff' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

const ActivityFeed = ({ room }: { room: Room }) => {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'activities'), where('roomId', '==', room.id), orderBy('createdAt', 'desc'), limit(10));
    return onSnapshot(q, (snap) => {
      setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity)));
    });
  }, [room.id]);

  return (
    <div className="space-y-3">
      {activities.map(act => (
        <div key={act.id} className="flex gap-3 items-start">
          <div className={cn(
            "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
            act.type === 'alert' ? 'bg-[#E2FF6F]/10 text-[#E2FF6F]' :
            act.type === 'task' ? 'bg-orange-500/10 text-orange-400' :
            act.type === 'panic' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
          )}>
            {act.type === 'alert' ? <Bell className="w-3 h-3" /> :
             act.type === 'task' ? <CheckCircle2 className="w-3 h-3" /> :
             act.type === 'panic' ? <AlertTriangle className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
          </div>
          <div className="space-y-0.5">
            <p className="text-[11px] text-white leading-tight">
              <span className="font-bold">{act.userName}</span> {act.message}
            </p>
            <span className="text-[8px] text-gray-600 uppercase font-bold">
              {act.createdAt ? format(act.createdAt.toDate(), 'HH:mm') : '...'}
            </span>
          </div>
        </div>
      ))}
      {activities.length === 0 && <p className="text-center py-4 text-gray-600 text-[10px] uppercase font-bold">No recent activity</p>}
    </div>
  );
};

const TasksPage = ({ room, profile, user }: { room: Room; profile: UserProfile; user: FirebaseUser }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [assignedTo, setAssignedTo] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, 'tasks'), where('roomId', '==', room.id), orderBy('createdAt', 'desc'));
    const unsubscribeTasks = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });

    const qTeam = query(collection(db, 'users'), where('roomId', '==', room.id));
    const unsubscribeTeam = onSnapshot(qTeam, (snap) => {
      setTeam(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
    });

    return () => {
      unsubscribeTasks();
      unsubscribeTeam();
    };
  }, [room.id]);

  const handleCreateTask = async () => {
    if (!newTitle) return;
    try {
      const assignedUser = team.find(u => u.uid === assignedTo);
      await addDoc(collection(db, 'tasks'), {
        roomId: room.id,
        title: newTitle,
        description: newDesc,
        priority: newPriority,
        status: 'pending',
        assignedTo: assignedTo || null,
        assignedToName: assignedUser?.name || null,
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, 'activities'), {
        roomId: room.id,
        type: 'task',
        message: `created task: ${newTitle}`,
        userUid: user.uid,
        userName: profile.name,
        createdAt: serverTimestamp()
      });

      setNewTitle('');
      setNewDesc('');
      setAssignedTo('');
      setShowCreate(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusChange = async (id: string, status: Task['status']) => {
    try {
      const task = tasks.find(t => t.id === id);
      await setDoc(doc(db, 'tasks', id), { 
        status,
        assignedTo: user.uid,
        assignedToName: profile.name
      }, { merge: true });

      await addDoc(collection(db, 'activities'), {
        roomId: room.id,
        type: 'task',
        message: `marked "${task?.title}" as ${status}`,
        userUid: user.uid,
        userName: profile.name,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col">
      <div className="sticky top-0 z-10 bg-[#121212]/80 backdrop-blur-xl border-b border-[#2A2A2A] p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate(-1)} variant="ghost" size="sm" className="p-2">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </Button>
          <h1 className="text-xl font-bold text-white">Task Board</h1>
        </div>
        {profile.role === 'admin' && (
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="w-4 h-4" /> New Task
          </Button>
        )}
      </div>

      <div className="p-6 space-y-4">
        {tasks.length === 0 ? (
          <div className="text-center py-20 text-gray-600">No tasks assigned yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tasks.map(task => (
              <div key={task.id}>
                <TaskCard task={task} onStatusChange={handleStatusChange} />
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md">
              <Card className="space-y-4">
                <h2 className="text-xl font-bold text-white">Create Task</h2>
                <Input placeholder="Task Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                <textarea 
                  className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-2xl px-4 py-3 text-white focus:outline-none min-h-[100px]"
                  placeholder="Description"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <select 
                    className="bg-[#2A2A2A] border border-[#3A3A3A] rounded-2xl px-4 py-3 text-white focus:outline-none text-sm"
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as any)}
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                  <select 
                    className="bg-[#2A2A2A] border border-[#3A3A3A] rounded-2xl px-4 py-3 text-white focus:outline-none text-sm"
                    value={assignedTo}
                    onChange={e => setAssignedTo(e.target.value)}
                  >
                    <option value="">Assign To...</option>
                    {team.map(u => (
                      <option key={u.uid} value={u.uid}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setShowCreate(false)} variant="secondary" className="flex-1">Cancel</Button>
                  <Button onClick={handleCreateTask} className="flex-1">Create</Button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Pages ---

const LoginPage = () => {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#121212]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center space-y-8"
      >
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-[#E2FF6F] rounded-3xl flex items-center justify-center rotate-12 shadow-[0_0_40px_rgba(226,255,111,0.2)]">
            <Shield className="w-10 h-10 text-[#121212]" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-white">EventGuard</h1>
          <p className="text-gray-400">Secure role-based event monitoring & alerts</p>
        </div>
        <Button onClick={handleLogin} size="xl" className="w-full">
          Sign in with Google
        </Button>
      </motion.div>
    </div>
  );
};

const JoinCreatePage = ({ user }: { user: FirebaseUser }) => {
  const [mode, setMode] = useState<'initial' | 'create' | 'join'>('initial');
  const [eventName, setEventName] = useState('');
  const [duration, setDuration] = useState('');
  const [joinKey, setJoinKey] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!eventName || !duration) return;
    setLoading(true);
    try {
      const volunteerKeyRaw = Math.random().toString(36).substring(2, 8).toUpperCase();
      const headKeyRaw = Math.random().toString(36).substring(2, 8).toUpperCase();
      const organizerKeyRaw = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const [volunteerKey, headKey, organizerKey] = await Promise.all([
        hashKey(volunteerKeyRaw),
        hashKey(headKeyRaw),
        hashKey(organizerKeyRaw)
      ]);

      const roomRef = await addDoc(collection(db, 'rooms'), {
        name: eventName,
        duration: parseInt(duration),
        createdAt: serverTimestamp(),
        adminUid: user.uid,
        volunteerKey,
        headKey,
        organizerKey,
        volunteerKeyRaw, // Storing raw keys for admin to see in settings
        headKeyRaw,
        organizerKeyRaw
      });

      await setDoc(doc(db, 'users', user.uid), {
        roomId: roomRef.id,
        role: 'admin',
        name: user.displayName || 'Admin'
      });

      await addDoc(collection(db, 'activities'), {
        roomId: roomRef.id,
        type: 'user',
        message: `created the room`,
        userUid: user.uid,
        userName: user.displayName || 'Admin',
        createdAt: serverTimestamp()
      });

      navigate('/');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'rooms/users');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!joinKey) return;
    setLoading(true);
    try {
      const hashedKey = await hashKey(joinKey.toUpperCase());
      const q = query(collection(db, 'rooms'), where('volunteerKey', '==', hashedKey));
      const q2 = query(collection(db, 'rooms'), where('headKey', '==', hashedKey));
      const q3 = query(collection(db, 'rooms'), where('organizerKey', '==', hashedKey));
      
      const [vSnap, hSnap, oSnap] = await Promise.all([getDocs(q), getDocs(q2), getDocs(q3)]);
      
      let roomId = '';
      let role = '';
      
      if (!vSnap.empty) { roomId = vSnap.docs[0].id; role = 'volunteer'; }
      else if (!hSnap.empty) { roomId = hSnap.docs[0].id; role = 'head'; }
      else if (!oSnap.empty) { roomId = oSnap.docs[0].id; role = 'organizer'; }
      
      if (roomId) {
        await setDoc(doc(db, 'users', user.uid), {
          roomId,
          role,
          name: user.displayName || 'User'
        });

        await addDoc(collection(db, 'activities'), {
          roomId,
          type: 'user',
          message: `joined the room as ${role}`,
          userUid: user.uid,
          userName: user.displayName || 'User',
          createdAt: serverTimestamp()
        });

        navigate('/');
      } else {
        alert('Invalid join key');
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, 'rooms');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] p-6 flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        {mode === 'initial' && (
          <motion.div 
            key="initial"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-md space-y-4"
          >
            <Card className="text-center space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Welcome, {user.displayName?.split(' ')[0]}</h2>
                <p className="text-gray-500 text-sm">Create a new event room or join an existing one.</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <Button onClick={() => setMode('create')} size="lg">
                  <Plus className="w-5 h-5" /> Create Room
                </Button>
                <Button onClick={() => setMode('join')} variant="secondary" size="lg">
                  <Users className="w-5 h-5" /> Join Room
                </Button>
              </div>
              <Button onClick={() => signOut(auth)} variant="ghost" size="sm" className="mx-auto">
                <LogOut className="w-4 h-4" /> Sign Out
              </Button>
            </Card>
          </motion.div>
        )}

        {mode === 'create' && (
          <motion.div 
            key="create"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-md space-y-4"
          >
            <Card className="space-y-6">
              <div className="flex items-center gap-4">
                <Button onClick={() => setMode('initial')} variant="ghost" size="sm" className="p-2">
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </Button>
                <h2 className="text-xl font-bold text-white">Create Event Room</h2>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Event Name</label>
                  <Input placeholder="e.g. Summer Music Fest" value={eventName} onChange={e => setEventName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Duration (Hours)</label>
                  <Input type="number" placeholder="e.g. 12" value={duration} onChange={e => setDuration(e.target.value)} />
                </div>
                <Button onClick={handleCreate} disabled={loading} size="lg" className="w-full">
                  {loading ? 'Creating...' : 'Launch Room'}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {mode === 'join' && (
          <motion.div 
            key="join"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-md space-y-4"
          >
            <Card className="space-y-6">
              <div className="flex items-center gap-4">
                <Button onClick={() => setMode('initial')} variant="ghost" size="sm" className="p-2">
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </Button>
                <h2 className="text-xl font-bold text-white">Join Event Room</h2>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Access Key</label>
                  <Input placeholder="Enter 6-digit key" value={joinKey} onChange={e => setJoinKey(e.target.value)} />
                </div>
                <Button onClick={handleJoin} disabled={loading} size="lg" className="w-full">
                  {loading ? 'Joining...' : 'Join Event'}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CircularProgress = ({ value, max }: { value: number; max: number }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90">
        <circle
          cx="48"
          cy="48"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-[#2A2A2A]"
        />
        <motion.circle
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          cx="48"
          cy="48"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          strokeDasharray={circumference}
          fill="transparent"
          strokeLinecap="round"
          className="text-[#E2FF6F]"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-lg font-black text-white leading-none">{Math.round(percentage)}%</span>
        <span className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">Elapsed</span>
      </div>
    </div>
  );
};

const Dashboard = ({ user, profile, room }: { user: FirebaseUser; profile: UserProfile; room: Room }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [showSendAlert, setShowSendAlert] = useState(false);
  const [alertType, setAlertType] = useState<'everyone' | 'role'>('everyone');
  const [targetRole, setTargetRole] = useState('volunteer');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  const elapsedHours = room?.createdAt ? (Date.now() - room.createdAt.toDate().getTime()) / (1000 * 60 * 60) : 0;

  useEffect(() => {
    const qAlerts = query(collection(db, 'alerts'), where('roomId', '==', room.id), orderBy('createdAt', 'desc'), limit(3));
    const unsubscribeAlerts = onSnapshot(qAlerts, (snap) => {
      setAlerts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Alert)));
    });

    const qTasks = query(collection(db, 'tasks'), where('roomId', '==', room.id));
    const unsubscribeTasks = onSnapshot(qTasks, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });

    const qTeam = query(collection(db, 'users'), where('roomId', '==', room.id));
    const unsubscribeTeam = onSnapshot(qTeam, (snap) => {
      setTeam(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
    });

    return () => {
      unsubscribeAlerts();
      unsubscribeTasks();
      unsubscribeTeam();
    };
  }, [room.id]);

  const handleSendAlert = async () => {
    if (!message) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'alerts'), {
        roomId: room.id,
        type: alertType,
        targetRole: alertType === 'role' ? targetRole : null,
        message,
        senderUid: user.uid,
        senderRole: profile.role,
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, 'activities'), {
        roomId: room.id,
        type: 'alert',
        message: `sent alert: ${message.substring(0, 30)}...`,
        userUid: user.uid,
        userName: profile.name,
        createdAt: serverTimestamp()
      });

      setMessage('');
      setShowSendAlert(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const onlineCount = team.filter(m => {
    if (!m.lastSeen) return false;
    return (Date.now() - m.lastSeen.toDate().getTime()) / 1000 < 60;
  }).length;

  return (
    <div className="min-h-screen bg-[#121212] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#121212]/80 backdrop-blur-xl border-b border-[#2A2A2A] p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#E2FF6F] rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-[#121212]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-none">{room.name}</h1>
            <Badge variant={profile.role} className="mt-1">{profile.role}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {profile.role === 'admin' && (
            <Button onClick={() => navigate('/settings')} variant="secondary" size="sm" className="p-2">
              <Settings className="w-5 h-5" />
            </Button>
          )}
          <Button onClick={() => signOut(auth)} variant="ghost" size="sm" className="p-2">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Status Card (Large) */}
          <Card className="md:col-span-2 flex items-center justify-between gap-6 overflow-hidden relative min-h-[160px]">
            <div className="space-y-1 z-10">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Event Status</h3>
              <p className="text-4xl font-black text-white tracking-tighter">ACTIVE</p>
              <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E2FF6F] animate-pulse" />
                LIVE MONITORING: {room.name}
              </div>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[8px] text-gray-500 uppercase font-bold">Duration</span>
                  <span className="text-sm font-bold text-white">{room.duration}h</span>
                </div>
                <div className="w-px h-6 bg-[#2A2A2A]" />
                <div className="flex flex-col cursor-pointer" onClick={() => navigate('/team')}>
                  <span className="text-[8px] text-gray-500 uppercase font-bold">Team Online</span>
                  <span className="text-sm font-bold text-[#E2FF6F]">{onlineCount} / {team.length}</span>
                </div>
              </div>
            </div>
            <CircularProgress value={elapsedHours} max={room.duration} />
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-[#E2FF6F]/5 rounded-full blur-3xl" />
          </Card>

          {/* Weather Widget */}
          <Card className="md:col-span-1 p-4">
            <WeatherWidget />
          </Card>

          {/* Task Stats Widget */}
          <Card className="md:col-span-1 flex flex-col justify-between p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Task Progress</h3>
              <button onClick={() => navigate('/tasks')} className="text-[8px] font-bold text-[#E2FF6F] uppercase">Board</button>
            </div>
            <TaskStats tasks={tasks} />
            <div className="flex justify-between text-[8px] font-bold text-gray-500 uppercase mt-2">
              <span>{tasks.filter(t => t.status === 'completed').length} Done</span>
              <span>{tasks.filter(t => t.status !== 'completed').length} Left</span>
            </div>
          </Card>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-[#222] transition-all hover:scale-105 active:scale-95" onClick={() => setShowSendAlert(true)}>
            <div className="w-10 h-10 bg-[#E2FF6F]/10 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-[#E2FF6F]" />
            </div>
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Alert</span>
          </Card>
          
          <Card className="p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-[#222] transition-all hover:scale-105 active:scale-95" onClick={() => navigate('/chat')}>
            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Chat</span>
          </Card>

          <Card className="p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-[#222] transition-all hover:scale-105 active:scale-95" onClick={() => navigate('/tasks')}>
            <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-orange-400" />
            </div>
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Tasks</span>
          </Card>

          <Card className="p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-[#222] transition-all hover:scale-105 active:scale-95" onClick={() => navigate('/map')}>
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <MapIcon className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Map</span>
          </Card>
        </div>

        {/* Two Column Layout for Alerts and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Alerts */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Recent Alerts</h3>
              <button onClick={() => navigate('/alerts')} className="text-[10px] font-bold text-[#E2FF6F] hover:underline uppercase">View All</button>
            </div>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-gray-600 text-sm border border-dashed border-[#2A2A2A] rounded-3xl">No recent alerts</div>
              ) : (
                alerts.map(alert => (
                  <motion.div 
                    key={alert.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <Card className="p-4 space-y-2 border-l-4 border-l-[#E2FF6F]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={alert.senderRole}>{alert.senderRole}</Badge>
                          {alert.type === 'role' && (
                            <span className="text-[10px] text-[#E2FF6F] font-bold">→ {alert.targetRole}</span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-600 font-mono">
                          {alert.createdAt ? format(alert.createdAt.toDate(), 'HH:mm') : '...'}
                        </span>
                      </div>
                      <p className="text-sm text-white font-medium">{alert.message}</p>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Live Activity</h3>
            <Card className="p-6">
              <ActivityFeed room={room} />
            </Card>
          </div>
        </div>
      </div>

      {/* Panic Button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#121212] to-transparent">
        <Button 
          onClick={() => navigate('/panic')} 
          variant="danger" 
          size="xl" 
          className="w-full h-16 shadow-[0_0_40px_rgba(255,111,111,0.2)]"
        >
          <AlertTriangle className="w-6 h-6" /> EMERGENCY PANIC
        </Button>
      </div>

      {/* Send Alert Modal */}
      <AnimatePresence>
        {showSendAlert && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full max-w-md"
            >
              <Card className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Send Alert</h2>
                  <Button onClick={() => setShowSendAlert(false)} variant="ghost" size="sm" className="p-2">
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setAlertType('everyone')} 
                      variant={alertType === 'everyone' ? 'primary' : 'secondary'}
                      className="flex-1"
                    >
                      Everyone
                    </Button>
                    {profile.role === 'admin' && (
                      <Button 
                        onClick={() => setAlertType('role')} 
                        variant={alertType === 'role' ? 'primary' : 'secondary'}
                        className="flex-1"
                      >
                        Role Based
                      </Button>
                    )}
                  </div>

                  {alertType === 'role' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Target Role</label>
                      <select 
                        className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#E2FF6F]"
                        value={targetRole}
                        onChange={e => setTargetRole(e.target.value)}
                      >
                        <option value="volunteer">Volunteer</option>
                        <option value="head">Head</option>
                        <option value="organizer">Organizer</option>
                      </select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Message</label>
                    <textarea 
                      className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-2xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#E2FF6F] min-h-[100px]"
                      placeholder="Type your alert message..."
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                    />
                  </div>

                  <Button onClick={handleSendAlert} disabled={sending || !message} size="lg" className="w-full">
                    {sending ? 'Sending...' : 'Broadcast Alert'}
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AlertsPage = ({ room }: { room: Room }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(
      collection(db, 'alerts'), 
      where('roomId', '==', room.id),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
      setAlerts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Alert)));
    });
  }, [room.id]);

  return (
    <div className="min-h-screen bg-[#121212]">
      <div className="sticky top-0 z-10 bg-[#121212]/80 backdrop-blur-xl border-bottom border-[#2A2A2A] p-6 flex items-center gap-4">
        <Button onClick={() => navigate(-1)} variant="ghost" size="sm" className="p-2">
          <ChevronRight className="w-5 h-5 rotate-180" />
        </Button>
        <h1 className="text-xl font-bold text-white">All Alerts</h1>
      </div>
      <div className="p-6 space-y-4">
        {alerts.map(alert => (
          <Card key={alert.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={alert.senderRole}>{alert.senderRole}</Badge>
                {alert.type === 'role' && (
                  <span className="text-[10px] text-[#E2FF6F] font-bold">→ {alert.targetRole}</span>
                )}
              </div>
              <span className="text-[10px] text-gray-600">
                {alert.createdAt ? format(alert.createdAt.toDate(), 'MMM d, HH:mm') : '...'}
              </span>
            </div>
            <p className="text-sm text-white">{alert.message}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

const PanicPage = ({ user, profile, room }: { user: FirebaseUser; profile: UserProfile; room: Room }) => {
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  const handlePanic = async () => {
    setSending(true);
    try {
      // Play sound and vibrate immediately for local feedback
      if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(() => {});

      await addDoc(collection(db, 'alerts'), {
        roomId: room.id,
        type: 'everyone',
        message: '🚨 EMERGENCY PANIC BUTTON PRESSED! HELP NEEDED IMMEDIATELY!',
        senderUid: user.uid,
        senderRole: profile.role,
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, 'activities'), {
        roomId: room.id,
        type: 'panic',
        message: `TRIGGERED EMERGENCY PANIC!`,
        userUid: user.uid,
        userName: profile.name,
        createdAt: serverTimestamp()
      });
      navigate(-1);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center p-6 space-y-12">
      <div className="text-center space-y-4">
        <div className="w-24 h-24 bg-[#FF6F6F]/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
          <AlertTriangle className="w-12 h-12 text-[#FF6F6F]" />
        </div>
        <h1 className="text-3xl font-bold text-white">Emergency Panic</h1>
        <p className="text-gray-500 max-w-xs mx-auto">This will alert EVERYONE in the event room immediately. Only use in real emergencies.</p>
      </div>

      <div className="w-full max-w-md space-y-4">
        <button 
          onClick={handlePanic}
          disabled={sending}
          className="w-full aspect-square rounded-full bg-[#FF6F6F] shadow-[0_0_80px_rgba(255,111,111,0.4)] flex flex-col items-center justify-center gap-4 active:scale-95 transition-transform disabled:opacity-50"
        >
          <Zap className="w-12 h-12 text-white fill-white" />
          <span className="text-2xl font-black text-white tracking-tighter">SEND ALERT</span>
        </button>

        <Button onClick={() => navigate(-1)} variant="ghost" size="lg" className="w-full">
          Cancel
        </Button>
      </div>
    </div>
  );
};

const MapPage = ({ room, user, profile }: { room: Room; user: FirebaseUser; profile: UserProfile }) => {
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [manualPlace, setManualPlace] = useState('');
  const [updating, setUpdating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, 'locations'), where('roomId', '==', room.id));
    return onSnapshot(q, (snap) => {
      setLocations(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserLocation)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'locations');
    });
  }, [room.id]);

  const handleManualUpdate = async () => {
    if (!manualPlace.trim()) return;
    setUpdating(true);
    try {
      let lat = 37.7749 + (Math.random() - 0.5) * 0.1;
      let lng = -122.4194 + (Math.random() - 0.5) * 0.1;

      // Real geocoding attempt using Nominatim (OpenStreetMap)
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualPlace)}&limit=1`);
        const data = await response.json();
        if (data && data.length > 0) {
          lat = parseFloat(data[0].lat);
          lng = parseFloat(data[0].lon);
        }
      } catch (geoErr) {
        console.warn('Geocoding failed, using fallback coordinates', geoErr);
      }
      
      await setDoc(doc(db, 'locations', user.uid), {
        roomId: room.id,
        role: profile.role,
        userName: profile.name,
        lat,
        lng,
        placeName: manualPlace,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setManualPlace('');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'locations');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col">
      <div className="sticky top-0 z-10 bg-[#121212]/80 backdrop-blur-xl border-b border-[#2A2A2A] p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate(-1)} variant="ghost" size="sm" className="p-2">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </Button>
          <h1 className="text-xl font-bold text-white">Live Map</h1>
        </div>
      </div>

      <div className="p-4 bg-[#1A1A1A] border-b border-[#2A2A2A] space-y-3">
        <div className="flex gap-2">
          <Input 
            placeholder="Enter your current location/place..." 
            value={manualPlace} 
            onChange={e => setManualPlace(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleManualUpdate} disabled={updating || !manualPlace.trim()} size="md">
            Update
          </Button>
        </div>
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Manual Location Entry</p>
      </div>
      
      <div className="flex-1 bg-[#1A1A1A] relative overflow-hidden">
        {/* Mock Map Background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 border border-gray-800">
            {Array.from({ length: 100 }).map((_, i) => (
              <div key={i} className="border border-gray-800/50" />
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-6 left-6 right-6 z-10">
          <Card className="p-4 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar bg-[#1A1A1A]/90 backdrop-blur-md">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-3 h-3 rounded-full bg-[#E2FF6F]" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Admin</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-3 h-3 rounded-full bg-blue-400" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Volunteer</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-3 h-3 rounded-full bg-purple-400" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Head</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-3 h-3 rounded-full bg-orange-400" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Organizer</span>
            </div>
          </Card>
        </div>

        {/* User Pins */}
        {locations.map((loc) => (
          <motion.div 
            key={loc.uid}
            initial={{ scale: 0, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="absolute"
            style={{ 
              left: `${((loc.lng + 180) % 360) / 3.6}%`, 
              top: `${(90 - loc.lat) / 1.8}%` 
            }}
          >
            <div className="relative flex flex-col items-center">
              {/* Floating Label */}
              <div className="mb-2 flex flex-col items-center">
                <div className="bg-[#2A2A2A] border border-[#3A3A3A] px-3 py-1.5 rounded-xl shadow-2xl flex flex-col items-center gap-0.5 min-w-[80px]">
                  <span className="text-[10px] font-black text-white leading-none">{loc.userName}</span>
                  <span className="text-[8px] font-bold text-[#E2FF6F] uppercase tracking-tighter opacity-80">
                    {loc.placeName || 'Live GPS'}
                  </span>
                </div>
                {/* Connector Triangle */}
                <div className="w-2 h-2 bg-[#2A2A2A] border-r border-b border-[#3A3A3A] rotate-45 -mt-1" />
              </div>

              {/* Pin */}
              <div className="relative">
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 border-white shadow-lg z-10 relative",
                  loc.role === 'admin' ? 'bg-[#E2FF6F]' : 
                  loc.role === 'volunteer' ? 'bg-blue-400' :
                  loc.role === 'head' ? 'bg-purple-400' : 'bg-orange-400'
                )} />
                {/* Pulse Effect */}
                <div className={cn(
                  "absolute inset-0 rounded-full animate-ping opacity-40",
                  loc.role === 'admin' ? 'bg-[#E2FF6F]' : 
                  loc.role === 'volunteer' ? 'bg-blue-400' :
                  loc.role === 'head' ? 'bg-purple-400' : 'bg-orange-400'
                )} />
              </div>
            </div>
          </motion.div>
        ))}
        
        {locations.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Navigation className="w-12 h-12 text-gray-700 mx-auto" />
              <p className="text-gray-600 text-sm">No live locations available</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SettingsPage = ({ room }: { room: Room }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#121212]">
      <div className="sticky top-0 z-10 bg-[#121212]/80 backdrop-blur-xl border-bottom border-[#2A2A2A] p-6 flex items-center gap-4">
        <Button onClick={() => navigate(-1)} variant="ghost" size="sm" className="p-2">
          <ChevronRight className="w-5 h-5 rotate-180" />
        </Button>
        <h1 className="text-xl font-bold text-white">Event Settings</h1>
      </div>
      
      <div className="p-6 space-y-8">
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Event Details</h3>
          <Card className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Name</span>
              <span className="text-sm font-bold text-white">{room.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Duration</span>
              <span className="text-sm font-bold text-white">{room.duration} Hours</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Created</span>
              <span className="text-sm font-bold text-white">{room?.createdAt ? format(room.createdAt.toDate(), 'MMM d, yyyy') : '...'}</span>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Access Keys</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6 flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <span className="text-sm font-bold text-white block">Volunteer</span>
                <code className="text-[#E2FF6F] font-mono font-bold text-lg">{(room as any).volunteerKeyRaw || 'N/A'}</code>
              </div>
              <div className="p-2 bg-white rounded-xl">
                <QRCodeSVG value={(room as any).volunteerKeyRaw || ''} size={100} />
              </div>
            </Card>

            <Card className="p-6 flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <span className="text-sm font-bold text-white block">Head</span>
                <code className="text-[#E2FF6F] font-mono font-bold text-lg">{(room as any).headKeyRaw || 'N/A'}</code>
              </div>
              <div className="p-2 bg-white rounded-xl">
                <QRCodeSVG value={(room as any).headKeyRaw || ''} size={100} />
              </div>
            </Card>

            <Card className="p-6 flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <span className="text-sm font-bold text-white block">Organizer</span>
                <code className="text-[#E2FF6F] font-mono font-bold text-lg">{(room as any).organizerKeyRaw || 'N/A'}</code>
              </div>
              <div className="p-2 bg-white rounded-xl">
                <QRCodeSVG value={(room as any).organizerKeyRaw || ''} size={100} />
              </div>
            </Card>
          </div>
          <p className="text-[10px] text-gray-600 text-center">Scan QR codes or share keys to let your team join.</p>
        </div>
      </div>
    </div>
  );
};

// --- Main App Wrapper ---

const AppContent = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setRoom(null);
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let unsubscribeRoom: (() => void) | null = null;

    const unsubscribeUser = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      const data = snap.data() as UserProfile;
      setProfile(data);

      if (unsubscribeRoom) {
        unsubscribeRoom();
        unsubscribeRoom = null;
      }

      if (data?.roomId) {
        unsubscribeRoom = onSnapshot(doc(db, 'rooms', data.roomId), (rSnap) => {
          if (rSnap.exists()) {
            setRoom({ id: rSnap.id, ...rSnap.data() } as Room);
          } else {
            setRoom(null);
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `rooms/${data.roomId}`);
          setLoading(false);
        });
      } else {
        setRoom(null);
        setLoading(false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      setLoading(false);
    });

    return () => {
      unsubscribeUser();
      if (unsubscribeRoom) unsubscribeRoom();
    };
  }, [user]);

  // Location Tracking & Presence
  useEffect(() => {
    if (!user || !profile || !room) return;
    
    // GPS Tracking
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setDoc(doc(db, 'locations', user.uid), {
          roomId: room.id,
          role: profile.role,
          userName: profile.name,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          updatedAt: serverTimestamp()
        }, { merge: true });
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );

    // Presence Tracking
    const updatePresence = async () => {
      await setDoc(doc(db, 'users', user.uid), {
        lastSeen: serverTimestamp()
      }, { merge: true });
    };
    updatePresence();
    const presenceInterval = setInterval(updatePresence, 30000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(presenceInterval);
    };
  }, [user, profile, room]);

  // Alert Listener for Sound/Vibration
  useEffect(() => {
    if (!user || !room) return;
    const q = query(
      collection(db, 'alerts'),
      where('roomId', '==', room.id),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    let initial = true;
    return onSnapshot(q, (snap) => {
      if (initial) {
        initial = false;
        return;
      }
      if (!snap.empty) {
        const alert = snap.docs[0].data() as Alert;
        if (alert.senderUid !== user.uid) {
          // Play sound and vibrate
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(() => {});
        }
      }
    });
  }, [user, room]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#E2FF6F]/20 border-t-[#E2FF6F] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <Routes>
      {!profile?.roomId || !room ? (
        <Route path="*" element={<JoinCreatePage user={user} />} />
      ) : (
        <>
          <Route path="/" element={<Dashboard user={user} profile={profile} room={room} />} />
          <Route path="/alerts" element={<AlertsPage room={room} />} />
          <Route path="/chat" element={<ChatPage user={user} profile={profile} room={room} />} />
          <Route path="/team" element={<TeamPage room={room} />} />
          <Route path="/tasks" element={<TasksPage user={user} profile={profile} room={room} />} />
          <Route path="/panic" element={<PanicPage user={user} profile={profile} room={room} />} />
          <Route path="/map" element={<MapPage room={room} user={user} profile={profile} />} />
          {profile.role === 'admin' && (
            <>
              <Route path="/settings" element={<SettingsPage room={room} />} />
            </>
          )}
          <Route path="*" element={<Navigate to="/" />} />
        </>
      )}
    </Routes>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
