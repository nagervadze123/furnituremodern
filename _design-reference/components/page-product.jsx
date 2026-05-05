/* Product detail — desktop 1440 + mobile 375. */

function ProductDesktop() {
  return (
    <div data-screen-label="Product Detail" style={{ background: "var(--bone-50)" }}>
      <SiteHeader current="sofas" />

      <div className="container" style={{ paddingTop: 32 }}>
        <nav aria-label="Breadcrumb" data-screen-label="Breadcrumbs" style={{
          fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase",
          color: "var(--ink-500)", fontWeight: 500,
          display: "flex", gap: 14, alignItems: "center",
        }}>
          <a href="#" style={{ color: "inherit" }}>მთავარი</a>
          <span aria-hidden style={{ color: "var(--ink-300)" }}>/</span>
          <a href="#" style={{ color: "inherit" }}>დივნები</a>
          <span aria-hidden style={{ color: "var(--ink-300)" }}>/</span>
          <span style={{ color: "var(--ink-900)" }}>ალაზანი 240</span>
        </nav>
      </div>

      {/* Two-column hero */}
      <section style={{ paddingTop: 32, paddingBottom: 80 }}>
        <div className="container" style={{
          display: "grid", gridTemplateColumns: "60fr 40fr", gap: 64, alignItems: "start",
        }}>
          {/* Gallery left */}
          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 20 }}>
            <div style={{ display: "grid", gap: 12 }}>
              {[1,2,3,4,5].map(i => (
                <button key={i} aria-label={`View image ${i}`} style={{
                  width: 80, height: 100, padding: 0, cursor: "pointer",
                  border: i === 1 ? "1px solid var(--ink-900)" : "1px solid var(--hairline)",
                  background: "var(--bone-200)", position: "relative",
                }}>
                  <span style={{
                    position: "absolute", inset: 0, fontFamily: "var(--font-mono)",
                    fontSize: 9, color: "var(--ink-500)", letterSpacing: "0.12em",
                    display: "grid", placeItems: "center",
                  }}>0{i}</span>
                </button>
              ))}
            </div>
            <div data-reveal className="ph" style={{ aspectRatio: "4 / 5" }}>
              <span className="ph-label">Primary product photo · neutral light · 4:5</span>
            </div>
          </div>

          {/* Info right (sticky) */}
          <div style={{ position: "sticky", top: 110 }}>
            <div className="eyebrow no-rule" style={{ color: "var(--brass-500)", marginBottom: 16 }}>
              <a href="#" style={{ color: "inherit", borderBottom: "1px solid var(--brass-500)", paddingBottom: 2 }}>დივნები · Sofas</a>
            </div>
            <h1 className="display-1" style={{ marginBottom: 8, fontSize: "clamp(2.4rem, 4vw, 3.5rem)" }}>
              ალაზანი
            </h1>
            <p style={{
              fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 300,
              fontSize: 18, color: "var(--ink-500)", margin: 0, marginBottom: 28,
            }}>
              Alazani — N°SF-240 · 240 × 95 × 86 cm
            </p>
            <span className="annot" style={{ position: "static", display: "inline-block", marginBottom: 24 }}>H1 · single per page</span>

            <div style={{
              display: "flex", alignItems: "baseline", gap: 16,
              borderTop: "1px solid var(--hairline)",
              borderBottom: "1px solid var(--hairline)",
              padding: "20px 0", marginBottom: 28,
            }}>
              <div style={{
                fontFamily: "var(--font-display)", fontWeight: 400,
                fontSize: 36, letterSpacing: "-0.02em",
                fontFeatureSettings: "'tnum'",
              }}>₾7,420</div>
              <div className="caption" style={{ color: "var(--ink-500)" }}>
                GEL · დღგ-ით
              </div>
            </div>

            <p className="body" style={{ marginBottom: 28 }}>
              240 სანტიმეტრიანი დივანი ნახარშავი მუხის ჩარჩოზე. ბუნებრივი
              ცხვრის ბურზგის ბალიში, ბელგიური თეთრეულის მოსახსნელ შესამოსში.
              ცხრა დღე, ერთი ოსტატი — ლურსმნის გარეშე.
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <span aria-hidden style={{
                width: 8, height: 8, borderRadius: "50%", background: "var(--sage-500)",
              }} />
              <span className="caption" style={{ color: "var(--ink-700)" }}>
                ხელმისაწვდომია · 4–6 კვირაში დამზადდება
              </span>
            </div>

            <div style={{ display: "grid", gap: 10, marginBottom: 32 }}>
              <a href="#" className="btn btn-primary" style={{ justifyContent: "center", padding: "18px 24px" }}>
                შეკვეთის კონსულტაცია · Contact for purchase
              </a>
              <a href="#" className="btn btn-ghost" style={{ justifyContent: "center", padding: "16px 24px" }}>
                WhatsApp ოსტატთან
              </a>
            </div>

            {/* specs */}
            <div>
              <div className="eyebrow" style={{ marginBottom: 18 }}>Specifications · სპეციფიკაცია</div>
              <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 0, borderTop: "1px solid var(--hairline)" }}>
                {[
                  ["ზომები · Dimensions", "240 × 95 × 86 cm"],
                  ["წონა · Weight", "62 kg"],
                  ["მასალა · Frame", "ნახარშავი მუხა · steamed oak"],
                  ["შესამოსი · Cover", "ბელგიური თეთრეული · linen, removable"],
                  ["ფერი · Colour", "ნუგატი · nougat cream"],
                  ["ბალიში · Cushion", "ცხვრის ბურზგი · natural wool"],
                  ["შეერთება · Joinery", "Mortise & tenon, no nails"],
                  ["წარმოება · Made", "9 days · Tbilisi atelier"],
                ].map(([k, v], i) => (
                  <React.Fragment key={k}>
                    <dt style={{
                      padding: "14px 0", borderBottom: "1px solid var(--hairline)",
                      fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase",
                      color: "var(--ink-500)", fontWeight: 500,
                    }}>{k}</dt>
                    <dd style={{
                      padding: "14px 0", borderBottom: "1px solid var(--hairline)",
                      margin: 0, fontSize: 14, color: "var(--ink-900)",
                      fontFamily: "var(--font-display)",
                    }}>{v}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* Long-form description */}
      <section data-screen-label="Description" style={{
        background: "var(--bone-100)", borderTop: "1px solid var(--hairline)",
      }} className="section">
        <div className="container" style={{
          display: "grid", gridTemplateColumns: "1fr 2fr", gap: 80,
        }}>
          <div data-reveal>
            <div className="eyebrow">II — ისტორია · The making</div>
            <h2 className="display-3" style={{ marginTop: 18 }}>
              ცხრა დღე, <em>ერთი ოსტატი.</em>
            </h2>
          </div>
          <div data-reveal style={{ maxWidth: "65ch" }}>
            <p className="body" style={{ marginBottom: 18 }}>
              ალაზანი მუხის ხის ჩარჩოზე დგას. მერქანი ჯავახეთიდან მოგვაქვს —
              ხუთი წლის ნელ-ნელა გაშრობის შემდეგ. შემდეგ ორი დღე ჩარშვილ
              ფურნელში ნახარშია, რათა ფერი და სინათლე ერთგვაროვანი იყოს.
            </p>
            <p className="body" style={{ marginBottom: 18 }}>
              შეერთებები ხელით — mortise &amp; tenon, ცხრა ცალკე გრძელი ხამიხატი.
              არცერთი ლურსმანი არ ხვდება ჩარჩოს. ამის გამო ალაზანი ცხოვრობს
              ოცდაათ წელს და მერე კიდევ ცამეტს, რესტავრაციის შემდეგ.
            </p>
            <p className="body" style={{ marginBottom: 18 }}>
              ფუძე — რვა-მხრივ ხელით შეკრული ფოლადის ზამბარები. ბალიში —
              ბუნებრივი ცხვრის ბურზგი, რომელიც წლების მანძილზე ფორმას ინახავს
              და ცხელ ღამეს გრილდება. შესამოსი ბელგიური თეთრეული, გასარეცხია
              ოცდაათ გრადუსზე და მოსახსნელია; ქსოვილი იცვლება, დივანი თქვენთან
              რჩება.
            </p>
            <p className="body" style={{ marginBottom: 18, fontStyle: "italic", color: "var(--ink-700)", fontFamily: "var(--font-display)", fontWeight: 300, fontSize: 19 }}>
              ალაზანი არ არის ძვირი დივანი. ის არის ერთადერთი დივანი — ის,
              რომელიც აღარასოდეს დაგჭირდება შეცვლა.
            </p>
            <div style={{
              marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--hairline-strong)",
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24,
            }}>
              {[
                ["Master · ოსტატი", "თემური ბერიძე"],
                ["Built · დასრულდა", "12 ოქტომბერი 2026"],
                ["Serial · სერია", "N°SF-240 / 06"],
              ].map(([k,v]) => (
                <div key={k}>
                  <div className="eyebrow no-rule" style={{ color: "var(--ink-500)", marginBottom: 6 }}>{k}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--ink-900)" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Related */}
      <section className="section">
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 40 }}>
            <div>
              <div className="eyebrow">III — მსგავსი · From the same hands</div>
              <h2 className="display-3" style={{ marginTop: 16 }}>სხვა <em>დივნები</em>.</h2>
            </div>
            <a href="#" className="text-link">All sofas <span aria-hidden>→</span></a>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 32 }}>
            {[
              { ka: "ყაზბეგი", en: "Kazbegi · 220cm", price: "₾6,180" },
              { ka: "იმერეთი", en: "Imereti · 3-seat", price: "₾5,940" },
              { ka: "მთიული", en: "Mtiuli · 2-seat", price: "₾4,860" },
              { ka: "მუხრანი", en: "Mukhrani · L", price: "₾9,820" },
            ].map(p => (
              <a key={p.en} href="#" style={{ color: "inherit" }}>
                <div className="ph ar-45"><span className="ph-label">{p.en}</span></div>
                <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>{p.ka}</div>
                    <div className="caption" style={{ fontStyle: "italic", fontFamily: "var(--font-display)" }}>{p.en}</div>
                  </div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{p.price}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Browse category CTA */}
      <section style={{ background: "var(--bone-200)", padding: "80px 0", textAlign: "center" }}>
        <div className="container">
          <div className="eyebrow no-rule" style={{ justifyContent: "center", color: "var(--ink-500)", marginBottom: 18 }}>Continue browsing</div>
          <h2 className="display-2" style={{ marginBottom: 28 }}>
            იხილეთ <em>ყველა დივანი</em>.
          </h2>
          <a href="#" className="btn">12 ნაჭერი — დივნები <span aria-hidden>→</span></a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function ProductMobile() {
  return (
    <div data-screen-label="Product Mobile" style={{ background: "var(--bone-50)" }}>
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(250,247,242,0.92)",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid var(--hairline)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "12px 18px",
      }}>
        <button aria-label="Back" style={{ background: "transparent", border: 0, fontSize: 18, cursor: "pointer", color: "var(--ink-900)" }}>←</button>
        <span style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-700)", fontWeight: 500 }}>Sofa · ალაზანი</span>
        <button aria-label="Menu" style={{ background: "transparent", border: 0, color: "var(--ink-900)", cursor: "pointer" }}>
          <svg width="14" height="10" viewBox="0 0 14 10" fill="none"><path d="M0 1h14M0 5h14M0 9h14" stroke="currentColor" /></svg>
        </button>
      </header>

      <nav aria-label="Breadcrumb" style={{ padding: "14px 20px", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-500)" }}>
        <a href="#" style={{ color: "inherit" }}>დივნები</a> <span style={{ color: "var(--ink-300)" }}>/</span> <span style={{ color: "var(--ink-900)" }}>ალაზანი</span>
      </nav>

      {/* Swipeable gallery */}
      <div style={{ position: "relative" }}>
        <div className="ph" style={{ aspectRatio: "4 / 5" }}>
          <span className="ph-label">Primary photo · 4:5</span>
        </div>
        <div style={{
          position: "absolute", bottom: 16, left: 0, right: 0,
          display: "flex", justifyContent: "center", gap: 8,
        }}>
          {[1,2,3,4,5].map(i => (
            <span key={i} style={{
              width: i === 1 ? 18 : 6, height: 6, borderRadius: 3,
              background: i === 1 ? "var(--ink-900)" : "rgba(28,24,22,0.3)",
            }} />
          ))}
        </div>
      </div>

      <section style={{ padding: "32px 20px" }}>
        <div className="eyebrow no-rule" style={{ color: "var(--brass-500)", marginBottom: 12 }}>დივნები</div>
        <h1 className="display-1" style={{ fontSize: "2.4rem", marginBottom: 6 }}>ალაზანი</h1>
        <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", color: "var(--ink-500)", marginTop: 0, fontSize: 14 }}>
          Alazani · N°SF-240 · 240 × 95 × 86 cm
        </p>

        <div style={{
          marginTop: 24, padding: "16px 0",
          borderTop: "1px solid var(--hairline)", borderBottom: "1px solid var(--hairline)",
          display: "flex", alignItems: "baseline", gap: 14,
        }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: "-0.02em" }}>₾7,420</div>
          <div style={{ fontSize: 11, color: "var(--ink-500)", letterSpacing: "0.16em", textTransform: "uppercase" }}>GEL · დღგ-ით</div>
        </div>

        <p className="body" style={{ marginTop: 24, fontSize: 15 }}>
          240 სანტიმეტრიანი დივანი ნახარშავი მუხის ჩარჩოზე. ცხრა დღე, ერთი ოსტატი —
          ლურსმნის გარეშე.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--sage-500)" }} />
          <span style={{ fontSize: 13, color: "var(--ink-700)" }}>ხელმისაწვდომია · 4–6 კვირაში</span>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 24 }}>
          <a href="#" className="btn btn-primary" style={{ justifyContent: "center" }}>შეკვეთის კონსულტაცია</a>
          <a href="#" className="btn btn-ghost" style={{ justifyContent: "center" }}>WhatsApp</a>
        </div>

        {/* Specs */}
        <div style={{ marginTop: 36 }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Specifications</div>
          <dl style={{ margin: 0, borderTop: "1px solid var(--hairline)" }}>
            {[
              ["ზომები","240 × 95 × 86 cm"],
              ["მასალა","ნახარშავი მუხა"],
              ["შესამოსი","ბელგიური თეთრეული"],
              ["ფერი","ნუგატი"],
              ["შეერთება","Mortise & tenon"],
            ].map(([k,v]) => (
              <div key={k} style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--hairline)" }}>
                <dt style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-500)" }}>{k}</dt>
                <dd style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 14 }}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}

Object.assign(window, { ProductDesktop, ProductMobile });
