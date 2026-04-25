# Avsedd användar- och systemflow

Det här dokumentet beskriver hur Meta Marketplace-listning kan fungera i Selio ur butikens och systemets perspektiv. Målet är att publicering ska vara enkel och kontrollerad, medan synk efter publicering ska ske automatiskt så långt Meta Commerce Platform tillåter.

## Målbild

En butik ska kunna skapa en vara i Selio, välja att lista den via Meta, granska Meta-specifika fält och sedan publicera. Varan ska därefter vara kopplad till ett Meta catalog item som kan distribueras till Marketplace om butiken är godkänd. Om varan säljs någon annanstans ska Selio sätta Meta-listningen som ej tillgänglig. Om varan säljs via Meta ska Selio markera varan som såld och ta bort den från andra aktiva kanaler.

Selio ska inte publicera nya varor på Meta automatiskt när de skapas. Användaren ska alltid förstå när en publik åtgärd sker på Meta.

## API-verklighet

Meta-flowet skiljer sig från Tradera-flowet. En vanlig användare kan inte bara ansluta ett privat Facebook Marketplace-konto och låta Selio skapa annonser där. Den realistiska automatiserade vägen är att butiken använder Meta Commerce Platform med katalog, Commerce Manager, Marketplace-godkännande och partneråtkomst.

Det betyder att Selio behöver visa kanalens tillgänglighet tydligt:

- `Ej tillgänglig`: Selio saknar Meta Partner/Commerce-åtkomst eller butiken saknar Commerce-konto.
- `Kan anslutas`: Selio och butiken har rätt förutsättningar för Commerce-onboarding.
- `Väntar på Meta`: butiken är ansluten men Marketplace-godkännande saknas.
- `Aktiv`: butiken är godkänd och kan publicera.
- `Fel`: Meta kräver åtgärd, till exempel policy, behörighet eller katalogfel.

## Roller och ägarskap

Meta-kopplingen bör ligga på butiksnivå, inte på en enskild Selio-användare.

Det innebär:

- En butiksägare eller behörig användare ansluter butikens Meta Commerce-konto.
- Selio sparar Commerce-konto, katalog, partner-säljare och tokenmetadata kopplat till Selio-butiken.
- Alla användare med rätt Selio-roll kan lista varor via butikens anslutna Meta-koppling.
- I UI bör det vara tydligt vilken Meta Business, katalog och shop som används.

## Första anslutning

1. Användaren går till butikens kanalinställningar i Selio.
2. Användaren väljer `Anslut Meta`.
3. Selio förklarar att integrationen kräver Meta Commerce/Marketplace-godkännande och inte gäller privata Marketplace-annonser.
4. Användaren går igenom Meta onboarding eller kopplar ett befintligt Commerce-konto enligt Metas godkända flöde.
5. Selio verifierar åtkomst till Commerce-konto, Page, katalog och nödvändiga behörigheter.
6. Selio skapar eller uppdaterar partner-säljare för butiken.
7. Selio begär eller kontrollerar Marketplace-godkännande.
8. Selio sparar anslutningen säkert.

Efter anslutning bör Selio visa:

- Meta Business eller shop-namn.
- Commerce-konto och produktkatalog.
- Marketplace-godkännandestatus.
- Om kontot är test eller produktion.
- Senaste lyckade synk.
- Eventuella blockerande Meta-issues.

## Lista en vara på Meta

1. Användaren öppnar en vara i Selio.
2. UI visar kanalstatus för Meta, till exempel `Ej listad`.
3. Användaren klickar `Lista på Meta`.
4. Selio öppnar en granskningsvy med förifyllda fält från varan:
   - Titel.
   - Beskrivning.
   - Pris i SEK.
   - Bild eller bilder.
   - Skick.
   - Varumärke, eller `N/A` om det saknas.
   - Publik Selio-länk.
5. Användaren kompletterar Meta-specifika val:
   - Leveranssätt: frakt, upphämtning eller båda.
   - Returvillkor.
   - Plats om upphämtning används.
   - Attribut som storlek, färg, material, stil och vintage.
6. Selio validerar lokalt så mycket som möjligt.
7. Användaren bekräftar publicering.
8. Selio skickar `CREATE` till Marketplace Partner Item API via `items_batch`.
9. Selio sparar batch `handle` och status `vantar_pa_meta`.
10. Selio pollar batchstatus tills Meta har behandlat förfrågan.
11. När Meta bekräftar uppladdning sparar Selio catalog item-id/retailer-id, kanalstatus `publicerad` och publiceringstid.
12. Om Meta returnerar fel sparar Selio status `fel`, felmeddelande och visar vad användaren behöver rätta.

## Rekommenderat första listningsformat

För Selios målgrupp är varje vara normalt ett unikt lagerobjekt. Därför bör första versionen:

- Använda `partner_listing_type: fixed_price`.
- Använda `availability: in stock` vid publicering.
- Använda ett stabilt `id` som matchar Selio-varans kanalreferens.
- Använda `partner_item_country: SE`.
- Undvika auktion tills regler, orderstatus och nedtagning är verifierade.

## När varan säljs i Selio eller annan kanal

När en vara markeras som såld i Selio, i kundbutiken, i fysisk butik eller i en framtida kanal ska Selio behandla Meta som en aktiv kanal som måste uppdateras.

Avsedd ordning:

1. Selio markerar varan som reserverad eller såld internt så att den inte kan säljas igen i Selio.
2. Selio ser om varan har aktiv Meta-listning.
3. Selio skickar `UPDATE` till Meta med `availability: out of stock` och eventuellt `status: archived`, eller `DELETE` om Meta rekommenderar delete för detta fall.
4. Selio sparar en synkhändelse med status `meta_update_skickad`.
5. Selio verifierar resultatet med batchstatus.
6. När Meta bekräftar sätts kanalstatus till `arkiverad`, `borttagen` eller `saljd_annanstans`.
7. Om uppdatering misslyckas ska varan ligga kvar som såld i Selio men kanalstatus bli `fel`, med tydlig varning till användaren.

## När varan säljs via Meta

När Meta Commerce rapporterar en order ska Selio markera varan som såld så snabbt som möjligt.

Önskad ordning:

1. Selio pollar Meta Order API med `updated_after` och relevanta orderstatusar.
2. Selio hämtar orderrader och matchar `retailer_id` mot intern Meta-listning.
3. Om orderstatus är tillräckligt stabil, markerar Selio varan som såld med källa `meta_marketplace`.
4. Selio sparar order-id, kanal, tidpunkt och eventuell köpesumma.
5. Selio tar bort eller inaktiverar varan från Selios publika kundbutik.
6. Selio skickar borttagnings-/lageruppdatering till andra framtida kanaler.
7. UI visar att varan såldes via Meta.

Öppen risk: `FB_PROCESSING` kan vara tidig nog för reservation men inte säkert nog för slutlig såld-markering. Det behöver verifieras mot Metas order lifecycle.

## Rekommenderade kanalstatusar

För varje Selio-vara bör Meta-status ligga separat från varans basstatus.

- `ej_listad`: Ingen Meta-koppling finns.
- `utkast`: Användaren har börjat skapa Meta-listning men inte publicerat.
- `vantar_pa_meta`: Selio har skickat batch request men inväntar resultat.
- `publicerad`: Meta har bekräftat catalog item och distribution är aktiv eller redo.
- `uppdatering_skickad`: Selio har försökt uppdatera listing/lager och väntar på bekräftelse.
- `arkiverad`: Varan är inte längre aktiv på Meta men posten finns kvar i kataloghistorik.
- `borttagen`: Varan har tagits bort från Meta-katalogen.
- `saljd_pa_meta`: Meta har rapporterat order/köp.
- `saljd_annanstans`: Varan såldes utanför Meta och Meta-listningen har inaktiverats.
- `fel`: Något misslyckades och kräver användaråtgärd.

## Synkhändelser

Utöver senaste status bör Selio spara händelser för felsökning och support.

Exempel på händelser:

- `meta_account_connected`
- `meta_marketplace_approval_requested`
- `meta_marketplace_approval_updated`
- `seller_create_requested`
- `seller_create_confirmed`
- `listing_draft_created`
- `listing_submit_requested`
- `listing_batch_queued`
- `listing_published`
- `listing_rejected`
- `inventory_update_requested`
- `inventory_update_confirmed`
- `inventory_update_failed`
- `order_detected`
- `product_marked_sold_from_meta`
- `token_expired`

Händelser bör innehålla tidsstämpel, Selio shop-id, Selio product-id, Meta catalog item-id eller retailer-id om tillgängligt, batch handle/session-id, status, felmeddelande och rå referens till API-resultat där det är säkert att lagra.

## UI-konsekvenser

I varulistan bör användaren kunna se om en vara är listad på Meta och om synken är frisk. På varusidan bör användaren kunna:

- Lista på Meta.
- Öppna Meta/Commerce Manager-referens om URL finns.
- Uppdatera Meta-listning.
- Ta ned eller arkivera från Meta.
- Se senaste synkstatus.
- Se fel från Meta och rätta fält.

I kanalinställningar bör användaren kunna:

- Ansluta Meta.
- Koppla från Meta.
- Se Commerce-konto, katalog och shop.
- Se Marketplace-godkännandestatus.
- Sätta standardvärden för leverans, upphämtning och returer.
- Testa katalogsynk.

## Felhantering

Fel från Meta ska inte gömmas. Selio bör översätta vanliga fel till begriplig svenska, men även spara tekniska detaljer för support.

Exempel:

- Selio saknar Marketplace Partner-åtkomst.
- Butiken är inte godkänd för Marketplace.
- System user-token saknar rätt asset access.
- Katalogen saknas eller är fel land.
- Säljaren saknas för produktens `partner_seller_id`.
- Bilden är för liten, för stor eller inte JPEG/PNG.
- Prisformatet är fel.
- `brand` saknas.
- `partner_item_country` matchar inte kataloglandet.
- Meta returnerar policyfel.
- Rate limit har uppnåtts.

## MVP-gräns

Första versionen bör inte försöka lösa alla Meta Commerce-funktioner. En rimlig MVP, om Meta godkänner Selio:

- Anslut Meta Commerce-konto per Selio-butik.
- Visa Marketplace-godkännandestatus.
- Lista en aktiv Selio-vara manuellt som fixed price.
- Spara Meta item-id/retailer-id och kanalstatus.
- Sätt Meta-listning som `out of stock` eller `archived` när varan markeras såld i Selio.
- Hämta Meta-orders med polling.
- Visa tydliga fel och låt användaren försöka igen.

Om Meta Partner-åtkomst inte är möjlig bör MVP i stället vara en manuell kanalmarkering: Selio kan lagra Marketplace-länk och påminna användaren att ta ned annonsen, men får inte beskrivas som automatisk synk.
