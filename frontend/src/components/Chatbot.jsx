import { useEffect, useRef, useState } from "react";
import api from "../api/axios";
import { useLanguage } from "../context/LanguageContext";

export default function Chatbot() {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", text: t("chatbot.greeting") },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechPaused, setIsSpeechPaused] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef(null);
  const transcriptBufferRef = useRef("");
  const shouldAutoRestartRef = useRef(false);
  const silenceTimerRef = useRef(null);
  const speakingRef = useRef(false);
  const listRef = useRef(null);

  const speechInputSupported = typeof window !== "undefined"
    && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  const speechOutputSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const stopListening = () => {
    shouldAutoRestartRef.current = false;
    clearSilenceTimer();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const startListening = () => {
    if (!speechInputSupported || !recognitionRef.current || isLoading || speakingRef.current) {
      return;
    }

    try {
      shouldAutoRestartRef.current = true;
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      // start() throws if called while already active; ignore to keep UX stable.
    }
  };

  const scheduleAutoSend = () => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      if (transcriptBufferRef.current.trim() && !isLoading) {
        send(transcriptBufferRef.current);
      }
    }, 1600);
  };

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

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) {
          finalText += chunk;
        } else {
          interimText += chunk;
        }
      }

      if (finalText.trim()) {
        transcriptBufferRef.current = `${transcriptBufferRef.current} ${finalText}`.trim();
        setInput(transcriptBufferRef.current);
        scheduleAutoSend();
      }

      setInterimTranscript(interimText.trim());
    };

    recognition.onerror = () => {
      setIsListening(false);
      setInterimTranscript("");
      clearSilenceTimer();
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");

      if (open && shouldAutoRestartRef.current && !isLoading && !speakingRef.current && !isSpeechPaused) {
        setTimeout(() => {
          startListening();
        }, 250);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldAutoRestartRef.current = false;
      clearSilenceTimer();
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [language, speechInputSupported, open, isLoading, isSpeechPaused]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isLoading, interimTranscript]);

  useEffect(() => {
    setMessages((current) => {
      if (current.length === 1 && current[0]?.from === "bot") {
        return [{ from: "bot", text: t("chatbot.greeting") }];
      }
      return current;
    });
  }, [t]);

  const speak = (text) => {
    if (!speechOutputSupported || !text?.trim()) {
      return;
    }

    speakingRef.current = true;
    stopListening();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "hi" ? "hi-IN" : "en-US";
    utterance.rate = 1;
    utterance.onend = () => {
      speakingRef.current = false;
      if (open && !isSpeechPaused) {
        startListening();
      }
    };
    utterance.onerror = () => {
      speakingRef.current = false;
      if (open && !isSpeechPaused) {
        startListening();
      }
    };
    window.speechSynthesis.speak(utterance);
  };

  const fetchWebResults = async (query) => {
    const search = encodeURIComponent(query);
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${search}&limit=4&namespace=0&format=json&origin=*`,
    );

    if (!response.ok) {
      throw new Error("Web lookup failed");
    }

    const payload = await response.json();
    const titles = payload?.[1] || [];
    const snippets = payload?.[2] || [];
    const links = payload?.[3] || [];

    return titles
      .map((title, index) => ({
        title,
        snippet: snippets[index] || "",
        link: links[index] || "",
      }))
      .filter((item) => item.title && item.link)
      .slice(0, 3);
  };

  const pushBotMessage = (text, webResults = []) => {
    const message = { from: "bot", text, webResults };
    setMessages((m) => [...m, message]);
    speak(text);
  };

  const pauseVoiceSession = () => {
    setIsSpeechPaused(true);
    stopListening();
  };

  const resumeVoiceSession = () => {
    setIsSpeechPaused(false);
    startListening();
  };

  const send = async (messageOverride) => {
    const messageText = (messageOverride ?? input).trim();
    if (!messageText || isLoading) return;

    stopListening();
    const userMsg = { from: "user", text: messageText };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setInterimTranscript("");
    transcriptBufferRef.current = "";
    setIsLoading(true);

    const webResultsPromise = fetchWebResults(messageText).catch(() => []);

    try {
      const [{ data }, webResults] = await Promise.all([
        api.post("/api/chatbot/ask", { message: messageText }),
        webResultsPromise,
      ]);
      pushBotMessage(data.reply, webResults);
    } catch {
      const webResults = await webResultsPromise;
      pushBotMessage(t("chatbot.serverError"), webResults);
    } finally {
      setIsLoading(false);
      if (open && !isSpeechPaused && !speakingRef.current) {
        startListening();
      }
    }
  };

  useEffect(() => {
    if (!open) {
      stopListening();
      if (speechOutputSupported) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    if (!speechInputSupported) {
      return;
    }

    if (!isSpeechPaused && !isLoading && !speakingRef.current) {
      transcriptBufferRef.current = input.trim();
      startListening();
    }

    return () => {
      stopListening();
      if (speechOutputSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [open, isSpeechPaused, isLoading, speechInputSupported, speechOutputSupported]);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? t("chatbot.closeAssistant") : t("chatbot.openAssistant")}
        className="fixed bottom-6 right-6 bg-agro text-white w-14 h-14 rounded-full shadow-lg z-50 flex items-center justify-center"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        </svg>
      </button>

      {open && (
        <div className="fixed bottom-24 right-3 sm:right-6 w-[min(24rem,calc(100vw-1.5rem))] sm:w-96 bg-white rounded-2xl shadow-2xl border flex flex-col z-50 overflow-hidden">
          <div className="bg-agro text-white p-3 font-semibold">
            {t("chatbot.title")}
          </div>

          <div className="border-b border-gray-100 p-3 bg-gradient-to-r from-agro-light/40 to-white">
            <div className="rounded-xl border border-agro-accent/30 bg-white px-3 py-2.5 flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${isListening ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-700">{t("chatbot.voiceUnitTitle")}</p>
                <p className="text-[11px] text-slate-500 truncate">
                  {!speechInputSupported
                    ? t("chatbot.voiceNotSupported")
                    : isLoading
                      ? t("chatbot.processing")
                      : isSpeechPaused
                        ? t("chatbot.voicePaused")
                        : isListening
                          ? t("chatbot.liveListening")
                          : t("chatbot.preparing")}
                </p>
              </div>
              {speechInputSupported && (
                <button
                  type="button"
                  onClick={isSpeechPaused ? resumeVoiceSession : pauseVoiceSession}
                  className="btn-sm bg-white border border-agro-accent/40 text-agro hover:bg-agro-light"
                >
                  {isSpeechPaused ? t("chatbot.resume") : t("chatbot.pause")}
                </button>
              )}
            </div>

            {(interimTranscript || input) && !isLoading && (
              <p className="mt-2 text-xs text-slate-600 italic">
                {t("chatbot.heardPrefix")} {interimTranscript || input}
              </p>
            )}
          </div>

          {!speechInputSupported && (
            <div className="px-3 pt-2 text-xs text-amber-700 bg-amber-50 border-b border-amber-100">
              {t("chatbot.voiceNotSupported")}
            </div>
          )}

          <div ref={listRef} className="flex-1 p-3 space-y-2 h-80 overflow-y-auto bg-gray-50/50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`px-3 py-2 rounded-lg text-sm max-w-[88%] ${
                  m.from === "user" ? "bg-agro text-white" : "bg-gray-100 text-gray-800"
                }`}>
                  <p>{m.text}</p>

                  {Array.isArray(m.webResults) && m.webResults.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t("chatbot.webResults")}</p>
                      {m.webResults.map((result) => (
                        <a
                          key={result.link}
                          href={result.link}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-md bg-white border border-gray-200 p-2 hover:border-agro-accent hover:shadow-sm transition"
                        >
                          <p className="font-medium text-gray-900 text-xs line-clamp-2">{result.title}</p>
                          {result.snippet && <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-2">{result.snippet}</p>}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isListening && interimTranscript && (
              <div className="flex justify-end">
                <span className="px-3 py-2 rounded-lg text-sm max-w-[88%] bg-agro-light text-agro border border-agro-accent/40 italic">
                  {interimTranscript}
                </span>
              </div>
            )}

            {isLoading && (
              <div className="flex justify-start">
                <span className="px-3 py-2 rounded-lg text-sm bg-gray-100 text-gray-700 animate-pulse">
                  {t("chatbot.searching")}
                </span>
              </div>
            )}
          </div>

          <div className="p-2 border-t flex gap-2">
            <input
              className="input text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={t("chatbot.placeholder")}
              disabled={isLoading}
            />
            <button onClick={() => send()} disabled={isLoading} className="btn text-sm">
              {isLoading ? t("chatbot.sending") : t("chatbot.send")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
