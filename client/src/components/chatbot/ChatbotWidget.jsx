import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot } from 'lucide-react';
import Button from '../common/Button.jsx'; 

/**
 * A floating chatbot widget connected to the Python AI backend.
 * Toggles a chat window when clicked.
 */
const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hi there! How can I help you with your habits or diet?' },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const toggleOpen = () => setIsOpen(!isOpen);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    
    // Add user message immediately
    setMessages(prev => [...prev, { from: 'user', text: userMessage }]);
    setInput('');
    setIsTyping(true);

    try {
      // Call Python Backend API
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          context: {} // Add any user context like name/weight here if available in a global store
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      
      // Add bot response
      setMessages(prev => [...prev, { from: 'bot', text: data.response }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev, 
        { from: 'bot', text: "Sorry, I'm having trouble connecting to the server. Please ensure the Python backend is running at port 8000." }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  if (isOpen) {
    return (
      <div className="fixed bottom-4 right-4 w-80 h-96 sm:h-112 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col z-50 transition-all duration-300 ease-in-out transform origin-bottom-right">
        {/* Chat Header */}
        <div className="flex justify-between items-center p-3 bg-blue-600 dark:bg-blue-700 rounded-t-lg">
          <div className="flex items-center space-x-2">
            <Bot className="text-white" size={20} />
            <h3 className="font-semibold text-white">
              Health Assistant
            </h3>
          </div>
          <button
            onClick={toggleOpen}
            className="text-blue-100 hover:text-white focus:outline-none transition-colors"
            aria-label="Close chat"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-gray-50 dark:bg-gray-900 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.from === 'bot' ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                  msg.from === 'bot'
                    ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-tl-none'
                    : 'bg-blue-600 text-white rounded-tr-none'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form
          onSubmit={handleSend}
          className="flex p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-b-lg"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:text-white text-sm"
          />
          <Button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="rounded-l-none"
            size="sm"
            aria-label="Send message"
          >
            <Send size={18} />
          </Button>
        </form>
      </div>
    );
  }

  return (
    <button
      onClick={toggleOpen}
      className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-xl hover:bg-blue-700 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 z-50 flex items-center justify-center"
      aria-label="Open chat"
    >
      <MessageSquare size={24} />
    </button>
  );
};

export default ChatbotWidget;