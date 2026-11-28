export type XInsightFocus = "auto" | "postgame" | "tendencia" | "debate" | "hilo";

export interface XInsightCardVisualData {
  kicker: string;
  headline: string;
  primaryStatValue: string;
  primaryStatLabel: string;
  comparisonText: string;
  sourceFooter: string;
}

export interface XInsightDraft {
  id: string;
  angleLabel: string;
  format: "single" | "thread";
  tweets: string[];
  backingFact: string;
  engagementHook: string;
  pollOptions?: string[];
  cardSuggestion: XInsightCardVisualData;
}

export interface XInsightsContextSummary {
  leonesRecord: string;
  leonesPosition: number;
  streak: string;
  lastGameHeadline: string;
}

export interface XInsightsRequestPayload {
  focus?: XInsightFocus;
  manualContext?: string;
  forceRefresh?: boolean;
  season?: number;
}

export interface XInsightsResponseData {
  season: number;
  model: string;
  generatedAt: string;
  focus: XInsightFocus;
  cached: boolean;
  contextSummary: XInsightsContextSummary;
  drafts: XInsightDraft[];
}
