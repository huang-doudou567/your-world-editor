// ── 聊天引擎（已废弃）──
// 原引擎使用关键词匹配+模板回复，已被 Claude API 取代。
// 现在的聊天流程：ChatView → chat-store → api-client → server/index.ts → Anthropic API
// 本地引擎（event-intake.ts / store.ts）保留作为 scoring + search 的本地辅助。
// 如需恢复旧引擎，从 git history 找回。
