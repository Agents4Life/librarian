import type { CurationProposal, WikiCategory } from './types.js';
import { createLlmClient, type LlmMessage } from './llm.js';

type ChatToProposalInput = {
  question: string;
  answer: string;
  existingPages: string[];
  sourceContext?: string;  // which wiki pages were used as context
};

const chatToProposalPrompt = (input: ChatToProposalInput): string => {
  const pageList = input.existingPages.length > 0
    ? input.existingPages.join('\n')
    : '(no existing pages)';

  return `You are a wiki librarian. A user asked a question and got a useful answer. Convert this Q&A into a wiki page proposal.

## Existing wiki pages:
${pageList}

## User question:
${input.question}

## LLM answer:
${input.answer}

${input.sourceContext ? `## Source pages used: ${input.sourceContext}` : ''}

Respond with ONLY a JSON object:
{
  "title": "Page title (concise, in the same language)",
  "category": "conceptos" | "entidades" | "sources" | "synthesis",
  "tags": ["tag1", "tag2"],
  "summary": "Brief summary",
  "content": "The full wiki page content in Markdown, synthesizing the Q&A into a standalone reference page",
  "suggestedLinks": ["existing page names to link to"]
}

Rules:
- The page should be self-contained and useful on its own
- Include wikilinks using [[page name]] syntax for suggested links
- Keep the same language as the question
- Tags should be lowercase
- Content should be structured with headers if appropriate`;
};

export const convertChatToProposal = async (input: ChatToProposalInput): Promise<CurationProposal> => {
  const client = createLlmClient();
  
  const messages: LlmMessage[] = [
    { role: 'system', content: 'You are a wiki librarian. Respond only with valid JSON.' },
    { role: 'user', content: chatToProposalPrompt(input) },
  ];

  let title = 'Untitled';
  let category: WikiCategory = 'conceptos';
  let tags: string[] = [];
  let summary = '';
  let content = '';
  let suggestedLinks: string[] = [];

  try {
    const response = await client.chat(messages);
    const responseContent = response.content?.trim();

    if (responseContent) {
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const validCategories: WikiCategory[] = ['conceptos', 'entidades', 'sources', 'synthesis'];
        
        if (parsed.title && typeof parsed.title === 'string') title = parsed.title;
        if (parsed.category && validCategories.includes(parsed.category)) category = parsed.category;
        if (Array.isArray(parsed.tags)) tags = parsed.tags.slice(0, 10);
        if (typeof parsed.summary === 'string') summary = parsed.summary;
        if (typeof parsed.content === 'string') content = parsed.content;
        if (Array.isArray(parsed.suggestedLinks)) suggestedLinks = parsed.suggestedLinks;
      }
    }
  } catch {
    // Fallback: use the raw answer as content
    content = input.answer;
  }

  // Normalize title to filename
  const fileName = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const wikiRelativePath = `wiki/${category}/${fileName}.md`;

  const preview = [
    '---',
    `librarian:`,
    `  processed: false`,
    `  status: review`,
    `  source: chat-qna`,
    `  category: ${category}`,
    `tags: [${tags.map(t => `"${t}"`).join(', ')}]`,
    `summary: "${summary.replace(/"/g, '\\"')}"`,
    '---',
    '',
    `# ${title}`,
    '',
    content.trim(),
  ].join('\n');

  return {
    diff_id: `chat-${Date.now()}`,
    source: 'chat-qna',
    target: wikiRelativePath,
    type: 'create',
    status: 'pending_approval',
    preview,
    category,
    tags,
    summary,
    suggestedLinks,
    duplicate: 'none',
  };
};
