"use client";

import { Satellite, Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ChatDrawerTrigger } from "@/components/chat/ChatDrawer";
import {
  Container,
  Content,
  LeftSection,
  IconWrapper,
  TextWrapper,
  Title,
  Subtitle,
  RightSection,
  MobileMenuButton,
} from "./styles";

interface HeaderProps {
  onOpenChat: () => void;
  onOpenSidebar: () => void;
  hasCompletedAnalysis: boolean;
  chatDisabled: boolean;
}

export function Header({ onOpenChat, onOpenSidebar, hasCompletedAnalysis, chatDisabled }: HeaderProps) {
  return (
    <Container>
      <Content>
        <LeftSection>
          <MobileMenuButton onClick={onOpenSidebar} aria-label="Abrir menu">
            <Menu size={24} />
          </MobileMenuButton>
          <IconWrapper>
            <Satellite size={24} />
          </IconWrapper>
          <TextWrapper>
            <Title>TimeLens</Title>
            <Subtitle>Análise de Imagens de Satélite</Subtitle>
          </TextWrapper>
        </LeftSection>
        <RightSection>
          <Badge variant="outline" className="text-xs">
            TAV Hack 2025
          </Badge>
          <ChatDrawerTrigger
            onClick={onOpenChat}
            hasNewAnalysis={hasCompletedAnalysis}
            disabled={chatDisabled}
          />
        </RightSection>
      </Content>
    </Container>
  );
}
