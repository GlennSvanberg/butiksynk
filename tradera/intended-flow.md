# Avsedd användar- och systemflow

Det här dokumentet beskriver hur Tradera-listning ska fungera i Selio ur butikens och systemets perspektiv. Målet är att publicering ska vara enkel och kontrollerad, medan synk efter publicering ska ske automatiskt så långt Tradera API tillåter.

## Målbild

En butik ska kunna skapa en vara i Selio, välja att lista den på Tradera, granska Tradera-specifika fält och sedan publicera. Varan ska därefter vara kopplad till en Tradera-listning. Om varan säljs någon annanstans ska Selio ta ned Tradera-listningen. Om varan säljs på Tradera ska Selio markera varan som såld och ta bort den från andra aktiva kanaler.

Selio ska inte publicera nya varor på Tradera automatiskt när de skapas. Användaren ska alltid förstå när en bindande eller publik åtgärd sker på Tradera.

## Roller och ägarskap

Tradera-kopplingen bör ligga på butiksnivå, inte bara på en enskild Selio-användare. En Selio-användare kan vara medlem i en butik, men Tradera-listningar ska ske via butikens anslutna Tradera-säljarkonto.

Det innebär:

- En butiksägare eller behörig administratör ansluter butikens Tradera-konto.
- Selio sparar Tradera `userId`, användartoken, token-expiration och integrationsinställningar kopplat till Selio-butiken.
- Alla administratörer med rätt behörighet i Selio kan lista varor via den anslutna Tradera-kopplingen.
- I UI bör det vara tydligt vilket Tradera-konto butiken är ansluten till.

## Första anslutning

1. Användaren går till butikens kanalinställningar i Selio.
2. Användaren väljer `Anslut Tradera`.
3. Selio skapar en sessionshemlighet för Tradera token login-flödet.
4. Användaren skickas till Tradera och loggar in.
5. Användaren godkänner Selio som integration.
6. Tradera skickar tillbaka användaren till Selio, eller så hämtar Selio token via `POST /v4/auth/token` eller motsvarande tokenflöde.
7. Selio sparar anslutningen säkert.
8. Selio hämtar grunddata som kategorier, attribut, betalningsalternativ, fraktalternativ och eventuellt butikens Tradera-inställningar.

Efter anslutning bör Selio visa:

- Tradera-konto eller alias om API:et ger det.
- Tokenstatus och utgångstid.
- Om kontot verkar ha säljarbehörighet.
- Om kontot har aktiv Tradera-butik, om shop items ska stödjas.
- Senaste lyckade synk.

## Lista en vara på Tradera

1. Användaren öppnar en vara i Selio.
2. UI visar kanalstatus för Tradera, till exempel `Ej listad`.
3. Användaren klickar `Lista på Tradera`.
4. Selio öppnar en granskningsvy med förifyllda fält från varan:
   - Titel.
   - Beskrivning.
   - Pris.
   - Bild eller bilder.
   - Skick och andra attribut.
   - Selio-kategori och föreslagen Tradera-kategori.
5. Användaren kompletterar Tradera-specifika val:
   - Listningsformat.
   - Tradera-kategori.
   - Attribut som krävs för kategorin.
   - Betalningsalternativ.
   - Fraktalternativ.
   - Startdatum eller aktiveringsdatum om relevant.
6. Selio validerar lokalt så mycket som möjligt.
7. Användaren bekräftar publicering.
8. Selio skickar listningsförfrågan till Tradera.
9. Selio sparar Tradera `requestId`, eventuell preliminär `itemId` och status `vantar_pa_tradera`.
10. Selio pollar `GET /v4/listings/request-results` tills Tradera har behandlat förfrågan.
11. När Tradera bekräftar publicering sparar Selio Tradera `itemId`, kanalstatus `publicerad` och publiceringstid.
12. Om Tradera avvisar listningen sparar Selio status `fel`, felmeddelande och visar vad användaren behöver rätta.

## Rekommenderat första listningsformat

För Selios målgrupp är varje vara normalt ett unikt lagerobjekt. Därför bör första versionen behandla varje Selio-vara som kvantitet `1`.

Det finns två möjliga startspår:

- Vanlig Tradera-listning med fast pris eller auktion via `POST /v4/listings/items`.
- Tradera shop item via `POST /v4/listings/shop-items`, om säljaren har aktiv Tradera-butik.

Vanlig listning är troligen bäst för första MVP eftersom fler säljare kan använda den. Shop items kan ge bättre lagerkontroll via quantity endpoints, men kräver att säljaren har aktiv Tradera-butik.

## När varan säljs i Selio eller annan kanal

När en vara markeras som såld i Selio, i kundbutiken, i fysisk butik eller i en framtida kanal ska Selio behandla Tradera som en aktiv kanal som måste stängas.

Avsedd ordning:

1. Selio markerar varan som reserverad eller såld internt så att den inte kan säljas igen i Selio.
2. Selio ser om varan har aktiv Tradera-listning.
3. Selio skickar borttagningsanrop till Tradera:
   - `DELETE /v4/listings/items/{itemId}` för vanlig listning.
   - `DELETE /v4/listings/shop-items/{itemId}` för shop item.
4. Selio sparar en synkhändelse med status `borttagning_skickad`.
5. Selio verifierar resultatet med seller item endpoints, request result eller senare push/poll.
6. När Tradera bekräftar att listningen är avslutad sätts kanalstatus till `borttagen` eller `saljd_annanstans`.
7. Om borttagning misslyckas ska varan ligga kvar som såld i Selio men kanalstatus bli `fel`, med tydlig varning till användaren.

Viktigt: det behöver verifieras vad Tradera tillåter om en auktion redan har bud. Selio får inte lova att en auktion alltid kan avslutas om Tradera har regler som blockerar detta.

## När varan säljs på Tradera

När Tradera signalerar köp eller order ska Selio markera varan som såld så snabbt som möjligt.

Önskad ordning:

1. Selio tar emot snabb signal från Tradera, helst Push API `OrderCreated`.
2. Selio matchar Tradera `ItemId` mot intern kanalrad.
3. Selio markerar varan som såld med källa `tradera`.
4. Selio sparar order-id, Tradera item-id, tidpunkt och eventuell köpesumma.
5. Selio tar bort eller inaktiverar varan från Selios publika kundbutik.
6. Selio skickar borttagnings-/lageruppdatering till andra framtida kanaler.
7. UI visar att varan såldes via Tradera.

Om Push API inte är tillgängligt i första versionen krävs polling av `GET /v4/orders`, `GET /v4/listings/seller-transactions` eller `GET /v4/listings/updated-seller-items`. Polling kan ge sämre synkhastighet och påverkas av rate limits.

## Rekommenderade kanalstatusar

För varje Selio-vara bör Tradera-status ligga separat från varans basstatus.

- `ej_listad`: Ingen Tradera-koppling finns.
- `utkast`: Användaren har börjat skapa Tradera-listning men inte publicerat.
- `vantar_pa_tradera`: Selio har skickat en request till Tradera men inväntar resultat.
- `publicerad`: Tradera har bekräftat en aktiv listning.
- `borttagning_skickad`: Selio har försökt ta ned listningen och väntar på bekräftelse.
- `borttagen`: Listningen är avslutad eller borttagen på Tradera.
- `saljd_pa_tradera`: Tradera har rapporterat köp/order.
- `saljd_annanstans`: Varan såldes utanför Tradera och Tradera-listningen har tagits ned.
- `fel`: Något misslyckades och kräver användaråtgärd.

## Synkhändelser

Utöver senaste status bör Selio spara händelser för felsökning och support.

Exempel på händelser:

- `tradera_account_connected`
- `listing_draft_created`
- `listing_submit_requested`
- `listing_request_queued`
- `listing_published`
- `listing_rejected`
- `remove_requested`
- `remove_confirmed`
- `remove_failed`
- `order_detected`
- `product_marked_sold_from_tradera`
- `token_expired`

Händelser bör innehålla tidsstämpel, Selio shop-id, Selio product-id, Tradera item-id/request-id om tillgängligt, status, felmeddelande och rå referens till API-resultat där det är säkert att lagra.

## UI-konsekvenser

I varulistan bör användaren kunna se om en vara är listad på Tradera och om synken är frisk. På varusidan bör användaren kunna:

- Lista på Tradera.
- Öppna Tradera-listningen.
- Ta ned från Tradera.
- Se senaste synkstatus.
- Se fel från Tradera och rätta fält.

I kanalinställningar bör användaren kunna:

- Ansluta Tradera.
- Koppla från Tradera.
- Se anslutet konto.
- Sätta standardvärden för betalning, frakt, listningsformat och beskrivningsmall.
- Uppdatera kategori- och referensdata.

## Felhantering

Fel från Tradera ska inte gömmas. Selio bör översätta vanliga fel till begriplig svenska, men även spara tekniska detaljer för support.

Exempel:

- Saknad Tradera-kategori.
- Bilden är för stor.
- Token har gått ut.
- Butiken saknar säljarbehörighet.
- Listningen kan inte avslutas eftersom Tradera-regler hindrar det.
- Rate limit har uppnåtts.
- Tradera REST v4 svarade med oväntad payload.

## MVP-gräns

Första versionen bör inte försöka lösa alla Tradera-format. En rimlig MVP:

- Anslut Tradera-konto per Selio-butik.
- Lista en aktiv Selio-vara manuellt på Tradera.
- Spara Tradera item-id och kanalstatus.
- Ta ned Tradera-listning när varan markeras såld i Selio.
- Hämta order/purchase-signal med polling tills Push API är bekräftat.
- Visa tydliga fel och låt användaren försöka igen.

Push API, full orderhantering, fraktetiketter, feedback och avancerad kampanjhantering kan komma senare.
