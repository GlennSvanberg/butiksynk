# Öppna frågor och risker

Det här dokumentet samlar frågor som behöver besvaras innan eller under implementation av Tradera-integrationen. Vissa är tekniska API-frågor, andra påverkar användarflöde, support, juridik och produktlöfte.

## Mest kritiska frågor

### Hur får Selio snabbast reda på att en vara köpts på Tradera?

Det viktigaste för “alltid i synk” är att Selio snabbt får veta när en Tradera-listning säljs.

Möjliga svar:

- Push API via AWS SQS verkar bäst och dokumenteras som under 30 sekunders fördröjning.
- Polling av `GET /v4/orders` kan fungera som första fallback.
- Polling av `GET /v4/listings/seller-transactions` eller `GET /v4/listings/updated-seller-items` kan vara kompletterande fallback.

Behöver verifieras:

- Är Push API tillgängligt för nya REST v4-integrationer?
- Kräver Push API separat godkännande per app?
- Skickas events för alla Tradera-användare som auktoriserat Selio?
- Innehåller `OrderCreated` alltid `ItemIds` som kan matchas mot Selio?
- Hur snabbt kan vi poll:a utan att slå i rate limits?
- Har REST `GET /v4/orders` filter för `lastUpdatedDate` eller liknande?

### Kan Selio alltid ta ned en Tradera-listning om varan säljs någon annanstans?

Selio vill kunna ta ned en vara från Tradera direkt när den säljs i fysisk butik eller annan kanal.

Behöver verifieras:

- Fungerar `DELETE /v4/listings/items/{itemId}` för alla vanliga listningar?
- Vad händer om auktionen redan har bud?
- Är reglerna olika för auktion, fast pris, auktion plus köp nu och shop item?
- Returnerar API:et tydliga felkoder om nedtagning inte är tillåten?
- Ska Selio hellre undvika auktionsformat i MVP för att minska dubbel-sälj-risk?

### Ska MVP använda vanlig listning eller shop item?

Vanliga listningar verkar mest tillgängliga. Shop items har tydligare lagerfunktioner men kräver troligen aktiv Tradera-butik.

Behöver verifieras:

- Kan alla säljarkonton skapa fixed price-listningar via `POST /v4/listings/items`?
- Vilket `itemType` motsvarar fast pris respektive auktion?
- Kräver `POST /v4/listings/shop-items` en betald/aktiv Tradera-butik?
- Kan en unik second-hand-vara som bara finns i ett exemplar representeras bra som shop item med `absoluteQuantity: 1`?
- Försvinner shop item automatiskt när quantity når 0?

## Auth och kontokoppling

### Hur exakt ska token login-flödet byggas?

Dokumentationen beskriver flera tokenalternativ.

Behöver verifieras:

- Vilket flöde rekommenderar Tradera för webbappar 2026?
- Ska Selio använda redirect plus `POST /v4/auth/token`?
- Hur får Selio `userId` om token inte skickas i redirect URL?
- Vad är `pkey` i token-login URL och var hämtas den?
- Behöver `skey` sparas temporärt och hur länge är den giltig?
- Hur hanteras reject/cancel?
- Kan en användare koppla om ett annat Tradera-konto till samma Selio-butik?
- Kan flera Selio-butiker använda samma Tradera-konto?

### Hur länge lever user token?

Behöver verifieras:

- Vad är normal `hardExpirationTime`?
- Finns refresh, eller måste användaren ansluta igen?
- Hur beter sig API:et när token gått ut?
- Ska Selio visa proaktiv varning innan token löper ut?

### Vilken behörighetsmodell ska Selio ha?

Behöver produktbeslut:

- Får alla medlemmar i en Selio-butik lista på Tradera?
- Krävs ägare eller särskild butiksroll för att ansluta eller koppla från Tradera?
- Krävs särskild roll för att publicera eller ta ned listningar?
- Hur visas vem som publicerade en vara?

## API-behörighet och drift

### Kräver REST listing endpoints särskild aktivering?

Dokumentationen säger att SOAP RestrictedService kräver aktivering av Tradera. REST v4 endpoints är märkta `User+Seller`, men det är oklart om appen också måste aktiveras manuellt.

Behöver fråga Tradera:

- Kräver `/v4/listings/*` separat aktivering?
- Kräver `/v4/orders/*` separat aktivering?
- Kräver Push API separat avtal/godkännande?
- Finns sandbox/testmiljö för listing utan riktig publicering?

### Räcker rate limits?

Sammanställningen nämner 100 calls per 24 timmar som standard.

Behöver verifieras:

- Gäller 100 calls per app, per användare eller per endpoint?
- Är REST v4 rate limit samma som SOAP?
- Hur begär Selio höjning?
- Vilken nivå behövs för MVP med exempelvis 10, 100 och 1000 butiker?
- Räknas push events mot rate limits?

## Listingdata och mappning

### Vilka fält är obligatoriska per listningstyp?

OpenAPI visar många fält men inte alltid tydliga required-markeringar.

Behöver verifieras:

- Minimikrav för vanlig fastprislistning.
- Minimikrav för auktion.
- Minimikrav för shop item.
- Maxlängd för titel, beskrivning, villkor och ownReferences.
- Prisformat: är `price`, `startPrice`, `buyItNowPrice` alltid heltal i SEK/öre eller SEK?
- Hur hanteras moms/VMB i Tradera-fältet `vat`?

### Hur ska Selio-kategorier mappas till Tradera-kategorier?

Selios taxonomi är butikens egen. Tradera kräver sin kategori och ofta attribut per kategori.

Behöver beslutas:

- Ska mapping sparas per Selio-kategori?
- Ska användaren välja Tradera-kategori varje gång först, och sedan spara förslag?
- Ska AI föreslå Tradera-kategori?
- Hur hanterar vi när Tradera ändrar kategori- eller attributstruktur?

### Hur ska attribut mappas?

Tradera har category attribute definitions och item attributes.

Behöver verifieras:

- Skillnaden mellan `itemAttributes` och `attributeValues`.
- Vilka attribut är obligatoriska?
- Hur anger man skick, storlek, färg, material och varumärke?
- Hur anges second-hand/vintage-specifika detaljer?
- Kan Selios befintliga attribut återanvändas direkt?

### Hur ska bilder skickas?

Behöver verifieras:

- Max antal bilder för vanlig listning.
- Max storlek per bild.
- Godkända bildformat.
- Om bilder ska skickas som URL, base64 eller multipart-liknande payload i REST.
- Om Tradera hämtar bilder från publika URL:er eller kräver upload av bytes.
- Hur bildordning styrs.

## Format, pris och försäljningsregler

### Vilka listningsformat ska Selio stödja först?

Tradera har bland annat auktion, köp nu, auktion plus köp nu och shop item.

Produktfrågor:

- Ska MVP bara stödja fast pris?
- Ska auktion döljas tills vi vet att nedtagning kan fungera säkert?
- Ska butiken kunna välja default per kategori?
- Ska Selio visa riskvarning för auktioner med bud?

### Hur ska pris synkas?

Behöver beslutas:

- Om pris ändras i Selio efter publicering, ska Tradera uppdateras automatiskt?
- Ska användaren få bekräfta prisändring till Tradera?
- Vad händer om pris inte kan ändras på grund av bud eller Tradera-regler?
- Ska Selio låsa prisändring när vara har aktiv auktion?

### Hur ska lager hanteras för unika varor?

Selio-varor är normalt unika.

Behöver beslutas:

- Ska alla Tradera-listningar skapas med quantity 1 där formatet stödjer det?
- Ska Selio tillåta flera exemplar på Tradera senare?
- Vad händer om shop item quantity manuellt ändras i Tradera?

## Order och efterköp

### Vilken orderdata behöver Selio spara?

Behöver beslutas:

- Ska Selio bara markera varan såld, eller också spara orderinformation?
- Ska köparinformation sparas?
- Behöver detta påverka GDPR-rutiner?
- Ska Tradera-order synas i Selios ordervy senare?
- Ska Selio hantera fraktetiketter eller bara länka till Tradera?

### När anses en Tradera-vara såld?

Tradera Push API `OrderCreated` triggas vid olika händelser: purchase confirmed, auction ends with winning bid, eller shop item paid.

Behöver verifieras:

- Är `OrderCreated` tillräckligt tidig för att stoppa andra kanaler?
- För shop item: triggas event först vid betalning, och kan varan då redan vara reserverad tidigare?
- Finns event vid bindande köp innan betalning?
- Hur hanteras accepterade prisförslag?

## Fel, återförsök och datakonsistens

### Hur ska Selio hantera delvis lyckade listningar?

Exempel: item request skapas men bilduppladdning misslyckas.

Behöver beslutas:

- Ska Selio kunna återuppta pending request?
- Ska Selio automatiskt avbryta om commit inte sker?
- Finns endpoint för att rensa pending requests?
- Hur länge kan en request ligga pending?

### Hur ska retry fungera?

Behöver beslutas:

- Vilka fel ska retryas automatiskt?
- Hur många gånger?
- Ska användaren kunna trycka `Försök igen`?
- Hur undviker vi dubbla Tradera-listningar vid timeout efter lyckad publicering?
- Kan `ownReferences` eller `externalId` användas för idempotens?

### Hur ska Selio upptäcka manuella ändringar i Tradera?

Butiken kan ändra eller ta bort listningar direkt på Tradera.

Behöver beslutas:

- Ska Selio poll:a `updated-seller-items`?
- Ska manuella Tradera-ändringar skrivas tillbaka till Selio?
- Ska Selio bara visa varning: “Ändrad utanför Selio”?
- Vad händer om användaren tar bort listning i Tradera men varan fortfarande är aktiv i Selio?

## Juridik, policy och användarförtroende

### Vad tillåter Tradera kring automation?

Dokumentationen tillåter seller tools, listing management och order workflows men förbjuder bland annat budautomatisering och sniping.

Selio bör:

- Aldrig automatisera bud.
- Aldrig publicera utan användarens tydliga åtgärd.
- Vara transparent med automatiska nedtagningar efter försäljning.
- Kontakta Tradera om osäkra automatiseringsfall.

### Vilken text behöver användaren godkänna?

Behöver beslutas:

- Ska Selio visa information om att publicering på Tradera kan innebära avgifter eller bindande villkor?
- Ska användaren bekräfta Tradera-villkor vid första anslutning?
- Ska publiceringsdialogen visa “Du publicerar nu på Tradera som <konto>”?

## Rekommenderade frågor till Tradera

Skicka dessa till `apiadmin@tradera.com` innan skarp implementation:

1. Är REST v4 listing endpoints redo för produktion trots beta-markering?
2. Kräver `/v4/listings/*` och `/v4/orders/*` separat aktivering?
3. Finns sandbox/testläge för att skapa listningar utan skarp publicering?
4. Vad är rekommenderat tokenflöde för en webbapp som Selio?
5. Hur länge lever user tokens och finns refresh?
6. Vilka rate limits gäller för REST v4, per app och per användare?
7. Hur ansöker vi om högre rate limits?
8. Är Push API via AWS SQS tillgängligt för Selio, och hur aktiveras det?
9. Vilka events skickas vid köp, bud, avslutad auktion, betald shop item och manuell borttagning?
10. Kan en vanlig auktion tas ned via API om den har bud?
11. Vilka listningsformat rekommenderar Tradera för unika second-hand-varor?
12. Kräver shop items aktiv Tradera-butik, och hur kan API:et kontrollera det?
13. Hur ska `itemType`, `itemAttributes` och `attributeValues` tolkas för de vanligaste kategorierna?
14. Finns idempotensstöd eller rekommenderad användning av `ownReferences`/`externalId`?
15. Vilka bildformat, storlekar och uppladdningsformat gäller för REST v4?

## Rekommenderade interna produktbeslut

Innan kodstart bör Selio bestämma:

- Om MVP ska stödja bara fast pris eller även auktion.
- Om shop item ska vara första formatet eller senare.
- Vilka Selio-roller som får ansluta, publicera och ta ned Tradera-listningar.
- Hur tydlig bekräftelsen vid publicering ska vara.
- Hur aggressivt Selio ska retrya nedtagning.
- Om Tradera-order ska bli full orderdata i Selio eller bara säljsignal i första versionen.
- Hur mycket manuella Tradera-ändringar ska synkas tillbaka.
