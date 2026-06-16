import { useState } from "react";
import API from "../services/api";

export default function ChatOps() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Hello! I am your AI Copilot. Ask me anything about your uploaded files, system incidents, data spreadsheets, or operational logs."
    }
  ]);
  const [loading, setLoading] = useState(false);

  const askAI = async () => {
    if (!question.trim()) return;
    
    const userMsg = { sender: "user", text: question };
    setMessages((prev) => [...prev, userMsg]);
    const queryStr = question;
    setQuestion("");
    setLoading(true);

    try {
      const response = await API.get("/chatops", {
        params: { question: queryStr }
      });
      const aiMsg = {
        sender: "ai",
        text: response.data.answer || "No response received."
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg = {
        sender: "ai",
        text: "Sorry, I encountered an error connecting to the AI model."
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      askAI();
    }
  };

  const quickPrompts = [
    "What are the most recent critical failures?",
    "Summarize findings in payment_failure.log",
    "Identify trends or anomalies across the uploaded datasets"
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center p-8">
      <div className="max-w-4xl w-full flex flex-col h-[80vh] bg-slate-800/80 border border-slate-700/60 rounded-2xl shadow-xl backdrop-blur-md overflow-hidden mt-6">
        
        {/* Header */}
        <div className="border-b border-slate-700/60 p-5 bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">💬</span>
            <div>
              <h1 className="font-extrabold text-lg bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                ChatOps Copilot
              </h1>
              <p className="text-xs text-slate-400">Context-Aware AI Assistant</p>
            </div>
          </div>
          <span className="h-2.5 w-2.5 bg-green-500 rounded-full animate-pulse"></span>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl p-4 shadow-md text-sm leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-slate-900/90 border border-slate-800/60 text-slate-200 rounded-bl-none"
                }`}
              >
                {msg.sender === "ai" && (
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Copilot AI
                  </div>
                )}
                <pre className="whitespace-pre-wrap font-sans">{msg.text}</pre>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-900/90 border border-slate-800/60 rounded-2xl rounded-bl-none p-4 max-w-[75%] flex gap-2 items-center">
                <div className="flex space-x-1">
                  <div className="w-2.5 h-2.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-2.5 h-2.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-2.5 h-2.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
                <span className="text-xs text-slate-500 italic">Thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Suggestions */}
        <div className="p-4 bg-slate-900/30 border-t border-slate-700/40 flex flex-wrap gap-2 justify-center">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => setQuestion(prompt)}
              className="text-xs bg-slate-900/80 border border-slate-700/60 text-slate-350 hover:bg-slate-850 hover:text-white px-3.5 py-1.5 rounded-full transition-all duration-150"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-700/60 bg-slate-900/50 flex gap-4">
          <input
            className="flex-1 border border-slate-700 p-3.5 rounded-xl bg-slate-900 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ask a question about database failures, CSV tables, logs, etc..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={loading}
          />
          <button
            onClick={askAI}
            disabled={loading || !question.trim()}
            className={`px-6 rounded-xl font-bold transition-all duration-200 ${
              loading || !question.trim()
                ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25"
            }`}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}