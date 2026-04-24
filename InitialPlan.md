Project Context: Selio
​1. Core Mission & Problem Statement
​Selio är ett specialiserat PIM-system (Product Information Management) för second hand- och vintagebutiker.

​Problemet: Att sälja unika varor (Single SKU) på flera kanaler (fysisk butik, Tradera, Instagram, Blocket) är extremt tidskrävande. Det leder till "dubbelförsäljning" och administrativt kaos med bokföring (VMB).
​Lösningen: En "Digital Tvilling" av butikens lager. AI-driven listning på 30 sekunder och en "Atomic Sync" som dödar annonser digitalt sekunden varan säljs fysiskt.

​2. Technical Stack

​Framework: TanStack Start (SSR för SEO-vänlig publik shop, SPA-känsla för admin).
​Database/Backend: Convex.dev (Realtids-DB för omedelbar lagersynk över alla klienter).
​AI Vision/Text: OpenAI GPT-5.4 (Identifiering av prylar, skriva säljande titlar/beskrivningar, prisförslag, Tradera-kategorisering).
​AI Image Processing: Nano Banana 2 (Borttagning av bakgrund och generering av proffsiga produktfoton från stökiga butiksmiljöer).
​Payment/Trigger: Swish Business API (via QRbutik-logik) för att trigga lagersynk.

​3. Key Features (MVP Scope)


​The 30-Second Listing Loop: 1. Användaren tar ett foto.
2. Nano Banana 2 rensar bakgrunden.
3. GPT-5.4 genererar Title, Description, Tradera-kategori och pris.
4. Varan sparas i Convex med status Available.

​Atomic Sync (Kill-switch): * En realtids-dashboard för butikssidan.

​När en vara markeras som Sold (manuellt eller via Swish-callback), skickas omedelbara API-anrop för att stänga ner auktioner på Tradera och uppdatera Meta Catalog (Instagram).



​VMB Accounting (Vinstmarginalbeskattning):

​Varje vara har fält för Inköpspris och Försäljningspris.
​Automatisk kalkylering av marginalmoms: (Utpris - Inpris) * 0.2.
​Exportvänlig logg för Fortnox/Bokio.


​Public Storefront: * En blixtsnabb landningssida för butiken (t.ex. selio.se/majorna-vintage) där kunder kan se aktuellt lagersaldo i realtid.

​4. Business Logic & Rules

​Single SKU Rule: Varje objekt är unikt. Om quantity når 0 måste objektet döljas överallt inom <500ms.
​Swedish Compliance: Systemet måste hantera svenska tecken och följa Skatteverkets regler för VMB-redovisning.
​Mobile-First Admin: Användargränssnittet för butiksägaren måste vara optimerat för enhandsanvändning i en fysisk butiksmiljö.

​5. Implementation Roadmap (Weekend MVP)

​Schema Definition (Convex): Tabeller för items, categories, store_settings och sales_log.
​AI Integration: Server-side functions i Convex för att anropa OpenAI och Nano Banana.
​Admin UI: TanStack-router med vyer för Scan, Inventory och Sales.
​Mock Connectors: Simulation av Tradera/Meta API-svar för helgens demo.

​6. Competitive Advantage

​Mot Tradera: Vi är en bridge, inte en silo. Vi sköter deras fysiska lager samtidigt som Tradera.
​Mot Minimist: Vi fokuserar på den svenska "Back-office"-smärtan (VMB/Fortnox) och fysisk butikssynk via QR.
​Mot Shopify: Vi är byggda för 1-av-1-varor, inte massproduktion.

