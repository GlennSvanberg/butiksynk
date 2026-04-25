# Öppna frågor och risker

Det här dokumentet samlar frågor som behöver besvaras innan eller under implementation av Meta Marketplace-integrationen. Den största risken är inte teknisk detaljimplementation, utan API-åtkomst, partnergodkännande och vad Meta faktiskt tillåter för svenska second hand-butiker.

## Mest kritiska frågor

### Kan Selio få Marketplace Partner-åtkomst?

Full automation kräver enligt aktuell dokumentation Marketplace Partner/Commerce Platform-spår. Utan det kan Selio inte lova att skapa, uppdatera eller ta bort Facebook Marketplace-listningar.

Behöver verifieras med Meta:

- Kan Selio bli Marketplace Partner för svenska butiker?
- Är Marketplace Partner Item API öppet för nya partnerintegrationer 2026?
- Gäller partneråtkomst för Sverige och `partner_item_country: SE`?
- Vilka produktkategorier får distribueras till Marketplace?
- Finns särskilda regler för second hand, vintage, VMB eller enstaka unika varor?
- Är integrationen avsedd för butiker som säljer som företag, eller riskerar Seller API-regler att flagga business sellers?

### Kan en butik ansluta sitt befintliga Facebook Marketplace-konto?

Selios ideala användarfråga kan låta som “anslut min Marketplace”. Men Meta verkar inte erbjuda ett öppet API för privata Marketplace-annonser.

Behöver beslutas:

- Ska Selio tydligt säga att automatiserad Meta-synk kräver Commerce-konto?
- Ska privat Marketplace hanteras som manuell kanal med länk och checklista?
- Ska Selio undvika ordet “Facebook Marketplace” i UI tills partneråtkomst är säkrad?
- Hur förklarar vi skillnaden mellan Meta Shop, Commerce Manager och Marketplace för svenska butiker?

### Hur snabbt kan Selio få reda på att en vara köpts via Meta?

Order API verkar vara poll-baserat för Commerce-orders.

Behöver verifieras:

- Finns webhook eller annan snabb signal för nya Commerce-orders i Selios partnerupplägg?
- Hur ofta får Selio poll:a `commerce_orders`?
- Är rekommenderad polling 5-15 minuter tillräckligt för Selios dubbelsälj-löfte?
- Kan Selio läsa `FB_PROCESSING` för tidig reservation?
- När är en order tillräckligt stabil för att markera vara som såld?
- Måste Selio acknowledge:a orders för att få korrekt orderflöde?

### Hur ska en såld vara tas bort från Meta?

Meta-kataloger används ofta på flera ytor. Delete kan ha andra konsekvenser än att bara gömma en Marketplace-listning.

Behöver verifieras:

- Ska Selio använda `availability: out of stock`, `status: archived` eller `DELETE` när varan säljs utanför Meta?
- Hur snabbt slår ändringen igenom i Marketplace?
- Finns risk att en köpare kan köpa under tiden batchen bearbetas?
- Behöver Selio visa “väntar på Meta” tills batchstatus är klar?
- Finns idempotens eller rekommenderad retry-strategi för `items_batch`?

## Auth och kontokoppling

### Vilket onboardingflöde ska användas?

Meta Commerce Platform har flera spår för app, system user, asset assignment, test commerce accounts, App Review och platform onboarding.

Behöver verifieras:

- Ska Selio använda Meta Business Extension, Commerce Manager Redirect Onboarding eller annat platform onboarding-flöde?
- Hur automatiserar Selio steg 2-5 i Metas API setup för många butiker?
- Vilka asset-id:n behöver sparas?
- Kan butiken välja befintlig katalog?
- Ska Selio skapa en ny katalog per butik?
- Hur hanteras testkonto kontra skarp butik?

### Vilka tokens ska Selio använda?

Meta rekommenderar system user-token för Commerce API.

Behöver beslutas/verifieras:

- Ska Selio lagra system user-token per butik, eller per Selio/partner med asset access?
- Hur roteras tokens?
- Vilka tokens används före respektive efter App Review?
- Hur upptäcker Selio att token saknar asset access?
- Hur kopplar användaren bort Selio från Meta?

### Vilka Selio-roller får göra vad?

Behöver produktbeslut:

- Får alla butiksmedlemmar lista på Meta?
- Krävs ägare eller särskild roll för att ansluta eller koppla från Meta?
- Krävs särskild roll för att publicera, uppdatera eller arkivera listningar?
- Hur visas vem som publicerade en vara?

## API-behörighet och drift

### Vilken Graph API-version ska användas?

Dokumentationen visar olika versioner i exempel.

Behöver verifieras:

- Vilken Graph API-version är aktuell vid implementation?
- Finns Marketplace Partner Item/Seller endpoints i den versionen?
- Är `v20.0` fortfarande rekommenderad för Marketplace Partner API, eller bara gammalt exempel?
- Finns versionerade breaking changes för order fields, batchstatus eller seller API?

### Räcker rate limits?

Dokumentationen anger:

- Item API: max 30 calls per minut, upp till 300 items per batch.
- Seller API: max 200 calls per timme, upp till 5000 sellers per batch.

Behöver verifieras:

- Gäller rate limits per app, katalog, business eller access token?
- Finns separata rate limits för Order API?
- Hur påverkas Selio av många butiker med små unika lager?
- Hur länge tar batchbearbetning normalt?
- Vilken retry/backoff rekommenderar Meta?

## Listingdata och mappning

### Vilka fält är obligatoriska för svenska Marketplace-varor?

Item API har generella produktfält, men lokala Marketplace-regler kan påverka.

Behöver verifieras:

- Räcker `condition`, eller krävs mer specifikt `partner_product_condition`?
- Krävs `fb_product_category` för distribution?
- Vilka kategorier passar svenska second hand-varor?
- Hur anges VMB-relevant information, om alls?
- Måste pris alltid vara `SEK` för `partner_item_country: SE`?
- Kan Selios publika varusida användas som `link` och `partner_product_checkout_uri`?

### Hur ska Selio-kategorier mappas till Meta?

Behöver beslutas:

- Ska mapping sparas per Selio-kategori?
- Ska användaren välja Meta/Facebook-kategori varje gång först, och sedan spara förslag?
- Ska AI föreslå kategori och attribut?
- Hur hanterar vi när Meta ändrar kategori- eller attributstruktur?

### Hur ska attribut mappas?

`partner_attribute_data` har många nycklar som kan passa mode, möbler, elektronik och samlarobjekt.

Behöver verifieras:

- Vilka attribut visas faktiskt på Marketplace?
- Vilka attribut påverkar sök och filtrering?
- Hur anges storlek, färg, material, stil, varumärke och vintage?
- Är fria värden accepterade, eller finns per-kategori-regler som inte syns i Item API-sidan?

### Hur ska bilder skickas?

Meta kräver URL:er, inte direkt bilduppladdning i Item API-exemplet.

Behöver verifieras:

- Måste bilderna vara publikt åtkomliga utan auth?
- Hur länge måste bild-URL:er vara stabila?
- Accepterar Meta Selios bild-CDN/signade URL:er?
- Är max 8 MB och minst 500 x 500 px tillräckligt för alla kategorier?
- Hur snabbt hämtar Meta bilder efter batch?
- Hur hanteras bildordning för `additional_image_link`?

## Format, pris och försäljningsregler

### Ska MVP stödja auktion?

Item API nämner `partner_listing_type: auction`, men Selio bör troligen börja med fast pris.

Produktfrågor:

- Är auktion tillgängligt för Marketplace Partner i Sverige?
- Hur upptäcks bud?
- Kan en auktion arkiveras om varan säljs i fysisk butik?
- Krävs `partner_auction_bid_close_time` och andra fält?
- Är auktion förenligt med Selios dubbelsälj-löfte?

### Hur ska pris synkas?

Behöver beslutas:

- Om pris ändras i Selio efter publicering, ska Meta uppdateras automatiskt?
- Ska användaren få bekräfta prisändring till Meta?
- Hur visas batchstatus efter prisuppdatering?
- Vad händer om Meta avvisar prisändring men Selio-priset är ändrat?

### Hur ska lager hanteras för unika varor?

Selio-varor är normalt unika.

Behöver beslutas:

- Ska Meta-listningen alltid ha ett separat item-id per Selio-vara?
- Ska Selio använda `availability` eller Commerce inventory fields för quantity?
- Hur hanteras retur eller avbruten order?
- Om order avbryts i Meta, ska varan automatiskt återaktiveras i Selio?

## Order och efterköp

### Vilken orderdata behöver Selio spara?

Behöver beslutas:

- Ska Selio bara markera varan såld, eller också spara full orderinformation?
- Ska köparinformation sparas?
- Behöver detta påverka GDPR-rutiner?
- Ska Meta-order synas i Selios ordervy senare?
- Ska Selio acknowledge:a, hantera fulfillment, frakt och returer?

### Hur matchas Meta-order mot Selio-vara?

Behöver verifieras:

- Är `retailer_id` alltid samma som produktens `id` från Item API?
- Kan en order innehålla flera Selio-varor?
- Kan orderrader sakna produktkoppling?
- Hur hanteras manuella ändringar i Commerce Manager?

## Fel, återförsök och datakonsistens

### Hur ska Selio hantera batch warnings?

Meta kan returnera warnings utan att hela batchen misslyckas.

Behöver beslutas:

- Vilka warnings ska blockera publicering i Selio?
- Vilka warnings ska bara visas i historiken?
- Ska användaren kunna publicera igen efter korrigering?
- Hur sparas `handle` och felrad för support?

### Hur ska retry fungera?

Behöver beslutas:

- Vilka fel ska retryas automatiskt?
- Hur många gånger?
- Ska användaren kunna trycka `Försök igen`?
- Hur undviker vi dubbla Meta-items vid timeout efter lyckad publicering?
- Kan item `id` användas som idempotensnyckel?

### Hur ska Selio upptäcka manuella ändringar i Meta?

Butiken kan ändra produkter direkt i Commerce Manager.

Behöver beslutas:

- Ska Selio läsa tillbaka catalog item-status periodiskt?
- Ska manuella Meta-ändringar skrivas tillbaka till Selio?
- Ska Selio bara visa varning: “Ändrad utanför Selio”?
- Vad händer om användaren arkiverar listning i Commerce Manager men varan fortfarande är aktiv i Selio?

## Juridik, policy och användarförtroende

### Vad tillåter Meta kring second hand-butiker?

Behöver verifieras:

- Är svenska second hand-butiker tillåtna som Marketplace Partner-säljare?
- Finns policybegränsningar för använda varor, vintage, märkesvaror, elektronik, barnprodukter eller möbler?
- Kräver Meta särskilda retur- eller fraktvillkor?
- Hur hanteras counterfeit-risk för märkesvaror?

### Vilken text behöver användaren godkänna?

Behöver beslutas:

- Ska Selio visa att publicering kan styras av Metas regler och granskning?
- Ska användaren bekräfta att varudata och bilder får skickas till Meta?
- Ska publiceringsdialogen visa “Du publicerar nu via Meta Commerce som <shop>”?
- Hur tydlig ska fallback vara om Marketplace-distribution inte är garanterad?

## Rekommenderade frågor till Meta

Skicka dessa till Meta eller partnerkontakt innan skarp implementation:

1. Kan Selio ansöka om Marketplace Partner-åtkomst för Sverige och svenska butiker?
2. Stödjer Marketplace Partner Item API `partner_item_country: SE` för Selios produktkategorier?
3. Är Item API/Seller API-exemplen med `v20.0` fortfarande rekommenderade, eller ska en nyare Graph-version användas?
4. Vilket onboardingflöde rekommenderas för en plattform som hanterar många små butiker?
5. Vilka behörigheter och app review-steg krävs för produktion?
6. Hur ska Selio skapa eller ansluta Commerce-konto och katalog per butik?
7. Hur begär och följer Selio Marketplace-godkännande för varje butik?
8. Hur snabbt slår `availability: out of stock`, `status: archived` och `DELETE` igenom i Marketplace?
9. Vilken metod rekommenderar Meta för att undvika dubbelsälj av unika varor?
10. Finns webhook eller snabbare ordernotifiering än polling?
11. Vilka orderstatusar ska Selio använda för reservation respektive slutlig såld-markering?
12. Krävs acknowledgement eller fulfillment-integration för att använda Order API korrekt?
13. Hur fungerar rate limits för många butiker och små batchar?
14. Hur bör Selio hantera manuella ändringar i Commerce Manager?
15. Vilka bild-URL-regler gäller för åtkomst, cache och livslängd?

## Rekommenderade interna produktbeslut

Innan kodstart bör Selio bestämma:

- Om Meta ska vara en riktig automatiserad kanal bara vid partneråtkomst, eller en manuell kanal i MVP.
- Om UI ska säga `Meta`, `Meta Marketplace`, `Facebook Marketplace` eller `Meta Commerce`.
- Om MVP bara ska stödja fast pris.
- Om Meta-order ska bli full orderdata i Selio eller bara säljsignal i första versionen.
- Hur aggressivt Selio ska retrya lageruppdateringar.
- Om Selio ska tillåta publicering när Marketplace-godkännande är `IN_REVIEW`.
- Hur mycket manuella Meta-ändringar ska synkas tillbaka.
