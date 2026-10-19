import { Icon } from "@/components/Icon";
import { Inline } from "@/components/content/Inline";
import { PromptBlock } from "@/components/content/PromptBlock";
import type { Block, PageContent } from "@/lib/content/schema";

type BlockOf<T extends Block["type"]> = Extract<Block, { type: T }>;

/** The sections of a text page, one heading and its blocks after another. */
export function ContentSections({ content }: { content: PageContent }) {
  return (
    <>
      {content.sections.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          {section.blocks.map((block, index) => (
            <BlockView key={index} block={block} />
          ))}
        </section>
      ))}
      {content.footnote ? <div className="note">{content.footnote}</div> : null}
    </>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "p":
      return (
        <p>
          <Inline text={block.text} />
        </p>
      );
    case "note":
      return (
        <div className="note">
          <Inline text={block.text} />
        </div>
      );
    case "prompt":
      return <PromptBlock />;
    case "list":
      return <ListBlock block={block} />;
    case "links":
      return <LinksBlock block={block} />;
    case "table":
      return <TableBlock block={block} />;
  }
}

function ListBlock({ block }: { block: BlockOf<"list"> }) {
  if (block.ordered) {
    return (
      <div className="steps">
        {block.items.map((item) => (
          <div key={item}>
            <span>
              <Inline text={item} />
            </span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <ul className="bullets">
      {block.items.map((item) => (
        <li key={item}>
          <Inline text={item} />
        </li>
      ))}
    </ul>
  );
}

function LinksBlock({ block }: { block: BlockOf<"links"> }) {
  return (
    <div className="links">
      {block.items.map((link) => (
        <div key={link.url}>
          <a className="lnk" href={link.url} target="_blank" rel="noopener noreferrer">
            <span>
              {link.label}
              <small>{new URL(link.url).hostname.replace(/^www\./, "")}</small>
            </span>
            <Icon name="external" />
          </a>
          {link.note ? <div className="help">{link.note}</div> : null}
        </div>
      ))}
    </div>
  );
}

function TableBlock({ block }: { block: BlockOf<"table"> }) {
  return (
    <div className="table-wrap">
      <table className="doc-table">
        <thead>
          <tr>
            {block.head.map((cell) => (
              <th key={cell} scope="col">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell) => (
                <td key={cell}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
