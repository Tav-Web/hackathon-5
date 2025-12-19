"use client";

import { Satellite } from "lucide-react";
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
} from "./styles";

interface HeaderProps {
  onOpenChat: () => void;
  hasCompletedAnalysis: boolean;
  chatDisabled: boolean;
}

export function Header({ onOpenChat, hasCompletedAnalysis, chatDisabled }: HeaderProps) {
  return (
    <Container>
      <Content>
        <LeftSection>
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
