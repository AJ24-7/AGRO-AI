import { useState } from "react";
import api from "../api/axios";

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hi! I'm AgroPilot Assistant 🌱 Ask me anything!" },
  ]);
  const [input, setInput] = useState("");

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { from: "user", text: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    try {
      const { data } = await api.post("/api/chatbot/ask", { message: input });
      setMessages((m) => [...m, { from: "bot", text: data.reply }]);
    } catch {
      setMessages((m) => [...m, { from: "bot", text: "Server error 😕" }]);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 bg-agro text-white w-14 h-14 rounded-full shadow-lg text-2xl z-50"
      >
        💬
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 w-80 bg-white rounded-xl shadow-2xl border flex flex-col z-50">
          <div className="bg-agro text-white p-3 rounded-t-xl font-semibold">
            AgroPilot Assistant
          </div>
          <div className="flex-1 p-3 space-y-2 h-72 overflow-y-auto">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                <span className={`px-3 py-2 rounded-lg text-sm max-w-[80%] ${
                  m.from === "user" ? "bg-agro text-white" : "bg-gray-100 text-gray-800"
                }`}>{m.text}</span>
              </div>
            ))}
          </div>
          <div className="p-2 border-t flex gap-2">
            <input
              className="input text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask about crops..."
            />
            <button onClick={send} className="btn text-sm">Send</button>
          </div>
        </div>
      )}
    </>
  );
}
