import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — VibeReply",
  description: "How VibeReply handles your data: what it reads, what it sends to its API, what it stores, and what it never does.",
  alternates: {
    canonical: "https://vibe-reply-seven.vercel.app/privacy",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container" style={{ maxWidth: "760px" }}>
      <header style={{ marginBottom: "3rem" }}>
        <h1 style={{ fontSize: "2.25rem" }}>Privacy Policy</h1>
        <p className="subtitle" style={{ margin: "0.5rem auto 0" }}>Last updated: September 2026</p>
      </header>

      <section className="card" style={{ display: "flex", flexDirection: "column", gap: "1.5rem", lineHeight: 1.7 }}>
        <div>
          <h2 className="card-title" style={{ fontSize: "1.15rem" }}>What VibeReply reads</h2>
          <p>
            The extension can detect a text field on any website (so its floating icon can appear
            next to it, the same way a spell-checker would), but it does not read or transmit any
            page content until you actually ask it for something — opening the panel and requesting
            a reply, rewrite, or translation. At that point it reads the text currently visible in
            the conversation or draft you're working on — not your entire message history, and
            nothing on the rest of the page.
          </p>
        </div>

        <div>
          <h2 className="card-title" style={{ fontSize: "1.15rem" }}>What gets sent to our servers</h2>
          <p>
            When you ask VibeReply to generate a reply, rewrite a draft, or translate text, the
            visible message text involved in that one request is sent to our backend, which forwards
            it to an AI model (OpenAI or Google Gemini, depending on configuration) to produce the
            suggestion. Before sending, the extension automatically redacts patterns that look like
            phone numbers, email addresses, one-time codes, and card numbers.
          </p>
          <p>
            Each request is also tagged with an anonymous device identifier (a random ID generated
            and stored in your browser, not tied to your name, email, or any account) so your custom
            tone profiles can sync across your own devices.
          </p>
        </div>

        <div>
          <h2 className="card-title" style={{ fontSize: "1.15rem" }}>What we store</h2>
          <p>
            We store your tone profiles (names, sliders, custom instructions) keyed to your anonymous
            device ID, so they persist between sessions and across devices you're signed into. We do
            not store the content of your conversations, the messages you generate, or your
            translations on our servers — those exist only for the duration of the request needed to
            produce a response.
          </p>
        </div>

        <div>
          <h2 className="card-title" style={{ fontSize: "1.15rem" }}>What VibeReply never does</h2>
          <ul style={{ paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <li>It never sends a message on your behalf. Every suggestion is inserted as a draft that you review and send yourself.</li>
            <li>It never transmits page content anywhere unless you explicitly ask for a reply, rewrite, or translation.</li>
            <li>It never sells your data to third parties.</li>
          </ul>
        </div>

        <div>
          <h2 className="card-title" style={{ fontSize: "1.15rem" }}>Third parties involved</h2>
          <p>
            Generating a reply or translation requires sending the relevant text to an AI provider
            (OpenAI or Google Gemini). Tone profiles are stored in a managed Postgres database
            (Neon). Neither receives any information that identifies you personally beyond the
            anonymous device ID described above.
          </p>
        </div>

        <div>
          <h2 className="card-title" style={{ fontSize: "1.15rem" }}>Your controls</h2>
          <p>
            You can clear your locally stored conversation history at any time from the extension's
            settings panel. Uninstalling the extension removes its local storage from your browser;
            to request deletion of your device's stored tone profiles from our database, contact us
            using the details below.
          </p>
        </div>

        <div>
          <h2 className="card-title" style={{ fontSize: "1.15rem" }}>Contact</h2>
          <p>
            Questions about this policy or your data can be sent to the contact listed on our{" "}
            <a href="https://github.com/kamleshsahu0007/VibeReply" target="_blank" rel="noopener noreferrer">
              GitHub repository
            </a>.
          </p>
        </div>

        <div style={{ paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
          <Link href="/" className="btn btn-secondary" style={{ textDecoration: "none", display: "inline-flex" }}>
            ← Back to VibeReply
          </Link>
        </div>
      </section>
    </div>
  );
}
