import Playground from "@/app/components/Playground";
import Starfield from "@/app/components/Starfield";

export const dynamic = "force-dynamic";

export default async function Home() {
  return (
    <div className="container">
      <Starfield />
      <header>
        <div className="badge-featured">
          <span className="pulse-dot" />
          Neural Core v2.50
        </div>
        <h1>VibeReply Assistant</h1>
        <p className="subtitle">
          A universal contextual AI assistant running next to your messaging editors.
          Optimized for WhatsApp Web, LinkedIn, and standard text environments.
        </p>
      </header>

      <Playground />

      <footer className="footer">
        <p>VibeReply Engine • Systems Operations Active</p>
      </footer>
    </div>
  );
}
