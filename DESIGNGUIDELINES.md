# PROJECT CONTEXT: BUTIKSYNK

## ​1. CORE MISSION

​Butiksynk är ett specialiserat PIM-system (Product Information Management) för second hand- och vintagebutiker.

- ​**Problem:** Att sälja unika varor (Single SKU) på flera kanaler samtidigt leder till dubbelförsäljning och administrativt kaos med Vinstmarginalbeskattning (VMB).
- ​**Lösning:** En "Digital Tvilling" av butikens lager med AI-driven listning och en realtids "Kill-switch" som tar bort annonser sekunden varan säljs i fysisk butik.

## ​2. TECHNICAL STACK

- ​**Framework:** TanStack Start (SSR för SEO, SPA-känsla för admin).
- ​**Database/Backend:** [Convex.dev](http://Convex.dev) (Realtids-DB för omedelbar lagersynk).
- ​**AI Vision/Text:** OpenAI GPT-5.4 (Identifiering, beskrivning, Tradera-kategorisering).
- ​**AI Image:** Nano Banana 2 (Bakgrundsborttagning och produktfoto-generering).
- ​**Payment Trigger:** Swish Business API integration.

## ​3. CORE FEATURES (MVP)

- ​**The 30-Second Listing Loop:** Foto -> Nano Banana (Clean) -> GPT (Metadata) -> Convex (Live).
- ​**Atomic Sync:** Realtidsuppdatering av lagerstatus (<500ms).
- ​**Kill-switch:** En röd knapp "SÅLD I BUTIK" som stänger alla digitala kanaler.
- ​**VMB Accounting:** Automatisk kalkyl: (PrisUt - PrisIn) * 0.20. Exportvänlig logg för Fortnox.
- ​**Public Storefront:** Blixtsnabb lista på tillgängliga varor för butikens kunder.

# ​STYLE GUIDELINE

## ​1. DESIGN PHILOSOPHY

​"Utilitarian Heritage" – Ett modernt, effektivt verktyg med en organisk och stabil känsla. Inget fluff, fokus på hastighet och precision.

## ​2. COLORS (TAILWIND)

- ​**Primary (Deep Forest):** #1B3A29 (Används för logotyp, primära knappar, headers).
- ​**Secondary (Terracotta):** #C05746 (Används för Kill-switch, "SÅLD", och viktiga actions).
- ​**Background (Paper):** #F9F8F6 (Huvudsaklig bakgrundsfärg för appen).
- ​**Surface (White):** #FFFFFF (Kort och ytor för produkter).
- ​**Text (Main):** #1A1A1A (Hög läsbarhet).
- ​**Success (Green):** #2D6A4F (Bekräftelse på synk).

## ​3. TYPOGRAPHY

- ​**Headings:** Plus Jakarta Sans (Bold, 700). Proffsigt och modernt.
- ​**Body:** Inter (Regular/Medium). Standard för optimal läsbarhet.
- ​**Data/Prices:** JetBrains Mono (Används för priser, SKU och VMB-siffror för precision).

## ​4. UI COMPONENTS

- ​**Corners:** rounded-lg (8px) för en stabil men modern känsla.
- ​**Shadows:** shadow-sm (subtila skuggor) för att ge djup utan att kännas rörigt.
- ​**Buttons:** - Primary: brand-dark bakgrund, vit text.
  - ​Kill-switch: brand-accent (Terracotta) vid klick.
- ​**Cards:** Vita ytor mot pappersbakgrunden med shadow-sm.

## ​5. TAILWIND CONFIGURATION SNIPPET

​colors: {

brand: {

dark: '#1B3A29',

accent: '#C05746',

bg: '#F9F8F6',

},

status: {

success: '#2D6A4F',

sold: '#C05746',

}

}

fontFamily: {

sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],

mono: ['JetBrains Mono', 'monospace'],

}