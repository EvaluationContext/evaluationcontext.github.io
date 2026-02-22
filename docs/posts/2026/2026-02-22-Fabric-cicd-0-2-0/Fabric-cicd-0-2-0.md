---
title: Fabric-CICD - It's Official
description: Fabric-cicd hits v0.2.0 with official Microsoft support, long-term roadmap commitment, and deep Fabric platform integration
image: /assets/images/blog/2026/2026-02-22-Fabric-cicd-0-2-0/fabric-cicd.png
date:
  created: 2026-02-22
authors:
  - jDuddy
comments: true
categories:
  - CICD
links:
  - fabric-cicd Docs: https://microsoft.github.io/fabric-cicd/latest/
  - Fabric Blog: https://blog.fabric.microsoft.com/en-gb/blog/announcing-official-support-for-microsoft-fabric-cicd-tool?ft=All
  - Fabric-cicd, Kicking the tyres: https://evaluationcontext.github.io/posts/fabric-cicd/
  - Fabric-CICD Updates - Semantic Models, Parameters and Config: https://evaluationcontext.github.io/posts/Fabric-cicd-0-1-33/
slug: posts/Fabric-cicd-0-2-0
---

Big news for Fabric-cicd, with a version bump to [v0.2.0](https://microsoft.github.io/fabric-cicd/0.2.0/) and an [announcement](https://blog.fabric.microsoft.com/en-gb/blog/announcing-official-support-for-microsoft-fabric-cicd-tool?ft=All) that it is now officially supported.

I've already covered the project a couple of times on my blog, so I'm not going to dive deep on the nuts and bolts again. But basically, Fabric-cicd is an open source Python library designed to streamline Continuous Deployment workflows within Microsoft Fabric. It offers a clean abstraction on top of the Fabric APIs allowing you to easily deploy your Source Controlled Fabric items.

??? info "Previous Blog Posts"

    - [Fabric-cicd, Kicking the tyres](https://evaluationcontext.github.io/posts/fabric-cicd/)
    - [Fabric-CICD Updates - Semantic Models, Parameters and Config](https://evaluationcontext.github.io/posts/Fabric-cicd-0-1-33/)

## Official Support

Over the past year, fabric-cicd has rapidly evolved through collaboration with engineering, CAT, MVPs, enterprise customers, and the community. Growing usage and adoption by organizations building enterprise-grade deployment pipelines solidified its value within the Fabric ecosystem, through it's flexibility to support deployment scenarios that Git Integration and deployment pipelines alone don't.

!!! quote "Official support for Fabric-cicd"

    With this announcement, we're affirming long-term support, quality, roadmap ownership, and deep integration with the broader Fabric platform—including Git Integration, Fabric REST APIs, the CLI, and future deployment capabilities.

    -- <cite>[Fabric Blog][1] </cite>

    [1]: https://blog.fabric.microsoft.com/en-gb/blog/announcing-official-support-for-microsoft-fabric-cicd-tool?ft=All

What this means in practice is that fabric-cicd is now a fully recognized, Microsoft-backed part of the Fabric CI/CD story.

## v0.1.x Recap

Fabric-cicd was released on 23-Jan-25. Over the course of 34 releases across ~13 months, the library has matured substantially. 

This included:

- Increased flexibility in parameterization
- Performance improvements
- YAML configuration file-based deployment via `#!py deploy_with_config()` (**[v0.1.26](https://microsoft.github.io/fabric-cicd/latest/changelog/#v0126-september-05-2025)**)
- Semantic model binding (**[v0.1.31](https://microsoft.github.io/fabric-cicd/latest/changelog/#v0131-december-01-2025)**)
- Support for more Fabric Item types:

| Item Type | Version |
|-----------|---------|
| Notebook | [v0.1.0](https://microsoft.github.io/fabric-cicd/latest/changelog/#v010-january-23-2025) |
| Data Pipeline | [v0.1.0](https://microsoft.github.io/fabric-cicd/latest/changelog/#v010-january-23-2025) |
| Semantic Model | [v0.1.0](https://microsoft.github.io/fabric-cicd/latest/changelog/#v010-january-23-2025) |
| Report | [v0.1.0](https://microsoft.github.io/fabric-cicd/latest/changelog/#v010-january-23-2025) |
| Environment | [v0.1.0](https://microsoft.github.io/fabric-cicd/latest/changelog/#v010-january-23-2025) |
| Lakehouse | [v0.1.6](https://microsoft.github.io/fabric-cicd/latest/changelog/#v016-february-24-2025) |
| Mirrored Database | [v0.1.9](https://microsoft.github.io/fabric-cicd/latest/changelog/#v019-march-11-2025) |
| Workspace Folders | [v0.1.13](https://microsoft.github.io/fabric-cicd/latest/changelog/#v0113-april-07-2025) |
| Variable Library | [v0.1.13](https://microsoft.github.io/fabric-cicd/latest/changelog/#v0113-april-07-2025) |
| CopyJob | [v0.1.17](https://microsoft.github.io/fabric-cicd/latest/changelog/#v0117-may-13-2025) |
| Eventstream | [v0.1.17](https://microsoft.github.io/fabric-cicd/latest/changelog/#v0117-may-13-2025) |
| Eventhouse / KQL Database | [v0.1.17](https://microsoft.github.io/fabric-cicd/latest/changelog/#v0117-may-13-2025) |
| Data Activator | [v0.1.17](https://microsoft.github.io/fabric-cicd/latest/changelog/#v0117-may-13-2025) |
| KQL Queryset | [v0.1.17](https://microsoft.github.io/fabric-cicd/latest/changelog/#v0117-may-13-2025) |
| SQL Database | [v0.1.19](https://microsoft.github.io/fabric-cicd/latest/changelog/#v0119-may-21-2025) |
| Warehouse | [v0.1.19](https://microsoft.github.io/fabric-cicd/latest/changelog/#v0119-may-21-2025) |
| KQL Dashboard | [v0.1.20](https://microsoft.github.io/fabric-cicd/latest/changelog/#v0120-june-12-2025) |
| Dataflow Gen2 | [v0.1.20](https://microsoft.github.io/fabric-cicd/latest/changelog/#v0120-june-12-2025) |
| API for GraphQL | [v0.1.22](https://microsoft.github.io/fabric-cicd/latest/changelog/#v0122-june-25-2025) |
| Apache Airflow Job | [v0.1.29](https://microsoft.github.io/fabric-cicd/latest/changelog/#v0129-october-01-2025) |
| Mounted Data Factory | [v0.1.29](https://microsoft.github.io/fabric-cicd/latest/changelog/#v0129-october-01-2025) |
| Data Agent | [v0.1.30](https://microsoft.github.io/fabric-cicd/latest/changelog/#v0130-october-20-2025) |
| ML Experiment | [v0.1.31](https://microsoft.github.io/fabric-cicd/latest/changelog/#v0131-december-01-2025) |
| User Data Function | [v0.1.31](https://microsoft.github.io/fabric-cicd/latest/changelog/#v0131-december-01-2025) |
| Spark Job Definition | [v0.1.34](https://microsoft.github.io/fabric-cicd/latest/changelog/#v0134-january-20-2026) |

## v0.2.0

Just over a year since the initial release, fabric-cicd got its first minor bump from `v0.1.x` :material-arrow-right: `v0.2.0`. Here's what changed:

### New Functionality

- **Parallelized deployments within item types** — deployments of items of the same type can now run concurrently, significantly reducing overall deployment time
- **Semantic model binding per environment** — bind semantic models to different data sources per environment during deployment
- **Configuration-based deployment without feature flags** — `#!py deploy_with_config()` is now GA and no longer requires an experimental flag
- **Black-box REST API testing harness** — a new testing framework for validating deployments against live Fabric APIs
- **Logging improvements** — header print messages converted to info-level logs for cleaner pipeline output

### Bug Fixes & Optimizations

- Removed OrgApp item type support
- Improved environment-mapping behavior in optional config fields
- Fixed duplicate YAML key detection in parameter validation
- Added caching for item attribute lookups for better performance

## Conclusions

If you are running into roadblocks or headaches with the current git integration or deployment pipeline, or just want more flexibility, give [Fabric-cicd](https://microsoft.github.io/fabric-cicd/latest/) a go!