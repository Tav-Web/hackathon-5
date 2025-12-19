"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Sparkles, MessageCircle, Lightbulb, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getAutoAnalysis,
  getChatSuggestions,
  askQuestion,
  type AnalysisType,
} from "@/lib/api";
import type {
  ChatMessage,
  AutoAnalysisResponse,
  SuggestedQuestion,
} from "@/types/gee";
import {
  ChatPanelContainer,
  ChatLoadingContainer,
  AutoAnalysisCard,
  AutoAnalysisHeader,
  AutoAnalysisTitle,
  AutoAnalysisContent,
  AnalysisSummary,
  AnalysisDetail,
  RecommendationsSection,
  RecommendationsTitle,
  RecommendationsList,
  SuggestionsContainer,
  SuggestionsHeader,
  SuggestionsGrid,
  MessagesContainer,
  MessageRow,
  MessageAvatar,
  MessageBubble,
  MessageContent,
  LoadingMessage,
  LoadingBubble,
  LoadingContent,
  LoadingText,
  InputArea,
  ErrorMessage,
  InputRow,
} from "./styles";

// Simple markdown renderer for basic formatting
function SimpleMarkdown({ children }: { children: string }) {
  const formatText = (text: string) => {
    // Split by lines
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];

    lines.forEach((line, index) => {
      // Headers
      if (line.startsWith('### ')) {
        elements.push(
          <h4 key={index} className="font-semibold text-sm mt-3 mb-1">
            {line.slice(4)}
          </h4>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h3 key={index} className="font-bold text-sm mt-3 mb-1">
            {line.slice(3)}
          </h3>
        );
      } else if (line.startsWith('# ')) {
        elements.push(
          <h2 key={index} className="font-bold text-base mt-3 mb-1">
            {line.slice(2)}
          </h2>
        );
      } else if (line.startsWith('* ') || line.startsWith('- ')) {
        // List items
        const content = line.slice(2);
        elements.push(
          <li key={index} className="ml-4 text-xs">
            {formatInlineText(content)}
          </li>
        );
      } else if (line.trim() === '') {
        elements.push(<br key={index} />);
      } else {
        elements.push(
          <p key={index} className="text-xs mb-1">
            {formatInlineText(line)}
          </p>
        );
      }
    });

    return elements;
  };

  // Format bold text
  const formatInlineText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return <div className="space-y-1">{formatText(children)}</div>;
}

interface AIChatPanelProps {
  analysisId: number;
  analysisType?: AnalysisType;
  onClose?: () => void;
}

export function AIChatPanel({ analysisId, analysisType = "auto" }: AIChatPanelProps) {
  const [autoAnalysis, setAutoAnalysis] = useState<AutoAnalysisResponse | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedQuestion[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadInitialData() {
      setIsLoadingInitial(true);
      setError(null);

      try {
        const [analysisData, suggestionsData] = await Promise.all([
          getAutoAnalysis(analysisId, analysisType).catch(() => null),
          getChatSuggestions(analysisId, analysisType).catch(() => ({ suggestions: [] })),
        ]);

        if (analysisData) {
          setAutoAnalysis(analysisData);
        }
        setSuggestions(suggestionsData.suggestions || []);
      } catch (err) {
        setError("Erro ao carregar dados da análise");
        console.error("Error loading chat data:", err);
      } finally {
        setIsLoadingInitial(false);
      }
    }

    if (analysisId) {
      loadInitialData();
    }
  }, [analysisId, analysisType]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const question = inputValue.trim();
    setInputValue("");

    const userMessage: ChatMessage = {
      role: "user",
      content: question,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await askQuestion(analysisId, question, analysisType);

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.answer,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "Desculpe, ocorreu um erro ao processar sua pergunta. Por favor, tente novamente.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      console.error("Error asking question:", err);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSuggestionClick = (question: string) => {
    setInputValue(question);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoadingInitial) {
    return (
      <ChatLoadingContainer>
        {/* Skeleton for auto analysis card */}
        <AutoAnalysisCard elevation={0}>
          <AutoAnalysisHeader>
            <AutoAnalysisTitle>
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </AutoAnalysisTitle>
          </AutoAnalysisHeader>
          <AutoAnalysisContent>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </AutoAnalysisContent>
        </AutoAnalysisCard>
        <Separator />
        {/* Skeleton for suggestions */}
        <SuggestionsContainer>
          <Skeleton className="h-3 w-28" />
          <SuggestionsGrid>
            <Skeleton className="h-6 w-32 rounded-full" />
            <Skeleton className="h-6 w-40 rounded-full" />
            <Skeleton className="h-6 w-36 rounded-full" />
          </SuggestionsGrid>
        </SuggestionsContainer>
      </ChatLoadingContainer>
    );
  }

  return (
    <ChatPanelContainer>
      {/* Auto Analysis Section - Collapsible */}
      {autoAnalysis && (
        <AutoAnalysisCard elevation={0}>
          <AutoAnalysisHeader>
            <AutoAnalysisTitle>
              <Sparkles className="h-4 w-4 text-primary" />
              Análise Automática
            </AutoAnalysisTitle>
          </AutoAnalysisHeader>
          <AutoAnalysisContent>
            {/* Summary - Always visible */}
            <AnalysisSummary>{autoAnalysis.summary}</AnalysisSummary>

            {/* Detailed Analysis - Collapsible */}
            {isAnalysisExpanded && (
              <AnalysisDetail style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <SimpleMarkdown>{autoAnalysis.detailedAnalysis}</SimpleMarkdown>

                {/* Recommendations */}
                {autoAnalysis.recommendations.length > 0 && (
                  <RecommendationsSection>
                    <RecommendationsTitle>Recomendações:</RecommendationsTitle>
                    <RecommendationsList>
                      {autoAnalysis.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </RecommendationsList>
                  </RecommendationsSection>
                )}
              </AnalysisDetail>
            )}

            {/* Expand/Collapse Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAnalysisExpanded(!isAnalysisExpanded)}
              className="w-full h-7 text-xs text-muted-foreground hover:text-foreground mt-2"
            >
              {isAnalysisExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Ver menos
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Ver análise completa
                </>
              )}
            </Button>
          </AutoAnalysisContent>
        </AutoAnalysisCard>
      )}

      <Separator />

      {/* Suggestions */}
      {suggestions.length > 0 && messages.length === 0 && (
        <SuggestionsContainer>
          <SuggestionsHeader>
            <Lightbulb className="h-3 w-3" />
            Perguntas sugeridas
          </SuggestionsHeader>
          <SuggestionsGrid>
            {suggestions.slice(0, 4).map((suggestion, i) => (
              <Badge
                key={i}
                variant="outline"
                className="cursor-pointer hover:bg-accent transition-colors text-xs py-1"
                onClick={() => handleSuggestionClick(suggestion.question)}
              >
                {suggestion.question}
              </Badge>
            ))}
          </SuggestionsGrid>
        </SuggestionsContainer>
      )}

      {/* Chat Messages */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <MessagesContainer>
          {messages.map((message, i) => (
            <MessageRow key={i} $isUser={message.role === "user"}>
              {message.role === "assistant" && (
                <MessageAvatar $variant="assistant">
                  <Sparkles className="h-4 w-4 text-primary" />
                </MessageAvatar>
              )}
              <MessageBubble $isUser={message.role === "user"}>
                {message.role === "assistant" ? (
                  <SimpleMarkdown>{message.content}</SimpleMarkdown>
                ) : (
                  <MessageContent>{message.content}</MessageContent>
                )}
              </MessageBubble>
              {message.role === "user" && (
                <MessageAvatar $variant="user">
                  <MessageCircle className="h-4 w-4" />
                </MessageAvatar>
              )}
            </MessageRow>
          ))}

          {isLoading && (
            <LoadingMessage>
              <MessageAvatar $variant="assistant">
                <Sparkles className="h-4 w-4 text-primary" />
              </MessageAvatar>
              <LoadingBubble>
                <LoadingContent>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <LoadingText>Pensando...</LoadingText>
                </LoadingContent>
              </LoadingBubble>
            </LoadingMessage>
          )}
        </MessagesContainer>
      </ScrollArea>

      {/* Input Area */}
      <InputArea>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <InputRow>
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Faça uma pergunta sobre a análise..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </InputRow>
      </InputArea>
    </ChatPanelContainer>
  );
}
