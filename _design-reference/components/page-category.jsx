/* Category listing page (Sofas). Desktop 1440 reference. */
function CategoryPage() {
  const products = [
    { id: 1, ka: "დივანი ალაზანი", en: "Sofa Alazani · 240cm", price: "₾7,420", new: true },
    { id: 2, ka: "დივანი ყაზბეგი", en: "Sofa Kazbegi · 220cm", price: "₾6,180", new: false },
    { id: 3, ka: "დივანი იმერეთი", en: "Sofa Imereti · 3-seat", price: "₾5,940", new: false },
    { id: 4, ka: "დივანი მთიული", en: "Sofa Mtiuli · 2-seat", price: "₾4,860", new: false },
    { id: 5, ka: "დივანი მუხრანი", en: "Sofa Mukhrani · L-shape", price: "₾9,820", new: true },
    { id: 6, ka: "დივანი ლაგოდეხი", en: "Sofa Lagodekhi · 200cm", price: "₾5,420", new: false },
    { id: 7, ka: "სავარძელი თელავი", en: "Lounge Telavi", price: "₾3,180", new: false },
    { id: 8, ka: "სავარძელი მუხა", en: "Lounge Mukha · oak", price: "₾2,940", new: false },
    { id: 9, ka: "სავარძელი ცხინვალი", en: "Lounge Tskhinvali", price: "₾3,420", new: false },
    { id: 10, ka: "ფეხის სკამი ბორჯომი", en: "Ottoman Borjomi", price: "₾1,640", new: false },
    { id: 11, ka: "დივანი ბაკურიანი", en: "Sofa Bakuriani · 260cm", price: "₾8,180", new: false },
    { id: 12, ka: "დივანი ფასანაური", en: "Sofa Pasanauri · 200cm", price: "₾5,180", new: false },
  ];

  return (
    <div data-screen-label="Category Page" style={{ background: "var(--bone-50)" }}>
      <SiteHeader current="sofas" />

      <div className="container" style={{ paddingTop: 40 }}>
        <nav aria-label="Breadcrumb" data-screen-label="Breadcrumbs" style={{
          fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase",
          color: "var(--ink-500)", fontWeight: 500,
          display: "flex", gap: 14, alignItems: "center",
        }}>
          <a href="#" style={{ color: "inherit" }}>მთავარი</a>
          <span aria-hidden style={{ color: "var(--ink-300)" }}>/</span>
          <a href="#" style={{ color: "inherit" }}>კოლექცია</a>
          <span aria-hidden style={{ color: "var(--ink-300)" }}>/</span>
          <span style={{ color: "var(--ink-900)" }}>დივნები</span>
        </nav>
      </div>

      {/* Editorial category hero */}
      <section data-screen-label="Category hero" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <div className="container" style={{
          display: "grid", gridTemplateColumns: "6fr 6fr", gap: 80, alignItems: "end",
        }}>
          <div data-reveal>
            <div className="eyebrow">N°01 — Collection · დივნები</div>
            <h1 className="display-1" style={{ marginTop: 24, marginBottom: 28 }}>
              დივნები,<br/><em>ცხრა ხელით</em><br/>აშენებული.
            </h1>
            <span className="annot" style={{ position: "static", display: "inline-block", marginBottom: 18 }}>H1 · single per page</span>
          </div>
          <div data-reveal style={{ paddingBottom: 8 }}>
            <p className="lede" style={{ fontStyle: "italic", marginBottom: 16 }}>
              თორმეტი ნაჭერი. ნახარშავი მუხის ჩარჩო, რვა-მხრივ ხელით შეკრული
              ზამბარები, მოსახსნელი თეთრეულის შესამოსი.
            </p>
            <p className="body">
              თითოეული დივანი ცხრა-ცამეტ დღეში დასრულდება. შეკვეთის შემდგომ
              დამზადების ვადა ოთხი-ექვსი კვირა. გარანტია ჩარჩოზე ათი წელი.
            </p>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="ph ar-219" data-reveal>
          <span className="ph-label">Category lead photo · 21:9 · workshop floor with sofa in progress</span>
        </div>
      </div>

      {/* Sort + count bar */}
      <section style={{ paddingTop: 56, paddingBottom: 28 }}>
        <div className="container" style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          flexWrap: "wrap", gap: 16,
          borderBottom: "1px solid var(--hairline)", paddingBottom: 24,
        }}>
          <div className="caption" style={{ color: "var(--ink-700)" }}>
            <strong style={{ color: "var(--ink-900)" }}>12</strong> ნაჭერი · 12 of 12 shown
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 22, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 500, color: "var(--ink-700)" }}>
            <span style={{ color: "var(--ink-500)" }}>Sort —</span>
            <a href="#" style={{ color: "var(--ink-900)", borderBottom: "1px solid var(--ink-900)", paddingBottom: 4 }}>Newest</a>
            <a href="#" style={{ color: "inherit" }}>Price ↑</a>
            <a href="#" style={{ color: "inherit" }}>Price ↓</a>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section style={{ paddingBottom: 100 }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32, rowGap: 56 }}>
            {products.map(p => (
              <a key={p.id} href="#" data-reveal style={{ color: "inherit", display: "block", position: "relative" }}>
                <div className="ph ar-45">
                  {p.new && <span style={{
                    position: "absolute", top: 12, left: 12, zIndex: 2,
                    fontFamily: "var(--font-body)", fontWeight: 500,
                    fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase",
                    color: "var(--bone-50)", background: "var(--terracotta-500)",
                    padding: "5px 9px",
                  }}>New</span>}
                  <span className="ph-label">{p.en}</span>
                </div>
                <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "baseline" }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 19, color: "var(--ink-900)", letterSpacing: "-0.01em" }}>
                      {p.ka}
                    </div>
                    <div className="caption" style={{ fontStyle: "italic", fontFamily: "var(--font-display)", marginTop: 2 }}>
                      {p.en}
                    </div>
                  </div>
                  <div style={{ fontWeight: 500, fontSize: 15, fontFeatureSettings: "'tnum'" }}>{p.price}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Pagination */}
      <section style={{ borderTop: "1px solid var(--hairline)", padding: "32px 0" }}>
        <div className="container" style={{ display: "flex", justifyContent: "center", gap: 14, alignItems: "center", fontSize: 13, fontWeight: 500, letterSpacing: "0.08em" }}>
          <a href="#" style={{ color: "var(--ink-500)" }}>← წინა</a>
          <span style={{ color: "var(--ink-300)" }}>·</span>
          <a href="#" style={{ color: "var(--ink-900)", borderBottom: "1px solid var(--ink-900)" }}>1</a>
          <a href="#" style={{ color: "var(--ink-500)" }}>2</a>
          <span style={{ color: "var(--ink-300)" }}>·</span>
          <a href="#" style={{ color: "var(--ink-900)" }}>შემდეგი →</a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

Object.assign(window, { CategoryPage });
