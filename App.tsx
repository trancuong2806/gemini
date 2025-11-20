import React, { useState, useRef, useEffect } from 'react';
import { Message, Sender, ModelConfig } from './types';
import { streamGeminiResponse } from './services/geminiService';
import MessageBubble from './components/MessageBubble';
import SettingsPanel from './components/SettingsPanel';
import { Icons } from './components/Icon';
import { v4 as uuidv4 } from 'uuid';

const INITIAL_CONFIG: ModelConfig = {
  temperature: 0.7,
  thinkingBudget: 4096,
  enableThinking: true
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [config, setConfig] = useState<ModelConfig>(INITIAL_CONFIG);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear the conversation?")) {
      setMessages([]);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const userMessage: Message = {
      id: uuidv4(),
      text: userText,
      sender: Sender.USER,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Create placeholder for AI message
    const aiMessageId = uuidv4();
    const initialAiMessage: Message = {
      id: aiMessageId,
      text: '',
      sender: Sender.MODEL,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, initialAiMessage]);

    try {
      // We pass messages EXCLUDING the current empty AI message and the just added user message 
      // to the history preparation if we were managing history manually in a complex way, 
      // but the service takes the 'currentHistory' before the new interaction.
      // However, the service function signature is (history, newMessage, config).
      // So pass the 'prev' history (everything before the current user msg).
      const historyForApi = messages; 

      const stream = streamGeminiResponse(historyForApi, userText, config);
      
      let accumulatedText = '';

      for await (const chunk of stream) {
        accumulatedText += chunk;
        setMessages(prev => 
          prev.map(msg => 
            msg.id === aiMessageId 
              ? { ...msg, text: accumulatedText } 
              : msg
          )
        );
      }
    } catch (error) {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === aiMessageId 
            ? { ...msg, text: "I encountered an error processing your request.", isError: true } 
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative transition-all duration-300 ease-in-out mr-0">
        
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-600 to-blue-500 text-white p-2 rounded-lg shadow-md">
               <Icons.BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-lg tracking-tight">Gemini 3 Pro</h1>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                 <span className={`w-2 h-2 rounded-full ${config.enableThinking ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'}`}></span>
                 {config.enableThinking ? 'Reasoning Enabled' : 'Standard Mode'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
             <button 
              onClick={handleClearHistory}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              title="Clear Chat"
            >
              <Icons.Trash2 className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
              title="Settings"
            >
              <Icons.Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Messages Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
          <div className="max-w-4xl mx-auto">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 text-center p-8">
                <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-6">
                  <Icons.Sparkles className="w-10 h-10 text-indigo-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-700 mb-2">Welcome to Gemini 3 Pro</h2>
                <p className="max-w-md mx-auto mb-8">
                  Experience advanced reasoning capabilities. Ask complex questions, request code generation, or explore deep logic puzzles.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
                  <button 
                    onClick={() => { setInput("Explain quantum entanglement to a 5-year-old."); if(textareaRef.current) textareaRef.current.focus(); }}
                    className="p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all text-left"
                  >
                    <span className="font-semibold text-slate-700 block mb-1">Explain complex topics</span>
                    <span className="text-xs text-slate-500">"Explain quantum entanglement..."</span>
                  </button>
                  <button 
                    onClick={() => { setInput("Write a Python script to visualize stock market data using pandas and matplotlib."); if(textareaRef.current) textareaRef.current.focus(); }}
                    className="p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all text-left"
                  >
                    <span className="font-semibold text-slate-700 block mb-1">Generate Code</span>
                    <span className="text-xs text-slate-500">"Write a Python script to..."</span>
                  </button>
                </div>
              </div>
            ) : (
              messages.map(msg => <MessageBubble key={msg.id} message={msg} />)
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input Area */}
        <div className="bg-white border-t border-slate-200 p-4 md:p-6">
          <div className="max-w-4xl mx-auto relative">
            <form onSubmit={handleSubmit} className="relative flex items-end gap-2 bg-slate-50 rounded-2xl border border-slate-200 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 focus-within:bg-white transition-all shadow-sm p-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder={isLoading ? "Gemini is thinking..." : "Ask anything..."}
                disabled={isLoading}
                className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-48 min-h-[44px] py-2.5 px-3 text-slate-800 placeholder:text-slate-400"
                rows={1}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={`p-3 rounded-xl flex-shrink-0 transition-all duration-200 ${
                  input.trim() && !isLoading
                    ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 hover:scale-105' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <Icons.Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Icons.Send className="w-5 h-5" />
                )}
              </button>
            </form>
            <div className="text-center mt-2">
              <p className="text-[10px] text-slate-400">
                Gemini may display inaccurate info, including about people, so double-check its responses.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Settings Sidebar Overlay */}
      {isSettingsOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity" 
          onClick={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Settings Panel */}
      <SettingsPanel 
        config={config} 
        setConfig={setConfig} 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
};

export default App;