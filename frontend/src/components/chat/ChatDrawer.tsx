"use client";

import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { AIChatPanel } from "./AIChatPanel";

interface ChatDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  analysisId: number | null;
  hasNewAnalysis?: boolean;
}

export function ChatDrawer({
  isOpen,
  onOpenChange,
  analysisId,
  hasNewAnalysis = false,
}: ChatDrawerProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <SheetTitle className="text-base">Assistente IA</SheetTitle>
              {hasNewAnalysis && (
                <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">Nova Análise</Badge>
              )}
            </div>
          </div>
          <SheetDescription className="text-xs">
            Tire dúvidas sobre a análise detectada
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden">
          {analysisId ? (
            <AIChatPanel analysisId={analysisId} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-4">
              <MessageSquare className="h-12 w-12 opacity-20" />
              <p className="text-sm text-center">
                Execute uma análise para conversar com o assistente IA
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Button to trigger the drawer
interface ChatDrawerTriggerProps {
  onClick: () => void;
  hasNewAnalysis?: boolean;
  disabled?: boolean;
}

export function ChatDrawerTrigger({
  onClick,
  hasNewAnalysis = false,
  disabled = false,
}: ChatDrawerTriggerProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="relative"
    >
      <MessageSquare className="h-4 w-4 mr-2" />
      Chat IA
      {hasNewAnalysis && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
      )}
    </Button>
  );
}
