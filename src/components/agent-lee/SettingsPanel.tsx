"use client";
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Mic, Upload, Download, Save } from 'lucide-react';
import { listKokoroVoices } from '@/lib/kokoro-tts';

export const SettingsPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [voiceCloning, setVoiceCloning] = useState(false);
  const [persona, setPersona] = useState('Confident, helpful, concise.');
  const [selectedModel, setSelectedModel] = useState('phi3');

  // Kokoro voice & speed
  const [kokoroVoices, setKokoroVoices] = useState<string[]>([]);
  const [kokoroVoice, setKokoroVoice] = useState<string>('am_michael');
  const [kokoroSpeed, setKokoroSpeed] = useState<number>(0.95);

  // Load saved settings and voices when panel opens
  useEffect(() => {
    if (!isOpen) return;
    try {
      const v = localStorage.getItem('agentlee_voice'); if (v) setKokoroVoice(v);
      const s = localStorage.getItem('agentlee_voice_speed'); if (s) setKokoroSpeed(parseFloat(s));
    } catch {}
    (async () => {
      try {
        const voices = await listKokoroVoices();
        setKokoroVoices(voices && voices.length ? voices : [
          'am_michael','am_fenrir','am_liam','am_eric','am_echo','am_onyx','af_sky'
        ]);
      } catch {
        setKokoroVoices(['am_michael','am_fenrir','am_liam','am_eric','am_echo','am_onyx','af_sky']);
      }
    })();
  }, [isOpen]);

  const saveVoiceSettings = () => {
    try {
      localStorage.setItem('agentlee_voice', kokoroVoice);
      localStorage.setItem('agentlee_voice_speed', String(kokoroSpeed));
    } catch {}
  };

  return (
    <div className="fixed bottom-6 left-6 z-40">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="settings" 
            size="floating"
            className="shadow-luxury"
          >
            <Settings className="w-5 h-5" />
            Settings
          </Button>
        </DialogTrigger>
        
        <DialogContent className="glass-panel border-glass-border backdrop-blur-lg max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gold-primary text-xl font-headline">Agent Lee — Settings</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* AI Engines */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gold-primary font-headline">AI Engines</h3>
              
              <div className="p-4 bg-emerald-accent/20 rounded-xl border border-glass-border">
                <div className="flex items-center justify-between mb-3">
                  <Label htmlFor="alwaysOnLocalLLM" className="text-gold-primary">Always-on Local LLM</Label>
                  <Switch id="alwaysOnLocalLLM" checked={aiEnabled} onCheckedChange={setAiEnabled} aria-label="Always-on Local LLM" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="preferredModel" className="text-sm text-gold-muted">Preferred Local Model</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger id="preferredModel" className="glass-panel border-glass-border" aria-label="Preferred local model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-panel border-glass-border">
                      <SelectItem value="phi3">Phi-3 (local)</SelectItem>
                      <SelectItem value="gemma">Gemma (local)</SelectItem>
                      <SelectItem value="llama">Llama (local)</SelectItem>
                      <SelectItem value="azr">AZR Reasoner (phi3 fallback)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="mt-2 text-xs text-gold-muted">
                  Status: <span className="text-status-active">active</span>
                </div>
              </div>
            </div>

            {/* Voice & Cloning */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gold-primary font-headline">Voice & Image (OpenVoice)</h3>
              
              <div className="p-4 bg-emerald-accent/20 rounded-xl border border-glass-border">
                <div className="flex items-center justify-between mb-3">
                  <Label htmlFor="voiceCloningSwitch" className="text-gold-primary">Voice Cloning</Label>
                  <Switch id="voiceCloningSwitch" checked={voiceCloning} onCheckedChange={setVoiceCloning} aria-label="Enable voice cloning" />
                </div>
                
                  <div className="space-y-3">
                  <Button variant="action" size="sm" className="w-full" aria-label="Record reference sample">
                    <Mic className="w-4 h-4" />
                    Record Reference
                  </Button>
                  
                  <Button variant="action" size="sm" className="w-full" aria-label="Upload reference sample">
                    <Upload className="w-4 h-4" />
                    Upload Reference
                  </Button>
                  
                  <Button variant="premium" size="sm" className="w-full" aria-label="Clone voice">
                    <Download className="w-4 h-4" />
                    Clone Voice
                  </Button>
                </div>
                
                <div className="mt-2 text-xs text-gold-muted">
                  Active Profile: <span className="text-gold-primary">default</span>
                </div>
              </div>

              {/* Kokoro Voice Settings */}
              <div className="p-4 bg-emerald-accent/20 rounded-xl border border-glass-border">
                <h4 className="text-sm font-semibold text-gold-primary mb-3">Kokoro Voice (client-side, no keys)</h4>
                <div className="grid gap-3">
                  <div>
                    <Label htmlFor="kokoroVoiceSelect" className="text-sm text-gold-muted">Voice</Label>
                    <Select value={kokoroVoice} onValueChange={setKokoroVoice}>
                      <SelectTrigger id="kokoroVoiceSelect" className="glass-panel border-glass-border mt-1" aria-label="Kokoro voice selector">
                        <SelectValue placeholder="Select voice" />
                      </SelectTrigger>
                      <SelectContent className="glass-panel border-glass-border max-h-64 overflow-auto">
                        {kokoroVoices.map(v => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="kokoroSpeed" className="text-sm text-gold-muted">Speed: {kokoroSpeed.toFixed(2)}</Label>
                    <input
                      id="kokoroSpeed"
                      type="range"
                      min={0.75}
                      max={1.25}
                      step={0.01}
                      value={kokoroSpeed}
                      onChange={(e)=>setKokoroSpeed(parseFloat(e.target.value))}
                      className="w-full"
                      aria-label={`Kokoro speed ${kokoroSpeed.toFixed(2)}`}
                      title={`Kokoro speed: ${kokoroSpeed.toFixed(2)}`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="premium" size="sm" onClick={saveVoiceSettings}>
                      <Save className="w-4 h-4" /> Save Voice Settings
                    </Button>
                  </div>
                  <div className="text-xs text-gold-muted">Changes take effect on the next utterance.</div>
                </div>
              </div>
            </div>

            {/* Persona Configuration */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-semibold text-gold-primary font-headline">Persona</h3>
              
              <div className="p-4 bg-emerald-accent/20 rounded-xl border border-glass-border">
                <Label htmlFor="agentPersona" className="text-gold-primary mb-2 block">Agent Personality</Label>
                <Textarea
                  id="agentPersona"
                  value={persona}
                  onChange={(e) => setPersona(e.target.value)}
                  placeholder="e.g., Confident, helpful, concise. Calls the user 'boss'."
                  className="glass-panel border-glass-border resize-none h-24 font-body"
                />
                
                <div className="flex justify-between items-center mt-3">
                  <Button variant="premium" size="sm">
                    <Save className="w-4 h-4" />
                    Save Persona
                  </Button>
                  <span className="text-xs text-gold-muted">
                    Default voice will be used unless changed above
                  </span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
