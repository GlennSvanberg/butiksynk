# Swish Commerce API v2 Documentation Summary

## Overview
Swish Commerce API (v2) allows merchants to initiate payment requests and receive real-time callbacks.

## Key Endpoints (Production)
- **Base URL:** `https://cpc.getswish.net/swish-cpcapi/api/v2`
- **Create Payment Request:** `PUT /paymentrequests/{instructionUUID}`
- **Retrieve Payment Status:** `GET /paymentrequests/{instructionUUID}`
- **Cancel Payment Request:** `PATCH /paymentrequests/{instructionUUID}`

## Key Endpoints (Test/MSS)
- **Base URL:** `https://mss.cpc.getswish.net/swish-cpcapi/api/v2`

## Authentication (mTLS)
Swish requires **mutual TLS (mTLS)**.
- **Client Certificate:** Must be obtained from the Swish Certificate Management portal.
- **Root CA:** Must trust Swish Root CA.
- **TLS Version:** 1.2 or higher.

## Payment Request Object
```json
{
  "payeePaymentReference": "Order-123",
  "callbackUrl": "https://example.com/api/swish/callback",
  "payerAlias": "46700000000", (Optional for e-commerce, required for m-commerce if not using app-to-app)
  "payeeAlias": "1234679304",
  "amount": "100.00",
  "currency": "SEK",
  "message": "Description of goods",
  "callbackIdentifier": "unique-id-for-callback-verification"
}
```

## Callback (Webhook)
Swish sends an `HTTPS POST` to your `callbackUrl`.
- **Port:** Must be 443.
- **Security:** Swish validates your server's TLS certificate.
- **Header:** `X-Callback-Identifier` will match the one sent in the request.

## Integration Flow
1. **Backend (Convex Action):** Generate a UUID, call Swish API using mTLS certificates.
2. **Response:** Swish returns `201 Created` with a `Location` header.
3. **Frontend (TanStack Start):** Show Swish payment instructions or trigger Swish app (App2App).
4. **Callback (Convex Action/Webhook):** Swish calls your backend when status changes (PAID, DECLINED, etc.).
5. **Real-time Update:** Convex's reactivity automatically updates the UI for the user.
