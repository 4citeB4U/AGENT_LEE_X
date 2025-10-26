import { useEffect, useMemo, useState } from "react";
import { DEFAULT_STUDIO_ORDER, STUDIOS, type StudioKey } from "../config/studios";

export type Policy = "FAST" | "CHEAP" | "LONG";
export type Persona = "Coach" | "Analyst" | "Producer" | "Concierge";

export interface OnboardingPayload {
  ts: number;
  policy: Policy;
  persona: Persona;
  consent: {
    mic: boolean;
    cam: boolean;
  };
  pinned: StudioKey[];
}

const STORAGE_KEY = "lee.onboard.v11";

const styles = `
  .onboard-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999;
    padding: 2rem;
  }
  .onboard-card {
    width: min(960px, 100%);
    max-height: min(90vh, 760px);
    background: linear-gradient(160deg, rgba(18, 18, 18, 0.95), rgba(0, 0, 0, 0.92));
    border: 1px solid rgba(212, 175, 55, 0.35);
    border-radius: 24px;
    padding: 2.5rem;
    overflow-y: auto;
    color: #f8f8f8;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55);
  }
  .onboard-card h2,
  .onboard-card h3 {
    font-family: "Inter", sans-serif;
    font-weight: 700;
    margin-bottom: 0.75rem;
  }
  .onboard-card h2 {
    font-size: 2rem;
  }
  .onboard-card h3 {
    font-size: 1.5rem;
  }
  .onboard-card p,
  .onboard-card small,
  .onboard-card label {
    font-family: "Inter", sans-serif;
    line-height: 1.45;
  }
  .onboard-card ul { list-style: none; margin: 1.5rem 0; padding: 0; }
  .studio-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }
  .studio-tile {
    background: rgba(32, 32, 32, 0.85);
    border: 1px solid rgba(212, 175, 55, 0.18);
    border-radius: 16px;
    padding: 1rem;
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }
  .studio-tile img {
    width: 56px;
    height: 56px;
    object-fit: contain;
    border-radius: 12px;
    flex-shrink: 0;
  }
  .studio-tile b { display: block; font-size: 1rem; margin-bottom: 0.25rem; }
  .studio-tile p { margin: 0; color: rgba(248, 248, 248, 0.75); font-size: 0.9rem; }
  .persona-row,
  .policy-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin: 1.5rem 0;
  }
  .persona {
    padding: 0.75rem 1.25rem;
    border-radius: 999px;
    border: 1px solid rgba(212, 175, 55, 0.3);
    background: rgba(30, 30, 30, 0.8);
    color: #f8f8f8;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.15s ease, border-color 0.15s ease;
  }
  .persona.active {
    border-color: rgba(212, 175, 55, 0.85);
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(212, 175, 55, 0.25);
  }
  .policy {
    flex: 1 1 220px;
    padding: 1rem;
    border-radius: 16px;
    border: 1px solid rgba(212, 175, 55, 0.2);
    background: rgba(24, 24, 24, 0.85);
    color: #f8f8f8;
    display: grid;
    gap: 0.5rem;
  }
  .policy input { display: none; }
  .policy b { font-size: 1.1rem; }
  .policy span { color: rgba(248, 248, 248, 0.7); font-size: 0.9rem; }
  .policy.active {
    border-color: rgba(212, 175, 55, 0.75);
    box-shadow: 0 10px 30px rgba(212, 175, 55, 0.2);
  }
  .pin-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
    gap: 0.85rem;
    margin: 1.5rem 0;
  }
  .pin {
    list-style: none;
  }
  .pin-button {
    width: 100%;
    border-radius: 14px;
    border: 1px solid rgba(212, 175, 55, 0.2);
    padding: 1rem 0.5rem;
    display: grid;
    place-items: center;
    cursor: pointer;
    gap: 0.65rem;
    background: rgba(30, 30, 30, 0.85);
    transition: transform 0.15s ease, border-color 0.15s ease;
    text-transform: uppercase;
    font-weight: 600;
    letter-spacing: 0.12em;
    color: rgba(248, 248, 248, 0.65);
  }
  .pin-button img {
    width: 48px;
    height: 48px;
    object-fit: contain;
  }
  .pin-button.on {
    border-color: rgba(212, 175, 55, 0.8);
    color: rgba(212, 175, 55, 0.95);
    transform: translateY(-3px);
    box-shadow: 0 12px 24px rgba(212, 175, 55, 0.2);
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 2rem;
  }
  .actions button {
    background: linear-gradient(135deg, #d4af37, #b8860b);
    border: none;
    border-radius: 999px;
    padding: 0.85rem 1.75rem;
    font-size: 1rem;
    font-weight: 600;
    color: #121212;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .actions button:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(212, 175, 55, 0.35);
  }
  @media (max-width: 720px) {
    .onboard-card { padding: 1.5rem; }
    .actions { justify-content: center; }
    .persona-row, .policy-row { flex-direction: column; }
  }
`;

const personaOptions: Persona[] = ["Coach", "Analyst", "Producer", "Concierge"];
const policyOptions: Policy[] = ["FAST", "CHEAP", "LONG"];

const defaultPinned: StudioKey[] = ["writers", "dbl", "ta"];

function toPinnedOrder(selected: StudioKey[]): StudioKey[] {
  const seen = new Set<StudioKey>();
  const normalized: StudioKey[] = [];
  selected.forEach((key) => {
    if (STUDIOS[key] && !seen.has(key)) {
      seen.add(key);
      normalized.push(key);
    }
  });
  DEFAULT_STUDIO_ORDER.forEach((key) => {
    if (!seen.has(key)) {
      normalized.push(key);
    }
  });
  return normalized;
}

const loadSaved = (): OnboardingPayload | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as OnboardingPayload;
    if (!parsed || typeof parsed !== "object") return null;
    const pinned = Array.isArray(parsed.pinned) ? parsed.pinned.filter((key): key is StudioKey => key in STUDIOS) : defaultPinned;
    return {
      ts: parsed.ts || Date.now(),
      policy: policyOptions.includes(parsed.policy) ? parsed.policy : "FAST",
      persona: personaOptions.includes(parsed.persona) ? parsed.persona : "Coach",
      consent: {
        mic: Boolean(parsed.consent?.mic),
        cam: Boolean(parsed.consent?.cam)
      },
      pinned: toPinnedOrder(pinned)
    };
  } catch {
    return null;
  }
};

export default function OnboardingWizard({ onDone }: { onDone: (record?: OnboardingPayload | null) => void }) {
  const saved = useMemo(loadSaved, []);

  const [step, setStep] = useState(saved ? 4 : 0);
  const [policy, setPolicy] = useState<Policy>(saved?.policy ?? "FAST");
  const [persona, setPersona] = useState<Persona>(saved?.persona ?? "Coach");
  const [consentMic, setConsentMic] = useState(saved?.consent.mic ?? false);
  const [consentCam, setConsentCam] = useState(saved?.consent.cam ?? false);
  const [pinned, setPinned] = useState<StudioKey[]>(saved?.pinned ?? defaultPinned);

  useEffect(() => {
    if (saved) {
      onDone(saved);
    }
  }, [saved, onDone]);

  function togglePinned(key: StudioKey) {
    setPinned((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function finish() {
    const payload: OnboardingPayload = {
      ts: Date.now(),
      policy,
      persona,
      consent: { mic: consentMic, cam: consentCam },
      pinned: toPinnedOrder(pinned)
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    onDone(payload);
  }

  return (
    <div className="onboard-backdrop" role="dialog" aria-modal="true" aria-label="Agent Lee onboarding">
      <style>{styles}</style>
      <div className="onboard-card">
        {step === 0 && (
          <section>
            <h2>Welcome to Agent Lee</h2>
            <p>We operate under LEEWAY v11. Your privacy and consent come first.</p>
            <ul className="studio-grid">
              {DEFAULT_STUDIO_ORDER.map((key) => {
                const studio = STUDIOS[key];
                return (
                  <li key={studio.key} className="studio-tile">
                    <img src={studio.icon} alt="" aria-hidden="true" />
                    <div>
                      <b>{studio.label}</b>
                      <p>{studio.tagline}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="actions">
              <button type="button" onClick={() => setStep(1)}>Continue</button>
            </div>
          </section>
        )}

        {step === 1 && (
          <section>
            <h3>Consent & Sensors</h3>
            <p>Agent Lee uses sensors only with your explicit permission. You can grant or revoke access any time in TA.</p>
            <label>
              <input type="checkbox" checked={consentMic} onChange={(e) => setConsentMic(e.target.checked)} /> Allow microphone for voice control
            </label>
            <label>
              <input type="checkbox" checked={consentCam} onChange={(e) => setConsentCam(e.target.checked)} /> Allow camera for visual assistance
            </label>
            <small>Change these settings anytime inside Toning & Adjustments (TA).</small>
            <div className="actions">
              <button type="button" onClick={() => setStep(2)}>Next</button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <h3>Choose a Persona</h3>
            <p>How should Agent Lee behave by default?</p>
            <div className="persona-row">
              {personaOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`persona ${persona === option ? "active" : ""}`}
                  onClick={() => setPersona(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="actions">
              <button type="button" onClick={() => setStep(3)}>Next</button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h3>Default Policy</h3>
            <p>Pick your model routing preference. Adjustments live inside TA.</p>
            <div className="policy-row">
              {policyOptions.map((option) => (
                <label key={option} className={`policy ${policy === option ? "active" : ""}`}>
                  <input type="radio" name="policy" checked={policy === option} onChange={() => setPolicy(option)} />
                  <b>{option}</b>
                  <span>
                    {option === "FAST" && "Quick responses for chat and everyday tasks."}
                    {option === "CHEAP" && "Budget-first routing; quality may dip under heavy load."}
                    {option === "LONG" && "Long-context models for deep documents and analysis."}
                  </span>
                </label>
              ))}
            </div>
            <div className="actions">
              <button type="button" onClick={() => setStep(4)}>Next</button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section>
            <h3>Pin Studios</h3>
            <p>Select studios you want on your quick-access rail.</p>
            <ul className="pin-grid">
              {DEFAULT_STUDIO_ORDER.map((key) => {
                const studio = STUDIOS[key];
                const isPinned = pinned.includes(studio.key);
                const ariaLabel = `${isPinned ? "Unpin" : "Pin"} ${studio.label}`;

                if (isPinned) {
                  return (
                    <li key={studio.key} className="pin">
                      <button
                        type="button"
                        className="pin-button on"
                        onClick={() => togglePinned(studio.key)}
                        aria-pressed="true"
                        aria-label={ariaLabel}
                      >
                        <img src={studio.icon} alt="" aria-hidden="true" />
                        <span>{studio.short}</span>
                      </button>
                    </li>
                  );
                }

                return (
                  <li key={studio.key} className="pin">
                    <button
                      type="button"
                      className="pin-button"
                      onClick={() => togglePinned(studio.key)}
                      aria-pressed="false"
                      aria-label={ariaLabel}
                    >
                      <img src={studio.icon} alt="" aria-hidden="true" />
                      <span>{studio.short}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="actions">
              <button type="button" onClick={finish}>Finish</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
