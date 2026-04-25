Developer Program

- [Home](https://api.tradera.com/)
- [Documentation](https://api.tradera.com/documentation)
- [Developer Center](https://api.tradera.com/developer)

### **Tradera API**

[Overview and getting startedChangelog](https://api.tradera.com/documentation)

### **REST API (v4)**

[Getting started with RESTSwagger UI (interactive)](https://api.tradera.com/documentation/rest-getting-started)

#### **REST API reference**

[ItemsCategoriesSearchOrdersBuyerListingsUsersAuthReference Data](https://api.tradera.com/documentation/rest/items)

### **SOAP API**

[Getting started with SOAPMaking your first SOAP callAuthentication and authorizationAdding an item (auction)Push API](https://api.tradera.com/documentation/soap-getting-started)

#### **SOAP webservice reference**

[PublicServiceRestrictedServiceOrderServiceSearchServiceListingServiceBuyerService](https://api.tradera.com/documentation/public-service)

# **Tradera Developer Program**

Use the Tradera API to build approved integrations for search, listings, inventory, orders, shipping, reporting, and marketplace automation. The REST API v4 is the recommended starting point for new integrations.

- Go to ++[the registration page](https://api.tradera.com/register)++ to create a developer account.
- Register an application to get the application credentials needed for API calls.
- Start with the ++[REST API getting started guide](https://api.tradera.com/documentation/rest-getting-started)++ or browse the ++[interactive Swagger documentation](https://api.tradera.com/documentation/rest-swagger)++.

## **Application credentials**

When you have a developer account you can create an application. On the ++[application page](https://api.tradera.com/applications)++ you can view your application ID and application key.

- **AppId** identifies your application.
- **App Key** verifies the application ID.

REST requests send these values as HTTP headers:

```
X-App-Id: 1234
X-App-Key: aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee
```

## **REST API v4**

All REST endpoints are located under the `/v4/` path prefix:

```
https://api.tradera.com/v4/
```

Endpoints that act on behalf of a Tradera user require a user ID and user token in addition to the application credentials. See ++[Getting started with REST](https://api.tradera.com/documentation/rest-getting-started)++ for request format, authentication headers, examples, and error responses.

## **API Usage Policy**

The Tradera API is designed for approved integrations that help users search, discover, list, manage, buy, sell, ship, and analyze marketplace activity in ways that align with Tradera's rules and user protections.

### **Allowed use cases**

- Build search, filtering, and discovery tools.
- Create seller tools for listings, inventory, pricing, and reporting.
- Build order, shipping, and fulfillment workflows.
- Send alerts, reminders, and status notifications.
- Provide analytics, dashboards, and pricing insights.
- Support buyer and seller actions that are clearly initiated or approved by the user.

### **Disallowed use cases**

- Auction sniping.
- Automated bidding.
- Bid-timing automation near auction close.
- Tools designed to circumvent marketplace fairness rules or platform safeguards.
- Actions taken on behalf of users without clear authorization and visibility.

### **Guidance for AI and automation**

- Prefer read-only and advisory features by default.
- Make sensitive actions explicit, visible, and user-approved.
- Do not automate bidding or similar competitive marketplace behaviors.
- Ensure examples, prompts, and generated code steer toward compliant use cases.

If you are unsure whether a use case is allowed, contact ++[apiadmin@tradera.com](mailto:apiadmin@tradera.com)++ before building or publishing the integration.

## **SOAP API**

Existing SOAP integrations remain documented in the separate ++[SOAP API section](https://api.tradera.com/documentation/soap-getting-started)++.  

Developer Program

- [Home](https://api.tradera.com/)
- [Documentation](https://api.tradera.com/documentation)
- [Developer Center](https://api.tradera.com/developer)

### **Tradera API**

[Overview and getting startedChangelog](https://api.tradera.com/documentation)

### **REST API (v4)**

[Getting started with RESTSwagger UI (interactive)](https://api.tradera.com/documentation/rest-getting-started)

#### **REST API reference**

[ItemsCategoriesSearchOrdersBuyerListingsUsersAuthReference Data](https://api.tradera.com/documentation/rest/items)

### **SOAP API**

[Getting started with SOAPMaking your first SOAP callAuthentication and authorizationAdding an item (auction)Push API](https://api.tradera.com/documentation/soap-getting-started)

#### **SOAP webservice reference**

[PublicServiceRestrictedServiceOrderServiceSearchServiceListingServiceBuyerService](https://api.tradera.com/documentation/public-service)

# **Getting started with the REST API (v4)**

The v4 REST API is the recommended starting point for new Tradera API integrations. It uses JSON over HTTP with resource-based URLs and standard HTTP methods.

## **Base URL**

All REST API endpoints are located under the `/v4/` path prefix:

```
https://api.tradera.com/v4/
```

## **Authentication**

Authentication uses HTTP headers. There are two levels depending on the endpoint.

### **App authentication**

All requests must include your application credentials as HTTP headers:

***X-App-Id***

Your application ID (integer).

***X-App-Key***

Your application key (GUID).

### **User authorization**

Endpoints that act on behalf of a specific Tradera user require additional headers:

***X-User-Id***

The Tradera user ID (integer) of the user to act as.

***X-User-Token***

The token (string) obtained via the token login flow or the `POST /v4/auth/token` endpoint.

See ++[Auth](https://api.tradera.com/documentation/rest/auth)++ in the REST API reference for token endpoints.

## **Request and response format**

Request and response bodies use JSON with `camelCase` property names. For `POST` and `PUT` requests, set the `Content-Type` header to `application/json`.

## **Error responses**

When an error occurs, the API returns a JSON body with the following structure:

```
{
  "error": {
    "code": "BadRequest",
    "message": "A description of what went wrong."
  }
}
```

Common HTTP status codes:

***400 Bad Request***

The request is malformed or contains invalid parameters.

***401 Unauthorized***

Missing or invalid app credentials (`X-App-Id` / `X-App-Key`).

***403 Forbidden***

The app or user does not have permission to access this endpoint.

***429 Too Many Requests***

The rate limit has been exceeded. Wait before retrying.

***500 Internal Server Error***

An unexpected error occurred on the server.

## **Examples**

### **Get official Tradera time (no user auth)**

```
curl -H "X-App-Id: 1234" \
     -H "X-App-Key: aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" \
     https://api.tradera.com/v4/reference-data/time
```

Example response:

```
{
  "time": "2026-03-17T14:30:00Z"
}
```

### **Get item by ID**

```
curl -H "X-App-Id: 1234" \
     -H "X-App-Key: aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" \
     https://api.tradera.com/v4/items/567890
```

## **Interactive documentation**

For interactive exploration of the API, see the ++[Swagger UI (interactive)](https://api.tradera.com/documentation/rest-swagger)++ page, where you can browse all endpoints and try them out directly.Developer Program

- [Home](https://api.tradera.com/)
- [Documentation](https://api.tradera.com/documentation)
- [Developer Center](https://api.tradera.com/developer)

### **Tradera API**

[Overview and getting startedChangelog](https://api.tradera.com/documentation)

### **REST API (v4)**

[Getting started with RESTSwagger UI (interactive)](https://api.tradera.com/documentation/rest-getting-started)

#### **REST API reference**

[ItemsCategoriesSearchOrdersBuyerListingsUsersAuthReference Data](https://api.tradera.com/documentation/rest/items)

### **SOAP API**

[Getting started with SOAPMaking your first SOAP callAuthentication and authorizationAdding an item (auction)Push API](https://api.tradera.com/documentation/soap-getting-started)

#### **SOAP webservice reference**

[PublicServiceRestrictedServiceOrderServiceSearchServiceListingServiceBuyerService](https://api.tradera.com/documentation/public-service)

# **Items**

**Beta:** The REST API v4 is currently in beta. Endpoints and response shapes may change without prior notice.

Retrieve item details, descriptions, restarts, and seller item listings.


| **Method** | **Path**                             | **Description**                        | **Auth**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | ------------------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GET**    | /v4/items/{itemId}                   | Get a single item by ID.               | **App**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **GET**    | /v4/items/{itemId}/descriptions      | Get added descriptions for an item.    | **App**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **GET**    | /v4/items/{itemId}/restarts          | Get restart history for an item.       | **App**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **GET**    | /v4/items/seller/{userId}            | Get items listed by a specific seller. | **App**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **GET**    | /v4/items/seller/{userId}/quick-info | Get quick info about a seller’s items. | **App**Developer Program- [Home](https://api.tradera.com/)- [Documentation](https://api.tradera.com/documentation)- [Developer Center](https://api.tradera.com/developer)**Tradera API**[Overview and getting startedChangelog](https://api.tradera.com/documentation)**REST API (v4)[Getting started with RESTSwagger UI (interactive)](https://api.tradera.com/documentation/rest-getting-started)REST API reference**[ItemsCategoriesSearchOrdersBuyerListingsUsersAuthReference Data](https://api.tradera.com/documentation/rest/items)**SOAP API**[Getting started with SOAPMaking your first SOAP callAuthentication and authorizationAdding an item (auction)Push API](https://api.tradera.com/documentation/soap-getting-started)**SOAP webservice reference**[PublicServiceRestrictedServiceOrderServiceSearchServiceListingServiceBuyerService](https://api.tradera.com/documentation/public-service)**Categories****Beta:** The REST API v4 is currently in beta. Endpoints and response shapes may change without prior notice.Browse the category tree and attribute definitions. |


Developer Program

- [Home](https://api.tradera.com/)
- [Documentation](https://api.tradera.com/documentation)
- [Developer Center](https://api.tradera.com/developer)

### **Tradera API**

[Overview and getting startedChangelog](https://api.tradera.com/documentation)

### **REST API (v4)**

[Getting started with RESTSwagger UI (interactive)](https://api.tradera.com/documentation/rest-getting-started)

#### **REST API reference**

[ItemsCategoriesSearchOrdersBuyerListingsUsersAuthReference Data](https://api.tradera.com/documentation/rest/items)

### **SOAP API**

[Getting started with SOAPMaking your first SOAP callAuthentication and authorizationAdding an item (auction)Push API](https://api.tradera.com/documentation/soap-getting-started)

#### **SOAP webservice reference**

[PublicServiceRestrictedServiceOrderServiceSearchServiceListingServiceBuyerService](https://api.tradera.com/documentation/public-service)

# **Listings**

**Beta:** The REST API v4 is currently in beta. Endpoints and response shapes may change without prior notice.

Manage item listings: create, update, remove shop items, manage feedback, and more.


| **Method** | **Path**                                          | **Description**                                                                      | **Auth**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------- | ------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GET**    | /v4/listings/items/{itemId}                       | Get a specific item for the authenticated seller, including seller-specific details. | **User+Seller**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **GET**    | /v4/listings/seller-items                         | Get items for the authenticated seller.                                              | **User+Seller**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **GET**    | /v4/listings/updated-seller-items                 | Get recently updated seller items.                                                   | **User+Seller**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **GET**    | /v4/listings/seller-transactions                  | Get seller transactions.                                                             | **User+Seller**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **POST**   | /v4/listings/items                                | Add a new auction item.                                                              | **User+Seller**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **POST**   | /v4/listings/items/xml                            | Add an item using XML format.                                                        | **User+Seller**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **POST**   | /v4/listings/items/{requestId}/images             | Add an image to a pending item request.                                              | **User+Seller**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **POST**   | /v4/listings/items/{requestId}/campaign-code      | Add a campaign code to a pending item request.                                       | **User+Seller**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **POST**   | /v4/listings/items/{requestId}/commit             | Commit a pending item request.                                                       | **User+Seller**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **DELETE** | /v4/listings/items/{itemId}                       | End (remove) an item.                                                                | **User+Seller**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **PUT**    | /v4/listings/items/prices                         | Set prices on non-shop items.                                                        | **User+Seller**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **POST**   | /v4/listings/shop-items                           | Add a new shop item.                                                                 | **User+Seller**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **POST**   | /v4/listings/shop-items/variant                   | Add a shop item variant.                                                             | **User+Seller**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **PUT**    | /v4/listings/shop-items                           | Update a shop item.                                                                  | **User+Seller**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **PUT**    | /v4/listings/shop-items/variant                   | Update a shop item variant.                                                          | **User+Seller**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **DELETE** | /v4/listings/shop-items/{itemId}                  | Remove a shop item.                                                                  | **User+Seller**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **PUT**    | /v4/listings/shop-items/prices                    | Set prices on shop items.                                                            | **User+Seller**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **PUT**    | /v4/listings/shop-items/quantities                | Set quantities on shop items.                                                        | **User+Seller**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **PUT**    | /v4/listings/shop-items/activate-dates            | Set activation dates on shop items.                                                  | **User+Seller**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **GET**    | /v4/listings/request-results                      | Get results for pending listing requests.                                            | **User+Seller**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **GET**    | /v4/listings/shop-settings                        | Get shop settings.                                                                   | **User+Seller**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **PUT**    | /v4/listings/shop-settings                        | Update shop settings.                                                                | **User+Seller**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **POST**   | /v4/listings/feedback/transaction/{transactionId} | Leave feedback for a transaction.                                                    | **User+Seller**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **POST**   | /v4/listings/feedback/order/{orderNumber}         | Leave order feedback to buyer.                                                       | **User+Seller**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **POST**   | /v4/listings/validate-campaign-code               | Validate a campaign code.                                                            | **User+Seller**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **PUT**    | /v4/listings/transaction-status                   | Update transaction status.                                                           | **User+Seller**Developer Program- [Home](https://api.tradera.com/)- [Documentation](https://api.tradera.com/documentation)- [Developer Center](https://api.tradera.com/developer)**Tradera API**[Overview and getting startedChangelog](https://api.tradera.com/documentation)**REST API (v4)[Getting started with RESTSwagger UI (interactive)](https://api.tradera.com/documentation/rest-getting-started)REST API reference**[ItemsCategoriesSearchOrdersBuyerListingsUsersAuthReference Data](https://api.tradera.com/documentation/rest/items)**SOAP API**[Getting started with SOAPMaking your first SOAP callAuthentication and authorizationAdding an item (auction)Push API](https://api.tradera.com/documentation/soap-getting-started)**SOAP webservice reference**[PublicServiceRestrictedServiceOrderServiceSearchServiceListingServiceBuyerService](https://api.tradera.com/documentation/public-service)**Auth****Beta:** The REST API v4 is currently in beta. Endpoints and response shapes may change without prior notice.Obtain user tokens and manage BankID verification flows. |


