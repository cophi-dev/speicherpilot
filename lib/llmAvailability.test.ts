import { assessmentChatConfigured } from "@/lib/llmAvailability";

describe("assessmentChatConfigured", () => {
  it("is off unless the xAI key is set", () => {
    expect(assessmentChatConfigured({})).toBe(false);
    expect(assessmentChatConfigured({ OPENAI_API_KEY: "sk-test" })).toBe(false);
    expect(assessmentChatConfigured({ AI_PROVIDER: "openai", OPENAI_API_KEY: "sk-test" })).toBe(false);
    expect(assessmentChatConfigured({ XAI_API_KEY: "   " })).toBe(false);
    expect(assessmentChatConfigured({ AI_PROVIDER: "xai", XAI_API_KEY: "xai-test" })).toBe(true);
    expect(assessmentChatConfigured({ XAI_API_KEY: "xai-test" })).toBe(true);
  });
});
