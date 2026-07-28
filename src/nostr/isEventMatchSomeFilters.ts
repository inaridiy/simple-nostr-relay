import type { Event, SubscriptionFilter } from "../types/core";
import { getTagValuesByName } from "./utils";

export type MatchFilterOptions = {
  enableNIP26?: boolean;
};

/**
 * @description Check whether an event matches a single filter.
 * All specified conditions must hold (AND); values inside one condition are alternatives (OR).
 * @link https://github.com/nostr-protocol/nips/blob/master/01.md
 */
export const isEventMatchFilter = (filter: SubscriptionFilter, event: Event, options: MatchFilterOptions = {}): boolean => {
  if (filter.ids && !filter.ids.includes(event.id)) return false;
  if (filter.authors) {
    const delegator = options.enableNIP26 ? getTagValuesByName(event, "delegation")[0] : undefined;
    const matched = filter.authors.includes(event.pubkey) || (delegator !== undefined && filter.authors.includes(delegator));
    if (!matched) return false;
  }
  if (filter.kinds && !filter.kinds.includes(event.kind)) return false;
  if (filter.since !== undefined && filter.since > event.created_at) return false;
  if (filter.until !== undefined && filter.until < event.created_at) return false;
  if (filter.search !== undefined) return false;

  for (const [key, values] of Object.entries(filter)) {
    if (!key.startsWith("#")) continue;
    if (!/^#[a-zA-Z]$/.test(key)) return false;
    const tagValues = getTagValuesByName(event, key.slice(1));
    if (!(values as string[]).some((value) => tagValues.includes(value))) return false;
  }

  return true;
};

export const isEventMatchSomeFilters = (filters: SubscriptionFilter[], event: Event, options: MatchFilterOptions = {}): boolean => {
  return filters.some((filter) => isEventMatchFilter(filter, event, options));
};
