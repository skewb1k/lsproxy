# lsproxy

`lsproxy` sits between your editor (LSP client) and the language server. It forwards all JSON-RPC messages, while offering:

- **Logging** of every request, response, and notification.
- **Custom handlers** to modify, drop, or delay messages.

This makes it easier to debug, experiment with, or extend LSP behavior.
