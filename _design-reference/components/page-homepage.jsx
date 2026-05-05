/* Homepage — desktop 1440 reference, with embedded mobile 375 view at the end. */
const { useEffect } = React;

function HomepageDesktop() {
  return (
    <div data-screen-label="Homepage Desktop">
      <SiteHeader transparent current="home" />

      {/* ===== HERO ===== */}
      <section data-screen-label="Hero" style={{
        position: "relative",
        marginTop: -96, /* sit under transparent header */
        paddingTop: 96,
        background: "var(--ink-900)",
        color: "var(--bone-50)",
      }}>
        <div className="ph dark" style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, #2a221d 0%, #1c1816 60%, #14110f 100%)",
        }}>
          <span className="ph-label" style={{ top: "auto", bottom: 32, left: "auto", right: 32, transform: "none" }}>
            Primary product photo · sofa · neutral background
          </span>
        </div>
        {/* dark veil */}
        <div aria-hidden style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, rgba(15,12,10,0.55) 0%, rgba(15,12,10,0.15) 40%, rgba(15,12,10,0.65) 100%)",
        }} />
        <div className="container" style={{
          position: "relative", zIndex: 2,
          minHeight: "calc(100vh - 96px)",
          display: "grid",
          gridTemplateRows: "1fr auto",
          paddingTop: 80, paddingBottom: 56,
        }}>
          <div style={{ maxWidth: 920, alignSelf: "center" }}>
            <div className="eyebrow" style={{ color: "var(--bone-200)" }}>
              <span style={{ color: "var(--terracotta-500)" }}>●</span>
              ცოცხალი კოლექცია · N°06 · შემოდგომა 2026
            </div>
            <h1 className="display-1" id="hero-headline" style={{
              color: "var(--bone-50)",
              marginTop: 28, marginBottom: 28,
              fontSize: "clamp(3.5rem, 7vw, 6.5rem)",
              fontVariationSettings: "'opsz' 144",
            }}>
              ხის ავეჯი,<br/>
              <em>აშენებული ხელით,</em><br/>
              თბილისში.
            </h1>
            <p className="lede" style={{
              color: "var(--bone-100)", maxWidth: "44ch", marginBottom: 40,
              fontStyle: "italic",
            }}>
              იმპორტირებული მუხა და კაკალი, ბუნებრივი თეთრეული, მცირე
              პარტიული წარმოება. ერთი ნაჭერი, ერთი ოსტატი — თაობებზე გათვლილი.
            </p>
            <div style={{ display: "inline-flex", gap: 14, flexWrap: "wrap" }}>
              <a href="#collection" className="btn btn-primary">
                კოლექციის ნახვა <span aria-hidden>→</span>
              </a>
              <a href="#story" className="btn" style={{
                borderColor: "var(--bone-50)", color: "var(--bone-50)",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--bone-50)"; e.currentTarget.style.color = "var(--ink-900)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--bone-50)"; }}
              >
                სახელოსნო
              </a>
            </div>
          </div>

          <div style={{
            display: "grid", gridTemplateColumns: "1fr auto 1fr",
            alignItems: "end",
            paddingTop: 32,
            borderTop: "1px solid rgba(250,247,242,0.18)",
            color: "var(--bone-200)",
            fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase",
            fontFamily: "var(--font-body)", fontWeight: 500,
          }}>
            <span>დივანი ალაზანი — N°SF-240</span>
            <span style={{ textAlign: "center" }}>აშენებულია 9 დღე · ნახარშავი მუხა</span>
            <span style={{ textAlign: "right", fontStyle: "italic", fontFamily: "var(--font-display)", fontVariationSettings: "'opsz' 24" }}>
              Photographed by Anna Kvirikadze, October 2026
            </span>
          </div>
        </div>

        {/* anchor: H1 indicator */}
        <span className="annot" style={{ top: 120, left: 24 }}>H1 — single per page</span>
      </section>

      {/* ===== TABLE OF CONTENTS ===== */}
      <section data-screen-label="Masthead TOC" style={{
        borderTop: "1px solid var(--hairline)",
        borderBottom: "1px solid var(--hairline)",
        background: "var(--bone-50)",
      }}>
        <div className="container" style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "center",
          gap: 32,
          padding: "20px 0",
        }}>
          <div className="eyebrow no-rule" style={{
            fontFamily: "var(--font-display)", fontStyle: "italic",
            textTransform: "none", letterSpacing: "0", fontSize: 14,
            color: "var(--ink-500)",
          }}>
            In this issue —
          </div>
          <div style={{
            display: "flex", justifyContent: "center", flexWrap: "wrap",
            fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase",
            fontWeight: 500,
            color: "var(--ink-700)",
          }}>
            {[
              "I. Categories",
              "II. Featured",
              "III. Recent works",
              "IV. The workshop",
              "V. Visit",
            ].map((s, i) => (
              <React.Fragment key={s}>
                {i > 0 && <span aria-hidden style={{ margin: "0 22px", color: "var(--ink-300)" }}>·</span>}
                <a href="#" style={{ color: "inherit" }}>{s}</a>
              </React.Fragment>
            ))}
          </div>
          <div className="eyebrow no-rule" style={{ color: "var(--ink-500)" }}>
            №06 · 2026
          </div>
        </div>
      </section>

      {/* ===== FEATURED CATEGORIES (alternating spreads) ===== */}
      <section data-screen-label="Categories" id="collection" className="section">
        <div className="container">
          <div style={{ marginBottom: 64, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "end" }}>
            <div data-reveal>
              <div className="eyebrow">I. კოლექცია · The collection</div>
              <h2 className="display-2" style={{ marginTop: 20 }}>
                სამი კატეგორია,<br/><em>ერთი ფილოსოფია.</em>
              </h2>
            </div>
            <p className="body" data-reveal style={{ maxWidth: "52ch", justifySelf: "end" }}>
              ჩვენ ვაშენებთ მცირე რაოდენობით — წელიწადში ცამეტი დივანი, ცხრამეტი მაგიდა,
              ოცი საწოლი. ყოველი ნაჭერი დანომრილია და სახელოსნოს რეესტრში ინახება.
              თქვენ ცნობთ, რომელი ოსტატის ხელით აშენდა.
            </p>
          </div>

          {[
            {
              num: "I",
              ka: "დივნები", en: "Sofas",
              lede: "რვა-მხრივ ხელით შეკრული ზამბარები. ნახარშავი მუხის ჩარჩო ლურსმნის გარეშე. გარშემო შესაცვლელი თეთრეულის შესამოსი.",
              pieces: 12, from: "₾4,200",
              align: "left",
            },
            {
              num: "II",
              ka: "საწოლები", en: "Beds",
              lede: "თეთრი მუხა ისონის ტყეებიდან, ან ევროპული კაკალი ბავარიიდან. ტრადიციული mortise & tenon შეერთებით.",
              pieces: 9, from: "₾2,800",
              align: "right",
            },
            {
              num: "III",
              ka: "მაგიდები და სკამები", en: "Tables & Chairs",
              lede: "ორთქლით მოხრილი მუხის ჩარჩო, ხელით ნაქსოვი ქაღალდის თოკის სხდომა. ერთი მაგიდა ცხრა კაცისთვის, საუკუნისთვის.",
              pieces: 14, from: "₾980",
              align: "left",
            },
          ].map((c, i) => (
            <article key={c.num} data-reveal style={{
              display: "grid",
              gridTemplateColumns: c.align === "left" ? "7fr 5fr" : "5fr 7fr",
              gap: 64, alignItems: "center",
              padding: "56px 0",
              borderTop: i === 0 ? "1px solid var(--hairline-strong)" : "1px solid var(--hairline)",
            }}>
              {c.align === "right" && (
                <CategoryText c={c} />
              )}
              <div className="ph ar-43">
                <span className="ph-label">Lifestyle · {c.en} · 4:3 · neutral light</span>
              </div>
              {c.align === "left" && (
                <CategoryText c={c} />
              )}
            </article>
          ))}
        </div>
      </section>

      {/* ===== FEATURED COLLECTION ===== */}
      <section data-screen-label="Featured" style={{
        background: "var(--bone-100)",
        borderTop: "1px solid var(--hairline)",
        borderBottom: "1px solid var(--hairline)",
      }} className="section">
        <div className="container">
          <div className="eyebrow" data-reveal>II. წლის ნაჭერი · Piece of the season</div>
          <div style={{
            display: "grid", gridTemplateColumns: "5fr 7fr", gap: 80,
            marginTop: 32, alignItems: "center",
          }}>
            <div data-reveal>
              <h2 className="display-2" style={{ marginBottom: 28 }}>
                <em>ალაზანი —</em><br/>დივანი, თხრობით.
              </h2>
              <p className="body" style={{ marginBottom: 16, fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 300, fontSize: 19, lineHeight: 1.6, color: "var(--ink-700)" }}>
                ცხრა დღე, ერთი ოსტატი, ორმოცდაცხრა შეერთება — ლურსმნის გარეშე.
                ალაზანი 240 სანტიმეტრიანი დივანია, შექმნილი მცირე ოჯახური ოთახის რიტმისთვის.
              </p>
              <p className="body">
                ჩარჩო ნახარშავი მუხისგან, რომელიც ჯავახეთიდან მოგვაქვს. ბალიში — ბუნებრივი ცხვრის ბურზგი
                ბელგიური თეთრეულის შესამოსში, რომელიც გასარეცხია ოცდაათ გრადუსზე.
                შესამოსი მოსახსნელია; ქსოვილი იცვლება. დივანი თქვენთან რჩება.
              </p>
              <div className="annot" style={{ position: "static", display: "inline-block", marginTop: 18 }}>
                Reveal on scroll · 8px slide + fade · 600ms
              </div>
            </div>
            <div className="ph ar-32" data-reveal>
              <span className="ph-label">Featured product · Alazani sofa · 3:2 · single frame</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== RECENT PIECES GRID ===== */}
      <section data-screen-label="Recent" className="section">
        <div className="container">
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "end",
            marginBottom: 48, flexWrap: "wrap", gap: 24,
          }}>
            <div data-reveal>
              <div className="eyebrow">III. ახალი ნაჭრები · Recent works</div>
              <h2 className="display-2" style={{ marginTop: 20 }}>ახლახან <em>დასრულებული.</em></h2>
            </div>
            <a href="#" className="text-link">
              ყველა ნაჭერი <span className="arrow" aria-hidden>→</span>
            </a>
          </div>

          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32,
          }}>
            {RECENT.map((p, i) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== BRAND STORY STRIP ===== */}
      <section data-screen-label="Story" id="story" className="section" style={{
        borderTop: "1px solid var(--hairline)",
      }}>
        <div className="container">
          <div style={{
            display: "grid", gridTemplateColumns: "6fr 6fr", gap: 80,
            alignItems: "start",
          }}>
            <div className="ph ar-45" data-reveal style={{ position: "sticky", top: 110 }}>
              <span className="ph-label">Workshop · master at bench · 4:5</span>
            </div>
            <div data-reveal>
              <div className="eyebrow">IV. სახელოსნო · The workshop</div>
              <h2 className="display-2" style={{ marginTop: 20, marginBottom: 28 }}>
                ნელა.<br/>ცოტას.<br/><em>კარგად.</em>
              </h2>
              <p className="lede" style={{ marginBottom: 24, fontStyle: "italic" }}>
                ჩვენი სახელოსნო თბილისის ნავთლუღში დგას ცამეტი წელია.
                ცხრა ოსტატი, ერთი დურგალი, ორი ქსოვილის მკერავი.
              </p>
              <p className="body" style={{ marginBottom: 16 }}>
                ხეს ვიწერთ ერთეულობით — შერჩეული FSC-სერთიფიცირებული მუხა და
                ევროპული კაკალი. შეერთებები ხელით — mortise &amp; tenon, dovetail, finger joint.
                არცერთი ლურსმანი არ ხვდება ჩარჩოს. ფერდამცავად ვიყენებთ ბუნებრივ ცვილს და
                ზეთს, არა ლაქს.
              </p>
              <p className="body" style={{ marginBottom: 32 }}>
                ყოველ ნაჭერს თან ახლავს დაბადების მოწმობა — ოსტატის სახელი, თარიღი,
                მერქნის წარმომავლობა. გარანტია ჩარჩოზე ათი წელი. რესტავრაცია უწყვეტი.
              </p>
              <a href="#" className="text-link">
                სახელოსნოს ისტორია <span className="arrow" aria-hidden>→</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== VISIT BAND (dark) ===== */}
      <section data-screen-label="Visit" id="visit" style={{
        background: "var(--ink-900)", color: "var(--bone-50)",
      }} className="section">
        <div className="container">
          <div style={{
            display: "grid", gridTemplateColumns: "1.2fr 1fr",
            gap: 80, alignItems: "end",
          }}>
            <div data-reveal>
              <div className="eyebrow" style={{ color: "var(--bone-200)" }}>V. ვიზიტი · Visit</div>
              <h2 className="display-2" style={{ marginTop: 20, color: "var(--bone-50)" }}>
                მობრძანდით,<br/><em>მოხედეთ ხელით.</em>
              </h2>
              <p className="lede" style={{ marginTop: 28, color: "var(--bone-100)", maxWidth: "44ch", fontStyle: "italic" }}>
                ჩვენი სალონი თბილისის ცენტრში, აღმაშენებლის გამზირი 100.
                სახელოსნო ნავთლუღში, წინასწარი შეთანხმებით.
              </p>
            </div>
            <div data-reveal style={{ display: "grid", gap: 28 }}>
              <ContactItem lbl="Showroom · სალონი" val={<>აღმაშენებლის გამზირი 100<br/>თბილისი, 0102</>} />
              <ContactItem lbl="Hours · საათები" val={<>ორშ — პარ · 10:00 — 19:00<br/>შაბ · 11:00 — 17:00 · კვ დახურულია</>} />
              <ContactItem lbl="Reach us · დაგვიკავშირდით" val={
                <>
                  <a href="tel:+995322000000" style={{ borderBottom: "1px solid var(--brass-500)" }}>+995 32 200 00 00</a><br/>
                  <a href="mailto:hello@furnituremodern.ge" style={{ borderBottom: "1px solid var(--brass-500)" }}>hello@furnituremodern.ge</a>
                </>
              } />
              <div style={{ display: "inline-flex", gap: 12, marginTop: 8 }}>
                <a href="#" className="btn btn-primary">დაგეგმეთ ვიზიტი</a>
                <a href="#" className="btn" style={{ borderColor: "var(--bone-50)", color: "var(--bone-50)" }}>WhatsApp</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function CategoryText({ c }) {
  return (
    <div>
      <div className="eyebrow no-rule" style={{ color: "var(--brass-500)", marginBottom: 14, fontFamily: "var(--font-display)", fontStyle: "italic", textTransform: "none", letterSpacing: 0, fontSize: 16, fontWeight: 400 }}>
        — {c.num} —
      </div>
      <h3 className="display-3">{c.ka}</h3>
      <div className="caption" style={{ marginTop: 6, marginBottom: 22, fontStyle: "italic", fontFamily: "var(--font-display)" }}>
        {c.en}
      </div>
      <p className="body" style={{ marginBottom: 28, maxWidth: "42ch" }}>{c.lede}</p>
      <div style={{
        display: "flex", gap: 32, alignItems: "center",
        borderTop: "1px solid var(--hairline)", paddingTop: 18, marginBottom: 24,
        fontSize: 13, color: "var(--ink-500)",
        fontFeatureSettings: "'tnum'",
      }}>
        <span>{c.pieces} ნაჭერი</span>
        <span>·</span>
        <span>From <strong style={{ color: "var(--ink-900)" }}>{c.from}</strong></span>
      </div>
      <a href="#" className="text-link">
        იხილეთ {c.ka.toLowerCase()} <span className="arrow" aria-hidden>→</span>
      </a>
    </div>
  );
}

const RECENT = [
  { id: 1, ka: "სკამი ჩარდახი", en: "Wishbone chair", cat: "Chairs", price: "₾980" },
  { id: 2, ka: "მაგიდა რუსთავი", en: "Round pedestal", cat: "Tables", price: "₾4,260" },
  { id: 3, ka: "კომოდი სვანეთი", en: "Walnut dresser", cat: "Beds", price: "₾3,420" },
  { id: 4, ka: "სკამი ალაზანი", en: "Bar stool · oak", cat: "Chairs", price: "₾640" },
];

function ProductCard({ p }) {
  return (
    <a href="#" data-reveal style={{ display: "block", color: "inherit" }}>
      <div className="ph ar-45" style={{ transition: "background 320ms var(--ease)" }}>
        <span className="ph-label">{p.en} · 4:5</span>
      </div>
      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "baseline" }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: 19, color: "var(--ink-900)", letterSpacing: "-0.01em" }}>
            {p.ka}
          </div>
          <div className="caption" style={{ fontStyle: "italic", fontFamily: "var(--font-display)", marginTop: 2 }}>
            {p.en}
          </div>
        </div>
        <div style={{ fontFamily: "var(--font-body)", fontFeatureSettings: "'tnum'", fontWeight: 500, fontSize: 15, color: "var(--ink-900)" }}>
          {p.price}
        </div>
      </div>
      <div className="caption" style={{ marginTop: 6, fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-500)" }}>
        {p.cat}
      </div>
    </a>
  );
}

function ContactItem({ lbl, val }) {
  return (
    <div>
      <div className="eyebrow no-rule" style={{ color: "var(--bone-200)", marginBottom: 8 }}>{lbl}</div>
      <div className="lede" style={{ color: "var(--bone-50)", fontStyle: "normal" }}>{val}</div>
    </div>
  );
}

Object.assign(window, { HomepageDesktop, ProductCard });
