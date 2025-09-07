"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({
  isOpen,
  onClose,
  title,
  lastUpdated,
  children,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] bg-[#0b1018] border-[#1a2333] text-[#e6f0ff] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
          <DialogDescription>
            Last Updated: {lastUpdated} — See also{" "}
            <a
              href="https://rapidwebdevelop.com/research-development.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              rapidwebdevelop.com/research-development.html
            </a>
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 mt-4">
          <pre className="text-sm whitespace-pre-wrap font-body">
            {children}
          </pre>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
