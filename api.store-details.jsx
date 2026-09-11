
import prisma from "../db.server";

export async function loader({ request }) {
  try {
    // Get Shopify offline session
    const shopSession = await prisma.session.findFirst({
      where: {
        isOnline: false,
      },
    });

    if (!shopSession) {
      return Response.json(
        {
          success: false,
          message: "Shopify session not found",
        },
        { status: 404 }
      );
    }

    const { shop, accessToken } = shopSession;

    // Shopify Admin GraphQL API
    const response = await fetch(
      `https://${shop}/admin/api/2026-07/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          query: `
            #graphql
            query GetShopDetails {
              shop {
                id
                name
                email
                myshopifyDomain
                primaryDomain {
                  host
                  url
                }
                currencyCode
                currencyFormats {
                  moneyFormat
                  moneyWithCurrencyFormat
                }
                ianaTimezone
                timezoneAbbreviation
                unitSystem
                weightUnit
                billingAddress {
                  address1
                  address2
                  city
                  province
                  provinceCode
                  country
                  countryCodeV2
                  zip
                  phone
                }
              }
            }
          `,
        }),
      }
    );

    const result = await response.json();

    // HTTP error
    if (!response.ok) {
      return Response.json(
        {
          success: false,
          message: "Shopify API request failed",
          error: result,
        },
        { status: response.status }
      );
    }

    // GraphQL error
    if (result.errors) {
      return Response.json(
        {
          success: false,
          message: "Shopify GraphQL error",
          errors: result.errors,
        },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      store: result.data.shop,
    });
  } catch (error) {
    console.error("Store details API error:", error);

    return Response.json(
      {
        success: false,
        message: "Something went wrong",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
