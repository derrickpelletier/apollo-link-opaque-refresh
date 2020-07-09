import { ApolloLink, Observable } from '@apollo/client';
import { RequestQueue } from './queue';

/**
 * tokenLink
 * @param {Object} options
 * @param {function} options.onRefreshToken function to run when a new token is needed.
 * @param {function} options.shouldRefresh function to run after a request to determine if we have to fetch a new token
 */
export function tokenRefreshLink({ onRefreshToken, shouldRefresh }) {
  const queue = new RequestQueue();
  let isGettingToken = false;

  const getNewToken = async () => {
    if (isGettingToken) return;
    isGettingToken = true;
    let isRefreshed;
    try {
      await onRefreshToken();
      isRefreshed = true;
    } catch (error) {
      isRefreshed = false;
    } finally {
      isGettingToken = false;
    }
    queue.processItems(isRefreshed);
  };

  return new ApolloLink((operation, forward) => {
    return new Observable((observer) => {
      let sub, queueSub, retrySub;

      const cleanup = () => {
        if (sub) sub.unsubscribe();
        if (queueSub) queueSub.unsubscribe();
        if (retrySub) retrySub.unsubscribe();
      };

      try {
        // if the queue is already active, just add this item, essentially pausing it until the token is available.
        if (isGettingToken) {
          queueSub = queue
            .addItem(() => forward(operation))
            .subscribe(observer);
          return cleanup;
        }

        // If queue is not active, run the operation as normal.
        sub = forward(operation).subscribe({
          next: (result) => {
            // check the response to see if we need to refresh the token.
            if (!shouldRefresh({ operation, result })) {
              return observer.next(result);
            }
            // add the item to the queue.
            // if the token is successfully refreshed, retry the request
            // otherwise just propagate error.
            retrySub = queue
              .addItem((refreshed) => {
                if (refreshed) return forward(operation);

                // if the token was not refreshed, just let the response continue
                // and complete the observable.
                observer.next(result);
                observer.complete();
              })
              .subscribe(observer);

            if (!isGettingToken) getNewToken();
          },
          error: (networkError) => {
            if (!shouldRefresh({ operation, networkError })) {
              return observer.error(networkError);
            }
            // add the item to the queue.
            // if the token is successfully refreshed, retry the request
            // otherwise just propagate error.
            retrySub = queue
              .addItem((refreshed) => {
                if (refreshed) return forward(operation);
                observer.error(networkError);
              })
              .subscribe(observer);
            if (!isGettingToken) getNewToken();
          },
          complete: () => {
            // only complete if we didn't queue up a retry
            if (!retrySub) observer.complete.call(observer);
          },
        });
      } catch (e) {
        observer.error(e);
      }
      return cleanup;
    });
  });
}
