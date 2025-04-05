---
title: Monitoring for Power BI Admins
description: What is going on in your Power BI Tenant?
author: duddy
date: 2025-04-05 19:00:00 +0000
categories: [Power BI Administration, Reporting]
tags: [power bi administration]
pin: false
image:
  path: /assets/img/0026-Tenant%20Monitoring/hero.png
  alt: Power BI Admin Monitoring
---

Administration of a Power BI tenant can be tough. You have tread the line of giving developer space to develop reports to meet the companies reporting requirements, whilst also make sure the platform runs smoothly. A single report, that was not fully reviewed can consume all your CUs, leading to throttling and service degradation. What options are there for tenant observability?

## Fabric Capacity Metrics App

The most important report provided is one provided by Microsoft, the [Fabric Capacity Metrics App](https://learn.microsoft.com/en-us/fabric/enterprise/metrics-app). You need to install this from the App store.

When you purchase a capacity, you get a set number of [Capacity Units (CU)](https://learn.microsoft.com/en-us/power-bi/developer/embedded/embedded-capacity#sku-computing-power) to perform any compute. For P1/F64, for example, this is 64 CU per second, which you can use to perform operations. There are two types of operations; Background operations, which are long duration, high CU tasks like Semantic Model refreshes, and Interactive operations for short term, low CU operations like queries from Power BI report visuals. In general usage of the capacity can be quite spiky, smoothing is applied to help even out the spikes, averaging out a operations CUs over a period of time. Background operations are smoothed over 24 hours and Interactive operations over 5 minutes. If you exceed your allocated limit you can experience various tier of [throttling](https://learn.microsoft.com/en-us/fabric/enterprise/throttling). 

The Fabric Capacity Metrics App shows your usage of the CUs over time. This allows you to keep track of your usage, identify expensive Semantic Models for optimization work, or load balance between capacities.

![CUs over Time](/assets/img/0026-Tenant%20Monitoring/fabric-cross-filter.gif)
<cite>[Microsoft Docs](https://learn.microsoft.com/en-us/fabric/enterprise/metrics-app-compute-page#utilization)</cite>

You are able to build custom Reports from the Semantic Model. I found the following view to provide the most value to me, helping pinpoint problematic Semantic Models. This visual uses `Dates[Date]`{:. txt}, `Items[WorkspaceName]`{:. txt}, `Items[ItemName]`{:. txt}, `MetricByItemandOperationandDay[Operation Name]`{:. txt} and `MetricByItemandOperationandDay[sum_CU]`{:. txt}.

![Custom View](/assets/img/0026-Tenant%20Monitoring/Capacity%20App%20Custom%20View.png)

## Feature Usage and Adoption Report

If you have the Fabric Administrator role you also have access to the [Feature Usage and Adoption Report](https://learn.microsoft.com/en-us/fabric/admin/feature-usage-adoption) out of the box, in the Admin monitoring Workspace. This provides some basic reporting on usage and activities on the tenant. This provides data for the last 30 days.

![Feature Usage and Adoption Report](/assets/img/0026-Tenant%20Monitoring/Feature%20usage%20and%20adoption%20report.png)


## Log Analytics Integration 

Power BI has a [integration with Log Analytics](https://learn.microsoft.com/en-us/power-bi/transform-model/log-analytics/desktop-log-analytics-overview). This sends Analysis Services engine trace events, from connected Workspaces to Log Analytics.

Microsoft has provided the [Fabric Log Analytics for Analysis Services Engine report template](https://github.com/microsoft/PowerBI-LogAnalytics-Template-Reports/blob/main/FabricASEngineAnalytics/README.md). This uses Execution Metrics Logs to provide reporting on CPU and duration metrics for operations performed by Semantic Models. Additionally Progress Report Logs are used to give addition details on Refreshes. 

![Queries Over Time](/assets/img/0026-Tenant%20Monitoring/Log%20Analytics.png)
<cite>[Fabric Log Analytics for Analysis Services Engine report template](https://github.com/microsoft/PowerBI-LogAnalytics-Template-Reports/blob/main/FabricASEngineAnalytics/README.mdn)</cite>

This data is very useful for:

- Identifying expensive queries and refreshes
- Track and debug Refresh failures
- Track and trend errors
- Determine exact queries that resulted in errors for users
- Generate report usage metrics

## Scanner APIs

>With the scanner APIs, you can extract information such as item name, owner, sensitivity label, and endorsement status. For Power BI semantic models, you can also extract the metadata of some of the objects they contain, such as table and column names, measures, DAX expressions, mashup queries, and so forth. The metadata of these semantic model internal objects is referred to as subartifact metadata.
> 
> -- <cite>[Microsoft Docs: Run metadata scanning](https://learn.microsoft.com/en-us/fabric/governance/metadata-scanning-overview)</cite>

I have a [previous post](https://evaluationcontext.github.io/posts/graphframes/) on using the [Scanner APIs](https://learn.microsoft.com/en-us/fabric/governance/metadata-scanning-overview) to extracting tenant metadata. 

[Rui Romano](https://www.linkedin.com/in/ruiromano/) has a reporting solution, [pbimonitor](https://github.com/RuiRomano/pbimonitor), that visuals that data as a catalogue for all Power BI assets.

![Catalogue](/assets/img/0026-Tenant%20Monitoring/RuiCatalogue.png)
<cite>[pbimonitor](https://user-images.githubusercontent.com/10808715/130269862-77293a90-bacf-4ac4-88a9-0d54efc07977.pngn)</cite>

## Log Analytics Integration and Scanner APIs BFFs

The real power comes from combining the Log Analytics and Scanner APIs. Lets first look at the Scanner. We can define a `Objects`{:. txt} table, which is a union of Workspaces, Semantic Models and Reports, whose IDs are all captured in a single field `objectId`{:. txt}. Additionally it worth having `datasetId`{:. txt} against both Semantic Models and Reports, meaning for Reports, you can determine the upstream Semantic Model, and for Semantic Model, all the downstream Reports.

![Scanner API ER Diagram](/assets/img/0026-Tenant%20Monitoring/Scanner%20ER.png)

Log Analytics records Semantic Model server traces, so we can easily appended the data model from the Fabric Log Analytics for Analysis Services Engine report template. We connect it to the `Objects`{:. txt} table rather than to the `Semantic Models`{:. txt} dimension so it respects the filters from the other dimensions.

![Server Traces ER Diagram](/assets/img/0026-Tenant%20Monitoring/Log%20ER.png)

Now the Server Traces have been enriched you get some benefits. Firstly you can see items that have no traces, which means you can identify unused artifact that can be decommissioned. Secondly, the logs have `reportId`{:. txt}, with a report dimension you can provide the report name making the data more understandable.

You can see in the Scanner ER diagram I have the `accessToObjects`{:. txt} and `accessToObject Edges`{:. txt} tables. These are from my previous posts on [GraphFrames](https://evaluationcontext.github.io/posts/graphframes/), and are used in a [Deneb Force Direct graph](https://evaluationcontext.github.io/posts/deneb-force-directed/). These allow you to know the exact permissions a specific user has on Workspace, Semantic Models etc, even if they inherit the permission through a long chain of User Groups. Additionally you can filter to a specific object and visually see what permissions are granted and by what path.

![Force Directed Graph](/assets/img/0019-ForceDirected/object_permissions.png)

For me, the last piece of the puzzle, is to add a tenant wide Vertipaq Analyzer scan. If you have Fabric this is easy as you can run the DMVs with Sempy, as investigated in my previous post on [Vertipaq Analyzer](https://evaluationcontext.github.io/posts/vertipaq-analyzer/). I don't, and annoyingly the REST APIs don't support DMVs or DAX INFO functions. This could be a fantastic addition, allowing the identification of potential areas for optimizations, by comparing refresh times to Semantic Model sizes for example.

## FUAM

If you have Fabric there is now another solution that is part of [Microsoft's Fabric Toolbox](https://github.com/microsoft/fabric-toolbox/tree/main): [Fabric Unified Admin Monitoring](https://github.com/microsoft/fabric-toolbox/tree/main/monitoring/fabric-unified-admin-monitoring) (FUAM).

FUAM extracts the following data from the tenant and stores it in a lakehouse:

- Tenant Settings
- Delegated Tenant Settings
- Activities
- Workspaces
- Capacities
- Capacity Metrics
- Tenant meta data (Scanner API)
- Capacity Refreshables
- Git Connections

It calls a large number of Power BI and Fabrics APIs, including the the Activity, and Scanner APIs. It also gets CU usage data from the Fabric Capacity Metrics App. Interestingly it also runs [Semantic Links Labs Vertipaq Analyzer](https://semantic-link-labs.readthedocs.io/en/stable/sempy_labs.html#sempy_labs.vertipaq_analyzer) to get sizes or Semantic Models tables, columns etc.

If you have Fabric and need some quick information this could be a fantastic start. It does lack the Server Traces, but if you setup the Log Analytics integration you can still report on this separately with the template mentioned above.