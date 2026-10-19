import { Fragment } from "react";

/** Text with **bold** parts. Only bold is understood, so a content file can never inject markup. */
export function Inline({ text }: { text: string }) {
  const parts = text.split("**");
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? <strong key={index}>{part}</strong> : <Fragment key={index}>{part}</Fragment>,
      )}
    </>
  );
}
