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
import {
  DrawerHeaderRow,
  DrawerHeaderLeft,
  DrawerContent,
  DrawerEmptyState,
  DrawerEmptyIcon,
  DrawerEmptyText,
  TriggerIndicator,
} from "./styles";

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
          <DrawerHeaderRow>
            <DrawerHeaderLeft>
              <MessageSquare className="h-5 w-5 text-primary" />
              <SheetTitle className="text-base">Assistente IA</SheetTitle>
              {hasNewAnalysis && (
                <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">Nova Análise</Badge>
              )}
            </DrawerHeaderLeft>
          </DrawerHeaderRow>
          <SheetDescription className="text-xs">
            Tire dúvidas sobre a análise detectada
          </SheetDescription>
        </SheetHeader>

        <DrawerContent>
          {analysisId ? (
            <AIChatPanel analysisId={analysisId} />
          ) : (
            <DrawerEmptyState>
              <DrawerEmptyIcon>
                <MessageSquare className="h-12 w-12" />
              </DrawerEmptyIcon>
              <DrawerEmptyText>
                Execute uma análise para conversar com o assistente IA
              </DrawerEmptyText>
            </DrawerEmptyState>
          )}
        </DrawerContent>
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
      {hasNewAnalysis && <TriggerIndicator />}
    </Button>
  );
}
