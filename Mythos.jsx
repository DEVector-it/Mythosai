import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Loader2, BookOpen, Users, BarChart3, Settings, LogOut, Menu, X,
  Calculator, FlaskConical, PenTool, FileText, Sparkles, Clock, Brain, Target, Award,
  // added for Announce tab
  Shield, CheckCircle, Bell, Trash2
} from 'lucide-react';

export default function MythOS() {
  const [user, setUser] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '', role: 'student' });
  
  const [tab, setTab] = useState('chat');
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebar, setSidebar] = useState(true);
  
  const [settings, setSettings] = useState({
    bg: 'from-indigo-900 via-purple-900 to-pink-900',
    banner: '',
    showBanner: false,
    feature: null,
    featureEnd: null
  });

  // ===== Announcements state (ADDED) =====
  const [announcements, setAnnouncements] = useState([]);
  const [announcementData, setAnnouncementData] = useState({ title: '', message: '' });

  const msgEnd = useRef(null);

  useEffect(() => {
    msgEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const login = () => {
    if (loginData.username && loginData.password) {
      setUser({ name: loginData.username, role: loginData.role });
    }
  };

  const logout = () => {
    setUser(null);
    setMsgs([]);
  };

  const getPrompt = () => {
    const base = `You are Myth OS, created by Hossein - the ultimate AI study assistant.

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
    return base;
  };

  const send = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input };
    setMsgs(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: getPrompt(),
          messages: [...msgs, userMsg].map(m => ({ role: m.role, content: m.content }))
        })
      });

      const data = await res.json();
      setMsgs(prev => [...prev, { role: 'assistant', content: data?.content?.[0]?.text ?? '...' }]);
    } catch (e) {
      setMsgs(prev => [...prev, { role: 'assistant', content: 'Error. Please retry.' }]);
    } finally {
      setLoading(false);
    }
  };

  // ===== Announcements helpers (ADDED) =====
  const sendAnnouncement = () => {
    if (!announcementData.title.trim() || !announcementData.message.trim()) return;
    const newAnnouncement = {
      id: Date.now(),
      title: announcementData.title.trim(),
      message: announcementData.message.trim(),
      author: user?.name || 'Admin',
      verified: user?.role === 'admin', // treat admins as verified here
      timestamp: new Date().toLocaleString()
    };
    setAnnouncements(prev => [newAnnouncement, ...prev]);
    setAnnouncementData({ title: '', message: '' });
  };

  const deleteAnnouncement = (id) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

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

          <div className="space-y-4">
            <input
              type="text"
              value={loginData.username}
              onChange={e => setLoginData({...loginData, username: e.target.value})}
              onKeyPress={e => e.key === 'Enter' && login()}
              className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Username"
            />

            {isSignUp && (
              <input
                type="email"
                className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Email"
              />
            )}

            <input
              type="password"
              value={loginData.password}
              onChange={e => setLoginData({...loginData, password: e.target.value})}
              onKeyPress={e => e.key === 'Enter' && login()}
              className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Password"
            />

            {isSignUp && (
              <input
                type="password"
                className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Confirm Password"
              />
            )}

            <div className="grid grid-cols-3 gap-2">
              {['student', 'teacher', 'admin'].map(r => (
                <button
                  key={r}
                  onClick={() => setLoginData({...loginData, role: r})}
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

            <button
              onClick={login}
              className="w-full p-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105"
            >
              {isSignUp ? 'Sign Up' : 'Login'}
            </button>

            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-purple-300 hover:text-white transition-colors text-sm"
            >
              {isSignUp ? 'Have account? Login' : 'No account? Sign Up'}
            </button>
          </div>

          <p className="text-center text-white/60 text-sm mt-6">Created by Hossein</p>
        </div>
      </div>
    );
  }

  const allTabs = [];
  
  allTabs.push({ id: 'chat', name: 'AI Tutor', icon: Sparkles });
  allTabs.push({ id: 'math', name: 'Math', icon: Calculator });
  allTabs.push({ id: 'science', name: 'Science', icon: FlaskConical });
  allTabs.push({ id: 'writing', name: 'Writing', icon: PenTool });
  allTabs.push({ id: 'study', name: 'Study Plan', icon: Target });
  allTabs.push({ id: 'progress', name: 'Progress', icon: Award });
  
  if (settings.feature) {
    allTabs.push({ id: 'special', name: settings.feature, icon: Sparkles });
  }
  
  if (user.role === 'teacher') {
    allTabs.push({ id: 'lessons', name: 'Lessons', icon: BookOpen });
    allTabs.push({ id: 'quizzes', name: 'Quizzes', icon: FileText });
  }
  
  if (user.role === 'admin') {
    allTabs.push({ id: 'analytics', name: 'Analytics', icon: BarChart3 });
    allTabs.push({ id: 'announce', name: 'Announce', icon: Users });
    allTabs.push({ id: 'settings', name: 'Settings', icon: Settings });
  }

  const renderTab = () => {
    if (tab === 'analytics') {
      return (
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
    }

    // ===== Enhanced Announcements tab (ADDED) =====
    if (tab === 'announce') {
      return (
        <div className="p-6 overflow-y-auto h-full">
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <Shield className="text-green-400" size={28} />
              Announcement Management
            </h2>

            {/* Creator card */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10 mb-6">
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
                <input
                  type="text"
                  value={announcementData.title}
                  onChange={e => setAnnouncementData(a => ({ ...a, title: e.target.value }))}
                  placeholder="📢 Title..."
                  className="w-full p-3 rounded-xl bg-white/10 border-2 border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
                <textarea
                  value={announcementData.message}
                  onChange={e => setAnnouncementData(a => ({ ...a, message: e.target.value }))}
                  placeholder="💬 Message..."
                  className="w-full p-3 rounded-xl bg-white/10 border-2 border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none transition-all"
                  rows={5}
                />
                <button
                  onClick={sendAnnouncement}
                  disabled={!announcementData.title.trim() || !announcementData.message.trim()}
                  className="w-full p-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold hover:scale-105 transform transition-all disabled:opacity-50 disabled:hover:scale-100"
                >
                  ✅ Publish Announcement
                </button>
              </div>
            </div>

            {/* List */}
            <div className="space-y-4">
              <h3 className="text-white font-semibold text-xl flex items-center gap-2">
                📋 All Announcements ({announcements.length})
              </h3>

              {announcements.length === 0 ? (
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-10 border border-white/10 text-center">
                  <Bell className="mx-auto mb-4 text-purple-400" size={56} />
                  <p className="text-white/70">No announcements published yet</p>
                </div>
              ) : (
                announcements.map(ann => (
                  <div
                    key={ann.id}
                    className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/10 hover:scale-[1.02] transition-transform"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="min-w-0">
                        <h4 className="text-white font-bold text-lg truncate">{ann.title}</h4>
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
                          <span className="text-white/60 text-xs">{ann.timestamp}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => deleteAnnouncement(ann.id)}
                        className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="text-red-400" size={18} />
                      </button>
                    </div>

                    <p className="text-white/90">{ann.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      );
    }

    if (tab === 'settings') {
      return (
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
                    onClick={() => setSettings({...settings, bg: t.v})}
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
                    onChange={e => setSettings({...settings, showBanner: e.target.checked})}
                    className="w-5 h-5"
                  />
                  <label className="text-white">Show Banner</label>
                </div>
                <textarea
                  value={settings.banner}
                  onChange={e => setSettings({...settings, banner: e.target.value})}
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
                  onChange={e => setSettings({...settings, feature: e.target.value})}
                  placeholder="Feature name..."
                  className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                  type="datetime-local"
                  value={settings.featureEnd || ''}
                  onChange={e => setSettings({...settings, featureEnd: e.target.value})}
                  className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={() => setSettings({...settings, feature: null, featureEnd: null})}
                  className="w-full p-3 rounded-xl bg-red-500/20 text-red-300"
                >
                  Remove Feature
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (tab === 'study') {
      return (
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
    }

    if (tab === 'progress') {
      return (
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
    }

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {msgs.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-white/80 max-w-2xl">
                <Brain size={64} className="mx-auto mb-4 text-yellow-400" />
                <h2 className="text-3xl font-bold mb-4">Ready to Learn!</h2>
                <p className="text-lg mb-6">Ask me anything about your studies</p>
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
                <div className="whitespace-pre-wrap">{m.content}</div>
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
              onKeyPress={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
              placeholder="Ask anything..."
              className="flex-1 p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              rows={2}
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex h-screen bg-gradient-to-br ${settings.bg}`}>
      {settings.showBanner && settings.banner && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-500/90 text-black p-3 text-center font-semibold z-50">
          {settings.banner}
        </div>
      )}

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
          {renderTab()}
        </div>
      </div>
    </div>
  );
}
