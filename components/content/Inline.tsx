import { Fragment, type ReactNode } from "react";

/**
 * A run of Latin letters and digits, with the marks inside it ("8 U.S.C. 1182(a)(4)", "I-864, I-134"),
 * or such a run closed in its own brackets ("(Federal Register)"), so the two brackets stay a pair.
 * In Arabic text it is shown as its own left-to-right piece, so its numbers and brackets keep their place.
 */
const LATIN_RUN =
  /\([A-Za-z0-9][A-Za-z0-9 .,/:'&§+×-]*\)|[A-Za-z0-9](?:[A-Za-z0-9 .,()/:'&§+×-]*[A-Za-z0-9)])?/g;

/** Splits text into Arabic parts and isolated Latin runs. */
function isolateLatin(text: string, keyBase: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(LATIN_RUN)) {
    const start = match.index;
    if (start > last) parts.push(<Fragment key={`${keyBase}-t${start}`}>{text.slice(last, start)}</Fragment>);
    parts.push(
      <bdi key={`${keyBase}-l${start}`} dir="ltr">
        {match[0]}
      </bdi>,
    );
    last = start + match[0].length;
  }
  if (last < text.length) parts.push(<Fragment key={`${keyBase}-e`}>{text.slice(last)}</Fragment>);
  return parts;
}

/**
 * Text with **bold** parts and Latin runs kept in their own direction. Only bold is understood, so
 * a content file can never inject markup.
 */
export function Inline({ text }: { text: string }) {
  const parts = text.split("**");
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <strong key={index}>{isolateLatin(part, `b${index}`)}</strong>
        ) : (
          <Fragment key={index}>{isolateLatin(part, `p${index}`)}</Fragment>
        ),
      )}
    </>
  );
}
