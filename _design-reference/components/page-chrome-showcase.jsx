/* Header / Footer / Cookie banner — annotated showcase frames */

function HeaderShowcase() {
  return (
    <div data-screen-label="Navigation Header" style={{ background: "var(--bone-100)", padding: "40px 0" }}>
      <div className="container" style={{ marginBottom: 24 }}>
        <div className="eyebrow">Navigation · Top of homepage (transparent over hero)</div>
      </div>
      {/* Transparent state over hero */}
      <div style={{
        position: "relative", margin: "0 auto", maxWidth: "calc(var(--container-wide))",
        marginLeft: "var(--gutter)", marginRight: "var(--gutter)",
        background: "linear-gradient(180deg, #1c1816 0%, #2a221d 100%)",
        height: 240, color: "var(--bone-50)", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "repeating-linear-gradient(45deg, transparent 0 28px, rgba(250,247,242,0.03) 28px 29px)",
        }} />
        <div style={{ position: "relative", padding: "0 32px" }}>
          <HeaderRow scrolled={false} dark />
        </div>
        <span className="annot" style={{ top: 80, right: 24, color: "var(--bone-100)", borderColor: "var(--bone-100)", background: "rgba(28,24,22,0.6)" }}>
          Transparent · over hero only
        </span>
      </div>

      <div className="container" style={{ marginTop: 56, marginBottom: 24 }}>
        <div className="eyebrow">Scrolled state · subtle backdrop-blur, less padding</div>
      </div>
      <div style={{
        margin: "0 var(--gutter)",
        background: "rgba(250,247,242,0.86)",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid var(--hairline)",
        padding: "0 32px",
      }}>
        <HeaderRow scrolled />
      </div>

      <div className="container" style={{ marginTop: 56 }}>
        <div className="eyebrow" style={{ marginBottom: 24 }}>Mobile drawer · open</div>
        <div style={{
          width: 375, height: 600, marginInline: "auto",
          background: "var(--bone-50)", border: "1px solid var(--hairline-strong)",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid var(--hairline)" }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>Furnituremodern</span>
            <button aria-label="Close" style={{ background: "transparent", border: 0, fontSize: 22, cursor: "pointer" }}>×</button>
          </div>
          <nav style={{ padding: "32px 24px", display: "grid", gap: 24 }}>
            {[
              ["დივნები","Sofas","12 ნაჭერი"],
              ["საწოლები","Beds","9 ნაჭერი"],
              ["მაგიდები","Tables","8 ნაჭერი"],
              ["სკამები","Chairs","6 ნაჭერი"],
              ["სახელოსნო","Workshop",""],
              ["ვიზიტი","Visit",""],
            ].map(([ka, en, count]) => (
              <a key={ka} href="#" style={{ color: "var(--ink-900)", display: "grid", gridTemplateColumns: "1fr auto", alignItems: "baseline", borderBottom: "1px solid var(--hairline)", paddingBottom: 18 }}>
                <span>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 24, letterSpacing: "-0.015em" }}>{ka}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 12, color: "var(--ink-500)" }}>{en}</div>
                </span>
                {count && <span style={{ fontSize: 11, color: "var(--ink-500)", letterSpacing: "0.12em", textTransform: "uppercase" }}>{count}</span>}
              </a>
            ))}
          </nav>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 24px", borderTop: "1px solid var(--hairline)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, letterSpacing: "0.16em", fontWeight: 500 }}>
              <strong>KA</strong> <span style={{ color: "var(--ink-300)" }}>·</span> <span style={{ color: "var(--ink-500)" }}>EN</span>
            </div>
            <a href="#" className="btn btn-primary" style={{ padding: "10px 16px", minHeight: 38, fontSize: 11 }}>WhatsApp</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeaderRow({ scrolled, dark }) {
  const fg = dark ? "var(--bone-50)" : "var(--ink-900)";
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center",
      padding: scrolled ? "16px 0" : "26px 0",
    }}>
      <a href="#" style={{ color: fg, fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: "-0.02em" }}>Furnituremodern</a>
      <nav style={{ display: "flex", alignItems: "center", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 500, color: fg }}>
        {["დივნები","საწოლები","მაგიდები","სკამები","სახელოსნო"].map((l, i) => (
          <React.Fragment key={l}>
            {i > 0 && <span aria-hidden style={{ width: 3, height: 3, borderRadius: "50%", background: "currentColor", margin: "0 14px", opacity: 0.5 }} />}
            <a href="#" style={{ color: "inherit", opacity: i === 0 ? 1 : 0.78 }}>{l}</a>
          </React.Fragment>
        ))}
      </nav>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, alignItems: "center", color: fg }}>
        <span style={{ fontSize: 11, letterSpacing: "0.16em", fontWeight: 500 }}>
          <strong>KA</strong> <span style={{ opacity: 0.4 }}>·</span> <span style={{ opacity: 0.55 }}>EN</span>
        </span>
        <a href="#" style={{ padding: "10px 16px", border: `1px solid ${fg}`, color: fg, fontSize: 12, letterSpacing: "0.04em", fontWeight: 500 }}>ვიზიტი</a>
      </div>
    </div>
  );
}

function FooterShowcase() {
  return (
    <div data-screen-label="Footer" style={{ background: "var(--bone-100)", paddingTop: 40 }}>
      <div className="container" style={{ marginBottom: 24 }}>
        <div className="eyebrow">Footer · multi-column, brand monogram + 4 link columns + bottom band</div>
      </div>
      <SiteFooter />
    </div>
  );
}

function CookieShowcase() {
  return (
    <div data-screen-label="Cookie banner" style={{ background: "var(--bone-200)", padding: "40px 0", position: "relative", minHeight: 280 }}>
      <div className="container" style={{ marginBottom: 24 }}>
        <div className="eyebrow">Cookie consent · pinned to viewport bottom · two equal-weight buttons</div>
      </div>
      <div style={{ position: "relative", margin: "0 var(--gutter)", height: 200, background: "var(--ink-900)", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.12, color: "var(--bone-50)", display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.2em" }}>
          [ Page content behind ]
        </div>
        <CookieBanner />
      </div>
    </div>
  );
}

Object.assign(window, { HeaderShowcase, FooterShowcase, CookieShowcase });
