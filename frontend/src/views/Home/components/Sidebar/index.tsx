"use client";

import { Satellite, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUpload } from "@/components/upload/ImageUpload";
import { AnalysisPanel } from "@/components/results/AnalysisPanel";
import { SatellitePanel } from "@/components/satellite/SatellitePanel";
import { Container, TabsContentArea } from "./styles";

type MainTab = "satellite" | "upload";

interface SidebarProps {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  onNewAnalysis: () => void;
}

export function Sidebar({
  activeTab,
  onTabChange,
  onNewAnalysis,
}: SidebarProps) {
  return (
    <Container>
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
  );
}
