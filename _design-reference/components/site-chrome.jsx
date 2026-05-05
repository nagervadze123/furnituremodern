/* Site header, footer, mobile drawer, cookie banner — shared across page mocks. */
const { useEffect, useState } = React;

function SiteHeader({ transparent = false, current = "home" }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { id: "sofas", ka: "დივნები", en: "Sofas" },
    { id: "beds", ka: "საწოლები", en: "Beds" },
    { id: "tables", ka: "მაგიდები", en: "Tables" },
    { id: "chairs", ka: "სკამები", en: "Chairs" },
    { id: "story", ka: "სახელოსნო", en: "Workshop" },
  ];

  const dotStyle = {
    width: 3, height: 3, borderRadius: "50%",
    background: "var(--ink-300)", display: "inline-block",
    margin: "0 14px",
  };

  return (
    <header
      data-screen-label="Header"
      style={{
        position: "sticky",
        top: 0, zIndex: 50,
        background: transparent && !scrolled ? "transparent" : "rgba(250,247,242,0.86)",
        backdropFilter: scrolled || !transparent ? "blur(14px) saturate(1.2)" : "none",
        borderBottom: scrolled ? "1px solid var(--hairline)" : "1px solid transparent",
        transition: "all 320ms var(--ease)",
        color: transparent && !scrolled ? "var(--bone-50)" : "var(--ink-900)",
      }}
    >
      <div className="container" style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        padding: scrolled ? "16px 0" : "26px 0",
        transition: "padding 320ms var(--ease)",
      }}>
        <a href="#" style={{
          display: "inline-flex", alignItems: "center", gap: 12,
          fontFamily: "var(--font-display)", fontWeight: 400,
          fontSize: 22, letterSpacing: "-0.02em",
          color: "inherit",
        }}>
          <span style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "currentColor", color: "transparent",
            display: "inline-block",
            position: "relative",
          }}>
            <span style={{
              position: "absolute", inset: 4, borderRadius: "50%",
              border: "1px solid var(--bone-50)",
              background: transparent && !scrolled ? "var(--ink-900)" : "var(--bone-50)",
            }} />
          </span>
          Furnituremodern
        </a>

        <nav aria-label="Primary" style={{
          display: "flex", alignItems: "center",
          fontFamily: "var(--font-body)", fontWeight: 500,
          fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase",
        }}>
          {links.map((l, i) => (
            <React.Fragment key={l.id}>
              {i > 0 && <span style={dotStyle} aria-hidden="true" />}
              <a href={`#${l.id}`}
                 aria-current={current === l.id ? "page" : undefined}
                 style={{
                   color: "inherit", opacity: current === l.id ? 1 : 0.78,
                   padding: "8px 0", transition: "opacity 200ms",
                   borderBottom: current === l.id ? "1px solid currentColor" : "1px solid transparent",
                 }}>
                {l.ka}
              </a>
            </React.Fragment>
          ))}
        </nav>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, alignItems: "center" }}>
          <div role="group" aria-label="Language" style={{
            display: "inline-flex",
            fontFamily: "var(--font-body)", fontWeight: 500,
            fontSize: 11, letterSpacing: "0.16em",
          }}>
            <button style={langBtn(true)}>KA</button>
            <span style={{ width: 1, background: "currentColor", opacity: 0.25 }} />
            <button style={langBtn(false)}>EN</button>
          </div>
          <a href="#visit" className="btn btn-ghost" style={{
            padding: "10px 16px", minHeight: 40, fontSize: 12,
            borderColor: "currentColor", color: "inherit",
          }}>
            ვიზიტი · Visit
          </a>
        </div>
      </div>
    </header>
  );
}
function langBtn(active) {
  return {
    background: "transparent", border: 0, padding: "6px 10px",
    color: "inherit", cursor: "pointer",
    opacity: active ? 1 : 0.55,
    fontWeight: active ? 600 : 500,
    fontFamily: "inherit", fontSize: "inherit", letterSpacing: "inherit",
  };
}

function SiteFooter() {
  return (
    <footer data-screen-label="Footer" style={{
      background: "var(--ink-900)", color: "var(--bone-100)",
      paddingTop: 96, paddingBottom: 40,
    }}>
      <div className="container">
        <div style={{
          display: "grid", gridTemplateColumns: "2.2fr 1fr 1fr 1fr 1fr",
          gap: 40, paddingBottom: 56,
          borderBottom: "1px solid rgba(250,247,242,0.14)",
        }}>
          <div>
            <div style={{
              fontFamily: "var(--font-display)", fontWeight: 400,
              fontSize: 28, letterSpacing: "-0.02em", marginBottom: 18,
              fontVariationSettings: "'opsz' 100",
            }}>
              Furnituremodern
            </div>
            <p className="body" style={{ color: "rgba(250,247,242,0.7)", maxWidth: 36 + "ch", margin: 0 }}>
              თბილისში ხელით აშენებული ავეჯი ბუნებრივი მასალებისგან.
              ათი წლის გარანტიით.
            </p>
            <p className="caption" style={{ marginTop: 14, color: "rgba(250,247,242,0.5)", fontStyle: "italic" }}>
              Hand-built in Tbilisi, since 2014.
            </p>
          </div>

          {[
            { h: "Explore · კოლექცია", items: ["დივნები", "საწოლები", "მაგიდები", "სკამები", "ახალი ნაჭრები"] },
            { h: "Customer · მომხმარებელი", items: ["შეკვეთა", "მიწოდება", "გარანტია", "მოვლა", "კითხვები"] },
            { h: "Visit · ვიზიტი", items: ["სალონი თბილისი", "სახელოსნო ნავთლუღი", "სამუშაო საათები", "კონტაქტი"] },
            { h: "Connect", items: ["Instagram", "Pinterest", "Newsletter", "Press"] },
          ].map(col => (
            <div key={col.h}>
              <h4 className="eyebrow no-rule" style={{
                color: "rgba(250,247,242,0.55)", marginBottom: 18, marginTop: 0,
              }}>{col.h}</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {col.items.map(i => (
                  <li key={i} style={{ marginBottom: 10 }}>
                    <a href="#" style={{
                      color: "var(--bone-100)", fontSize: 14, lineHeight: 1.5,
                      borderBottom: "1px solid transparent",
                      transition: "border-color 200ms, color 200ms",
                    }}
                       onMouseEnter={e => { e.currentTarget.style.borderBottomColor = "var(--brass-500)"; e.currentTarget.style.color = "var(--brass-500)"; }}
                       onMouseLeave={e => { e.currentTarget.style.borderBottomColor = "transparent"; e.currentTarget.style.color = "var(--bone-100)"; }}
                    >{i}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{
          paddingTop: 28, display: "flex", justifyContent: "space-between",
          gap: 20, flexWrap: "wrap",
          fontSize: 12, color: "rgba(250,247,242,0.5)",
          letterSpacing: "0.08em",
        }}>
          <span>© 2026 Furnituremodern Ltd. · ID 405123456 · Tbilisi, Georgia</span>
          <div style={{ display: "inline-flex", gap: 24 }}>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <strong style={{ color: "var(--bone-50)" }}>KA</strong>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>EN</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function CookieBanner() {
  return (
    <aside data-screen-label="Cookie banner" role="dialog" aria-label="Cookies"
      style={{
        position: "absolute", left: 24, right: 24, bottom: 24,
        background: "var(--bone-100)",
        border: "1px solid var(--hairline-strong)",
        padding: "20px 24px",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 24, alignItems: "center",
        boxShadow: "0 18px 48px -24px rgba(28,24,22,0.18)",
        maxWidth: 1100, margin: "0 auto",
      }}>
      <div>
        <div className="eyebrow no-rule" style={{ marginBottom: 8, color: "var(--ink-700)" }}>Cookies · ქუქი-ფაილები</div>
        <p className="caption" style={{ color: "var(--ink-700)", margin: 0, maxWidth: "70ch" }}>
          ჩვენ ვიყენებთ აუცილებელ ქუქი-ფაილებს საიტის გასამართად და ანონიმურ ანალიტიკას სტუმრების გასაცნობად.{" "}
          <a href="#" style={{ color: "var(--terracotta-500)", borderBottom: "1px solid var(--terracotta-500)" }}>კონფიდენციალურობის პოლიტიკა</a>.
        </p>
      </div>
      <div style={{ display: "inline-flex", gap: 12 }}>
        <button className="btn btn-ghost" style={{ padding: "12px 20px", minHeight: 44, fontSize: 12 }}>
          Necessary only
        </button>
        <button className="btn" style={{ padding: "12px 20px", minHeight: 44, fontSize: 12 }}>
          Accept all
        </button>
      </div>
    </aside>
  );
}

Object.assign(window, { SiteHeader, SiteFooter, CookieBanner });
