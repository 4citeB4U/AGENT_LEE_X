"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Mic, Upload, Download, Save } from 'lucide-react';

export const SettingsPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [voiceCloning, setVoiceCloning] = useState(false);
  const [persona, setPersona] = useState('Confident, helpful, concise.');
  const [selectedModel, setSelectedModel] = useState('phi3');

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
                  <Label className="text-gold-primary">Always-on Local LLM</Label>
                  <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm text-gold-muted">Preferred Local Model</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="glass-panel border-glass-border">
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
                  <Label className="text-gold-primary">Voice Cloning</Label>
                  <Switch checked={voiceCloning} onCheckedChange={setVoiceCloning} />
                </div>
                
                <div className="space-y-3">
                  <Button variant="action" size="sm" className="w-full">
                    <Mic className="w-4 h-4" />
                    Record Reference
                  </Button>
                  
                  <Button variant="action" size="sm" className="w-full">
                    <Upload className="w-4 h-4" />
                    Upload Reference
                  </Button>
                  
                  <Button variant="premium" size="sm" className="w-full">
                    <Download className="w-4 h-4" />
                    Clone Voice
                  </Button>
                </div>
                
                <div className="mt-2 text-xs text-gold-muted">
                  Active Profile: <span className="text-gold-primary">default</span>
                </div>
              </div>
            </div>

            {/* Persona Configuration */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-semibold text-gold-primary font-headline">Persona</h3>
              
              <div className="p-4 bg-emerald-accent/20 rounded-xl border border-glass-border">
                <Label className="text-gold-primary mb-2 block">Agent Personality</Label>
                <Textarea
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
