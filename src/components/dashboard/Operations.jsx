import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ArrowUpRight, Briefcase, CheckCircle2, Clock, Copy, CreditCard, DollarSign, Download, ExternalLink, FileCheck, FileText, Loader2, Mail, MessageSquare, Phone, QrCode, Receipt, ShieldCheck, Trash2, TrendingUp, UserPlus, Users2 } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { collection, query, onSnapshot, where, orderBy, limit, addDoc, serverTimestamp, doc, getDoc, updateDoc, getDocs, setDoc } from 'firebase/firestore';
import { db, functions } from '../../firebase';
import { buildCaregiverInviteUrl, buildQrCodeUrl, getCaregiverInviteOrigin, isLocalhostOrigin, saveCaregiverInviteOrigin } from '../../config/runtime';

function normalizePhone(value) {
  return value.replace(/\D/g, '');
}

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

export function StaffHRView({ homeData, isLocalDemo = false, saveLocalStaffList, createSystemLog }) {
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffRole, setStaffRole] = useState('caregiver');
  const [saving, setSaving] = useState(false);
  const [removingEmail, setRemovingEmail] = useState(null);
  const [invite, setInvite] = useState(null);
  const [inviteOrigin, setInviteOrigin] = useState(() => getCaregiverInviteOrigin());
  const staffList = homeData?.staffList || [];
  const activeStaffCount = staffList.filter((staff) => staff.status === 'active' || staff.status === 'onboarded').length;
  const pendingStaffCount = staffList.filter((staff) => staff.status !== 'active' && staff.status !== 'onboarded').length;
  const inviteOriginIsLocalhost = isLocalhostOrigin(inviteOrigin);

  const homeId = homeData?.id;
  const canInvite = homeId && staffName.trim() && staffEmail.trim();

  const inviteUrl = useMemo(() => {
    if (!invite?.phone || !homeId) return '';
    return buildCaregiverInviteUrl(`/auth?join=caregiver&homeId=${encodeURIComponent(homeId)}&phone=${encodeURIComponent(invite.phone)}&email=${encodeURIComponent(invite.email || '')}`, inviteOrigin);
  }, [homeId, invite?.phone, inviteOrigin]);

  const handleInvite = async (event) => {
    event.preventDefault();
    if (!canInvite) return;

    const email = normalizeEmail(staffEmail);
    const phone = normalizePhone(staffPhone);
    const name = staffName.trim() || email;

    if (phone && phone.length < 10) {
      alert("Please enter a valid 10-digit phone number.");
      return;
    }

    setSaving(true);

    try {
      if (isLocalDemo && saveLocalStaffList) {
        const demoStaff = {
          uid: `demo_staff_${Date.now()}`,
          name,
          email,
          role: staffRole,
          status: 'pending',
          invitedAt: new Date().toISOString(),
        };
        saveLocalStaffList([...staffList.filter((staff) => staff.email !== email), demoStaff]);
      } else {
        const provisionStaffAccount = httpsCallable(functions, 'provisionStaffAccount');
        await provisionStaffAccount({
          homeId,
          email,
          phone,
          name,
          role: staffRole,
        });
      }

      if (createSystemLog) {
        await createSystemLog('STAFF_INVITE', `Caregiver invite generated for ${name} (${email}).`);
      }

      setInvite({ email, name, phone });
      setStaffName('');
      setStaffEmail('');
      setStaffPhone('');
      setStaffRole('caregiver');
    } catch (err) {
      console.error('Caregiver invite failed:', err);
      alert('Unable to create caregiver invite: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (staff) => {
    if (!window.confirm(`Remove caregiver access for ${staff.name || staff.email}?`)) return;
    
    try {
      const targetEmail = staff.email ? normalizeEmail(staff.email) : '';
      const targetUid = staff.uid;
      
      if (targetEmail) {
        setRemovingEmail(staff.email);
      } else if (targetUid) {
        setRemovingEmail(targetUid);
      }

      // Build the filtered list for optimistic UI update
      const nextList = staffList.filter((item) => {
        const itemEmail = item.email ? normalizeEmail(item.email) : '';
        const emailMatch = targetEmail && itemEmail === targetEmail;
        const uidMatch = targetUid && item.uid === targetUid;
        return !emailMatch && !uidMatch;
      });

      if (isLocalDemo && saveLocalStaffList) {
        saveLocalStaffList(nextList);
      } else {
        const deprovisionStaffAccount = httpsCallable(functions, 'deprovisionStaffAccount');
        await deprovisionStaffAccount({ homeId, email: targetEmail || staff.email });
        // Optimistic UI update — remove from local state immediately
        // so the user doesn't have to wait for the onSnapshot round-trip
        if (saveLocalStaffList) {
          saveLocalStaffList(nextList);
        }
      }

      if (createSystemLog) {
        await createSystemLog('STAFF_REMOVED', `Caregiver access removed for ${staff.name || staff.email}.`, null, staff.name || staff.email);
      }
    } catch (err) {
      console.error('Caregiver removal failed:', err);
      alert('Unable to remove caregiver: ' + err.message);
    } finally {
      setRemovingEmail(null);
    }
  };

  const copyInvite = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.warn('Clipboard unavailable:', err);
    }
  };

  const persistInviteOrigin = () => {
    setInviteOrigin(saveCaregiverInviteOrigin(inviteOrigin));
  };

  const statusBadge = (status) => {
    if (status === 'active' || status === 'onboarded') {
      return {
        className: 'bg-emerald-500/10 text-emerald-400',
        icon: CheckCircle2,
        label: status === 'onboarded' ? 'Onboarded' : 'Active',
      };
    }

    return {
      className: 'bg-amber-500/10 text-amber-400',
      icon: Clock,
      label: 'Pending Acceptance',
    };
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Staff Credentialing & HR</h1>
          <p className="text-muted">Invite caregivers, issue mobile access, and manage active staff accounts.</p>
        </div>
        <div className="px-4 py-2 bg-surface rounded-xl border border-border w-fit">
          <span className="text-[10px] text-muted uppercase font-bold block">Staff List</span>
          <span className="text-emerald-400 font-bold">{activeStaffCount} Active</span>
          {pendingStaffCount > 0 && <span className="text-amber-400 text-xs font-bold ml-2">{pendingStaffCount} Pending</span>}
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
        <section className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Add Caregiver</h2>
              <p className="text-xs text-muted">Creates the staff account and mobile sign-in invite.</p>
            </div>
          </div>

          <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-muted uppercase tracking-widest">Name</label>
              <input
                value={staffName}
                onChange={(event) => setStaffName(event.target.value)}
                className="bg-background border border-border rounded-lg px-4 py-3 text-foreground outline-none focus:border-primary/50"
                placeholder="Caregiver name"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-muted uppercase tracking-widest">Email</label>
              <input
                type="email"
                value={staffEmail}
                onChange={(event) => setStaffEmail(event.target.value)}
                className="bg-background border border-border rounded-lg px-4 py-3 text-foreground outline-none focus:border-primary/50"
                placeholder="caregiver@example.com"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-muted uppercase tracking-widest">Phone Number</label>
              <input
                type="tel"
                value={staffPhone}
                onChange={(event) => setStaffPhone(event.target.value)}
                className="bg-background border border-border rounded-lg px-4 py-3 text-foreground outline-none focus:border-primary/50"
                placeholder="(555) 000-0000"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-muted uppercase tracking-widest">Mobile Role</label>
              <select
                value={staffRole}
                onChange={(event) => setStaffRole(event.target.value)}
                className="bg-background border border-border rounded-lg px-4 py-3 text-foreground outline-none focus:border-primary/50"
              >
                <option value="caregiver">Caregiver</option>
                <option value="med-tech">Medication Tech</option>
                <option value="rn-delegator">RN Delegator</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={!canInvite || saving}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-lg py-3 font-bold transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Generate Invite
              </button>
            </div>
          </form>
        </section>

        <section className="glass-card p-6 min-h-[320px] flex flex-col">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Invitation Status</h2>
              <p className="text-xs text-muted">Invitation dispatched via SMS and Email.</p>
            </div>
          </div>

          {invite && inviteUrl ? (
            <div className="flex flex-col gap-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-emerald-400 flex gap-2">
                <Mail className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">Automatic invitation sent to <strong>{invite.email}</strong>. The staff member can join directly from their inbox.</p>
              </div>
              
              {inviteOriginIsLocalhost && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-amber-300 flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">This QR uses localhost, which phones cannot reach. Use a LAN or deployed app origin for mobile scans.</p>
                </div>
              )}
              <div className="bg-white p-4 rounded-xl w-fit mx-auto border border-border">
                <img src={buildQrCodeUrl(inviteUrl, 220)} alt="Caregiver invite QR" className="w-48 h-48" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-foreground">{invite.name}</p>
                <p className="text-[11px] text-muted break-all">{inviteUrl}</p>
                <div className="grid grid-cols-1 gap-2">
                  <div className="bg-background border border-border rounded-lg p-3">
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">QR App Origin</label>
                    <div className="flex gap-2">
                      <input
                        value={inviteOrigin}
                        onChange={(event) => setInviteOrigin(event.target.value)}
                        onBlur={persistInviteOrigin}
                        className="min-w-0 flex-1 bg-surface border border-border rounded-md px-2 py-2 text-xs text-foreground outline-none focus:border-primary/50"
                        placeholder="https://app.example.com"
                      />
                      <button onClick={persistInviteOrigin} className="bg-surface-hover hover:bg-primary/10 rounded-md px-3 py-2 text-xs font-bold">
                        Save
                      </button>
                    </div>
                  </div>
                  {invite.phone && (
                    <div className="bg-background border border-border rounded-lg p-3">
                      <span className="text-[10px] text-muted uppercase font-bold block mb-1">Contact Phone</span>
                      <span className="font-mono text-sm text-foreground">{invite.phone}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => copyInvite(inviteUrl)} className="flex-1 bg-surface-hover hover:bg-primary/10 rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-2">
                      <Copy className="w-3.5 h-3.5" /> Link
                    </button>
                    <a href={inviteUrl} target="_blank" rel="noreferrer" className="flex-1 bg-surface-hover hover:bg-primary/10 rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-2">
                      <ExternalLink className="w-3.5 h-3.5" /> Open
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center border border-dashed border-border rounded-xl p-6">
              <ShieldCheck className="w-12 h-12 text-muted opacity-40 mb-4" />
              <p className="text-sm text-muted">Generate a caregiver invite to show the QR code and temporary password.</p>
            </div>
          )}
        </section>
      </div>

      <section className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border bg-surface/50 flex items-center justify-between">
          <h2 className="font-bold text-foreground">Staff List</h2>
          <span className="text-[10px] text-muted uppercase font-bold tracking-widest">{homeData?.homeName || homeData?.agencyName || 'Facility'}</span>
        </div>

        <div className="divide-y divide-border">
          {staffList.length === 0 ? (
            <div className="py-20 text-center">
              <Users2 className="w-16 h-16 text-muted mx-auto mb-4 opacity-20" />
              <h3 className="text-xl font-bold mb-2">No Staff Members</h3>
              <p className="text-sm text-muted max-w-xs mx-auto">
                Invite your first caregiver using the form above to begin building your facility team.
              </p>
            </div>
          ) : (
            staffList.map((staff) => (
              <div key={staff.uid || staff.email} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-hover/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {(staff.name || staff.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{staff.name || staff.email}</p>
                    <p className="text-xs text-muted">{staff.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {(() => {
                    const badge = statusBadge(staff.status);
                    const StatusIcon = badge.icon;
                    return (
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 ${badge.className}`}>
                        <StatusIcon className="w-3 h-3" /> {badge.label}
                      </span>
                    );
                  })()}
                  {staff.acceptedAt && <span className="text-[10px] text-muted uppercase font-bold">Accepted</span>}
                  {staff.invitedAt && staff.status !== 'active' && <span className="text-[10px] text-muted uppercase font-bold">Invited</span>}
                  <span className="text-xs text-muted uppercase font-bold">{staff.role || 'caregiver'}</span>
                  <button
                    onClick={() => handleRemove(staff)}
                    disabled={Boolean(removingEmail && (removingEmail === staff.email || removingEmail === staff.uid))}
                    className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Remove caregiver"
                  >
                    {removingEmail && (removingEmail === staff.email || removingEmail === staff.uid) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </motion.div>
  );
}

export function FamilyAccessView({ homeData, residents = [], createSystemLog }) {
  const [invitingId, setInvitingId] = useState(null);
  const [familyInvites, setFamilyInvites] = useState([]);
  const [lastMessages, setLastMessages] = useState({});
  const [activeChatResident, setActiveChatResident] = useState(null);

  useEffect(() => {
    if (!homeData?.id) return;
    const q = query(collection(db, 'family_invites'), where('homeId', '==', homeData.id));
    const unsub = onSnapshot(q, (snap) => {
      let arr = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      setFamilyInvites(arr);
    });
    return () => unsub();
  }, [homeData?.id]);

  useEffect(() => {
    if (!homeData?.id) return;
    // Remove orderBy to avoid index requirements that cause silent failures or crashes
    const q = query(
      collection(db, 'messages'),
      where('homeId', '==', homeData.id)
    );
    const unsub = onSnapshot(q, (snap) => {
      const latest = {};
      snap.forEach(d => {
        const m = d.data();
        if (m.residentId) {
          const currentLatest = latest[m.residentId];
          const msgTime = m.createdAt?.toMillis() || 0;
          if (!currentLatest || msgTime > (currentLatest.createdAt?.toMillis() || 0)) {
            latest[m.residentId] = { id: d.id, ...m };
          }
        }
      });
      setLastMessages(latest);
    }, (err) => {
      console.error("Family message preview error:", err);
    });
    return () => unsub();
  }, [homeData?.id]);

  const handleInviteFamily = async (resident) => {
    const email = prompt(`Enter email for ${resident.name}'s family representative:`);
    if (!email) return;

    setInvitingId(resident.id);
    try {
      const provisionFamilyAccount = httpsCallable(functions, 'provisionFamilyAccount');
      await provisionFamilyAccount({
        homeId: homeData.id,
        residentId: resident.id,
        residentName: resident.name,
        email: email.toLowerCase().trim(),
        name: email.split('@')[0], // Use email prefix as a fallback name
      });

      if (createSystemLog) {
        await createSystemLog('ACCESS', `Family invitation sent to ${email} for resident ${resident.name}.`, resident.id, resident.name);
      }
      alert("Invitation sent successfully!");
    } catch (err) {
      alert("Failed to send invite: " + err.message);
    } finally {
      setInvitingId(null);
    }
  };

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Family Portal Access</h1>
        <p className="text-muted">Manage family representative access and document signatures.</p>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {residents.length === 0 ? (
          <div className="py-20 text-center glass-card bg-surface/30">
             <MessageSquare className="w-16 h-16 text-muted mx-auto mb-4 opacity-20" />
             <h3 className="text-xl font-bold mb-2">No Family Access Configured</h3>
             <p className="text-sm text-muted max-w-sm mx-auto mb-8">
               Family portal invites are managed at the resident level. 
               Admit a resident to begin configuring family representative access.
             </p>
             <Link to="/dashboard/intake" className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
               Go to Intake Pipeline <ArrowUpRight className="w-4 h-4" />
             </Link>
          </div>
        ) : (
          residents.map((res) => {
            const invite = familyInvites.find(i => i.residentId === res.id);
            const isUnread = lastMessages[res.id] && 
                             lastMessages[res.id].sender === 'family' && 
                             (!invite?.lastReadByStaffAt || 
                              lastMessages[res.id].createdAt?.toMillis() > (invite.lastReadByStaffAt?.toMillis() || 0));
            
            return (
              <div 
                key={res.id} 
                className={`glass-card p-6 flex items-center justify-between group transition-all border-2 ${
                  isUnread ? 'border-primary bg-primary/5 shadow-lg shadow-primary/5' : 'border-border hover:border-primary/30'
                } ${invite ? 'cursor-pointer' : 'cursor-default'}`} 
                onClick={() => {
                  if (invite) setActiveChatResident(res);
                }}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                      {res.name.charAt(0)}
                    </div>
                    {isUnread && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-surface animate-pulse shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-foreground">{res.name}</h3>
                      {invite && (
                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest ${invite.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {invite.status === 'active' ? 'Onboarded' : 'Invite Sent'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted mb-2">Room {res.room || 'TBD'} • {res.careLevel}</p>
                    
                    {lastMessages[res.id] && (
                      <div className="flex items-center gap-2 mt-1 max-w-md">
                        <MessageSquare className={`w-3 h-3 shrink-0 ${isUnread ? 'text-primary' : 'text-muted'}`} />
                        <p className={`text-xs truncate ${isUnread ? 'text-foreground font-bold' : 'text-muted italic'}`}>
                          {lastMessages[res.id].sender === 'staff' ? 'You: ' : ''}"{lastMessages[res.id].text}"
                        </p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          • {lastMessages[res.id].createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
  
                <div className="flex items-center gap-8">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-muted uppercase font-bold tracking-widest mb-1">Signature Documents</span>
                    <div className="flex gap-1">
                      {['Admission', 'HIPAA', 'Financial'].map((docName, i) => (
                        <div key={i} title={docName} className={`w-3 h-3 rounded-full ${res[`signed${docName}`] ? 'bg-emerald-500' : 'bg-slate-200 border border-slate-300'}`} />
                      ))}
                    </div>
                  </div>
  
                  {invite ? (
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col items-end min-w-[120px]">
                        <span className="text-xs font-bold text-foreground">{invite.email}</span>
                        <span className={`text-[10px] uppercase font-bold ${invite.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {invite.status === 'active' ? 'Onboarded' : 'Invite Sent'}
                        </span>
                      </div>
                      <button className="bg-primary/10 text-primary p-3 rounded-full hover:bg-primary/20 transition-colors">
                        <MessageSquare className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInviteFamily(res);
                      }}
                      disabled={invitingId === res.id}
                      className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                    >
                      {invitingId === res.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                      Invite Family
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {activeChatResident && (
          <ProviderChatModal 
            resident={activeChatResident} 
            homeData={homeData} 
            onClose={() => setActiveChatResident(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ProviderChatModal({ resident, homeData, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = React.useRef(null);

  useEffect(() => {
    if (!homeData?.id || !resident?.id) return;

    // Mark as read when opening
    const markAsRead = async () => {
      try {
        const q = query(collection(db, 'family_invites'), where('residentId', '==', resident.id));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const inviteDoc = snap.docs[0];
          await updateDoc(doc(db, 'family_invites', inviteDoc.id), {
            lastReadByStaffAt: serverTimestamp()
          });
        }
      } catch (err) {
        console.error("Read status update failed:", err);
      }
    };
    markAsRead();
    // Remove orderBy to ensure reliability without manual indexing
    const q = query(
      collection(db, 'messages'),
      where('homeId', '==', homeData.id)
    );
    const unsub = onSnapshot(q, (snap) => {
      let arr = [];
      snap.forEach(d => {
        const data = d.data();
        if (!data.residentId || data.residentId === resident.id) {
          arr.push({ id: d.id, ...data });
        }
      });
      // Client-side sort
      arr.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
      setMessages(arr);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (err) => {
      console.error("Provider chat snapshot error:", err);
    });
    return () => unsub();
  }, [homeData?.id, resident?.id]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        text: newMessage,
        sender: 'staff',
        name: 'Facility Admin',
        homeId: homeData.id,
        residentId: resident.id,
        residentName: resident.name,
        createdAt: serverTimestamp()
      });
      setNewMessage('');
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[600px]"
      >
        <header className="p-4 border-b border-border bg-surface/50 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {resident.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-foreground">{resident.name} Family</h3>
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Secure Compliance Channel
                </p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-full transition-colors">
             <X className="w-5 h-5 text-muted" />
           </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
           {messages.map((m, i) => {
             const isMe = m.sender === 'staff';
             return (
               <div key={m.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                    isMe ? 'bg-primary text-white rounded-tr-none' : 'bg-background border border-border text-foreground rounded-tl-none'
                  }`}>
                    {m.text}
                  </div>
                  <span className="text-[8px] text-muted mt-1 uppercase font-bold tracking-tighter">
                    {m.name} • {m.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
               </div>
             );
           })}
           <div ref={scrollRef} />
        </div>

        <form onSubmit={handleSend} className="p-4 bg-background/50 border-t border-border flex items-center gap-2">
           <input 
             value={newMessage}
             onChange={e => setNewMessage(e.target.value)}
             placeholder="Type a message to the family..."
             className="flex-1 bg-surface border border-border rounded-xl px-4 py-2 text-sm text-foreground outline-none focus:border-primary"
           />
           <button 
             type="submit" 
             disabled={!newMessage.trim() || sending}
             className="bg-primary text-white p-2 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
           >
             {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUpRight className="w-5 h-5" />}
           </button>
        </form>
      </motion.div>
    </div>
  );
}

export function TimeEVVView({ homeData, isLocalDemo = false }) {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const homeId = homeData?.id;

  useEffect(() => {
    if (!homeId || isLocalDemo) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'shifts'),
      where('homeId', '==', homeId),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      let arr = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      // Manual sort as fallback for missing index
      arr.sort((a, b) => {
        const tA = a.startTime?.toDate ? a.startTime.toDate() : new Date(a.startTime || 0);
        const tB = b.startTime?.toDate ? b.startTime.toDate() : new Date(b.startTime || 0);
        return tB - tA;
      });
      setShifts(arr);
      setLoading(false);
    }, (err) => {
      console.error("EVV Shifts error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [homeId, isLocalDemo]);

  const formatTime = (ts) => {
    if (!ts) return '--:--';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return null;
    const s = start.toDate ? start.toDate() : new Date(start);
    const e = end.toDate ? end.toDate() : new Date(end);
    const diff = Math.floor((e - s) / 1000 / 60); // minutes
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hrs}h ${mins}m`;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
         <div>
            <h1 className="text-3xl font-bold">Electronic Visit Verification (EVV)</h1>
            <p className="text-muted text-sm mt-1">Cures Act compliant GPS clock-ins and scheduling for field staff.</p>
         </div>
         <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Live Monitoring Active</span>
         </div>
      </header>
      
      {loading ? (
        <div className="glass-card py-24 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
          <p className="text-xs text-muted uppercase font-bold tracking-widest">Syncing EVV Data...</p>
        </div>
      ) : shifts.length === 0 ? (
        <div className="glass-card py-16 px-4 flex flex-col items-center justify-center text-center">
          <Clock className="w-16 h-16 text-muted opacity-20 mb-6" />
          <h2 className="text-2xl font-bold mb-4 text-foreground/80">No Recent Activity</h2>
          <p className="text-muted/70 max-w-lg mb-8 leading-relaxed">
            Caregiver shifts will appear here once they clock in using the mobile portal. 
            All sessions include GPS verification and task compliance logs.
          </p>
          <button className="bg-primary/20 text-primary border border-primary/30 px-6 py-2.5 rounded-xl font-bold text-sm">
            Configure Mobile Access
          </button>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border bg-surface/50 flex justify-between items-center">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Shift Logs
            </h2>
            <span className="text-[10px] text-muted font-bold uppercase tracking-widest">{homeData?.homeName || 'Facility'} • {shifts.length} Sessions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-background/30">
                  <th className="p-4 text-[10px] font-bold text-muted uppercase tracking-widest">Staff</th>
                  <th className="p-4 text-[10px] font-bold text-muted uppercase tracking-widest">Date</th>
                  <th className="p-4 text-[10px] font-bold text-muted uppercase tracking-widest">Shift Window</th>
                  <th className="p-4 text-[10px] font-bold text-muted uppercase tracking-widest">Duration</th>
                  <th className="p-4 text-[10px] font-bold text-muted uppercase tracking-widest">Compliance</th>
                  <th className="p-4 text-[10px] font-bold text-muted uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shifts.map((shift) => (
                  <tr key={shift.id} className="hover:bg-surface-hover/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                          {shift.staffName?.charAt(0) || 'C'}
                        </div>
                        <span className="font-bold text-foreground text-sm">{shift.staffName || 'Unknown Caregiver'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-xs font-medium text-foreground">{formatDate(shift.startTime)}</td>
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-foreground">{formatTime(shift.startTime)} – {formatTime(shift.endTime)}</span>
                        {!shift.endTime && <span className="text-[10px] text-emerald-400 font-bold uppercase">In Progress</span>}
                      </div>
                    </td>
                    <td className="p-4 text-xs font-medium text-muted">{calculateDuration(shift.startTime, shift.endTime) || 'Calculating...'}</td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${shift.evvStartCompliant ? 'bg-emerald-500' : 'bg-rose-500'}`} title="Clock-In Compliance" />
                          <span className={`text-[10px] font-bold uppercase ${shift.evvStartCompliant ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {shift.evvStartCompliant ? 'GPS Verified' : 'Flagged (Out)'}
                          </span>
                        </div>
                        {shift.endTime && (
                          <div className="flex items-center gap-1.5 opacity-60">
                            <div className={`w-1.5 h-1.5 rounded-full ${shift.evvEndCompliant ? 'bg-emerald-500' : 'bg-rose-500'}`} title="Clock-Out Compliance" />
                            <span className="text-[9px] font-bold uppercase">Clock-Out Verified</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {shift.endTime ? (
                        <span className="px-2 py-1 rounded bg-slate-500/10 text-slate-400 text-[10px] font-bold uppercase border border-slate-500/20">Completed</span>
                      ) : (
                        <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase border border-emerald-500/20 flex items-center gap-1 w-fit">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function BillingView({ homeData, residents = [], stateData, createSystemLog }) {
  const [activeTab, setActiveTab] = useState('invoices');
  const [generatingId, setGeneratingId] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [ediConfig, setEdiConfig] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [claims, setClaims] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!homeData?.id) return;
    const q = query(collection(db, 'invoices'), where('homeId', '==', homeData.id), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      let arr = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      setInvoices(arr);
    });

    const unsubConfig = onSnapshot(doc(db, 'edi_configs', homeData.id), (snap) => {
      if (snap.exists()) setEdiConfig(snap.data());
    });

    const qClaims = query(collection(db, 'claims'), where('homeId', '==', homeData.id));
    const unsubClaims = onSnapshot(qClaims, (snap) => {
      let arr = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      setClaims(arr.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));
    });

    const qShifts = query(collection(db, 'shifts'), where('homeId', '==', homeData.id));
    const unsubShifts = onSnapshot(qShifts, (snap) => {
      let arr = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      setShifts(arr.filter(s => s.endTime)); // Only completed shifts
    });

    return () => {
      unsub();
      unsubConfig();
      unsubClaims();
      unsubShifts();
    };
  }, [homeData?.id]);

  const careRates = {
    'Stable': 4500,
    'High-Acuity': 6500,
    'Memory Care': 7500,
    'Default': 5500
  };

  const totalMonthlyRevenue = residents.reduce((sum, res) => {
    return sum + (careRates[res.careLevel] || careRates.Default);
  }, 0);

  const avgRate = residents.length > 0 ? totalMonthlyRevenue / residents.length : 0;

  const handleGenerateInvoice = async (resident) => {
    setGeneratingId(resident.id);
    try {
      const amount = resident.monthlyRate || careRates[resident.careLevel] || careRates.Default;
      const monthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      await addDoc(collection(db, 'invoices'), {
        residentId: resident.id,
        residentName: resident.name,
        homeId: homeData.id,
        amount,
        status: 'pending',
        period: monthYear,
        createdAt: serverTimestamp(),
        type: 'Private Pay'
      });

      if (createSystemLog) {
        await createSystemLog('BILLING', `Monthly invoice of $${amount.toLocaleString()} generated for ${resident.name}.`, resident.id, resident.name);
      }
      
      alert(`Invoice for ${monthYear} generated successfully.`);
    } catch (err) {
      console.error("Invoice generation failed:", err);
      alert("Failed to generate invoice: " + err.message);
    } finally {
      setGeneratingId(null);
    }
  };

  const handleBatchClaims = async () => {
    if (!ediConfig) return setShowConfig(true);
    setSubmitting(true);
    try {
      // Find shifts not already in a claim
      const claimedShiftIds = new Set(claims.flatMap(c => c.shiftIds || []));
      const unbilledShifts = shifts.filter(s => !claimedShiftIds.has(s.id));

      if (unbilledShifts.length === 0) {
        alert("No unbilled EVV shifts found for this period.");
        return;
      }

      const totalAmount = unbilledShifts.length * 150; // Mock $150 per shift
      const claimId = `837P-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      // Generate Mock EDI String
      const ediContent = `ISA*00*          *00*          *ZZ*${ediConfig.npi}*ZZ*MEDICAID*240506*1345*^*00501*000000001*0*P*:~GS*HC*${ediConfig.npi}*MEDICAID*20240506*1345*1*X*005010X222A1~ST*837*0001*005010X222A1~BHT*0019*00*0123*20240506*1345*CH~NM1*41*1*${homeData.homeName}*****XX*${ediConfig.npi}~HL*1**20*1~NM1*85*2*${homeData.homeName}*****XX*${ediConfig.npi}~REF*EI*${ediConfig.taxId}~`;

      await addDoc(collection(db, 'claims'), {
        homeId: homeData.id,
        claimId,
        status: 'Awaiting Batch',
        amount: totalAmount,
        shiftIds: unbilledShifts.map(s => s.id),
        ediContent,
        createdAt: serverTimestamp(),
        providerNpi: ediConfig.npi,
        providerTaxId: ediConfig.taxId
      });

      if (createSystemLog) {
        await createSystemLog('BILLING', `Batched ${unbilledShifts.length} EVV shifts into claim ${claimId}.`, null, 'Clearinghouse');
      }
      alert(`Claim ${claimId} batched with ${unbilledShifts.length} shifts.`);
    } catch (err) {
      console.error(err);
      alert("Batching failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransmit = async (claim) => {
    try {
      await updateDoc(doc(db, 'claims', claim.id), {
        status: 'Transmitted',
        transmittedAt: serverTimestamp()
      });
      // Mock response after 2 seconds
      setTimeout(async () => {
        await updateDoc(doc(db, 'claims', claim.id), {
          status: 'Accepted'
        });
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6 pb-12">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoicing & Claims</h1>
          <p className="text-muted">Manage resident billing, private pay invoices, and Medicaid EDI 837P claims.</p>
        </div>
        <div className="flex gap-2">
           <button className="bg-primary text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-primary/20">
             <Download className="w-4 h-4" /> Export Report
           </button>
        </div>
      </header>

      {/* REVENUE SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5 border-emerald-500/20 bg-emerald-500/5">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +12%
            </span>
          </div>
          <p className="text-xs font-bold text-muted uppercase tracking-widest">Monthly Revenue</p>
          <h3 className="text-2xl font-bold text-foreground mt-1">${totalMonthlyRevenue.toLocaleString()}</h3>
          <p className="text-[10px] text-muted mt-1">Based on current census of {residents.length} residents</p>
        </div>

        <div className="glass-card p-5">
          <div className="p-2 bg-primary/10 rounded-lg text-primary w-fit mb-4">
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-muted uppercase tracking-widest">Average Rate</p>
          <h3 className="text-2xl font-bold text-foreground mt-1">${Math.round(avgRate).toLocaleString()}</h3>
          <p className="text-[10px] text-muted mt-1">Weighted average by acuity level</p>
        </div>

        <div className="glass-card p-5">
          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 w-fit mb-4">
            <Clock className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-muted uppercase tracking-widest">Pending Claims</p>
          <h3 className="text-2xl font-bold text-foreground mt-1">{claims.filter(c => c.status !== 'Accepted').length}</h3>
          <p className="text-[10px] text-muted mt-1">Awaiting clearinghouse response</p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-1 bg-surface p-1 rounded-xl w-fit border border-border">
        <button 
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'invoices' ? 'bg-background text-primary shadow-sm' : 'text-muted hover:text-foreground'}`}
        >
          Private Pay Invoices
        </button>
        <button 
          onClick={() => setActiveTab('claims')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'claims' ? 'bg-background text-primary shadow-sm' : 'text-muted hover:text-foreground'}`}
        >
          Medicaid Claims (837P)
        </button>
      </div>

      {activeTab === 'invoices' ? (
        <section className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border bg-surface/50 flex justify-between items-center">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Active Billing Roster
            </h2>
            <span className="text-[10px] text-muted font-bold uppercase tracking-widest">May 2026 Cycle</span>
          </div>
          
          <div className="divide-y divide-border">
            {residents.length === 0 ? (
              <div className="py-20 text-center bg-surface/30">
                <Receipt className="w-16 h-16 mx-auto mb-4 text-muted opacity-20" />
                <h3 className="text-xl font-bold mb-2">No Residents to Bill</h3>
                <p className="text-sm text-muted max-w-xs mx-auto">
                  Once residents are admitted to your facility, they will appear here for monthly invoicing.
                </p>
              </div>
            ) : (
              residents.map(res => (
                <div key={res.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-hover/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {res.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-sm">{res.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          res.careLevel === 'Memory Care' ? 'bg-purple-500/10 text-purple-400' :
                          res.careLevel === 'High-Acuity' ? 'bg-rose-500/10 text-rose-400' :
                          'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {res.careLevel}
                        </span>
                        <span className="text-[10px] text-muted font-medium">Room {res.room || 'TBD'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-[10px] text-muted uppercase font-bold tracking-tighter">Monthly Total</p>
                      <p className="text-lg font-bold text-foreground tracking-tight">
                        ${(res.monthlyRate || careRates[res.careLevel] || careRates.Default).toLocaleString()}
                      </p>
                    </div>
                    {invoices.some(inv => inv.residentId === res.id && inv.period === new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })) ? (
                      <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-bold border border-emerald-500/20 min-w-[140px] justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Invoiced
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleGenerateInvoice(res)}
                        disabled={generatingId === res.id}
                        className="bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-lg text-xs font-bold border border-primary/20 transition-all flex items-center gap-2 min-w-[140px] justify-center"
                      >
                        {generatingId === res.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Receipt className="w-3.5 h-3.5" />}
                        {generatingId === res.id ? 'Generating...' : 'Generate Invoice'}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-6">
          {!ediConfig ? (
            <div className="glass-card p-12 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mb-6 text-indigo-400 border border-indigo-500/20">
                <CreditCard className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Medicaid EDI Clearinghouse</h2>
              <p className="text-muted text-sm max-w-md mb-8 leading-relaxed">
                Automatically package EVV timesheets and clinical notes into HIPAA-compliant 837P claims for state reimbursement.
              </p>
              <button 
                onClick={() => setShowConfig(true)}
                className="bg-primary text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary/20"
              >
                Configure Clearinghouse
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="glass-card p-6 flex items-center justify-between bg-primary/5 border-primary/20">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                       <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                       <h3 className="font-bold text-foreground">Clearinghouse Active</h3>
                       <p className="text-xs text-muted">NPI: {ediConfig.npi} • Tax ID: {ediConfig.taxId}</p>
                    </div>
                 </div>
                 <div className="flex gap-3">
                    <button 
                      onClick={() => setShowConfig(true)}
                      className="px-4 py-2 bg-surface border border-border rounded-lg text-xs font-bold hover:bg-surface-hover transition-all"
                    >
                      Update Settings
                    </button>
                    <button 
                      onClick={handleBatchClaims}
                      disabled={submitting}
                      className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                      Generate Claim Batch
                    </button>
                 </div>
              </div>

              <div className="glass-card overflow-hidden">
                <table className="w-full text-left">
                   <thead className="bg-surface/50 border-b border-border">
                      <tr className="text-[10px] uppercase font-bold text-muted tracking-widest">
                         <th className="p-4">Claim ID</th>
                         <th className="p-4">Amount</th>
                         <th className="p-4">EVV Units</th>
                         <th className="p-4">Status</th>
                         <th className="p-4 text-right">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-border">
                      {claims.length === 0 ? (
                        <tr>
                           <td colSpan="5" className="p-12 text-center text-muted text-xs italic">No claims generated yet. Click "Generate Claim Batch" to bill completed EVV shifts.</td>
                        </tr>
                      ) : (
                        claims.map(claim => (
                          <tr key={claim.id} className="hover:bg-surface-hover/30 transition-colors">
                             <td className="p-4">
                                <div className="flex flex-col">
                                   <span className="font-bold text-foreground text-sm">{claim.claimId}</span>
                                   <span className="text-[10px] text-muted">{claim.createdAt?.toDate().toLocaleDateString()}</span>
                                </div>
                             </td>
                             <td className="p-4 font-bold text-foreground">${claim.amount.toLocaleString()}</td>
                             <td className="p-4 text-xs text-muted">{claim.shiftIds?.length || 0} Shifts</td>
                             <td className="p-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  claim.status === 'Accepted' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  claim.status === 'Transmitted' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                                  'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                }`}>
                                  {claim.status}
                                </span>
                             </td>
                             <td className="p-4 text-right">
                                {claim.status === 'Awaiting Batch' ? (
                                   <button 
                                     onClick={() => handleTransmit(claim)}
                                     className="text-primary font-bold text-xs hover:underline flex items-center gap-1 ml-auto"
                                   >
                                     <Download className="w-3.5 h-3.5" /> Transmit 837P
                                   </button>
                                ) : (
                                   <button className="text-muted font-bold text-xs hover:text-foreground transition-colors flex items-center gap-1 ml-auto">
                                      <FileText className="w-3.5 h-3.5" /> View EDI
                                   </button>
                                )}
                             </td>
                          </tr>
                        ))
                      )}
                   </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      <AnimatePresence>
        {showConfig && (
          <EDIConfigModal 
            homeData={homeData} 
            stateData={stateData}
            config={ediConfig}
            onClose={() => setShowConfig(false)} 
          />
        )}
      </AnimatePresence>

      {/* RECENT TRANSACTIONS */}
      <section className="glass-card mt-6">
         <div className="p-4 border-b border-border bg-surface/50">
            <h2 className="font-bold text-sm">Recent Activity</h2>
         </div>
         <div className="p-8 text-center">
            <div className="flex flex-col items-center gap-2 text-muted">
               <Clock className="w-8 h-8 opacity-20" />
               <p className="text-xs">No billing events in the last 7 days.</p>
            </div>
         </div>
      </section>
    </motion.div>
  );
}

function EDIConfigModal({ homeData, stateData, config, onClose }) {
  const [formData, setFormData] = useState(config || {
    npi: '',
    taxId: '',
    medicaidId: '',
    receiverName: 'MEDICAID_EDI_HUB',
    receiverId: '808823'
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'edi_configs', homeData.id), formData);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to save config: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-surface border border-border rounded-3xl p-8 shadow-2xl">
         <h2 className="text-2xl font-bold mb-2">Clearinghouse Configuration</h2>
         <p className="text-muted text-sm mb-6">Enter your HIPAA identifiers to enable automated EDI 837P generation.</p>

         <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-[10px] font-bold uppercase text-muted block mb-1">Billing Provider NPI</label>
                  <input 
                    required
                    value={formData.npi}
                    onChange={e => setFormData({...formData, npi: e.target.value})}
                    placeholder="10-digit NPI"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:border-primary outline-none"
                  />
               </div>
               <div>
                  <label className="text-[10px] font-bold uppercase text-muted block mb-1">Provider Tax ID (EIN)</label>
                  <input 
                    required
                    value={formData.taxId}
                    onChange={e => setFormData({...formData, taxId: e.target.value})}
                    placeholder="Tax ID"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:border-primary outline-none"
                  />
               </div>
            </div>
            <div>
               <label className="text-[10px] font-bold uppercase text-muted block mb-1">Medicaid Provider ID</label>
               <input 
                 required
                 value={formData.medicaidId}
                 onChange={e => setFormData({...formData, medicaidId: e.target.value})}
                 placeholder="State Medicaid ID"
                 className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground focus:border-primary outline-none"
               />
            </div>
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
               <div className="flex items-center gap-2 text-primary mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-xs font-bold">HIPAA Secure Connection</span>
               </div>
               <p className="text-[10px] text-muted">Claims will be packaged using X12 5010 837 Professional format standards for the {stateData?.name || 'state'} clearinghouse.</p>
            </div>
            <div className="flex gap-3 pt-4">
               <button type="button" onClick={onClose} className="flex-1 py-3 font-bold text-muted hover:bg-surface rounded-xl transition-all">Cancel</button>
               <button disabled={saving} type="submit" className="flex-[2] bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Saving...' : 'Authorize Clearinghouse'}
               </button>
            </div>
         </form>
      </motion.div>
    </div>
  );
}
