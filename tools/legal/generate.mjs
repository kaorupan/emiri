/*
 * 運営者情報・プライバシーポリシー・お問い合わせ・特定商取引法に基づく表記のページを作る
 *
 *   node tools/legal/generate.mjs
 *
 * お問い合わせフォーム（Googleフォーム）のURLは site.config.json の contactFormUrl。空ならフォームのボタンは出さない。
 * 文面を変えたら、このファイルの「制定日・改定日」も更新する。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const config = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));
const FORM = (config.contactFormUrl || "").trim();
const REVISED = "2026年10月14日";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const TEMPLATE = fs.readFileSync(path.join(ROOT, "learn/suhijutsu/index.html"), "utf8");
function head(rel, title, desc) {
  return TEMPLATE.slice(0, TEMPLATE.indexOf("<main"))
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${esc(desc)}">`)
    .replace(/https:\/\/emiri-uranai\.com\/learn\/suhijutsu\//g, `https://emiri-uranai.com/${rel}`)
    .replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${esc(title)}">`)
    .replace(/<meta property="og:description" content=".*?">/, `<meta property="og:description" content="${esc(desc)}">`)
    .replace('<li><a href="../../learn/" aria-current="page">占いを知る</a></li>', '<li><a href="../../learn/">占いを知る</a></li>')
    .replace(/"\.\.\/\.\.\//g, '"../');
}
const FOOT = TEMPLATE.slice(TEMPLATE.indexOf("<footer")).replace(/"\.\.\/\.\.\//g, '"../');

function page(slug, title, desc, crumb, body) {
  const html = head(`${slug}/`, title, desc) + `<main id="main" class="wrap-narrow">
  <nav class="breadcrumb" aria-label="パンくずリスト">
    <ol>
      <li><a href="../">えみり</a></li>
      <li aria-current="page">${esc(crumb)}</li>
    </ol>
  </nav>

${body}
</main>

` + FOOT;
  const dir = path.join(ROOT, slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
}

const contactLink = FORM
  ? `<p class="learn-actions"><a class="btn" href="${esc(FORM)}" target="_blank" rel="noopener" style="max-width:320px">お問い合わせフォームを開く</a></p>
    <p class="kyusei-meta">Googleフォームが別のタブで開きます。</p>`
  : `<p class="notice">お問い合わせフォームは準備中です。公開まで、もうしばらくお待ちください。</p>`;

page("about", "運営者情報｜えみり", "無料占いサイト「えみり」の運営者情報と、サイトの方針（計算方法・文章・個人情報の扱い）です。", "運営者情報", `  <section class="hero">
    <p class="eyebrow">ABOUT</p>
    <h1>運営者情報</h1>
  </section>

  <section class="card prose" aria-labelledby="about-info">
    <h2 id="about-info">サイトについて</h2>
    <dl class="legal-table">
      <div><dt>サイト名</dt><dd>えみり</dd></div>
      <div><dt>URL</dt><dd>${esc(config.baseUrl)}/</dd></div>
      <div><dt>運営</dt><dd>えみり（個人運営）</dd></div>
      <div><dt>内容</dt><dd>無料占い（数秘術・九星気学・四柱推命・マヤ暦・宿曜占星術・西洋占星術・インド占星術・紫微斗数・姓名判断・タロットほか）、今日の運勢、夢占い辞典、手相、吉方位、占いの解説。本格占い（有料の鑑定書）。</dd></div>
      <div><dt>お問い合わせ</dt><dd><a href="../contact/">お問い合わせページ</a>から受け付けています。</dd></div>
    </dl>
  </section>

  <section class="card prose" aria-labelledby="about-policy">
    <h2 id="about-policy">えみりの方針</h2>
    <ul>
      <li><strong>正確な計算</strong>：九星気学・四柱推命は立春や節入りの時刻で、西洋占星術・インド占星術は天文計算で星の位置を求めています。公開されている暦や天文データと照らし合わせるテストを続けています。</li>
      <li><strong>流派の違いを明記</strong>：占術には流派による違いがあります。えみりが採用している方法は、各ページの「計算について」に書いています。</li>
      <li><strong>文章について</strong>：鑑定文は、各占術の一般的な意味をもとに用意した、えみりのオリジナルの文章です。占いの結果を表示するときに、AIがその場で文章を生成することはありません。</li>
      <li><strong>入力した情報</strong>：無料占いで入力した生年月日やお名前は、サーバーに送信しません。くわしくは<a href="../privacy/">プライバシーポリシー</a>をご覧ください。</li>
      <li><strong>占いとの付き合い方</strong>：占いの結果は、自己理解やエンターテインメントとしてお楽しみください。医療・法律・お金などの大切な判断を占いだけで決めないでください。</li>
    </ul>
  </section>
`);

page("privacy", "プライバシーポリシー｜えみり", "無料占いサイト「えみり」のプライバシーポリシー。入力した情報の扱い、Cookie、広告配信（Google アドセンス）、アクセス解析、本格占いの購入時の情報について説明します。", "プライバシーポリシー", `  <section class="hero">
    <p class="eyebrow">PRIVACY POLICY</p>
    <h1>プライバシーポリシー</h1>
    <p>えみり（以下「当サイト」）は、利用者の個人情報を大切に扱います。当サイトでの情報の扱いを、次のとおり定めます。</p>
  </section>

  <section class="card prose">
    <h2>1. 無料占いで入力した情報</h2>
    <p>無料占いで入力した生年月日・出生時刻・お名前などは、お使いの端末（ブラウザ）の中だけで計算に使い、当サイトのサーバーには送信しません。「この端末に生年月日を保存する」を選んだ場合に限り、お使いのブラウザ内（ローカルストレージ）に保存します。保存した情報は、各ページの「保存した生年月日を消す」から、いつでも削除できます。</p>

    <h2>2. 本格占い（有料）の購入時の情報</h2>
    <p>本格占いの購入時には、呼び名・生年月日、任意で出生時刻・姓名・相性のお相手の情報をお預かりします。お支払いの画面では、決済サービス（Stripe）がメールアドレスとカード情報をお預かりします。これらは、鑑定書の作成・お届け・購入に関するご連絡のためだけに使います。入力内容は、決済サービス（Stripe, Inc.）の注文情報として保存され、鑑定書のページを開くときに読み出します。お支払いは決済サービスが処理し、当サイトがクレジットカード番号を受け取ったり保存したりすることはありません。</p>

    <h2>3. Cookie（クッキー）について</h2>
    <p>当サイトでは、広告の配信やアクセス解析のために、Cookieを使用することがあります。Cookieには、お名前・住所・電話番号など、個人を特定できる情報は含まれません。ブラウザの設定でCookieを無効にすることもできます。</p>

    <h2>4. 広告の配信について</h2>
    <p>当サイトは、第三者配信の広告サービス「Google アドセンス」を利用することがあります。Google などの第三者配信事業者は、Cookie を使用して、利用者が当サイトや他のウェブサイトに過去にアクセスした際の情報にもとづいて広告を配信します。</p>
    <p>Google が広告 Cookie を使用することにより、利用者が当サイトや他のサイトにアクセスした際の情報にもとづいて、Google やそのパートナーが適切な広告を表示できます。利用者は、<a href="https://adssettings.google.com/" target="_blank" rel="noopener">Google の広告設定</a>で、パーソナライズ広告を無効にできます。また、<a href="https://www.aboutads.info/" target="_blank" rel="noopener">www.aboutads.info</a> にアクセスすると、第三者配信事業者の Cookie を無効にできます。Google による情報の扱いは、<a href="https://policies.google.com/technologies/ads?hl=ja" target="_blank" rel="noopener">Google の広告に関するポリシー</a>をご覧ください。</p>

    <h2>5. アクセス解析について</h2>
    <p>当サイトは、サイトの改善のために、Google アナリティクスなどのアクセス解析ツールを利用することがあります。アクセス解析ツールは Cookie を使ってトラフィックデータを収集しますが、個人を特定する情報は含まれません。くわしくは<a href="https://policies.google.com/technologies/partner-sites?hl=ja" target="_blank" rel="noopener">Google のポリシーと規約</a>をご覧ください。</p>

    <h2>6. 第三者への提供</h2>
    <p>当サイトは、法令にもとづく場合を除き、お預かりした個人情報を本人の同意なく第三者に提供しません。</p>

    <h2>7. お問い合わせで受け取った情報</h2>
    <p>お問い合わせでいただいたお名前・メールアドレス・内容は、お問い合わせへの回答のためだけに使います。</p>

    <h2>8. 免責事項</h2>
    <p>当サイトの占いの結果や情報は、自己理解やエンターテインメントのためのものです。内容の正確さには努めていますが、その利用によって生じた損害について、当サイトは責任を負いかねます。当サイトからリンクしている外部サイトの内容についても、責任を負いかねます。</p>

    <h2>9. 著作権</h2>
    <p>当サイトの文章・図・デザインの著作権は、当サイトに帰属します。無断での転載・複製はご遠慮ください。</p>

    <h2>10. このポリシーの変更</h2>
    <p>このポリシーは、必要に応じて変更することがあります。変更後の内容は、このページに掲載した時点から効力を持ちます。</p>

    <h2>11. お問い合わせ窓口</h2>
    <p>個人情報の扱いについてのお問い合わせは、<a href="../contact/">お問い合わせページ</a>からご連絡ください。</p>

    <p class="kyusei-meta">制定日・改定日：${REVISED}<br>運営：えみり</p>
  </section>
`);

page("contact", "お問い合わせ｜えみり", "無料占いサイト「えみり」へのお問い合わせ窓口です。サイトの内容、本格占い、不具合のご報告などを受け付けています。", "お問い合わせ", `  <section class="hero">
    <p class="eyebrow">CONTACT</p>
    <h1>お問い合わせ</h1>
    <p>サイトの内容についてのご質問、本格占いについて、表示の不具合のご報告などは、下のフォームからお送りください。</p>
  </section>

  <section class="card prose" aria-labelledby="contact-form">
    <h2 id="contact-form">お問い合わせフォーム</h2>
    ${contactLink}
    <ul>
      <li>ご返信までに数日いただくことがあります。</li>
      <li>個別の占いのご依頼や、占いの結果についての個人的なご相談にはお答えできません。</li>
      <li>不具合のご報告は、お使いの機種・ブラウザと、表示されたページを書いていただけると助かります。</li>
      <li>いただいた情報は、<a href="../privacy/">プライバシーポリシー</a>にもとづいて、お問い合わせへの回答のためだけに使います。</li>
    </ul>
  </section>
`);

page("tokushoho", "特定商取引法に基づく表記｜えみり", "無料占いサイト「えみり」の本格占い（有料の鑑定書）についての、特定商取引法に基づく表記です。", "特定商取引法に基づく表記", `  <section class="hero">
    <p class="eyebrow">LEGAL</p>
    <h1>特定商取引法に基づく表記</h1>
    <p>本格占い（有料の鑑定書）についての表記です。本格占いは現在、販売開始に向けて準備中です。</p>
  </section>

  <section class="card prose">
    <dl class="legal-table">
      <div><dt>販売事業者</dt><dd>えみり（個人事業）</dd></div>
      <div><dt>運営責任者</dt><dd>請求があった場合には、遅滞なく開示いたします。</dd></div>
      <div><dt>所在地</dt><dd>請求があった場合には、遅滞なく開示いたします。</dd></div>
      <div><dt>電話番号</dt><dd>請求があった場合には、遅滞なく開示いたします。</dd></div>
      <div><dt>お問い合わせ</dt><dd><a href="../contact/">お問い合わせページ</a>のフォームから受け付けています。ご請求いただいた開示事項は、メールでお知らせします。</dd></div>
      <div><dt>販売価格</dt><dd>総合鑑定書：1,980円（税込）<br>追加の相性鑑定：お相手1人につき 980円（税込）</dd></div>
      <div><dt>商品代金以外の必要料金</dt><dd>サイトの閲覧・ダウンロードにかかるインターネット通信料は、お客様のご負担となります。</dd></div>
      <div><dt>お支払い方法</dt><dd>クレジットカード（決済サービス Stripe を利用します）</dd></div>
      <div><dt>お支払い時期</dt><dd>ご注文時にお支払いが確定します。</dd></div>
      <div><dt>商品の引き渡し時期</dt><dd>お支払いの完了後、すぐに鑑定書のページをご覧いただけます（PDFで保存できます）。</dd></div>
      <div><dt>返品・キャンセル</dt><dd>デジタルコンテンツの性質上、お支払い後の返品・キャンセルはお受けできません。鑑定書が表示されないなど、当方の不具合でご覧いただけない場合は、お問い合わせください。確認のうえ、再送または返金で対応します。</dd></div>
      <div><dt>動作環境</dt><dd>最新版の Google Chrome・Safari・Microsoft Edge・Firefox（パソコン・スマートフォン）</dd></div>
    </dl>
    <p class="kyusei-meta">改定日：${REVISED}</p>
  </section>
`);

console.log(`legal: about / privacy / contact / tokushoho（フォーム：${FORM ? "あり" : "未設定"}）`);
