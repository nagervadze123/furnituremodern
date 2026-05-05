/* Homepage — Mobile 375 view. Same content, restacked. */
function HomepageMobile() {
  return (
    <div data-screen-label="Homepage Mobile" style={{ background: "var(--bone-50)", color: "var(--ink-900)" }}>
      {/* Mobile header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(250,247,242,0.92)",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid var(--hairline)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "14px 18px",
      }}>
        <a href="#" style={{
          fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: "-0.02em",
          color: "var(--ink-900)",
        }}>Furnituremodern</a>
        <div style={{ display: "inline-flex", gap: 16, alignItems: "center" }}>
          <span style={{ fontSize: 11, letterSpacing: "0.16em", color: "var(--ink-700)", fontWeight: 500 }}>
            <strong>KA</strong> · <span style={{ opacity: 0.5 }}>EN</span>
          </span>
          <button aria-label="Menu" style={{
            width: 36, height: 36, background: "transparent",
            border: "1px solid var(--hairline-strong)",
            display: "grid", placeItems: "center", cursor: "pointer",
          }}>
            <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
              <path d="M0 1h14M0 5h14M0 9h14" stroke="currentColor" strokeWidth="1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile hero */}
      <section data-screen-label="Hero (mobile)" style={{
        position: "relative", color: "var(--bone-50)",
        background: "var(--ink-900)",
        minHeight: 620,
        display: "grid", gridTemplateRows: "1fr auto",
      }}>
        <div className="ph dark" style={{ position: "absolute", inset: 0,
          background: "linear-gradient(180deg, #2a221d 0%, #1c1816 70%, #14110f 100%)" }}>
          <span className="ph-label" style={{ top: 16, left: 16, transform: "none", fontSize: 9 }}>
            Hero photo · 3:4 vertical
          </span>
        </div>
        <div aria-hidden style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, rgba(15,12,10,0.4) 0%, rgba(15,12,10,0.7) 100%)",
        }} />
        <div style={{ position: "relative", padding: "40px 20px 28px", alignSelf: "end" }}>
          <div className="eyebrow" style={{ color: "var(--bone-200)", fontSize: 10 }}>
            <span style={{ color: "var(--terracotta-500)" }}>●</span>
            N°06 · შემოდგომა 2026
          </div>
          <h1 className="display-1" style={{
            color: "var(--bone-50)", marginTop: 18, marginBottom: 18,
            fontSize: "2.6rem", lineHeight: 1.05,
          }}>
            ხის ავეჯი,<br/><em>აშენებული ხელით,</em><br/>თბილისში.
          </h1>
          <p style={{
            fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 300,
            fontSize: 16, lineHeight: 1.5, color: "var(--bone-100)", marginBottom: 24,
          }}>
            იმპორტირებული მუხა, ბუნებრივი თეთრეული, მცირე პარტიული წარმოება.
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            <a href="#" className="btn btn-primary" style={{ justifyContent: "center" }}>
              კოლექციის ნახვა <span aria-hidden>→</span>
            </a>
            <a href="#" className="btn" style={{
              justifyContent: "center", borderColor: "var(--bone-50)", color: "var(--bone-50)",
            }}>სახელოსნო</a>
          </div>
        </div>
      </section>

      {/* TOC */}
      <section style={{
        borderBottom: "1px solid var(--hairline)",
        padding: "16px 20px",
        display: "flex", overflowX: "auto", gap: 18,
        fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase",
        color: "var(--ink-700)", fontWeight: 500,
        scrollbarWidth: "none",
      }}>
        {["I. Categories","II. Featured","III. Recent","IV. Workshop","V. Visit"].map(s =>
          <a key={s} href="#" style={{ whiteSpace: "nowrap", color: "inherit" }}>{s}</a>
        )}
      </section>

      {/* Categories — stacked */}
      <section style={{ padding: "56px 20px" }}>
        <div className="eyebrow">I. კოლექცია</div>
        <h2 className="display-2" style={{ marginTop: 16, marginBottom: 36, fontSize: "2rem" }}>
          სამი კატეგორია,<br/><em>ერთი ფილოსოფია.</em>
        </h2>
        {[
          { ka: "დივნები", en: "Sofas", pieces: 12, from: "₾4,200" },
          { ka: "საწოლები", en: "Beds", pieces: 9, from: "₾2,800" },
          { ka: "მაგიდები", en: "Tables & Chairs", pieces: 14, from: "₾980" },
        ].map((c, i) => (
          <article key={c.en} style={{ marginBottom: 36 }}>
            <div className="ph ar-43" style={{ marginBottom: 16 }}>
              <span className="ph-label">{c.en} · 4:3</span>
            </div>
            <h3 className="display-3" style={{ fontSize: "1.65rem" }}>{c.ka}</h3>
            <div className="caption" style={{ fontStyle: "italic", fontFamily: "var(--font-display)", marginTop: 2, marginBottom: 12 }}>{c.en}</div>
            <div style={{ display: "flex", gap: 14, fontSize: 12, color: "var(--ink-500)", marginBottom: 14 }}>
              <span>{c.pieces} ნაჭერი</span><span>·</span><span>From <strong style={{ color: "var(--ink-900)" }}>{c.from}</strong></span>
            </div>
            <a href="#" className="text-link" style={{ fontSize: 13 }}>იხილეთ <span aria-hidden>→</span></a>
          </article>
        ))}
      </section>

      {/* Recent grid (2-col) */}
      <section style={{ padding: "56px 20px", borderTop: "1px solid var(--hairline)" }}>
        <div className="eyebrow">III. ახალი ნაჭრები</div>
        <h2 className="display-2" style={{ marginTop: 16, marginBottom: 32, fontSize: "1.9rem" }}>ახლახან <em>დასრულებული.</em></h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            { ka: "ჩარდახი", en: "Wishbone chair", price: "₾980" },
            { ka: "რუსთავი", en: "Pedestal table", price: "₾4,260" },
            { ka: "სვანეთი", en: "Walnut dresser", price: "₾3,420" },
            { ka: "ალაზანი", en: "Bar stool", price: "₾640" },
          ].map(p => (
            <a key={p.en} href="#" style={{ color: "inherit" }}>
              <div className="ph ar-45"><span className="ph-label" style={{ fontSize: 9 }}>{p.en}</span></div>
              <div style={{ marginTop: 10 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--ink-900)" }}>{p.ka}</div>
                <div style={{ fontSize: 12, color: "var(--ink-500)", fontStyle: "italic", fontFamily: "var(--font-display)" }}>{p.en}</div>
                <div style={{ fontSize: 13, marginTop: 2, fontWeight: 500 }}>{p.price}</div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Visit (dark) */}
      <section style={{ background: "var(--ink-900)", color: "var(--bone-50)", padding: "56px 20px" }}>
        <div className="eyebrow" style={{ color: "var(--bone-200)" }}>V. Visit</div>
        <h2 className="display-2" style={{ marginTop: 16, color: "var(--bone-50)", fontSize: "2rem" }}>
          მობრძანდით,<br/><em>მოხედეთ ხელით.</em>
        </h2>
        <p style={{ marginTop: 18, fontFamily: "var(--font-display)", fontStyle: "italic", color: "var(--bone-100)", fontSize: 16 }}>
          აღმაშენებლის გამზირი 100, თბილისი.<br/>ორშ — შაბ.
        </p>
        <div style={{ display: "grid", gap: 10, marginTop: 24 }}>
          <a href="#" className="btn btn-primary" style={{ justifyContent: "center" }}>დაგეგმეთ ვიზიტი</a>
          <a href="#" className="btn" style={{ borderColor: "var(--bone-50)", color: "var(--bone-50)", justifyContent: "center" }}>WhatsApp</a>
        </div>
      </section>

      <footer style={{ background: "var(--ink-900)", color: "var(--bone-100)", padding: "40px 20px", borderTop: "1px solid rgba(250,247,242,0.14)" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, marginBottom: 12 }}>Furnituremodern</div>
        <p style={{ fontSize: 13, color: "rgba(250,247,242,0.6)", marginBottom: 24 }}>
          ხელით აშენებული, თბილისი 2014.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, fontSize: 13 }}>
          {["კოლექცია","სახელოსნო","ვიზიტი","Privacy"].map(t =>
            <a key={t} href="#" style={{ color: "var(--bone-100)" }}>{t}</a>
          )}
        </div>
      </footer>
    </div>
  );
}

Object.assign(window, { HomepageMobile });
