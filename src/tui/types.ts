export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface SlashCommand {
  slash: string;
  description: string;
  handler: (args: string) => void;
}
