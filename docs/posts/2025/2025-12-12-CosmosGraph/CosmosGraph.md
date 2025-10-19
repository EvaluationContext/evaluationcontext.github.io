---
title: DAX UDF Colour Library
description: A DAX UDF colour library to manipulate HEX colours
image:
  path: /assets/images/blog/2025/2025-09-16-UDFColours/icon.png
  alt: EvaluationContext.Colour
date:
  created: 2025-09-16
  updated: 2025-10-19
authors:
  - jDuddy
comments: true
categories:
  - Draft
slug: CosmosGraph
draft: true
---

Create Cosmos DB (preview) [CosmosGraph]
New Container
    In Azure Cosmos DB, a container is the fundamental unit of scalability and where your actual data (items) is stored. Think of it as analogous to a table in a relational database, a collection in MongoDB, or a graph in Gremlin
    Essentially, the container is where your data resides and where you define how that data is organized, partitioned, and scaled within your Azure Cosmos DB account.
    Generally, for a single graph (vertices and edges that belong to the same logical graph), you will typically use one container.

    Here's why:

    - **Co-location of Vertices and Edges:** In Cosmos DB's Gremlin API, edges are stored with their source vertices. This is a crucial optimization. When you query for outgoing edges from a vertex (out()), the data is likely to be co-located within the same logical and physical partition, minimizing cross-partition queries (which are more expensive and slower).

    - **Simplified Management:** Managing a single container for your graph simplifies your data model, security, and provisioning.

    - **Scalability:** A single container with a well-chosen partition key can scale to handle massive amounts of data and throughput. Cosmos DB automatically distributes the data across physical partitions based on your partition key

    `Container id`{:.txt}
    `Partition key`{:.txt}
        This is a property within your items that Cosmos DB uses to distribute data across different physical partitions. Choosing an effective partition key is crucial for optimal performance and cost efficiency.
        The partition key must be a property of your vertices. It cannot be id or label.
        **High-Cardinality, Frequently Queried Property:** Choose a property that has a wide range of values and is often used to filter or start traversals. 
        Recommended: /EntityType (e.g., "User", "UserGroup", "Workspace", "SemanticModel", "Report")
This is often the best default choice for a single-tenant graph for a few reasons:

Good Distribution: It naturally segregates your data by type. Instead of all vertices and edges being in one massive logical partition, they are distributed across 5 (or so) logical partitions: User, UserGroup, Workspace, SemanticModel, Report.

Logical Grouping: Queries often start or filter by entity type (e.g., "show all users," "show all workspaces").

Manageable Hotspots: While Workspace or User might become larger logical partitions, the other types will be smaller, and Cosmos DB can scale these individual logical partitions onto multiple physical partitions if they grow large enough.

Example Vertex Structure with /EntityType as Partition Key:

v.addV('User').property('id', 'user123').property('pk', 'User').property('name', 'Alice')

v.addV('UserGroup').property('id', 'groupXYZ').property('pk', 'UserGroup').property('name', 'Sales Team')

v.addV('Workspace').property('id', 'wsABC').property('pk', 'Workspace').property('name', 'Finance Dashboard')

Example Edge Structure:

g.V('user123').has('pk', 'User').addE('memberOf').to(g.V('groupXYZ').has('pk', 'UserGroup'))

g.V('groupXYZ').has('pk', 'UserGroup').addE('hasPermissionTo').to(g.V('wsABC').has('pk', 'Workspace')).property('permissionType', 'Read')

Gremlin Queries with /EntityType Partition Key:

When querying, you must always include the partition key for specific vertex lookups:

Get a specific user: g.V(['User', 'user123']) or g.V('user123').has('pk', 'User')

Get all workspaces: g.V().has('pk', 'Workspace').hasLabel('Workspace') (This will be a cross-partition query if you have many workspaces that span multiple physical partitions, but within the single Workspace logical partition).

Find permissions for a user:

Code snippet

g.V(['User', 'user123']).out('hasPermissionTo').valueMap()
(Efficient, as it's an out() traversal from a specific vertex.)

Find users with access to a specific workspace:

Code snippet

g.V(['Workspace', 'wsABC']).in('hasPermissionTo').valueMap()
(This in() traversal is less efficient and likely a cross-partition query. If this is a very frequent and critical query, consider the strategies below.)
