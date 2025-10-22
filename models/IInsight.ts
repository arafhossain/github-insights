export interface IInsight {
  error?: string;
  summary: string;
  usage: Usage;
  costUSD: number;
  model: string;
  repos: string[];
  sinceISO: Date;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_tokens_details: PromptTokensDetails;
  completion_tokens_details: CompletionTokensDetails;
}

export interface CompletionTokensDetails {
  reasoning_tokens: number;
  audio_tokens: number;
  accepted_prediction_tokens: number;
  rejected_prediction_tokens: number;
}

export interface PromptTokensDetails {
  cached_tokens: number;
  audio_tokens: number;
}
