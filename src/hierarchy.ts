import { EpicGroup, WorkItem } from "./types.js";

const isEpic = (wi: WorkItem): boolean =>
  wi.workItemType === "" || wi.workItemType.toLowerCase() === "epic";

/** Preferred ordering for states; lower index sorts first. */
const STATE_ORDER = ["committed", "cut"];

function stateRank(state: string): number {
  const idx = STATE_ORDER.indexOf(state.toLowerCase());
  return idx === -1 ? STATE_ORDER.length : idx;
}

/**
 * Sort children by Iteration (Level 2) ascending, then by State using a
 * preferred order (Committed before Cut), then by title as a tiebreaker.
 */
function compareChildren(a: WorkItem, b: WorkItem): number {
  const byIteration = a.iterationLevel2.localeCompare(b.iterationLevel2);
  if (byIteration !== 0) return byIteration;

  const byState = stateRank(a.state) - stateRank(b.state);
  if (byState !== 0) return byState;

  return a.title.localeCompare(b.title);
}

/**
 * Group work items into parent Epics, each with its child Epics.
 *
 * A parent Epic is any item that is referenced as the `System.Parent` of at
 * least one other item in the set and is itself present in the set. Children
 * are the items that point at that parent. Only Epic-typed items are included
 * (items with an unknown type are treated leniently as Epics).
 */
export function groupEpics(items: WorkItem[]): EpicGroup[] {
  const byId = new Map<number, WorkItem>();
  for (const item of items) {
    byId.set(item.id, item);
  }

  const childrenByParent = new Map<number, WorkItem[]>();
  for (const item of items) {
    if (item.parentId == null) continue;
    if (!isEpic(item)) continue;
    if (!byId.has(item.parentId)) continue; // parent not in result set
    const bucket = childrenByParent.get(item.parentId) ?? [];
    bucket.push(item);
    childrenByParent.set(item.parentId, bucket);
  }

  const groups: EpicGroup[] = [];
  for (const [parentId, children] of childrenByParent) {
    const parent = byId.get(parentId)!;
    if (!isEpic(parent)) continue;
    children.sort(compareChildren);
    groups.push({ parent, children });
  }

  groups.sort((a, b) => a.parent.title.localeCompare(b.parent.title));
  return groups;
}
