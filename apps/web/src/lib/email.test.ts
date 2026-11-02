import { describe, expect, it, vi } from "vitest";
import { magicLinkEmail, sendEmail } from "./email";

const message = magicLinkEmail("sam@example.com", "https://sunsetsoul.app/x?token=a&b=<c>");

describe("email", () => {
  it("escapes the link in the HTML body and keeps it intact in the text body", () => {
    expect(message.html).toContain('href="https://sunsetsoul.app/x?token=a&#38;b=&#60;c&#62;"');
    expect(message.text).toContain("https://sunsetsoul.app/x?token=a&b=<c>");
  });

  it("logs instead of sending in development", async () => {
    const send = vi.fn();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await sendEmail({ EMAIL: { send } as never, EMAIL_FROM: "Sunset Soul <hello@sunsetsoul.app>", NEXTJS_ENV: "development" }, message);
    expect(send).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledOnce();
    log.mockRestore();
  });

  it("sends through the EMAIL binding outside development", async () => {
    const send = vi.fn().mockResolvedValue({ messageId: "1" });
    await sendEmail({ EMAIL: { send } as never, EMAIL_FROM: "Sunset Soul <hello@sunsetsoul.app>", NEXTJS_ENV: "" }, message);
    expect(send).toHaveBeenCalledWith({ from: "Sunset Soul <hello@sunsetsoul.app>", ...message });
  });
});
