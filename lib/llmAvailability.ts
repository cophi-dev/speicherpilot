/**
 * The public assessment and the chat call xAI. Daily story and flow-share
 * captions already fall back to numeric copy when no model key is set.
 * OpenAI alone does not turn this chat on: that client only sends to xAI.
 */
export function assessmentChatConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  const provider = (env.AI_PROVIDER ?? "xai").trim().toLowerCase();
  if (provider !== "xai") {
    return false;
  }
  const key = env.XAI_API_KEY;
  return typeof key === "string" && key.trim().length > 0;
}
