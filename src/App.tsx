import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Navbar from './Navbar';
import LandingPage, { INITIAL_REVIEWS } from './LandingPage';
import { User, Project, PortfolioItem, ClientRecord, Review, FreelancerProfile, ClientProfile } from './types';
import { supabase } from './lib/supabase';
import { useSpeechToText } from './hooks/useSpeechToText';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  UserCircle,
  Settings,
  LogOut,
  Search,
  Plus,
  Bell,
  Menu,
  X,
  ChevronRight,
  ExternalLink,
  MapPin,
  Clock,
  DollarSign,
  Zap,
  Shield,
  Heart,
  Star,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  Github,
  Linkedin,
  Cloud,
  Laptop,
  BarChart3,
  Square,
  Facebook,
  Twitter,
  Instagram,
  ArrowDown,
  Trophy,
  Award,
  StickyNote,
  Camera,
  Smartphone,
  Wallet,
  Receipt,
  TrendingUp,
  CreditCard,
  MessageSquare,
  Cpu,
  Share2,
  Trash2,
  Palette,
  Code2,
  Megaphone,
  Layers,
  Brain,
  ShieldCheck,
  Send,
  User as UserIcon,
  Archive,
  Edit2,
  Filter,
  Check,
  Mail,
  Apple,
  Lock,
  Mic,
} from 'lucide-react';

// --- Supabase data/auth helpers ---

const toJsonString = (value: unknown, fallback: string) => {
  if (typeof value === 'string') return value;
  if (value == null) return fallback;
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
};

const loadCurrentSupabaseUser = async (): Promise<User | null> => {
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(`
      id,
      name,
      role,
      avatar_url,
      freelancer_profiles(*),
      client_profiles(*)
    `)
    .eq('id', authUser.id)
    .single();

  if (profileError || !profile) {
    throw new Error(profileError?.message || 'Failed to load user profile');
  }

  const role = profile.role === 'client' || profile.role === 'admin' ? profile.role : 'freelancer';
  const freelancerProfile = Array.isArray(profile.freelancer_profiles)
    ? profile.freelancer_profiles[0]
    : profile.freelancer_profiles;
  const clientProfile = Array.isArray(profile.client_profiles)
    ? profile.client_profiles[0]
    : profile.client_profiles;
  const roleProfile =
    role === 'client'
      ? clientProfile
      : freelancerProfile
        ? {
            ...freelancerProfile,
            skills: toJsonString(freelancerProfile.skills, '[]'),
            experience: toJsonString(freelancerProfile.experience, '[]'),
          }
        : null;

  return {
    id: profile.id as any,
    email: authUser.email || '',
    name: profile.name || (authUser.user_metadata?.name as string) || 'WorkVault User',
    role,
    avatar: profile.avatar_url || `https://i.pravatar.cc/150?u=${authUser.id}`,
    profile: roleProfile || undefined,
  } as any;
};

const isUuid = (value: unknown) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const loadProjectsFromSupabase = async (userId: string) => {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      id,
      freelancer_id,
      client_id,
      title,
      description,
      status,
      deadline,
      budget,
      start_date,
      progress,
      notes,
      client:profiles!projects_client_id_fkey(name)
    `)
    .or(`freelancer_id.eq.${userId},client_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((project: any) => ({
    ...project,
    client_name: project.client?.name,
  }));
};

const loadClientsFromSupabase = async (userId: string) => {
  const { data, error } = await supabase
    .from('clients_list')
    .select('id, freelancer_id, name, email, company, notes')
    .eq('freelancer_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

const loadFreelancersFromSupabase = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      name,
      role,
      avatar_url,
      freelancer_profiles(
        skills,
        experience,
        hourly_rate,
        designation,
        tagline,
        rating_status
      )
    `)
    .eq('role', 'freelancer')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((item: any, index: number) => {
    const fp = Array.isArray(item.freelancer_profiles) ? item.freelancer_profiles[0] : item.freelancer_profiles;
    const skills = Array.isArray(fp?.skills)
      ? fp.skills
      : (() => {
          try { return JSON.parse(fp?.skills || '[]'); } catch { return []; }
        })();
    const experience = Array.isArray(fp?.experience)
      ? fp.experience
      : (() => {
          try { return JSON.parse(fp?.experience || '[]'); } catch { return []; }
        })();

    return {
      id: item.id,
      name: item.name || 'Freelancer',
      role: fp?.designation || 'Freelancer',
      rating: 4.9,
      hourly_rate: Number(fp?.hourly_rate || 0),
      profileImage: item.avatar_url || `https://i.pravatar.cc/150?u=${item.id}`,
      workImage: `https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=1000&fit=crop&sig=${index + 1}`,
      category: skills?.[0] || 'Development',
      experience: JSON.stringify(experience || []),
      profile: {
        bio: fp?.tagline || '',
        skills: JSON.stringify(skills || []),
        experience: JSON.stringify(experience || []),
        hourly_rate: Number(fp?.hourly_rate || 0),
        designation: fp?.designation || 'Freelancer',
        tagline: fp?.tagline || '',
        rating_status: fp?.rating_status || 'Professional',
      },
    };
  });
};

const loadPortfolioItemsFromSupabase = async (freelancerId: string) => {
  const { data, error } = await supabase
    .from('portfolio_items')
    .select('id, freelancer_id, title, description, image_url, link, sort_order, category, year, capabilities')
    .eq('freelancer_id', freelancerId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

const AuthPage = ({ onBack, onLoginSuccess, initialRole = 'freelancer' as 'freelancer' | 'client', initialIsActive = false }: { onBack: () => void, onLoginSuccess: (user: any) => void, initialRole?: 'freelancer' | 'client', initialIsActive?: boolean }) => {
  const [isActive, setIsActive] = useState(initialIsActive);
  const [selectedRole, setSelectedRole] = useState<'freelancer' | 'client'>(initialRole as 'freelancer' | 'client');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const GoogleIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1.02.68-2.33 1.09-3.71 1.09-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );

  const LinkedInIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="#0077B5">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  );

  const GithubIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="#181717">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const validate = (isRegister: boolean) => {
    if (!formData.email || !formData.password) {
      setError('Please fill in all required fields.');
      return false;
    }
    if (isRegister && !formData.fullName) {
      setError('Please provide your full name.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return false;
    }
    return true;
  };

  const handleAuth = async (isRegister: boolean) => {
    if (validate(isRegister)) {
      setLoading(true);
      setError(null);
      try {
        if (isRegister) {
          const { data, error } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              data: { name: formData.fullName, role: selectedRole },
            },
          });

          if (error) throw error;

          if (!data.session) {
            const loginAfterSignup = await supabase.auth.signInWithPassword({
              email: formData.email,
              password: formData.password,
            });
            if (loginAfterSignup.error) {
              throw new Error('Account created. Please verify your email before signing in.');
            }
          }
        } else {
          const { error } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
          });
          if (error) throw error;
        }

        const user = await loadCurrentSupabaseUser();
        if (!user) throw new Error('Could not load your account. Please try again.');
        onLoginSuccess(user);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 relative flex flex-col items-center justify-center gap-6 p-4 font-['Poppins'] leading-normal">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
      `}</style>

      {/* Top-left Back */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 hover:text-zinc-900 transition-colors group"
      >
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
        Back
      </button>

      <div className="relative w-full max-w-[900px] min-h-[580px] bg-white rounded-[40px] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.15)] overflow-hidden flex">

        {/* Registration Form */}
        <div className="w-1/2 h-full p-12 flex flex-col items-center justify-center text-center">
          <motion.div
            className="w-full space-y-4"
            animate={{ opacity: isActive ? 0 : 1, x: isActive ? -20 : 0 }}
          >
            <h1 className="text-4xl font-black text-zinc-900 mb-2">Create Account</h1>
            <p className="text-sm text-zinc-400 mb-4 font-medium">Choose your role to get started</p>
            
            {/* Role Selector */}
            <div className="flex gap-2 mb-4">
              {(['freelancer', 'client'] as const).map(role => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`flex-1 py-3 rounded-2xl text-[10px] font-bold capitalize transition-all border-2 ${selectedRole === role
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-lg shadow-zinc-900/20'
                    : 'bg-zinc-50 text-zinc-500 border-transparent hover:border-zinc-200'
                  }`}
                >
                  {role === 'freelancer' ? '🧑‍💻 Freelancer' : '🏢 Client'}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {error && !isActive && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-500 text-[10px] font-bold uppercase tracking-wider"
                >
                  {error}
                </motion.div>
              )}
              <div className="relative">
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Full Name"
                  className={`w-full px-5 py-4 bg-zinc-100 border rounded-2xl outline-none focus:bg-white transition-all pr-12 text-sm font-medium ${error && !formData.fullName && !isActive ? 'border-rose-300' : 'border-transparent focus:border-primary/30'}`}
                />
                <UserIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              </div>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email"
                  className={`w-full px-5 py-4 bg-zinc-100 border rounded-2xl outline-none focus:bg-white transition-all pr-12 text-sm font-medium ${error && !formData.email && !isActive ? 'border-rose-300' : 'border-transparent focus:border-primary/30'}`}
                />
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              </div>
              <div className="relative">
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Password"
                  className={`w-full px-5 py-4 bg-zinc-100 border rounded-2xl outline-none focus:bg-white transition-all pr-12 text-sm font-medium ${error && !formData.password && !isActive ? 'border-rose-300' : 'border-transparent focus:border-primary/30'}`}
                />
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              </div>
              <button
                type="button"
                onClick={() => handleAuth(true)}
                className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold shadow-xl shadow-zinc-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Register as {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
              </button>
              <div className="pt-2 space-y-3">
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.2em] text-center">or sign up with</p>
                <div className="flex justify-center gap-4">
                  {[GoogleIcon, GithubIcon, LinkedInIcon].map((Icon, i) => (
                    <button key={i} className="p-3 bg-white border border-zinc-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group">
                    <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Login Form */}
        <div className="w-1/2 h-full p-12 flex flex-col items-center justify-center text-center">
          <motion.div
            className="w-full space-y-4"
            animate={{ opacity: isActive ? 1 : 0, x: isActive ? 0 : 20 }}
          >
            <h1 className="text-4xl font-black text-zinc-900 mb-2">Sign In</h1>
            <p className="text-sm text-zinc-400 mb-4 font-medium">Choose your role to continue</p>

            {/* Role Selector */}
            <div className="flex gap-2 mb-4">
              {(['freelancer', 'client'] as const).map(role => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`flex-1 py-3 rounded-2xl text-[10px] font-bold capitalize transition-all border-2 ${selectedRole === role
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-lg shadow-zinc-900/20'
                    : 'bg-zinc-50 text-zinc-500 border-transparent hover:border-zinc-200'
                  }`}
                >
                  {role === 'freelancer' ? '🧑‍💻 Freelancer' : '🏢 Client'}
                </button>
              ))}
            </div>

            <div className="space-y-3 text-left">
              {error && isActive && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-500 text-[10px] font-bold uppercase tracking-wider text-center"
                >
                  {error}
                </motion.div>
              )}
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email"
                  className={`w-full px-5 py-4 bg-zinc-100 border rounded-2xl outline-none focus:bg-white transition-all pr-12 text-sm font-medium ${error && !formData.email && isActive ? 'border-rose-300' : 'border-transparent focus:border-primary/30'}`}
                />
                <UserIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              </div>
              <div className="relative">
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Password"
                  className={`w-full px-5 py-4 bg-zinc-100 border rounded-2xl outline-none focus:bg-white transition-all pr-12 text-sm font-medium ${error && !formData.password && isActive ? 'border-rose-300' : 'border-transparent focus:border-primary/30'}`}
                />
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              </div>
              <div className="text-right">
                <a href="#" className="text-xs font-bold text-zinc-400 hover:text-primary transition-colors uppercase tracking-widest">Forgot Password?</a>
              </div>
              <button
                type="button"
                onClick={() => handleAuth(false)}
                className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold shadow-xl shadow-zinc-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-center"
              >
                Login as {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
              </button>
              <div className="pt-2 space-y-3 text-center">
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.2em]">or login with</p>
                <div className="flex justify-center gap-4">
                  {[GoogleIcon, GithubIcon, LinkedInIcon].map((Icon, i) => (
                    <button key={i} className="p-3 bg-white border border-zinc-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group">
                    <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Sliding Overlay */}
        <motion.div className="absolute inset-0 z-30 pointer-events-none" initial={false}>
          <motion.div
            className="absolute top-0 w-1/2 h-full bg-primary pointer-events-auto overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.1)]"
            animate={{
              x: isActive ? '0%' : '100%',
              borderTopRightRadius: isActive ? '100px' : '40px',
              borderBottomRightRadius: isActive ? '100px' : '40px',
              borderTopLeftRadius: isActive ? '40px' : '100px',
              borderBottomLeftRadius: isActive ? '40px' : '100px',
            }}
            transition={{ duration: 0.6, ease: [0.6, 0.05, 0.01, 0.9] }}
          >
            <motion.div
              className="flex w-[200%] h-full"
              animate={{ x: isActive ? '0%' : '-50%' }}
              transition={{ duration: 0.6, ease: [0.6, 0.05, 0.01, 0.9] }}
            >
              <div className="w-1/2 h-full flex flex-col items-center justify-center p-12 text-white text-center">
                <h1 className="text-4xl font-black mb-6">Welcome Back!</h1>
                <p className="text-lg opacity-80 mb-8 max-w-xs leading-relaxed">Already have an account? Sign in to continue your journey.</p>
                <button onClick={() => { setIsActive(false); setError(null); }} className="px-12 py-4 border-2 border-white/50 text-white rounded-2xl font-bold hover:bg-white hover:text-primary hover:border-white transition-all active:scale-95">Register</button>
              </div>
              <div className="w-1/2 h-full flex flex-col items-center justify-center p-12 text-white text-center">
                <h1 className="text-4xl font-black mb-6">Hello, Welcome!</h1>
                <p className="text-lg opacity-80 mb-8 max-w-xs leading-relaxed">New here? Create an account and unlock elite opportunities.</p>
                <button onClick={() => { setIsActive(true); setError(null); }} className="px-12 py-4 border-2 border-white/50 text-white rounded-2xl font-bold hover:bg-white hover:text-primary hover:border-white transition-all active:scale-95">Login</button>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};



// --- Page Components ---

// --- Components ---

const Sidebar = ({ activeTab, setActiveTab, role, onBackToLanding, onSignOut }: { activeTab: string, setActiveTab: (tab: string) => void, role: 'freelancer' | 'client', onBackToLanding: () => void, onSignOut: () => void }) => {
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const freelancerItems = [
    { id: 'profile', label: 'Profile', icon: UserCircle },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'portfolio', label: 'Portfolio', icon: Star },
    { id: 'projects', label: 'Projects', icon: Briefcase },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'messages', label: 'Messages', icon: Mail },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const clientItems = [
    { id: 'profile', label: 'Profile', icon: UserCircle },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'browse', label: 'Browse Freelancers', icon: Search },
    { id: 'favourites', label: 'Favourites', icon: Heart },
    { id: 'messages', label: 'Messages', icon: Mail },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const adminItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'monitoring', label: 'Projects', icon: Briefcase },
    { id: 'reports', label: 'Reports', icon: Star },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const menuItems = role === 'freelancer' ? freelancerItems : role === 'client' ? clientItems : adminItems;
  const roleLabel = role === 'freelancer' ? '🧑‍💻 Freelancer' : '🏢 Client';
  const roleBg = role === 'freelancer' ? 'bg-blue-50 text-blue-700' : role === 'client' ? 'bg-amber-50 text-amber-700' : 'bg-purple-50 text-purple-700';

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface border-r border-zinc-200/50 p-6 hidden md:flex flex-col z-50">
      <div className="flex items-center gap-3 mb-12 px-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={onBackToLanding}>
        <div className="bg-zinc-900 p-2 rounded-xl shadow-lg shadow-zinc-900/20">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <div className="flex flex-col -space-y-1">
          <span className="text-xl font-black tracking-tighter text-zinc-900 leading-none">WorkVault</span>
        </div>
      </div>

      {/* Role Badge */}
      <div className={`mb-6 px-3 py-1.5 ${roleBg} rounded-xl text-xs font-black uppercase tracking-widest self-start`}>
        {roleLabel}
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto pr-2 custom-scrollbar">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 font-bold ${activeTab === item.id
              ? 'bg-zinc-900 text-white shadow-xl shadow-zinc-900/20 translate-x-1'
              : 'text-zinc-500 hover:bg-zinc-100/50 hover:text-zinc-900 hover:translate-x-1'
              }`}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className="text-sm border-0 bg-transparent p-0 m-0 outline-none whitespace-nowrap">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="pt-6 border-t border-zinc-200/50 mt-auto relative">
        <button onClick={() => setShowSignOutConfirm(true)} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-zinc-500 hover:bg-red-50 hover:text-red-500 transition-all duration-300 font-bold group">
          <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm">Sign Out</span>
        </button>

        <AnimatePresence>
          {showSignOutConfirm && (
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 10 }}
               className="absolute bottom-full left-0 mb-4 w-full bg-white rounded-2xl shadow-xl border border-zinc-100 p-4 z-50 text-center"
            >
              <p className="text-xs font-bold text-zinc-900 mb-3">Are you sure you want to sign out?</p>
              <div className="flex gap-2">
                <button onClick={() => setShowSignOutConfirm(false)} className="flex-1 py-2 text-[10px] font-bold text-zinc-500 bg-zinc-50 rounded-lg hover:bg-zinc-100 transition-colors uppercase tracking-wider">Cancel</button>
                <button onClick={() => { setShowSignOutConfirm(false); onSignOut(); }} className="flex-1 py-2 text-[10px] font-bold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors uppercase tracking-wider">Sign Out</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
};


const Header = ({ user, onBackToLanding, onNotificationClick }: { user: User | null, onBackToLanding: () => void, onNotificationClick: () => void }) => {
  return (
    <header className="h-20 border-b border-zinc-200/50 bg-white/80 backdrop-blur-xl sticky top-0 z-40 px-8 flex items-center justify-between">
      <div className="md:hidden flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={onBackToLanding}>
        <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
          <Briefcase className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-black font-display text-zinc-900">WorkVault</span>
      </div>

      <div className="hidden md:flex flex-1 max-w-xl items-center gap-4">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search projects, clients or messages..." 
            className="w-full bg-zinc-50 border border-zinc-200/80 rounded-full pl-11 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:bg-white transition-all shadow-sm placeholder:text-zinc-400 text-zinc-900"
          />
        </div>
      </div>

      <div className="flex items-center gap-5 ml-auto">
        <button 
          onClick={onNotificationClick}
          className="p-2.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 rounded-full relative transition-colors border border-transparent hover:border-zinc-200 shadow-sm bg-white"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white shadow-sm"></span>
        </button>
      </div>
    </header>
  );
};

// --- Pages ---

type StatCardProps = { label: string; value: string | number; bg: string; text: string; icon: React.ElementType; colorStyle: string; iconStyle?: string; details?: string[] };
const StatCard: React.FC<StatCardProps> = ({ label, value, bg, text, icon: Icon, colorStyle, iconStyle = 'text-white', details }) => (
  <div className={`relative aspect-square w-full ${bg} overflow-hidden group cursor-default rounded-[32px] border border-zinc-200/40 shadow-sm hover:shadow-2xl transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)]`}>
    
    {/* Default State */}
    <div className="absolute inset-0 p-8 md:p-10 flex flex-col justify-between z-10 transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:opacity-0 group-hover:-translate-y-8">
      <div className="flex justify-between items-start">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${'bg-primary,bg-zinc-900'.split(',').includes(bg) ? 'bg-white/10' : 'bg-zinc-900/5'}`}>
           <Icon className={`w-6 h-6 ${'bg-primary,bg-zinc-900'.split(',').includes(bg) ? 'text-white' : 'text-zinc-900'}`} />
        </div>
        <div className="flex gap-1.5 opacity-40">
           <div className={`w-1.5 h-1.5 rounded-full ${'bg-primary,bg-zinc-900'.split(',').includes(bg) ? 'bg-white' : 'bg-zinc-900'}`} />
           <div className={`w-1.5 h-1.5 rounded-full ${'bg-primary,bg-zinc-900'.split(',').includes(bg) ? 'bg-white' : 'bg-zinc-900'}`} />
        </div>
      </div>
      <div>
        <p className={`text-5xl md:text-6xl font-bold font-display tracking-tight leading-none mb-4 ${'bg-primary,bg-zinc-900'.split(',').includes(bg) ? 'text-white' : 'text-zinc-900'}`}>{value}</p>
        <h3 className={`font-semibold text-xs uppercase tracking-[0.25em] ${'bg-primary,bg-zinc-900'.split(',').includes(bg) ? 'text-zinc-100 opacity-60' : 'text-zinc-500'}`}>{label}</h3>
      </div>
    </div>

    {/* Hover State - Awwwards slider reveal */}
    <div className="absolute inset-0 bg-zinc-900 p-8 md:p-10 z-20 flex flex-col justify-between opacity-0 translate-y-[110%] group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none group-hover:pointer-events-auto">
      {/* Corner crosshairs */}
      <div className="absolute top-6 left-6 w-4 h-4 text-white/30 font-light flex items-center justify-center">+</div>
      <div className="absolute top-6 right-6 w-4 h-4 text-white/30 font-light flex items-center justify-center">+</div>
      <div className="absolute bottom-6 left-6 w-4 h-4 text-white/30 font-light flex items-center justify-center">+</div>
      <div className="absolute bottom-6 right-6 w-4 h-4 text-white/30 font-light flex items-center justify-center">+</div>
      
      <div className="relative z-10 w-full h-full flex flex-col justify-center">
        <h3 className="text-xl md:text-xl font-bold font-display tracking-tight text-white mb-6 pb-6 border-b border-white/20 transform translate-y-6 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] delay-100">{label}</h3>
        <ul className="space-y-4">
          {details?.map((detail, idx) => (
            <li key={idx} className={`text-sm text-white/80 font-normal flex items-start gap-4 transform translate-y-6 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)]`} style={{ transitionDelay: `${150 + (idx * 75)}ms` }}>
              <span className="w-1.5 h-1.5 bg-white mt-2 shrink-0 block rounded-full"></span> 
              <span className="leading-snug">{detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

const ProjectList = ({ projects, onOpenNotes }: { projects: any[], onOpenNotes?: (p: any) => void }) => (
  projects.length > 0 ? (
    <div className="bg-white rounded-[24px] border border-zinc-200/50 shadow-sm overflow-hidden text-sm">
      {projects.map((project, i) => (
        <div key={project.id} className={`p-5 flex items-center justify-between hover:bg-zinc-50 transition-colors group cursor-pointer ${i !== projects.length - 1 ? 'border-b border-zinc-100' : ''}`}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-center group-hover:bg-zinc-100 group-hover:shadow-sm transition-all">
              <Briefcase className="w-5 h-5 text-zinc-900 transition-colors" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-base">{project.title}</h3>
              <p className="text-xs font-medium text-zinc-500 mt-0.5">{project.client_name || 'Individual Client'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-zinc-100 text-zinc-900 border border-zinc-200`}>
              {project.status.replace('_', ' ')}
            </span>
            <div className="flex items-center gap-2">
              <p className="font-bold text-zinc-900 text-base w-24 text-right">${project.budget}</p>
              <button 
                onClick={(e) => { e.stopPropagation(); onOpenNotes?.(project); }}
                className="p-2 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg transition-all"
                title="Project Notes"
              >
                <StickyNote className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="bg-white rounded-[24px] border border-zinc-200/50 shadow-sm p-12 text-center flex flex-col items-center justify-center">
      <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mb-4 border border-zinc-100">
        <Briefcase className="w-6 h-6 text-zinc-300" />
      </div>
      <h3 className="text-lg font-bold text-zinc-900 mb-1">No active projects</h3>
      <p className="text-sm text-zinc-500 mb-6 max-w-sm">No projects found for this view yet.</p>
      <button className="px-6 py-2.5 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-900/10">Browse Opportunities</button>
    </div>
  )
);

const FreelancerDashboard = ({ user, projects, setActiveTab, onOpenNotes }: { user: any, projects: any[], setActiveTab?: (v: string) => void, onOpenNotes?: (p: any) => void }) => {
  const active = projects.filter(p => p.status === 'in_progress').length;
  const completed = projects.filter(p => p.status === 'completed').length;
  const pending = projects.filter(p => p.status === 'pending').length;
  const kpis = [
    { label: 'Total Earnings', value: '$44.8K', bg: 'bg-primary', text: 'text-zinc-900', icon: DollarSign, colorStyle: '', iconStyle: '', details: ["2 recent payouts cleared", "$5k pending escrows locked", "Top 5% of earners in tier"] },
    { label: 'Active Projects', value: active, bg: 'bg-white', text: 'text-zinc-900', icon: Briefcase, colorStyle: '', iconStyle: '', details: ["Brand Identity Redesign", "Enterprise Web App", "Milestones on track"] },
    { label: 'Profile Views', value: '1.2K', bg: 'bg-zinc-50', text: 'text-zinc-900', icon: Star, colorStyle: '', iconStyle: '', details: ["84 clicks this week", "Most traffic from US", "4 new saves"] },
  ];

  const upcoming = projects.filter(p => p.status !== 'completed').slice(0, 3);
  
  const [pendingProposals, setPendingProposals] = useState([
    { id: 1, client: "Acme Corp", title: "Brand Identity Redesign", requested: "2 hours ago", status: 'pending' },
    { id: 2, client: "Starlight Digital", title: "Enterprise Web App", requested: "5 hours ago", status: 'pending' },
  ]);

  const handleProposalAction = (id: number, action: 'accepted' | 'declined') => {
    setPendingProposals(prev => prev.map(p => p.id === id ? { ...p, status: action } : p));
  };

  const unreadMessages = [
    { id: 1, client: "TechFlow Inc.", snippet: "Can we review the latest mockups?", time: "10 min ago" },
    { id: 2, client: "Nexus Group", snippet: "The contract looks good to sign.", time: "1 hr ago" },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-black font-display tracking-tight text-zinc-900 mb-1">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="text-zinc-500 font-medium">Here's a full overview of your active contracts and incoming proposals.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {kpis.map((stat) => <StatCard key={stat.label} label={stat.label} value={stat.value} bg={stat.bg} text={stat.text} icon={stat.icon} colorStyle={stat.colorStyle} iconStyle={stat.iconStyle} details={stat.details} />)}
        
        {[
          { label: 'Hourly Rate', value: '$150/hr', sub: 'Above market by 18%', color: 'text-zinc-900' },
          { label: 'Bid Win Rate', value: '72%', sub: '16 bids sent this month', color: 'text-zinc-900' },
          { label: 'Avg Response Time', value: '< 2 hrs', sub: 'Top 10% of freelancers', color: 'text-zinc-900' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-[24px] border border-zinc-200/50 shadow-sm p-6 flex flex-col justify-center">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{item.label}</p>
            <p className={`text-2xl font-black font-display ${item.color}`}>{item.value}</p>
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mt-1">{item.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-display text-zinc-900">Active Projects</h2>
            <button onClick={() => setActiveTab?.('projects')} className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest hover:text-zinc-900 flex items-center gap-1 group transition-colors">
              View all <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <ProjectList projects={projects.filter(p => p.status === 'in_progress').slice(0, 1)} onOpenNotes={onOpenNotes} />
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold font-display text-zinc-900">Upcoming Deadlines</h2>
          {upcoming.length > 0 ? (
            <div className="space-y-3">
              {upcoming.map(project => (
                <div key={project.id} className="bg-white p-5 rounded-[24px] border border-zinc-200/50 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow cursor-default group">
                  <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform border border-zinc-200">
                    <Clock className="w-5 h-5 text-zinc-900" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 line-clamp-1 leading-tight">{project.title}</h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1">{project.client_name}</p>
                    <div className="flex flex-col items-center mt-3 translate-x-10">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-base font-black ${new Date(project.deadline) < new Date() ? 'text-red-500' : 'text-zinc-900'}`}>
                          {(() => {
                            const diff = new Date(project.deadline).getTime() - new Date().setHours(0,0,0,0);
                            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                            return Math.abs(days);
                          })()}
                        </span>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Days Remaining</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-zinc-200" />
                        <span className={`text-[9px] font-black uppercase tracking-widest ${new Date(project.deadline) < new Date() ? 'text-red-500' : 'text-zinc-400'}`}>
                          {new Date(project.deadline) < new Date() ? 'Delayed' : 'Left'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-zinc-50 rounded-[24px] border border-zinc-200 shadow-sm p-10 text-center h-[240px] flex flex-col items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-zinc-300 mb-3" />
              <p className="text-sm font-bold text-zinc-900">All caught up!</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mt-4">
        {/* Pending Proposals */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold font-display text-zinc-900">Pending Proposals</h2>
          <div className="bg-white rounded-[24px] border border-zinc-200/50 shadow-sm p-4 space-y-2">
            {pendingProposals.map(prop => (
               <div key={prop.id} className="p-5 rounded-[20px] border border-zinc-100 bg-zinc-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div>
                    <h3 className="text-sm font-bold text-zinc-900">{prop.title}</h3>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">{prop.client} • {prop.requested}</p>
                 </div>
                 <div className="flex gap-2">
                    {prop.status === 'pending' ? (
                      <>
                        <button onClick={() => handleProposalAction(prop.id, 'declined')} className="px-4 py-2 bg-white border border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:bg-zinc-100 transition-colors">Decline</button>
                        <button onClick={() => handleProposalAction(prop.id, 'accepted')} className="px-4 py-2 bg-primary text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors shadow-sm">Accept</button>
                      </>
                    ) : (
                      <span className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest ${prop.status === 'accepted' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {prop.status}
                      </span>
                    )}
                 </div>
               </div>
            ))}
          </div>
        </div>

        {/* Unread Messages */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold font-display text-zinc-900">Recent Messages</h2>
          <div className="bg-white rounded-[24px] border border-zinc-200/50 shadow-sm p-4 space-y-2">
            {unreadMessages.map(msg => (
               <div key={msg.id} className="p-3.5 rounded-[20px] hover:bg-zinc-50 transition-colors cursor-pointer flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-sm shadow-sm md:shadow-md shadow-primary/10">
                    {msg.client.charAt(0)}
                 </div>
                 <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                       <h3 className="text-sm font-bold text-zinc-900">{msg.client}</h3>
                       <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{msg.time}</span>
                    </div>
                    <p className="text-xs text-zinc-500 font-medium line-clamp-1">{msg.snippet}</p>
                 </div>
               </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ClientDashboard = ({ user, projects, favourites = [], freelancers = [], setActiveTab, onOpenNotes, onProfileClick }: { user: any, projects: any[], favourites?: Array<string | number>, freelancers?: any[], setActiveTab?: (v: string) => void, onOpenNotes?: (p: any) => void, onProfileClick?: (f: any) => void }) => {
  const favouritedFreelancers = freelancers.filter((f: any) => favourites.includes(f.id));
  const kpis = [
    { label: 'Total Investment', value: '$128.5K', bg: 'bg-primary', text: 'text-zinc-900', icon: DollarSign, colorStyle: '', iconStyle: '', details: ["$18,200 spent this month", "3 active enterprise contracts", "12% under total budget"] },
    { label: 'Active Contracts', value: projects.filter(p => p.status === 'in_progress').length, bg: 'bg-zinc-100', text: 'text-zinc-900', icon: Briefcase, colorStyle: '', iconStyle: '', details: ["2 Mobile Applications", "1 Full-Stack Web Platform", "All milestones on schedule"] },
    { label: 'Freelancers Hired', value: 12, bg: 'bg-zinc-100', text: 'text-zinc-900', icon: Users, colorStyle: '', iconStyle: '', details: ["3 currently active", "Average rating: 4.9/5.0", "Top global percentiles"] },
    { label: 'Projects Delivered', value: projects.filter(p => p.status === 'completed').length, bg: 'bg-zinc-100', text: 'text-zinc-900', icon: CheckCircle2, colorStyle: '', iconStyle: '', details: ["100% success rating", "0 disputed milestones", "Fully handed off"] },
  ];


  const activeProjects = projects.filter(p => p.status === 'in_progress');

  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-20">
      {/* Hero & Command Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-black font-display tracking-tight text-zinc-900 mb-2">Good day, {user?.name?.split(' ')[0]} 🏢</h1>
          <p className="text-zinc-500 font-medium text-lg">Your project command center is active and reporting optimal performance.</p>
        </div>
        
        
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((stat) => <StatCard key={stat.label} label={stat.label} value={stat.value} bg={stat.bg} text={stat.text} icon={stat.icon} colorStyle={stat.colorStyle} details={stat.details} />)}
      </div>

      {/* Project Health & Talnet Discovery */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Project Health Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
               <h2 className="text-2xl font-black font-display text-zinc-900">Project Health</h2>
               <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mt-1">Real-time status tracking</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeProjects.length > 0 ? activeProjects.slice(0, 4).map(p => {
              const diff = new Date(p.deadline || "2024-12-31").getTime() - new Date().setHours(0,0,0,0);
              const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
              const isDelayed = days < 0;
              
              return (
                <div key={p.id} className="bg-white p-6 rounded-[32px] border border-zinc-200/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 group">
                   <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center border border-zinc-100 group-hover:bg-primary/5 group-hover:border-primary/20 transition-all">
                         <Briefcase className="w-5 h-5 text-zinc-900 group-hover:text-primary transition-colors" />
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Budget Allocation</p>
                         <p className="text-sm font-black text-zinc-900 flex items-center justify-end gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] anim-pulse" />
                            ${p.budget}
                         </p>
                      </div>
                   </div>
                   <h3 className="text-lg font-bold text-zinc-900 mb-2 leading-tight line-clamp-1">{p.title}</h3>
                   <p className="text-xs text-zinc-500 font-medium line-clamp-2 mb-6 h-8">{p.description || "A high-end project delivering exceptional value through strategic implementation."}</p>
                   
                   <div className="space-y-4">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-400">
                         <span>Phase Progress</span>
                         <span>65%</span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-50 rounded-full overflow-hidden border border-zinc-100">
                         <div className="h-full bg-primary rounded-full shadow-[0_0_8px_rgba(34,129,154,0.3)] transition-all duration-1000" style={{ width: '65%' }} />
                      </div>
                   </div>
                   
                   <div className="flex items-center justify-between pt-6 mt-6 border-t border-zinc-50">
                      <div className="flex items-center gap-2">
                         <Clock className={`w-3.5 h-3.5 ${isDelayed ? 'text-rose-500' : 'text-zinc-400'}`} />
                         <span className={`text-[10px] font-black uppercase tracking-widest ${isDelayed ? 'text-rose-500' : 'text-zinc-500'}`}>
                            {isDelayed ? 'Delayed' : `${days} Days Left`}
                         </span>
                      </div>
                      <button 
                        onClick={() => onOpenNotes?.(p)}
                        className="w-8 h-8 rounded-full bg-zinc-50 text-zinc-400 hover:bg-primary hover:text-white transition-all flex items-center justify-center border border-zinc-100"
                      >
                         <StickyNote className="w-3.5 h-3.5" />
                      </button>
                   </div>
                </div>
              );
            }) : (
              <div className="col-span-2 bg-zinc-50/50 border-2 border-dashed border-zinc-200 rounded-[32px] p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
                 <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-zinc-100">
                    <Briefcase className="w-6 h-6 text-zinc-200" />
                 </div>
                 <h3 className="text-xl font-bold text-zinc-900">No active pipelines</h3>
                 <p className="text-zinc-400 text-sm max-w-xs mt-2">Start a new project or hire a freelancer to see your command center live.</p>
              </div>
            )}
          </div>
        </div>

        {/* Success Story Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
               <h2 className="text-2xl font-black font-display text-zinc-900">Experience Highlights</h2>
               <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mt-1">Platform Impact</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-[32px] border border-zinc-200/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 group flex flex-col justify-between min-h-[320px] h-fit">
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-100 group-hover:scale-110 transition-transform duration-500">
                  <Trophy className="w-5 h-5 text-amber-500" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Success Stories</p>
                  <p className="text-sm font-black text-zinc-900">Share Your Win</p>
                </div>
              </div>
              <h3 className="text-lg font-bold text-zinc-900 mb-2 leading-tight font-display">Define Your Platform Legacy</h3>
              <p className="text-xs text-zinc-500 font-medium leading-relaxed mb-8 line-clamp-3">Your partnership with elite talent is defining the new standard. Help the community by sharing your latest breakthrough.</p>
            </div>
            
            <button 
              onClick={() => (window as any).openSuccessStoryModal()}
              className="w-full py-4 bg-zinc-900 text-white rounded-[20px] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary transition-all shadow-lg shadow-zinc-900/10 active:scale-95 group"
            >
              <Star className="w-3.5 h-3.5 text-yellow-500 fill-current group-hover:rotate-90 transition-transform duration-500" />
              Publish Success Story
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

const FavouritesPage = ({ favourites = [], freelancers = [], onProfileClick, setActiveTab }: { favourites: Array<string | number>, freelancers?: any[], onProfileClick?: (f: any) => void, setActiveTab?: (v: string) => void }) => {
  const favouritedFreelancers = freelancers.filter((f: any) => favourites.includes(f.id));

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <div>
        <h1 className="text-4xl md:text-5xl font-black text-zinc-900 mb-2">Favourites</h1>
      </div>

      {favouritedFreelancers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {favouritedFreelancers.map((f, i) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-[32px] border border-zinc-200/50 shadow-sm overflow-hidden group hover:shadow-2xl hover:-translate-y-2 transition-all duration-500"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={f.workImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={f.name} />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <button 
                  onClick={() => onProfileClick?.(f)}
                  className="absolute bottom-4 left-4 right-4 py-3 bg-white/90 backdrop-blur-md rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-900 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 shadow-xl"
                >
                  View Full Profile
                </button>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <img src={f.profileImage} className="w-10 h-10 rounded-full border-2 border-zinc-50 shadow-sm" alt={f.name} />
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 leading-tight">{f.name}</h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">{f.role}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-zinc-50">
                  <div className="flex items-center gap-1.5 text-[11px] font-black text-zinc-900">
                    <Star className="w-3 h-3 text-amber-500 fill-current" />
                    {f.rating}
                  </div>
                  <div className="text-[11px] font-black text-zinc-900">
                    ${f.hourly_rate}<span className="text-zinc-400 font-medium">/HR</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="bg-zinc-50/50 border-2 border-dashed border-zinc-200 rounded-[40px] p-20 text-center flex flex-col items-center justify-center max-w-2xl w-full">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-zinc-100 italic text-3xl">
              ❤️
            </div>
            <h3 className="text-2xl font-black text-zinc-900 italic">No Saved Talent Yet</h3>
            <p className="text-zinc-400 text-sm max-w-sm mt-3 font-medium mx-auto text-center">Shortlist the people you'd like to work with.</p>
            <button 
              onClick={() => setActiveTab?.('browse')}
              className="mt-8 px-10 py-4 bg-zinc-900 text-white rounded-[20px] text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-zinc-900/20 hover:scale-105 active:scale-95 transition-all mx-auto"
            >
              Start Exploring
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminDashboard = ({ user }: { user: any }) => {
  const kpis = [
    { label: 'Total Users', value: '2,840', bg: 'bg-primary', text: 'text-primary', icon: Users, colorStyle: 'from-primary/10 to-transparent border-primary/20' },
    { label: 'Active Projects', value: '452', bg: 'bg-zinc-900', text: 'text-zinc-900', icon: Briefcase, colorStyle: 'from-zinc-900/10 to-transparent border-zinc-900/20' },
    { label: 'Platform Revenue', value: '$84,200', bg: 'bg-white', text: 'text-zinc-900', icon: DollarSign, colorStyle: 'from-zinc-100/10 to-transparent border-zinc-200/20' },
    { label: 'System Health', value: '99.9%', bg: 'bg-zinc-100', text: 'text-zinc-600', icon: Zap, colorStyle: 'from-zinc-100/10 to-transparent border-zinc-200/20' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-black font-display tracking-tight text-zinc-900 mb-1">System Overview 🛡️</h1>
        <p className="text-zinc-500">Monitor platform health, user activity, and financial performance.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {kpis.map((stat) => <StatCard key={stat.label} label={stat.label} value={stat.value} bg={stat.bg} text={stat.text} icon={stat.icon} colorStyle={stat.colorStyle} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[32px] border border-zinc-200/50 shadow-sm">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> User Growth
          </h2>
          <div className="h-64 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 font-medium italic border border-zinc-100">
            [User growth chart placeholder]
          </div>
        </div>
        <div className="bg-white p-8 rounded-[32px] border border-zinc-200/50 shadow-sm">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" /> Revenue Analytics
          </h2>
          <div className="h-64 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 font-medium italic border border-zinc-100">
            [Revenue analytics placeholder]
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ projects, user, role, favourites = [], freelancers = [], setActiveTab, onAddProject, onOpenNotes, onProfileClick }: { projects: any[], user: any, role: 'freelancer' | 'client' | 'admin', favourites?: Array<string | number>, freelancers?: any[], setActiveTab?: (v: string) => void, onAddProject?: (p: any) => void, onOpenNotes?: (p: any) => void, onProfileClick?: (f: any) => void }) => {
  if (role === 'admin') return <AdminDashboard user={user} />;
  if (role === 'client') return <ClientDashboard user={user} projects={projects} favourites={favourites} freelancers={freelancers} setActiveTab={setActiveTab} onOpenNotes={onOpenNotes} onProfileClick={onProfileClick} />;
  return <FreelancerDashboard user={user} projects={projects} setActiveTab={setActiveTab} onOpenNotes={onOpenNotes} />;
};

const ProjectDetailModal = ({ project, onClose, onUpdate, onDelete, canEdit }: { project: any, onClose: () => void, onUpdate: (item: any) => void, onDelete: (id: number) => void, canEdit: boolean }) => {
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({
    title: project.title,
    category: project.category,
    year: project.year,
    description: project.description || project.desc || "",
    capabilities: Array.isArray(project.capabilities) ? project.capabilities.join(', ') : "",
    image: project.image
  });

  const handleSaveInline = () => {
    const updatedProject = { 
      ...project, 
      ...editForm,
      capabilities: editForm.capabilities.split(',').map((s: string) => s.trim()).filter(Boolean)
    };
    onUpdate(updatedProject);
    setIsInlineEditing(false);
  };

  const handleDeleteProject = () => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      onDelete(project.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 40 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 40 }} 
        className="relative w-full max-w-5xl bg-white rounded-[40px] overflow-hidden shadow-2xl z-[101] border border-zinc-100 max-h-[90vh]"
      >
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 p-3 bg-zinc-50 hover:bg-zinc-100 rounded-full text-zinc-900 transition-all z-20 border border-zinc-100"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">
          <div className="bg-zinc-100 relative overflow-hidden group/modal-img">
            <img 
              src={project.image} 
              alt={project.title} 
              className="w-full h-full object-cover transition-transform duration-1000 group-hover/modal-img:scale-105" 
            />
            <div className="absolute inset-0 bg-zinc-900/5 group-hover/modal-img:opacity-0 transition-opacity" />
            <div className="absolute bottom-8 left-8 flex gap-2">
              <span className="px-4 py-2 bg-white/90 backdrop-blur-md rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-900 border border-white/20">
                {project.category}
              </span>
              <span className="px-4 py-2 bg-white/90 backdrop-blur-md rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-900 border border-white/20">
                {project.year || "2024"}
              </span>
            </div>
          </div>
          
          <div className="p-12 md:p-16 flex flex-col bg-white overflow-y-auto max-h-[90vh]">
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-4">Project Overview</span>
            {isInlineEditing ? (
              <input 
                className="text-4xl font-bold text-zinc-900 tracking-tight mb-8 leading-tight uppercase font-display bg-zinc-50 border border-zinc-100 rounded-2xl px-6 py-4 w-full focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            ) : (
              <h2 className="text-4xl font-bold text-zinc-900 tracking-tight mb-8 leading-tight uppercase font-display">
                {project.title}
              </h2>
            )}
            
            <div className="space-y-8">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Description</h4>
                {isInlineEditing ? (
                  <textarea 
                    rows={4}
                    className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium resize-none text-base text-zinc-600"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  />
                ) : (
                  <p className="text-base text-zinc-500 leading-relaxed font-medium break-words max-w-full">
                    {project.description || project.desc || "A deep dive into creative problem solving and technical implementation. This project showcases the intersection of design precision and functional excellence."}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-8 py-8 border-y border-zinc-100">
                 <div className="space-y-2">
                   <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Domain</h4>
                   {isInlineEditing ? (
                     <input 
                       className="w-full px-4 py-2 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/10 text-sm font-bold text-zinc-900 uppercase"
                       value={editForm.category}
                       onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                     />
                   ) : (
                     <p className="text-sm font-bold text-zinc-900 uppercase tracking-tight">{project.category}</p>
                   )}
                 </div>
                 <div className="space-y-2">
                   <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Released</h4>
                   {isInlineEditing ? (
                     <input 
                       className="w-full px-4 py-2 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/10 text-sm font-bold text-zinc-900 uppercase"
                       value={editForm.year}
                       onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                     />
                   ) : (
                     <p className="text-sm font-bold text-zinc-900 uppercase tracking-tight">{project.year || "2024"}</p>
                   )}
                 </div>
              </div>

              <div className="space-y-6 pt-4">
                <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Tech Stack {isInlineEditing ? '(comma separated)' : ''}</h4>
                {isInlineEditing ? (
                  <input 
                    className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium text-sm text-zinc-600"
                    value={editForm.capabilities}
                    onChange={(e) => setEditForm({ ...editForm, capabilities: e.target.value })}
                    placeholder="e.g. Strategy, Development, Performance"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2.5">
                    {(project.capabilities || ['Strategy', 'Development', 'Performance', 'Interface']).map((s: string) => (
                      <span key={s} className="px-5 py-2.5 bg-zinc-50 border border-zinc-100 rounded-2xl text-[10px] font-black text-zinc-600 uppercase tracking-widest">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-14 flex items-center gap-4">
              {isInlineEditing ? (
                <>
                  <button 
                    onClick={handleSaveInline}
                    className="flex-1 py-5 bg-zinc-900 text-white rounded-[20px] font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/10"
                  >
                    Save Changes <Check className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setIsInlineEditing(false)}
                    className="flex-1 py-5 bg-zinc-50 text-zinc-900 border border-zinc-100 rounded-[20px] font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-zinc-100 transition-all"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                   {canEdit && (
                     <button 
                       onClick={() => setIsInlineEditing(true)}
                       className="flex-1 py-5 bg-zinc-900 text-white rounded-[20px] font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/10"
                     >
                       Edit Project <BarChart3 className="w-4 h-4" />
                     </button>
                   )}
                   <button className="flex-1 py-5 bg-zinc-50 text-zinc-900 border border-zinc-100 rounded-[20px] font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-zinc-100 transition-all">
                     <Share2 className="w-4 h-4" />
                   </button>
                   {canEdit && (
                     <button 
                       onClick={handleDeleteProject}
                       className="w-16 h-16 flex items-center justify-center bg-red-50 text-red-500 rounded-[20px] hover:bg-red-100 transition-all group"
                     >
                       <Trash2 className="w-5 h-5 transition-transform group-hover:scale-110" />
                     </button>
                   )}
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const PortfolioPage = ({ items, onOpenAddModal, onDeleteItem, onUpdateItem }: { items: any[], onOpenAddModal: () => void, onDeleteItem: (id: number) => void, onUpdateItem: (item: any) => void }) => {
  const [selectedProject, setSelectedProject] = useState<any>(null);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <AnimatePresence>
        {selectedProject && (
          <ProjectDetailModal 
            project={selectedProject} 
            onClose={() => setSelectedProject(null)} 
            onUpdate={onUpdateItem} 
            onDelete={onDeleteItem} 
            canEdit={true} 
          />
        )}
      </AnimatePresence>

      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black font-display tracking-tight text-zinc-900 mb-1">My Portfolio</h1>
          <p className="text-zinc-500">Showcase your best work to attract premium clients.</p>
        </div>
        <button 
          onClick={onOpenAddModal}
          className="bg-zinc-900 text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/10"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item, i) => (
          <motion.div 
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group bg-white rounded-[32px] overflow-hidden border border-zinc-200/50 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 cursor-pointer"
            onClick={() => setSelectedProject(item)}
          >
            <div className="h-48 bg-zinc-100 relative overflow-hidden">
              <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                <div className="text-white font-bold flex items-center gap-2 text-sm">
                  View Project <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
            <div className="p-6 relative group/card-info">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteItem(item.id);
                }}
                className="absolute top-6 right-6 p-2 bg-red-50 border border-red-100 rounded-xl text-red-500 hover:bg-red-100 transition-all z-10"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <h3 className="font-bold text-lg text-zinc-900 mb-2">{item.title}</h3>
              <p className="text-sm text-zinc-500 line-clamp-2 mb-4">{item.description}</p>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-zinc-100 rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-600">{item.category}</span>
                <span className="px-3 py-1 bg-zinc-100 rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-600">{item.year}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const AddPortfolioModal = ({ isOpen, onClose, onAdd, initialData }: { isOpen: boolean, onClose: () => void, onAdd: (item: any) => void, initialData?: any }) => {
  const [formData, setFormData] = useState({
    title: '',
    category: 'UI/UX',
    year: '2024',
    description: '',
    capabilities: '',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop'
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        category: initialData.category || 'UI/UX',
        year: initialData.year || '2024',
        description: initialData.description || initialData.desc || '',
        capabilities: Array.isArray(initialData.capabilities) ? initialData.capabilities.join(', ') : '',
        image: initialData.image || ''
      });
    } else {
      setFormData({
        title: '',
        category: 'UI/UX',
        year: '2024',
        description: '',
        capabilities: '',
        image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop'
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        className="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden border border-zinc-100 p-10"
      >
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-black font-display text-zinc-900 uppercase">
              {initialData ? 'Edit Project' : 'Add Project'}
            </h2>
            <p className="text-zinc-500 mt-1">
              {initialData ? 'Update your showcased work.' : 'Showcase your latest work.'}
            </p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-zinc-100 rounded-2xl transition-colors text-zinc-400">
            <X className="w-7 h-7" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Title</label>
              <input 
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Project Name"
                className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
              />
            </div>
            <div className="space-y-2.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Category</label>
              <input 
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g. Branding, UI/UX"
                className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Image URL</label>
            <input 
              type="text"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
            />
          </div>

          <div className="space-y-2.5">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Description</label>
            <textarea 
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the project..."
              className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium resize-none"
            />
          </div>

          <div className="space-y-2.5">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Tech Stack (comma separated)</label>
            <input 
              type="text"
              value={formData.capabilities}
              onChange={(e) => setFormData({ ...formData, capabilities: e.target.value })}
              placeholder="e.g. Strategy, Development, Interface"
              className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium"
            />
          </div>

          <div className="pt-6 flex gap-4">
            <button 
              onClick={onClose}
              className="flex-1 py-5 px-8 rounded-2xl font-black text-xs uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                const finalData = { 
                  ...formData, 
                  capabilities: formData.capabilities.split(',').map(s => s.trim()).filter(Boolean)
                };
                onAdd(initialData ? { ...initialData, ...finalData } : { ...finalData, id: Date.now() });
                onClose();
              }}
              className="flex-[2] py-5 px-8 bg-zinc-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-zinc-900/10 hover:bg-zinc-800 transition-all"
            >
              {initialData ? 'Update Project' : 'Add Project'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const NotificationsPage = () => (
  <div className="max-w-4xl mx-auto space-y-8">
    <div>
      <h1 className="text-3xl font-black font-display tracking-tight text-zinc-900 mb-1">Notifications</h1>
      <p className="text-zinc-500">Stay updated on your project activity and system alerts.</p>
    </div>
    <div className="bg-white rounded-[32px] border border-zinc-200/50 shadow-sm overflow-hidden">
      {[
        { title: 'New Project Invitation', desc: 'Google Design Team invited you to "Stripe Checkout Redesign"', time: '2h ago', icon: Zap, color: 'text-primary bg-primary/10' },
        { title: 'Payment Received', desc: 'Your payment of $8,500 for "Vercel Connect" has been processed.', time: '5h ago', icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50' },
        { title: 'Contract Updated', desc: 'Alex Morgan updated the milestones for "Fintech Dashboard".', time: '1d ago', icon: Clock, color: 'text-blue-500 bg-blue-50' },
      ].map((n, i) => (
        <div key={i} className={`p-6 flex gap-4 hover:bg-zinc-50 transition-colors cursor-pointer ${i !== 2 ? 'border-b border-zinc-100' : ''}`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${n.color}`}>
            <n.icon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-bold text-zinc-900">{n.title}</h3>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{n.time}</span>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed">{n.desc}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const UserManagementPage = () => (
  <div className="space-y-8 max-w-7xl mx-auto">
    <div className="flex justify-between items-end">
      <div>
        <h1 className="text-3xl font-black font-display tracking-tight text-zinc-900 mb-1">User Management</h1>
        <p className="text-zinc-500">Monitor, verify, and manage platform users.</p>
      </div>
      <div className="flex gap-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input type="text" placeholder="Search users..." className="pl-11 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl text-sm outline-none focus:border-primary transition-all shadow-sm" />
        </div>
        <button className="bg-zinc-900 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/10">Export Data</button>
      </div>
    </div>
    <div className="bg-white rounded-[32px] border border-zinc-200/50 shadow-sm overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead className="bg-zinc-50/50">
          <tr>
            <th className="px-8 py-5 text-xs font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100">User</th>
            <th className="px-8 py-5 text-xs font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100">Role</th>
            <th className="px-8 py-5 text-xs font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100">Status</th>
            <th className="px-8 py-5 text-xs font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {[
            { name: 'Jane Doe', role: 'Freelancer', status: 'Active', color: 'text-emerald-500 bg-emerald-50' },
            { name: 'Alex Morgan', role: 'Client', status: 'Active', color: 'text-emerald-500 bg-emerald-50' },
            { name: 'Mike Ross', role: 'Freelancer', status: 'Pending', color: 'text-amber-500 bg-amber-50' },
          ].map((u, i) => (
            <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
              <td className="px-8 py-5 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">{u.name.charAt(0)}</div>
                  <span className="font-bold text-zinc-900">{u.name}</span>
                </div>
              </td>
              <td className="px-8 py-5 border-b border-zinc-100 text-sm font-medium text-zinc-500">{u.role}</td>
              <td className="px-8 py-5 border-b border-zinc-100">
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${u.color}`}>{u.status}</span>
              </td>
              <td className="px-8 py-5 border-b border-zinc-100 text-right">
                <button className="text-zinc-400 hover:text-zinc-900 font-bold text-xs uppercase tracking-widest transition-colors">Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const ProjectMonitoringPage = () => (
  <div className="space-y-8 max-w-7xl mx-auto">
    <div className="flex justify-between items-end">
      <div>
        <h1 className="text-3xl font-black font-display tracking-tight text-zinc-900 mb-1">Project Monitoring</h1>
        <p className="text-zinc-500">Oversight of all active contracts and system escalations.</p>
      </div>
      <div className="flex gap-4">
        <select className="px-4 py-3 bg-white border border-zinc-200 rounded-2xl text-sm outline-none shadow-sm font-bold text-zinc-500">
          <option>All Status</option>
          <option>Active</option>
          <option>Disputed</option>
        </select>
      </div>
    </div>
    <div className="grid grid-cols-1 gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white p-6 rounded-[32px] border border-zinc-200/50 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-blue-50 rounded-[20px] flex items-center justify-center border border-blue-100">
              <Briefcase className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h3 className="font-black text-lg text-zinc-900 mb-1">Enterprise Dashboard Redesign {i}</h3>
              <p className="text-sm text-zinc-500 flex items-center gap-2">
                <span className="font-bold text-zinc-900">Google Inc.</span> • Updated 2 hours ago
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest">In Progress</span>
            <div className="text-right">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Budget</p>
              <p className="font-black text-zinc-900 text-lg">$24,500</p>
            </div>
            <button className="p-3 bg-zinc-100 rounded-xl hover:bg-zinc-200 transition-colors">
              <ChevronRight className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ReportsPage = () => (
  <div className="space-y-8 max-w-7xl mx-auto">
    <div>
      <h1 className="text-3xl font-black font-display tracking-tight text-zinc-900 mb-1">Reports & Analytics</h1>
      <p className="text-zinc-500">Deep dive into platform performance and user trends.</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[
        { title: 'Revenue Growth', val: '+24%', desc: 'Compared to last month', icon: Zap, color: 'text-primary bg-primary/10' },
        { title: 'User Retention', val: '88%', desc: 'Rolling 30-day average', icon: Users, color: 'text-violet-500 bg-violet-50' },
        { title: 'Ticket Resolution', val: '4.2h', desc: 'Average response time', icon: Clock, color: 'text-emerald-500 bg-emerald-50' },
      ].map((r, i) => (
        <div key={i} className="bg-white p-8 rounded-[32px] border border-zinc-200/50 shadow-sm flex flex-col justify-between group cursor-pointer hover:shadow-xl transition-all duration-500">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-10 ${r.color} group-hover:scale-110 transition-transform`}>
            <r.icon className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] mb-2">{r.title}</p>
            <p className="text-5xl font-black font-display text-zinc-900 mb-2">{r.val}</p>
            <p className="text-sm text-zinc-500 font-medium">{r.desc}</p>
          </div>
        </div>
      ))}
    </div>
    <div className="bg-white p-8 rounded-[40px] border border-zinc-200/50 shadow-sm h-96 flex flex-col items-center justify-center text-center">
      <div className="w-20 h-20 bg-zinc-50 rounded-[28px] flex items-center justify-center mb-6 border border-zinc-100">
        <DollarSign className="w-10 h-10 text-zinc-200" />
      </div>
      <h3 className="text-xl font-bold text-zinc-900 mb-2">Detailed Financial Breakdown</h3>
      <p className="text-sm text-zinc-500 max-w-sm">Select a date range to generate a comprehensive report of all platform transactions and overhead.</p>
      <button className="mt-8 px-8 py-3 bg-zinc-900 text-white rounded-2xl font-bold text-sm hover:scale-105 transition-all shadow-xl shadow-zinc-900/20">Generate Report</button>
    </div>
  </div>
);



const ProjectsPage = ({ projects, onAddProject, onUpdateProject, onSendMessage, onOpenNotes }: { projects: Project[], onAddProject?: (p: any) => void, onUpdateProject?: (p: any) => void, onSendMessage: (clientName: string) => void, onOpenNotes?: (p: Project) => void }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newStatus, setNewStatus] = useState<Project['status']>('pending');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'in_progress' | 'completed' | 'pending'>('all');
  


  const openNewProject = () => {
    setEditingProject(null);
    setNewBudget('');
    setNewStartDate(new Date().toISOString().split('T')[0]);
    setNewDeadline('');
    setNewStatus('pending');
    setIsModalOpen(true);
  };

  const openEditProject = (p: Project) => {
    setEditingProject(p);
    setNewBudget(p.budget.toString());
    setNewStartDate(p.start_date || '');
    setNewDeadline(p.deadline || '');
    setNewStatus(p.status);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingProject) {
      onUpdateProject?.({
        ...editingProject,
        status: newStatus,
        deadline: newDeadline,
      });
    } else {
      if (!newTitle || !newClient || !newBudget || !newStartDate || !newDeadline) return;
      onAddProject?.({
        id: `p${Date.now()}`,
        title: newTitle,
        client_name: newClient,
        budget: newBudget.startsWith('$') ? newBudget.slice(1) : newBudget,
        status: 'pending',
        start_date: newStartDate,
        deadline: newDeadline,
        progress: 0
      });
    }

    setIsModalOpen(false);
    setEditingProject(null);
    setNewTitle('');
    setNewClient('');
    setNewBudget('');
    setNewStartDate('');
    setNewDeadline('');
  };

  const calculateDaysRemaining = (deadline: string) => {
    if (!deadline) return null;
    const end = new Date(deadline);
    const now = new Date();
    
    // Set both to start of day for accurate comparison
    end.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    const diff = end.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const getUrgencyColor = (days: number | null) => {
    if (days === null) return 'text-zinc-400';
    if (days < 0) return 'text-red-500';
    if (days <= 2) return 'text-amber-500';
    if (days <= 7) return 'text-primary';
    return 'text-zinc-500';
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'all' || p.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto relative pb-20">
      {/* Header & New Project Button */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black font-display tracking-tight text-zinc-900 mb-2">My Projects</h1>
          <p className="text-zinc-500 font-medium">Manage your elite portfolio and track real-time progress.</p>
        </div>
        <button 
          onClick={openNewProject}
          className="bg-primary text-white px-8 py-4 rounded-[20px] text-sm font-black flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 active:scale-95 group uppercase tracking-wider"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" /> NEW PROJECT
        </button>
      </div>

      {/* Control Bar: Search & Filter */}
      <div className="flex flex-col lg:flex-row gap-6 items-center justify-between py-2 mb-8">
        <div className="flex p-1.5 bg-zinc-100/80 backdrop-blur-md rounded-2xl w-full lg:w-auto overflow-x-auto no-scrollbar border border-zinc-200/40 shadow-inner">
          {(['all', 'in_progress', 'completed', 'pending'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeFilter === tab 
                ? 'bg-white text-zinc-900 shadow-lg shadow-zinc-200/50 ring-1 ring-zinc-200/40' 
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-white/50'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:max-w-md group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search projects or clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-6 py-3.5 bg-white border border-zinc-200/60 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all font-medium text-sm shadow-sm"
          />
        </div>
      </div>

      {/* Project List */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project, i) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                key={project.id}
                className="group relative bg-white/60 hover:bg-white backdrop-blur-md p-4 pl-6 pr-4 rounded-[24px] border border-zinc-200/50 shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all cursor-default"
              >
                {/* Visual Accent Glow */}
                <div className="absolute inset-0 rounded-[24px] border-2 border-primary/0 group-hover:border-primary/10 transition-all pointer-events-none" />

                <div className="flex flex-col lg:flex-row lg:items-center gap-6 relative z-10">
                  {/* Left: Icon & Info */}
                  <div className="flex items-center gap-5 min-w-[240px]">
                    <div className="w-12 h-12 bg-zinc-50 border border-zinc-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary/5 group-hover:scale-105 group-hover:rotate-3 transition-all duration-500">
                      <Briefcase className="w-5 h-5 text-zinc-900 group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 leading-tight group-hover:text-primary transition-colors">{project.title}</h3>
                      <div className="flex items-center gap-2 mt-1.5 focus:outline-none">
                        <span className="text-sm font-semibold text-zinc-500">{project.client_name}</span>
                        <span className="w-1 h-1 rounded-full bg-zinc-300" />
                        <span className="text-[10px] font-black tracking-widest uppercase text-zinc-400">
                          {new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 max-w-[280px] flex flex-col items-center justify-center text-center">
                    {(() => {
                      const daysLeft = calculateDaysRemaining(project.deadline);
                      const urgencyClass = getUrgencyColor(daysLeft);
                      
                      return (
                        <div className="flex flex-col items-center translate-x-20">
                          <div className="flex items-baseline gap-2">
                            <span className={`text-2xl font-black font-display tracking-tight ${urgencyClass}`}>
                              {daysLeft !== null ? Math.abs(daysLeft) : '--'}
                            </span>
                            <span className="text-[11px] font-black uppercase tracking-[0.1em] text-zinc-400">
                              {daysLeft === 1 || daysLeft === -1 ? 'Day' : 'Days'} Remaining
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Right: Status, Budget & Actions */}
                  <div className="flex items-center justify-end gap-6 ml-auto">
                    <div className="flex items-center gap-2">
                      <div className={`px-4 py-2 rounded-xl border font-black text-[9px] uppercase tracking-widest transition-all ${
                        project.status === 'completed' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                        project.status === 'in_progress' ? 'bg-primary/5 border-primary/10 text-primary' :
                        'bg-zinc-50 border-zinc-100 text-zinc-500'
                      }`}>
                        {project.status.replace('_', ' ')}
                      </div>
                      
                      <div className="text-right min-w-[80px]">
                        <p className="text-xl font-black text-zinc-900 tracking-tight">${project.budget}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 relative z-20">
                      <button 
                        onClick={() => onOpenNotes?.(project)}
                        className="p-2.5 bg-primary/10 hover:bg-primary border border-primary/20 hover:border-primary text-primary hover:text-white rounded-xl transition-all duration-300 shadow-sm"
                        title="Project Notes"
                      >
                        <StickyNote className="w-4.5 h-4.5" />
                      </button>
                      <button 
                        onClick={() => openEditProject(project)}
                        className="p-2.5 bg-primary/10 hover:bg-primary border border-primary/20 hover:border-primary text-primary hover:text-white rounded-xl transition-all duration-300 shadow-sm"
                        title="Edit Project"
                      >
                        <Edit2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white/40 backdrop-blur-md rounded-[48px] border border-zinc-200/50 p-24 text-center flex flex-col items-center justify-center border-dashed"
        >
          <div className="w-24 h-24 bg-zinc-50 rounded-3xl flex items-center justify-center mb-8 border border-zinc-100 shadow-inner group-hover:scale-110 transition-transform">
            <Filter className="w-10 h-10 text-zinc-300" />
          </div>
          <h3 className="text-3xl font-black font-display text-zinc-900 mb-4">No results found</h3>
          <p className="text-zinc-500 mb-10 max-w-sm text-lg leading-relaxed">Adjust your filters or search keywords to find what you're looking for.</p>
          <button 
            onClick={() => {setSearchQuery(''); setActiveFilter('all');}}
            className="px-10 py-4 bg-zinc-900 text-white rounded-[20px] font-bold hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/10"
          >
            Clear all filters
          </button>
        </motion.div>
      )}

      {/* New Project Modal (Re-using the same premium logic) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden border border-zinc-100"
            >
              <div className="p-10">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h2 className="text-3xl font-black font-display text-zinc-900 uppercase">{editingProject ? 'EDIT PROJECT' : 'NEW PROJECT'}</h2>
                    <p className="text-zinc-500 mt-1">{editingProject ? 'Modify existing project parameters.' : 'Create a new project entry.'}</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-zinc-100 rounded-2xl transition-colors text-zinc-400">
                    <X className="w-7 h-7" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 gap-6">
                    {!editingProject ? (
                      <>
                        <div className="space-y-2.5">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">PROJECT NAME</label>
                          <input 
                            type="text" 
                            required
                            placeholder="e.g. NextGen Ecosystem Design" 
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            className="w-full px-6 py-4.5 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40 focus:bg-white transition-all font-bold text-zinc-900 placeholder:text-zinc-300"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2.5">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">CLIENT NAME</label>
                            <input 
                              type="text" 
                              required
                              placeholder="Acme Elite" 
                              value={newClient}
                              onChange={(e) => setNewClient(e.target.value)}
                              className="w-full px-6 py-4.5 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40 focus:bg-white transition-all font-bold text-zinc-900 placeholder:text-zinc-300"
                            />
                          </div>
                          <div className="space-y-2.5">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">ALLOCATION ($)</label>
                            <input 
                              type="text" 
                              required
                              placeholder="Budget Size" 
                              value={newBudget}
                              onChange={(e) => setNewBudget(e.target.value)}
                              className="w-full px-6 py-4.5 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40 focus:bg-white transition-all font-bold text-zinc-900 placeholder:text-zinc-300"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2.5">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">START DATE</label>
                            <input 
                              type="date" 
                              required
                              value={newStartDate}
                              onChange={(e) => setNewStartDate(e.target.value)}
                              className="w-full px-6 py-4.5 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40 focus:bg-white transition-all font-bold text-zinc-900"
                            />
                          </div>
                          <div className="space-y-2.5">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">DEADLINE</label>
                            <input 
                              type="date" 
                              required
                              value={newDeadline}
                              onChange={(e) => setNewDeadline(e.target.value)}
                              className="w-full px-6 py-4.5 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40 focus:bg-white transition-all font-bold text-zinc-900"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">PROJECT STATUS</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {(['in_progress', 'overdue', 'on_hold', 'completed', 'canceled'] as const).map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => setNewStatus(status)}
                                className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                  newStatus === status 
                                  ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                                  : 'bg-zinc-50 border-zinc-100 text-zinc-500 hover:border-zinc-300'
                                }`}
                              >
                                {status.replace('_', ' ')}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2.5">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">ADJUST DEADLINE</label>
                          <input 
                            type="date" 
                            required
                            value={newDeadline}
                            onChange={(e) => setNewDeadline(e.target.value)}
                            className="w-full px-6 py-4.5 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40 focus:bg-white transition-all font-bold text-zinc-900"
                          />
                        </div>

                        <div className="pt-2">
                          <button 
                            type="button"
                            onClick={() => {
                              setIsModalOpen(false);
                              onSendMessage(editingProject.client_name || '');
                            }}
                            className="w-full py-4.5 bg-zinc-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/10 group"
                          >
                            <Mail className="w-4 h-4 group-hover:scale-110 transition-transform" /> SEND MESSAGE TO CLIENT
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="pt-6 flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 py-5 px-8 rounded-2xl font-black text-xs uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 transition-all"
                    >
                      DISMISS
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-5 px-8 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all hover:-translate-y-1 active:translate-y-0"
                    >
                      {editingProject ? 'UPDATE & DONE' : 'AUTHENTICATE & DONE'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ClientsPage = ({ clients }: { clients: ClientRecord[] }) => {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black font-display tracking-tight text-zinc-900 mb-2">Client Directory</h1>
          <p className="text-zinc-500">Manage your valuable client relationships and contacts.</p>
        </div>
      </div>

      {clients.length > 0 ? (
        <div className="bg-white rounded-[24px] border border-zinc-200/50 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-200/50">
                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Client Name</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Enterprise</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest hidden md:table-cell">Contact Email</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {clients.map((client, i) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={client.id} 
                  className="hover:bg-zinc-50 transition-colors group"
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                        {client.name.charAt(0)}
                      </div>
                      <div className="font-bold text-zinc-900">{client.name}</div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-sm font-medium text-zinc-600 bg-zinc-100 inline-flex px-3 py-1 rounded-md">{client.company}</div>
                  </td>
                  <td className="px-8 py-5 hidden md:table-cell">
                    <div className="text-sm text-zinc-500 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-zinc-400" /> {client.email}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors">
                      <Settings className="w-4 h-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-[32px] border border-zinc-200/50 shadow-sm p-16 text-center flex flex-col items-center justify-center mt-8">
          <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6 border border-zinc-100 shadow-inner">
            <Users className="w-8 h-8 text-zinc-300" />
          </div>
          <h3 className="text-2xl font-black font-display text-zinc-900 mb-2">Your network is empty</h3>
          <p className="text-zinc-500 mb-8 max-w-md md:text-lg">Keep track of the amazing clients you work with. Once you complete a project, they'll appear here automatically.</p>
          <button className="px-8 py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/20 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 mx-auto">
            <UserCircle className="w-5 h-5" /> Import Contacts
          </button>
        </div>
      )}
    </div>
  );
};

const ProfilePage = ({ 
  user, 
  isOwnProfile = true, 
  onBack, 
  onSendProposal, 
  favourites = [], 
  onToggleFavourite, 
  onUpdateProfile, 
  onAvatarUpload,
  onAvatarDelete,
  onNavigateToPortfolio, 
  portfolioItems, 
  onUpdateItem, 
  onDeleteItem 
}: { 
  user: User | null, 
  isOwnProfile?: boolean, 
  onBack?: () => void, 
  onSendProposal?: (brief: string) => void, 
  favourites?: number[], 
  onToggleFavourite?: (id: number) => void, 
  onUpdateProfile?: (user: User) => void, 
  onAvatarUpload?: (file: File) => Promise<void>,
  onAvatarDelete?: () => Promise<void>,
  onNavigateToPortfolio?: () => void, 
  portfolioItems?: any[], 
  onUpdateItem?: (item: any) => void, 
  onDeleteItem?: (id: number) => void 
}) => {
  const [activeProfileTab, setActiveProfileTab] = useState<'Overview' | 'Portfolio' | 'Reviews' | 'Experience'>('Overview');
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [isHireModalOpen, setIsHireModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [projectBrief, setProjectBrief] = useState('');
  const [tempExperience, setTempExperience] = useState<any[]>([]);
  const [bioValue, setBioValue] = useState(user?.profile?.bio || '');
  const { isListening, transcript, startListening, stopListening, supported } = useSpeechToText();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAvatarUpload) {
      await onAvatarUpload(file);
    }
  };

  useEffect(() => {
    if (transcript) {
      setBioValue(prev => prev ? prev + ' ' + transcript : transcript);
    }
  }, [transcript]);

  useEffect(() => {
    if (isEditModalOpen && (user?.profile as any)?.experience) {
      setTempExperience(JSON.parse((user.profile as any).experience));
    }
  }, [isEditModalOpen]);

  const handleAddExperience = () => {
    const newExp = {
      id: Date.now(),
      role: 'New Role',
      company: 'Company Name',
      period: 'Start - End',
      desc: 'Description of your responsibilities.'
    };
    setTempExperience([...tempExperience, newExp]);
  };

  const handleRemoveExperience = (id: number) => {
    setTempExperience(tempExperience.filter(e => e.id !== id));
  };

  if (!user) return null;
  const skills = JSON.parse((user.profile as any)?.skills || '[]');

  const portfolio = portfolioItems ? portfolioItems.map(item => ({
    ...item,
    image: item.image || item.image_url,
    desc: item.desc || item.description, // Map description to desc for ProfilePage compatibility
  })) : [];

  const experience = JSON.parse((user.profile as any)?.experience || '[]');

  const reviews = [
    { id: 1, author: 'Mark Zuckerberg', company: 'Meta', text: "Incredible attention to detail. One of the best designers we've worked with on external contracts.", rating: 5, date: '2 months ago' }
  ];

  const stats = user.role === 'client' ? [
    { label: 'Total Investment', value: (user.profile as ClientProfile)?.total_investment || '$0', icon: DollarSign, color: 'text-zinc-900' },
    { label: 'Projects Posted', value: (user.profile as ClientProfile)?.projects_posted || '0', icon: Briefcase, color: 'text-zinc-400' },
    { label: 'Network Rating', value: (user.profile as ClientProfile)?.network_rating || 'N/A', icon: Star, color: 'text-zinc-900', badge: true }
  ] : [
    { label: 'Years Exp.', value: (user.profile as FreelancerProfile)?.years_exp || '0', icon: Clock, color: 'text-zinc-400' },
    { label: 'Projects', value: (user.profile as FreelancerProfile)?.projects_count || '0', icon: Briefcase, color: 'text-zinc-400' },
    { label: 'Top Rated', value: (user.profile as FreelancerProfile)?.rating_status || 'Professional', icon: Star, color: 'text-zinc-900', badge: true }
  ];

  return (
    <div className="max-w-7xl mx-auto pb-32 relative font-sans selection:bg-primary/20 overflow-x-hidden">
      <AnimatePresence>
        {selectedProject && (
          <ProjectDetailModal 
            project={selectedProject} 
            onClose={() => setSelectedProject(null)} 
            onUpdate={onUpdateItem || (() => {})} 
            onDelete={onDeleteItem || (() => {})} 
            canEdit={isOwnProfile} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isHireModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsHireModalOpen(false)} 
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative w-full max-w-2xl bg-white rounded-[40px] overflow-hidden shadow-2xl z-[101] border border-zinc-100 p-12"
            >
              <button 
                onClick={() => setIsHireModalOpen(false)}
                className="absolute top-8 right-8 p-3 bg-zinc-50 hover:bg-zinc-100 rounded-full text-zinc-900 transition-all z-10 border border-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">Hire {user.name}</h2>
              <p className="text-zinc-500 mb-8">Send a project proposal to start working together.</p>

              <div className="space-y-6">
                <div>
                   <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Project Type</label>
                   <select className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-zinc-400 transition-colors appearance-none">
                       <option>Hourly Contract (${(user.profile as any)?.hourly_rate || 50}/hr)</option>
                       <option>Fixed Price Project</option>
                   </select>
                </div>
                <div>
                   <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Project Brief & Files</label>
                   <textarea value={projectBrief} onChange={(e) => setProjectBrief(e.target.value)} rows={4} placeholder="Describe your project, timeline, and goals..." className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-zinc-400 transition-colors resize-none mb-3"></textarea>
                   <label className="cursor-pointer inline-flex items-center gap-3 px-4 py-2 bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl text-xs font-bold text-zinc-700 hover:text-zinc-900 transition-all shadow-sm w-full md:w-auto group">
                     <span className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-center group-hover:bg-zinc-100 transition-colors">
                       <Plus className="w-4 h-4" />
                     </span>
                     Browse Files to Attach
                     <input type="file" className="hidden" multiple />
                   </label>
                </div>
                <div>
                   <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Estimated Budget (USD)</label>
                   <input type="number" placeholder="e.g. 5000" className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-zinc-400 transition-colors" />
                </div>
                <button onClick={() => {
                   setIsHireModalOpen(false);
                   if (onSendProposal) onSendProposal(projectBrief);
                }} className="w-full py-5 bg-[#22819A] text-white rounded-[20px] font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[#1b6a7f] transition-all shadow-xl shadow-[#22819A]/20 mt-4">
                   Send Proposal <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsEditModalOpen(false)} 
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative w-full max-w-2xl bg-white rounded-[40px] overflow-hidden shadow-2xl z-[101] border border-zinc-100 p-12"
            >
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="absolute top-8 right-8 p-3 bg-zinc-50 hover:bg-zinc-100 rounded-full text-zinc-900 transition-all z-10 border border-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">Edit Profile</h2>
              <p className="text-zinc-500 mb-8">Update your professional information for the world to see.</p>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                
                // Collect experience from dynamic inputs
                const updatedExp = tempExperience.map((exp: any) => ({
                  ...exp,
                  role: formData.get(`exp_role_${exp.id}`) as string,
                  company: formData.get(`exp_company_${exp.id}`) as string,
                  period: formData.get(`exp_period_${exp.id}`) as string,
                  desc: formData.get(`exp_desc_${exp.id}`) as string,
                }));

                const updatedUser = {
                  ...user,
                  name: formData.get('name') as string,
                  profile: {
                    ...user.profile,
                    bio: formData.get('bio') as string,
                    hourly_rate: Number(formData.get('hourly_rate')),
                    designation: formData.get('designation') as string,
                    tagline: formData.get('tagline') as string,
                    skills: JSON.stringify((formData.get('skills') as string || '').split(',').map(s => s.trim())),
                    experience: JSON.stringify(updatedExp),
                    // New Stat Fields
                    years_exp: formData.get('years_exp') as string,
                    projects_count: formData.get('projects_count') as string,
                    rating_status: formData.get('rating_status') as string,
                    total_investment: formData.get('total_investment') as string,
                    projects_posted: formData.get('projects_posted') as string,
                    network_rating: formData.get('network_rating') as string,
                  }
                } as any;
                if (onUpdateProfile) onUpdateProfile(updatedUser);
                setIsEditModalOpen(false);
              }} className="space-y-8 max-h-[70vh] overflow-y-auto pr-4 custom-scrollbar">
                
                {/* Display Photo Section */}
                <div className="flex flex-col items-center gap-6 pb-4">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-[40px] overflow-hidden border-4 border-zinc-100 shadow-xl relative bg-zinc-50">
                      <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 w-10 h-10 bg-zinc-900 text-white rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleAvatarChange} 
                      accept="image/*" 
                      className="hidden" 
                    />
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Profile Photo</span>
                    <button 
                      type="button" 
                      onClick={onAvatarDelete}
                      className="text-[10px] font-bold text-rose-500 uppercase tracking-widest hover:underline flex items-center gap-2"
                    >
                      <Trash2 className="w-3 h-3" /> Remove current photo
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Display Name</label>
                    <input name="name" type="text" defaultValue={user.name} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-[#22819A] transition-colors" />
                  </div>
                  {user.role !== 'client' ? (
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Hourly Rate ($)</label>
                      <input name="hourly_rate" type="number" defaultValue={(user.profile as FreelancerProfile)?.hourly_rate} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-[#22819A] transition-colors" />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Profile Location</label>
                      <input name="location" type="text" defaultValue={(user.profile as ClientProfile)?.location} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-[#22819A] transition-colors" />
                    </div>
                  )}
                </div>

                {/* Profile Stats Section */}
                <div className="pt-4 space-y-6">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Profile Statistics</h3>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {user.role === 'freelancer' ? (
                        <>
                          <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Years Exp.</label>
                            <input name="years_exp" type="text" defaultValue={(user.profile as FreelancerProfile)?.years_exp || '15+'} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-[#22819A] transition-colors" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Projects</label>
                            <input name="projects_count" type="text" defaultValue={(user.profile as FreelancerProfile)?.projects_count || '100+'} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-[#22819A] transition-colors" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Top Rated Status</label>
                            <input name="rating_status" type="text" defaultValue={(user.profile as FreelancerProfile)?.rating_status || 'Professional'} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-[#22819A] transition-colors" />
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Total Invested</label>
                            <input name="total_investment" type="text" defaultValue={(user.profile as ClientProfile)?.total_investment || '$128K'} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-[#22819A] transition-colors" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Projects Posted</label>
                            <input name="projects_posted" type="text" defaultValue={(user.profile as ClientProfile)?.projects_posted || '14'} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-[#22819A] transition-colors" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Network Rating</label>
                            <input name="network_rating" type="text" defaultValue={(user.profile as ClientProfile)?.network_rating || '4.9/5.0'} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-[#22819A] transition-colors" />
                          </div>
                        </>
                      )}
                   </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">
                      {user.role === 'client' ? 'Bio' : 'Professional Bio'}
                    </label>
                    <div className="flex items-center gap-2">
                      {supported && (
                        <button
                          type="button"
                          onClick={isListening ? stopListening : startListening}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                            isListening 
                              ? 'bg-rose-500 text-white animate-pulse' 
                              : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                          }`}
                        >
                          <Mic className="w-3 h-3" />
                          {isListening ? 'Stop Recording' : 'Record Voice'}
                        </button>
                      )}
                    </div>
                  </div>
                  <textarea 
                    name="bio" 
                    rows={4} 
                    value={bioValue}
                    onChange={(e) => setBioValue(e.target.value)}
                    placeholder={user.role === 'client' ? 'Tell freelancers about your company and what you do...' : 'Write about your skills, experience, and what makes you unique...'} 
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-[#22819A] transition-colors resize-none"
                  ></textarea>
                  {isListening && (
                    <p className="text-[10px] text-primary font-bold animate-pulse">
                      Listening... Speak clearly to describe your experience.
                    </p>
                  )}
                </div>

                {user.role !== 'client' && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Skills (comma separated)</label>
                    <input name="skills" type="text" defaultValue={JSON.parse((user.profile as any)?.skills || '[]').join(', ')} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-[#22819A] transition-colors" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Designation</label>
                  <input name="designation" type="text" defaultValue={user.profile?.designation || (user.role === 'client' ? 'Enterprise Strategic Partner' : 'The Digital Atelier Featured Artist')} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-[#22819A] transition-colors" />
                </div>
                {user.role !== 'client' && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Short Tagline</label>
                    <input name="tagline" type="text" defaultValue={(user.profile as any)?.tagline || 'Crafting digital experiences that transcend the ordinary.'} className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-[#22819A] transition-colors" />
                  </div>
                )}

                {user.role !== 'client' && (
                  <div className="pt-4">
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Add Project</label>
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsEditModalOpen(false);
                        if (onNavigateToPortfolio) onNavigateToPortfolio();
                      }}
                      className="w-full flex items-center justify-between p-5 bg-zinc-50 border border-zinc-200 rounded-2xl hover:border-[#22819A] group transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-zinc-100 shadow-sm text-zinc-400 group-hover:text-[#22819A] group-hover:border-[#22819A]/30 transition-all">
                          <Plus className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-bold text-zinc-900 uppercase tracking-widest">Add Project to Portfolio</span>
                      </div>
                      <ArrowRight className="w-5 h-5 text-zinc-400 group-hover:text-[#22819A] group-hover:translate-x-1 transition-all" />
                    </button>
                  </div>
                )}

                {user.role !== 'client' && (
                  <div className="space-y-6 pt-4 border-t border-zinc-100">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest">Experience</label>
                      <button type="button" onClick={handleAddExperience} className="text-[10px] font-bold text-[#22819A] uppercase tracking-widest hover:underline">+ Add Experience</button>
                    </div>
                    <div className="space-y-10">
                      {tempExperience.map((exp: any) => (
                        <div key={exp.id} className="p-8 bg-zinc-50 rounded-[32px] border border-zinc-100 space-y-8 relative group">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Role</label>
                              <input name={`exp_role_${exp.id}`} type="text" defaultValue={exp.role} className="w-full bg-white border border-zinc-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-[#22819A] transition-all" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Company</label>
                              <input name={`exp_company_${exp.id}`} type="text" defaultValue={exp.company} className="w-full bg-white border border-zinc-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-[#22819A] transition-all" />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Period</label>
                              <input name={`exp_period_${exp.id}`} type="text" defaultValue={exp.period} placeholder="e.g. 2020 - Present" className="w-full bg-white border border-zinc-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-[#22819A] transition-all" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Description</label>
                              <textarea name={`exp_desc_${exp.id}`} rows={3} defaultValue={exp.desc} className="w-full bg-white border border-zinc-200 rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:border-[#22819A] transition-all resize-none"></textarea>
                            </div>
                          </div>
                          <div className="pt-2 flex justify-end">
                            <button 
                              type="button" 
                              onClick={() => handleRemoveExperience(exp.id)} 
                              className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-600 flex items-center gap-2 transition-all px-4 py-2 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-100"
                            >
                              <X className="w-3.5 h-3.5" /> Delete Experience
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="sticky bottom-0 bg-white pt-4 pb-2 border-t border-zinc-100">
                  <button type="submit" className="w-full py-5 bg-zinc-900 text-white rounded-[20px] font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/10">
                    Save Changes <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-8">
        {onBack && (
          <button 
            onClick={onBack}
            className="flex items-center gap-4 text-zinc-400 hover:text-zinc-900 transition-all group"
          >
            <div className="w-11 h-11 bg-white rounded-2xl border border-zinc-100 flex items-center justify-center group-hover:border-zinc-200 shadow-sm transition-all group-hover:-translate-x-1">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest">Back to Explore</span>
          </button>
        )}
        {!isOwnProfile && onToggleFavourite && (
          <button 
            onClick={() => onToggleFavourite(Number(user.id))}
            className="w-11 h-11 bg-white rounded-2xl border border-zinc-100 flex items-center justify-center shadow-sm transition-all hover:scale-105 active:scale-95 group/heart"
          >
             <Heart 
               className={`w-5 h-5 transition-colors ${favourites.includes(Number(user.id)) ? 'text-rose-500' : 'text-zinc-400 group-hover/heart:text-rose-500'}`} 
               fill={favourites.includes(Number(user.id)) ? "currentColor" : "none"}
             />
          </button>
        )}
        {isOwnProfile && (
          <button 
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-3 px-6 py-3 bg-zinc-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/10 active:scale-95"
          >
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </button>
        )}
      </div>

      {/* New Elena Vance Inspired Header */}
      <div className="bg-white rounded-[48px] p-8 md:p-16 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.03)] border border-zinc-100 mb-16 relative overflow-hidden">
        {/* Background Subtle Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-50/50 via-white to-white pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start gap-16">
          {/* Avatar Area */}
          <div className="relative shrink-0">
             <div className="w-64 h-64 rounded-[40px] overflow-hidden shadow-2xl relative border-[8px] border-white ring-1 ring-zinc-100">
                <img 
                  src={user.profileImage || user.avatar} 
                  alt={user.name} 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/10 to-transparent" />
             </div>
             <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-zinc-50">
               <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center">
                 <CheckCircle2 className="w-5 h-5 text-white" />
               </div>
             </div>
          </div>

          {/* Identity & Actions */}
          <div className="flex-1 space-y-10">
            <div className="space-y-4">
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.4em]">
                {user.profile?.designation || (user.role === 'client' ? 'Enterprise Strategic Partner' : 'WorkVault Verified Elite')}
              </p>
               <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold text-zinc-900 tracking-tighter leading-none break-words">{user.name}</h1>
               {user.role !== 'client' && (
                <p className="text-lg md:text-xl text-zinc-500 leading-tight tracking-tight">
                  {(user.profile as any)?.tagline || 'New WorkVault Member'}
                </p>
               )}
            </div>

            <div className="flex flex-wrap gap-12 border-t border-zinc-100 pt-10">
              {stats.map(s => (
                <div key={s.label} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    {s.badge && <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center"><Star className="w-4 h-4 text-blue-500 fill-blue-500" /></div>}
                    <p className="text-2xl font-bold text-zinc-900 tracking-tight">{s.value}</p>
                  </div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 pt-4">
               {!isOwnProfile && (
                 <button onClick={() => setIsHireModalOpen(true)} className="px-10 py-5 bg-[#22819A] text-white rounded-2xl font-bold text-sm tracking-tight hover:bg-[#1b6a7f] transition-all flex items-center gap-3 shadow-xl shadow-[#22819A]/20">
                   Hire Me <ArrowRight className="w-4 h-4" />
                 </button>
               )}
               <button 
                 onClick={() => { if (onToggleFavourite) onToggleFavourite(Number(user.id)) }} 
                 className="px-10 py-5 bg-zinc-50 border border-zinc-100 rounded-2xl font-bold text-sm tracking-tight text-zinc-600 hover:bg-zinc-100 transition-all flex items-center gap-3"
               >
                 <Heart className="w-4 h-4 text-rose-500" fill={favourites.includes(Number(user.id)) ? "currentColor" : "none"} /> 
                 {favourites.includes(Number(user.id)) ? 'Saved to Favorites' : 'Save to Favorites'}
               </button>
            </div>

            {/* Bio — shown below actions for clients */}
            {user.role === 'client' && (
              <div className="pt-6 border-t border-zinc-100 max-w-2xl">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.3em] mb-3">About</p>
                <p className="text-base text-zinc-500 leading-relaxed font-medium">{user.profile?.bio || 'No profile bio yet.'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Left Column: sidebar - CLIENT SPECIFIC */}
        {user.role === 'client' ? (
          <div className="hidden" />
        ) : (
          <div className="lg:col-span-4 space-y-16">
            <section className="space-y-4">
              <h3 className="text-[10px] font-bold text-blue-600 bg-blue-50/50 px-4 py-2 rounded-xl inline-block border border-blue-100/50 uppercase tracking-[0.4em] mb-2">
                About the Freelancer
              </h3>
              <p className="text-sm text-zinc-500 leading-relaxed font-medium">{user.profile?.bio || 'Professional bio has not been provided yet.'}</p>
            </section>
            <section className="space-y-8">
              <h3 className="text-[10px] font-bold text-blue-600 bg-blue-50/50 px-4 py-2 rounded-xl inline-block border border-blue-100/50 uppercase tracking-[0.4em] mb-6">Skills</h3>
              <div className="flex flex-wrap gap-2.5">
                {skills.map(tag => (
                  <span key={tag} className="px-5 py-2.5 bg-blue-50/50 text-[#22819A] rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-50 transition-colors border border-blue-100/30">{tag}</span>
                ))}
              </div>
            </section>
            <section className="space-y-12">
              <h3 className="text-[10px] font-bold text-blue-600 bg-blue-50/50 px-4 py-2 rounded-xl inline-block border border-blue-100/50 uppercase tracking-[0.4em] mb-6">Experience</h3>
              <div className="space-y-12 relative">
                <div className="absolute left-[11px] top-3 bottom-0 w-px bg-zinc-100" />
                {experience.map((exp, i) => (
                  <div key={exp.id} className="relative pl-12 group">
                    <div className="absolute left-0 top-1.5 w-[23px] h-[23px] bg-white border-2 border-zinc-100 rounded-full flex items-center justify-center z-10 group-hover:border-blue-500 transition-colors duration-500">
                      <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-blue-500' : 'bg-zinc-200'}`} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-base font-bold text-zinc-900 tracking-tight leading-tight group-hover:text-blue-600 transition-colors">{exp.role}</h4>
                      <p className="text-[11px] font-bold text-zinc-400 flex items-center gap-2"><span className="text-blue-500">{exp.company}</span><span className="w-1 h-1 bg-zinc-200 rounded-full" />{exp.period}</p>
                      <p className="text-sm text-zinc-500 leading-relaxed max-w-sm">{exp.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {user.role === 'client' ? (
          <div className="hidden" />
        ) : (
          <div className="lg:col-span-8 space-y-12">
            <div className="flex items-end justify-between border-b border-zinc-100 pb-8">
              <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Portfolio Showcase</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {portfolio.map((p, i) => {
                const icons = [Cloud, Laptop, BarChart3, Square];
                const IconComp = icons[i % icons.length];
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="group cursor-pointer"
                    onClick={() => setSelectedProject(p)}
                  >
                    <div className="aspect-[16/11] rounded-[32px] overflow-hidden bg-zinc-50 relative border border-zinc-100 mb-8 transition-all hover:shadow-2xl hover:shadow-zinc-200/50">
                      <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out opacity-90 group-hover:opacity-100" />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/10 to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-[28px] flex items-center justify-center scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-500 border border-white/30 shadow-2xl">
                          <IconComp className="w-8 h-8 text-white stroke-[2px]" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4 px-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-2xl font-bold text-zinc-900 tracking-tight group-hover:text-blue-500 transition-colors">{p.title}</h4>
                        <div className="w-10 h-10 rounded-full border border-zinc-100 flex items-center justify-center group-hover:bg-zinc-900 group-hover:border-zinc-900 group-hover:rotate-45 transition-all duration-500">
                          <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                        </div>
                      </div>
                      <p className="text-sm text-zinc-500 leading-relaxed line-clamp-2">{p.desc}</p>
                      <div className="pt-4 flex items-center justify-between border-t border-zinc-50">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-4">{p.category}<span className="w-1 h-1 bg-zinc-200 rounded-full" />2024</p>
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity">View Details</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MessagesPage = ({ chats, activeChatId, setActiveChatId, onSendMessage }: { chats: any[], activeChatId: number, setActiveChatId: (id: number) => void, onSendMessage: (chatId: number, text: string) => void }) => {
  const [newMessage, setNewMessage] = useState('');
  const activeChat = chats.find(c => c.id === activeChatId) || chats[0];
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeChat?.messages]);

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(activeChat.id, newMessage);
      setNewMessage('');
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] bg-white rounded-[32px] border border-zinc-200/50 shadow-sm flex overflow-hidden max-w-7xl mx-auto">
      {/* Sidebar Layout */}
      <div className="w-full md:w-80 border-r border-zinc-100 flex flex-col bg-zinc-50/50">
        <div className="p-6 border-b border-zinc-100 bg-white">
          <h2 className="text-2xl font-black font-display tracking-tight text-zinc-900 mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input type="text" placeholder="Search chats..." className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
          {chats.map((c) => (
            <div 
              key={c.id} 
              onClick={() => setActiveChatId(c.id)}
              className={`p-5 flex gap-4 cursor-pointer hover:bg-zinc-50 transition-colors border-b border-zinc-100 ${c.id === activeChatId ? 'bg-white border-l-4 border-l-primary' : ''}`}
            >
              <div className="w-12 h-12 rounded-full bg-zinc-200 flex items-center justify-center font-bold text-zinc-600 flex-shrink-0">
                {c.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-bold text-zinc-900 text-sm truncate pr-2">{c.name}</h4>
                  <span className="text-[10px] font-bold text-zinc-400 whitespace-nowrap">{c.time}</span>
                </div>
                <p className="text-xs text-zinc-500 line-clamp-1 leading-relaxed">{c.msg}</p>
              </div>
              {c.unread > 0 && c.id !== activeChatId && (
                <div className="flex-shrink-0 flex items-center justify-center">
                  <span className="w-5 h-5 bg-primary rounded-full text-[10px] font-bold text-white flex items-center justify-center mt-6 shadow-sm">
                    {c.unread}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 hidden md:flex flex-col bg-white">
        {/* Chat Header */}
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-zinc-200 flex items-center justify-center font-bold text-zinc-600">
              {activeChat.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-lg">{activeChat.name}</h3>
              <p className="text-xs text-zinc-500 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Online</p>
            </div>
          </div>
          <button className="p-2 border border-zinc-200 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-xl transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Thread */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-8 bg-zinc-50/30 flex flex-col gap-6 custom-scrollbar scroll-smooth"
        >
          <div className="text-center">
            <span className="px-3 py-1 bg-zinc-100 text-zinc-500 rounded-full text-[10px] font-bold uppercase tracking-widest">Conversation Started</span>
          </div>
          
          {activeChat.messages.map((m: any) => (
            <div key={m.id} className={`flex gap-4 max-w-[80%] ${m.sender === 'me' ? 'ml-auto flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex-shrink-0 mt-auto flex items-center justify-center font-bold text-xs ${m.sender === 'me' ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-500'}`}>
                {m.sender === 'me' ? 'U' : activeChat.name.charAt(0)}
              </div>
              <div className={`p-4 rounded-2xl shadow-sm border ${
                m.sender === 'me' 
                ? 'bg-primary text-white border-primary rounded-br-sm' 
                : 'bg-white text-zinc-800 border-zinc-200/50 rounded-bl-sm'
              }`}>
                <p className="text-sm leading-relaxed">{m.text}</p>
                <p className={`text-[9px] mt-1.5 font-bold uppercase tracking-wider ${m.sender === 'me' ? 'text-white/60' : 'text-zinc-400'}`}>
                  {m.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Chat Input */}
        <div className="p-6 border-t border-zinc-100 bg-white">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-4"
          >
            <button type="button" className="w-10 h-10 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors">
              <Plus className="w-5 h-5" />
            </button>
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..." 
              className="flex-1 bg-zinc-50 border border-zinc-200 rounded-full px-6 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
            />
            <button 
              type="submit"
              className="px-6 py-3 bg-zinc-900 text-white rounded-full font-bold text-sm hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-900/20"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const SettingsPage = ({ user, onUpdateUser, onDeleteAccount }: { user: User | null, onUpdateUser: (u: User) => void, onDeleteAccount: () => void }) => {
  const [activeTab, setActiveTab] = useState('Account');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '+1 (555) 000-0000',
    address: user?.profile?.location || 'San Francisco, CA'
  });

  const tabs = ['Account', 'Security', 'Billing', 'Integrations'];

  const handleSave = () => {
    if (user) {
      onUpdateUser({ ...user, name: formData.name, email: formData.email });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-32">
      <div className="mb-16">
        <h1 className="text-4xl font-black font-display tracking-tight text-zinc-900 mb-4 uppercase">Settings</h1>
        <p className="text-lg text-zinc-500 font-medium">Manage your account configurations and preferences across the platform.</p>
      </div>

      <div className="space-y-16">
        {/* Account Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[40px] border border-zinc-200/50 shadow-sm p-8 md:p-12">
          <section>
            <h3 className="text-2xl font-black font-display text-zinc-900 mb-10 uppercase tracking-tight">Profile Details</h3>
            <div className="flex flex-col md:flex-row gap-12 items-start">
              <div className="relative group shrink-0">
                <div className="w-32 h-32 rounded-[32px] overflow-hidden bg-zinc-100 border-4 border-white shadow-xl">
                  <img src={user?.avatar} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <button className="absolute -bottom-2 -right-2 p-3 bg-white rounded-2xl shadow-lg border border-zinc-100 text-zinc-400 hover:text-primary transition-all group-hover:scale-110 active:scale-95">
                  <Camera className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 space-y-6 w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Public Name</label>
                    <input 
                      type="text" 
                      value={formData.name} 
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-zinc-900" 
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Email Address</label>
                    <input 
                      type="email" 
                      value={formData.email} 
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-zinc-900" 
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Phone Number</label>
                    <input 
                      type="text" 
                      value={formData.phone} 
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-zinc-900" 
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Work Address</label>
                    <input 
                      type="text" 
                      value={formData.address} 
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="e.g. San Francisco, CA"
                      className="w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-zinc-900 border-zinc-200" 
                    />
                  </div>
                </div>

                <div className="pt-12 flex flex-col items-center gap-6 border-t border-zinc-100 mt-12 relative">
                  <button 
                    onClick={handleSave}
                    className="w-full max-w-xs py-5 bg-zinc-900 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/20 active:scale-95"
                  >
                    Save Changes
                  </button>
                  
                  <div className="relative">
                    <button 
                      onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                      className="text-xs font-black uppercase tracking-[0.2em] text-rose-500 hover:text-rose-600 transition-all py-2"
                    >
                      Delete Account
                    </button>

                    <AnimatePresence>
                      {showDeleteConfirm && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute top-full left-1/2 -translate-x-1/2 mt-4 bg-white border border-zinc-100 shadow-2xl rounded-[24px] p-6 z-10 w-72 text-center"
                        >
                          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-zinc-100 rotate-45"></div>
                          <p className="text-[11px] font-black text-zinc-900 mb-4 tracking-[0.2em] uppercase">Are you sure?</p>
                          <div className="flex gap-3 justify-center">
                            <button 
                              onClick={onDeleteAccount}
                              className="flex-1 py-3 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/10 active:scale-95"
                            >
                              Yes
                            </button>
                            <button 
                              onClick={() => setShowDeleteConfirm(false)}
                              className="flex-1 py-3 bg-zinc-100 text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95"
                            >
                              No
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </motion.div>

        {/* Security Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-[40px] border border-zinc-200/50 shadow-sm p-8 md:p-12">
          <section className="space-y-12">
            <div>
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-black font-display text-zinc-900 uppercase tracking-tight">Security</h3>
                  <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-bold">Manage your access and protection</p>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-6 bg-zinc-50 px-8 rounded-3xl border border-zinc-100 shadow-sm">
                <div>
                  <p className="text-sm font-black text-zinc-900 uppercase tracking-tight">Security Credentials</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Keep your account protected</p>
                </div>
                <button className="px-8 py-4 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-900/10 active:scale-95">
                  Change Password
                </button>
              </div>
            </div>

            <div className="w-full h-px bg-zinc-100"></div>

            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black font-display text-zinc-900 uppercase tracking-tight">Two Factor Authentication</h3>
                    <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-bold">Add an extra layer of security</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-zinc-50 p-2 rounded-2xl border border-zinc-100">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">OFF</span>
                  <motion.button 
                    onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                    animate={{ backgroundColor: twoFactorEnabled ? '#10b981' : '#ef4444' }}
                    className="w-14 h-8 rounded-full relative p-1 transition-colors shadow-inner"
                  >
                    <motion.div 
                      animate={{ x: twoFactorEnabled ? 24 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="w-6 h-6 bg-white rounded-full shadow-lg" 
                    />
                  </motion.button>
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mr-2">ON</span>
                </div>
              </div>
              <p className="text-sm text-zinc-500 leading-relaxed font-medium">
                Protect your account with an extra layer of security. Once enabled, you'll need to enter a verification code from your authentication app in addition to your password.
              </p>
            </div>
          </section>
        </motion.div>

        {/* Billing Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-[40px] border border-zinc-200/50 shadow-sm p-8 md:p-12 overflow-hidden">
          <section className="space-y-12">
            <div>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black font-display text-zinc-900 uppercase tracking-tight">Billing & Payouts</h3>
                    <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-bold">Manage your financial enterprise</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: 'Stripe', status: 'Connected', icon: <CreditCard className="w-5 h-5" />, color: 'bg-indigo-600' },
                  { name: 'PayPal', status: 'Not Connected', icon: <DollarSign className="w-5 h-5" />, color: 'bg-blue-500' }
                ].map((method) => (
                  <div key={method.name} className="flex items-center justify-between p-6 bg-zinc-50 rounded-[24px] border border-zinc-100 hover:border-zinc-200 transition-all group shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 ${method.color} text-white rounded-xl flex items-center justify-center shadow-lg shadow-zinc-900/10`}>
                        {method.icon}
                      </div>
                      <div>
                        <p className="text-sm font-black text-zinc-900 uppercase tracking-tight">{method.name}</p>
                        <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${method.status === 'Connected' ? 'text-emerald-500' : 'text-zinc-400'}`}>
                          {method.status}
                        </p>
                      </div>
                    </div>
                    <button className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${method.status === 'Connected' ? 'text-zinc-400 hover:text-rose-500' : 'bg-white border border-zinc-200 text-zinc-900 hover:bg-zinc-900 hover:text-white shadow-sm'}`}>
                      {method.status === 'Connected' ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900 rounded-[32px] p-8 md:p-10 text-white relative overflow-hidden group border border-zinc-800">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-primary/30 transition-all duration-1000" />
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex-1">
                  <span className="px-4 py-1.5 bg-primary text-white rounded-full text-[10px] font-black uppercase tracking-widest mb-6 inline-block">Active Plan</span>
                  <h3 className="text-4xl font-black font-display mb-2 uppercase tracking-tight">WorkVault <span className="text-primary-light">Elite</span></h3>
                  <p className="text-zinc-400 text-sm max-w-sm mb-8 leading-relaxed">Unlock the full power of the platform with enterprise-grade features and zero commissions.</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {['Priority Support', '0% Service Fees', 'Custom Contracts', 'Verified Talent Access'].map((item) => (
                      <li key={item} className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-zinc-300">
                         <div className="w-2 h-2 rounded-full bg-primary" /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <button className="w-full md:w-64 py-5 bg-white text-zinc-900 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-zinc-100 hover:scale-105 active:scale-95 transition-all">
                  Manage Plan
                </button>
              </div>
            </div>

            <div className="w-full h-px bg-zinc-100"></div>

            <section>
               <div className="flex items-center gap-4 mb-10">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black font-display text-zinc-900 uppercase tracking-tight">Billing History</h3>
                  <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-bold">Transaction ledger and receipts</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      <th className="pb-6 text-[10px] font-black uppercase tracking-widest text-zinc-400 px-4">Date</th>
                      <th className="pb-6 text-[10px] font-black uppercase tracking-widest text-zinc-400 px-4">Description</th>
                      <th className="pb-6 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right px-4">Amount</th>
                      <th className="pb-6 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right px-4">Invoices</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {[
                      { date: 'Apr 02, 2024', desc: 'Enterprise Platform Subscription', amount: '-$49.00' },
                      { date: 'Mar 28, 2024', desc: 'Project Payout - Stripe', amount: '+$1,520.00' },
                      { date: 'Mar 15, 2024', desc: 'Secure Escrow Funding', amount: '-$2,000.00' }
                    ].map((tx, i) => (
                      <tr key={i} className="group hover:bg-zinc-50 transition-colors">
                        <td className="py-6 text-sm font-bold text-zinc-500 px-4">{tx.date}</td>
                        <td className="py-6 text-sm font-black text-zinc-900 uppercase tracking-tight px-4">{tx.desc}</td>
                        <td className={`py-6 text-sm font-black text-right px-4 ${tx.amount.startsWith('-') ? 'text-zinc-500' : 'text-emerald-500'}`}>{tx.amount}</td>
                        <td className="py-6 text-right px-4">
                           <button className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-primary transition-all p-2 bg-zinc-50 rounded-lg border border-zinc-100 hover:border-primary/20">
                             Download
                           </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        </motion.div>

        {/* Integrations Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-[40px] border border-zinc-200/50 shadow-sm p-8 md:p-12">
          <section className="space-y-12">
            {[
              {
                title: 'Workspace Tools',
                subtitle: 'Sync your enterprise communication channels',
                icon: <MessageSquare className="w-6 h-6" />,
                bg: 'bg-emerald-50',
                color: 'text-emerald-600',
                tools: [
                  { name: 'Slack', desc: 'Sync project channels and alerts', icon: <MessageSquare />, color: 'bg-[#4A154B]', status: 'Connected' },
                  { name: 'Discord', desc: 'Collaborate with communities', icon: <Zap />, color: 'bg-[#5865F2]', status: 'Not Connected' }
                ]
              },
              {
                title: 'Developer Ecosystem',
                subtitle: 'Connect your engineering infrastructure',
                icon: <Cpu className="w-6 h-6" />,
                bg: 'bg-indigo-50',
                color: 'text-indigo-600',
                tools: [
                  { name: 'GitHub', desc: 'Track repository deployments', icon: <Github />, color: 'bg-[#24292F]', status: 'Connected' },
                  { name: 'Figma', desc: 'Review design system tokens', icon: <Archive />, color: 'bg-[#F24E1E]', status: 'Not Connected' }
                ]
              }
            ].map((group, idx) => (
              <div key={idx} className={idx !== 0 ? "pt-12 border-t border-zinc-100" : ""}>
                <div className="flex items-center gap-4 mb-8">
                  <div className={`p-3 ${group.bg} ${group.color} rounded-2xl border ${group.bg.replace('bg-', 'border-')}`}>
                    {group.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-black font-display text-zinc-900 uppercase tracking-tight">{group.title}</h3>
                    <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-bold">{group.subtitle}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.tools.map((tool) => (
                    <div key={tool.name} className="flex items-center justify-between p-6 bg-zinc-50 rounded-[24px] border border-zinc-100 hover:border-zinc-200 transition-all group shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 ${tool.color} text-white rounded-xl flex items-center justify-center shadow-lg shadow-zinc-900/10`}>
                          {React.cloneElement(tool.icon as React.ReactElement, { className: "w-6 h-6" })}
                        </div>
                        <div>
                          <p className="text-sm font-black text-zinc-900 uppercase tracking-tight">{tool.name}</p>
                          <p className={`text-[10px] font-bold text-zinc-400 uppercase tracking-tight mt-1`}>{tool.desc}</p>
                        </div>
                      </div>
                      <button className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tool.status === 'Connected' ? 'text-zinc-400 hover:text-rose-500' : 'bg-white border border-zinc-200 text-zinc-900 hover:bg-zinc-900 hover:text-white shadow-sm'}`}>
                        {tool.status === 'Connected' ? 'Disconnect' : 'Connect'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        </motion.div>
      </div>
    </div>
  );
};



// --- Explore Components ---

const INITIAL_FREELANCERS = [
  {
    id: 1,
    name: "Julian Vane",
    role: "Senior UI/UX Strategist",
    rating: 4.9,
    hourly_rate: 195,
    profileImage: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop",
    workImage: "https://images.unsplash.com/photo-1558655146-d09347e92766?w=800&h=1000&fit=crop",
    category: "Design",
    experience: JSON.stringify([
      { id: 1, role: 'Senior UX Designer', company: 'Apple', period: '2021 - Present', desc: 'Crafting intuitive interfaces for next-gen consumer products.' },
      { id: 2, role: 'Product Designer', company: 'Uber', period: '2018 - 2021', desc: 'Designed the core rider app experience for global markets.' }
    ])
  },
  {
    id: 2,
    name: "Sarah Chen",
    role: "Lead AI Research Engineer",
    rating: 5.0,
    hourly_rate: 245,
    profileImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
    workImage: "https://images.unsplash.com/photo-1639322537228-f710d846310a?w=800&h=1000&fit=crop",
    category: "AI & Data",
    experience: JSON.stringify([
      { id: 1, role: 'AI Scientist', company: 'OpenAI', period: '2020 - Present', desc: 'Training large-scale vision models for creative intelligence.' },
      { id: 2, role: 'ML Lead', company: 'Google Brain', period: '2017 - 2020', desc: 'Pioneered ranking algorithms for transformer-based search.' }
    ])
  },
  {
    id: 3,
    name: "Marcus Thorne",
    role: "Enterprise Systems Architect",
    rating: 4.85,
    hourly_rate: 210,
    profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    workImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=1000&fit=crop",
    category: "Architecture",
    experience: JSON.stringify([
      { id: 1, role: 'Principal Architect', company: 'Microsoft', period: '2019 - Present', desc: 'Scaling global cloud infrastructure for enterprise Fortune 500s.' },
      { id: 2, role: 'Systems Engineer', company: 'IBM', period: '2015 - 2019', desc: 'Hybrid cloud integration for major financial networks.' }
    ])
  },
  {
    id: 4,
    name: "Elena Rodriguez",
    role: "Creative Director",
    rating: 4.95,
    hourly_rate: 185,
    profileImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop",
    workImage: "https://images.unsplash.com/photo-1558655146-d09347e92766?w=800&h=1000&fit=crop",
    category: "Design",
    experience: JSON.stringify([
      { id: 1, role: 'Motion Director', company: 'Disney', period: '2020 - Present', desc: 'Leading creative vision for global digital experiences.' },
      { id: 2, role: 'Senior Designer', company: 'Airbnb', period: '2016 - 2020', desc: 'Defined visual language for core hosting platforms.' }
    ])
  },
  {
    id: 5,
    name: "David Chen",
    role: "Zero-Trust Security Expert",
    rating: 4.9,
    hourly_rate: 225,
    profileImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
    workImage: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=1000&fit=crop",
    category: "Security",
    experience: JSON.stringify([
      { id: 1, role: 'Security Principal', company: 'Cloudflare', period: '2021 - Present', desc: 'Architecting edge security for worldwide traffic.' },
      { id: 2, role: 'InfoSec Lead', company: 'Palantir', period: '2018 - 2021', desc: 'Developing intelligence systems for critical infrastructure.' }
    ])
  },
  {
    id: 6,
    name: "Sasha Kowalski",
    role: "Full-Stack Performance Engineer",
    rating: 4.88,
    hourly_rate: 165,
    profileImage: "https://images.unsplash.com/photo-15067947782ea5-3d52d0d0a7a3?w=400&h=400&fit=crop",
    workImage: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=1000&fit=crop",
    category: "Development",
    experience: JSON.stringify([
      { id: 1, role: 'Full-Stack Lead', company: 'Vercel', period: '2021 - Present', desc: 'Optimizing web vitals and edge runtime performance.' },
      { id: 2, role: 'Senior Engineer', company: 'Netlify', period: '2019 - 2021', desc: 'Built core developer experience infrastructure.' }
    ])
  },
  {
    id: 7,
    name: "Amara Okoro",
    role: "Global Growth Strategist",
    rating: 4.92,
    hourly_rate: 190,
    profileImage: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=400&fit=crop",
    workImage: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=1000&fit=crop",
    category: "Marketing",
    experience: JSON.stringify([
      { id: 1, role: 'Growth Lead', company: 'HubSpot', period: '2020 - Present', desc: 'Scaling acquisition funnels for global SaaS product lines.' },
      { id: 2, role: 'Market Specialist', company: 'Salesforce', period: '2017 - 2020', desc: 'Developed data-driven retention models for enterprise.' }
    ])
  },
  {
    id: 8,
    name: "Liam O'Connor",
    role: "Cloud Infrastructure Architect",
    rating: 4.87,
    hourly_rate: 230,
    profileImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
    workImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=1000&fit=crop",
    category: "Architecture",
    experience: JSON.stringify([
      { id: 1, role: 'Cloud Lead', company: 'Amazon AWS', period: '2018 - Present', desc: 'Designing multi-region serverless architectures for scale.' },
      { id: 2, role: 'DevOps Principal', company: 'DigitalOcean', period: '2015 - 2018', desc: 'Built core virtualization management systems.' }
    ])
  },
  {
    id: 9,
    name: "Yuki Tanaka",
    role: "ML Ops Specialist",
    rating: 4.98,
    hourly_rate: 220,
    profileImage: "https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?w=400&h=400&fit=crop",
    workImage: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&h=1000&fit=crop",
    category: "AI & Data",
    experience: JSON.stringify([
      { id: 1, role: 'ML Ops Lead', company: 'Tesla', period: '2021 - Present', desc: 'Managing distributed training pipelines for autonomous systems.' },
      { id: 2, role: 'Data Engineer', company: 'Meta', period: '2018 - 2021', desc: 'Optimized real-time inference for ad recommendation engines.' }
    ])
  },
  {
    id: 10,
    name: "Isabella Rossi",
    role: "Identity & Branding Lead",
    rating: 4.96,
    hourly_rate: 205,
    profileImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    workImage: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800&h=1000&fit=crop",
    category: "Design",
    experience: JSON.stringify([
      { id: 1, role: 'Branding Lead', company: 'Pinterest', period: '2020 - Present', desc: 'Defining the creative vision for visual discovery.' },
      { id: 2, role: 'Art Director', company: 'Vogue', period: '2017 - 2020', desc: 'Curating iconic visual stories for digital editions.' }
    ])
  },
  {
    id: 11,
    name: "Omar Al-Fayed",
    role: "Blockchain Security Auditor",
    rating: 5.0,
    hourly_rate: 260,
    profileImage: "https://images.unsplash.com/photo-15067947782ea5-3d52d0d0a7a3?w=400&h=400&fit=crop",
    workImage: "https://images.unsplash.com/photo-1639322537231-2f206e06af84?w=800&h=1000&fit=crop",
    category: "Security",
    experience: JSON.stringify([
      { id: 1, role: 'Lead Auditor', company: 'Chainlink', period: '2021 - Present', desc: 'Securing multi-billion dollar oracle networks.' },
      { id: 2, role: 'Security Researcher', company: 'Ethereum Foundation', period: '2019 - 2021', desc: 'Hardening core protocol consensus mechanisms.' }
    ])
  },
  {
    id: 12,
    name: "James Wilson",
    role: "Mobile Product Engineer",
    rating: 4.86,
    hourly_rate: 170,
    profileImage: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop",
    workImage: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=1000&fit=crop",
    category: "Development",
    experience: JSON.stringify([
      { id: 1, role: 'iOS Lead', company: 'Spotify', period: '2020 - Present', desc: 'Optimizing mobile music discovery and playback engines.' },
      { id: 2, role: 'Android Dev', company: 'Snapchat', period: '2017 - 2020', desc: 'Built real-time AR camera features for Android.' }
    ])
  },
  {
    id: 13,
    name: "Maya Patel",
    role: "NLP Research Specialist",
    rating: 4.94,
    hourly_rate: 225,
    profileImage: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop",
    workImage: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=800&h=1000&fit=crop",
    category: "AI & Data",
    experience: JSON.stringify([
      { id: 1, role: 'NLP Lead', company: 'Anthropic', period: '2022 - Present', desc: 'Developing constitutional AI alignment for large language models.' },
      { id: 2, role: 'Research Engineer', company: 'DeepMind', period: '2018 - 2022', desc: 'Applied reinforcement learning to complex language tasks.' }
    ])
  },
  {
    id: 14,
    name: "Tom Berenger",
    role: "Performance Marketing Lead",
    rating: 4.89,
    hourly_rate: 180,
    profileImage: "https://images.unsplash.com/photo-1534030347209-467a5b0ad3e6?w=400&h=400&fit=crop",
    workImage: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=1000&fit=crop",
    category: "Marketing",
    experience: JSON.stringify([
      { id: 1, role: 'Paid Media Lead', company: 'Lyft', period: '2021 - Present', desc: 'Optimizing acquisition spend for driver and rider networks.' },
      { id: 2, role: 'Digital Strategist', company: 'Peloton', period: '2019 - 2021', desc: 'Scaled global e-commerce growth during rapid expansion.' }
    ])
  },
  {
    id: 15,
    name: "Sofia Mendez",
    role: "Microservices Architect",
    rating: 4.93,
    hourly_rate: 215,
    profileImage: "https://images.unsplash.com/photo-1548142813-c348350df52b?w=400&h=400&fit=crop",
    workImage: "https://images.unsplash.com/photo-1558494949-ef010cbdcc51?w=800&h=1000&fit=crop",
    category: "Architecture",
    experience: JSON.stringify([
      { id: 1, role: 'Architecture Lead', company: 'Netflix', period: '2020 - Present', desc: 'Managing thousands of microservices for global 4K streaming.' },
      { id: 2, role: 'Backend Engineer', company: 'Twitter', period: '2016 - 2020', desc: 'Designed high-throughput data pipelines for real-time events.' }
    ])
  },
  {
    id: 16,
    name: "Eric Hoffman",
    role: "Pentesting Specialist",
    rating: 4.91,
    hourly_rate: 235,
    profileImage: "https://images.unsplash.com/photo-15067947782ea5-3d52d0d0a7a3?w=400&h=400&fit=crop",
    workImage: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&h=1000&fit=crop",
    category: "Security",
    experience: JSON.stringify([
      { id: 1, role: 'Senior Pentester', company: 'HackerOne', period: '2019 - Present', desc: 'Leading private bounty programs for major tech giants.' },
      { id: 2, role: 'Security Analyst', company: 'Cisco', period: '2016 - 2019', desc: 'Defining network security standards for IoT ecosystem.' }
    ])
  },
  {
    id: 17,
    name: "Chloe Dupont",
    role: "UI/UX Design Lead",
    rating: 4.97,
    hourly_rate: 190,
    profileImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop",
    workImage: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=1000&fit=crop",
    category: "Design",
    experience: JSON.stringify([
      { id: 1, role: 'Design Lead', company: 'Instacart', period: '2021 - Present', desc: 'Redesigning core consumer shopping and checkout experience.' },
      { id: 2, role: 'UX Designer', company: 'Shopify', period: '2018 - 2021', desc: 'Launched several mobile commerce toolkits for merchants.' }
    ])
  },
  {
    id: 18,
    name: "Alex Rivera",
    role: "Backend Infrastructure Lead",
    rating: 4.88,
    hourly_rate: 185,
    profileImage: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop",
    workImage: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=1000&fit=crop",
    category: "Development",
    experience: JSON.stringify([
      { id: 1, role: 'Backend Lead', company: 'Stripe', period: '2020 - Present', desc: 'Ensuring 99.999% reliability for global payment infrastructure.' },
      { id: 2, role: 'Core Engineer', company: 'Twilio', period: '2017 - 2020', desc: 'Built real-time messaging APIs for high-volume enterprise.' }
    ])
  },
  {
    id: 19,
    name: "Zoe Wang",
    role: "Data Science Director",
    rating: 4.99,
    hourly_rate: 240,
    profileImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    workImage: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=1000&fit=crop",
    category: "AI & Data",
    experience: JSON.stringify([
      { id: 1, role: 'Director of Data', company: 'Airbnb', period: '2021 - Present', desc: 'Applying predictive modeling to marketplace pricing and trust.' },
      { id: 2, role: 'Senior Data Scientist', company: 'Lyft', period: '2018 - 2021', desc: 'Optimized driver dispatching with real-time analytics.' }
    ])
  },
  {
    id: 20,
    name: "Markus Schmidt",
    role: "Systems Integrity Lead",
    rating: 4.84,
    hourly_rate: 210,
    profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    workImage: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=1000&fit=crop",
    category: "Architecture",
    experience: JSON.stringify([
      { id: 1, role: 'Integrity Lead', company: 'SAP', period: '2019 - Present', desc: 'Defining enterprise standards for hybrid-on-prem architectures.' },
      { id: 2, role: 'Systems Engineer', company: 'Oracle', period: '2016 - 2019', desc: 'Built core storage management for cloud database products.' }
    ])
  },
  {
    id: 21,
    name: "Lila Ibrahim",
    role: "Social Growth Engineer",
    rating: 4.93,
    hourly_rate: 175,
    profileImage: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop",
    workImage: "https://images.unsplash.com/photo-1534120247760-c44c3e4a62f1?w=800&h=1000&fit=crop",
    category: "Marketing",
    experience: JSON.stringify([
      { id: 1, role: 'Growth Strategist', company: 'TikTok', period: '2021 - Present', desc: 'Scaling algorithmic reach for creator ecosystem enablement.' },
      { id: 2, role: 'Viral Strategist', company: 'Instagram', period: '2018 - 2021', desc: 'Launched global Reels monetization and discovery tools.' }
    ])
  },
  {
    id: 22,
    name: "Felix Jung",
    role: "Edge Runtime Specialist",
    rating: 4.92,
    hourly_rate: 195,
    profileImage: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop",
    workImage: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=1000&fit=crop",
    category: "Development",
    experience: JSON.stringify([
      { id: 1, role: 'Edge Specialist', company: 'Fastly', period: '2022 - Present', desc: 'Building high-performance compute-at-the-edge runtimes.' },
      { id: 2, role: 'Senior Dev', company: 'Deno', period: '2019 - 2022', desc: 'Core contributor to server-side TypeScript runtime.' }
    ])
  },
  {
    id: 23,
    name: "Nora Helseth",
    role: "Privacy Security Lead",
    rating: 4.99,
    hourly_rate: 250,
    profileImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop",
    workImage: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&h=1000&fit=crop",
    category: "Security",
    experience: JSON.stringify([
      { id: 1, role: 'Privacy Principal', company: 'Signal', period: '2020 - Present', desc: 'Defining zero-knowledge architecture for private communication.' },
      { id: 2, role: 'Security Engineer', company: 'Apple', period: '2016 - 2020', desc: 'Hardened core privacy layers for iOS and iCloud.' }
    ])
  },
  {
    id: 24,
    name: "Kaito Sato",
    role: "Computer Vision Expert",
    rating: 4.96,
    hourly_rate: 230,
    profileImage: "https://images.unsplash.com/photo-15067947782ea5-3d52d0d0a7a3?w=400&h=400&fit=crop",
    workImage: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&h=1000&fit=crop",
    category: "AI & Data",
    experience: JSON.stringify([
      { id: 1, role: 'CV Lead', company: 'NVIDIA', period: '2021 - Present', desc: 'training next-gen perception models for autonomous robotics.' },
      { id: 2, role: 'Research Engineer', company: 'Amazon Go', period: '2017 - 2021', desc: 'Built real-time multi-agent tracking systems.' }
    ])
  }
];

const ExplorePage = ({ onBack, onSignIn, onExplore, onFreelance, onAbout, onProfileClick, onSendProposal, isSignedIn = false, favourites = [], onToggleFavourite, freelancers, hideNavbarLinks = false }: { onBack: () => void, onSignIn: () => void, onExplore: () => void, onFreelance: () => void, onAbout?: () => void, onProfileClick?: (freelancer: any) => void, onSendProposal?: (freelancerName: string, brief: string) => void, isSignedIn?: boolean, favourites?: Array<string | number>, onToggleFavourite?: (id: string | number) => void, freelancers: any[], hideNavbarLinks?: boolean }) => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState('Top Rated');
  const [isSortOpen, setIsSortOpen] = useState(false);

  const categories = [
    { name: 'All', icon: Search },
    { name: 'Design', icon: Palette },
    { name: 'Development', icon: Code2 },
    { name: 'Marketing', icon: Megaphone },
    { name: 'Architecture', icon: Layers },
    { name: 'AI & Data', icon: Brain },
    { name: 'Security', icon: ShieldCheck },
    ...(isSignedIn ? [{ name: 'Favourites', icon: Heart }] : [])
  ];

  const sortedFreelancers = [...freelancers].sort((a, b) => {
    if (sortBy === 'Price: Low to High') return a.hourly_rate - b.hourly_rate;
    if (sortBy === 'Price: High to Low') return b.hourly_rate - a.hourly_rate;
    if (sortBy === 'Top Rated') return b.rating - a.rating;
    return 0;
  });

  const filteredFreelancers = activeCategory === 'Favourites'
    ? sortedFreelancers.filter(f => favourites.includes(f.id))
    : (activeCategory === 'All'
      ? sortedFreelancers
      : sortedFreelancers.filter(f => f.category === activeCategory));

  const sortOptions = ['Top Rated', 'Price: Low to High', 'Price: High to Low'];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="min-h-screen bg-surface">
      <Navbar 
        onGetStarted={onSignIn} 
        onExplore={onExplore} 
        onFreelance={onFreelance} 
        onAbout={onAbout} 
        onHome={onBack} 
        isExplore={true} 
        activeTab="Explore" 
        hideLinks={hideNavbarLinks}
      />

      <div className={`${hideNavbarLinks && isSignedIn ? 'pt-24' : 'pt-24'} px-8 pb-20 max-w-7xl mx-auto space-y-8`}>
        {/* Search and Filter Header */}
        <div className="sticky top-20 z-30 bg-surface/80 backdrop-blur-lg -mx-8 px-8 py-6 border-b border-zinc-200/50">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="flex items-center gap-4 w-full lg:flex-1">
              {/* Sort Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  className="flex items-center gap-2 px-5 py-4 bg-white border border-zinc-200 rounded-2xl text-sm font-bold text-zinc-900 hover:border-zinc-300 transition-all shadow-sm whitespace-nowrap min-w-[180px]"
                >
                  <Menu className="w-4 h-4 text-zinc-400" />
                  <span>Sort By: {sortBy}</span>
                </button>

                <AnimatePresence>
                  {isSortOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute top-full left-0 mt-2 w-64 bg-white border border-zinc-200 rounded-2xl shadow-2xl z-50 overflow-hidden"
                      >
                        {sortOptions.map((option) => (
                          <button
                            key={option}
                            onClick={() => {
                              setSortBy(option);
                              setIsSortOpen(false);
                            }}
                            className={`w-full text-left px-5 py-3.5 text-sm transition-colors flex items-center justify-between group ${sortBy === option ? 'bg-zinc-50 text-zinc-900' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                              }`}
                          >
                            <span className="font-bold">{option}</span>
                            {sortBy === option && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Search Bar */}
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-zinc-900 transition-colors" />
                <input
                  type="text"
                  placeholder="Search by expertise, name or role..."
                  className="w-full pl-12 pr-6 py-4 bg-white border border-zinc-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-6 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 hide-scrollbar justify-center">
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setActiveCategory(cat.name)}
                  className={`flex flex-col items-center gap-2 min-w-[70px] group transition-all ${activeCategory === cat.name ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'
                    }`}
                >
                  <cat.icon className={`w-6 h-6 transition-transform group-hover:scale-110 ${activeCategory === cat.name ? 'stroke-[2.5px]' : 'stroke-1'
                    }`} />
                  <span className={`text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${activeCategory === cat.name ? 'opacity-100' : 'opacity-60'
                    }`}>
                    {cat.name}
                  </span>
                  {activeCategory === cat.name && (
                    <motion.div layoutId="activeExploreCat" className="h-0.5 w-full bg-zinc-900 mt-1 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12 pt-8">
          {filteredFreelancers.map((f, i) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group cursor-pointer"
              onClick={() => onProfileClick?.(f)}
            >
              <div className="relative aspect-[4/5] rounded-3xl overflow-hidden mb-5 shadow-lg bg-zinc-100">
                <img
                  src={f.workImage}
                  alt={`${f.name}'s work`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=1000&fit=crop';
                  }}
                />

                {/* Profile Photo - Top Left */}
                <div className="absolute top-5 left-5 z-10">
                  <div className="w-14 h-14 rounded-full border-2 border-white overflow-hidden shadow-2xl group-hover:scale-110 transition-transform duration-500">
                    <img 
                      src={f.profileImage || f.avatar} 
                      alt={f.name} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop';
                      }}
                    />
                  </div>
                </div>

                <div className="absolute top-5 right-5 z-10">
                  <button className="p-3 rounded-full bg-black/20 backdrop-blur-md border border-white/30 hover:scale-110 active:scale-95 transition-all group/heart" onClick={(e) => { e.stopPropagation(); if (onToggleFavourite) onToggleFavourite(f.id); }}>
                     <Heart 
                      className={`w-6 h-6 transition-colors ${favourites.includes(f.id) ? 'text-rose-500' : 'text-white/90 group-hover/heart:text-rose-500'}`}
                      fill={favourites.includes(f.id) ? "currentColor" : "none"}
                    />
                  </button>
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>

              <div className="px-1 space-y-1.5">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-bold text-zinc-900 group-hover:text-primary transition-colors">{f.name}</h3>
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-zinc-900" />
                    <span className="text-sm font-bold">{f.rating}</span>
                  </div>
                </div>
                <p className="text-zinc-500 text-sm font-medium">{f.role}</p>
                <div className="flex items-baseline gap-1 pt-1">
                  <span className="text-zinc-900 text-base font-black">${f.hourly_rate}</span>
                  <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">hour</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredFreelancers.length === 0 && (
          <div className="py-32 text-center">
            <Search className="w-16 h-16 text-zinc-200 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-zinc-900 tracking-tight">No results found</h3>
            <p className="text-zinc-500 text-lg">Try widening your search or picking a different category.</p>
          </div>
        )}
      </div>

      <footer className="py-12 px-8 border-t border-zinc-200/50 text-center">
        <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em]">
          &copy; 2024 WORKVAULT DISCOVERY ENGINE. ALL RIGHTS RESERVED.
        </p>
      </footer>
    </div>
  );
};

const FreelancePage = ({ onBack, onSignIn, onExplore, onRegistrationStart, onAbout }: { onBack: () => void, onSignIn: () => void, onExplore: () => void, onRegistrationStart: () => void, onAbout?: () => void }) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const lastSectionRef = React.useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setTimeout(() => setIsModalOpen(true), 800);
        }
      },
      { threshold: 0.5 }
    );

    if (lastSectionRef.current) {
      observer.observe(lastSectionRef.current);
    }
    return () => observer.disconnect();
  }, []);
  const sections = [
    {
      title: 'AI-Powered Matchmaking',
      desc: 'Our proprietary AI analyzes your unique skill signature to deliver precise, high-conversion project matches directly to your dashboard. No more searching—just excellence.',
      img: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&q=80&w=800&h=1000',
      bg: 'bg-[#F0F9FB]', /* Lightest Teal variant */
      text: 'text-zinc-900',
      zIndex: 'z-40'
    },
    {
      title: 'Instant Global Payouts',
      desc: 'Bypass traditional banking delays. Receive your funds instantly through our global liquidity network as soon as milestones are approved, regardless of your location.',
      img: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=1000&fit=crop',
      bg: 'bg-white',
      text: 'text-zinc-900',
      zIndex: 'z-30'
    },
    {
      title: 'Collaborative Shared Vaults',
      desc: 'Scale from a solo expert to a small agency effortlessly. Create shared project vaults, manage sub-contractors, and handle multi-party milestones with ease.',
      img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=1000&fit=crop',
      bg: 'bg-[#F0F7FF]', /* Lightest Blue variant */
      text: 'text-zinc-900',
      zIndex: 'z-20'
    },
    {
      title: 'Verified Talent Status',
      desc: 'Join the top 1% of global talent with a verified WorkVault badge. Unlock exclusive access to high-value projects that never hit public job boards and command premium rates.',
      img: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&h=1000&fit=crop',
      bg: 'bg-white',
      text: 'text-zinc-900',
      zIndex: 'z-10'
    }
  ];

  return (
    <div className="bg-surface">
      <Navbar onGetStarted={onSignIn} onExplore={onExplore} onFreelance={() => {}} onAbout={onAbout} onHome={onBack} isExplore={true} activeTab="Freelance" />

      <div className="relative">
        {sections.map((s, i) => {
          const isLast = i === sections.length - 1;
          return (
            <section key={i} ref={isLast ? lastSectionRef : null} className={`freelance-section flex items-center h-[100vh] px-6 md:px-12 relative ${s.bg} ${s.text} ${s.zIndex} ${i === 0 ? 'pt-24' : ''}`}>
              <div className="w-full md:w-1/2 pl-[5%] md:pl-[10%] flex flex-col justify-center gap-6 z-10 relative">
                <h2 className="text-4xl md:text-6xl font-black tracking-tight" style={{ fontFamily: '"Aboreto", system-ui' }}>{s.title}</h2>
                <p className="text-lg md:text-xl leading-relaxed opacity-80 max-w-md">{s.desc}</p>
                
                {isLast && (
                  <div className="mt-8">
                    <button onClick={() => setIsModalOpen(true)} className="px-8 py-4 bg-zinc-900 text-white rounded-full font-bold hover:bg-zinc-800 transition-colors shadow-lg shadow-black/20">
                      Register as Freelancer
                    </button>
                  </div>
                )}
              </div>
              
              <div className="fixed top-0 bottom-0 right-12 my-auto w-[35vmax] h-[calc(35vmax*3/4)] hidden md:block">
                <img src={s.img} alt={s.title} className="freelance-img block w-full h-full object-cover shadow-2xl" />
              </div>
            </section>
          );
        })}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <FreelanceRegistrationModal 
            onClose={() => setIsModalOpen(false)} 
            onGetStarted={() => {
              setIsModalOpen(false);
              onRegistrationStart();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const FreelanceRegistrationModal = ({ onClose, onGetStarted }: { onClose: () => void, onGetStarted: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-zinc-900/60 backdrop-blur-md"
    >
      <div className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl overflow-hidden p-10 border border-zinc-100">
        <button onClick={onClose} className="absolute top-8 right-8 p-3 hover:bg-zinc-50 rounded-2xl transition-all text-zinc-400">
          <X className="w-6 h-6" />
        </button>
        
        <div className="text-center space-y-8 py-6">
          <div className="w-20 h-20 bg-primary/5 rounded-[28px] flex items-center justify-center mx-auto border border-primary/10">
            <Zap className="w-10 h-10 text-primary" />
          </div>
          
          <div>
            <h2 className="text-4xl font-black font-display text-zinc-900 uppercase tracking-tight mb-3">Register as Freelancer</h2>
            <p className="text-zinc-500 text-base font-medium leading-relaxed max-w-2xl mx-auto">
              Unlock a higher tier of professional work, where your unique<br className="hidden md:block" /> skills meet visionary clients and global scale.
            </p>
          </div>

          <button 
            onClick={onGetStarted}
            className="w-full py-5 bg-zinc-900 text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-2xl shadow-zinc-900/20 hover:bg-zinc-800 transition-all hover:-translate-y-1 active:translate-y-0"
          >
            Get Started
          </button>
        </div>
      </div>
    </motion.div>
  );
};



// --- 3D Scroll Showcase Section ---

const showcaseImages = [
  // Unique Portfolio & Platform Imagery
  { url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=600&fit=crop', x: -42, y: -38, label: 'Vetted Developers' },
  { url: 'https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=400&h=600&fit=crop', x: -15, y: -44, label: 'Elite Specialists' },
  { url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=600&fit=crop', x: 18, y: -42, label: 'Custom Solutions' },
  { url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=600&fit=crop', x: 44, y: -36, label: 'Institutional Clients' },
  { url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=600&fit=crop', x: -48, y: -14, label: 'Market Insights' },
  { url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=600&fit=crop', x: -28, y: -18, label: 'Strategic Partnerships' },
  { url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=400&h=600&fit=crop', x: 30, y: -16, label: 'WorkVault Hub' },
  { url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=600&fit=crop', x: 49, y: -12, label: 'Precision Matching' },
  { url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400&h=600&fit=crop', x: -38, y: 4, label: 'Digital Excellence' },
  { url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=600&fit=crop', x: -20, y: 8, label: 'Premium Designers' },
  { url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&h=600&fit=crop', x: 22, y: 6, label: 'Secure Milestones' },
  { url: 'https://images.unsplash.com/photo-1551739440-5dd934d3a94a?w=400&h=600&fit=crop', x: 40, y: 4, label: 'Connectivity' },
  { url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=600&fit=crop', x: -46, y: 20, label: 'Shared Vaults' },
  { url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=600&fit=crop', x: -24, y: 24, label: 'Global Community' },
  { url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=600&fit=crop', x: 26, y: 22, label: 'Innovation Hub' },
  { url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=600&fit=crop', x: 47, y: 20, label: 'Verified Status' },
  { url: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=400&h=600&fit=crop', x: -44, y: 36, label: 'Instant Payouts' },
  { url: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&h=600&fit=crop', x: -16, y: 40, label: 'Escrow Protection' },
  { url: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=400&h=600&fit=crop', x: 20, y: 38, label: 'Mastery Exchange' },
  { url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=400&h=600&fit=crop', x: 45, y: 36, label: 'Enterprise Scale' },
  { url: 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=400&h=600&fit=crop', x: -38, y: 46, label: 'Creative Freedom' },
  { url: 'https://images.unsplash.com/photo-1534030347209-467a5b0ad3e6?w=400&h=600&fit=crop', x: -10, y: 48, label: 'Expert Autonomy' },
  { url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400&h=600&fit=crop', x: 12, y: 48, label: 'Merit Based' },
  { url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=600&fit=crop', x: 40, y: 46, label: 'World Class Work' },
];

const ShowcaseSection = () => {
  const sectionRef = React.useRef<HTMLDivElement>(null);
  const stickyRef = React.useRef<HTMLDivElement>(null);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const totalScrollable = sectionRef.current.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      const p = Math.max(0, Math.min(1, scrolled / totalScrollable));
      setProgress(p);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  React.useEffect(() => {
    // Pre-load showcase images for instant display on scroll
    showcaseImages.forEach(img => {
      const i = new Image();
      i.src = img.url;
    });
  }, []);

  return (
    <section ref={sectionRef} style={{ height: '550vh', position: 'relative' }}>
      <div
        ref={stickyRef}
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',
        }}
      >
        {/* Ambient glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(34,129,154,0.15) 0%, transparent 70%)',
        }} />

        {/* Center Label — pinned */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', zIndex: 20, pointerEvents: 'none',
        }}>
          <span style={{
            fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.35em',
            color: 'rgba(34,129,154,0.9)', textTransform: 'uppercase', marginBottom: '12px',
          }}>
            Scroll to Explore
          </span>
          <h2
            className="font-black font-display tracking-tight uppercase"
            style={{
              fontSize: 'clamp(3.5rem, 8vw, 7rem)',
              color: '#18181b',
              lineHeight: 1,
              textAlign: 'center',
              margin: 0,
              background: 'linear-gradient(135deg, #18181b 0%, rgba(34,129,154,0.9) 80%, #0891b2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            OUR WORK
          </h2>
          <p style={{
            marginTop: '16px', fontSize: '0.9rem', color: 'rgba(24,24,27,0.5)',
            fontWeight: 500, letterSpacing: '0.05em',
          }}>
            Real people. Real projects. Real impact.
          </p>
        </div>

        {/* 3D Scene */}
        <div style={{
          position: 'absolute', inset: 0,
          perspective: '1000px',
          perspectiveOrigin: '50% 50%',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            transformStyle: 'preserve-3d',
          }}>
            {showcaseImages.map((img, i) => {
              // Each card has its own short animation window; starts are evenly spread across scroll
              const n = showcaseImages.length;
              const windowSize = 0.25; // each card's animation takes 25% of total scroll
              // Spread start offsets: card 0 at 0%, card n-1 at (1-windowSize) = 75%
              const startOffset = (i / (n - 1)) * (1 - windowSize);
              const cardProgress = Math.max(0, Math.min(1,
                (progress - startOffset) / windowSize
              ));

              const z = -2000 + cardProgress * 2700; // from deep back → flies past camera
              const scale = Math.max(0.01, Math.min(1, cardProgress * 1.2));
              const opacity = cardProgress < 0.08 ? cardProgress / 0.08 :
                cardProgress > 0.85 ? (1 - cardProgress) / 0.15 : 1;

              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `calc(50% + ${img.x}vw - 80px)`,
                    top: `calc(50% + ${img.y}vh - 100px)`,
                    width: '160px',
                    height: '200px',
                    transform: `translateZ(${z}px) scale(${scale})`,
                    opacity,
                    transition: 'none',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: '#fff',
                    boxShadow: '0 30px 60px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)',
                    willChange: 'transform, opacity',
                  }}
                >
                  <img
                    src={img.url}
                    alt={img.label}
                    style={{
                      width: '100%', height: '100%', objectFit: 'cover',
                      display: 'block',
                    }}
                    loading="eager"
                  />
                  {/* Label overlay */}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    padding: '20px 12px 10px',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
                  }}>
                    <span style={{
                      fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)',
                      textTransform: 'uppercase', letterSpacing: '0.15em',
                    }}>
                      {img.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
};

// --- About Page ---

const AboutPage = ({ onBack, onSignIn, onExplore, onFreelance }: {
  onBack: () => void;
  onSignIn: () => void;
  onExplore: () => void;
  onFreelance: () => void;
}) => {
  const team = [
    { name: 'Gargee Wagh', role: 'Architect & Co-Founder', bio: 'Visionary architect shaping the core structure and strategic direction of the WorkVault ecosystem.', avatar: 'GW', color: 'from-violet-500 to-purple-600', image: '/builders/gargee.jpg?v=3', position: 'center' },
    { name: 'Janhavi Dhamak', role: 'Lead Strategist', bio: 'Expert strategist dedicated to refining user journeys and ensuring professional excellence across the platform.', avatar: 'JD', color: 'from-teal-500 to-primary', image: '/builders/janhavi.jpg?v=3', position: 'center' },
  ];

  const values = [
    { icon: Shield, title: 'Unwavering Trust', desc: 'Integrity is at our core. Every professional is meticulously vetted, ensuring a secure environment for high-stakes global collaboration. We prioritize transparency above all else to maintain long-term institutional partnerships.' },
    { icon: Zap, title: 'Precision Velocity', desc: 'We reconcile speed with excellence. Our matching protocols deliver instantaneous, high-conversion partnerships for visionary projects.' },
    { icon: Heart, title: 'Talent Sovereignty', desc: 'We empower individual mastery. Our ecosystem is designed to respect professional autonomy and amplify specialized expertise at scale.' },
    { icon: Star, title: 'Institutional Quality', desc: 'Excellence is non-negotiable. We maintain an exclusive sanctuary for the top-tier of global talent and enterprise clients. Our standards ensure that every project meets the highest benchmarks of professional mastery.' },
  ];

  const stats = [
    { value: '10K+', label: 'Elite Freelancers' },
    { value: '$50M+', label: 'Paid Out' },
    { value: '98%', label: 'Client Satisfaction' },
    { value: '40+', label: 'Countries' },
  ];

  // Always open from the top
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="min-h-screen bg-surface">
      <Navbar
        onGetStarted={onSignIn}
        onExplore={onExplore}
        onFreelance={onFreelance}
        onAbout={() => { }}
        onHome={onBack}
        isExplore={true}
        activeTab="About"
      />

      {/* Hero */}
      <section className="pt-40 pb-20 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-widest mb-8">
              <Zap className="w-4 h-4" /> Our Story
            </span>
            <h1 className="text-5xl md:text-7xl font-black text-zinc-900 leading-[1.1] mb-8 font-display tracking-tight">
              Building the Future <br />
              <span className="text-primary relative">
                of Work.
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none">
                  <path d="M0,5 Q100,-5 200,5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.2" />
                </svg>
              </span>
            </h1>
            <p className="text-xl text-zinc-500 max-w-2xl mx-auto leading-relaxed">
              Redefining the standard of professional partnership: WorkVault is where high-stakes projects meet the curated mastery required to execute them with precision.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats Cards */}
      <section className="px-8 pb-24 relative z-10 -mt-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              className="bg-white/80 backdrop-blur-xl rounded-3xl border border-zinc-200/50 p-8 text-center shadow-sm hover:shadow-md transition-shadow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 + 0.2 }}
            >
              <div className="text-4xl font-black text-zinc-900 mb-2 font-display">{s.value}</div>
              <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="py-24 px-8 bg-zinc-50 border-y border-zinc-200/50">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-xs font-black text-primary uppercase tracking-widest">Our Mission</span>
            <h2 className="text-4xl md:text-5xl font-black text-zinc-900 mt-4 mb-6 leading-tight font-display tracking-tight">
              Redefining how top talent meets great work.
            </h2>
            <p className="text-zinc-500 text-base leading-relaxed mb-6">
              WorkVault is built for professionals who take their work seriously. Freelancers today manage complex workflow projects, clients, deadlines, and portfolios, often across multiple tools. WorkVault simplifies this process by providing a centralized workspace designed specifically for independent professionals.
            </p>
            <p className="text-zinc-500 text-base leading-relaxed">
              By combining productivity tools with portfolio presentation, WorkVault helps freelancers stay organized, work efficiently, and showcase their expertise with confidence.
            </p>
          </div>
          <div className="space-y-4">
            {['Curated network of elite creatives & developers', 'Secure, automated escrow protection', 'Intelligent project & talent matching', 'Integrated portfolio showcases', 'Zero bidding wars. Pure meritocracy.'].map((item, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-4 bg-white rounded-2xl p-5 shadow-sm border border-zinc-200/50 group hover:border-primary/30 transition-all cursor-default"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 + 0.3 }}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:scale-110 transition-all">
                  <CheckCircle2 className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
                </div>
                <span className="font-bold text-zinc-800">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 3D Scroll Showcase */}
      <ShowcaseSection />

      {/* Values */}
      <section className="py-24 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-xs font-black text-primary uppercase tracking-widest">What We Stand For</span>
            <h2 className="text-4xl font-black text-zinc-900 mt-4 font-display tracking-tight">Our Core Values</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
            {values.map((v, i) => {
              const featured = i === 0 || i === 3;
              return (
                <motion.div
                  key={v.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`${featured ? "md:col-span-2" : "md:col-span-1"
                    } glass-card rounded-[2.5rem] p-8 flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500 ${featured ? "bg-[#22819A] text-white border-none" : "bg-white text-zinc-900 border border-zinc-200/50"
                    }`}
                >
                  <div className="relative z-10 flex flex-col items-start h-full justify-center">
                    <div className="flex items-center gap-4 mb-6">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                        featured ? 'bg-white/10 border-white/20 text-white' : 'bg-zinc-50 border-zinc-200 text-[#22819A]'
                      }`}>
                        <v.icon className={`w-5 h-5 ${featured ? 'text-white' : 'text-[#22819A]'}`} />
                      </div>
                      <h3 className={`font-bold tracking-tight text-xl ${featured ? 'text-white' : 'text-zinc-900'}`}>{v.title}</h3>
                    </div>
                    <p className={`text-sm md:text-base font-medium leading-relaxed mb-4 ${
                      featured ? "text-white/90" : "text-zinc-500"
                    }`}>
                      "{v.desc}"
                    </p>
                  </div>

                  {/* Theme Decoration */}
                  {featured && (
                    <div className="absolute -bottom-10 -right-10 opacity-10 group-hover:rotate-12 transition-transform duration-700 pointer-events-none">
                      <v.icon className="w-48 h-48 fill-white text-white" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-32 px-8 bg-zinc-50 border-t border-zinc-200/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/5 pointer-events-none" style={{ clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0% 100%)' }} />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
            <div>
              <span className="text-xs font-black text-primary uppercase tracking-widest">The Team</span>
              <h2 className="text-4xl md:text-5xl font-black text-zinc-900 mt-4 font-display tracking-tight">Meet the Builders</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-2xl mx-auto">
            {team.map((member, i) => (
              <motion.div
                key={i}
                className="group relative bg-zinc-900 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 cursor-default aspect-[3/4]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <img 
                  src={member.image} 
                  alt={member.name} 
                  style={{ objectPosition: (member as any).position || 'center' }}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 group-hover:-translate-y-2 transition-transform duration-700 ease-out opacity-90 group-hover:opacity-100" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-500" />
                
                <div className="absolute inset-x-0 bottom-0 p-8 flex flex-col justify-end h-full">
                  <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-500 slide-up-content">
                    <h3 className="text-2xl font-black text-white">{member.name}</h3>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Wrapper added to match Auth card style */}
      <section className="py-24 px-8">
        <div className="max-w-6xl mx-auto bg-primary/5 border border-primary/10 rounded-[40px] p-16 text-center relative overflow-hidden shadow-lg shadow-primary/5">
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(34,129,154,0.15) 0%, transparent 70%)' }} />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-black mb-6 font-display tracking-tight text-zinc-900">Ready to Redefine Your Standard?</h2>
            <p className="text-zinc-500 text-lg mb-10 max-w-2xl mx-auto">
              Step into an ecosystem where professional mastery is the only metric that matters. Whether you're scaling a vision or refining your craft, the journey starts here.
            </p>
            <div className="flex justify-center">
              <button onClick={onSignIn} className="px-10 py-5 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20">
                Establish Your Vault
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] border-t border-zinc-200/50">
        © 2024 WorkVault. All rights reserved.
      </footer>
    </div>
  );
};


// --- Main App ---

const SuccessStoryModal = ({ isOpen, onClose, onAddReview, reviews, onDeleteReview, currentUserId }: { isOpen: boolean, onClose: () => void, onAddReview: (review: Review) => void, reviews: Review[], onDeleteReview: (id: number) => void, currentUserId?: number }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [formData, setFormData] = useState({ text: '', rating: 5, name: '', role: '' });
  const [submitted, setSubmitted] = useState(false);

  const ownReviews = reviews.filter(r => r.authorId === currentUserId);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const newReview: Review = {
      id: Date.now(),
      authorId: currentUserId,
      name: formData.name || "Anonymous Client",
      role: formData.role || "Executive Partner",
      text: formData.text,
      rating: formData.rating,
      image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop",
      featured: false
    };
    onAddReview(newReview);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setActiveTab('history');
      setFormData({ text: '', rating: 5, name: '', role: '' });
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 40 }} className="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden border border-zinc-100 p-10">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-black font-display text-zinc-900 uppercase">Success Stories</h2>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-zinc-100 rounded-2xl transition-colors text-zinc-400"><X className="w-7 h-7" /></button>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-4 mb-10 border-b border-zinc-100 pb-1">
          <button 
            onClick={() => { setActiveTab('create'); setSubmitted(false); }}
            className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'create' ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            Create New
            {activeTab === 'create' && <motion.div layoutId="modalTab" className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-900 rounded-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'history' ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            History
            {activeTab === 'history' && <motion.div layoutId="modalTab" className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-900 rounded-full" />}
          </button>
        </div>

        {activeTab === 'create' ? (
          submitted ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-emerald-50 rounded-[28px] flex items-center justify-center mb-6 border border-emerald-100 mx-auto">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 mb-2">Success!</h3>
              <p className="text-zinc-500 max-w-xs mx-auto mb-2 text-sm">Your win is now live on the global network.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Full Name</label>
                  <input 
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Marcus Thorne"
                    className="w-full px-5 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium text-sm"
                  />
                </div>
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Professional Role</label>
                  <input 
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="e.g. CEO at TechFlow"
                    className="w-full px-5 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Your Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} onClick={() => setFormData({ ...formData, rating: star })} className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${formData.rating >= star ? 'bg-yellow-50 border-yellow-200 text-yellow-500' : 'bg-zinc-50 border-zinc-200 text-zinc-300'}`}>
                      <Star className={`w-5 h-5 ${formData.rating >= star ? 'fill-yellow-500' : ''}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">The Success Story</label>
                <textarea 
                  rows={4} 
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  placeholder="How has WorkVault helped your business achieve excellence?" 
                  className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-medium resize-none text-base" 
                />
              </div>
              <button 
                onClick={handleSubmit}
                className="w-full py-5 bg-zinc-900 text-white rounded-[20px] font-black text-xs uppercase tracking-widest shadow-xl shadow-zinc-900/10 hover:bg-zinc-800 transition-all mt-4"
              >
                Publish Success Story
              </button>
            </div>
          )
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {ownReviews.length > 0 ? (
              ownReviews.map((r) => (
                <div key={r.id} className="p-6 bg-zinc-50 border border-zinc-100 rounded-3xl flex items-start gap-4 hover:border-zinc-200 transition-all group">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shrink-0">
                    <img src={r.image} alt={r.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-zinc-900">{r.name}</h4>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{r.role}</p>
                      </div>
                      <button 
                        onClick={() => onDeleteReview(r.id)}
                        className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-zinc-600 text-xs leading-relaxed line-clamp-2">"{r.text}"</p>
                    <div className="flex items-center gap-1 mt-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-200'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center">
                <p className="text-zinc-400 font-bold uppercase tracking-widest text-[10px]">No stories published yet.</p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'explore' | 'app' | 'freelance' | 'freelance-registration' | 'auth' | 'about'>('landing');
  const [previousView, setPreviousView] = useState<'landing' | 'explore' | 'app' | 'freelance' | 'freelance-registration' | 'auth' | 'about'>('landing');
  const [activeTab, setActiveTab] = useState('profile');
  const [authConfig, setAuthConfig] = useState<{ role: 'freelancer' | 'client', isActive: boolean }>({ role: 'freelancer', isActive: false });
  const [user, setUser] = useState<User | null>(null);
  const [explorerFreelancers, setExplorerFreelancers] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'freelancer' | 'client'>('freelancer');
  const [selectedFreelancer, setSelectedFreelancer] = useState<any>(null);
  const [chats, setChats] = useState([
    { 
      id: 1, 
      name: 'Google Design Team', 
      msg: 'The prototypes look excellent. Let\'s review tomorrow.', 
      time: '10:42 AM', 
      unread: 2,
      messages: [
        { id: 1, sender: 'other', text: 'Hi there! We reviewed your latest submissions.', time: '10:30 AM' },
        { id: 2, sender: 'me', text: 'Thank you! I\'m glad to hear that. Were there any revisions needed?', time: '10:35 AM' },
        { id: 3, sender: 'other', text: 'The prototypes look excellent. Let\'s review tomorrow on our sync.', time: '10:42 AM' },
      ]
    },
    { 
      id: 2, 
      name: 'Vercel Connect', 
      msg: 'Contract has been signed and funded.', 
      time: 'Yesterday', 
      unread: 0,
      messages: [
        { id: 1, sender: 'other', text: 'Hey! The contract is ready for your signature.', time: 'Yesterday 2:15 PM' },
        { id: 2, sender: 'me', text: 'Signed it! Let me know when it\'s funded.', time: 'Yesterday 2:30 PM' },
        { id: 3, sender: 'other', text: 'Contract has been signed and funded.', time: 'Yesterday 3:00 PM' },
      ]
    },
    { 
      id: 3, 
      name: 'Stripe Partners', 
      msg: 'Could you adjust the margin on the pricing page?', 
      time: 'Tue', 
      unread: 0,
      messages: [
        { id: 1, sender: 'other', text: 'Could you adjust the margin on the pricing page?', time: 'Tue 4:00 PM' },
      ]
    },
  ]);
  const [activeChatId, setActiveChatId] = useState<number>(1);
  const [isSuccessStoryModalOpen, setIsSuccessStoryModalOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const objectPath = `${user.id}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(objectPath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(objectPath);
      const avatarUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id as any);
      if (updateError) throw updateError;

      setUser({ ...user, avatar: avatarUrl });
    } catch (err) {
      console.error('Avatar upload error:', err);
      alert('Failed to upload photo. Please try again.');
    }
  };

  const handleAvatarDelete = async () => {
    if (!user) return;
    try {
      const marker = '/storage/v1/object/public/avatars/';
      if (user.avatar?.includes(marker)) {
        const objectPath = user.avatar.split(marker)[1];
        if (objectPath) {
          await supabase.storage.from('avatars').remove([objectPath]);
        }
      }

      const defaultAvatar = `https://i.pravatar.cc/150?u=${user.id}`;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: defaultAvatar })
        .eq('id', user.id as any);
      if (updateError) throw updateError;

      setUser({ ...user, avatar: defaultAvatar });
    } catch (err) {
      console.error('Avatar removal error:', err);
      alert('Failed to remove photo.');
    }
  };

  const handleDeleteReview = (id: number) => {
    setReviews(prev => prev.filter(r => r.id !== id));
  };

  // Expose modal trigger to window for component communication
  useEffect(() => {
    (window as any).openSuccessStoryModal = () => setIsSuccessStoryModalOpen(true);
    return () => { (window as any).openSuccessStoryModal = undefined; };
  }, []);
  const [pendingProposal, setPendingProposal] = useState<{name: string, brief: string} | null>(null);
  const [favourites, setFavourites] = useState<Array<string | number>>([]);
  const [pendingFavourite, setPendingFavourite] = useState<string | number | null>(null);

  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [notingProject, setNotingProject] = useState<Project | null>(null);
  const [currentNotes, setCurrentNotes] = useState('');
  const [isAddPortfolioModalOpen, setIsAddPortfolioModalOpen] = useState(false);
  const [portfolioItems, setPortfolioItems] = useState<any[]>([]);
  const [selectedFreelancerPortfolioItems, setSelectedFreelancerPortfolioItems] = useState<any[]>([]);

  const openNotesModal = (p: Project) => {
    setNotingProject(p);
    setCurrentNotes(p.notes || '');
    setIsNotesModalOpen(true);
  };

  const handleSaveNotes = () => {
    if (notingProject) {
      setProjects(prev => prev.map(p => p.id === notingProject.id ? { ...notingProject, notes: currentNotes } : p));
    }
    setIsNotesModalOpen(false);
  };

  const toggleFavourite = (id: string | number) => {
    if (currentView !== 'app') {
       setPendingFavourite(id);
       setCurrentView('auth');
       return;
    }
    setFavourites(prev => prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]);
  };

  const handleUpdateProfile = async (updatedUser: User) => {
    try {
      const profilePayload = updatedUser.profile || {};
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ name: updatedUser.name })
        .eq('id', updatedUser.id as any);

      if (profileError) throw profileError;

      if (updatedUser.role === 'freelancer') {
        let parsedSkills: any[] = [];
        let parsedExperience: any[] = [];
        try { parsedSkills = JSON.parse((profilePayload as any).skills || '[]'); } catch {}
        try { parsedExperience = JSON.parse((profilePayload as any).experience || '[]'); } catch {}

        const { error } = await supabase
          .from('freelancer_profiles')
          .update({
            bio: (profilePayload as any).bio || '',
            skills: parsedSkills,
            experience: parsedExperience,
            location: (profilePayload as any).location || '',
            hourly_rate: Number((profilePayload as any).hourly_rate || 0),
            designation: (profilePayload as any).designation || '',
            tagline: (profilePayload as any).tagline || '',
            years_exp: (profilePayload as any).years_exp || '',
            projects_count: (profilePayload as any).projects_count || '',
            rating_status: (profilePayload as any).rating_status || '',
          })
          .eq('user_id', updatedUser.id as any);
        if (error) throw error;
      } else if (updatedUser.role === 'client') {
        const { error } = await supabase
          .from('client_profiles')
          .update({
            bio: (profilePayload as any).bio || '',
            location: (profilePayload as any).location || '',
            designation: (profilePayload as any).designation || '',
            total_investment: (profilePayload as any).total_investment || '',
            projects_posted: (profilePayload as any).projects_posted || '',
            network_rating: (profilePayload as any).network_rating || '',
          })
          .eq('user_id', updatedUser.id as any);
        if (error) throw error;
      }

      setUser(updatedUser);
      // Also sync with explorerFreelancers if the user is a freelancer
      if (updatedUser.role === 'freelancer') {
        setExplorerFreelancers(prev => prev.map(f => f.id === updatedUser.id ? {
          ...f,
          name: updatedUser.name,
          role: updatedUser.role,
          profileImage: updatedUser.avatar,
          hourly_rate: (updatedUser.profile as FreelancerProfile)?.hourly_rate || f.hourly_rate,
          category: JSON.parse((updatedUser.profile as FreelancerProfile)?.skills || '[]')[0] || f.category,
          experience: (updatedUser.profile as FreelancerProfile)?.experience || f.experience
        } : f));
      }

      // Keep portfolio in sync for the signed-in freelancer.
      if (updatedUser.role === 'freelancer') {
        const refreshedPortfolio = await loadPortfolioItemsFromSupabase(String(updatedUser.id)).catch(() => []);
        setPortfolioItems(refreshedPortfolio);
      }
    } catch (error) {
      console.error("Profile update error:", error);
      alert("Failed to save profile changes. Please try again.");
    }
  };

  const handleAddProject = async (projectDraft: any) => {
    const optimisticProject = projectDraft;
    setProjects(prev => [optimisticProject, ...prev]);

    if (!user) return;

    try {
      const budgetValue = Number(String(projectDraft.budget || '0').replace(/[^0-9.-]/g, ''));
      const { data, error } = await supabase
        .from('projects')
        .insert({
          freelancer_id: userRole === 'freelancer' ? (user.id as any) : null,
          client_id: userRole === 'client' ? (user.id as any) : null,
          title: projectDraft.title || '',
          description: projectDraft.description || '',
          status: projectDraft.status || 'pending',
          start_date: projectDraft.start_date || null,
          deadline: projectDraft.deadline || null,
          budget: Number.isFinite(budgetValue) ? budgetValue : 0,
          progress: projectDraft.progress ?? 0,
          notes: projectDraft.notes || null,
        })
        .select('id')
        .single();

      if (error) throw error;
      if (data?.id) {
        setProjects(prev => prev.map(p => p.id === optimisticProject.id ? { ...p, id: data.id } : p));
      }
    } catch (error) {
      console.error('Project create error:', error);
    }
  };

  const handleUpdateProject = async (updatedProject: any) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    if (!isUuid(updatedProject.id)) return;

    try {
      const budgetValue = Number(String(updatedProject.budget || '0').replace(/[^0-9.-]/g, ''));
      const { error } = await supabase
        .from('projects')
        .update({
          title: updatedProject.title,
          description: updatedProject.description || '',
          status: updatedProject.status || 'pending',
          start_date: updatedProject.start_date || null,
          deadline: updatedProject.deadline || null,
          budget: Number.isFinite(budgetValue) ? budgetValue : 0,
          progress: updatedProject.progress ?? 0,
          notes: updatedProject.notes || null,
        })
        .eq('id', updatedProject.id);

      if (error) throw error;
    } catch (error) {
      console.error('Project update error:', error);
    }
  };

  const refreshFreelancers = async () => {
    try {
      const rows = await loadFreelancersFromSupabase();
      setExplorerFreelancers(rows);
    } catch (error) {
      console.error('Freelancer load error:', error);
      setExplorerFreelancers([]);
    }
  };

  const openFreelancerProfile = async (freelancer: any) => {
    setSelectedFreelancer(freelancer);
    try {
      const items = await loadPortfolioItemsFromSupabase(String(freelancer.id));
      setSelectedFreelancerPortfolioItems(items);
    } catch (error) {
      console.error('Portfolio load error:', error);
      setSelectedFreelancerPortfolioItems([]);
    }
  };

  const refreshOwnPortfolio = async (freelancerId: string) => {
    const items = await loadPortfolioItemsFromSupabase(freelancerId).catch(() => []);
    setPortfolioItems(items);
  };

  const handleAddPortfolioItem = async (draft: any) => {
    if (!user) return;
    const payload = {
      freelancer_id: user.id as any,
      title: draft.title || '',
      description: draft.description || '',
      image_url: draft.image || draft.image_url || '',
      link: draft.link || null,
      sort_order: 0,
      category: draft.category || null,
      year: draft.year || null,
      capabilities: Array.isArray(draft.capabilities) ? draft.capabilities : [],
    };

    const { data, error } = await supabase
      .from('portfolio_items')
      .insert(payload)
      .select('id, freelancer_id, title, description, image_url, link, sort_order, category, year, capabilities')
      .single();

    if (error) throw error;
    if (data) {
      setPortfolioItems(prev => [data, ...prev]);
    }
  };

  const handleUpdatePortfolioItem = async (updated: any) => {
    if (!updated?.id || !isUuid(updated.id)) return;
    const payload = {
      title: updated.title || '',
      description: updated.description || '',
      image_url: updated.image || updated.image_url || '',
      link: updated.link || null,
      category: updated.category || null,
      year: updated.year || null,
      capabilities: Array.isArray(updated.capabilities) ? updated.capabilities : [],
    };

    const { error } = await supabase.from('portfolio_items').update(payload).eq('id', updated.id);
    if (error) throw error;
    setPortfolioItems(prev => prev.map(p => p.id === updated.id ? { ...p, ...payload } : p));
  };

  const handleDeletePortfolioItem = async (id: any) => {
    if (!id || !isUuid(id)) return;
    const previous = portfolioItems;
    setPortfolioItems(prev => prev.filter(p => p.id !== id));
    const { error } = await supabase.from('portfolio_items').delete().eq('id', id);
    if (error) {
      setPortfolioItems(previous);
      throw error;
    }
  };

  const handleSendProposal = (freelancerName: string, brief: string) => {
    if (currentView !== 'app') {
      setPendingProposal({ name: freelancerName, brief });
      setCurrentView('auth');
      setSelectedFreelancer(null);
      return;
    }

    const newChat = {
      id: Date.now(),
      name: freelancerName,
      msg: `Proposal Concept: ${brief}`,
      time: 'Just now',
      unread: 0
    };
    setChats(prev => [newChat, ...prev]);
    setUserRole('client');
    setCurrentView('app');
    setActiveTab('messages');
    setSelectedFreelancer(null);
  };

  const handleSendMessage = (chatId: number, text: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        return {
          ...chat,
          msg: text,
          time: 'Just now',
          messages: [
            ...chat.messages,
            { id: Date.now(), sender: 'me', text, time }
          ]
        };
      }
      return chat;
    }));
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const userRes = await loadCurrentSupabaseUser().catch(() => null);
        const [projectsRes, clientsRes] = userRes
          ? await Promise.all([
              loadProjectsFromSupabase(String(userRes.id)).catch(() => []),
              loadClientsFromSupabase(String(userRes.id)).catch(() => []),
            ])
          : [[], []];

        if (userRes) {
          setUserRole(userRes.role === 'client' ? 'client' : 'freelancer');
          setUser(userRes);
          if (userRes.role === 'freelancer') {
            const items = await loadPortfolioItemsFromSupabase(String(userRes.id)).catch(() => []);
            setPortfolioItems(items);
          } else {
            setPortfolioItems([]);
          }
        } else {
          // If not logged in and in app view, redirect to auth.
          if (currentView === 'app') {
            setCurrentView('auth');
          }
        }

        if (projectsRes.length > 0) setProjects(projectsRes);
        else {
           setProjects([
            { id: 'p1', title: 'Stripe Checkout Redesign', description: 'Redesign the core checkout flow for higher conversion.', budget: '12,000', status: 'in_progress', deadline: 'Oct 30, 2024', client_name: 'Stripe Partners', progress: 65 } as any,
            { id: 'p2', title: 'Vercel App Directory', description: 'Design a directory layout for integrations.', budget: '8,500', status: 'completed', deadline: 'Sep 15, 2024', client_name: 'Vercel Connect', progress: 100 } as any,
            { id: 'p3', title: 'Google Design System', description: 'Component implementation for new specs.', budget: '24,000', status: 'pending', deadline: 'Nov 15, 2024', client_name: 'Google Design Team', progress: 0 } as any,
            { id: 'p4', title: 'AI Platform UI', description: 'Building a complex dashboard for LLM monitoring.', budget: '18,500', status: 'in_progress', deadline: 'Dec 05, 2024', client_name: 'Anthropic AI', progress: 35 } as any,
            { id: 'p5', title: 'Global Branding', description: 'Creating a cohesive brand identity for a fintech startup.', budget: '32,000', status: 'completed', deadline: 'Aug 22, 2024', client_name: 'NuBank', progress: 100 } as any,
            { id: 'p6', title: 'Mobile App Concept', description: 'Designing a futuristic fitness tracking application.', budget: '9,200', status: 'pending', deadline: 'Jan 12, 2025', client_name: 'FitFlow', progress: 0 } as any,
            { id: 'p7', title: 'Enterprise Dashboard', description: 'Redesigning the internal data visualization suite.', budget: '15,000', status: 'in_progress', deadline: 'Nov 20, 2024', client_name: 'Salesforce', progress: 85 } as any,
          ]);
        }

        if (clientsRes.length > 0) setClients(clientsRes);
        else {
          setClients([
            { id: 'c1', name: 'Google Design Team', company: 'Google', email: 'jordan@google.com' } as any,
            { id: 'c2', name: 'Stripe Partners', company: 'Stripe', email: 'alex@stripe.com' } as any,
            { id: 'c3', name: 'Vercel Connect', company: 'Vercel', email: 'schen@vercel.com' } as any
          ]);
        }
      } finally {
        setLoading(false);
      }
    };

    if (currentView === 'app' && !user) {
      fetchData();
    } else if (currentView !== 'app') {
      setLoading(false);
    }
  }, [currentView, user]);

  useEffect(() => {
    refreshFreelancers();
  }, []);

  if (loading && currentView === 'app') { // Only show loader if loading for the main app
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-zinc-100 border-t-primary rounded-full"
        />
      </div>
    );
  }

  const navigateToAuth = () => {
    setPreviousView(currentView);
    setCurrentView('auth');
  };

  if (currentView === 'auth') {
    return <AuthPage onBack={() => setCurrentView(previousView)} onLoginSuccess={(loggedinUser) => { 
      setUserRole(loggedinUser.role === 'client' ? 'client' : 'freelancer');
      setUser(loggedinUser);
      refreshFreelancers();
      if (loggedinUser?.id) refreshOwnPortfolio(String(loggedinUser.id));
      setCurrentView('app'); 
      if (pendingProposal) {
         const newChat = {
           id: Date.now(),
           name: pendingProposal.name,
           msg: `Proposal Concept: ${pendingProposal.brief}`,
           time: 'Just now',
           unread: 0
         };
         setChats(prev => [newChat, ...prev]);
         setActiveTab('messages');
         setPendingProposal(null);
      }
      if (pendingFavourite !== null) {
         setFavourites(prev => prev.includes(pendingFavourite) ? prev : [...prev, pendingFavourite]);
         setActiveTab('browse');
         setPendingFavourite(null);
      }
    }} />;
  }

  if (currentView === 'about') {
    return (
      <AboutPage
        onBack={() => setCurrentView('landing')}
        onSignIn={navigateToAuth}
        onExplore={() => setCurrentView('explore')}
        onFreelance={() => setCurrentView('freelance')}
      />
    );
  }

  if (currentView === 'explore') {
    return (
      <div className="relative min-h-screen">
        <ExplorePage
          onBack={() => setCurrentView('landing')}
          onSignIn={navigateToAuth}
          onExplore={() => {}}
          onFreelance={() => setCurrentView('freelance')}
          onAbout={() => setCurrentView('about')}
          onProfileClick={(f) => openFreelancerProfile(f)}
          favourites={favourites}
          onToggleFavourite={toggleFavourite}
          freelancers={explorerFreelancers}
        />
        {selectedFreelancer && (
          <div className="fixed inset-0 z-[60] bg-surface overflow-y-auto pt-8 pb-20 px-8">
            <ProfilePage 
              user={selectedFreelancer} 
              isOwnProfile={user?.id === selectedFreelancer?.id} 
              onBack={() => setSelectedFreelancer(null)}
              onSendProposal={(brief) => handleSendProposal(selectedFreelancer.name, brief)}
              onUpdateProfile={handleUpdateProfile}
              onNavigateToPortfolio={() => setActiveTab('portfolio')}
              portfolioItems={selectedFreelancerPortfolioItems}
              favourites={favourites}
              onToggleFavourite={toggleFavourite}
            />
          </div>
        )}
      </div>
    );
  }

  if (currentView === 'freelance') {
    return (
      <FreelancePage 
        onBack={() => setCurrentView('landing')} 
        onSignIn={navigateToAuth} 
        onExplore={() => setCurrentView('explore')}
        onRegistrationStart={navigateToAuth}
        onAbout={() => setCurrentView('about')}
      />
    );
  }



  if (currentView === 'landing') {
    return (
      <div className="relative min-h-screen">
        <LandingPage
          onEnterApp={navigateToAuth}
          onExplore={() => setCurrentView('explore')}
          onFreelance={() => setCurrentView('freelance')}
          onAbout={() => setCurrentView('about')}
          activeTab={currentView === 'about' ? 'About' : currentView === 'explore' ? 'Explore' : currentView === 'freelance' ? 'Freelance' : ''}
          favourites={favourites}
          onToggleFavourite={toggleFavourite}
          freelancers={explorerFreelancers}
          onProfileClick={(f) => openFreelancerProfile(f)}
          reviews={reviews}
        />
        {selectedFreelancer && (
          <div className="fixed inset-0 z-[60] bg-surface overflow-y-auto pt-8 pb-20 px-8">
            <ProfilePage 
              user={{
                id: selectedFreelancer.id,
                name: selectedFreelancer.name,
                role: selectedFreelancer.role,
                avatar: selectedFreelancer.profileImage,
                email: 'contact@workvault.io',
                profile: {
                  bio: `${selectedFreelancer.name} is a top-tier ${selectedFreelancer.role} specializing in ${selectedFreelancer.category}. With a ${selectedFreelancer.rating} rating, they are one of our most trusted professionals.`,
                  location: 'Remote / Global',
                  skills: JSON.stringify(['Strategy', 'Execution', selectedFreelancer.category, 'Communication']),
                  hourly_rate: selectedFreelancer.price || 150,
                  experience: JSON.stringify([])
                }
              } as any}
              isOwnProfile={user?.id === selectedFreelancer?.id} 
              onBack={() => setSelectedFreelancer(null)}
              onSendProposal={(brief) => handleSendProposal(selectedFreelancer.name, brief)}
              favourites={favourites}
              onToggleFavourite={toggleFavourite}
              onUpdateProfile={handleUpdateProfile}
              onNavigateToPortfolio={() => setActiveTab('portfolio')}
              portfolioItems={selectedFreelancerPortfolioItems}
              onUpdateItem={(updated) => setPortfolioItems(prev => prev.map(item => item.id === updated.id ? updated : item))}
              onDeleteItem={(id) => setPortfolioItems(prev => prev.filter(item => item.id !== id))}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} role={userRole} onBackToLanding={() => setCurrentView('landing')} onSignOut={async () => {
         await supabase.auth.signOut();
         setUser(null);
         setCurrentView('auth');
      }} />
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
        {activeTab !== 'browse' && (
          <Header 
            user={user} 
            onBackToLanding={() => setCurrentView('landing')} 
            onNotificationClick={() => setActiveTab('notifications')}
          />
        )}
        <main className={`flex-1 ${activeTab === 'browse' ? 'p-0' : 'p-8'} overflow-y-auto`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <Dashboard 
                projects={projects} 
                user={user} 
                role={userRole} 
                freelancers={explorerFreelancers}
                setActiveTab={setActiveTab} 
                onAddProject={handleAddProject} 
                onOpenNotes={openNotesModal} 
                favourites={favourites}
                onProfileClick={(f) => {
                  setSelectedFreelancer(f);
                  setActiveTab('browse');
                }}
              />}
              {activeTab === 'favourites' && userRole === 'client' && (
                <FavouritesPage 
                  favourites={favourites} 
                  freelancers={explorerFreelancers}
                  setActiveTab={setActiveTab}
                  onProfileClick={(f) => {
                    setSelectedFreelancer(f);
                    setActiveTab('browse');
                  }}
                />
              )}
              {activeTab === 'projects' && <ProjectsPage 
                projects={projects} 
                onAddProject={handleAddProject} 
                onUpdateProject={handleUpdateProject}
                onOpenNotes={openNotesModal}
                onSendMessage={(client) => {
                  setActiveTab('messages');
                  // We don't have setSelectedChat available here, but setActiveTab is enough for now
                }}
              />}
              {activeTab === 'clients' && <ClientsPage clients={clients} />}
              {activeTab === 'profile' && <ProfilePage user={user} onUpdateProfile={handleUpdateProfile} onAvatarUpload={handleAvatarUpload} onAvatarDelete={handleAvatarDelete} onNavigateToPortfolio={() => setActiveTab('portfolio')} portfolioItems={portfolioItems} onUpdateItem={handleUpdatePortfolioItem} onDeleteItem={handleDeletePortfolioItem} favourites={favourites} onToggleFavourite={toggleFavourite} />}
              {activeTab === 'portfolio' && <PortfolioPage 
                items={portfolioItems} 
                onOpenAddModal={() => setIsAddPortfolioModalOpen(true)} 
                onDeleteItem={handleDeletePortfolioItem}
                onUpdateItem={handleUpdatePortfolioItem}
              />}
              {activeTab === 'notifications' && <NotificationsPage />}
              {activeTab === 'browse' && (
                <ExplorePage 
                  onBack={() => setActiveTab('dashboard')} 
                  onSignIn={() => {}} 
                  onExplore={() => {}} 
                  onFreelance={() => {}} 
                  onAbout={() => {}} 
                  onProfileClick={(f) => openFreelancerProfile(f)}
                  isSignedIn={true}
                  favourites={favourites}
                  onToggleFavourite={toggleFavourite}
                  freelancers={explorerFreelancers}
                  hideNavbarLinks={true}
                />
              )}
              {activeTab === 'browse' && selectedFreelancer && (
                <div className="fixed inset-0 z-[60] bg-surface overflow-y-auto pt-8 pb-20 px-8">
                  <ProfilePage 
                    user={{
                      id: selectedFreelancer.id,
                      name: selectedFreelancer.name,
                      role: selectedFreelancer.role,
                      avatar: selectedFreelancer.profileImage,
                      email: 'contact@workvault.io',
                      profile: {
                        bio: `${selectedFreelancer.name} is a top-tier ${selectedFreelancer.role} specializing in ${selectedFreelancer.category}. With a ${selectedFreelancer.rating} rating, they are one of our most trusted professionals.`,
                        location: 'Remote / Global',
                        skills: JSON.stringify(['Strategy', 'Execution', selectedFreelancer.category, 'Communication']),
                        hourly_rate: selectedFreelancer.hourly_rate,
                        experience: selectedFreelancer.experience || JSON.stringify([])
                      }
                    } as any}
                    isOwnProfile={user?.id === selectedFreelancer?.id} 
                    onBack={() => setSelectedFreelancer(null)}
                    onSendProposal={(brief) => handleSendProposal(selectedFreelancer.name, brief)}
                    favourites={favourites}
                    onToggleFavourite={toggleFavourite}
                    onUpdateProfile={handleUpdateProfile}
                    onNavigateToPortfolio={() => setActiveTab('portfolio')}
                    portfolioItems={selectedFreelancerPortfolioItems}
                    onUpdateItem={(updated) => setPortfolioItems(prev => prev.map(item => item.id === updated.id ? updated : item))}
                    onDeleteItem={(id) => setPortfolioItems(prev => prev.filter(item => item.id !== id))}
                  />
                </div>
              )}
              {activeTab === 'users' && <UserManagementPage />}
              {activeTab === 'monitoring' && <ProjectMonitoringPage />}
              {activeTab === 'reports' && <ReportsPage />}
              {activeTab === 'messages' && (
                <MessagesPage 
                  chats={chats} 
                  activeChatId={activeChatId}
                  setActiveChatId={setActiveChatId}
                  onSendMessage={handleSendMessage}
                />
              )}
              {activeTab === 'settings' && <SettingsPage user={user} onUpdateUser={handleUpdateProfile} onDeleteAccount={() => {
                setUser(null);
                setCurrentView('landing');
              }} />}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer hidden on Messages and Profile page for full height UI */}
        {!['messages', 'profile'].includes(activeTab) && (
          <footer className="p-12 border-t border-zinc-100/50 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-black tracking-tighter text-zinc-900">WorkVault</span>
            </div>
            <div className="text-zinc-400 text-[10px] uppercase tracking-widest font-bold">
              &copy; 2024 WorkVault. All Rights Reserved.
            </div>
          </footer>
        )}
      </div>

      {/* Global Project Notes Modal */}
      <AnimatePresence>
        {isNotesModalOpen && notingProject && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNotesModalOpen(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden border border-zinc-100"
            >
              <div className="p-10">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h2 className="text-3xl font-black font-display text-zinc-900 uppercase">PROJECT NOTES</h2>
                    <p className="text-zinc-500 mt-1">{notingProject.title}</p>
                  </div>
                  <button onClick={() => setIsNotesModalOpen(false)} className="p-3 hover:bg-zinc-100 rounded-2xl transition-colors text-zinc-400">
                    <X className="w-7 h-7" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">NOTES</label>
                    <textarea 
                      placeholder="Type your notes here..." 
                      value={currentNotes}
                      onChange={(e) => setCurrentNotes(e.target.value)}
                      className="w-full h-48 px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/40 focus:bg-white transition-all font-medium text-zinc-900 placeholder:text-zinc-300 resize-none"
                    />
                  </div>

                  <div className="pt-6 flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setIsNotesModalOpen(false)}
                      className="flex-1 py-5 px-8 rounded-2xl font-black text-xs uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 transition-all"
                    >
                      CANCEL
                    </button>
                    <button 
                      type="button"
                      onClick={handleSaveNotes}
                      className="flex-1 py-5 px-8 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all hover:-translate-y-1 active:translate-y-0"
                    >
                      SAVE NOTES
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddPortfolioModalOpen && (
          <AddPortfolioModal 
            isOpen={isAddPortfolioModalOpen} 
            onClose={() => setIsAddPortfolioModalOpen(false)} 
            onAdd={async (item) => {
              try {
                await handleAddPortfolioItem(item);
                if (user?.id) {
                  const items = await loadPortfolioItemsFromSupabase(String(user.id)).catch(() => []);
                  setPortfolioItems(items);
                }
              } catch (e) {
                console.error('Portfolio add error:', e);
                alert('Failed to add portfolio item. Please try again.');
              }
            }} 
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isSuccessStoryModalOpen && (
          <SuccessStoryModal 
            isOpen={isSuccessStoryModalOpen} 
            onClose={() => setIsSuccessStoryModalOpen(false)} 
            onAddReview={(newReview) => setReviews(prev => [newReview, ...prev])}
            reviews={reviews}
            onDeleteReview={handleDeleteReview}
            currentUserId={user?.id || 101}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
