---
title: Incremental Refresh on Slowly Changing Dimension in Power BI
description: Incremental Refresh on Slowly Changing Dimension in Power BI
author: duddy
date: 2025-02-13 20:00:00 +0000
categories: [Incremental Refresh]
tags: [power bi, incremental refresh]
pin: false
image:
  path: /assets/img/0023-SlowChangingDimensions/RefreshPolicy.png
  alt: Incremental Refresh
---

[Incremental Refresh](https://learn.microsoft.com/en-us/power-bi/connect-data/incremental-refresh-overview) is a powerful tool for reducing processing during Power BI Semantic Model Refreshes. However, for Dimensions it is often overlooked. Here are some thoughts and considerations to keep in mind when implementing Incremental Refresh.

## Incremental Refresh

A Semantic Model table, by default, has a single [partition](https://learn.microsoft.com/en-us/analysis-services/tabular-models/partitions-ssas-tabular?view=asallproducts-allversions). If table has a Incremental Refresh Policy configured, when the model is deployed to the service, on the first refresh, the policy is applied and multiple [partitions](https://learn.microsoft.com/en-us/analysis-services/tabular-models/partitions-ssas-tabular?view=asallproducts-allversions) are created, each accounting for a continuous date range. Within the policy you can define a Incremental Window and a Archive Window. Partitions within the Incremental Window are hot, and are refreshed when the model is refreshed. Those in the Archived Window are cold and are not refreshed. As time progresses new partitions are created to capture data from new dates, and partitions that fall out of the Incremental Window archived.

> You are able to refresh Archived partitions using the XMLA endpoint, by calling a full [Refresh command](https://learn.microsoft.com/en-us/analysis-services/tmsl/refresh-command-tmsl?view=asallproducts-allversions) for the given table or partition. A full refresh command on the model will not touch archived partitions. You can also use a [Enhanced Refresh API](https://learn.microsoft.com/en-us/power-bi/connect-data/asynchronous-refresh) call.
{: .prompt-tip}

![Incremental Refresh](/assets/img/0023-SlowChangingDimensions/incremental-refresh-rolling-window-pattern.png)

[Microsoft Docs: Incremental refresh and real-time data for semantic models](https://learn.microsoft.com/en-us/power-bi/connect-data/incremental-refresh-overview)

Incremental Refresh can decrease Refresh processing and times:

- Partitions are refreshed in parallel
- Only import recent data, archiving older date
- Polling Expression can be set to avoid refreshing partition with no new data

> When considering the Incremental Refresh policy you need to consider the size of data and how many rows you'd expect in each partition. Power BI by default has a segment size of 1 million rows, and 8 million when Large Data Format is enabled. If data within a partition size is expected to be below the size of a segment you could except worse query performance.
{: .prompt-info}

Incremental Refresh also allows you set a Polling Expression that determines if a partition will refresh or not. Polling expression are a [M](https://learn.microsoft.com/en-us/powerquery-m/) expression that is called for each partition, returning a scalar value. This value is checked against a refreshBookmark store within the metadata of the partition, if the value returned by the Polling Expression matches the refreshBookmark, the partition does not refresh. If it differs, the refresh occurs and the refreshBookmark is updated. [Chris Webb](https://www.linkedin.com/in/chriswebb6/) has a good [blog post](https://blog.crossjoin.co.uk/2022/07/31/custom-queries-for-detect-data-changes-in-power-bi-incremental-refresh/) on this topic, and the Microsoft Docs also describes this [detect data changes](https://learn.microsoft.com/en-us/power-bi/connect-data/incremental-refresh-xmla#custom-queries-for-detect-data-changes) feature.

## Incremental Refresh on Dimensions?

In dimensional modelling there are various forms of dimension, each of which differ in the approach applied in handling the evolution of dimensions attributes over time. This is a concept described by [Kimball](https://en.wikipedia.org/wiki/Ralph_Kimball) as [Slowly Changing Dimension (SCD)](https://www.kimballgroup.com/2008/08/slowly-changing-dimensions/).

Type 1 SCD are full overwrites of data and therefore are not suitable for incremental refresh.

With higher order SCDs, incremental refresh can be possible since new rows are added to capture data changes, with a date for the change. We can use the modified date for incremental refresh. Of note, within our Semantic Model we need to use surrogate keys in the fact and dimension table, as the natural key would result in a many-many relationship. 

When including higher order SCDs in your model you have to consider how you want filtering to occur. In some circumstances you may want to filter on a historical attribute, returning only the transactions related to the dimension by the surrogate key, representing transaction for a given time period. This might be because a customer is related to different sales reps over time and you want to only attribute sales to a rep when they were working with the customer. But you may also want to filter on the current status and return all transactions related to the natural key, not the current surrogate key. In this case you have two options, (1) add fields to the table for current attributes, but that would not work with incremental refresh because of archived partitions. (2) Create another dimension in the SCD 1 form representing current data related to the fact table via the natural key.

## Polling Expression on Type 1 SCD

I only just said Type 1 SCD are not suitable for incremental refresh. But polling expressions could be helpful to reduce the import of unnecessary data, and they are only available with Incremental Refresh.

For the polling expression to work we need to have some scalar value that we would expect to change if the data updates. If we consider higher order case above, we have a modified date we can leverage. We can create the SCD type 1 table by filtering the higher order table to return the most recent record for each natural key, keeping the `modified date`{:. console}.

If we want to setup Incremental Refresh we would only want a Incremental Window, with no Archive Window, otherwise we risk having duplicates of the same natural key. The problem is we cannot set a Archive Window of 0. We can overcome this limitation by adding a additional `Date`{:. console} field to the table, with today's date.

We can now setup Incremental Refresh. First we define our `RangeStart`{:. console} and `RangeEnd`{:. console} and use this to filter on `Date`{:. console}.

```fsharp
let
    Source = Sql.Database("dwdev02","AdventureWorksDW2017"),
    Data  = Source{[Schema="dbo",Item="FactInternetSales"]}[Data],
    IncrementalRefresh = Table.SelectRows(Data, each [Date] >= RangeStart and [Date] < RangeEnd)
in
    IncrementalRefresh
```

I'll set Incremental Window period to 2 year and the Archive Window to 1 year. Additionally we'll add `modifiedDate`{:. console} for the polling Expression.

![Incremental Refresh Power BI](/assets/img/0023-SlowChangingDimensions/RefreshPolicyPowerBI.png)

We can open Tabular Editor and apply the Refresh Policy.

> Power BI Desktop does not support multiple partitions. You can recover by creating a new partition and copy in the source expression. You then need to delete the incremental refresh partitions and remove the policy.
{: .prompt-warning}

![Incremental Refresh Tabular Editor Original](/assets/img/0023-SlowChangingDimensions/RefreshPolicy.png)

We get 3 partitions, one for each year. Since we have set the `Date`{:.text} to today's date, only this year's partition will ever get data. We added an additional year so that we will only ever have a empty partition in the Incremental Window as a buffer to roll into the archive window. This effectively gives us one active partition like we had before applying Incremental Refresh but we get the benefit of a polling expression checking to see if there is a more recent `modified date`{:. console}.