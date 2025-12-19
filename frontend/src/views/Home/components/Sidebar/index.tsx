"use client";

import { Satellite, Upload, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUpload } from "@/components/upload/ImageUpload";
import { AnalysisPanel } from "@/components/results/AnalysisPanel";
import { SatellitePanel } from "@/components/satellite/SatellitePanel";
import {
  Container,
  TabsContentArea,
  MobileOverlay,
  MobileDrawerHeader,
  MobileDrawerTitle,
  MobileCloseButton,
} from "./styles";

type MainTab = "satellite" | "upload";

interface SidebarProps {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  onNewAnalysis: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  activeTab,
  onTabChange,
  onNewAnalysis,
  isOpen = false,
  onClose,
}: SidebarProps) {
  return (
    <>
      <MobileOverlay $isOpen={isOpen} onClick={onClose} />
      <Container $isOpen={isOpen}>
        <MobileDrawerHeader>
          <MobileDrawerTitle>Menu</MobileDrawerTitle>
          <MobileCloseButton onClick={onClose} aria-label="Fechar menu">
            <X size={24} />
          </MobileCloseButton>
        </MobileDrawerHeader>
      <Tabs
        value={activeTab}
        onValueChange={(v) => onTabChange(v as MainTab)}
        className="flex flex-col h-full min-h-0"
      >
        <TabsList className="d-flex space-x-2 border-b-0 mb-4">
          <TabsTrigger value="satellite" className="text-md">
            <Satellite className="h-3 w-3 mr-1" />
            Satélite
          </TabsTrigger>
          <TabsTrigger value="upload" className="text-xs">
            <Upload className="h-3 w-3 mr-1" />
            Upload
          </TabsTrigger>
        </TabsList>

        <TabsContentArea>
          <TabsContent value="satellite" className="mt-0 space-y-4">
            <SatellitePanel onNewAnalysis={onNewAnalysis} />
          </TabsContent>
          <TabsContent value="upload" className="mt-0 space-y-4">
            <ImageUpload />
            <AnalysisPanel />
          </TabsContent>
        </TabsContentArea>
      </Tabs>
      </Container>
    </>
  );
}
