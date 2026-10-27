import { CHAT_NOT_CONFIGURED_DE } from "@/lib/chatNotice";
import { getBessChatReplyFromAi } from "@/lib/aiAssessmentClient";
import { getGermanyAssessmentContext } from "@/lib/energyChartsApi";

jest.mock("@/lib/energyChartsApi", () => ({
  getGermanyAssessmentContext: jest.fn(),
}));

jest.mock("@/lib/aiAssessmentClient", () => ({
  getBessChatReplyFromAi: jest.fn(),
}));

import { POST } from "@/app/api/assessment/chat/route";

const mockedContext = getGermanyAssessmentContext as jest.MockedFunction<typeof getGermanyAssessmentContext>;
const mockedChat = getBessChatReplyFromAi as jest.MockedFunction<typeof getBessChatReplyFromAi>;

function request() {
  return new Request("http://localhost/api/assessment/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Wie ist die Restlast?" }] }),
  });
}

describe("POST /api/assessment/chat", () => {
  const previousKey = process.env.XAI_API_KEY;
  const previousProvider = process.env.AI_PROVIDER;

  afterEach(() => {
    jest.resetAllMocks();
    if (previousKey === undefined) {
      delete process.env.XAI_API_KEY;
    } else {
      process.env.XAI_API_KEY = previousKey;
    }
    if (previousProvider === undefined) {
      delete process.env.AI_PROVIDER;
    } else {
      process.env.AI_PROVIDER = previousProvider;
    }
  });

  it("says the chat is not set up and does not call a model", async () => {
    delete process.env.XAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    process.env.AI_PROVIDER = "xai";

    const response = await POST(request() as never);
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json).toEqual({ code: "not_configured", message: CHAT_NOT_CONFIGURED_DE });
    expect(mockedChat).not.toHaveBeenCalled();
    expect(mockedContext).not.toHaveBeenCalled();
  });
});
