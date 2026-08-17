import { QueryLocation } from "./types.js";

const GUID_RE = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;

/**
 * Parse an Azure DevOps query URL into the pieces needed to call the REST API.
 *
 * Supports both modern (dev.azure.com/{org}/{project}) and legacy
 * ({org}.visualstudio.com/{project}) URL shapes, with the query id either in the
 * path (…/_queries/query/{id}) or as an `id` query-string parameter.
 */
export function parseQueryUrl(rawUrl: string): QueryLocation {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error(`Invalid URL: "${rawUrl}"`);
  }

  const host = url.host;
  const webOrigin = url.origin;

  // Determine organization + the path segments after it.
  let organization: string;
  let segments = url.pathname.split("/").filter(Boolean);

  if (host.endsWith(".visualstudio.com")) {
    // Legacy: https://{org}.visualstudio.com/{project}/_queries/...
    organization = host.split(".")[0];
    // segments already start at {project}/...
  } else {
    // Modern: https://dev.azure.com/{org}/{project}/_queries/...
    organization = segments.shift() ?? "";
  }

  if (!organization) {
    throw new Error(`Could not determine organization from URL: "${rawUrl}"`);
  }

  // The project is whatever comes before the "_queries" (or other "_") segment.
  const underscoreIdx = segments.findIndex((s) => s.startsWith("_"));
  const project =
    underscoreIdx > 0 ? decodeURIComponent(segments[0]) : undefined;

  // Find the query id: prefer a GUID in the path, fall back to ?id= parameter.
  const idFromQuery = url.searchParams.get("id");
  const idFromPath = segments.find((s) => GUID_RE.test(s));
  const queryId = (idFromPath && idFromPath.match(GUID_RE)?.[0]) ?? idFromQuery ?? "";

  if (!queryId || !GUID_RE.test(queryId)) {
    throw new Error(
      `Could not find a query id (GUID) in URL: "${rawUrl}". ` +
        `Open the query in Azure DevOps and copy the full URL.`
    );
  }

  const baseUrl = host.endsWith(".visualstudio.com")
    ? `https://${host}`
    : `https://dev.azure.com/${organization}`;

  return { baseUrl, organization, project, queryId, webOrigin };
}
