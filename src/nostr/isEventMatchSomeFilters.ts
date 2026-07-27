import type { Event, SubscriptionFilter } from "../types/core";
import { getTagValuesByName } from "./utils";

export type MatchFilterOptions = {
  enableNIP26?: boolean;
};

// Same semantics as the SQL side: a 64-char value matches exactly, a shorter value matches as prefix.
const matchHexValues = (values: string[], target: string): boolean =>
  values.some((value) => (value.length === 64 ? value === target : target.startsWith(value)));

/**
 * @description Check whether an event matches a single filter.
 * All specified conditions must hold (AND); values inside one condition are alternatives (OR).
 * @link https://github.com/nostr-protocol/nips/blob/master/01.md
 */
export const isEventMatchFilter = (filter: SubscriptionFilter, event: Event, options: MatchFilterOptions = {}): boolean => {
  if (filter.ids && !matchHexValues(filter.ids, event.id)) return false;
  if (filter.authors) {
    const delegator = options.enableNIP26 ? getTagValuesByName(event, "delegation")[0] : undefined;
    const matched = matchHexValues(filter.authors, event.pubkey) || (delegator !== undefined && matchHexValues(filter.authors, delegator));
    if (!matched) return false;
  }
  if (filter.kinds && !filter.kinds.includes(event.kind)) return false;
  if (filter.since && filter.since > event.created_at) return false;
  if (filter.until && filter.until < event.created_at) return false;

  for (const [key, values] of Object.entries(filter)) {
    if (!(key.startsWith("#") && key.length === 2)) continue;
    const tagValues = getTagValuesByName(event, key.slice(1));
    if (!(values as string[]).some((value) => tagValues.includes(value))) return false;
  }

  return true;
};

export const isEventMatchSomeFilters = (filters: SubscriptionFilter[], event: Event, options: MatchFilterOptions = {}): boolean => {
  return filters.some((filter) => isEventMatchFilter(filter, event, options));
};
