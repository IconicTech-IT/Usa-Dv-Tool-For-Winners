import { PromptBox } from "@/components/content/PromptBox";
import prompt from "@/content/pages/english-prompt.json";

/** The ready prompt of the English page. Its text is read on the server and passed to the copy box. */
export function PromptBlock() {
  return <PromptBox text={prompt.lines.join("\n")} />;
}
