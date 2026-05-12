import React, { useState, useCallback } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { Menu } from './menu.js';
import { InputPrompt } from './input-prompt.js';
import { ResultView } from './result-view.js';
import { ChatView } from './chat-view.js';
import { menuItems } from './types.js';
import type { TuiScreen, ChatMessage } from './types.js';
import type { AgentRun } from '../agent.js';
import { createLlmClient } from '../llm.js';
import { gatherVaultContext, buildContextualSystemPrompt } from './vault-context.js';
import { saveChat, loadLastChat } from './chat-persistence.js';

const baseSystemPrompt = 'Eres Librarian, el bibliotecario del vault de Obsidian de Van. Responde en el idioma del usuario, de forma breve y util. Cuando hables del vault, usa la informacion de contexto que se te proporciona. Si detectas cruces interesantes entre conceptos, proponelos.';

export const App: React.FC = () => {
  const { exit } = useApp();
  const [screen, setScreen] = useState<TuiScreen>('menu');
  const [inputValue, setInputValue] = useState('');
  const [inputLabel, setInputLabel] = useState('');
  const [pendingInput, setPendingInput] = useState('');
  const [result, setResult] = useState<AgentRun<unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'system', content: baseSystemPrompt },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const executeAction = useCallback(async (fullInput: string) => {
    setLoading(true);
    setScreen('result');

    try {
      const { runLibrarian } = await import('../harness.js');
      const run = await runLibrarian(fullInput);

      setResult(run);
    } catch (error) {
      setResult({
        routed: { intent: 'unknown', confidence: 0 },
        result: { message: `Error: ${error instanceof Error ? error.message : String(error)}` },
        session: { id: '', turns: 0 },
        steps: [{ kind: 'reflect', message: 'Error en la ejecucion' }],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const sendChatMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = { role: 'user', content };
    const newMessages = [...chatMessages, userMessage];

    setChatMessages(newMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const context = await gatherVaultContext(newMessages);
      const contextualMessages: ChatMessage[] = [
        { role: 'system', content: buildContextualSystemPrompt(baseSystemPrompt, context) },
        ...newMessages.filter((m) => m.role !== 'system'),
      ];

      const llm = createLlmClient();
      const response = await llm.chat(contextualMessages);
      const assistantMessage: ChatMessage = { role: 'assistant', content: response.content };

      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
      };

      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  }, [chatMessages]);

  const enterChat = useCallback(async (firstMessage: string) => {
    const previousChat = await loadLastChat();
    const previousMessages = previousChat
      ? previousChat.filter((m) => m.role !== 'system')
      : [];

    const userMessage: ChatMessage = { role: 'user', content: firstMessage };
    const allMessages: ChatMessage[] = [
      { role: 'system', content: baseSystemPrompt },
      ...previousMessages,
      userMessage,
    ];

    setChatMessages(allMessages);
    setChatInput('');
    setScreen('chat');
    setChatLoading(true);

    gatherVaultContext(allMessages)
      .then((context) => {
        const contextualMessages: ChatMessage[] = [
          { role: 'system', content: buildContextualSystemPrompt(baseSystemPrompt, context) },
          ...allMessages.filter((m) => m.role !== 'system'),
        ];
        const llm = createLlmClient();

        return llm.chat(contextualMessages);
      })
      .then((response) => {
        const assistantMessage: ChatMessage = { role: 'assistant', content: response.content };

        setChatMessages((prev) => [...prev, assistantMessage]);
      })
      .catch((error) => {
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        };

        setChatMessages((prev) => [...prev, errorMessage]);
      })
      .finally(() => {
        setChatLoading(false);
      });
  }, []);

  useInput((input, key) => {
    if (screen === 'menu') {
      if (input === 'q') {
        exit();
        return;
      }

      const item = menuItems.find((m) => m.key === input);

      if (item) {
        if (item.key === '3') {
          setInputLabel(item.label);
          setInputValue('');
          setPendingInput('__chat__');
          setScreen('input');
          return;
        }

        if (item.needsInput) {
          setInputLabel(item.label);
          setInputValue('');
          setPendingInput(item.input);
          setScreen('input');
        } else {
          executeAction(item.input);
        }
      }

      return;
    }

    if (screen === 'input') {
      if (key.escape) {
        setScreen('menu');
        return;
      }

      if (key.return) {
        if (inputValue.trim()) {
          if (pendingInput === '__chat__') {
            enterChat(inputValue.trim());
          } else {
            executeAction(pendingInput + inputValue.trim());
          }
        }
        return;
      }

      if (key.backspace || key.delete) {
        setInputValue((prev) => prev.slice(0, -1));
        return;
      }

      if (input) {
        setInputValue((prev) => prev + input);
      }

      return;
    }

    if (screen === 'chat') {
      if (key.escape) {
        saveChat(chatMessages).catch(() => {});
        setScreen('menu');
        setChatMessages([{ role: 'system', content: baseSystemPrompt }]);
        setChatInput('');
        return;
      }

      if (chatLoading) return;

      if (key.return) {
        if (chatInput.trim()) {
          sendChatMessage(chatInput.trim());
        }
        return;
      }

      if (key.backspace || key.delete) {
        setChatInput((prev) => prev.slice(0, -1));
        return;
      }

      if (input) {
        setChatInput((prev) => prev + input);
      }

      return;
    }

    if (screen === 'result') {
      if (key.return || key.escape) {
        setScreen('menu');
        setResult(null);
      }
    }
  });

  if (screen === 'menu') {
    return <Menu onSelect={() => {}} />;
  }

  if (screen === 'input') {
    return (
      <InputPrompt
        label={inputLabel}
        value={inputValue}
        onChange={setInputValue}
        onSubmit={() => {}}
        onBack={() => setScreen('menu')}
      />
    );
  }

  if (screen === 'chat') {
    return (
      <ChatView
        messages={chatMessages}
        inputValue={chatInput}
        loading={chatLoading}
      />
    );
  }

  if (screen === 'result') {
    if (loading) {
      return (
        <Box flexDirection="column">
          <Text>Cargando...</Text>
        </Box>
      );
    }

    if (result) {
      return <ResultView result={result} onBack={() => setScreen('menu')} />;
    }
  }

  return null;
};
