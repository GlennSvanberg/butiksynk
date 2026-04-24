import { Link } from '@tanstack/react-router'
import { DEMO_SHOP_SLUG } from '../../../shared/shopConstants'
import { emptyButikListingSearch } from '~/lib/butikPublicSearch'

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

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-brand-dark/10 bg-brand-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <LogoMark className="size-8 shrink-0 text-brand-dark" />
          <span className="font-heading text-lg font-bold tracking-tight text-brand-dark">
            Butiksynk
          </span>
        </Link>
        <nav
          className="hidden items-center gap-8 text-sm font-medium text-brand-dark/80 md:flex"
          aria-label="Primär"
        >
          <a href="#funktioner" className="transition hover:text-brand-dark">
            Funktioner
          </a>
          <a href="#synk" className="transition hover:text-brand-dark">
            Realtid
          </a>
          <a href="#kill" className="transition hover:text-brand-dark">
            Kill-switch
          </a>
          <Link
            to="/butik/$shopSlug"
            params={{ shopSlug: DEMO_SHOP_SLUG }}
            search={emptyButikListingSearch}
            className="transition hover:text-brand-dark"
          >
            Demoshop
          </Link>
          <Link
            to="/login"
            search={{ redirect: undefined }}
            className="transition hover:text-brand-dark"
          >
            Logga in
          </Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            search={{ redirect: undefined }}
            className="rounded-lg px-3 py-2 text-sm font-medium text-brand-dark transition hover:bg-brand-dark/5 hover:text-brand-dark md:hidden"
          >
            Logga in
          </Link>
          <Link
            to="/butik/$shopSlug"
            params={{ shopSlug: DEMO_SHOP_SLUG }}
            search={emptyButikListingSearch}
            className="rounded-lg px-3 py-2 text-sm font-medium text-brand-dark/70 transition hover:bg-brand-dark/5 hover:text-brand-dark md:hidden"
          >
            Demoshop
          </Link>
          <Link
            to="/login"
            search={{ redirect: undefined }}
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-brand-dark transition hover:bg-brand-dark/5 hover:text-brand-dark md:inline-flex"
          >
            Logga in
          </Link>
          <a
            href="#kontakt"
            className="rounded-lg bg-brand-dark px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark/90"
          >
            Kontakta oss
          </a>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section
      className="relative overflow-hidden border-b border-brand-dark/8 bg-brand-bg bg-paper-grain"
      aria-labelledby="hero-heading"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(249_248_246)_0%,rgb(249_248_246_/_0)_40%)]" />
      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:pb-24 lg:pt-20">
        <p className="mb-4 inline-flex items-center rounded-lg border border-brand-dark/12 bg-brand-surface/80 px-3 py-1 font-mono text-xs font-medium uppercase tracking-wider text-brand-dark/70 shadow-sm backdrop-blur-sm">
          PIM för vintage & second hand
        </p>
        <h1
          id="hero-heading"
          className="font-heading max-w-3xl text-4xl font-bold tracking-tight text-brand-dark sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]"
        >
          En digital tvilling som hänger med i{' '}
          <span className="text-brand-dark">butiken — och på nätet.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-brand-dark/75 sm:text-xl">
          Samma unika plagg ska inte säljas två gånger. Butiksynk är byggt för
          single-SKU-lager, VMB och kanaler som uppdateras i realtid — så du
          slipper dubbelförsäljning och administration som skenar.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <a
            href="#kontakt"
            className="inline-flex items-center justify-center rounded-lg bg-brand-dark px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark/92"
          >
            Prata med oss
          </a>
          <a
            href="#funktioner"
            className="inline-flex items-center justify-center rounded-lg border border-brand-dark/20 bg-brand-surface px-5 py-3 text-sm font-semibold text-brand-dark shadow-sm transition hover:border-brand-dark/35"
          >
            Se funktionerna
          </a>
          <Link
            to="/login"
            search={{ redirect: undefined }}
            className="inline-flex items-center justify-center rounded-lg border border-brand-dark/20 bg-brand-surface px-5 py-3 text-sm font-semibold text-brand-dark shadow-sm transition hover:border-brand-dark/35"
          >
            Logga in
          </Link>
          <Link
            to="/butik/$shopSlug"
            params={{ shopSlug: DEMO_SHOP_SLUG }}
            search={emptyButikListingSearch}
            className="inline-flex items-center justify-center rounded-lg border border-brand-dark/20 bg-brand-surface px-5 py-3 text-sm font-semibold text-brand-dark shadow-sm transition hover:border-brand-dark/35"
          >
            Öppna demoshop
          </Link>
        </div>
        <dl className="mt-14 grid gap-6 border-t border-brand-dark/10 pt-10 sm:grid-cols-3">
          <div>
            <dt className="font-mono text-xs font-medium uppercase tracking-wide text-brand-dark/55">
              Listningsloop
            </dt>
            <dd className="mt-1 font-heading text-2xl font-bold tabular-nums text-brand-dark">
              ~30 s
            </dd>
            <dd className="mt-1 text-sm text-brand-dark/65">
              Foto till live — med AI-stöd i flödet.
            </dd>
          </div>
          <div>
            <dt className="font-mono text-xs font-medium uppercase tracking-wide text-brand-dark/55">
              Lagersynk
            </dt>
            <dd className="mt-1 font-heading text-2xl font-bold tabular-nums text-brand-dark">
              {'<'}500 ms
            </dd>
            <dd className="mt-1 text-sm text-brand-dark/65">
              Realtidsstatus när något flyttar sig.
            </dd>
          </div>
          <div>
            <dt className="font-mono text-xs font-medium uppercase tracking-wide text-brand-dark/55">
              VMB
            </dt>
            <dd className="mt-1 font-heading text-2xl font-bold text-brand-dark">
              Inbyggt
            </dd>
            <dd className="mt-1 text-sm text-brand-dark/65">
              Marginalbeskattning och export till bokföring.
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}

function ProblemSolution() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="rounded-lg border border-brand-dark/10 bg-brand-surface p-6 shadow-sm sm:p-8">
          <h2 className="font-heading text-xl font-bold text-brand-dark">
            Problemet
          </h2>
          <p className="mt-3 text-brand-dark/75">
            Unika varor på flera kanaler ger dubbelförsäljning, manuell jakt i
            kalkylblad och extra stress kring VMB — särskilt när något säljs i
            kassan samtidigt som det ligger ute på Tradera eller i er
            webbshop.
          </p>
        </div>
        <div className="rounded-lg border border-brand-dark/10 bg-brand-surface p-6 shadow-sm sm:p-8">
          <h2 className="font-heading text-xl font-bold text-brand-dark">
            Vår riktning
          </h2>
          <p className="mt-3 text-brand-dark/75">
            En enda sanning för lagret: AI hjälper till med listning och kategorier,
            Convex driver realtidsdata, och en tydlig kill-switch stänger
            digital försäljning sekunden varan säljs i butik.
          </p>
        </div>
      </div>
    </section>
  )
}

const features = [
  {
    title: '30-sekunderslistan',
    body: 'Foto → rensad produktbild → metadata → live i ert lager.',
    mono: 'Foto → AI → Convex',
  },
  {
    title: 'Atomär synk',
    body: 'Alla som tittar ser samma status — utan att lappa manuellt.',
    mono: 'status: live',
  },
  {
    title: 'Kill-switch',
    body: 'En tydlig åtgärd som drar tillbaka annonser när varan är såld i butik.',
    mono: 'SÅLD I BUTIK',
  },
  {
    title: 'VMB & export',
    body: 'Kalkyl i linje med marginalreglerna och underlag som går vidare till Fortnox.',
    mono: '(ut − in) × 0,20',
  },
  {
    title: 'Publik skyltfönster',
    body: 'Snabb lista över vad som faktiskt finns — för kunder som vill köpa lokalt.',
    mono: 'SKU → live',
  },
] as const

function Features() {
  return (
    <section
      id="funktioner"
      className="border-t border-brand-dark/8 bg-brand-bg/60 py-16 lg:py-20"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2
          id="features-heading"
          className="font-heading text-2xl font-bold text-brand-dark sm:text-3xl"
        >
          Byggt för MVP — och för riktig drift
        </h2>
        <p className="mt-3 max-w-2xl text-brand-dark/70">
          Funktionerna nedan speglar det vi siktar på i första versjonen: fart i
          kassalinjen, kontroll på kanalerna och spårbarhet för ekonomin.
        </p>
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <li key={f.title}>
              <article className="flex h-full flex-col rounded-lg border border-brand-dark/8 bg-brand-surface p-5 shadow-sm transition hover:border-brand-dark/15 hover:shadow">
                <p className="font-mono text-xs font-medium text-status-success">
                  {f.mono}
                </p>
                <h3 className="font-heading mt-3 text-lg font-bold text-brand-dark">
                  {f.title}
                </h3>
                <p className="mt-2 flex-1 text-sm text-brand-dark/72 leading-relaxed">
                  {f.body}
                </p>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function SyncSection() {
  return (
    <section
      id="synk"
      className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20"
    >
      <div className="overflow-hidden rounded-lg border border-brand-dark/10 bg-brand-surface shadow-sm">
        <div className="grid gap-0 lg:grid-cols-2">
          <div className="border-b border-brand-dark/10 p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <h2 className="font-heading text-xl font-bold text-brand-dark">
              Realtid som betyder något
            </h2>
            <p className="mt-3 text-brand-dark/75">
              När en kollega säljer i butiken ska kanalerna inte stå och vänta på
              nästa import. Data drivs av Convex så att listor och status kan
              uppdateras i samma ögonblick som affären sker.
            </p>
          </div>
          <div className="flex flex-col justify-center bg-brand-bg/40 p-6 sm:p-8">
            <div className="rounded-lg border border-brand-dark/10 bg-brand-surface p-4 shadow-sm">
              <p className="font-mono text-xs text-brand-dark/55">Senaste händelse</p>
              <p className="mt-2 font-mono text-sm font-medium text-brand-dark">
                SKU-2044 · butiksförsäljning ·{' '}
                <span className="text-status-success">synkad</span>
              </p>
              <p className="mt-3 text-xs text-brand-dark/55">
                Exempel för hur loggar och mono kan visas i gränssnittet.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function KillSwitchDemo() {
  return (
    <section
      id="kill"
      className="border-t border-brand-dark/8 bg-brand-bg py-16 lg:py-20"
      aria-labelledby="kill-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="rounded-lg border border-brand-accent/25 bg-brand-surface p-6 shadow-sm sm:p-10">
          <h2
            id="kill-heading"
            className="font-heading text-2xl font-bold text-brand-dark sm:text-3xl"
          >
            Kill-switch: stoppa nätet när butiken vinner
          </h2>
          <p className="mt-3 max-w-2xl text-brand-dark/75">
            När kunden betalar i kassan ska du inte behöva jaga annonser i efterhand.
            En tydlig, accentfärgad åtgärd drar tillbaka det som är listat — utan
            krångel.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <button
              type="button"
              className="rounded-lg bg-brand-accent px-6 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-brand-accent/92 active:scale-[0.99]"
            >
              SÅLD I BUTIK
            </button>
            <p className="max-w-md text-sm text-brand-dark/65">
              Demonstrationsknapp utan koppling till backend ännu — layout och
              färg följer{' '}
              <span className="font-medium text-brand-dark">kill-switch</span>{' '}
              i riktlinjerna.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Contact() {
  return (
    <section
      id="kontakt"
      className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pb-24"
    >
      <div className="rounded-lg border border-brand-dark/10 bg-brand-dark p-6 text-center shadow-sm sm:p-10">
        <h2 className="font-heading text-2xl font-bold text-white">
          Första versionen tar form
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-white/85 sm:text-base">
          Vill du följa med när vi bjuder in pilotbutiker? Lämna intresse här
          senare — den här sidan är ett första utkast av landningssidan.
        </p>
        <p className="mt-6 font-mono text-sm text-white/70">
          kontakt@butiksynk.se{' '}
          <span className="text-white/45">·</span> plats för formulär kommer
        </p>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-brand-dark/10 bg-brand-bg">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <LogoMark className="size-6 shrink-0" />
          <span className="font-heading text-sm font-semibold text-brand-dark">
            Butiksynk
          </span>
          <span className="text-sm text-brand-dark/55">© {new Date().getFullYear()}</span>
        </div>
        <p className="text-sm text-brand-dark/55">
          PIM för second hand · Göteborg & Sverige
        </p>
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
        <ProblemSolution />
        <Features />
        <SyncSection />
        <KillSwitchDemo />
        <Contact />
      </main>
      <Footer />
    </div>
  )
}
