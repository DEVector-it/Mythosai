import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Send, Loader2, BookOpen, Users, BarChart3, Settings as SettingsIcon, LogOut, Menu, X,
  Calculator, FlaskConical, PenTool, FileText, Sparkles, Clock, Brain, Target, Award,
  Shield, CheckCircle, Bell, Trash2, Pencil, Save, XCircle, Search, ChevronLeft, ChevronRight,
  SortAsc, SortDesc, Info, KeyRound, Eye, EyeOff, Copy, AlertTriangle
} from 'lucide-react';

/* ----------------------------------------------------------------------------
   Utilities
---------------------------------------------------------------------------- */
const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
};

const nowISO = () => new Date().toISOString();

const fmtDate = (d) =>
  new Date(d).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

const useDebouncedState = (initial, ms = 300) => {
  const [value, setValue] = useState(initial);
  const [debounced, setDebounced] = useState(initial);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return [value, setValue, debounced];
};

/* ----------------------------------------------------------------------------
   Toasts
---------------------------------------------------------------------------- */
function Toasts({ toasts, remove }) {
  return (
    <div className="fixed bottom-4 right-4 z-[1000] space-y-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-start gap-3 rounded-xl px-4 py-3 shadow-xl border
            ${t.type === 'error' ? 'bg-red-500/15 border-red-500/40 text-red-200' :
              t.type === 'warn' ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-200' :
              'bg-white/10 border-white/20 text-white'}`}
        >
          {t.type === 'error' ? <AlertTriangle size={18} className="mt-0.5" /> :
           t.type === 'warn' ? <Info size={18} className="mt-0.5" /> :
           <Sparkles size={18} className="mt-0.5" />}
          <div className="text-sm">{t.message}</div>
          <button onClick={() => remove(t.id)} className="ml-2 opacity-70 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------------------
   Confirm Modal
---------------------------------------------------------------------------- */
function Confirm({ open, title, desc, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 max-w-md w-[92%]">
        <h3 className="text-white font-bold text-xl mb-2">{title}</h3>
        <p className="text-white/80 text-sm mb-5">{desc}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-500/30 text-red-200 hover:bg-red-500/40">Delete</button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
   Main Component
---------------------------------------------------------------------------- */
export default function MythOS() {
  /* ------------------- Core state ------------------- */
  const [user, setUser] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '', role: 'student' });
  const [apiKey, setApiKey] = useState(storage.get('mythos_api', ''));
  const [showKey, setShowKey] = useState(false);

  const [tab, setTab] = useState('chat');
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebar, setSidebar] = useState(true);

  const [settings, setSettings] = useState(() =>
    storage.get('mythos_settings', {
      bg: 'from-indigo-900 via-purple-900 to-pink-900',
      banner: '',
      showBanner: false,
      feature: null,
      featureEnd: null
    })
  );

  /* ------------------- Announcements ------------------- */
  const [announcements, setAnnouncements] = useState(() =>
    storage.get('mythos_announcements', [])
  );
  const [announcementData, setAnnouncementData] = useState({ title: '', message: '' });

  // list controls
  const [search, setSearch, searchDebounced] = useDebouncedState('', 250);
  const [sortKey, setSortKey] = useState('date'); // 'date' | 'title' | 'author'
  const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc'
  const [page, setPage] = useState(1);
  const pageSize = 5;

  // edit state
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ title: '', message: '' });

  // delete confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  // toasts
  const [toasts, setToasts] = useState([]);
  const pushToast = (message, type = 'info', ttl = 4000) => {
    const id = uid();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), ttl);
  };

  // refs
  const msgEnd = useRef(null);
  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  // persist settings, announcements, api key
  useEffect(() => { storage.set('mythos_settings', settings); }, [settings]);
  useEffect(() => { storage.set('mythos_announcements', announcements); }, [announcements]);
  useEffect(() => { storage.set('mythos_api', apiKey); }, [apiKey]);

  /* ------------------- Auth ------------------- */
  const login = () => {
    if (!loginData.username.trim() || !loginData.password.trim()) {
      pushToast('Enter a username and password.', 'warn');
      return;
    }
    setUser({ name: loginData.username.trim(), role: loginData.role });
    pushToast(`Welcome, ${loginData.username.trim()}!`);
  };

  const logout = () => {
    setUser(null);
    setMsgs([]);
    pushToast('You are logged out.');
  };

  /* ------------------- AI Chat (placeholder fetch) ------------------- */
  const getPrompt = () => `You are Myth OS, created by Hossein - the ultimate AI study assistant.

Role: ${user.role}

${user.role === 'student' ? `Mission:
- Explain step-by-step, simple then formal
- Show all work for math/physics
- Ask student to try steps before full solutions
- Gently correct spelling/grammar
- Make learning fun and engaging` : ''}

${user.role === 'teacher' ? `Mission:
- Generate quizzes and practice problems
- Create lesson plans with structure
- Provide rubrics and feedback
- Suggest teaching strategies` : ''}

${user.role === 'admin' ? `Mission:
- Write professional announcements
- Summarize data clearly
- Help with planning and communication` : ''}

Style: Smart, kind tutor. Clear paragraphs. School-appropriate. Always honest about uncertainty.`;

  const send = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput('');
    const userMsg = { role: 'user', content: text };
    setMsgs(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // You can wire to your real LLM here.
      // Demo: echo answer with small delay.
      await new Promise(r => setTimeout(r, 400));
      const demoAnswer = `You said:\n\n${text}\n\n(Connect your real model by replacing this demo block.)`;
      setMsgs(prev => [...prev, { role: 'assistant', content: demoAnswer }]);
    } catch (e) {
      setMsgs(prev => [...prev, { role: 'assistant', content: 'Error. Please retry.' }]);
      pushToast('Chat error. Check your connection.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // keyboard shortcut: Ctrl/Cmd+Enter to send
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (tab === 'chat') send();
        if (tab === 'announce' && canManage) publishAnnouncement();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [tab, input, announcementData.title, announcementData.message]);

  /* ------------------- Announcements logic ------------------- */
  const canManage = user?.role === 'admin';

  const filteredSorted = useMemo(() => {
    const q = searchDebounced.trim().toLowerCase();
    let list = announcements.filter(a =>
      !q ||
      a.title.toLowerCase().includes(q) ||
      a.message.toLowerCase().includes(q) ||
      a.author.toLowerCase().includes(q)
    );
    list.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'title') return a.title.localeCompare(b.title) * dir;
      if (sortKey === 'author') return a.author.localeCompare(b.author) * dir;
      // date
      return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir;
    });
    return list;
  }, [announcements, searchDebounced, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
  const pageSafe = clamp(page, 1, pageCount);
  useEffect(() => { if (page !== pageSafe) setPage(pageSafe); }, [pageCount]); // keep in range
  const pageItems = filteredSorted.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  const publishAnnouncement = () => {
    if (!canManage) { pushToast('Only admins can publish announcements.', 'warn'); return; }
    const title = announcementData.title.trim();
    const message = announcementData.message.trim();
    if (title.length < 3) { pushToast('Title must be at least 3 characters.', 'warn'); return; }
    if (message.length < 5) { pushToast('Message must be at least 5 characters.', 'warn'); return; }

    const newA = {
      id: uid(),
      title,
      message,
      author: user.name,
      verified: true,
      date: nowISO()
    };

    // Optimistic update + faux async
    setAnnouncements(prev => [newA, ...prev]);
    setAnnouncementData({ title: '', message: '' });

    // simulate network
    setTimeout(() => {
      // if you had an error, rollback here
      // pushToast('Announcement failed to publish.', 'error');
    }, 200);
    pushToast('Announcement published.');
  };

  const startEdit = (a) => {
    if (!canManage) return;
    setEditingId(a.id);
    setEditDraft({ title: a.title, message: a.message });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({ title: '', message: '' });
  };

  const saveEdit = (id) => {
    if (!canManage) return;
    const t = editDraft.title.trim(); const m = editDraft.message.trim();
    if (t.length < 3) { pushToast('Title must be at least 3 characters.', 'warn'); return; }
    if (m.length < 5) { pushToast('Message must be at least 5 characters.', 'warn'); return; }

    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, title: t, message: m } : a));
    setEditingId(null);
    setEditDraft({ title: '', message: '' });
    pushToast('Announcement updated.');
  };

  const requestDelete = (id) => {
    if (!canManage) return;
    setPendingDelete(id);
    setConfirmOpen(true);
  };

  const doDelete = () => {
    const id = pendingDelete;
    setConfirmOpen(false);
    setPendingDelete(null);
    if (!id) return;
    const prev = announcements;
    setAnnouncements(prev.filter(a => a.id !== id));
    setTimeout(() => {
      // rollback example (if needed): setAnnouncements(prev);
    }, 150);
    pushToast('Announcement deleted.');
  };

  /* ------------------- UI: Tabs ------------------- */
  const allTabs = [];
  allTabs.push({ id: 'chat', name: 'AI Tutor', icon: Sparkles });
  allTabs.push({ id: 'math', name: 'Math', icon: Calculator });
  allTabs.push({ id: 'science', name: 'Science', icon: FlaskConical });
  allTabs.push({ id: 'writing', name: 'Writing', icon: PenTool });
  allTabs.push({ id: 'study', name: 'Study Plan', icon: Target });
  allTabs.push({ id: 'progress', name: 'Progress', icon: Award });
  if (settings.feature) allTabs.push({ id: 'special', name: settings.feature, icon: Sparkles });
  if (user?.role === 'teacher') {
    allTabs.push({ id: 'lessons', name: 'Lessons', icon: BookOpen });
    allTabs.push({ id: 'quizzes', name: 'Quizzes', icon: FileText });
  }
  if (user?.role === 'admin') {
    allTabs.push({ id: 'analytics', name: 'Analytics', icon: BarChart3 });
    allTabs.push({ id: 'announce', name: 'Announce', icon: Users });
    allTabs.push({ id: 'settings', name: 'Settings', icon: SettingsIcon });
  }

  /* ------------------- Screens ------------------- */
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 w-full max-w-md border border-white/20 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl mb-4">
              <Brain size={48} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Myth OS</h1>
            <p className="text-purple-200">{isSignUp ? 'Create Account' : 'Ultimate AI Study Platform'}</p>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              value={loginData.username}
              onChange={e => setLoginData({ ...loginData, username: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && login()}
              className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Username"
              autoFocus
            />

            {isSignUp && (
              <input
                type="email"
                className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Email (optional)"
              />
            )}

            <input
              type="password"
              value={loginData.password}
              onChange={e => setLoginData({ ...loginData, password: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && login()}
              className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Password"
            />

            <div className="grid grid-cols-3 gap-2">
              {['student', 'teacher', 'admin'].map(r => (
                <button
                  key={r}
                  onClick={() => setLoginData({ ...loginData, role: r })}
                  className={`p-3 rounded-xl font-medium transition-all ${
                    loginData.role === r
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-white/5 border border-white/20 rounded-xl p-3">
              <KeyRound size={18} className="text-purple-300" />
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Optional: API key (store securely)"
                className="flex-1 bg-transparent outline-none text-white placeholder-gray-400"
              />
              <button
                onClick={() => setShowKey(s => !s)}
                className="text-white/70 hover:text-white"
                title={showKey ? 'Hide' : 'Show'}
              >
                {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <button
                onClick={() => { navigator.clipboard.writeText(apiKey || ''); pushToast('API key copied.'); }}
                className="text-white/70 hover:text-white"
                title="Copy"
              >
                <Copy size={18} />
              </button>
            </div>

            <button
              onClick={login}
              className="w-full p-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105"
            >
              {isSignUp ? 'Sign Up' : 'Login'}
            </button>

            <button
              onClick={() => setIsSignUp(s => !s)}
              className="w-full text-purple-300 hover:text-white transition-colors text-sm"
            >
              {isSignUp ? 'Have account? Login' : 'No account? Sign Up'}
            </button>
          </div>

          <p className="text-center text-white/60 text-sm mt-6">Created by Hossein</p>
        </div>
        <Toasts toasts={toasts} remove={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
      </div>
    );
  }

  /* ------------------- Tab renderers ------------------- */
  const ChatTab = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {msgs.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white/80 max-w-2xl">
              <Brain size={64} className="mx-auto mb-4 text-yellow-400" />
              <h2 className="text-3xl font-bold mb-4">Ready to learn!</h2>
              <p className="text-lg mb-6">Ask anything about your studies</p>
              <p className="text-white/60 text-sm">Tip: Press <span className="font-semibold">Ctrl/⌘ + Enter</span> to send</p>
            </div>
          </div>
        )}

        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 ${
              m.role === 'user'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : 'bg-white/10 backdrop-blur-lg text-white border border-white/10'
            }`}>
              <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/10">
              <Loader2 className="animate-spin text-purple-400" size={24} />
            </div>
          </div>
        )}
        <div ref={msgEnd} />
      </div>

      <div className="border-t border-white/10 p-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) && (e.preventDefault(), send())}
            placeholder="Ask anything..."
            className="flex-1 p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            rows={2}
            disabled={loading}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            title="Send (Ctrl/⌘+Enter)"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </div>
  );

  const AnalyticsTab = () => (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Students</h3>
              <Users className="text-blue-400" size={24} />
            </div>
            <p className="text-4xl font-bold text-white">1,247</p>
            <p className="text-green-400 text-sm mt-2">+12% growth</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Teachers</h3>
              <BookOpen className="text-purple-400" size={24} />
            </div>
            <p className="text-4xl font-bold text-white">64</p>
            <p className="text-green-400 text-sm mt-2">+3 new</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Engagement</h3>
              <BarChart3 className="text-pink-400" size={24} />
            </div>
            <p className="text-4xl font-bold text-white">87%</p>
            <p className="text-green-400 text-sm mt-2">+5% up</p>
          </div>
        </div>
      </div>
    </div>
  );

  const SettingsTab = () => (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold text-white mb-6">Settings</h2>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
          <h3 className="text-white font-semibold text-xl mb-4">🎨 Background</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { n: 'Purple', v: 'from-indigo-900 via-purple-900 to-pink-900' },
              { n: 'Blue', v: 'from-blue-900 via-cyan-900 to-teal-900' },
              { n: 'Green', v: 'from-green-900 via-emerald-900 to-teal-900' },
              { n: 'Orange', v: 'from-orange-900 via-red-900 to-pink-900' },
              { n: 'Dark', v: 'from-gray-900 via-slate-900 to-black' },
              { n: 'Royal', v: 'from-violet-900 via-purple-900 to-indigo-900' }
            ].map(t => (
              <button
                key={t.n}
                onClick={() => setSettings({ ...settings, bg: t.v })}
                className={`p-4 rounded-xl border-2 transition-all ${
                  settings.bg === t.v ? 'border-yellow-400' : 'border-white/20'
                }`}
              >
                <div className={`h-12 rounded-lg bg-gradient-to-r ${t.v} mb-2`}></div>
                <p className="text-white font-medium">{t.n}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
          <h3 className="text-white font-semibold text-xl mb-4">📢 Banner</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.showBanner}
                onChange={e => setSettings({ ...settings, showBanner: e.target.checked })}
                className="w-5 h-5"
              />
              <label className="text-white">Show Banner</label>
            </div>
            <textarea
              value={settings.banner}
              onChange={e => setSettings({ ...settings, banner: e.target.value })}
              placeholder="Banner message..."
              className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              rows={2}
            />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
          <h3 className="text-white font-semibold text-xl mb-4">⏰ Limited Feature</h3>
          <div className="space-y-4">
            <input
              type="text"
              value={settings.feature || ''}
              onChange={e => setSettings({ ...settings, feature: e.target.value })}
              placeholder="Feature name..."
              className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <input
              type="datetime-local"
              value={settings.featureEnd || ''}
              onChange={e => setSettings({ ...settings, featureEnd: e.target.value })}
              className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={() => setSettings({ ...settings, feature: null, featureEnd: null })}
              className="w-full p-3 rounded-xl bg-red-500/20 text-red-300"
            >
              Remove Feature
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const StudyTab = () => (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold text-white mb-6">Study Plan Generator</h2>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
          <h3 className="text-white font-semibold text-xl mb-4">Create Your Plan</h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Subject (e.g., Calculus, Biology)..."
              className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <input
              type="text"
              placeholder="Goal (e.g., Pass final exam)..."
              className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <input
              type="date"
              className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button className="w-full p-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold">
              Generate Study Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const ProgressTab = () => (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold text-white mb-6">Your Progress</h2>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
            <Clock className="text-blue-400 mb-2" size={32} />
            <p className="text-white text-2xl font-bold">24.5 hrs</p>
            <p className="text-purple-300">Study Time</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
            <Award className="text-yellow-400 mb-2" size={32} />
            <p className="text-white text-2xl font-bold">12</p>
            <p className="text-purple-300">Achievements</p>
          </div>
        </div>
      </div>
    </div>
  );

  const AnnounceTab = () => (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
            <Shield className="text-green-400" size={28} />
            Announcement Management
          </h2>
          <div className="flex items-center gap-2 text-white/70">
            <Info size={16} />
            <span className="text-sm">Ctrl/⌘+Enter to publish</span>
          </div>
        </div>

        {/* Create card */}
        <div className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10 ${!canManage ? 'opacity-60 pointer-events-none' : ''}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-r from-green-400 to-emerald-400 rounded-xl">
              <Shield className="text-white" size={20} />
            </div>
            <div>
              <h3 className="text-white font-semibold text-xl">Create New Announcement</h3>
              <p className="text-purple-300 text-sm">Share important updates with everyone</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-white/80 text-sm mb-1 block">Title</label>
              <input
                type="text"
                value={announcementData.title}
                onChange={e => setAnnouncementData(a => ({ ...a, title: e.target.value }))}
                placeholder="📢 Title..."
                className="w-full p-3 rounded-xl bg-white/10 border-2 border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                maxLength={120}
              />
              <div className="text-right text-white/50 text-xs mt-1">{announcementData.title.length}/120</div>
            </div>
            <div>
              <label className="text-white/80 text-sm mb-1 block">Message</label>
              <textarea
                value={announcementData.message}
                onChange={e => setAnnouncementData(a => ({ ...a, message: e.target.value }))}
                placeholder="💬 Message..."
                className="w-full p-3 rounded-xl bg-white/10 border-2 border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none transition-all"
                rows={5}
                maxLength={2000}
              />
              <div className="text-right text-white/50 text-xs mt-1">{announcementData.message.length}/2000</div>
            </div>
            {!canManage && (
              <div className="text-red-300 text-sm flex items-center gap-2"><Shield size={16} /> Admins only</div>
            )}
            <button
              onClick={publishAnnouncement}
              disabled={!announcementData.title.trim() || !announcementData.message.trim() || !canManage}
              className="w-full p-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold hover:scale-105 transform transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
              ✅ Publish Announcement
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="flex items-center gap-2 flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2">
            <Search size={18} className="text-purple-300" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent outline-none text-white placeholder-gray-400 flex-1"
              placeholder="Search title, author, message..."
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSortKey('date')}
              className={`px-3 py-2 rounded-lg border ${sortKey==='date'?'border-yellow-400 text-white':'border-white/20 text-white/70'} bg-white/10`}
              title="Sort by date"
            >
              Date
            </button>
            <button
              onClick={() => setSortKey('title')}
              className={`px-3 py-2 rounded-lg border ${sortKey==='title'?'border-yellow-400 text-white':'border-white/20 text-white/70'} bg-white/10`}
              title="Sort by title"
            >
              Title
            </button>
            <button
              onClick={() => setSortKey('author')}
              className={`px-3 py-2 rounded-lg border ${sortKey==='author'?'border-yellow-400 text-white':'border-white/20 text-white/70'} bg-white/10`}
              title="Sort by author"
            >
              Author
            </button>
            <button
              onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white/80"
              title="Toggle sort direction"
            >
              {sortDir === 'asc' ? <SortAsc size={18} /> : <SortDesc size={18} />}
            </button>
          </div>
        </div>

        {/* List */}
        <div className="space-y-4">
          <h3 className="text-white font-semibold text-xl flex items-center gap-2">
            📋 All Announcements ({filteredSorted.length})
          </h3>

          {filteredSorted.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-10 border border-white/10 text-center">
              <Bell className="mx-auto mb-4 text-purple-400" size={56} />
              <p className="text-white/70">No announcements found</p>
            </div>
          ) : (
            <>
              {pageItems.map(ann => (
                <div
                  key={ann.id}
                  className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/10 hover:scale-[1.01] transition-transform"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="min-w-0">
                      {editingId === ann.id ? (
                        <>
                          <input
                            value={editDraft.title}
                            onChange={e => setEditDraft(d => ({ ...d, title: e.target.value }))}
                            maxLength={120}
                            className="w-full mb-2 p-2 rounded-lg bg-white/10 border border-white/20 text-white outline-none"
                          />
                          <textarea
                            value={editDraft.message}
                            onChange={e => setEditDraft(d => ({ ...d, message: e.target.value }))}
                            rows={4}
                            maxLength={2000}
                            className="w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white outline-none"
                          />
                        </>
                      ) : (
                        <>
                          <h4 className="text-white font-bold text-lg break-words">{ann.title}</h4>
                          <div className="flex items-center gap-3 flex-wrap mt-1">
                            <div className="flex items-center gap-2 bg-purple-500/20 px-3 py-1 rounded-full">
                              <span className="text-purple-300 font-medium truncate">{ann.author}</span>
                              {ann.verified && (
                                <>
                                  <CheckCircle className="text-green-400" size={14} />
                                  <span className="text-green-400 text-[10px] font-bold">VERIFIED</span>
                                </>
                              )}
                            </div>
                            <span className="text-white/60 text-xs">{fmtDate(ann.date)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {editingId === ann.id ? (
                        <>
                          <button
                            onClick={() => saveEdit(ann.id)}
                            className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors"
                            title="Save"
                          >
                            <Save className="text-green-300" size={18} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                            title="Cancel"
                          >
                            <XCircle className="text-white/80" size={18} />
                          </button>
                        </>
                      ) : (
                        <>
                          {canManage && (
                            <button
                              onClick={() => startEdit(ann)}
                              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Pencil className="text-white/80" size={18} />
                            </button>
                          )}
                          {canManage && (
                            <button
                              onClick={() => requestDelete(ann.id)}
                              className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="text-red-300" size={18} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {editingId !== ann.id && (
                    <p className="text-white/90 leading-relaxed">{ann.message}</p>
                  )}
                </div>
              ))}

              {/* Pagination */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-white/60 text-sm">
                  Page {pageSafe} of {pageCount} • {filteredSorted.length} total
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => clamp(p - 1, 1, pageCount))}
                    className="p-2 rounded-lg bg-white/10 border border-white/20 text-white/80 disabled:opacity-40"
                    disabled={pageSafe <= 1}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => setPage(p => clamp(p + 1, 1, pageCount))}
                    className="p-2 rounded-lg bg-white/10 border border-white/20 text-white/80 disabled:opacity-40"
                    disabled={pageSafe >= pageCount}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Confirm
        open={confirmOpen}
        title="Delete announcement?"
        desc="This action cannot be undone."
        onCancel={() => { setConfirmOpen(false); setPendingDelete(null); }}
        onConfirm={doDelete}
      />
    </div>
  );

  /* ------------------- Shell ------------------- */
  return (
    <div className={`flex h-screen bg-gradient-to-br ${settings.bg}`}>
      {settings.showBanner && settings.banner && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-500/90 text-black p-3 text-center font-semibold z-50">
          {settings.banner}
        </div>
      )}

      {/* Sidebar */}
      <div className={`${sidebar ? 'w-64' : 'w-0'} transition-all duration-300 bg-black/30 backdrop-blur-xl border-r border-white/10 overflow-hidden ${settings.showBanner && settings.banner ? 'mt-12' : ''}`}>
        <div className="p-4 h-full flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl">
              <Brain size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Myth OS</h2>
              <p className="text-purple-300 text-xs capitalize">{user.role}</p>
            </div>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto">
            {allTabs.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                    tab === t.id
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{t.name}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-6 border-t border-white/10">
            <div className="p-3 bg-white/5 rounded-xl mb-2">
              <p className="text-white font-medium">{user.name}</p>
              <p className="text-purple-300 text-sm capitalize">{user.role}</p>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-red-400 hover:bg-red-500/20 transition-all"
            >
              <LogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Header + Body */}
      <div className={`flex-1 flex flex-col ${settings.showBanner && settings.banner ? 'mt-12' : ''}`}>
        <div className="bg-black/30 backdrop-blur-xl border-b border-white/10 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebar(!sidebar)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              {sidebar ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">
                {allTabs.find(t => t.id === tab)?.name}
              </h1>
              <p className="text-sm text-purple-300">Welcome, {user.name}!</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {tab === 'chat' && <ChatTab />}
          {tab === 'analytics' && <AnalyticsTab />}
          {tab === 'settings' && <SettingsTab />}
          {tab === 'study' && <StudyTab />}
          {tab === 'progress' && <ProgressTab />}
          {tab === 'announce' && <AnnounceTab />}
          {/* placeholder simple tabs */}
          {['math','science','writing','lessons','quizzes','special'].includes(tab) && (
            <div className="p-6 text-white/80">
              <p className="text-lg">This section is a placeholder. Build your tools here 🚀</p>
            </div>
          )}
        </div>
      </div>

      <Toasts toasts={toasts} remove={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
    </div>
  );
}

