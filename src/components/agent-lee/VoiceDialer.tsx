"use client";
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Phone, PhoneOff } from 'lucide-react';

interface VoiceDialerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceDialer: React.FC<VoiceDialerProps> = ({ isOpen, onClose }) => {
  const [number, setNumber] = useState('');

  const handleDial = (digit: string) => {
    setNumber(prev => prev + digit);
  };

  const handleDelete = () => {
    setNumber(prev => prev.slice(0, -1));
  };

  const handleCall = () => {
    if(number) {
      console.log(`Calling ${number}...`);
      onClose();
      setNumber('');
    }
  };

  const dialPadKeys = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '*', '0', '#'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-panel border-glass-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-gold-primary text-center font-headline">Voice Call</DialogTitle>
        </DialogHeader>
        <div className="p-4 flex flex-col items-center">
          <div className="w-full h-16 bg-emerald-accent/20 rounded-lg mb-4 flex items-center justify-center text-3xl text-gold-primary font-mono tracking-widest">
            {number || <span className="text-gold-muted opacity-50">Enter number</span>}
          </div>
          <div className="grid grid-cols-3 gap-4 w-full">
            {dialPadKeys.map(key => (
              <Button key={key} variant="action" className="text-2xl h-16 w-full" onClick={() => handleDial(key)}>
                {key}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 w-full mt-4">
             <Button variant="premium" className="h-16" onClick={handleCall} disabled={!number}>
              <Phone className="w-6 h-6"/>
            </Button>
             <Button variant="destructive" className="h-16" onClick={handleDelete}>
              <PhoneOff className="w-6 h-6"/>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
