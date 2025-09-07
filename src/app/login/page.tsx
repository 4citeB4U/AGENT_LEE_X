"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingOverlay } from "@/components/login/LoadingOverlay";
import { PolicyModal } from "@/components/login/PolicyModal";
import { BackgroundFx } from "@/components/login/BackgroundFx";
import "./login.css";

const LoginPage: React.FC = () => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ title: "", content: "" });

  const permissions = [
    { id: "mic", label: "Access your microphone" },
    { id: "camera", label: "Access your camera" },
    { id: "screen", label: "Read screen text & contents" },
    { id: "keystrokes", label: "Read all keystrokes" },
    { id: "apps", label: "Control your apps" },
    { id: "files", label: "Read & write your files" },
    { id: "contacts", label: "Access your contacts" },
    { id: "calendar", label: "Access your calendar" },
    { id: "notifs", label: "Read your notifications" },
    { id: "tabs", label: "Access open browser tabs" },
  ];
  const [checkedPerms, setCheckedPerms] = useState<Record<string, boolean>>(
    permissions.reduce((acc, p) => ({ ...acc, [p.id]: true }), {})
  );

  const handlePermChange = (id: string, isChecked: boolean) => {
    setCheckedPerms(prev => ({ ...prev, [id]: isChecked }));
  };
  const handleSelectAll = (isChecked: boolean) => {
    setCheckedPerms(permissions.reduce((acc, p) => ({ ...acc, [p.id]: isChecked }), {}));
  };

  const isAllSelected = Object.values(checkedPerms).every(Boolean);

  const handleContinue = () => {
    if (!name.trim() || !email.trim()) {
      setError("Please enter your name and email.");
      return;
    }
    setError("");
    setIsLoading(true);
    
    setTimeout(() => {
      localStorage.setItem("agentlee_user_info", JSON.stringify({ name, email }));
      router.push("/");
    }, 4000);
  };

  const showPolicy = (type: "privacy" | "terms") => {
    if (type === "privacy") {
      setModalContent({ title: "Privacy Policy", content: "Your data is stored locally on your device and is not shared." });
    } else {
      setModalContent({ title: "Terms of Service", content: "You agree to allow Agent Lee to perform actions on your behalf." });
    }
    setPolicyModalOpen(true);
  };
  
  return (
    <>
      <BackgroundFx />
      <LoadingOverlay isLoading={isLoading} />
      <PolicyModal 
        isOpen={policyModalOpen}
        onClose={() => setPolicyModalOpen(false)}
        title={modalContent.title}
        lastUpdated="July 29th, 2024"
      >
        {modalContent.content}
      </PolicyModal>

      <main className="login-body">
        <div className="login-card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '22px' }}>
            <div style={{ paddingRight: '22px', borderRight: '1px solid var(--edge)' }}>
              <div className="login-logo">
                <img src="https://picsum.photos/160/160" data-ai-hint="logo design" alt="Agent Lee Logo" />
              </div>
              <h1 style={{fontSize: '1.65rem', fontWeight: 700, marginBottom: '4px', lineHeight: 1.2}}>Agent Lee</h1>
              <p className="login-sub">Unified AI Assistant</p>
              <p className="login-muted login-small" style={{ marginTop: '12px' }}>
                Your personal AI assistant, running locally for enhanced privacy and control. All data is stored on your device.
              </p>
            </div>
            <div>
              <details open className="login-section">
                <summary className="login-section-summary">
                  Identity
                </summary>
                <div className="login-section-content">
                  <div className="login-check">
                    <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div className="login-check">
                    <input type="email" placeholder="Email (optional)" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                </div>
              </details>
              <details className="login-section">
                <summary className="login-section-summary">Permissions</summary>
                <div className="login-section-content">
                   <div className="login-check login-select-all">
                      <Checkbox
                        id="select-all"
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                      />
                      <label htmlFor="select-all">Select All Permissions</label>
                   </div>
                   <div className="login-perm-list">
                      {permissions.map(p => (
                         <div className="login-check" key={p.id}>
                           <Checkbox
                             id={p.id}
                             checked={checkedPerms[p.id] ?? false}
                             onCheckedChange={c => handlePermChange(p.id, !!c)}
                           />
                           <label htmlFor={p.id}>{p.label}</label>
                         </div>
                      ))}
                   </div>
                </div>
              </details>

              <button className="login-btn" onClick={handleContinue}>
                Continue
              </button>
              <p className="login-error">{error}</p>

              <div className="login-footer-bar">
                <div className="login-footer-left login-small">
                  &copy; RWD, 2024 &nbsp;&bull;&nbsp;
                  <a href="#" onClick={(e) => {e.preventDefault(); showPolicy("privacy")}} className="login-link">Privacy</a> &nbsp;&bull;&nbsp;
                  <a href="#" onClick={(e) => {e.preventDefault(); showPolicy("terms")}} className="login-link">Terms</a>
                </div>
                <div className="login-footer-right">
                  <img src="https://picsum.photos/120/120" data-ai-hint="futuristic logo" alt="RWD" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default LoginPage;
