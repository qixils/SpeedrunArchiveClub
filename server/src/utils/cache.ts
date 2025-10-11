import Keyv from 'keyv';
import KeyvBrotli from '@keyv/compress-brotli';
import QuickLRU from 'quick-lru';

const lru = new QuickLRU({ maxSize: 1000 });
const keyvBrotli = new KeyvBrotli();
export const cacheMem = new Keyv({
  store: lru,
  compression: keyvBrotli,
  // `Trying to deserialize unknown typed array` ??
  // zod coerce is good enough to fix issues for now so it doesnt mattter but like wtf lol
  //serialize: (item) => superjson.stringify(item),
  //deserialize: (item) => superjson.parse(item) as undefined, // ignore the type lol
});
