import { prisma } from "@/lib/db/client";
import Playground from "@/app/components/Playground";

export const dynamic = "force-dynamic";

export default async function Home() {
  let openAiKeyConfigured = false;
  let dbStatus = "Offline";
  let activeTonesCount = 0;
  let dbError = "";

  // 1. Check OpenAI Key configuration
  openAiKeyConfigured = !!process.env.OPENAI_API_KEY;

  // 2. Diagnostics: Prisma SQLite DB Check
  try {
    const counts = await prisma.toneProfile.count();
    activeTonesCount = await prisma.toneProfile.count({
      where: { isActive: true },
    });
    dbStatus = "Connected";
  } catch (err) {
    dbStatus = "Error";
    dbError = (err as Error).message;
  }

  return (
    <div className="container">
      <header>
        <h1>VibeReply Assistant</h1>
        <p className="subtitle">
          A universal contextual AI reply & rewrite companion
          running everywhere you type on the web.
        </p>
      </header>

      <div className="grid">
        {/* Guide Card */}
        <section className="card">
          <h2 className="card-title">
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            Getting Started Guide
          </h2>
          <ol>
            <li>
              Make sure this local Next.js server is running (usually on{" "}
              <code>http://localhost:3000</code>).
            </li>
            <li>
              Open Google Chrome (or Microsoft Edge) and navigate to{" "}
              <code>chrome://extensions</code>.
            </li>
            <li>
              Enable <strong>Developer Mode</strong> using the toggle switch in
              the top-right corner.
            </li>
            <li>
              Click the <strong>Load unpacked</strong> button in the top-left
              corner.
            </li>
            <li>
              Select the <code>extension/</code> folder located in the root of
              your VibeReply project directory.
            </li>
            <li>
              Once loaded, focus any input field, textarea, or contenteditable
              editor on <strong>any website</strong> to see the floating VibeReply
              logo appear!
            </li>
          </ol>
        </section>

        {/* Server & API Status Diagnostics Card */}
        <section className="card">
          <h2 className="card-title">
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="var(--success)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            System Diagnostics
          </h2>
          <div className="status-list">
            {/* Server Connection */}
            <div className="status-item">
              <span className="status-label">Local Server</span>
              <span className="status-value">
                <span className="badge badge-success">Online</span>
              </span>
            </div>

            {/* OpenAI API Key */}
            <div className="status-item">
              <span className="status-label">OpenAI Engine</span>
              <span className="status-value">
                {openAiKeyConfigured ? (
                  <span className="badge badge-success">Configured</span>
                ) : (
                  <span className="badge badge-danger">Missing API Key</span>
                )}
              </span>
            </div>

            {/* SQLite/Prisma DB */}
            <div className="status-item">
              <span className="status-label">Database (Prisma)</span>
              <span className="status-value">
                {dbStatus === "Connected" ? (
                  <span className="badge badge-success">Connected</span>
                ) : (
                  <span
                    className="badge badge-danger"
                    title={dbError || undefined}
                  >
                    Offline
                  </span>
                )}
              </span>
            </div>

            {/* Active Tones */}
            <div className="status-item">
              <span className="status-label">Active Tone Profiles</span>
              <span className="status-value">
                {dbStatus === "Connected" ? (
                  <span>{activeTonesCount} profiles</span>
                ) : (
                  <span>—</span>
                )}
              </span>
            </div>
          </div>
        </section>
      </div>

      <Playground />

      <footer className="footer">
        <p>VibeReply Engine v1.0.0 • Local Development Mode</p>
      </footer>
    </div>
  );
}
