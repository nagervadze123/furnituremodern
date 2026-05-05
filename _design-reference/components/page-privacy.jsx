/* Privacy policy — long-form prose, max-width 65ch. */
function PrivacyPage() {
  return (
    <div data-screen-label="Privacy Policy" style={{ background: "var(--bone-50)" }}>
      <SiteHeader />

      <div className="container" style={{ paddingTop: 40 }}>
        <nav aria-label="Breadcrumb" style={{
          fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase",
          color: "var(--ink-500)", fontWeight: 500, display: "flex", gap: 14,
        }}>
          <a href="#" style={{ color: "inherit" }}>მთავარი</a>
          <span style={{ color: "var(--ink-300)" }}>/</span>
          <span style={{ color: "var(--ink-900)" }}>Privacy</span>
        </nav>
      </div>

      <article className="section" style={{ paddingTop: 56 }}>
        <div className="container" style={{ maxWidth: "65ch", marginInline: "auto" }}>
          <div className="eyebrow">Legal · კონფიდენციალურობა</div>
          <h1 className="display-1" style={{ marginTop: 24, marginBottom: 28 }}>
            კონფიდენციალურობის <em>პოლიტიკა</em>.
          </h1>
          <p className="lede" style={{ fontStyle: "italic", marginBottom: 12 }}>
            ბოლო განახლება: 1 ნოემბერი 2026 · Furnituremodern Ltd., თბილისი.
          </p>
          <span className="annot" style={{ position: "static", display: "inline-block", marginBottom: 32 }}>H1 · single per page</span>

          <hr className="divider" style={{ margin: "32px 0" }} />

          {[
            {
              eb: "I — შესავალი",
              h: "ვინ ვართ ჩვენ და რას ვაკეთებთ თქვენი მონაცემებით.",
              p: [
                "ეს დოკუმენტი აღწერს, თუ როგორ ვაგროვებთ, ვიყენებთ და ვინახავთ თქვენს პერსონალურ მონაცემებს. ჩვენ — Furnituremodern შპს — დარეგისტრირებული ვართ საქართველოში, საიდენტიფიკაციო ნომრით 405123456.",
                "ვიცავთ საქართველოს კანონს „პერსონალურ მონაცემთა დაცვის შესახებ\u201C და, საჭიროების შემთხვევაში, ევროკავშირის GDPR-ს.",
              ],
            },
            {
              eb: "II — რას ვაგროვებთ",
              h: "მონაცემები, რომელსაც ვამუშავებთ.",
              p: [
                "თქვენი ვიზიტისას ვიწერთ: ანონიმური გვერდის დათვალიერების სტატისტიკა, მოწყობილობის ტიპი, ენის არჩევანი. ეს ანონიმურია — ვერ გიცნობთ.",
                "თუ შეკვეთის ფორმას შეავსებთ, ვინახავთ თქვენს სახელს, ელფოსტას, ტელეფონის ნომერს და მისამართს — მხოლოდ თქვენი შეკვეთის შესასრულებლად.",
              ],
            },
            {
              eb: "III — ქუქი-ფაილები",
              h: "Cookies — წინასწარ ვითხოვთ თანხმობას.",
              p: [
                "აუცილებელი ქუქი-ფაილები (ენის არჩევანი, კალათა) ყოველთვის გააქტიურებულია — მათ გარეშე საიტი არ მუშაობს.",
                "ანალიტიკური ქუქი-ფაილები (Plausible Analytics, ანონიმური) მხოლოდ თქვენი თანხმობის შემდეგ ჩაირთვება. შეგიძლიათ უარი თქვათ ნებისმიერ დროს.",
              ],
            },
            {
              eb: "IV — თქვენი უფლებები",
              h: "მონაცემები თქვენია.",
              p: [
                "ნებისმიერ დროს შეგიძლიათ მოგვწეროთ hello@furnituremodern.ge და მოითხოვოთ თქვენი მონაცემების ნახვა, შესწორება ან წაშლა. ვპასუხობთ ხუთი სამუშაო დღის განმავლობაში.",
                "თუ ფიქრობთ, რომ თქვენი უფლებები ირღვევა, მიმართეთ პერსონალურ მონაცემთა დაცვის სამსახურს.",
              ],
            },
            {
              eb: "V — კონტაქტი",
              h: "გაქვთ შეკითხვა?",
              p: [
                "მოგვწერეთ hello@furnituremodern.ge, ან დაგვირეკეთ +995 32 200 00 00. პასუხი ერთ სამუშაო დღეში.",
              ],
            },
          ].map(s => (
            <section key={s.eb} style={{ marginBottom: 56 }}>
              <div className="eyebrow" style={{ marginBottom: 14 }}>{s.eb}</div>
              <h2 className="display-3" style={{ marginBottom: 20, fontSize: "1.6rem" }}>{s.h}</h2>
              {s.p.map((para, i) => (
                <p key={i} className="body" style={{ marginBottom: 14 }}>{para}</p>
              ))}
            </section>
          ))}

          <hr className="divider divider-strong" style={{ margin: "48px 0 24px" }} />
          <p className="caption" style={{ fontStyle: "italic", fontFamily: "var(--font-display)", fontSize: 14 }}>
            Furnituremodern Ltd., აღმაშენებლის გამზირი 100, თბილისი 0102, საქართველო · ID 405123456
          </p>
        </div>
      </article>

      <SiteFooter />
    </div>
  );
}

Object.assign(window, { PrivacyPage });
