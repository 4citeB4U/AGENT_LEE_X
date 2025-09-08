"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingOverlay } from '@/components/login/LoadingOverlay';
import { PolicyModal } from '@/components/login/PolicyModal';
import "./login.css";

const LoginPage = () => {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [alias, setAlias] = useState('');
  const [saveProfile, setSaveProfile] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', content: '' });

  const permissions = [
    { id: 'p_camera', label: 'Camera — for video calls' },
    { id: 'p_mic', label: 'Microphone — for voice commands' },
    { id: 'p_notif', label: 'Notifications — for reminders' },
    { id: 'p_tel', label: 'Phone & SMS — place/receive calls and texts' },
    { id: 'p_email', label: 'Email — send/receive messages' },
    { id: 'p_files', label: 'Files & media — read PDFs/Docs' },
    { id: 'p_apps', label: 'Apps & browser — open pages/apps' },
    { id: 'p_contacts', label: 'Contacts & calendar — scheduling' },
  ];

  const [checkedPerms, setCheckedPerms] = useState<Record<string, boolean>>(
    permissions.reduce((acc, p) => ({ ...acc, [p.id]: false }), {})
  );

  const handlePermChange = (id: string, isChecked: boolean) => {
    setCheckedPerms((prev) => ({ ...prev, [id]: isChecked }));
  };

  const handleSelectAll = (isChecked: boolean) => {
    setCheckedPerms(permissions.reduce((acc, p) => ({ ...acc, [p.id]: isChecked }), {}));
  };

  const isAllSelected = Object.values(checkedPerms).every(Boolean);

  const handleContinue = () => {
    if (!name.trim() && !email.trim()) {
      setError('Please provide at least a name or an email.');
      return;
    }
    setError('');
    setIsLoading(true);
    if (saveProfile) {
      try {
        localStorage.setItem('agentlee_user', JSON.stringify({ name, email, alias, savedAt: Date.now() }));
      } catch (_) {}
    }
    // The loading sequence handles the redirect to the main app page.
  };

  const showPolicy = (type: "privacy" | "terms") => {
    if (type === "privacy") {
      setModalContent({ title: "Privacy Policy", content: `Privacy Policy - Content...` });
    } else {
      setModalContent({ title: "Terms of Service", content: `Terms of Service - Content...` });
    }
    setPolicyModalOpen(true);
  };
  
  return (
    <>
      <LoadingOverlay isLoading={isLoading} onFinished={() => router.push('/')} />
      <PolicyModal
        isOpen={policyModalOpen}
        onClose={() => setPolicyModalOpen(false)}
        title={modalContent.title}
        lastUpdated="August 15, 2023"
      >
        <pre className="text-sm whitespace-pre-wrap font-body">
          {modalContent.content}
        </pre>
      </PolicyModal>

      <div className="login-body">
        <main className="card" role="main" aria-labelledby="app-title">
          <div className="logo">
            <Image src="/AGENT_LEE_X/lovable-uploads/2044bfa5-9d5c-4adb-82de-367ae1b43884.png" alt="Agent Lee Avatar" width={160} height={160} className="rounded-xl" data-ai-hint="futuristic avatar" />
            <div>
              <h1 id="app-title">Agent Lee — MACMILLION Login</h1>
              <div className="sub">Your personal AI instance. 100% under your control.</div>
            </div>
          </div>

          <div className="muted small" style={{ margin: "-6px 0 10px 0", display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <span>Policies:</span>
            <a href="#" id="openTerms" onClick={(e) => { e.preventDefault(); showPolicy('terms'); }}>Terms of Use</a>
            <span>•</span>
            <a href="#" id="openPrivacy" onClick={(e) => { e.preventDefault(); showPolicy('privacy'); }}>Privacy Policy</a>
          </div>

          <details className="section identity" open style={{ gridArea: "identity" }}>
            <summary><h2>Your info for Agent Lee</h2></summary>
            <div className="section-content">
              <p className="muted small">Provide at least a <strong>name</strong> or <strong>email</strong>. Stored locally; editable later in Settings.</p>
              <div className="check"><label htmlFor="user_name">Name</label><input id="user_name" type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} /></div>
              <div className="check"><label htmlFor="user_email">Email</label><input id="user_email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div className="check"><label htmlFor="user_alias">Alias (optional)</label><input id="user_alias" type="text" placeholder="Preferred nickname" value={alias} onChange={e => setAlias(e.target.value)} /></div>
              <label className="check"><Checkbox id="c_profile" checked={saveProfile} onCheckedChange={(checked) => setSaveProfile(!!checked)} /> Save name/email on this device</label>
            </div>
          </details>

          <details className="section permissions" open style={{ gridArea: "permissions" }}>
            <summary><h2>Permissions requested (all optional)</h2></summary>
            <div className="section-content small">
              <div className="check select-all">
                <Checkbox id="accept_all" checked={isAllSelected} onCheckedChange={(_, checked) => handleSelectAll(!!checked)} />
                <label htmlFor="accept_all">Accept all permissions (optional)</label>
              </div>
              <p>Granting them now allows Agent Lee to start with full capabilities. You may skip or change later in Settings.</p>
              <ul className="perm-list">
                {permissions.map(p => (
                  <li className="check" key={p.id}>
                    <Checkbox id={p.id} checked={checkedPerms[p.id]} onCheckedChange={(_, c) => handlePermChange(p.id, !!c)} />
                    <label htmlFor={p.id}>{p.label}</label>
                  </li>
                ))}
              </ul>
            </div>
          </details>

          <button id="loginBtn" className="btn" style={{ gridArea: "cta" }} onClick={handleContinue}>Continue (permissions optional)</button>
          <div id="error" className="error" role="alert">{error}</div>

          <div className="footer-bar" role="contentinfo" style={{ gridArea: "footer" }}>
            <div className="footer-left small">
              Developed by <a href="https://rapidwebdevelop.com" target="_blank" rel="noopener">rapidwebdevelop.com</a> — a product of <strong>LeeWay Industries</strong>.
            </div>
            <div className="footer-right">
              <a href="https://rapidwebdevelop.com" target="_blank" rel="noopener" aria-label="RapidWebDevelop">
                <Image src="/AGENT_LEE_X/lovable-uploads/a0346b12-b829-4d31-9619-69caf97bb57c.png" alt="RapidWebDevelop Logo" width={120} height={120} data-ai-hint="corporate logo" />
              </a>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default LoginPage;
