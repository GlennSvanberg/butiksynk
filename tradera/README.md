# Tradera-integration

Det här dokumentationspaketet beskriver den tänkta Tradera-integrationen för Selio. Målet är att en butik ska kunna lista en vara på Tradera med ett aktivt beslut från användaren, och därefter hålla Selio och Tradera synkade så att en unik vara inte råkar säljas två gånger.

Integrationen ska inte publicera automatiskt bara för att en vara skapas i Selio. Publicering till Tradera ska vara en tydlig åtgärd i verktyget, med förhandsgranskning och bekräftelse.

## Dokument

- [Avsedd användar- och systemflow](./intended-flow.md)
- [Integrationsguide för Tradera API](./integration-guide.md)
- [Öppna frågor och risker](./open-questions.md)

## Grundprinciper

- Selio är källan för butikens vara, bilder, beskrivning, pris och lagerstatus.
- Tradera är en försäljningskanal som kan kopplas till en vara.
- En vara ska ha kanalstatus per Tradera-listning, till exempel `ej_listad`, `utkast`, `vantar_pa_tradera`, `publicerad`, `saljd`, `borttagen` eller `fel`.
- Publicering till Tradera kräver explicit användaråtgärd.
- Synk efter publicering ska vara automatisk när det är möjligt.
- Om en vara säljs i Selio, i kundbutiken, i fysisk butik eller på annan kanal ska Tradera-listningen tas ned så snabbt som möjligt.
- Om en vara säljs på Tradera ska Selio markera varan som såld och ta bort den från andra aktiva kanaler.

## Viktig API-status

Tradera rekommenderar REST API v4 för nya integrationer, men v4 är markerat som beta. SOAP v3 är äldre och stabilare. REST v4 verkar täcka de viktigaste behoven för listning, borttagning, order och referensdata, men vissa detaljer kan behöva verifieras mot Tradera innan implementation.

Källor:

- <https://api.tradera.com/documentation>
- <https://api.tradera.com/documentation/rest-getting-started>
- <https://api.tradera.com/documentation/rest/listings>
- <https://api.tradera.com/documentation/rest/orders>
- <https://api.tradera.com/documentation/rest/auth>
- <https://api.tradera.com/v4/swagger/v4/swagger.json>
- Lokal kopia/sammanställning: [`../tradera_api.md`](../tradera_api.md)
