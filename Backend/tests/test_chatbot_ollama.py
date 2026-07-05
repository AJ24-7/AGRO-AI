import unittest

from app.routers import chatbot


class OllamaPromptBuilderTests(unittest.TestCase):
    def test_build_ollama_messages_includes_recent_history(self):
        history = [
            {"role": "user", "content": "What crop should I plant?"},
            {"role": "assistant", "content": "You should consider maize."},
        ]

        messages = chatbot._build_ollama_messages(
            intent="crop",
            message="What about for my farm?",
            history_messages=history,
            prompt="Use the local context to answer.",
        )

        self.assertEqual(messages[0]["role"], "system")
        self.assertEqual(messages[1]["role"], "user")
        self.assertIn("What crop should I plant?", messages[1]["content"])
        self.assertEqual(messages[2]["role"], "assistant")
        self.assertIn("maize", messages[2]["content"])
        self.assertEqual(messages[3]["role"], "user")
        self.assertIn("What about for my farm?", messages[3]["content"])


if __name__ == "__main__":
    unittest.main()
