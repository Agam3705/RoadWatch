import React, { useEffect, useState, useRef } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  MessageSquare, Users, Send, PlusCircle, Shield, Wrench, Building2,
  Clock, Hash, Sparkles, AlertCircle, RefreshCw, Layers, Lock, Trash2, CheckCircle2
} from 'lucide-react';

export const CommunityDiscussionsPage: React.FC = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string>('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  // New Room Modal state
  const [newRoomModal, setNewRoomModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('WARD_FORUM');
  const [newDesc, setNewDesc] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchRooms = async () => {
    try {
      const res = await api.community.rooms();
      const items = res.items || [];
      setRooms(items);
      if (items.length > 0 && !activeRoomId) {
        setActiveRoomId(items[0].id);
      }
    } catch {
    } finally {
      setLoadingRooms(false);
    }
  };

  const fetchMessages = async (roomId: string) => {
    if (!roomId) return;
    setLoadingMessages(true);
    try {
      const res = await api.community.roomMessages(roomId);
      setMessages(res.items || []);
    } catch {
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (activeRoomId) {
      fetchMessages(activeRoomId);
    }
  }, [activeRoomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeRoomId || sending) return;

    if (!user) {
      alert('Please sign in or use a demo profile to post messages.');
      return;
    }

    setSending(true);
    try {
      await api.community.postMessage(activeRoomId, inputText.trim());
      setInputText('');
      fetchMessages(activeRoomId);
      fetchRooms(); // refresh counts
    } catch (err: any) {
      alert(err.message || 'Error posting message.');
    } finally {
      setSending(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const created = await api.community.createRoom({
        title: newTitle.trim(),
        category: newCategory,
        description: newDesc.trim(),
      });
      const isSuperAdmin = user?.role === 'SUPER_ADMIN';
      alert(
        isSuperAdmin
          ? 'Discussion group created and activated!'
          : 'Discussion group proposal submitted! It is pending System Administrator review and approval before becoming public.'
      );
      setNewTitle('');
      setNewDesc('');
      setNewRoomModal(false);
      await fetchRooms();
      if (created?.data?.id) {
        setActiveRoomId(created.data.id);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create room.');
    }
  };

  const handleApproveCurrentRoom = async () => {
    if (!activeRoomId) return;
    try {
      await api.community.updateRoomStatus(activeRoomId, { action: 'APPROVE' });
      alert('Discussion group approved and activated!');
      fetchRooms();
    } catch (err: any) {
      alert(err.message || 'Error approving room.');
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm('Admin Moderation: Permanently delete this message from conversation history?')) return;
    try {
      await api.community.deleteMessage(msgId);
      if (activeRoomId) fetchMessages(activeRoomId);
      fetchRooms();
    } catch (err: any) {
      alert(err.message || 'Error deleting message.');
    }
  };

  const activeRoom = rooms.find((r) => r.id === activeRoomId);

  const getRoleBadge = (role: string) => {
    if (role === 'SUPER_ADMIN') {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">SUPER ADMIN</span>;
    }
    if (role === 'AUTHORITY_OFFICER') {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-200">PWD OFFICER</span>;
    }
    if (role === 'AUTHORITY_SUPERVISOR') {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200">SUPERVISOR</span>;
    }
    if (role.includes('CONTRACTOR')) {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">CONTRACTOR</span>;
    }
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">CITIZEN</span>;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-500/20 text-sky-400 border border-sky-400/30 rounded-full text-xs font-semibold">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Civic Collaboration & Multi-Role Communication</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Civic Discussion Rooms
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Real-time public forums bridging Citizens, Ground Supervisors, Authority Officers, and Contractors for transparent road accountability.
          </p>
        </div>

        <button
          onClick={() => setNewRoomModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-brand-600 to-sky-600 hover:from-brand-700 hover:to-sky-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Discussion Room</span>
        </button>
      </div>

      {/* Main Chat Interface */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[580px]">
        {/* Left Sidebar: Room List */}
        <div className="md:col-span-4 border-r border-slate-200 bg-slate-50/50 flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <Hash className="w-4 h-4 text-brand-600" /> Channels & Forums
            </span>
            <button
              onClick={fetchRooms}
              className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {loadingRooms ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading channels...</div>
            ) : (
              rooms.map((room) => {
                const isActive = room.id === activeRoomId;
                const isPending = room.approval_status === 'PENDING_APPROVAL';
                const isLocked = room.approval_status === 'LOCKED' || room.is_locked;
                return (
                  <button
                    key={room.id}
                    onClick={() => setActiveRoomId(room.id)}
                    className={`w-full text-left p-4 transition-colors flex items-start justify-between gap-3 ${
                      isActive
                        ? 'bg-sky-50/80 border-l-4 border-brand-600'
                        : 'hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 truncate">{room.title}</span>
                        {isPending && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-black border border-amber-200">
                            Pending Review
                          </span>
                        )}
                        {isLocked && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-black flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Locked
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {room.description || 'Public civic discussions and road condition exchanges.'}
                      </p>
                      <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400">
                        <span className="px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-700 font-semibold">
                          {room.category}
                        </span>
                        <span>&bull; {room.message_count || 0} messages</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Room Chat Feed */}
        <div className="md:col-span-8 flex flex-col h-[580px]">
          {/* Room Header */}
          <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-brand-600" />
                  {activeRoom?.title || 'Select a Channel'}
                </h2>
                {activeRoom?.approval_status === 'PENDING_APPROVAL' && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black border border-amber-200">
                    Pending Approval
                  </span>
                )}
                {(activeRoom?.approval_status === 'LOCKED' || activeRoom?.is_locked) && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {activeRoom?.description}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {user?.role === 'SUPER_ADMIN' && activeRoom?.approval_status === 'PENDING_APPROVAL' && (
                <button
                  onClick={handleApproveCurrentRoom}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve Group</span>
                </button>
              )}
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold bg-slate-100 px-2.5 py-1 rounded-xl">
                <Users className="w-3.5 h-3.5 text-brand-600" />
                <span className="hidden sm:inline">Multi-Role Access</span>
              </div>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
            {activeRoom?.approval_status === 'PENDING_APPROVAL' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    This discussion room proposal is under review by System Administrators.
                  </span>
                </div>
                {user?.role === 'SUPER_ADMIN' && (
                  <button
                    onClick={handleApproveCurrentRoom}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shrink-0"
                  >
                    Quick Approve
                  </button>
                )}
              </div>
            )}

            {(activeRoom?.approval_status === 'LOCKED' || activeRoom?.is_locked) && (
              <div className="p-3 bg-slate-100 border border-slate-300 rounded-2xl text-slate-700 text-xs flex items-center gap-2 shadow-xs">
                <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                <span>
                  This channel has been locked by the Administrator. Discussion is currently in read-only mode.
                </span>
              </div>
            )}

            {loadingMessages ? (
              <div className="py-20 text-center text-xs text-slate-400">Loading conversation history...</div>
            ) : messages.length === 0 ? (
              <div className="py-20 text-center space-y-2">
                <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">No messages in this channel yet.</p>
                <p className="text-[11px] text-slate-400">Start the conversation below.</p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = user && m.user_id === user.id;
                return (
                  <div
                    key={m.id}
                    className={`group flex items-start gap-3 ${isMe ? 'flex-row-reverse' : ''}`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-black shrink-0">
                      {(m.user_name || 'U').charAt(0)}
                    </div>
                    <div className={`space-y-1 max-w-lg ${isMe ? 'text-right' : ''}`}>
                      <div className={`flex items-center gap-2 ${isMe ? 'justify-end' : ''}`}>
                        <span className="text-xs font-bold text-slate-800">{m.user_name}</span>
                        {getRoleBadge(m.user_role || 'CITIZEN')}
                        <span className="text-[10px] text-slate-400">
                          {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                        {user?.role === 'SUPER_ADMIN' && (
                          <button
                            onClick={() => handleDeleteMessage(m.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-opacity"
                            title="Admin: Delete message"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed inline-block text-left shadow-2xs ${
                          isMe
                            ? 'bg-brand-600 text-white rounded-tr-xs'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                        }`}
                      >
                        {m.message}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          {(activeRoom?.approval_status === 'LOCKED' || activeRoom?.is_locked) ? (
            <div className="p-3.5 border-t border-slate-200 bg-slate-100 text-center text-xs text-slate-600 font-semibold flex items-center justify-center gap-2">
              <Lock className="w-4 h-4 text-slate-500" />
              <span>Channel is locked by Administrator. Messaging is currently suspended.</span>
            </div>
          ) : activeRoom?.approval_status === 'PENDING_APPROVAL' && user?.role !== 'SUPER_ADMIN' ? (
            <div className="p-3.5 border-t border-slate-200 bg-amber-50 text-center text-xs text-amber-800 font-semibold flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Channel proposal is awaiting Administrator approval before discussions can begin.</span>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
              <input
                type="text"
                placeholder={user ? `Post an update or question as ${user.name} (${user.role.replace('_', ' ')})...` : 'Please sign in to post messages...'}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 px-4 py-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 focus:bg-white"
              />
              <button
                type="submit"
                disabled={sending || !inputText.trim()}
                className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* New Room Modal */}
      {newRoomModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center">
                <Hash className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Create Discussion Room</h3>
                <p className="text-xs text-slate-500">Create a collaborative civic or defect channel</p>
              </div>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">Room Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ward 7 Drainage & Resurfacing Dialogue"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl outline-none bg-white text-slate-800"
                >
                  <option value="WARD_FORUM">Ward Civic Forum</option>
                  <option value="EMERGENCY_TRIAGE">Monsoon / Emergency Triage</option>
                  <option value="CONTRACTOR_HUB">Contractor Operations</option>
                  <option value="DEFECT_DISCUSSION">Defect Specific Thread</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">Description</label>
                <textarea
                  rows={2}
                  placeholder="Briefly describe the purpose of this civic communication room..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewRoomModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-sm"
                >
                  Create Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
