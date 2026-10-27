import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";

import BessAiChatOverlay from "@/components/BessAiChatOverlay";
import { LanguageContext } from "@/components/language-context";
import { CHAT_NOT_CONFIGURED_DE } from "@/lib/chatNotice";

function renderOverlay(ui: ReactElement) {
  return render(
    <LanguageContext.Provider value={{ language: "de", setLanguage: jest.fn() }}>{ui}</LanguageContext.Provider>
  );
}

describe("BessAiChatOverlay", () => {
  it("shows that the chat is not set up instead of an empty assistant", () => {
    renderOverlay(<BessAiChatOverlay configured={false} open onClose={() => undefined} />);

    expect(screen.getByText(CHAT_NOT_CONFIGURED_DE)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Chat nicht eingerichtet" })).toBeInTheDocument();
    expect(screen.queryByText(/Ich bin Ihr BESS-Assistent/)).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
