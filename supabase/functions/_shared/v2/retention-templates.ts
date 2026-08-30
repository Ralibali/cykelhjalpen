// V2 workshop-retention — svenska mejlmallar. Rena funktioner (testbara).
// Tonen matchar _shared/outreach.ts och nudge-workshops: personlig, kort,
// tydlig CTA, varumärkesfärg #4338CA. Wrappern (header/footer) läggs på
// centralt av send-transactional-email → renderBrandedEmail.

import type {
  DigestRequestItem,
  DigestSummary,
  PerformanceStats,
  ProfileCompleteness,
} from './retention.ts'

const BRAND = '#4338CA'
const SITE = 'https://cykelhjalpen.se'
const DASHBOARD_URL = `${SITE}/dashboard/verkstad`
const REQUESTS_URL = `${SITE}/dashboard/verkstad/arenden`
const SETTINGS_URL = `${SITE}/dashboard/verkstad/installningar`

export const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const button = (href: string, label: string): string =>
  `<p style="margin-top:24px"><a href="${href}" style="display:inline-block;background:${BRAND};color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none">${escapeHtml(label)}</a></p>`

const unsubscribeFooter = (unsubscribeUrl: string): string =>
  `<p style="margin-top:24px;font-size:13px;color:#6B7280">Vill du inte få den här typen av mejl? <a href="${escapeHtml(unsubscribeUrl)}" style="color:#6B7280">Avregistrera dig här</a>.</p>`

export interface TemplateContext {
  companyName: string
  city: string
  unsubscribeUrl: string
}

export interface EmailTemplate {
  subject: string
  html: string
}

// 1. Dormant-reaktivering (3 steg, eskalerande)
export function buildReactivationEmail(step: number, ctx: TemplateContext, idleDays: number): EmailTemplate {
  const company = escapeHtml(ctx.companyName)
  const city = escapeHtml(ctx.city)
  if (step <= 1) {
    return {
      subject: `Vi saknar er i ${ctx.city} – nya cykelärenden väntar`,
      html: `
        <h2 style="margin:0 0 16px">Hej ${company}!</h2>
        <p>Det har gått över ${idleDays} dagar sedan ni lämnade en offert, och under tiden har nya kunder i ${city} lagt upp ärenden på Cykelhjälpen.</p>
        <p>Att lämna offert är gratis – ni betalar bara (50 kr exkl. moms) om kunden väljer er.</p>
        ${button(REQUESTS_URL, 'Se öppna ärenden')}
        ${unsubscribeFooter(ctx.unsubscribeUrl)}
      `,
    }
  }
  if (step === 2) {
    return {
      subject: 'En minut räcker för att vara med igen',
      html: `
        <h2 style="margin:0 0 16px">Hej ${company}!</h2>
        <p>Vi märkte att ni inte varit inne på ärendestavlan på ett tag. Verkstäder som svarar inom de första timmarna vinner fler jobb – och just nu finns det kunder i ${city} som väntar på offerter.</p>
        <p>Logga in, lämna en offert och låt kunderna komma till er.</p>
        ${button(REQUESTS_URL, 'Till ärendestavlan')}
        ${unsubscribeFooter(ctx.unsubscribeUrl)}
      `,
    }
  }
  return {
    subject: 'Sista påminnelsen – ska vi hålla er plats öppen?',
    html: `
      <h2 style="margin:0 0 16px">Hej ${company}!</h2>
      <p>Det här är vår sista påminnelse ett tag. Finns det något som inte fungerat – för få ärenden, fel område, något annat? Svara direkt på det här mejlet så lyssnar vi.</p>
      <p>Annars finns era uppgifter kvar och ni kan när som helst fortsätta lämna offerter i ${city}.</p>
      ${button(REQUESTS_URL, 'Fortsätt lämna offerter')}
      ${unsubscribeFooter(ctx.unsubscribeUrl)}
    `,
  }
}

// 2. Veckodigest: nya ärenden i verkstadens område (skip-empty hanteras av anroparen)
export function buildDigestEmail(
  ctx: TemplateContext,
  summary: DigestSummary,
  items: readonly DigestRequestItem[],
  weekKey: string,
): EmailTemplate {
  const rows = items.slice(0, 5).map((item) => `
    <tr>
      <td style="padding:6px 12px 6px 0;color:#555">${escapeHtml(item.repair_category)}</td>
      <td style="padding:6px 12px 6px 0">${escapeHtml(item.bike_type)}</td>
      <td style="padding:6px 0;color:#555">${escapeHtml(item.area ?? ctx.city)}</td>
    </tr>`).join('')
  const categoryLine = summary.categories
    .map((c) => `${escapeHtml(c.category)} (${c.count})`)
    .join(' · ')
  return {
    subject: `Nya ärenden i ${ctx.city} denna vecka (${summary.total})`,
    html: `
      <h2 style="margin:0 0 16px">Vecka ${escapeHtml(weekKey.split('-W')[1] ?? weekKey)} i ${escapeHtml(ctx.city)}: ${summary.total} nya ärenden</h2>
      <p>Hej ${escapeHtml(ctx.companyName)}! Här är veckans efterfrågan i ert område: ${categoryLine}.</p>
      <table style="border-collapse:collapse;margin:16px 0">${rows}</table>
      ${summary.total > 5 ? `<p style="color:#555">…och ${summary.total - 5} till på ärendestavlan.</p>` : ''}
      <p>Att lämna offert är gratis – ni betalar bara om kunden väljer er.</p>
      ${button(REQUESTS_URL, 'Öppna ärendestavlan')}
      ${unsubscribeFooter(ctx.unsubscribeUrl)}
    `,
  }
}

// 3. Säsong: vår-reaktivering (feb–mars, förra säsongens verkstäder)
export function buildSeasonalEmail(ctx: TemplateContext): EmailTemplate {
  return {
    subject: 'Cykelvåren närmar sig – dags att plocka fram verktygen',
    html: `
      <h2 style="margin:0 0 16px">Hej ${escapeHtml(ctx.companyName)}!</h2>
      <p>Om några veckor börjar cykelsäsongen på allvar och efterfrågan på service och reparationer rusar. Förra säsongen lämnade ni offerter via Cykelhjälpen – vi hoppas ni vill vara med i år också.</p>
      <p>Verkstäder som är aktiva när säsongen startar får flest jobb. Kontrollera gärna att er profil och ert serviceområde i ${escapeHtml(ctx.city)} är uppdaterade, så ni syns direkt när kunderna kommer.</p>
      ${button(SETTINGS_URL, 'Uppdatera er profil')}
      <p style="margin-top:16px">Ärendena finns som vanligt på <a href="${REQUESTS_URL}" style="color:${BRAND}">ärendestavlan</a>.</p>
      ${unsubscribeFooter(ctx.unsubscribeUrl)}
    `,
  }
}

// 4. Månadssammanfattning
export function buildPerformanceEmail(ctx: TemplateContext, monthKey: string, stats: PerformanceStats): EmailTemplate {
  const monthNames = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december']
  const monthIndex = Number(monthKey.split('-')[1]) - 1
  const monthName = monthNames[monthIndex] ?? monthKey
  const rows: string[] = [
    `<tr><td style="padding:4px 12px 4px 0;color:#555">Offerter skickade</td><td><strong>${stats.quotesSent}</strong></td></tr>`,
    `<tr><td style="padding:4px 12px 4px 0;color:#555">Vunna jobb</td><td><strong>${stats.wins}</strong></td></tr>`,
  ]
  if (stats.revenueSek !== null) {
    rows.push(`<tr><td style="padding:4px 12px 4px 0;color:#555">Bekräftat jobbvärde</td><td><strong>${stats.revenueSek.toLocaleString('sv-SE')} kr</strong></td></tr>`)
  }
  if (stats.avgRating !== null && stats.publishedReviewCount > 0) {
    rows.push(`<tr><td style="padding:4px 12px 4px 0;color:#555">Omdöme</td><td><strong>${stats.avgRating.toFixed(1).replace('.', ',')} av 5</strong> (${stats.publishedReviewCount} recensioner)</td></tr>`)
  }
  return {
    subject: `Er månad på Cykelhjälpen: ${monthName}`,
    html: `
      <h2 style="margin:0 0 16px">Så gick det för ${escapeHtml(ctx.companyName)} i ${monthName}</h2>
      <table style="border-collapse:collapse;margin:16px 0">${rows.join('')}</table>
      ${stats.wins > 0
        ? '<p>Bra jobbat! Fortsätt svara snabbt – verkstäder som svarar först vinner fler jobb.</p>'
        : '<p>Inga vunna jobb den här månaden. Ett tips: svara tidigt på nya ärenden, det är ofta den första offerten som vinner.</p>'}
      ${button(REQUESTS_URL, 'Se öppna ärenden')}
      ${unsubscribeFooter(ctx.unsubscribeUrl)}
    `,
  }
}

// 5. Profilknuff – kopplad till värdet av en komplett offentlig profil
export function buildProfileNudgeEmail(ctx: TemplateContext, completeness: ProfileCompleteness): EmailTemplate {
  const items = completeness.missing.map((label) => `<li>${escapeHtml(label)}</li>`).join('')
  return {
    subject: 'Gör er profil komplett – kunder väljer verkstäder de känner igen',
    html: `
      <h2 style="margin:0 0 16px">Hej ${escapeHtml(ctx.companyName)}!</h2>
      <p>Er profil på Cykelhjälpen är ${completeness.percent} % komplett. En komplett profil syns i vår offentliga verkstadskatalog och gör att kunder väljer er oftare – både i katalogen och när de jämför offerter.</p>
      <p>Det som saknas:</p>
      <ul style="margin:8px 0 16px;padding-left:20px">${items}</ul>
      <p>Det tar bara några minuter att fylla i.</p>
      ${button(SETTINGS_URL, 'Komplettera profilen')}
      ${unsubscribeFooter(ctx.unsubscribeUrl)}
    `,
  }
}

// 6a. Notis: ny publicerad recension (integration med S3:s v2_reviews)
export function buildReviewNotificationEmail(ctx: TemplateContext, rating: number, body: string | null): EmailTemplate {
  const stars = '★'.repeat(rating) + '☆'.repeat(Math.max(0, 5 - rating))
  return {
    subject: `Ny recension: ${stars}`,
    html: `
      <h2 style="margin:0 0 16px">En kund har recenserat ${escapeHtml(ctx.companyName)}</h2>
      <p style="font-size:20px;margin:0 0 8px">${stars}</p>
      ${body ? `<p style="background:#f5f5f5;padding:12px;border-radius:6px">${escapeHtml(body)}</p>` : '<p>Kunden lämnade ett betyg utan text.</p>'}
      <p>Ni kan svara på recensionen från er instrumentpanel. Ett svar visar framtida kunder att ni bryr er.</p>
      ${button(DASHBOARD_URL, 'Se recensionen')}
      ${unsubscribeFooter(ctx.unsubscribeUrl)}
    `,
  }
}

// 6b. Notis: kund har bekräftat att jobbet är klart (integration med S3:s v2_job_outcomes)
export function buildOutcomeNotificationEmail(ctx: TemplateContext, state: 'confirmed_by_customer' | 'completed', finalPriceSek: number | null): EmailTemplate {
  const done = state === 'completed'
  return {
    subject: done ? 'Jobbet bekräftat som klart' : 'Kunden har bekräftat att jobbet är gjort',
    html: `
      <h2 style="margin:0 0 16px">Hej ${escapeHtml(ctx.companyName)}!</h2>
      <p>${done
        ? 'Ert vunna jobb via Cykelhjälpen är nu bekräftat som avslutat.'
        : 'Kunden har bekräftat att jobbet ni vann via Cykelhjälpen är gjort.'}</p>
      ${finalPriceSek !== null ? `<p>Slutpris: <strong>${finalPriceSek.toLocaleString('sv-SE')} kr</strong></p>` : ''}
      <p>Bekräftade jobb kan ge er en verifierad recension – den starkaste reklamen som finns.</p>
      ${button(DASHBOARD_URL, 'Till instrumentpanelen')}
      ${unsubscribeFooter(ctx.unsubscribeUrl)}
    `,
  }
}
