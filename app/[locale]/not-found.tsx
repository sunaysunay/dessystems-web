import { Link } from "@/src/i18n/routing"
import { NotFoundTracker } from "./not-found-tracker"
import { NotFoundActions, NotFoundTrace } from "./not-found-client"

export default async function NotFound() {
  const contactEmail = "info@dessystems.io"

  return (
    <>
      <NotFoundTracker />
      <link
        href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap"
        rel="stylesheet"
      />
      <style>{`
        .nf-wrap, .nf-wrap *, .nf-wrap *::before, .nf-wrap *::after { box-sizing: border-box; }

        .nf-wrap {
          --nf-bg:       #0a0a0b;
          --nf-surface:  #111114;
          --nf-border:   #1e1e24;
          --nf-accent:   #c8f03a;
          --nf-accent2:  #3affd8;
          --nf-muted:    #4a4a56;
          --nf-text:     #e8e8ec;
          --nf-text-dim: #7a7a8a;
          position: fixed;
          inset: 0;
          z-index: 2147483000;
          min-height: 100vh;
          height: 100vh;
          background: var(--nf-bg);
          color: var(--nf-text);
          font-family: 'DM Sans', sans-serif;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .nf-wrap::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(var(--nf-border) 1px, transparent 1px),
            linear-gradient(90deg, var(--nf-border) 1px, transparent 1px);
          background-size: 60px 60px;
          opacity: 0.5;
          pointer-events: none;
          z-index: 0;
        }

        .nf-wrap::after {
          content: '';
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -60%);
          width: 700px;
          height: 700px;
          background: radial-gradient(ellipse, rgba(200, 240, 58, 0.06) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .nf-inner {
          position: relative;
          z-index: 1;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 6rem 2rem 8rem;
        }

        .nf-topbar {
          position: fixed;
          top: 0; left: 0; right: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 2.5rem;
          border-bottom: 1px solid var(--nf-border);
          background: rgba(10,10,11,0.8);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          z-index: 10;
        }

        .nf-logo {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.5rem;
          letter-spacing: 0.12em;
          color: var(--nf-text);
        }
        .nf-logo span { color: var(--nf-accent); }

        .nf-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: 'DM Mono', monospace;
          font-size: 0.7rem;
          color: var(--nf-text-dim);
          letter-spacing: 0.08em;
        }

        .nf-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ff4545;
          animation: nf-pulse 2s ease-in-out infinite;
        }

        @keyframes nf-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .nf-main {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          max-width: 720px;
          width: 100%;
          animation: nf-fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes nf-fadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .nf-tag {
          font-family: 'DM Mono', monospace;
          font-size: 0.7rem;
          letter-spacing: 0.14em;
          color: var(--nf-accent);
          background: rgba(200, 240, 58, 0.08);
          border: 1px solid rgba(200, 240, 58, 0.2);
          padding: 0.25rem 0.75rem;
          border-radius: 2px;
          margin-bottom: 2rem;
        }

        .nf-giant {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(9rem, 22vw, 18rem);
          line-height: 0.85;
          letter-spacing: -0.02em;
          color: transparent;
          -webkit-text-stroke: 1px var(--nf-border);
          position: relative;
          user-select: none;
        }

        .nf-giant::after {
          content: '404';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, var(--nf-text) 0%, var(--nf-muted) 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-stroke: 0;
          clip-path: polygon(0 0, 60% 0, 40% 100%, 0 100%);
        }

        .nf-headline {
          font-family: 'DM Sans', sans-serif;
          font-size: clamp(1.4rem, 3vw, 2.2rem);
          font-weight: 300;
          color: var(--nf-text);
          margin-top: 1.5rem;
          letter-spacing: -0.01em;
        }
        .nf-headline strong { font-weight: 500; }

        .nf-divider {
          width: 100%;
          height: 1px;
          background: linear-gradient(90deg, var(--nf-accent) 0%, transparent 60%);
          margin: 2rem 0;
        }

        .nf-desc {
          font-size: 0.95rem;
          color: var(--nf-text-dim);
          line-height: 1.7;
          max-width: 480px;
        }

        .nf-contact {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-top: 1.5rem;
          padding: 0.85rem 1.1rem;
          border: 1px solid rgba(200, 240, 58, 0.25);
          background: rgba(200, 240, 58, 0.06);
          border-radius: 4px;
          font-family: 'DM Mono', monospace;
          font-size: 0.8rem;
          color: var(--nf-text-dim);
          letter-spacing: 0.02em;
          flex-wrap: wrap;
        }
        .nf-contact a {
          color: var(--nf-accent);
          text-decoration: none;
          font-weight: 500;
          border-bottom: 1px solid rgba(200, 240, 58, 0.35);
          transition: color 0.2s ease, border-color 0.2s ease;
        }
        .nf-contact a:hover {
          color: #d9ff4a;
          border-color: #d9ff4a;
        }

        .nf-actions {
          display: flex;
          gap: 1rem;
          margin-top: 2.5rem;
          flex-wrap: wrap;
        }

        .nf-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-family: 'DM Mono', monospace;
          font-size: 0.75rem;
          letter-spacing: 0.1em;
          text-decoration: none;
          padding: 0.75rem 1.5rem;
          border-radius: 2px;
          transition: all 0.2s ease;
          cursor: pointer;
          border: none;
        }

        .nf-btn-primary {
          background: var(--nf-accent);
          color: #0a0a0b;
          font-weight: 500;
        }
        .nf-btn-primary:hover {
          background: #d9ff4a;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(200, 240, 58, 0.25);
        }

        .nf-btn-ghost {
          background: transparent;
          color: var(--nf-text-dim);
          border: 1px solid var(--nf-border);
        }
        .nf-btn-ghost:hover {
          border-color: var(--nf-muted);
          color: var(--nf-text);
          transform: translateY(-1px);
        }

        .nf-trace {
          position: fixed;
          bottom: 2rem;
          right: 2.5rem;
          font-family: 'DM Mono', monospace;
          font-size: 0.65rem;
          color: var(--nf-muted);
          letter-spacing: 0.08em;
          line-height: 1.9;
          text-align: right;
        }
        .nf-trace-line { display: block; }
        .nf-trace-line .nf-key { color: var(--nf-text-dim); }
        .nf-trace-line .nf-val { color: var(--nf-accent2); }

        .nf-corner {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 220px;
          height: 220px;
          border-top: 1px solid var(--nf-border);
          border-right: 1px solid var(--nf-border);
          pointer-events: none;
          opacity: 0.4;
        }
        .nf-corner::after {
          content: '';
          position: absolute;
          bottom: 40px;
          left: 40px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--nf-accent);
          box-shadow: 0 0 12px var(--nf-accent);
        }

        @media (max-width: 640px) {
          .nf-trace { display: none; }
          .nf-corner { display: none; }
          .nf-topbar { padding: 1rem 1.25rem; }
        }
      `}</style>

      <div className="nf-wrap">
        <nav className="nf-topbar">
          <div className="nf-logo">DES<span>.</span>SYSTEMS</div>
          <div className="nf-status">
            <span className="nf-dot" />
            ERROR_STATE / HTTP 404
          </div>
        </nav>

        <div className="nf-inner">
          <div className="nf-main">
            <span className="nf-tag">HTTP / 404 NOT_FOUND</span>

            <div className="nf-giant">404</div>

            <h1 className="nf-headline">
              The page you&rsquo;re looking for<br /><strong>doesn&rsquo;t exist.</strong>
            </h1>

            <div className="nf-divider" />

            <p className="nf-desc">
              The requested resource could not be located on this server.
              It may have been moved, deleted, or the URL might be incorrect.
              Navigate back or return to the homepage to continue.
            </p>

            <div className="nf-contact">
              <span>Need help finding something?</span>
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            </div>

            <div className="nf-actions">
              <Link href="/" className="nf-btn nf-btn-primary">
                ↖ RETURN HOME
              </Link>
              <NotFoundActions />
            </div>
          </div>
        </div>

        <NotFoundTrace />

        <div className="nf-corner" />
      </div>
    </>
  )
}
