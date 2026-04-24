import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  ExternalLink,
  Layers,
  Mail,
  Radio,
  Sparkles,
  Store,
  Target,
} from 'lucide-react'
import {
  DEMO_SHOWCASE_PRODUCT_ID,
  DEMO_SHOP_SLUG,
} from '../../../shared/shopConstants'
import { emptyButikListingSearch } from '~/lib/butikPublicSearch'
import { defaultLoginSearch } from '~/lib/loginSearch'

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="2"
        y="4"
        width="28"
        height="24"
        rx="3"
        className="stroke-brand-dark"
        strokeWidth="2"
        fill="var(--color-brand-surface)"
      />
      <path
        d="M10 22V10l6 8 6-8v12"
        className="stroke-brand-dark"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wider text-brand-dark/55">
      <span
        className="inline-block size-1.5 shrink-0 rounded-full bg-status-success"
        aria-hidden
      />
      {children}
    </p>
  )
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-brand-dark/10 bg-brand-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <LogoMark className="size-8 shrink-0 text-brand-dark" />
          <span className="font-heading text-lg font-bold tracking-tight text-brand-dark">
            Selio
          </span>
        </Link>
        <nav
          className="hidden flex-1 justify-center md:flex"
          aria-label="Primär"
        >
          <a
            href="#flode"
            className="text-sm font-medium text-brand-dark/80 transition hover:text-brand-dark"
          >
            Så funkar det
          </a>
        </nav>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            search={defaultLoginSearch}
            className="rounded-lg px-3 py-2 text-sm font-medium text-brand-dark/80 transition hover:bg-brand-dark/5 hover:text-brand-dark"
          >
            Logga in
          </Link>
          <a
            href="#kontakt"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-dark px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark/90 sm:px-4"
          >
            Kontakta oss
            <ArrowRight className="size-3.5 opacity-90" aria-hidden />
          </a>
        </div>
      </div>
    </header>
  )
}

const exampleButikPath = `/butik/${DEMO_SHOP_SLUG}/`

function HeroExampleShop() {
  return (
    <div className="relative mt-10 lg:mt-0">
      <div
        className="absolute -inset-1 rounded-[1.35rem] bg-gradient-to-br from-brand-dark/12 via-transparent to-brand-accent/15 blur-xl"
        aria-hidden
      />
      <div className="relative flex flex-col overflow-hidden rounded-2xl border border-brand-dark/12 bg-brand-surface shadow-[0_24px_48px_-12px_rgba(27,58,41,0.18)] ring-1 ring-black/[0.04]">
        <div className="flex items-center gap-2 border-b border-brand-dark/8 bg-brand-bg/80 px-4 py-3">
          <span className="size-2.5 rounded-full bg-brand-dark/15" aria-hidden />
          <span className="size-2.5 rounded-full bg-brand-dark/10" aria-hidden />
          <span className="size-2.5 rounded-full bg-brand-dark/8" aria-hidden />
          <span className="ml-2 font-mono text-[10px] font-medium uppercase tracking-wider text-brand-dark/45">
            {exampleButikPath}
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-status-success/25 bg-status-success/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-status-success">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-status-success/40 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-status-success" />
            </span>
            Live
          </span>
        </div>
        <div className="relative bg-brand-bg/40">
          <iframe
            title="Exempelbutikens publika lista"
            src={exampleButikPath}
            className="h-[min(56vh,580px)] w-full min-h-[320px] border-0 bg-white sm:min-h-[400px]"
            loading="lazy"
          />
        </div>
        <p className="border-t border-brand-dark/8 bg-brand-surface/95 px-3 py-2.5 text-center text-[11px] leading-snug text-brand-dark/60 sm:px-4 sm:text-xs">
          Samma sida som kunder ser — faktiska varor i exempelbutiken, uppdaterat
          när innehållet ändras.
        </p>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section
      className="relative overflow-hidden border-b border-brand-dark/8 bg-brand-bg bg-paper-grain"
      aria-labelledby="hero-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(27,58,41,0.08),transparent)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(249_248_246)_0%,rgb(249_248_246_/_0)_45%)]" />
      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:pb-24 lg:pt-20">
        <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <p className="mb-4 inline-flex items-center rounded-lg border border-brand-dark/12 bg-brand-surface/90 px-3 py-1.5 font-mono text-xs font-medium uppercase tracking-wider text-brand-dark/70 shadow-sm backdrop-blur-sm">
              Från inlämning till kundbutik
            </p>
            <h1
              id="hero-heading"
              className="font-heading max-w-3xl text-4xl font-bold tracking-tight text-brand-dark sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]"
            >
              En digital tvilling som hänger med i{' '}
              <span className="text-brand-dark">butiken — och på nätet.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-brand-dark/75 sm:text-xl">
              Samma unika plagg ska inte säljas två gånger. Selio håller
              inlämning, lager och kundbutik i synk, med AI-stöd för titel, pris
              och text. Alla ser samma status direkt när något sparas. Ekonomi
              och externa försäljningskanaler byggs ut stegvis.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3 sm:gap-4">
              <a
                href="#kontakt"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-dark px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-brand-dark/92"
              >
                Prata med oss
                <ArrowRight className="size-4 opacity-90" aria-hidden />
              </a>
              <Link
                to="/butik/$shopSlug"
                params={{ shopSlug: DEMO_SHOP_SLUG }}
                search={emptyButikListingSearch}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-brand-dark/18 bg-brand-surface px-5 py-3 text-sm font-semibold text-brand-dark shadow-sm transition hover:border-brand-dark/30 hover:shadow"
              >
                <Store className="size-4 text-brand-dark/70" aria-hidden />
                Öppna exempelbutiken
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5">
            <HeroExampleShop />
          </div>
        </div>

        <dl className="mt-16 grid gap-4 sm:grid-cols-3 sm:gap-5 lg:mt-20">
          {[
            {
              icon: Layers,
              k: 'Ett lager',
              t: 'Unika varor',
              d: 'Ett spår per plagg — grunden för att undvika dubbelförsäljning.',
            },
            {
              icon: Sparkles,
              k: 'Listning',
              t: 'AI-stöd',
              d: 'Foto och metadata i samma flöde när du lägger upp produkter.',
            },
            {
              icon: Store,
              k: 'Synligt',
              t: 'Publik butik',
              d: 'Kunder ser vad som finns — uppdaterat när du sparar i systemet.',
            },
          ].map((item) => (
            <div
              key={item.k}
              className="group relative overflow-hidden rounded-xl border border-brand-dark/10 bg-brand-surface/90 p-5 shadow-sm transition hover:border-brand-dark/18 hover:shadow-md"
            >
              <div className="absolute right-0 top-0 size-24 translate-x-1/3 -translate-y-1/3 rounded-full bg-brand-dark/[0.04] transition group-hover:bg-brand-dark/[0.07]" />
              <dt className="flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wide text-brand-dark/50">
                <item.icon
                  className="size-3.5 text-status-success"
                  strokeWidth={2}
                  aria-hidden
                />
                {item.k}
              </dt>
              <dd className="mt-2 font-heading text-xl font-bold text-brand-dark">
                {item.t}
              </dd>
              <dd className="mt-2 text-sm leading-relaxed text-brand-dark/65">
                {item.d}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

const fromPhotoSteps = [
  {
    title: 'Foto',
    body: 'I snabb inlämning tar du en bild (eller flera i rad). AI föreslår titel, pris och text medan du jobbar.',
    icon: Camera,
  },
  {
    title: 'Granska & spara',
    body: 'På översikten eller i redigeringen justerar du, godkänner och publicerar när allt stämmer.',
    icon: CheckCircle2,
  },
  {
    title: 'Syns i butiken',
    body: 'Samma vara ligger strax i er publika butikssida — samma data som i admin, utan manuell uppdatering.',
    icon: Store,
  },
] as const

function SectionFromPhotoToShop() {
  return (
    <section
      id="flode"
      className="border-b border-brand-dark/8 bg-brand-bg py-16 sm:py-20 lg:py-24"
      aria-labelledby="flode-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionEyebrow>Från plagg till publik sida</SectionEyebrow>
        <h2
          id="flode-heading"
          className="font-heading text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl lg:text-[2rem]"
        >
          Så här går inlämningen till
        </h2>
        <p className="mt-3 max-w-2xl text-brand-dark/70">
          Foto, godkännande i verktyget och en levande sida utåt — så hänger
          stegen ihop när du tar in nya unika varor.
        </p>

        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {fromPhotoSteps.map((s, i) => (
            <li key={s.title} className="flex flex-col">
              <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-brand-dark/10 bg-brand-surface p-6 shadow-sm">
                <div
                  className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-status-success/70 via-brand-dark/25 to-brand-dark/10"
                  aria-hidden
                />
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-brand-dark/8 bg-brand-bg text-brand-dark"
                    aria-hidden
                  >
                    <s.icon className="size-4" strokeWidth={1.75} />
                  </span>
                  <span className="font-mono text-xs font-semibold text-brand-dark/50">
                    Steg {i + 1}
                  </span>
                </div>
                <h3 className="font-heading text-lg font-bold text-brand-dark">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-dark/72">
                  {s.body}
                </p>
              </article>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl border border-brand-dark/10 bg-brand-surface/80 p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-8">
          <div>
            <p className="font-heading text-base font-semibold text-brand-dark sm:text-lg">
              Prova utan eget lager
            </p>
            <p className="mt-1.5 text-sm text-brand-dark/70">
              Logga in med demot och gå till snabb inlämning, eller titta i
              exempelbutiken ovanför.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Link
              to="/login"
              search={{ ...defaultLoginSearch, demo: '1' }}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-dark px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark/90"
            >
              Öppna demo
              <ArrowRight className="size-3.5 opacity-90" aria-hidden />
            </Link>
            <Link
              to="/butik/$shopSlug"
              params={{ shopSlug: DEMO_SHOP_SLUG }}
              search={emptyButikListingSearch}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-brand-dark/85 underline decoration-brand-dark/30 underline-offset-4 transition hover:text-brand-dark"
            >
              Länk till exempelbutiken
              <ExternalLink className="size-3.5 shrink-0 opacity-80" aria-hidden />
            </Link>
          </div>
        </div>

        {DEMO_SHOWCASE_PRODUCT_ID ? (
          <p className="mt-6 text-sm text-brand-dark/65">
            <span className="font-medium text-brand-dark/85">
              Exempel på färdig sida:{' '}
            </span>
            <Link
              to="/butik/$shopSlug/vara/$productId"
              params={{
                shopSlug: DEMO_SHOP_SLUG,
                productId: DEMO_SHOWCASE_PRODUCT_ID,
              }}
              className="font-medium text-status-success underline decoration-status-success/35 underline-offset-[3px] transition hover:decoration-status-success"
            >
              Se ett publicerat plagg
            </Link>
            <span className="text-brand-dark/50"> (live utdrag ur exempelbutiken)</span>
          </p>
        ) : null}
      </div>
    </section>
  )
}

const pillars = [
  {
    title: 'Publik butikslista',
    mono: '/butik/…',
    body: 'En snabb sida över lagret som du kan länka till — samma data som i adminläget.',
    icon: Store,
  },
  {
    title: 'AI i listningsflödet',
    mono: 'Foto → förslag',
    body: 'Stöd för att gissa kategori, attribut och texter utifrån bild så du kommer igång snabbare.',
    icon: Sparkles,
  },
  {
    title: 'Realtid i verktyget',
    mono: 'Convex',
    body: 'När någon ändrar en produkt syns det för övriga som är inloggade utan manuell refresh.',
    icon: Radio,
  },
] as const

function SectionWhy() {
  return (
    <section
      className="border-b border-brand-dark/8 bg-brand-surface py-16 sm:py-20 lg:py-24"
      aria-labelledby="why-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionEyebrow>Utgångsläge</SectionEyebrow>
        <h2
          id="why-heading"
          className="font-heading text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl lg:text-[2rem]"
        >
          Varför det här problemet?
        </h2>
        <p className="mt-3 max-w-2xl text-brand-dark/70">
          Fokus är ett gemensamt lager och ett tydligt sätt att visa upp det för
          kunder. Resten växer in när pilotbutiker styr prioriteringarna.
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-2 lg:gap-8">
          <article className="relative overflow-hidden rounded-2xl border border-brand-dark/10 bg-brand-bg/40 p-6 shadow-sm sm:p-8 lg:p-10">
            <div className="mb-5 inline-flex size-12 items-center justify-center rounded-xl bg-brand-dark/8 text-brand-dark">
              <Target className="size-6" strokeWidth={1.75} aria-hidden />
            </div>
            <h3 className="font-heading text-xl font-bold text-brand-dark">
              Problemet
            </h3>
            <p className="mt-3 text-brand-dark/75 leading-relaxed">
              Unika varor på flera ställen ger dubbelförsäljning och manuellt
              dubbelarbete — särskilt när något säljs i kassan samtidigt som det
              syns digitalt.
            </p>
          </article>
          <article className="relative overflow-hidden rounded-2xl border border-brand-dark/10 bg-gradient-to-br from-brand-bg/80 to-brand-surface p-6 shadow-sm sm:p-8 lg:p-10">
            <div className="mb-5 inline-flex size-12 items-center justify-center rounded-xl bg-status-success/12 text-status-success">
              <Layers className="size-6" strokeWidth={1.75} aria-hidden />
            </div>
            <h3 className="font-heading text-xl font-bold text-brand-dark">
              Vår riktning
            </h3>
            <p className="mt-3 text-brand-dark/75 leading-relaxed">
              En sanning för lagret i verktyget, med publik vy utåt och AI som
              minskar friktion när du tar in nya plagg. När fler kanaler och
              ekonomi kommer in ska de sitta på samma grund — inte i separata
              kalkylblad.
            </p>
          </article>
        </div>
      </div>
    </section>
  )
}

function SectionCapabilities() {
  return (
    <section
      className="border-b border-brand-dark/8 bg-brand-bg bg-paper-grain py-16 sm:py-20 lg:py-24"
      aria-labelledby="caps-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionEyebrow>I verktyget idag</SectionEyebrow>
        <h2
          id="caps-heading"
          className="font-heading text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl lg:text-[2rem]"
        >
          Det här levererar vi nu
        </h2>
        <p className="mt-3 max-w-2xl text-brand-dark/70">
          Tre byggstenar du kan testa i exempelbutiken och i adminläget — utan
          att vi lovar mer än vad som finns i koden.
        </p>

        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map((p) => (
            <li key={p.title}>
              <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-brand-dark/10 bg-brand-surface p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-dark/16 hover:shadow-md">
                <div
                  className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-dark via-brand-dark/40 to-status-success/60"
                  aria-hidden
                />
                <div className="mb-4 inline-flex size-11 items-center justify-center rounded-xl border border-brand-dark/8 bg-brand-bg text-brand-dark">
                  <p.icon className="size-5" strokeWidth={1.75} aria-hidden />
                </div>
                <p className="font-mono text-xs font-medium text-status-success">
                  {p.mono}
                </p>
                <h3 className="font-heading mt-2 text-lg font-bold text-brand-dark">
                  {p.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-brand-dark/72">
                  {p.body}
                </p>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function SectionRealtime() {
  return (
    <section
      className="bg-brand-dark/[0.03] py-16 sm:py-20 lg:py-24"
      aria-labelledby="realtime-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-brand-dark/12 bg-brand-surface shadow-[0_20px_40px_-16px_rgba(27,58,41,0.12)] ring-1 ring-black/[0.03]">
          <div className="grid gap-0 lg:grid-cols-2">
            <div className="border-b border-brand-dark/10 p-6 sm:p-10 lg:border-b-0 lg:border-r lg:p-12">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-dark/10 bg-brand-bg px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-wider text-brand-dark/55">
                <Radio className="size-3.5 text-status-success" aria-hidden />
                Under huven
              </div>
              <h2
                id="realtime-heading"
                className="font-heading text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl"
              >
                Realtid där det märks
              </h2>
              <p className="mt-4 text-brand-dark/75 leading-relaxed">
                Backend körs på Convex så ändringar kan spridas direkt till öppna
                sessioner — praktiskt när flera jobbar med samma sortiment eller
                när kunder laddar den publika listan.
              </p>
            </div>
            <div className="flex flex-col justify-center bg-gradient-to-br from-brand-bg/90 to-brand-bg/40 p-6 sm:p-10 lg:p-12">
              <div className="rounded-xl border border-brand-dark/12 bg-brand-surface p-5 shadow-inner">
                <p className="font-mono text-xs text-brand-dark/50">
                  Exempel på händelse
                </p>
                <p className="mt-3 font-mono text-sm font-medium leading-relaxed text-brand-dark">
                  SKU-2044 · uppdaterad ·{' '}
                  <span className="text-status-success">synkad</span>
                </p>
                <div className="mt-4 h-px w-full bg-brand-dark/10" />
                <p className="mt-4 text-xs leading-relaxed text-brand-dark/55">
                  Illustration av hur status och mono kan visas i
                  gränssnittet — inte live-data från din miljö.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-xl border-l-4 border-brand-accent bg-brand-accent/[0.06] px-5 py-5 sm:px-6 sm:py-6">
          <p className="text-sm leading-relaxed text-brand-dark/75">
            <span className="font-heading font-semibold text-brand-dark">
              På roadmap:
            </span>{' '}
            tydlig åtgärd när en vara säljs i fysisk butik (så kallad kill-switch
            mot externa annonser), VMB- och rapportunderlag samt kopplingar till
            bokföring — när behoven är kartlagda tillsammans med pilotbutiker.
          </p>
        </div>
      </div>
    </section>
  )
}

function Contact() {
  return (
    <section
      id="kontakt"
      className="scroll-mt-24 border-t border-brand-dark/8 bg-brand-bg bg-paper-grain px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-20"
      aria-labelledby="kontakt-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-2xl border border-brand-dark/15 bg-brand-dark p-8 text-center shadow-[0_24px_48px_-12px_rgba(27,58,41,0.35)] sm:p-12 lg:p-14">
          <div
            className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-white/[0.06]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-24 left-1/4 size-48 rounded-full bg-brand-accent/10 blur-2xl"
            aria-hidden
          />
          <div className="relative mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-white/10 text-white">
            <Mail className="size-7" strokeWidth={1.5} aria-hidden />
          </div>
          <h2
            id="kontakt-heading"
            className="font-heading relative mt-6 text-2xl font-bold text-white sm:text-3xl"
          >
            Första versionen tar form
          </h2>
          <p className="relative mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/88 sm:text-base">
            Vill du följa med när vi bjuder in pilotbutiker? Hör av dig på
            e-post — formulär för intresseanmälan kommer senare.
          </p>
          <p className="relative mt-8">
            <a
              href="mailto:kontakt@selio.se"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 font-mono text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/15"
            >
              kontakt@selio.se
              <ArrowRight className="size-4 opacity-80" aria-hidden />
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-brand-dark/12 bg-brand-surface">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <LogoMark className="size-8 shrink-0 text-brand-dark" />
            <div>
              <span className="font-heading text-base font-bold text-brand-dark">
                Selio
              </span>
              <p className="mt-1 text-sm text-brand-dark/55">
                Från inlämning till kundbutik · Göteborg & Sverige
              </p>
              <p className="mt-3 text-sm text-brand-dark/55">
                © {new Date().getFullYear()} Selio
              </p>
            </div>
          </div>
          <nav
            className="flex flex-wrap gap-x-8 gap-y-2 text-sm font-medium text-brand-dark/70"
            aria-label="Sidfot"
          >
            <Link to="/" className="transition hover:text-brand-dark">
              Startsida
            </Link>
            <a href="#flode" className="transition hover:text-brand-dark">
              Så funkar det
            </a>
            <a href="#kontakt" className="transition hover:text-brand-dark">
              Kontakt
            </a>
            <Link
              to="/login"
              search={defaultLoginSearch}
              className="transition hover:text-brand-dark"
            >
              Logga in
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  )
}

export function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <div id="hur" className="scroll-mt-20">
          <SectionFromPhotoToShop />
          <SectionWhy />
          <SectionCapabilities />
          <SectionRealtime />
        </div>
        <Contact />
      </main>
      <Footer />
    </div>
  )
}
