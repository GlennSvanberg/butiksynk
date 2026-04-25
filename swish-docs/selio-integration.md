# Swish Integration in Selio

## Architecture Overview
Selio uses **Convex** for the backend and **TanStack Start** for the frontend. Swish integration will follow this pattern:

### 1. Backend (Convex)
- **Certificates:** Store Swish certificates securely (e.g., as environment variables or in a secure storage accessible by Convex Actions). Note: Convex Actions run in a Node.js environment, which is necessary for making mTLS requests.
- **Initiate Payment:** A Convex **Action** will be responsible for calling the Swish API. It will use `node-fetch` or `axios` with the `https` agent configured with the client certificate and key.
- **Webhook Handler:** A Convex **HTTP Action** will serve as the `callbackUrl`. It will verify the `X-Callback-Identifier` and update the order status in the Convex database.
- **Schema:** Add a `payments` table or update `orders` to track Swish `instructionUUID` and status.

### 2. Frontend (TanStack Start)
- **Checkout Flow:** When a user clicks "Betala med Swish", a server function (or Convex mutation/action) is triggered.
- **App2App:** For mobile users, the frontend can generate a Swish URL (`swish://payment?data=...`) to open the Swish app directly.
- **Status Polling/Reactivity:** Since Convex is reactive, the frontend doesn't need to poll. It simply subscribes to the order/payment status, and the UI updates instantly when the Swish callback hits the backend.

### 3. Security
- **mTLS:** Mandatory for Swish API calls.
- **IP Whitelisting:** If possible, restrict the Webhook endpoint to Swish's IP ranges.
- **Validation:** Always validate the payload in the callback against the stored `instructionUUID`.

## Proposed Folder Structure
- `convex/swish.ts`: Actions for interacting with Swish API.
- `convex/http.ts`: Webhook handler for Swish callbacks.
- `src/components/payment/SwishButton.tsx`: UI component for initiating Swish.
