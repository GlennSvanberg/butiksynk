/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as lib_productAttributes from "../lib/productAttributes.js";
import type * as lib_retention from "../lib/retention.js";
import type * as lib_shopBranding from "../lib/shopBranding.js";
import type * as lib_shops from "../lib/shops.js";
import type * as lib_slugify from "../lib/slugify.js";
import type * as myFunctions from "../myFunctions.js";
import type * as productListingAi from "../productListingAi.js";
import type * as products from "../products.js";
import type * as shops from "../shops.js";
import type * as taxonomy from "../taxonomy.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  "lib/productAttributes": typeof lib_productAttributes;
  "lib/retention": typeof lib_retention;
  "lib/shopBranding": typeof lib_shopBranding;
  "lib/shops": typeof lib_shops;
  "lib/slugify": typeof lib_slugify;
  myFunctions: typeof myFunctions;
  productListingAi: typeof productListingAi;
  products: typeof products;
  shops: typeof shops;
  taxonomy: typeof taxonomy;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
