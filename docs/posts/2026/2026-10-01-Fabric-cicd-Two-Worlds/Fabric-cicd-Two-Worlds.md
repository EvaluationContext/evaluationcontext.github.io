---
title: Fabric CICD - Two Different Worlds
description: Where the low-code and code-first halves of Fabric CI/CD fail to meet, and my thoughts on what would close the gap
image: /assets/images/blog/2026/2026-10-01-Fabric-cicd-Two-Worlds/hero.jpg
date:
  created: 2026-10-01
authors:
  - jDuddy
comments: true
categories:
  - CICD
links:
  - fabric-cicd Docs: https://microsoft.github.io/fabric-cicd/1.3.0/
  - Community Blog - New CI/CD resources for Microsoft Fabric: https://community.fabric.microsoft.com/blog/fbc_fabricupdatesblogs/new-cicd-resources-for-microsoft-fabric-from-concepts-to-end-to-end-automation/5358502
  - MS Docs - Introduction to CI/CD in Microsoft Fabric: https://learn.microsoft.com/en-us/fabric/cicd/cicd-overview
  - MS Docs - Fabric CI/CD concepts and best practices: https://learn.microsoft.com/fabric/fundamentals/understand-best-practices-fabric-cicd
  - MS Docs - Dependency binding in cross-workspace deployment: https://learn.microsoft.com/en-us/fabric/cicd/cross-workspace-dependency-binding
  - MS Docs - Tutorial, Azure DevOps and the fabric-cicd library: https://learn.microsoft.com/fabric/cicd/tutorial-fabric-cicd-azure-devops
  - MS Docs - How Microsoft develops with DevOps: https://learn.microsoft.com/en-us/devops/develop/how-microsoft-develops-devops
slug: posts/fabric-cicd-two-worlds
---

I ended the [Deployment Plans](https://evaluationcontext.com/posts/fabric-deployment-plans/) post saying it feels like there are two parallel worlds in Fabric CI/CD, with a gap between them. I am writing this post both as a cathartic act and to consolidate my thoughts.

## Two Worlds

The **low-code** world lives in the portal. You work in a workspace and **git integration** saves it to a branch. **Branch-out** gives you a workspace of your own. **Deployment pipelines** copy items from stage to stage, **deployment rules** and **Variable Libraries** hold the values that change per stage, and a **Deployment Plan** sets the order and runs steps around the copy. Everything runs inside Fabric.

The **code-first** world lives in a repo. You publish the repo into a workspace with fabric-cicd (or `fab deploy`, which wraps it), and `parameter.yml` swaps out values on the way in. A **YAML pipeline** runs whatever needs to happen before and after.

## Mixed Messages

The documentation reflects the same split. There are reams of it, scattered far and wide across Microsoft Learn and separate sites for fabric-cicd, the CLI and the Terraform provider.

??? info "Documentation"

    | Page | What it covers | Dated (`ms.date`) |
    | --- | --- | --- |
    | **Guidance** | | |
    | [Introduction to CI/CD in Microsoft Fabric](https://learn.microsoft.com/en-us/fabric/cicd/cicd-overview) | The platform at a glance and a reference architecture | 23 Aug 2026 |
    | [CI/CD workflow options](https://learn.microsoft.com/en-us/fabric/cicd/manage-deployment) | Four options: Git integration, Fabric Items APIs, deployment pipelines, ISVs | 18 Mar 2026 |
    | [Fabric CI/CD concepts and best practices](https://learn.microsoft.com/fabric/fundamentals/understand-best-practices-fabric-cicd) | The concepts page: environments, branches, item definitions, three release options | 28 May 2026 |
    | [Best practices for lifecycle management](https://learn.microsoft.com/en-us/fabric/cicd/best-practices-cicd) | The older best practices page, built around git integration and deployment pipelines | 15 Jun 2026 |
    | [Development process](https://learn.microsoft.com/en-us/fabric/cicd/git-integration/manage-branches) | Working in isolation: a [branched workspace](https://learn.microsoft.com/en-us/fabric/cicd/git-integration/branched-workspace) or a client tool | 1 Sep 2026 |
    | [FAQ](https://learn.microsoft.com/en-us/fabric/cicd/faq) | Licensing, permissions, plans and some definitions | 23 Sep 2026 |
    | **Tutorials** | | |
    | [End-to-end automation](https://learn.microsoft.com/en-us/fabric/cicd/tutorial-end-to-end-automation) | Terraform creates dev and test, fabric-cicd promotes | 23 Jul 2026 |
    | [Azure DevOps and fabric-cicd](https://learn.microsoft.com/fabric/cicd/tutorial-fabric-cicd-azure-devops) | Three long-lived branches, approvals, `parameter.yml` | 19 Feb 2026 |
    | [Bulk import API](https://learn.microsoft.com/en-us/fabric/cicd/tutorial-bulkapi-cicd) | One main branch, a pipeline calling Bulk Import Item Definitions | 24 Sep 2026 |
    | [Local deployment](https://learn.microsoft.com/en-us/fabric/cicd/tutorial-fabric-cicd-local) | fabric-cicd or `fab deploy` from a laptop | 19 Feb 2026 |
    | [Application lifecycle management](https://learn.microsoft.com/en-us/fabric/cicd/cicd-tutorial) | Git integration plus deployment pipelines, with no code | 24 Jul 2026 |
    | **Features** | | |
    | [Git integration](https://learn.microsoft.com/en-us/fabric/cicd/git-integration/intro-to-git-integration) | Connect a workspace to a branch, the [process](https://learn.microsoft.com/en-us/fabric/cicd/git-integration/git-integration-process) and the [APIs](https://learn.microsoft.com/en-us/fabric/cicd/git-integration/git-automation) | 1 Sep 2026 |
    | [Deployment pipelines](https://learn.microsoft.com/en-us/fabric/cicd/deployment-pipelines/intro-to-deployment-pipelines) | Stages and pairing, the [deployment process](https://learn.microsoft.com/en-us/fabric/cicd/deployment-pipelines/understand-the-deployment-process), [rules](https://learn.microsoft.com/en-us/fabric/cicd/deployment-pipelines/create-rules) and [APIs](https://learn.microsoft.com/en-us/fabric/cicd/deployment-pipelines/pipeline-automation-fabric) | 24 Sep 2026 |
    | [Variable Libraries](https://learn.microsoft.com/en-us/fabric/cicd/variable-library/variable-library-overview) | [Value sets](https://learn.microsoft.com/en-us/fabric/cicd/variable-library/value-sets), [item references](https://learn.microsoft.com/en-us/fabric/cicd/variable-library/item-reference-variable-type) and [lifecycle](https://learn.microsoft.com/en-us/fabric/cicd/variable-library/variable-library-cicd) | 1 Sep 2026 |
    | [Deployment plans](https://learn.microsoft.com/en-us/fabric/cicd/deployment-plan/deployment-plan-overview) | Order and actions for one native deployment | 24 Sep 2026 |
    | [Dependency binding](https://learn.microsoft.com/en-us/fabric/cicd/cross-workspace-dependency-binding) | Which references survive a deployment | 1 Sep 2026 |
    | [Source code format](https://learn.microsoft.com/en-us/fabric/cicd/git-integration/source-code-format) | Item folders, the `.platform` file and the logicalId | 15 Dec 2025 |
    | **Tools** | | |
    | [fabric-cicd](https://microsoft.github.io/fabric-cicd/1.3.0/) | The Python library: [deployment overview](https://microsoft.github.io/fabric-cicd/1.3.0/how_to/deployment_overview/), [parameterization](https://microsoft.github.io/fabric-cicd/1.3.0/how_to/parameterization/), [item types](https://microsoft.github.io/fabric-cicd/1.3.0/reference/item_types/) | v1.3.0, Aug 2026 |
    | [Fabric CLI](https://microsoft.github.io/fabric-cli/) | `fab`, including `fab deploy`, which wraps fabric-cicd | rolling |
    | [Terraform provider](https://registry.terraform.io/providers/microsoft/fabric/latest/docs) | Workspaces, connections, git links and roles as code | rolling |

My problem isn't the amount, and it isn't that any of the answers is wrong. CI/CD is a divisive topic, and requirements and personal preference rightly come into it, so I don't expect one answer for everyone. A page that says "do it this way" alienates every team doing it another way. Every approach in the docs works for somebody. My problem is that the docs never say who each answer is for. Every page has a reader in mind, and you can tell from what it assumes: a portal or a repo, a Power BI developer or an engineer. But no page names its persona. The [overview](https://learn.microsoft.com/en-us/fabric/cicd/cicd-overview) is the clearest example. It calls git integration plus deployment pipelines "the most efficient" experience and fabric-cicd "the most widely adopted" tool on the same page, and never says which kind of team should pick which.

If you already know what you're doing, you read past that. Someone coming to CI/CD for the first time can't. They pick the pages that sound like them, and by the third page they are royally confused, because they've wandered across a persona boundary, or into guidance for the same persona written by a different author with their own bias of what is best.

Compare [How Microsoft develops with DevOps](https://learn.microsoft.com/en-us/devops/develop/how-microsoft-develops-devops), which says what Microsoft's own teams do, at what scale, and what they learned. Fabric CI/CD has nothing like it, so every team has to work it out for themselves.

Below are the contradictions, split by the persona each page implies. The [concepts page](https://learn.microsoft.com/fabric/fundamentals/understand-best-practices-fabric-cicd) speaks to both, so it turns up in both.

### The Low-Code Persona

These pages assume a portal, git integration and deployment pipelines: the [overview](https://learn.microsoft.com/en-us/fabric/cicd/cicd-overview)'s "most efficient" experience, the [portal tutorial](https://learn.microsoft.com/en-us/fabric/cicd/cicd-tutorial), the [older best practices page](https://learn.microsoft.com/en-us/fabric/cicd/best-practices-cicd), the [development process page](https://learn.microsoft.com/en-us/fabric/cicd/git-integration/manage-branches) and the deployment pipeline docs. Within that set:

- :material-variable: **Values per stage.** The [best practices page](https://learn.microsoft.com/en-us/fabric/cicd/best-practices-cicd) says use parameters "whenever possible" and deployment rules for data sources, and never mentions Variable Libraries. The [concepts page](https://learn.microsoft.com/fabric/fundamentals/understand-best-practices-fabric-cicd) says use Variable Libraries "whenever possible".
- :material-source-repository: **The dev workspace.** The [portal tutorial](https://learn.microsoft.com/en-us/fabric/cicd/cicd-tutorial) says the whole team shares and edits a git-connected dev workspace, then three steps later says each member should branch out to avoid editing it. The [concepts page](https://learn.microsoft.com/fabric/fundamentals/understand-best-practices-fabric-cicd) says treat the first commit from dev as a one-time operation and don't commit from it again, then allows exactly that in "the simplest development scenario".
- :material-source-branch: **Feature workspaces.** The [development process page](https://learn.microsoft.com/en-us/fabric/cicd/git-integration/manage-branches) says a separate workspace per developer. The [best practices page](https://learn.microsoft.com/en-us/fabric/cicd/best-practices-cicd) says keep one and re-point it, or skip the workspace if you use a client tool. The [portal tutorial](https://learn.microsoft.com/en-us/fabric/cicd/cicd-tutorial) says you can delete it once the branch merges.
- :material-link-variant: **Other workspaces.** The [best practices page](https://learn.microsoft.com/en-us/fabric/cicd/best-practices-cicd) says split workspaces by team. The [binding page](https://learn.microsoft.com/en-us/fabric/cicd/cross-workspace-dependency-binding) says a reference to another workspace never rebinds. The [deployment process page](https://learn.microsoft.com/en-us/fabric/cicd/deployment-pipelines/understand-the-deployment-process#autobinding-across-workspaces) says deployment pipelines do rebind them, if the items sit at the same stage position and both pipelines have the same number of stages. The [concepts page](https://learn.microsoft.com/fabric/fundamentals/understand-best-practices-fabric-cicd) says use item reference variables, which the [item reference page](https://learn.microsoft.com/en-us/fabric/cicd/variable-library/item-reference-variable-type) describes as static ids you update manually.
- :material-robot-outline: **Automation.** The [workflow options page](https://learn.microsoft.com/en-us/fabric/cicd/manage-deployment#option-3---deploy-using-fabric-deployment-pipelines) says the deployment pipeline APIs give you a build and release process like the other options. The [concepts page](https://learn.microsoft.com/fabric/fundamentals/understand-best-practices-fabric-cicd) says setup always needs manual steps and approvals are limited. [Deployment rules](https://learn.microsoft.com/en-us/fabric/cicd/deployment-pipelines/create-rules#considerations-and-limitations) can only be created in the UI by the item's owner.

### The Code-First Persona

These pages assume a repo, a pipeline, and fabric-cicd or the APIs: [option 2](https://learn.microsoft.com/en-us/fabric/cicd/manage-deployment#option-2---definition-based-deployments-using-fabric-items-apis) of the workflow options page, the [fabric-cicd tutorial](https://learn.microsoft.com/fabric/cicd/tutorial-fabric-cicd-azure-devops), the [end-to-end tutorial](https://learn.microsoft.com/en-us/fabric/cicd/tutorial-end-to-end-automation), the [bulk import tutorial](https://learn.microsoft.com/en-us/fabric/cicd/tutorial-bulkapi-cicd), the [local deployment tutorial](https://learn.microsoft.com/en-us/fabric/cicd/tutorial-fabric-cicd-local) and the [fabric-cicd docs](https://microsoft.github.io/fabric-cicd/1.3.0/how_to/deployment_overview/). Within that set:

- :material-source-merge: **Branching.** [Option 2](https://learn.microsoft.com/en-us/fabric/cicd/manage-deployment#option-2---definition-based-deployments-using-fabric-items-apis) is for trunk-based teams. The [tutorial](https://learn.microsoft.com/fabric/cicd/tutorial-fabric-cicd-azure-devops) it links to needs three long-lived branches. The [fabric-cicd docs](https://microsoft.github.io/fabric-cicd/1.3.0/how_to/deployment_overview/) merge to the default branch and cherry-pick into the upper ones. The [bulk import tutorial](https://learn.microsoft.com/en-us/fabric/cicd/tutorial-bulkapi-cicd) puts every environment on one main branch. Four pages, three models, one persona.
- :material-source-repository: **The dev workspace.** The [fabric-cicd tutorial](https://learn.microsoft.com/fabric/cicd/tutorial-fabric-cicd-azure-devops) connects dev to git and commits from it. The [fabric-cicd docs](https://microsoft.github.io/fabric-cicd/1.3.0/how_to/deployment_overview/) say deployed workspaces are only updated by script.
- :material-variable: **Values per environment.** The [fabric-cicd tutorial](https://learn.microsoft.com/fabric/cicd/tutorial-fabric-cicd-azure-devops) does everything with `find_replace` and never creates a variable library, then has a tip recommending you use one. The [workflow options page](https://learn.microsoft.com/en-us/fabric/cicd/manage-deployment#option-2---definition-based-deployments-using-fabric-items-apis) says you need a build environment with a custom script. The [concepts page](https://learn.microsoft.com/fabric/fundamentals/understand-best-practices-fabric-cicd) says Variable Libraries "whenever possible".

### Fixing the Documentation

- :material-check-decagram-outline: **Pick a handful of personas, pick one best option per persona and be consistent.** Branching, the dev workspace and environment values should each have one recommended answer per persona, and every page for that persona should give the same one. There will be more than one way of doing something, but pick one and run with it.
- :material-file-tree-outline: **Put each persona's pages in one place.** The [concepts page](https://learn.microsoft.com/fabric/fundamentals/understand-best-practices-fabric-cicd), the [workflow options page](https://learn.microsoft.com/en-us/fabric/cicd/manage-deployment) and the [older best practices page](https://learn.microsoft.com/en-us/fabric/cicd/best-practices-cicd) cover the same ground three different ways. Merge them into one, and stop splitting a persona's guidance across fundamentals, the CI/CD tree and the fabric-cicd site.

## The Gaps

Documentation aside, these are the gaps I keep hitting. fabric-cicd plugs the first four, one workspace at a time. The rest are left to you.

| Gap | :material-language-python: fabric-cicd | :material-lightbulb-on-outline: Ask |
| --- | --- | --- |
| :material-link-variant: **Binding within a workspace.** Auto-binding [misses](https://learn.microsoft.com/en-us/fabric/cicd/cross-workspace-dependency-binding) any reference stored as an object id, name or URI rather than a logicalId | :material-check: `parameter.yml` rewrites anything, if you know what to rewrite | A logicalId on every item reference, complete auto-binding coverage, and more items reading [Variable Libraries](https://learn.microsoft.com/en-us/fabric/cicd/variable-library/variable-library-overview#supported-items) |
| :material-link-variant-off: **Binding across workspaces.** Git never rebinds. Deployment pipelines [only do](https://learn.microsoft.com/en-us/fabric/cicd/deployment-pipelines/understand-the-deployment-process#autobinding-across-workspaces) between pipelines with matching stages | :material-check: `$workspace.<name>`, with names hard-coded per environment | A workspace identity ([What's Missing](#whats-missing)) |
| :material-package-variant-closed: **Empty workspaces.** Nothing to bind to, and the value set stays on Default | :material-check: One workspace at a time | Activate the value set named after the environment on every deploy ([What's Missing](#whats-missing)), and item reference variables that store a logicalId |
| :material-robot-off-outline: **Service principals.** Update From Git, [Deploy Stage Content](https://learn.microsoft.com/en-us/rest/api/fabric/core/deployment-pipelines/deploy-stage-content) and bulk import only work when every item in the operation supports them | :material-close: Same platform limits | More support for SPNs |
| :material-eye-off-outline: **No preview.** Compare is a diff between stages, and change review only covers semantic models and dataflows | :material-close: A rule that matches nothing is skipped silently | A preview on every deploy |

## What's Missing

The gaps above have three causes. The tools don't agree on what makes an item the same item. The native features only have partial coverage of the items and tools they should cover. And each world has features the other can't use. 

Azure settled most of this years ago: a [Bicep](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/resource-declaration) template refers to resources by symbolic name, is usually deployed into a resource group per environment, and [what-if](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deploy-what-if) shows what would change before it does.

| :material-microsoft-azure: Azure | :material-clock-outline: Fabric today | :material-lightbulb-on-outline: The ask |
| --- | --- | --- |
| :material-identifier: Symbolic name in a template | A logicalId, for items only | A logicalId for workspaces too |
| :material-layers-outline: Resource group per environment | A workspace named by convention | An environment on the workspace |
| :material-variable: Parameter file per environment | Value set, or `parameter.yml` | The value set picked by the environment |
| :material-eye-outline: `what-if` | The compare view | A preview on every deploy |

### LogicalIds First

Every deployment has to decide whether this item is the same one as that one, and each tool decides differently. Bulk import [matches on logicalId](https://learn.microsoft.com/en-us/fabric/cicd/tutorial-bulkapi-cicd) when name pairing is off. Git uses the logicalId, and when an item with the same name and type has a different one it [asks you to overwrite it](https://learn.microsoft.com/en-us/fabric/cicd/git-integration/logical-id-conflict-resolution). Deployment pipelines keep their own [pairing link](https://learn.microsoft.com/en-us/fabric/cicd/deployment-pipelines/assign-pipeline#item-pairing). fabric-cicd [looks items up](https://github.com/microsoft/fabric-cicd/blob/main/src/fabric_cicd/fabric_workspace.py) by name and type, so a rename creates a new item.

It should be one rule everywhere: match on the logicalId first, and fall back to the item id, then name and type, only when there isn't one. Assign the logicalId at creation rather than when an item first reaches git or a deployment plan, and let every reference store one, so it resolves to the right copy in whichever environment it lands in. That is what closes the binding gaps above.

Workspaces need the same treatment. They have no logicalId, so nothing says "this is the test copy of the data workspace", and everyone says it with naming conventions instead. Deployment pipelines half-built it. A stage is an environment, and [autobinding across pipelines](https://learn.microsoft.com/en-us/fabric/cicd/deployment-pipelines/understand-the-deployment-process#autobinding-across-workspaces) uses the stage position to find the right copy of another workspace. Microsoft started down this road in [January 2022](https://learn.microsoft.com/en-us/power-platform-release-plan/2021wave2/power-bi/deployment-pipelines-multiple-pipelines-working-together), before Fabric existed, and left it inside the pipeline, where you can read it through the pipeline's own API but never from the workspace. Put it on the workspace instead:

```json title="What a workspace could carry"
{
  "id": "55555555-5555-5555-5555-555555555555",
  "displayName": "contoso-data-test",
  "logicalId": "e553e3b0-0260-4141-a42a-70a24872f88d",
  "environment": "test"
}
```

`logicalId` says which workspace this is a copy of, and `environment` says which copy. A reference stored as workspace logicalId plus item logicalId then resolves against the workspace with the same environment, in git sync, deployment pipelines and bulk import alike. The environment picks the active value set, so a new workspace no longer lands on Default. An empty environment fills in order, since nothing needs an id that doesn't exist yet. And the workspace list can group by logicalId, which does more for sprawl than any naming convention.

### Feature Completeness

The rest of the gaps are native features that stop short. Auto-binding, Variable Libraries, the APIs and service principal support each cover some items, some tools or some identities. A feature should work for everything it touches.

### Feature Parity

Completeness fixes each feature. This would also resolve parity. For example a team currently has to use `parameter.yml` to define environment-specific values, because Variable Libraries are not supported for a item type. So a team picks a world by the features it needs rather than how it wants to work, and moving later means starting again.

The two worlds then become two front ends. A team could start with deployment pipelines and move to a devops pipeline without rebuilding anything, and two teams could share a repo with different tools. The only difference is process.

## Conclusion

I'm not asking for the low-code side to go away. I'm asking for one rule for what makes an item, or a workspace, the same one, for the native features to be complete, and for both worlds to have them. Right now the code-first tooling is more complete, the two worlds share few features, teams end up in silos, and there's no clear path from one to the other. Rant over.
