# Integrationsguide för Meta Marketplace API

Det här dokumentet beskriver hur Selio kan byggas mot Meta Marketplace och Meta Commerce Platform utifrån aktuell Meta-dokumentation.

## API-val

Det finns inte ett öppet, generellt API för att publicera vanliga personliga Facebook Marketplace-annonser åt en användare. För Selios mål, automatiserad publicering och lagerstatus för butiker, är det relevanta spåret:

- Meta Commerce Platform för Commerce-konto, katalog, order och behörigheter.
- Marketplace Partner Item API för att skapa, uppdatera och ta bort produkter i Marketplace-katalog.
- Marketplace Partner Seller API för att skapa, uppdatera och ta bort säljarinformation.
- Marketplace Approval API för att begära och följa Marketplace-godkännande.

Meta Content Library API ska inte användas för Selios kanalpublicering. Det är ett research/read-only-spår för att söka publika Marketplace-listningar.

## Bas-URL och versioner

Meta använder Graph API:

```text
https://graph.facebook.com/<version>/
```

Aktuell dokumentation visar olika versioner i exempel:

- Marketplace Partner Item API och Seller API visar `v20.0`.
- Order API-exempel visar `v25.0`.
- Marketplace Approval API-sidan är uppdaterad 2025-12-04.

Selio bör inte hårdkoda version från researchdokumentet. Implementation ska välja aktuell stabil Graph API-version vid kodstart och verifiera att Marketplace Partner-endpoints finns där.

## Behörigheter och aktivering

Selio behöver först ett Meta Developer App- och Commerce Platform-upplägg. För produktion krävs App Review och, om Selio ska hantera flera butiker, ett platform/onboarding-spår.

Meta rekommenderar system user access token för Commerce API, eftersom vanliga användartokens kan sluta fungera om användaren ändrar lösenord eller förlorar åtkomst.

Relevanta behörigheter:

- `catalog_management` för att hantera kataloger.
- `business_management` för att hantera business assets.
- `commerce_manage_accounts` eller `commerce_account_read_settings`.
- `commerce_account_manage_orders` eller `commerce_account_read_orders` för orderflöden.

Selio behöver också bekräfta separat Marketplace Partner-åtkomst. Utan sådan åtkomst bör UI inte lova direktpublicering till Facebook Marketplace.

## Ansluta butikens Meta-konto

Till skillnad från Tradera bör kopplingen inte ses som “anslut personligt Facebook-konto”. Den bör ses som “anslut butikens Meta Commerce-konto”.

Rekommenderad datamodell, konceptuellt:

- `shopId`
- `provider`: `meta_marketplace`
- `metaBusinessId`
- `commerceMerchantSettingsId` eller motsvarande Commerce Manager-id
- `commerceAccountId` eller `cmsId`
- `productCatalogId`
- `partnerSellerId`
- `sellerName`
- `encryptedAccessToken` eller referens till säkert tokenlager
- `tokenType`: system user/page/user, beroende på slutligt flöde
- `connectionStatus`
- `marketplaceApprovalStatus`
- `marketplaceApprovalStatusDetails`
- `defaultDeliveryMethods`
- `defaultShippingType`
- `defaultReturnDetails`
- `lastSuccessfulSyncAt`

Token och Meta asset-id:n ska bara hanteras på backend. Klienten ska aldrig få rå access token.

## Onboardingflöde

Möjligt Selio-flöde om Selio får Commerce Platform/Marketplace Partner-åtkomst:

1. Butiksägare öppnar kanalinställningar i Selio.
2. Användaren väljer `Anslut Meta`.
3. Selio guidar användaren genom Meta Business/Commerce Manager-onboarding eller en Meta-godkänd platform onboarding.
4. Selio verifierar att app/system user har access till Commerce-konto, Page och produktkatalog.
5. Selio hämtar eller sparar `productCatalogId` och `cmsId`.
6. Selio skapar eller uppdaterar partner-säljare via Seller API.
7. Selio begär Marketplace-godkännande om säljaren ännu inte är godkänd.
8. Selio visar status: `inte_ansluten`, `testkonto`, `vantar_pa_godkannande`, `godkand`, `fel`.

## Marketplace Approval API

Marketplace Approval API används för att begära och kontrollera om en shop får sälja på Marketplace.

Begär godkännande genom att sätta `marketplace_approval_requested` på seller settings:

```http
POST /<version>/<MERCHANT_SETTINGS_ID>
```

Konceptuell payload:

```json
{
  "onsite_commerce_merchant": {
    "marketplace_approval_requested": true
  }
}
```

Kontrollera onboardingstatus via seller settings och fält som:

- `shop_setup`
- `payment_setup_status`
- `marketplace_approval_status`
- `marketplace_approval_status_details`

Viktiga statusar i dokumentationen inkluderar `WAITING_FOR_REVIEW`, `IN_REVIEW`, `ON_HOLD` och `APPROVED`.

Selio ska inte låta användaren publicera till Marketplace innan status är godkänd. Om status är `ON_HOLD` ska UI visa åtgärdspunkter från `marketplace_approval_status_details`.

## Seller API

Varje produkt måste ha en säljare. Säljaren skapas/uppdateras i produktkatalogen via:

```http
POST /v20.0/{product-catalog-id}/marketplace_partner_sellers_details
```

`requests` innehåller batchade operationer:

- `CREATE`
- `UPDATE`
- `DELETE`

Minsta viktiga fält:

- `seller_id`: stabilt partner-id som matchar produktens `partner_seller_id`.
- `seller_name`: namnet som visas på produkter.

Valfria fält:

- `seller_review_count`
- `seller_positive_ratings_pct`
- `seller_member_since`

Efter uppladdning returneras `session_id`. Status kontrolleras med:

```http
GET /v20.0/{product-catalog-id}/check_marketplace_partner_sellers_status?session_id={session_id}
```

Rate limit enligt dokumentationen: max 200 calls per timme, med upp till 5000 säljare per batch.

## Item API

Produkter skapas, uppdateras och tas bort via:

```http
POST /v20.0/{product-catalog-id}/items_batch
```

Parametrar:

- `item_type`: `PRODUCT_ITEM`
- `requests`: array av operationer

Metoder:

- `CREATE`
- `UPDATE`
- `DELETE`

Viktiga fält för Selio-varor:

- `id`: stabil unik Selio-referens, max 100 tecken.
- `title`: max 200 tecken, utan HTML.
- `description`: max 9999 tecken, utan HTML. Bara första 256 tecken visas direkt i Marketplace-listningen.
- `condition`: till exempel `used`, `used_like_new`, `used_good`, `used_fair`.
- `brand`: krävs, sätt `N/A` om saknas.
- `price`: format `100 SEK`.
- `availability`: `in stock` eller `out of stock`.
- `link`: mobilvänlig URL till publik Selio-vara.
- `image_link`: JPEG/PNG, minst 500 x 500 px, upp till 8 MB.
- `additional_image_link`: upp till 20 extra bild-URL:er.
- `partner_seller_id`: måste matcha Seller API.
- `partner_item_country`: `SE` för svenska butiker.
- `partner_listing_type`: normalt `fixed_price` i MVP.
- `partner_delivery_method`: `shipping`, `in_person` eller båda.
- `partner_item_latitude` och `partner_item_longitude`: krävs om `in_person` används.
- `partner_shipping_type`, `partner_shipping_cost`, `partner_shipping_speed`.
- `return_details`: bör styras av butikens standardvillkor.
- `partner_attribute_data`: färg, storlek, material, varumärke, vintage med mera.

För unika second hand-varor bör Selio skapa ett Meta-id per Selio-vara och behandla varje vara som ett exemplar. Om varan säljs ska `availability` uppdateras till `out of stock`, `status` sättas till `archived` eller produkten tas bort, beroende på vad Meta rekommenderar för Marketplace-distribution vid implementation.

Efter uppladdning returneras en `handle`. Status kontrolleras med:

```http
GET /v20.0/{product-catalog-id}/check_batch_request_status?handle={handle}
```

Rate limit enligt dokumentationen: max 30 calls per minut, med upp till 300 items per batch.

## Katalog- och lagersynk

Selio bör behandla Meta som ett asynkront katalogsystem:

1. Användaren skickar publicering från Selio.
2. Selio skapar eller uppdaterar Meta-item via `items_batch`.
3. Selio sparar `handle` och status `vantar_pa_meta`.
4. Schemalagt jobb pollar `check_batch_request_status`.
5. Vid lyckad status sätts kanalstatus `publicerad`.
6. Vid warnings sparas de för support och visas om de påverkar visning.
7. Vid errors sätts kanalstatus `fel` med begriplig svensk feltext.

För pris- och textändringar bör MVP kräva en tydlig användaråtgärd, till exempel `Uppdatera Meta-listning`. Lagerstatus vid försäljning ska däremot synkas automatiskt.

## När varan säljs utanför Meta

När en vara säljs i Selio, i kundbutiken, i fysisk butik eller i en framtida kanal ska Selio snabbt göra Meta-listningen otillgänglig.

Rekommenderad ordning:

1. Markera varan som såld internt.
2. Sätt Meta-kanalstatus till `borttagning_skickad` eller `uppdatering_skickad`.
3. Skicka `UPDATE` till Item API med `availability: "out of stock"` och eventuellt `status: "archived"`, eller `DELETE` om det är bekräftat som rätt Marketplace-beteende.
4. Spara sync event med handle.
5. Poll:a batchstatus.
6. Sätt status `arkiverad`, `borttagen` eller `fel`.

Eftersom Meta-kataloger kan användas för flera ytor bör Selio vara försiktig med hård delete innan Meta-rekommendationen är verifierad. För MVP är `out of stock` eller `archived` troligen säkrare än delete om målet är att undvika dubbelsälj.

## Upptäcka köp på Meta

Order API används för Commerce-orders:

```http
GET /v25.0/{CMS_ID}/commerce_orders
```

Viktiga filter/fält:

- `state`: standard är `CREATED` om det inte anges.
- `updated_after`
- `updated_before`
- `fields`: till exempel `id`, `order_status`, `items`, `channel`, `merchant_order_id`.

Orderstatusar i dokumentationen:

- `FB_PROCESSING`: Meta behandlar ordern. Den kan fortfarande avbrytas.
- `CREATED`: ordern är finaliserad och säljaren behöver bekräfta/acknowledge.
- `IN_PROGRESS`: ordern har bekräftats och flyttats till orderhantering.

För Selios dubbelsälj-risk bör `FB_PROCESSING` utredas som tidig reservationssignal. Men Selio får inte markera en vara permanent såld förrän det finns en tillräckligt stabil orderstatus.

Order items innehåller bland annat `retailer_id`, som bör matcha Selios Meta-item-id. Det är den viktigaste nyckeln för att koppla Meta-order till intern vara.

## Backend-arkitektur i Selio

Rekommenderade byggblock:

- `metaMarketplaceConnections`: butikens Commerce/Meta-koppling och tokenmetadata.
- `metaMarketplaceSellers`: partner-säljare kopplad till Selio-butik.
- `metaMarketplaceListings`: koppling mellan Selio-vara och Meta catalog item.
- `metaMarketplaceSyncEvents`: audit trail för API-anrop, batch handles, orderpolling och fel.
- Backend actions för Graph API-anrop.
- Mutations för att uppdatera intern status efter verifierade API-resultat.
- Schemalagda jobb för batchstatus, orderpolling, approvalstatus och tokenkontroll.

Externa API-anrop ska inte ligga direkt i query/mutation om de kräver nätverk. De bör köras i actions och sedan skriva resultat via mutations.

## Säkerhet och behörighet

- Endast användare med rätt roll i Selio-butiken får ansluta eller koppla från Meta.
- Endast backend ska ha åtkomst till Meta access tokens.
- System user-token ska lagras krypterat eller i secrets-lager.
- Kanalåtgärder som publicering, arkivering och ordermatchning ska loggas.
- Publicering ska kräva tydlig bekräftelse.
- Automatiska lageråtgärder efter försäljning ska vara synliga i historiken.

## Föreslagen implementation i steg

### Steg 1: Meta-kvalificering

- Avgör om Selio kan och ska ansöka om Meta Marketplace Partner/Commerce Platform-åtkomst.
- Verifiera vilka länder och produktkategorier som stöds för svenska second hand-butiker.
- Skapa Meta Developer App och test Commerce Account.
- Bekräfta Graph API-version och endpoint-åtkomst.

### Steg 2: Anslut konto

- Bygg `Anslut Meta` i kanalinställningar.
- Implementera Commerce onboarding eller dokumenterad manuell koppling till testkonto.
- Spara Commerce-konto, katalog och tokenmetadata säkert.
- Visa godkännandestatus i Selio.

### Steg 3: Säljare och katalog

- Skapa/uppdatera partner-säljare.
- Bygg mapping från Selio-vara till Meta produktfält.
- Validera bildformat, prisformat och obligatoriska fält.

### Steg 4: Manuell publicering

- Lägg till `Lista på Meta` på varusidan.
- Bygg granskningsformulär med Meta-specifika fält.
- Skicka `CREATE` via `items_batch`.
- Poll:a batchstatus.
- Visa publicerad status eller fel.

### Steg 5: Nedtagning vid försäljning

- Koppla Selios såld-flöde till Meta inventory/update.
- Sätt `out of stock` eller `archived` automatiskt.
- Lägg till retry och audit trail.

### Steg 6: Meta till Selio

- Poll:a `commerce_orders` med `updated_after`.
- Matcha `retailer_id` mot intern vara.
- Reservera eller markera vara såld beroende på orderstatus.
- Acknowledge order först om Selio ska bli en del av orderhanteringen.

## Saker att inte göra i MVP

- Lova stöd för privata Facebook Marketplace-annonser.
- Automatisk publicering av alla nya varor.
- Automatisk hantering av Meta-policyärenden.
- Full order fulfillment, frakt och returer.
- Betalnings- och utbetalningsbokföring för Meta.
- Optimering av annonser eller paid ads.
- Synk av manuella Marketplace-annonser som saknar API-koppling.
