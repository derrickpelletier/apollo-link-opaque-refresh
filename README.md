# apollo-link-opaque-refresh [![npm version](https://badge.fury.io/js/apollo-link-opaque-refresh.svg)](https://badge.fury.io/js/apollo-link-opaque-refresh)

[`npm i apollo-link-opaque-refresh`](https://www.npmjs.com/package/apollo-link-opaque-refresh)

Apollo Link to handle expired tokens (both JWT and opaque tokens) on auth-expired requests.

## What it does

This link operates bi-directionally. When a query responds with an error, a handler is triggered to determine whether that response conforms to a "token expired" error.

If the request is deemed to be a token expiry, the query will be queued for re-attempt, and the token refresh handler will be started.

While the token is being refreshed, all requests attempted will be paused and queued before hitting terminating link. Once the token refresh is finished (either successful refresh or failure to refresh) the queue will be processed and all requests will be resumed.

## What it doesn't do

This link **does not** check the token **before** sending queries. It operates on responses, therefore allowing a silent refresh mechanism for all types of tokens. It will **pause** outgoing queries if an active refresh is present. This is useful if your token expiry offset is unreliable on client or your tokens are using a proprietary format.

If you want to refresh and queue your queries prior to making a failing request, try [newsiberian/apollo-link-token-refresh](https://github.com/newsiberian/apollo-link-token-refresh)

## Quick Start

```javascript
tokenRefreshLink({
  refreshToken: async () => {
    try {
      await performSomeTokenRefresh();
    } catch (error) {
      userSignOut();
      throw error;
    }
  },
  shouldRefresh: ({ operation, result, networkError }) => {
    return networkError?.statusCode === 401;
  },
})
```

## Configuration

The link takes a single `options` object with the following required properties:

| property |  | description|
|----------|------|------------|
| `refreshToken` | `() => Promise` | Implements your token refresh mechanism. Throw an error if unable to refresh. Successful resolve implies token was refreshed and is available to further links. |
| `shouldRefresh` | `({ operation, result, networkError }) => boolean` | Using the provided values should determine whether the response warrants a token refresh. |
