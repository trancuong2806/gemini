export enum Sender {
  USER = 'user',
  MODEL = 'model'
}

export interface Message {
  id: string;
  text: string;
  sender: Sender;
  timestamp: number;
  isError?: boolean;
}

export interface ModelConfig {
  temperature: number;
  thinkingBudget: number; // 0 means disabled
  enableThinking: boolean;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
}