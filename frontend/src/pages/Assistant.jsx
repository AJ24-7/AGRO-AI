import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Mic,
  MicOff,
  RefreshCw,
  SendHorizontal,
  Sparkles,
  Trash2,
  MessageSquare,
  Volume2,
  VolumeX,
} from "lucide-react";
import api from "../api/axios";
import { useLanguage } from "../context/LanguageContext";

const SESSION_ID = "assistant-main";

const QUICK_QUESTIONS = [
  "What crop should I plant this season?",
  "How do I treat leaf disease?",
  "What fertilizer should I use?",
  "How is the weather affecting my farm?",
  "What are current market prices?",
];

function AudioWaveform({ isPlaying }) {
  if (!isPlaying) return null;
  return (
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-sky-500"
          style={{
            height: "1rem",
            animation: `pulse 0.6s ease-in-out ${i * 0.1}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% { height: 0.25rem; opacity: 0.6; }
          50% { height: 1rem; opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const INTENT_COLORS = {
  crop:       { bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-800" },
  fertilizer: { bg: "bg-orange-50",  border: "border-orange-200",  badge: "bg-orange-100 text-orange-800" },
  disease:    { bg: "bg-rose-50",    border: "border-rose-200",    badge: "bg-rose-100 text-rose-800" },
  soil:       { bg: "bg-amber-50",   border: "border-amber-200",   badge: "bg-amber-100 text-amber-800" },
  weather:    { bg: "bg-sky-50",     border: "border-sky-200",     badge: "bg-sky-100 text-sky-800" },
  farm:       { bg: "bg-teal-50",    border: "border-teal-200",    badge: "bg-teal-100 text-teal-800" },
  market:     { bg: "bg-violet-50",  border: "border-violet-200",  badge: "bg-violet-100 text-violet-800" },
  greeting:   { bg: "bg-gray-50",    border: "border-gray-200",    badge: "bg-gray-100 text-gray-700" },
};

function BotMessage({ message }) {
  const [expanded, setExpanded] = useState(false);
  const meta = message.meta_json || {};
  const actions = Array.isArray(meta.action_items) ? meta.action_items : [];
  const links = Array.isArray(meta.knowledge_links) ? meta.knowledge_links : [];
  const webResults = Array.isArray(meta.web_results) ? meta.web_results : [];
  const farm = meta.farm_context || null;
  const crop = meta.crop_context || null;
  const intent = message.intent || "greeting";
  const colors = INTENT_COLORS[intent] || INTENT_COLORS.greeting;
  const hasDetails = actions.length > 0 || links.length > 0 || webResults.length > 0 || farm || crop;

  return (
    <div className={`rounded-2xl border backdrop-blur shadow-lg ${colors.bg} ${colors.border} overflow-hidden`}>
      <div className="px-4 pt-3 pb-1">
        <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mb-2 ${colors.badge}`}>
          <Bot className="w-3 h-3" /> {intent}
        </span>
        <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">{message.content || message.text}</p>
      </div>

      {hasDetails && (
        <div className="px-4 pb-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 transition"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? "Hide details" : "Show details, actions & links"}
          </button>

          {expanded && (
            <div className="mt-3 space-y-3">
              {actions.length > 0 && (
                <div className="rounded-xl bg-white/70 border border-emerald-100 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 mb-1.5">Next Actions</p>
                  <ul className="space-y-1.5">
                    {actions.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                        <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(farm || crop) && (
                <div className="grid grid-cols-2 gap-2">
                  {farm && (
                    <div className="rounded-xl bg-white/70 border border-slate-100 p-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Farm</p>
                      <p className="text-xs font-semibold text-slate-700">{farm.latest_farm_name || "—"}</p>
                      {farm.weather_summary && <p className="text-[11px] text-slate-500 mt-0.5">{farm.weather_summary}</p>}
                      <p className="text-[11px] text-slate-500">{farm.total_farms} farm(s) registered</p>
                    </div>
                  )}
                  {crop && (
                    <div className="rounded-xl bg-white/70 border border-slate-100 p-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Crop</p>
                      <p className="text-xs font-semibold text-slate-700 capitalize">{crop.latest_crop || "None yet"}</p>
                      {crop.latest_confidence != null && (
                        <div className="mt-1">
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500 transition-all duration-500"
                              style={{ width: `${Math.min(100, crop.latest_confidence)}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{crop.latest_confidence}% confidence</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {links.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Knowledge Links</p>
                  {links.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:border-blue-400 hover:text-blue-600 transition"
                    >
                      {link.title}
                      <ExternalLink className="w-3 h-3 shrink-0 ml-2" />
                    </a>
                  ))}
                </div>
              )}

              {webResults.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Web Sources</p>
                  {webResults.map((item) => (
                    <a
                      key={`${item.url}-${item.title}`}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-xl border border-sky-200 bg-sky-50/70 px-3 py-2 hover:border-sky-300 transition"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-700 line-clamp-1">{item.title}</p>
                        <ExternalLink className="w-3 h-3 shrink-0 text-sky-700" />
                      </div>
                      {item.snippet && <p className="mt-1 text-[11px] text-slate-600 line-clamp-2">{item.snippet}</p>}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Assistant() {
  const { t, language } = useLanguage();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceResponseEnabled, setVoiceResponseEnabled] = useState(true);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [interimTranscript, setInterimTranscript] = useState("");

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const transcriptBufferRef = useRef("");
  const speakingRef = useRef(false);
  const recognitionActiveRef = useRef(false);
  const recognitionStartingRef = useRef(false);
  const isLoadingRef = useRef(false);
  const shouldAutoRestartRef = useRef(false);
  const manualStopRef = useRef(false);
  const listRef = useRef(null);

  const speechInputSupported = typeof window !== "undefined"
    && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  const speechOutputSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const greetingMessage = useMemo(() => ({
    role: "assistant",
    content: t("chatbot.greeting"),
  }), [t]);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const stopListening = (manual = false) => {
    manualStopRef.current = manual;
    if (manual) {
      shouldAutoRestartRef.current = false;
    }
    clearSilenceTimer();
    if (recognitionRef.current && (recognitionActiveRef.current || recognitionStartingRef.current)) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.log("Speech recognition stop ignored:", err?.message || err);
      }
    }
    recognitionStartingRef.current = false;
    setIsListening(false);
  };

  const startListening = () => {
    if (!speechInputSupported || !recognitionRef.current || isLoadingRef.current || speakingRef.current) return;
    if (recognitionActiveRef.current || recognitionStartingRef.current) return;
    try {
      manualStopRef.current = false;
      shouldAutoRestartRef.current = true;
      setVoiceStatus("");
      setInterimTranscript("");
      transcriptBufferRef.current = input.trim();
      recognitionStartingRef.current = true;
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err) {
      recognitionStartingRef.current = false;
      const errMsg = err.message || "Unknown error";
      if (errMsg.includes("permission") || errMsg.includes("Permission")) {
        setVoiceStatus("Microphone permission denied. Please allow microphone access in browser settings.");
      } else {
        setVoiceStatus("Microphone could not start. Check browser microphone permission.");
      }
      console.error("Speech recognition error:", err);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening(true);
      return;
    }

    if (speechOutputSupported && isSpeaking) {
      window.speechSynthesis.cancel();
      speakingRef.current = false;
      setIsSpeaking(false);
    }

    startListening();
  };

  const speak = (text) => {
    if (!speechOutputSupported || !voiceResponseEnabled || !text?.trim()) return;
    speakingRef.current = true;
    setIsSpeaking(true);
    setVoiceStatus("");
    stopListening(false);
    window.speechSynthesis.resume();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "hi" ? "hi-IN" : "en-US";
    utterance.rate = 0.95;
    utterance.onend = () => {
      speakingRef.current = false;
      setIsSpeaking(false);
      if (shouldAutoRestartRef.current) {
        startListening();
      }
    };
    utterance.onerror = () => {
      speakingRef.current = false;
      setIsSpeaking(false);
      setVoiceStatus("Voice reply could not play in this browser tab.");
    };
    window.speechSynthesis.speak(utterance);
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data } = await api.get("/api/chatbot/history", {
        params: { session_id: SESSION_ID, limit: 120 },
      });
      setMessages(Array.isArray(data) && data.length > 0 ? data : [greetingMessage]);
    } catch {
      setMessages([greetingMessage]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => { 
    loadHistory();
    
    // Request user location for location-based recommendations
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.log("Location access denied or unavailable:", error.message);
        }
      );
    }
  }, [language]);

  useEffect(() => {
    if (!speechInputSupported) { 
      recognitionRef.current = null; 
      return undefined; 
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = language === "hi" ? "hi-IN" : "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      recognitionStartingRef.current = false;
      recognitionActiveRef.current = true;
      setIsListening(true);
      setVoiceStatus("🎤 Listening...");
    };

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) finalText += chunk;
        else interimText += chunk;
      }
      if (finalText.trim()) {
        transcriptBufferRef.current = `${transcriptBufferRef.current} ${finalText}`.trim();
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(() => {
          if (transcriptBufferRef.current.trim() && !isLoadingRef.current) send(transcriptBufferRef.current);
        }, 1500);
      }

      const previewText = `${transcriptBufferRef.current} ${interimText}`.trim();
      setInput(previewText);
      setInterimTranscript(interimText.trim());
    };

    recognition.onerror = (event) => {
      recognitionStartingRef.current = false;
      recognitionActiveRef.current = false;
      setIsListening(false);
      clearSilenceTimer();
      let msg = "Voice input failed.";
      if (event.error === "network") msg = "Network error. Check your internet connection.";
      else if (event.error === "no-speech") msg = "No speech detected. Try speaking clearly.";
      else if (event.error === "not-allowed") msg = "Microphone permission denied. Enable it in browser settings.";
      else if (event.error === "permission-denied") msg = "Microphone permission denied.";
      setVoiceStatus(msg);
      console.error("Speech recognition error:", event.error);
    };
    
    recognition.onend = () => {
      recognitionStartingRef.current = false;
      recognitionActiveRef.current = false;
      setIsListening(false);
      if (!manualStopRef.current && shouldAutoRestartRef.current && !isLoadingRef.current && !speakingRef.current) {
        setTimeout(() => {
          startListening();
        }, 250);
      }
    };

    recognitionRef.current = recognition;
    return () => {
      shouldAutoRestartRef.current = false;
      manualStopRef.current = true;
      clearSilenceTimer();
      recognitionStartingRef.current = false;
      recognitionActiveRef.current = false;
      try {
        recognition.stop();
      } catch (err) {
        console.log("Error stopping recognition:", err);
      }
      recognitionRef.current = null;
    };
  }, [language, speechInputSupported]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, isLoading, input]);

  useEffect(() => {
    return () => {
      stopListening(true);
      if (speechOutputSupported) window.speechSynthesis.cancel();
    };
  }, [speechOutputSupported]);

  const send = async (raw) => {
    const messageText = (raw ?? input).trim();
    if (!messageText || isLoading) return;

    stopListening();
    setMessages((m) => [...m, { role: "user", content: messageText }]);
    setInput("");
    transcriptBufferRef.current = "";
    setIsLoading(true);

    try {
      const { data } = await api.post("/api/chatbot/ask", { message: messageText, session_id: SESSION_ID });
      const assistantMessage = {
        role: "assistant",
        content: data.reply,
        intent: data.intent,
        meta_json: {
          action_items: data.action_items,
          farm_context: data.farm_context,
          crop_context: data.crop_context,
          knowledge_links: data.knowledge_links,
          web_results: data.web_results,
        },
      };
      setMessages((m) => [...m, assistantMessage]);
      if (!data.reply?.trim()) {
        setVoiceStatus("Assistant returned an empty reply.");
      }
      speak(data.reply);
    } catch {
      const fallback = { role: "assistant", content: t("chatbot.serverError") };
      setMessages((m) => [...m, fallback]);
      speak(fallback.content);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = async () => {
    try {
      await api.delete("/api/chatbot/history", { params: { session_id: SESSION_ID } });
      setMessages([greetingMessage]);
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="stat-icon bg-agro w-10 h-10">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="page-title">{t("chatbot.screenTitle")}</h2>
            <p className="page-subtitle">Smart farm assistant powered by Ollama with crop- and agriculture-specific guidance.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadHistory}
            disabled={loadingHistory}
            className="btn-outline"
            title={t("chatbot.refreshHistory")}
          >
            <RefreshCw className={`w-4 h-4 ${loadingHistory ? "animate-spin" : ""}`} />
            {t("chatbot.refreshHistory")}
          </button>
          <button
            type="button"
            onClick={clearHistory}
            className="btn-danger"
            title={t("chatbot.clearHistory")}
          >
            <Trash2 className="w-4 h-4" />
            {t("chatbot.clearHistory")}
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div ref={listRef} className="h-[55vh] overflow-y-auto px-4 sm:px-5 py-5 space-y-4 bg-slate-50/60">
          {loadingHistory ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-agro" />
            </div>
          ) : (
            messages.map((message, index) => {
              const isUser = message.role === "user" || message.from === "user";
              return (
                <div key={`${message.id || index}-${message.created_at || index}`} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  {isUser ? (
                    <div className="bg-agro text-white rounded-2xl rounded-br-sm px-4 py-3 max-w-[85%] shadow-sm text-sm font-medium">
                      {message.content || message.text}
                    </div>
                  ) : (
                    <div className="max-w-[92%] sm:max-w-[80%]">
                      <BotMessage message={message} />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3 text-sm text-slate-700 inline-flex items-center gap-2 shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-agro" />
                {t("chatbot.processing")}
              </div>
            </div>
          )}
        </div>

        {voiceStatus && !voiceStatus.includes("Listening") && (
          <div className="px-4 py-3 bg-amber-50 border-t border-amber-200">
            <p className="text-xs text-amber-700 text-center">{voiceStatus}</p>
          </div>
        )}

        <div className="border-t border-slate-100 bg-white px-4 sm:px-5 pt-3 pb-4 space-y-3">
          <div className="flex items-center gap-2 border border-slate-200 rounded-2xl p-1.5 shadow-sm">
            <button
              type="button"
              onClick={toggleListening}
              disabled={!speechInputSupported || isLoading || isSpeaking}
              className={`h-10 w-10 shrink-0 flex items-center justify-center rounded-xl text-white transition disabled:opacity-50 ${
                isListening ? "bg-emerald-500 hover:bg-emerald-600" : "bg-agro hover:bg-agro-dark"
              }`}
              aria-label={isListening ? "Stop listening" : "Start listening"}
              title={isListening ? "Stop listening" : "Start listening"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <div className="flex-1 flex items-center gap-2">
              {isSpeaking && <AudioWaveform isPlaying={true} />}
              <input
                className="flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={
                  isSpeaking
                    ? "Speaking..."
                    : isListening
                      ? "Listening... " + interimTranscript
                      : "Ask anything about your farm..."
                }
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center gap-1 px-1">
              <button
                type="button"
                onClick={() => setVoiceResponseEnabled((v) => !v)}
                disabled={!speechOutputSupported}
                className={`h-10 w-10 shrink-0 flex items-center justify-center rounded-xl transition disabled:opacity-50 ${
                  voiceResponseEnabled ? "text-sky-600 hover:bg-sky-50" : "text-slate-400 hover:bg-slate-100"
                }`}
                aria-label={voiceResponseEnabled ? "Disable voice response" : "Enable voice response"}
                title={voiceResponseEnabled ? "Voice reply: ON" : "Voice reply: OFF"}
              >
                {voiceResponseEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => send()}
                disabled={isLoading || !input.trim()}
                className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-agro text-white shadow-sm hover:bg-agro-dark transition disabled:opacity-50"
                aria-label={t("chatbot.send")}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                disabled={isLoading}
                className="shrink-0 rounded-full border border-slate-200 bg-white text-slate-700 px-3 py-1.5 text-xs font-medium hover:border-agro/30 hover:bg-agro-light/50 transition disabled:opacity-50"
              >
                {q}
              </button>
            ))}
            {userLocation && (
              <button
                type="button"
                onClick={() => send(`Based on my location (${userLocation.latitude.toFixed(2)}, ${userLocation.longitude.toFixed(2)}), what crop should I plant considering the current month and weather?`)}
                disabled={isLoading}
                className="shrink-0 rounded-full border border-agro/30 bg-agro-light text-agro-dark px-3 py-1.5 text-xs font-medium hover:bg-agro-light/80 transition disabled:opacity-50"
              >
                Crop for My Location
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
