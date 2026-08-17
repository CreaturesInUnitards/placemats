import test from "node:test";
import assert from "node:assert/strict";

import { buildScenarioReportMarkdown, classifyLinkType, collectScenarioLinks } from "./report.js";
import { WorkItem } from "./types.js";

test("classifyLinkType maps common Azure DevOps relation names", () => {
  assert.equal(classifyLinkType("System.LinkTypes.Related"), "related");
  assert.equal(classifyLinkType("System.LinkTypes.Hierarchy-Forward"), "child");
  assert.equal(classifyLinkType("System.LinkTypes.Hierarchy-Reverse"), "parent");
  assert.equal(classifyLinkType("Microsoft.VSTS.Common.TestedBy-Forward"), "tested-by-forward");
});

test("collectScenarioLinks finds scenario work item relations for child epics", () => {
  const items: WorkItem[] = [
    {
      id: 101,
      title: "Epic One",
      workItemType: "Epic",
      state: "Active",
      assignedTo: "A",
      areaLevel4: "",
      iterationLevel2: "",
      risk: "",
      riskAssessment: "",
      parentId: 10,
      url: "https://example.test/_workitems/edit/101",
      relations: [
        { rel: "System.LinkTypes.Related", url: "https://example.test/_apis/wit/workItems/201" },
      ],
    },
    {
      id: 201,
      title: "Scenario Alpha",
      workItemType: "Scenario",
      state: "Active",
      assignedTo: "A",
      areaLevel4: "",
      iterationLevel2: "",
      risk: "",
      riskAssessment: "",
      url: "https://example.test/_workitems/edit/201",
      relations: [],
    },
    {
      id: 102,
      title: "Epic Two",
      workItemType: "Epic",
      state: "Active",
      assignedTo: "B",
      areaLevel4: "",
      iterationLevel2: "",
      risk: "",
      riskAssessment: "",
      parentId: 11,
      url: "https://example.test/_workitems/edit/102",
      relations: [
        { rel: "System.LinkTypes.Hierarchy-Forward", url: "https://example.test/_apis/wit/workItems/202" },
      ],
    },
    {
      id: 202,
      title: "Scenario Beta",
      workItemType: "Scenario",
      state: "Active",
      assignedTo: "B",
      areaLevel4: "",
      iterationLevel2: "",
      risk: "",
      riskAssessment: "",
      url: "https://example.test/_workitems/edit/202",
      relations: [],
    },
  ];

  assert.deepEqual(collectScenarioLinks(items), [
    { epicId: 101, epicTitle: "Epic One", scenarioId: 201, linkType: "related" },
    { epicId: 102, epicTitle: "Epic Two", scenarioId: 202, linkType: "child" },
  ]);
});

test("buildScenarioReportMarkdown renders table rows from collected links", () => {
  const markdown = buildScenarioReportMarkdown([
    { epicId: 101, epicTitle: "Epic One", scenarioId: 201, linkType: "related" },
    { epicId: 102, epicTitle: "Epic Two", scenarioId: 202, linkType: "child" },
  ]);

  assert.match(markdown, /\| Epic ID \| Epic Title \| Scenario ID \| Link Type \|/);
  assert.match(markdown, /\| 101 \| Epic One \| 201 \| related \|/);
  assert.match(markdown, /\| 102 \| Epic Two \| 202 \| child \|/);
});
