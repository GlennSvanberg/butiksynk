# Meta Marketplace-integration

Det här dokumentationspaketet beskriver en möjlig Meta Marketplace-integration för Selio. Målet är att en butik ska kunna ansluta sitt Meta Commerce-upplägg, publicera utvalda varor till Meta och hålla lagerstatus synkad så att en unik vara inte säljs två gånger.

Viktig begränsning: Facebook Marketplace verkar inte erbjuda ett öppet API där en vanlig användare kan ansluta sitt privata Marketplace-konto och låta Selio skapa, uppdatera och ta bort annonser. Det byggbara spåret i aktuell dokumentation är Meta Commerce Platform och Marketplace Partner API, med katalog, säljare, Commerce Manager och godkännande för Marketplace-distribution.

## Dokument

- [Avsedd användar- och systemflow](./intended-flow.md)
- [Integrationsguide för Meta Marketplace API](./integration-guide.md)
- [Öppna frågor och risker](./open-questions.md)

## Grundprinciper

- Selio är källan för butikens vara, bilder, beskrivning, pris och lagerstatus.
- Meta Marketplace är en möjlig försäljnings- och distributionskanal via Meta Commerce, inte en enkel ersättning för manuella Facebook Marketplace-annonser.
- En vara ska ha kanalstatus per Meta-listning, till exempel `ej_listad`, `utkast`, `vantar_pa_meta`, `publicerad`, `saljd`, `arkiverad`, `borttagen` eller `fel`.
- Publicering till Meta kräver explicit användaråtgärd och bör bara aktiveras om butiken och Selio har rätt Meta-behörigheter.
- Synk efter publicering ska vara automatisk när API-åtkomst och orderflöden tillåter det.
- Om en vara säljs i Selio, i kundbutiken, i fysisk butik eller på annan kanal ska Meta-listningen markeras som ej tillgänglig så snabbt som möjligt.
- Om en vara säljs via Meta Commerce ska Selio markera varan som såld och ta bort den från andra aktiva kanaler.

## Viktig API-status

Aktuell Meta-dokumentation visar flera olika spår:

- Marketplace Partner Item API kan skapa, uppdatera och ta bort produkter i Marketplace-katalog via Graph API, men kräver att Selio är Marketplace Partner.
- Marketplace Partner Seller API kräver att varje produkt kopplas till en partner-säljare.
- Marketplace Approval API används för att begära och kontrollera om en shop/säljare får distribueras till Marketplace.
- Commerce Platform Order API används för att läsa Meta Commerce-orders. Orderupptäckt är i dokumentationen främst poll-baserad.
- Meta Content Library API kan läsa publika Marketplace-listningar för research, men kan inte skapa eller synka butikens annonser.

Det här gör integrationen mer beroende av Meta-godkännande än Tradera-spåret. Första produktbeslutet bör därför vara om Selio ska ansöka om Marketplace Partner/Commerce Platform-spår eller om Meta i MVP bara ska stödjas som en manuell kanal utan garanterad synk.

Källor:

- <https://developers.facebook.com/docs/marketplace/partnerships/itemAPI/>
- <https://developers.facebook.com/docs/marketplace/partnerships/sellerAPI/>
- <https://developers.facebook.com/docs/commerce-platform/platforms/distribution/MPApprovalAPI/>
- <https://developers.facebook.com/docs/commerce-platform/api-setup/>
- <https://developers.facebook.com/docs/commerce-platform/order-management/order-api/>
- <https://developers.facebook.com/docs/content-library-and-api/content-library-api/guides/fb-marketplace/>
