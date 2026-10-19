import { Icon } from "@/components/Icon";
import type { ItemNote } from "@/lib/guide/notes";

interface RuleNoteProps {
  note: ItemNote;
  /** The word "Source" in the page language. */
  sourceWord: string;
}

/** An official rule with its source link, or a highlighted tip (advice, not a rule). */
export function RuleNote({ note, sourceWord }: RuleNoteProps) {
  const isTip = note.kind === "tip";
  return (
    <div className={isTip ? "rule tip" : "rule"}>
      {isTip ? <Icon name="warning" /> : null}
      <div>
        <p>{note.text}</p>
        <a className="ilink" href={note.source.url} target="_blank" rel="noopener noreferrer">
          {sourceWord}: {note.source.label}
        </a>
      </div>
    </div>
  );
}
