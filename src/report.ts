import { WorkItem } from "./types.js";

export interface ScenarioLinkReportRow {
  epicId: number;
  epicTitle: string;
  scenarioId: number;
  linkType: string;
}

export function classifyLinkType(rel: string | undefined): string {
  if (!rel) return "unknown";

  const normalized = rel.trim();
  const lowered = normalized.toLowerCase();

  switch (lowered) {
    case "system.linktypes.related":
      return "related";
    case "system.linktypes.hierarchy-forward":
      return "child";
    case "system.linktypes.hierarchy-reverse":
      return "parent";
    default:
      break;
  }

  if (/testedby/i.test(normalized)) {
    return /-forward$/i.test(normalized) ? "tested-by-forward" : "tested-by";
  }

  return normalized
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[_.\s]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function parseScenarioIdFromRelation(relationUrl?: string): number | undefined {
  if (!relationUrl) return undefined;

  const match = relationUrl.match(/(?:\/workItems\/|\/workitems\/|\/WorkItem\/|WorkItem\/|id=|workitem\/)(\d+)/i)
    ?? relationUrl.match(/(\d+)(?!.*\d)/);

  return match ? Number(match[1]) : undefined;
}

export function collectScenarioLinks(items: WorkItem[]): ScenarioLinkReportRow[] {
  const rows: ScenarioLinkReportRow[] = [];

  for (const item of items) {
    if (!item.relations || item.relations.length === 0) continue;

    const itemType = item.workItemType?.toLowerCase() ?? "";
    if (itemType !== "epic" && itemType !== "") continue;

    for (const relation of item.relations) {
      const relationType = classifyLinkType(relation.rel);
      const scenarioId = parseScenarioIdFromRelation(relation.url);
      if (scenarioId === undefined) continue;

      const scenario = items.find((wi) => wi.id === scenarioId);
      if (!scenario) continue;

      const scenarioType = scenario.workItemType?.toLowerCase() ?? "";
      if (scenarioType !== "scenario") continue;

      rows.push({
        epicId: item.id,
        epicTitle: item.title,
        scenarioId: scenario.id,
        linkType: relationType,
      });
    }
  }

  return rows.sort((a, b) => a.epicId - b.epicId || a.scenarioId - b.scenarioId);
}

export function buildScenarioReportMarkdown(rows: ScenarioLinkReportRow[]): string {
  const header = "| Epic ID | Epic Title | Scenario ID | Link Type |";
  const separator = "| --- | --- | --- | --- |";

  if (rows.length === 0) {
    return [
      "# Epic-to-Scenario Link Report",
      "",
      header,
      separator,
      "| - | - | - | - |",
      "",
      "No child Epic/Scenario links were found.",
    ].join("\n");
  }

  const body = rows
    .map(
      (row) =>
        `| ${row.epicId} | ${row.epicTitle.replace(/\|/g, "\\|")} | ${row.scenarioId} | ${row.linkType} |`
    )
    .join("\n");

  return ["# Epic-to-Scenario Link Report", "", header, separator, body].join("\n");
}
