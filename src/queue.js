/**
 * A simple queue for holding a list of apollo queries that need to be retried or
 * were paused while waiting for token refresh.
 */
export class RequestQueue {
  constructor() {
    this.list = [];
  }

  /**
   * Queing simply takes a callback. 
   * If that callback returns a truthy value, it will setup an unsubscribe on the value
   * under the assumption that that value is an Observable.
   * @param {function} continueOp - callback to run when the queue is processed. Takes a boolean indicating whether the token successfully refreshed.
   */
  addItem(continueOp) {
    const item = { continueOp };
    
    return new Observable((obs) => {
      let onUnsub;
      item.setUnsubscriber = (cb) => {
        onUnsub = cb;
      };
      item.subscriber = obs;
      this.list.push(item);
      return () => {
        onUnsub && onUnsub();
      };
    });
  }

  /**
   * processItems
   * iterates through the queued items and runs their callbacks
   * @param {*} tokenRefreshed - boolean indicating whether the token was successfully refreshed. Passed into each queued callback.
   */
  processItems(tokenRefreshed) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`processing ${this.list.length} queued queries`);
    }
    this.list.forEach(({ continueOp, subscriber, setUnsubscriber }) => {
      const op = continueOp(tokenRefreshed);
      // only subscribe if we returned an Observable
      // when a refresh fails we don't return one and we just ignore
      if (op) {
        const sub = op.subscribe(subscriber);
        setUnsubscriber(() => sub.unsubscribe());
      }
    });
    this.list = [];
  }
}