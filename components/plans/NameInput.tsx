"use client";

import { useId, useState, type KeyboardEvent } from "react";

import { MAX_NAME_LENGTH } from "@/lib/calc/model";

interface NameInputProps {
  /** The name when the box opens. Give the box a new `key` to make it start again from another name. */
  initial: string;
  label: string;
  placeholder?: string | undefined;
  onCommit: (name: string) => void;
  /** Called when Escape is pressed. */
  onCancel?: (() => void) | undefined;
  autoFocus?: boolean | undefined;
}

/**
 * A text box for a plan name. The name is taken when the person leaves the box or presses
 * Enter, not on every key, so he can type spaces between words.
 */
export function NameInput({ initial, label, placeholder, onCommit, onCancel, autoFocus }: NameInputProps) {
  const id = useId();
  const [draft, setDraft] = useState(initial);

  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") onCommit(draft);
    if (event.key === "Escape") onCancel?.();
  };

  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <div className="input">
        <input
          id={id}
          value={draft}
          maxLength={MAX_NAME_LENGTH}
          placeholder={placeholder}
          autoComplete="off"
          autoFocus={autoFocus === true}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => onCommit(draft)}
          onKeyDown={keyDown}
        />
      </div>
    </div>
  );
}
