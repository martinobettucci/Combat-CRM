import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { Bot, Mic, MicOff, X, Send, MapPin } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'motion/react';

export default function AIAssistant() {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);

  if (!user) return null;

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      // Use Maps grounding if they ask about locations
      const useMaps = userMessage.toLowerCase().includes('near') || userMessage.toLowerCase().includes('where') || userMessage.toLowerCase().includes('location');
      
      const config: any = {
        systemInstruction: `You are an AI assistant for a combat sports CRM. The current user is ${profile?.firstName} ${profile?.lastName}, a ${profile?.role}. Help them manage their athletes, find fights, or organize their gym.`,
      };

      if (useMaps) {
        config.tools = [{ googleMaps: {} }];
        // Try to get user location
        if (navigator.geolocation) {
          try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
            });
            config.toolConfig = {
              retrievalConfig: {
                latLng: {
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude
                }
              }
            };
          } catch (e) {
            console.warn("Could not get location", e);
          }
        }
      }

      const response = await ai.models.generateContent({
        model: useMaps ? 'gemini-2.5-flash' : 'gemini-3.1-pro-preview',
        contents: userMessage,
        config
      });

      let responseText = response.text || 'I could not process that request.';
      
      // Extract maps URLs if any
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        const urls = chunks.map((c: any) => c.web?.uri || c.maps?.uri).filter(Boolean);
        if (urls.length > 0) {
          responseText += '\n\nSources:\n' + urls.map((u: string) => `- ${u}`).join('\n');
        }
      }

      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error.' }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleVoice = async () => {
    if (isListening) {
      setIsListening(false);
      if (sessionRef.current) {
        sessionRef.current.close();
        sessionRef.current = null;
      }
      return;
    }

    try {
      setIsListening(true);
      
      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        callbacks: {
          onopen: async () => {
            // Setup audio capture
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContextRef.current = new AudioContext({ sampleRate: 16000 });
            const source = audioContextRef.current.createMediaStreamSource(stream);
            const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
              }
              // Convert to base64
              const buffer = new Uint8Array(pcm16.buffer);
              let binary = '';
              for (let i = 0; i < buffer.byteLength; i++) {
                binary += String.fromCharCode(buffer[i]);
              }
              const base64Data = btoa(binary);

              sessionPromise.then((session) => {
                session.sendRealtimeInput({
                  media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            };

            source.connect(processor);
            processor.connect(audioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              // Decode raw PCM 16-bit 24kHz audio
              const binaryString = atob(base64Audio);
              const pcm16 = new Int16Array(binaryString.length / 2);
              for (let i = 0; i < pcm16.length; i++) {
                const lsb = binaryString.charCodeAt(i * 2);
                const msb = binaryString.charCodeAt(i * 2 + 1);
                pcm16[i] = (msb << 8) | lsb;
              }
              
              if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext({ sampleRate: 24000 });
              }
              
              try {
                const audioBuffer = audioContextRef.current.createBuffer(1, pcm16.length, 24000);
                const channelData = audioBuffer.getChannelData(0);
                for (let i = 0; i < pcm16.length; i++) {
                  channelData[i] = pcm16[i] / 32768.0;
                }
                
                const source = audioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContextRef.current.destination);
                source.start();
              } catch (e) {
                console.error("Audio decode error", e);
              }
            }
          },
          onclose: () => {
            setIsListening(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: `You are an AI assistant for a combat sports CRM. The current user is ${profile?.firstName} ${profile?.lastName}, a ${profile?.role}. Keep your answers short and conversational.`,
        },
      });
      
      sessionRef.current = await sessionPromise;
      
    } catch (error) {
      console.error("Voice setup error:", error);
      setIsListening(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={clsx(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-transform hover:scale-105",
          isOpen ? "hidden" : "bg-emerald-500 text-white"
        )}
      >
        <Bot className="h-6 w-6" />
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-2xl bg-zinc-900 shadow-2xl border border-zinc-800"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-emerald-500" />
                <span className="font-semibold text-white">Coach Assistant</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-zinc-500 mt-10">
                  <Bot className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>How can I help you today?</p>
                  <p className="text-xs mt-2">Try asking about nearby gyms, or drafting a message.</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={clsx("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className={clsx(
                    "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                    msg.role === 'user' ? "bg-emerald-500 text-white" : "bg-zinc-800 text-zinc-200"
                  )}>
                    {msg.text.split('\n').map((line, j) => (
                      <span key={j}>
                        {line}
                        <br />
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl bg-zinc-800 px-4 py-2 text-sm text-zinc-400">
                    Thinking...
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t border-zinc-800 p-3 bg-zinc-900">
              <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={clsx(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
                    isListening ? "bg-red-500/20 text-red-500" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                  )}
                >
                  {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-xl border-0 bg-zinc-800 px-4 py-2 text-sm text-white placeholder:text-zinc-500 focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white transition-colors hover:bg-emerald-400 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
