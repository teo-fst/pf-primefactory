import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Render Markdown senza HTML grezzo: react-markdown non interpreta i tag HTML
 * (restano testo) e filtra i link pericolosi (javascript:). Niente plugin rehype-raw.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="pf-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
