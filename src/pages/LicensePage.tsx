import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Key, 
  CreditCard, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Cpu,
  Zap,
  Star,
  Crown,
  RefreshCcw,
  Mail,
  MessageSquare,
  ArrowRight,
  HelpCircle,
  Award,
  Sparkles,
  TrendingUp,
  Smartphone,
  Check,
  ChevronDown
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Spinner } from '../components/ui/Spinner';
import { activateLicense, verifyLicense, getHardwareId } from '../lib/licensing';
import { PRICING, CONTACT_INFO } from '../constants/pricing';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/ui/Logo';

export const LicensePage: React.FC = () => {
  const { showToast } = useToast();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [status, setStatus] = useState<{ isValid: boolean; expiresAt: string | null; plan?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Landing page interactive state
  const [activeTab, setActiveTab] = useState<'landing' | 'activation'>('landing');
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({
    0: true,
    1: false,
    2: false,
    3: false
  });

  useEffect(() => {
    // Ensure landing page does not follow the Dark Themes rule
    document.documentElement.classList.remove('dark');
    
    setEmail(localStorage.getItem('uprecord_license_email') || localStorage.getItem('scholarsync_license_email') || localStorage.getItem('kardian_license_email') || '');
    setLicenseKey(localStorage.getItem('uprecord_license_key') || localStorage.getItem('scholarsync_license_key') || localStorage.getItem('kardian_license_key') || '');
    
    const check = async () => {
      const storedEmail = localStorage.getItem('uprecord_license_email') || localStorage.getItem('scholarsync_license_email') || localStorage.getItem('kardian_license_email');
      const storedKey = localStorage.getItem('uprecord_license_key') || localStorage.getItem('scholarsync_license_key') || localStorage.getItem('kardian_license_key');
      if (storedEmail && storedKey) {
        try {
          const res = await verifyLicense(storedEmail, storedKey);
          setStatus(res);
        } catch (e) {
          console.error("License verification failed", e);
        }
      }
      setIsLoading(false);
    };
    check();
  }, []);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !licenseKey.trim()) {
      showToast('Please enter both email and license key', 'error');
      return;
    }

    setIsActivating(true);
    try {
      const res = await activateLicense(email.trim(), licenseKey.trim().toUpperCase());
      if (res.isValid) {
        showToast('License activated successfully!', 'success');
        setStatus(res);
      } else {
        showToast(res.error || 'Invalid license key or activation failed', 'error');
      }
    } catch (error) {
      showToast('Activation error. Please check your connection.', 'error');
    } finally {
      setIsActivating(false);
    }
  };

  const handleRefresh = async () => {
    if (!email || !licenseKey) return;
    setIsRefreshing(true);
    try {
      const res = await verifyLicense(email, licenseKey);
      setStatus(res);
      showToast('License status updated', 'success');
    } catch (error) {
      showToast('Failed to refresh status', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const isExpired = status?.expiresAt && status.expiresAt !== 'lifetime' 
    ? new Date(status.expiresAt) < new Date() 
    : status?.isValid ? false : true;

  const daysRemaining = status?.expiresAt && status.expiresAt !== 'lifetime'
    ? Math.ceil((new Date(status.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const hardwareId = getHardwareId();

  const toggleFaq = (index: number) => {
    setFaqOpen(prev => ({ ...prev, [index]: !prev[index] }));
  };

  if (isLoading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Generate whatsapp message link
  const waLink = `https://wa.me/${CONTACT_INFO.whatsapp}?text=Hello%20UpRecord%20Support%2C%20I%2520would%2520like%2520to%2520onboard%2520my%2520school%2520and%2520purchase%2520a%2520license%2520key!`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased overflow-x-hidden">
      {/* Premium Public Header Navbar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/60 py-4 px-4 sm:px-6 md:px-12 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
          <div className="flex items-center gap-2.5 w-full justify-center md:justify-start md:w-auto">
            <Logo size={32} variant="icon" />
            <div className="text-lg tracking-tight font-sans">
              <span className="font-extrabold text-slate-900">Up</span>
              <span className="font-medium text-[#DC2626]">Record</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap w-full md:w-auto">
            <button
              onClick={() => setActiveTab('landing')}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'landing' ? 'text-slate-900 bg-slate-100' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Discover
            </button>
            <button
              onClick={() => setActiveTab('activation')}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'activation' ? 'text-slate-900 bg-slate-100' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Activation Desk
            </button>
            
            <div className="hidden sm:block h-4 w-px bg-slate-200" />

            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white text-[0.6875rem] font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-slate-900/10"
              >
                Dashboard
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-[0.6875rem] font-black uppercase tracking-wider text-slate-600 hover:text-slate-900 px-3 py-2 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white text-[0.6875rem] font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-slate-900/10"
                >
                  Register School
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main content viewport space */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 md:px-12 py-10 space-y-16">

      {activeTab === 'landing' ? (
        /* High-Converting sales landing page */
        <div className="space-y-24">
          
          {/* Main Hero Section with ambient background glow */}
          <div className="relative rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-12 lg:p-16 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[140px] -mr-40 -mt-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-600/10 rounded-full blur-[100px] -ml-20 -mb-20 pointer-events-none" />
            
            <div className="max-w-4xl space-y-8 relative">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/10 backdrop-blur-md rounded-full text-xs font-semibold tracking-wider text-emerald-300">
                <Crown className="w-4 h-4 text-emerald-400" />
                WEST AFRICA'S #1 SCHOOL OPERATING SYSTEM
              </div>
              
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black italic tracking-tight leading-[1.05] max-w-3xl">
                The Operating System For <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">Modern African Schools</span>
              </h2>
              
              <p className="text-slate-300 text-base sm:text-lg max-w-2xl font-medium leading-relaxed">
                Empower your administrators, delight your parents, and reduce compilation times by 90%. Auto-generate standard West African report cards, audit finances, and coordinate attendance on one stellar web interface.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <a 
                  href={waLink}
                  target="_blank"
                  referrerPolicy="no-referrer"
                  className="flex items-center justify-center gap-2.5 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 text-sm font-black uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-emerald-500/20"
                >
                  <MessageSquare className="w-4 h-4" />
                  Request Free Setup via WhatsApp
                </a>
                <button 
                  onClick={() => setActiveTab('activation')}
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/15 active:scale-95 text-white border border-white/10 text-sm font-bold uppercase tracking-wider rounded-2xl transition-all"
                >
                  <Key className="w-4 h-4 text-blue-400" />
                  Activate License key
                </button>
              </div>
            </div>
          </div>

          {/* Key Value Proposition Stats banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center bg-slate-50 border border-slate-200/50 p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem]">
            <div className="space-y-2">
              <div className="text-4xl font-black text-slate-900">92%</div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Time Reduction on Grading</p>
              <p className="text-[0.6875rem] text-slate-500 font-medium px-4">Automatic cumulative calculations, grades mapping, and smart remark generation.</p>
            </div>
            <div className="border-y md:border-y-0 md:border-x border-slate-200/50 py-6 md:py-0 space-y-2">
              <div className="text-4xl font-black text-slate-900">₦240k+</div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Annual Print Costs Saved</p>
              <p className="text-[0.6875rem] text-slate-500 font-medium px-4">Digital delivery via elegant PDF report card assets saves thousands in physical paper copies.</p>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-black text-slate-900">100%</div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Offline-First Safety</p>
              <p className="text-[0.6875rem] text-slate-500 font-medium px-4">Complete client database hosting ensures flawless operation without sluggish internet connectivity.</p>
            </div>
          </div>

          {/* Features Bento Grid */}
          <div className="space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-2 break-words">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">Engineered for Complete Efficiency</h3>
              <p className="text-slate-500 text-sm">Everything you need to run a high-performing education hub from a single screen layout</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Feature 1 */}
              <div className="md:col-span-7 bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 hover:border-slate-300 transition-all space-y-6 flex flex-col justify-between shadow-sm">
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <h4 className="text-xl font-black tracking-tight text-slate-950">Intelligent Report Cards & Custom Branding</h4>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed">
                    Custom scale definitions, cumulative term aggregates, attendance integration, behavioral traits/skills matrices, and automated head-teacher remarks. Export records instantly to professionally structured PDF portfolios with custom logo assets.
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest">Includes Classic, Modern, and Minimal designs</span>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                </div>
              </div>

              {/* Feature 2 */}
              <div className="md:col-span-5 bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 hover:border-slate-300 transition-all space-y-6 flex flex-col justify-between shadow-sm">
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <h4 className="text-xl font-black tracking-tight text-slate-950">Three-Tier Role Portals</h4>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed">
                    Personalized workspaces for administrative owners (full insights, tuition setups, backups), dedicated dashboards for class teachers (fast scores input, attendance registries), and direct logins for school students.
                  </p>
                </div>
                <div className="flex gap-2 text-[0.5625rem] font-black uppercase tracking-wider text-slate-500 divide-x divide-slate-200">
                  <span className="pr-2 text-blue-600">Admin Controls</span>
                  <span className="px-2 text-emerald-600">Teacher Input</span>
                  <span className="pl-2 text-slate-800">Student Portal</span>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="md:col-span-5 bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 hover:border-slate-300 transition-all space-y-6 flex flex-col justify-between shadow-sm">
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <h4 className="text-xl font-black tracking-tight text-slate-950"> Tuition Collections & Revenue Audits</h4>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed">
                    Log payments instantly as transactions occur, compute active term tuition debts on student directories, issue digital collection receipts, and view live cash-flow statistics from your local dashboard to ensure perfect accounting.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-amber-600 font-bold">
                  <Zap className="w-4 h-4 fill-amber-500 text-amber-500" />
                  Tuition transparency & debt collection reporting
                </div>
              </div>

              {/* Feature 4 */}
              <div className="md:col-span-7 bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 hover:border-slate-300 transition-all space-y-6 flex flex-col justify-between shadow-sm">
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <h4 className="text-xl font-black tracking-tight text-slate-950">Bulk Excel Data Engines & Backup Snapshots</h4>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed">
                    Import entire student lists or term marks sheets from Excel files in 3 seconds. Restore, download, or clear your student indexes securely with standard JSON database backup tools. Flawless offline operation guarantees total local speed.
                  </p>
                </div>
                <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100/50 flex items-center justify-between text-purple-900 font-bold text-xs">
                  <span>Excel Template Importers Inside Core Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Testimonial Cards */}
          <div className="space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">Approved by Elite School Leaders</h3>
              <p className="text-slate-500 text-sm">Read stories from proprietors who upgraded from paper sheets to digital mastery</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] hover:shadow-lg transition-all space-y-6 flex flex-col justify-between">
                <p className="text-[0.9375rem] font-bold text-slate-700 italic leading-relaxed">
                  "Our teachers spent nearly 3 days computing term weights and copying remarks by hand. UpRecord completely replaced our ancient paper card sheets. Parents loved receiving detailed PDF reports in their chats, and the Excel import made standard rollouts a breeze!"
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-white font-black text-lg">
                    SA
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">Mrs. Shade Alao</h5>
                    <p className="text-[0.625rem] uppercase font-black tracking-widest text-slate-400">Proprietress, Lagos Academy</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] hover:shadow-lg transition-all space-y-6 flex flex-col justify-between">
                <p className="text-[0.9375rem] font-bold text-slate-700 italic leading-relaxed">
                  "As the school accountant, manually writing receipts was a huge bottleneck. On UpRecord, logging payment events takes half a second, tuition tracking charts automated our collections, and the complete audit trails are totally transparent."
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-white font-black text-lg">
                    CO
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">Mr. Chinedu Okafor</h5>
                    <p className="text-[0.625rem] uppercase font-black tracking-widest text-slate-400">Chief Accountant, Divine College</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Grid Section */}
          <div className="space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">Simple, Transparent Term Pricing</h3>
              <p className="text-slate-500 text-sm">Select the perfect operating framework for your school’s unique student size</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Standard Card */}
              <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border-2 border-slate-200 hover:border-slate-300 transition-all space-y-8 flex flex-col justify-between shadow-sm relative">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xl font-black text-slate-900">{PRICING.standard.name}</h4>
                      <p className="text-[0.625rem] uppercase font-black text-slate-400 tracking-wider">Perfect for small campuses</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                      <Star className="w-5 h-5 fill-blue-500" />
                    </div>
                  </div>
                  <div className="flex items-baseline text-slate-900">
                    <span className="text-4xl font-black tracking-tight">{PRICING.standard.price}</span>
                    <span className="text-sm font-bold text-slate-400 ml-1">{PRICING.standard.period}</span>
                  </div>
                  <ul className="space-y-3 pt-4 border-t border-slate-100">
                    {PRICING.standard.benefits.map((b, i) => (
                      <li key={i} className="flex items-center gap-3 text-xs text-slate-600 font-semibold">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={3} />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
                <a 
                  href={waLink}
                  target="_blank"
                  className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black uppercase tracking-wider rounded-2xl text-center block transition-all"
                >
                  Order Standard Key
                </a>
              </div>

              {/* Premium Card */}
              <div className="bg-slate-950 p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border-2 border-emerald-500 transition-all space-y-8 flex flex-col justify-between shadow-xl text-white relative">
                <div className="absolute top-4 right-4 bg-emerald-500 text-slate-950 text-[0.5625rem] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                  Most Popular
                </div>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xl font-black text-white">{PRICING.premium.name}</h4>
                      <p className="text-[0.625rem] uppercase font-black text-slate-400 tracking-wider">Full management capabilities</p>
                    </div>
                    <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center">
                      <Crown className="w-5 h-5 fill-emerald-400 text-emerald-400" />
                    </div>
                  </div>
                  <div className="flex items-baseline text-white">
                    <span className="text-4xl font-black tracking-tight text-emerald-400">{PRICING.premium.price}</span>
                    <span className="text-sm font-bold text-slate-400 ml-1">{PRICING.premium.period}</span>
                  </div>
                  <ul className="space-y-3 pt-4 border-t border-slate-800">
                    {PRICING.premium.benefits.map((b, i) => (
                      <li key={i} className="flex items-center gap-3 text-xs text-slate-300 font-semibold">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={3} />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
                <a 
                  href={waLink}
                  target="_blank"
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider rounded-2xl text-center block transition-all shadow-lg shadow-emerald-500/20"
                >
                  Onboard Premium via WhatsApp
                </a>
              </div>
            </div>
          </div>

          {/* Interactive FAQs Accordion */}
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">Frequently Asked Questions</h3>
              <p className="text-slate-500 text-sm">Need answers before deploying UpRecord? We have you configured.</p>
            </div>

            <div className="space-y-4">
              {[
                {
                  q: "How do teachers access the Scorebook system?",
                  a: "Admins register teachers on the Teachers page and define their credentials. Each teacher then logs in securely with their email/password and is only permitted to edit their assigned lessons and core attendance marks."
                },
                {
                  q: "Can UpRecord structure standard West African primary & secondary grades?",
                  a: "Yes. Our automated grade calculators map percentages into classic terminal letter brackets completely, auto-calculating averages, cumulative metrics, and custom visual performance remarks for parents."
                },
                {
                  q: "What keeps our school’s data safe in browser cache networks?",
                  a: "Your dataset is hosted safely on client side Dexie databases within secure web-sandboxes. You can download strict local backup snapshot files at any time via the Database Backups page to archive records."
                },
                {
                  q: "Can I migrate existing rosters from spreadsheet documents?",
                  a: "Yes. Our core dashboards contain standard Excel/CSV templates. Simply download our template draft, fill in your rosters, and upload it to configure your complete school directory in minutes."
                }
              ].map((faq, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden transition-all duration-300">
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full px-8 py-5 flex items-center justify-between text-left focus:outline-none focus:bg-slate-50"
                  >
                    <span className="font-bold text-sm text-slate-800 pr-4">{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transform transition-transform duration-300 ${faqOpen[idx] ? 'rotate-180' : ''}`} />
                  </button>
                  {faqOpen[idx] && (
                    <div className="px-5 sm:px-8 pb-6 text-xs text-slate-500 font-medium leading-relaxed border-t border-slate-100 pt-3 bg-slate-50 animate-in slide-in-from-top-2 duration-300">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      ) : (
        /* Original working License Activation Hub */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* License Status Overview Card */}
          <div className="lg:col-span-7 space-y-8">
            <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 shadow-sm space-y-10 relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-64 h-64 -mr-20 -mt-20 rounded-full blur-3xl opacity-10 ${
                isExpired ? 'bg-red-500' : 'bg-blue-500'
              }`} />

              <div className="flex items-center justify-between relative">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    isExpired ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {isExpired ? <ShieldAlert className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-slate-900">
                      {status?.isValid ? 
                        (status.plan === 'premium' ? 'Premium Subscription' : 
                         status.plan === 'standard' ? 'Standard Subscription' : 
                         status.plan === 'trial' ? 'Trial Subscription' : 
                         status.expiresAt === 'lifetime' ? 'Lifetime Subscription' : 'Active Subscription') 
                        : 'No Active Subscription Key'}
                    </h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Status Overview Panel</p>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${
                  isExpired ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {isExpired ? 'Expired' : 'Active'}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative pb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">
                    <Clock className="w-3.5 h-3.5" />
                    Subscription Expiry
                  </div>
                  <p className="text-lg font-black text-slate-900">
                    {status?.expiresAt === 'lifetime' ? 'Never' : (status?.expiresAt ? new Date(status.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A')}
                  </p>
                  {!isExpired && daysRemaining !== null && (
                    <p className={`text-xs font-bold ${daysRemaining < 7 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {daysRemaining} days remaining till renewal
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">
                    <Cpu className="w-3.5 h-3.5" />
                    School Hardware ID Ref
                  </div>
                  <code className="block p-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-blue-600 break-all text-center">
                    {hardwareId}
                  </code>
                </div>
              </div>

              <div className="pt-10 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6 relative">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-amber-600 fill-amber-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600">Sync details with developers ledger?</p>
                </div>
                <button 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 px-6 py-3.5 bg-slate-900 text-white hover:bg-black text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-sm shadow-slate-200"
                >
                  <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Request Ledger Sync
                </button>
              </div>
            </div>

            {/* Pricing Summary Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 hover:shadow-md transition-all space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center">
                    <Star className="w-5 h-5 fill-slate-300" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-950">{PRICING.standard.name}</h4>
                    <p className="text-[0.625rem] font-black text-blue-600 uppercase tracking-wider">{PRICING.standard.price} / term</p>
                  </div>
                </div>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Basic PDF reports compilation, manual remarks registry, offline database exports, and custom template systems.
                </p>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 hover:shadow-md transition-all space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
                    <Crown className="w-5 h-5 fill-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-950">{PRICING.premium.name}</h4>
                    <p className="text-[0.625rem] font-black text-amber-600 uppercase tracking-wider">{PRICING.premium.price} / term</p>
                  </div>
                </div>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Full automatic cumulative record sheets, priority backups validation, custom branding uploads, and upcoming AI auto remarks.
                </p>
              </div>
            </div>

          </div>

          {/* Verification Form Card */}
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                  <Key className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black tracking-tight text-slate-900">Activate License Key</h2>
              </div>

              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Provide your designated school email credentials and validation activation keys purchased from the portal support to activate or extend subscription services.
              </p>

              <form onSubmit={handleActivate} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest ml-1">Registered School Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                      <input 
                        required
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. administrator@school.com"
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-semibold text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest ml-1">License Key Sequence</label>
                    <input 
                      required
                      type="text" 
                      value={licenseKey}
                      onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                      placeholder="e.g. SSY-XXXX-XXXX"
                      className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono font-black text-center tracking-widest uppercase text-sm placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:font-bold"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isActivating || !licenseKey.trim() || !email.trim()}
                  className="w-full py-4 bg-slate-900 text-white font-black hover:bg-black uppercase tracking-wider text-xs rounded-xl disabled:opacity-50 transition-all shadow-xl flex items-center justify-center gap-2"
                >
                  {isActivating ? <Spinner size="sm" /> : <CheckCircle2 className="w-4 h-4" />}
                  Decline & Validate Access
                </button>
              </form>

              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-start gap-4">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[0.6875rem] text-blue-800 font-medium leading-relaxed">
                  Keys are uniquely mapped to your hardware device. If hardware configuration structures are modified, reach support to request fresh access tokens.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl text-center space-y-1 text-[0.6875rem] font-bold text-slate-500">
                <span>Direct Support Hotlines: </span>
                <a href={waLink} target="_blank" className="text-emerald-700 hover:underline">WhatsApp Direct</a>
              </div>
            </div>
          </div>

        </div>
      )}

      </div>
    </div>
  );
};
