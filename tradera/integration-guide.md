# Integrationsguide för Tradera API

Det här dokumentet beskriver hur Selio kan byggas mot Tradera API utifrån den research som finns i `tradera_api.md`, Tradera-dokumentationen och OpenAPI-specifikationen för REST v4.

## API-val

Tradera har två API-spår:

- REST API v4: rekommenderas för nya integrationer, JSON över HTTP, markerat som beta.
- SOAP API v3: äldre och stabilt, med fler historiska exempel.

För Selio bör REST v4 vara förstahandsvalet, eftersom det är Traderas rekommenderade väg för nya integrationer och mappar bättre mot moderna backend-actions. SOAP bör hållas som fallback om någon kritisk funktion saknas eller beter sig osäkert i REST v4.

## Bas-URL och autentisering

REST v4 använder:

```text
https://api.tradera.com/v4/
```

Alla requests kräver applikationsheaders:

```text
X-App-Id: <selio_tradera_app_id>
X-App-Key: <selio_tradera_app_key>
```

Endpoints som agerar åt en användare kräver också:

```text
X-User-Id: <tradera_user_id>
X-User-Token: <tradera_user_token>
```

`X-App-Id` och `X-App-Key` tillhör Selios Tradera-applikation. `X-User-Id` och `X-User-Token` tillhör butikens anslutna Tradera-konto.

## Developer Program och aktivering

Innan implementation behöver Selio:

1. Tradera developer account.
2. Registrerad Tradera-applikation.
3. `AppId` och `AppKey`.
4. Accept URL och Reject URL för tokenflöde.
5. Bekräftelse från Tradera om RestrictedService/listing endpoints kräver särskild aktivering även vid REST v4.
6. Eventuell rate limit-höjning.
7. Eventuell Push API-aktivering.

Dokumentationen nämner att RestrictedService-metoder i SOAP kräver aktivering av Tradera. Det behöver verifieras om motsvarande gäller REST v4 endpoints under `/v4/listings`.

## Ansluta butikens Tradera-konto

Tradera-token kopplas till en Tradera-användare. I Selio bör den sparas på butikens kanalinställning.

Rekommenderad datamodell, konceptuellt:

- `shopId`
- `provider`: `tradera`
- `traderaUserId`
- `traderaAlias`, om vi kan hämta det
- `encryptedUserToken`
- `hardExpirationTime`
- `connectionStatus`
- `lastSuccessfulSyncAt`
- `defaultListingType`
- `defaultPaymentOptionIds`
- `defaultShippingOptions`
- `defaultAcceptedBuyerId`
- `hasTraderaShop`, om det kan verifieras

Token ska lagras krypterat eller i ett secrets-lager, inte som vanlig läsbar data. Token ska behandlas som lösenord.

## Tokenflöde

Tradera-dokumentationen beskriver ett token login-flöde:

1. Selio skapar en sessionsspecifik secret key.
2. Selio redirectar användaren till Tradera token login:

```text
https://api.tradera.com/token-login?appId=<APP_ID>&pkey=<PUBLIC_KEY>&skey=<SESSION_SECRET>
```

3. Användaren loggar in och godkänner Selio.
4. Tradera skickar tillbaka användaren till Selios accept URL eller visar bekräftelse beroende på appinställning.
5. Selio hämtar token via `POST /v4/auth/token` eller motsvarande `FetchToken`-flöde.

REST endpoint:

```http
POST /v4/auth/token
```

Request body enligt OpenAPI:

```json
{
  "userId": 123456,
  "secretKey": "session-specific-secret"
}
```

Response enligt OpenAPI:

```json
{
  "authToken": "token",
  "hardExpirationTime": "2026-..."
}
```

Öppen fråga: exakt hur `userId` erhålls i rekommenderat redirect-flöde om token inte skickas direkt i URL:en. Dokumentationen beskriver flera alternativ och behöver verifieras praktiskt.

## Referensdata

Selio behöver cachea referensdata för att kunna bygga bra formulär och validera innan publicering.

Relevanta endpoints:

- `GET /v4/categories`
- `GET /v4/categories/{categoryId}/attribute-definitions`
- `GET /v4/reference-data/accepted-bidder-types`
- `GET /v4/reference-data/expo-item-types`
- `GET /v4/reference-data/item-types`
- `GET /v4/reference-data/counties`
- `GET /v4/reference-data/item-field-values`
- `GET /v4/reference-data/shipping-options`
- `GET /v4/listings/shop-settings`
- `GET /v4/users/me`
- `GET /v4/users/me/payment-options`

Kategorier och attribut bör synkas periodiskt och kunna uppdateras manuellt från kanalinställningar. Eftersom Tradera-kategorier inte matchar Selios butikstaxonomi bör Selio ha en separat mapping från Selio-kategori till Tradera-kategori.

## Listing: vanlig Tradera-listning

Endpoint:

```http
POST /v4/listings/items
```

Auth:

```text
User+Seller
```

Body enligt OpenAPI `ItemRequest` innehåller bland annat:

- `title`
- `ownReferences`
- `categoryId`
- `duration`
- `restarts`
- `startPrice`
- `reservePrice`
- `buyItNowPrice`
- `description`
- `paymentOptionIds`
- `shippingOptions`
- `acceptedBidderId`
- `expoItemIds`
- `customEndDate`
- `itemAttributes`
- `itemType`
- `autoCommit`
- `vat`
- `shippingCondition`
- `paymentCondition`
- `campaignCode`
- `descriptionLanguageCodeIso2`
- `attributeValues`
- `restartedFromItemId`

Response:

```json
{
  "requestId": 123,
  "itemId": 456
}
```

Tradera behandlar listning asynkront. Selio ska därför inte markera listningen som publicerad direkt efter `POST`. Status ska vara `vantar_pa_tradera` tills resultat verifierats.

## Bilder för vanlig listning

För auktion/listing med bilder beskriver dokumentationen detta mönster:

1. Skicka item request med `autoCommit: false`.
2. Lägg till bilder via:

```http
POST /v4/listings/items/{requestId}/images
```

3. Slutför via:

```http
POST /v4/listings/items/{requestId}/commit
```

OpenAPI visar `AddItemImageRequest`. Tradera anger max bildstorlek 4 MB för shop item images. Vi bör anta samma eller liknande begränsning för alla listningsbilder tills verifierat.

Selio bör komprimera eller skala bilder innan upload om de är för stora.

## Listing: Tradera shop item

Endpoint:

```http
POST /v4/listings/shop-items
```

Auth:

```text
User+Seller
```

Body enligt OpenAPI `ShopItemData` innehåller bland annat:

- `activateDate`
- `acceptedBuyerId`
- `categoryId`
- `deactivateDate`
- `itemAttributes`
- `description`
- `paymentCondition`
- `price`
- `quantity`
- `absoluteQuantity`
- `shippingCondition`
- `title`
- `vat`
- `shippingOptions`
- `paymentOptionIds`
- `ownReferences`
- `itemImages`
- `externalId`
- `attributeValues`
- `descriptionLanguageCodeIso2`

För Selio bör `absoluteQuantity` normalt vara `1`, eftersom varje vara är unik. `externalId` bör användas om Tradera tillåter Selios interna product-id eller en stabil numerisk kanalreferens. `ownReferences` bör innehålla Selio-referens för enklare support och matchning.

Shop items kräver sannolikt aktiv Tradera-butik. Det behöver verifieras innan detta blir standardflöde.

## Kontrollera request-resultat

Endpoint:

```http
GET /v4/listings/request-results
```

Auth:

```text
User+Seller
```

OpenAPI `RequestResult`:

```json
{
  "requestId": 123,
  "resultCode": 1,
  "message": "..."
}
```

Selio ska spara `requestId` och poll:a request-results tills listningen är godkänd eller avvisad. `resultCode`-värdena behöver tolkas mot Traderas dokumentation eller empiriskt testas.

## Uppdatera aktiv listning

Vanlig listning:

```http
PUT /v4/listings/items/prices
```

Shop item:

```http
PUT /v4/listings/shop-items
PUT /v4/listings/shop-items/prices
PUT /v4/listings/shop-items/quantities
PUT /v4/listings/shop-items/activate-dates
```

För Selio MVP är det viktigaste inte full edit-synk, utan säker nedtagning. Prisändring kan stödjas tidigt men bör ha tydlig status och felhantering.

## Ta ned listning

Vanlig listning:

```http
DELETE /v4/listings/items/{itemId}
```

Shop item:

```http
DELETE /v4/listings/shop-items/{itemId}
```

När en vara säljs utanför Tradera ska Selio kalla rätt endpoint. Det bör ske som en backend-action med retry och audit trail, inte direkt från klienten.

Viktiga fall:

- Om Tradera returnerar OK, sätt kanalstatus till `borttagen`.
- Om Tradera tillfälligt felar, behåll intern såld status och schemalägg retry.
- Om Tradera nekar borttagning, sätt kanalstatus `fel` och visa användaren.
- Om listningen redan är stängd, behandla det som lyckad idempotent synk om API-svaret gör det möjligt att verifiera.

## Upptäcka köp på Tradera

Det finns tre möjliga spår:

### Push API

Tradera dokumenterar Push API via AWS SQS med mindre än 30 sekunders fördröjning. Event:

- `OrderCreated`: triggas när buyer confirms purchase, auction ends with winning bid, eller shop item is paid.
- `ItemClosed`: triggas när item listing ends.

Detta är den bästa matchningen för Selios “alltid i synk”-löfte, men kräver AWS SQS-setup och kontakt med `apiadmin@tradera.com`.

### Polling av orders

Endpoint:

```http
GET /v4/orders
```

Kan användas för att hämta säljarorder. Dokumentationen beskriver att SOAP `GetSellerOrders` kan användas med `LastUpdatedDate`; vi behöver verifiera motsvarande filter i REST v4.

### Polling av seller transactions eller updated seller items

Endpoints:

```http
GET /v4/listings/seller-transactions
GET /v4/listings/updated-seller-items
```

Kan vara fallback för att upptäcka förändringar. Detta är mindre direkt än Push API och påverkas av rate limits.

## Rate limits

Den sammanställda dokumentationen nämner 100 calls per 24 timmar som standard. Det är för lågt för snabb och pålitlig synk om flera butiker använder integrationen.

Selio behöver:

- Minimera polling.
- Cachea referensdata.
- Batcha där endpoints stödjer det.
- Begära rate limit-höjning från Tradera innan skarp lansering.
- Föredra Push API för orderhändelser.

## Backend-arkitektur i Selio

Rekommenderade byggblock:

- `traderaConnections`: butikens anslutna konto och tokenmetadata.
- `traderaListings`: koppling mellan Selio-vara och Tradera item/request.
- `traderaSyncEvents`: audit trail för actions, callbacks, polling och fel.
- Backend actions för externa API-anrop.
- Mutations för att uppdatera intern status efter verifierade API-resultat.
- Schemalagda jobb för request-result polling, tokenkontroll och fallback-orderpolling.

Externa API-anrop ska inte ligga direkt i query/mutation om de kräver nätverk. De bör köras i actions och sedan skriva resultat via mutations.

## Säkerhet och behörighet

- Endast användare med medlemskap i Selio-butiken får hantera butikens Tradera-koppling.
- Endast backend ska ha åtkomst till App Key och användartoken.
- Token ska aldrig skickas till klienten.
- Kanalåtgärder som publicering och nedtagning ska loggas.
- Publicering ska kräva tydlig bekräftelse.
- Automatiska åtgärder efter försäljning ska vara transparenta i historiken.

## Föreslagen implementation i steg

### Steg 1: Förberedelser

- Registrera Tradera developer app.
- Bekräfta REST v4-behörighet för listings.
- Bestäm redirect URLs.
- Lägg till miljövariabler för AppId/AppKey.
- Skapa datamodell för koppling, listningar och synkhändelser.

### Steg 2: Anslut konto

- Bygg `Anslut Tradera`.
- Implementera token login callback.
- Spara token säkert.
- Hämta `GET /v4/users/me` och visa anslutet konto.

### Steg 3: Referensdata

- Hämta kategorier och attribute definitions.
- Hämta payment/shipping/reference data.
- Bygg inställningsvy för standardvärden.

### Steg 4: Manuell publicering

- Lägg till `Lista på Tradera` på varusidan.
- Bygg granskningsformulär.
- Skicka listing request.
- Spara request-id och poll:a request-results.
- Visa publicerad status eller fel.

### Steg 5: Nedtagning vid försäljning

- Koppla `markProductSold`-flöde till Tradera-nedtagning.
- Lägg till retry och audit trail.
- Visa varning om nedtagning misslyckas.

### Steg 6: Tradera till Selio

- Börja med polling om Push API inte är klart.
- Matcha order/item-id mot intern vara.
- Markera vara som såld.
- Senare: ersätt eller komplettera med Push API via SQS.

## Saker att inte göra i MVP

- Automatisk publicering av alla nya varor.
- Automatisk auktion/prisoptimering.
- Budgivningsautomation.
- Köpfunktioner som buyer.
- Feedback-automation.
- Full fraktetikettshantering.
- Avancerad kampanjhantering.
