---
title: LogicalIds and Variable Libraries Do the Same Job
description: A thought from FabFest on why logicalIds and Variable Libraries exist, how they can return noise in git
image: hero.jpg
date:
  created: 2026-10-15
authors:
  - jDuddy
comments: true
categories:
  - CI/CD
tags:
  - Microsoft Fabric
  - CI/CD
  - Git
  - fabric-cicd
links:
  - Fabric CICD - Two Different Worlds: https://evaluationcontext.com/posts/fabric-cicd-two-worlds/
  - MS Docs - Git source code format: https://learn.microsoft.com/en-us/fabric/cicd/git-integration/source-code-format
  - MS Docs - Dependency binding in cross-workspace deployment: https://learn.microsoft.com/en-us/fabric/cicd/cross-workspace-dependency-binding
  - MS Docs - Variable Library overview: https://learn.microsoft.com/en-us/fabric/cicd/variable-library/variable-library-overview
  - fabric-cicd Docs - Item types: https://microsoft.github.io/fabric-cicd/latest/reference/item_types/
slug: posts/logicalid-variable-libraries
---

I spoke at [FabFest](https://fabfestconf.com/) today on [Fabric-CICD: From Click Ops to DevOps](https://github.com/EvaluationContext/evaluationcontext.github.io/tree/master/Resources/presentations/26-10-FabFest). The talk felt like a bit of a chaotic stream of thought from where I was standing, but it seemed to land well. The useful part came afterwards, talking to people in the hallway, when a thought I had been dancing around for a while finally clicked. Obvious in hindsight, but worth sharing, so here is another stream of thoughts.

## ObjectId

Every item in Fabric has an :material-tag-off-outline: **objectId**, the GUID you see in the URL, unique to that item in that workspace. When items reference each other they do so by :material-tag-off-outline: **objectId**, by :material-tag-text-outline: **name or URL**, or by :material-tag-outline: **logicalId**, depending on the team that built the item type.

That is fine in one workspace. Promote to another (`dev` :material-arrow-right: `test` :material-arrow-right: `prod`) and an :material-tag-off-outline: **objectId** reference still points at the original item in the original workspace. Every environment has its own GUIDs, so every promotion means a round of GUIDs that have to change, and noise in git.

## LogicalId

A :material-tag-outline: **logicalId** is a GUID too, but it is only unique within a workspace. It lives in the item's `.platform` file and follows the item across environments, so the dev, test and prod copies all share one.

!!! quote "Microsoft Docs: Git source code format"

    The logicalId connects an item in a workspace with its corresponding item in a Git branch. Items with the same logicalIds are assumed to be the same. The logicalId preserves the link even if the name or directory change. Since a branch can be synced to multiple workspaces, it's possible to have items in different workspaces with the same logicalId, but a single workspace can't have two items with the same logicalId.
    -- <cite>[Microsoft Docs: Git source code format](https://learn.microsoft.com/en-us/fabric/cicd/git-integration/source-code-format#platform-file)</cite>

When a reference is stored as a :material-tag-outline: **logicalId**, Fabric autobinds it: the :material-tag-off-outline: **objectId** is swapped out on the way into git and swapped back on the way into the new workspace. Nothing in git changes between environments.

## Variable Libraries

[Variable Libraries](https://learn.microsoft.com/en-us/fabric/cicd/variable-library/variable-library-overview) replace the :material-tag-off-outline: **objectId** with a reference to a variable. The item definition holds the variable name, and each workspace holds, outside of git, which value set is active determines what the variable resolves to.

## The Same Job

This is the thought. They both do the same job, at least in respects to git. They keep references environment-agnostic, so the right item is referenced whichever workspace the definition lands in, and that removes GUID churn and noise from git. One is implicit and the platform resolves it, the other is explicit and you maintain the values.

The issue is that there are item types that support neither, so they have to be dealt with using [fabric-cicd](https://microsoft.github.io/fabric-cicd/latest/) and `parameter.yml`. But you are overwriting :material-tag-off-outline: **objectId** with the new environment's :material-tag-off-outline: **objectId** on every deployment. 

I feel this most in feature workspaces, which I provision for every feature branch by deploying with fabric-cicd, then connecting to git, and perform a commit, to lock in the GUIDs, so the branch and workspace are in sync, ready for a developer's to start working on it. 

I also, begrudgingly, connect the dev workspace to git purely so the [workspace relation](https://learn.microsoft.com/en-us/fabric/cicd/git-integration/branched-workspace#branch-workspace) nests feature workspaces under it. But with a rule, that this workspace should never be sync'ed. The risk being that is someone did, then they write :material-tag-off-outline: **objectId**'s from the last feature branch to merge into `main`, into the dev workspace.

## Conclusion

:material-tag-outline: **LogicalIds** and **Variable Libraries** are two implementations of one idea: get the GUIDs that change between environments out of the item definition, so one definition in git works in every workspace. It would, be nice if more items supported them.

My thoughts on Variable Libraries are softening, since I found that hidden deep in the [fabric-cicd documentation](https://microsoft.github.io/fabric-cicd/latest/reference/item_types/#variable-library) is the fact that it sets the active value set during deployment if the `environment` and set names match. If autobinding was complete, you wouldn't even have to use item references](https://learn.microsoft.com/en-us/fabric/cicd/variable-library/item-reference-variable-type#how-it-works) to items within the same workspace. Item references would then only be required for cross-workspace references. But... I still have problems with item references. They need a :material-tag-off-outline: **objectId**, so the item you are referencing already has to exist, which still makes them hard to use when trying to orchestrate deployments across multiple workspaces, which could be resolved if they supported :material-tag-outline: **logicalId** instead.

