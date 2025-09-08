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
        localStorage.setItem('agentlee_user', JSON.stringify({ name, email, savedAt: Date.now() }));
      } catch (_) {}
    }
    // The loading sequence handles the redirect
  };

  const showPolicy = (type: "privacy" | "terms") => {
    // In a real app, you'd fetch this content. For now, we'll use placeholder text.
    if (type === "privacy") {
      setModalContent({ title: "Privacy Policy", content: `Privacy Policy
Last Updated: August 15, 2023

Your privacy is important to us. This policy explains how we collect, use, and protect your personal information.

Table of Contents
1. Information We Collect
2. How We Use Your Information
3. How We Share Your Information
4. Agent Lee AI Assistant
5. Your Rights and Choices
6. Data Retention
7. Children's Privacy
8. International Data Transfers
9. Changes to This Policy
10. Contact Us` });
    } else {
      setModalContent({ title: "Terms of Service", content: `Terms of Service
Last Updated: August 15, 2023

These Terms of Service ("Terms") govern your access to and use of the Artist Empowerment Platform. Please read them carefully.

Table of Contents
1. Acceptance of Terms
2. Account Registration and Security
3. Content and Intellectual Property
4. Platform Fees and Revenue Sharing
5. Prohibited Conduct
6. Termination
7. Disclaimer of Warranties
8. Limitation of Liability
9. Changes to Terms
10. Governing Law
11. Contact Information` });
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
            <Image src="/AGENT_LEE_X/lovable-uploads/2044bfa5-9d5c-4adb-82de-367ae1b43884.png" alt="Agent Lee Avatar" width={160} height={160} className="rounded-xl" />
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
                <Checkbox id="accept_all" checked={isAllSelected} onCheckedChange={handleSelectAll} />
                <label htmlFor="accept_all">Accept all permissions (optional)</label>
              </div>
              <p>Granting them now allows Agent Lee to start with full capabilities. You may skip or change later in Settings.</p>
              <ul className="perm-list">
                {permissions.map(p => (
                  <li className="check" key={p.id}>
                    <Checkbox id={p.id} checked={checkedPerms[p.id]} onCheckedChange={(c) => handlePermChange(p.id, !!c)} />
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
                <Image src="/AGENT_LEE_X/lovable-uploads/a0346b12-b829-4d31-9619-69caf97bb57c.png" alt="RapidWebDevelop Logo" width={120} height={120} />
              </a>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default LoginPage;
