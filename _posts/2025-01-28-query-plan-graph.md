---
title: Graphing DAX Query Plans
description: Using Vega Force Directed Graphs to visualizing DAX Query Plans
author: duddy
date: 2025-01-28 10:00:00 +0000
categories: [Data Viz, Vega]
tags: [dax, vega, force directed, python]
pin: false
image:
  path: /assets/img/0020-queryPlanGraph/PhysicalQueryPlan.png
  alt: DAX Physical Query Plan Vega
---
 
Ever since completing [SQLBI's Optimizing DAX course](https://www.sqlbi.com/p/optimizing-dax-video-course/) I started looking at DAX query plans in more depth. I've found the fully textual plans hard to parse, with only indents to denote nested operations. This is fine until you get multiple paths nested below the same node, it hard to keep the full execution plan in your head. I've always liked SQL servers graphical query plans so I want to investigate how to build the same.

## Query

We are going to be looking at the execution of the following query, from a [previous post](https://evaluationcontext.github.io/posts/Window-Function/).

```dax
EVALUATE
SUMMARIZECOLUMNS(
    'Calendar'[Date],
    'States'[State],
    "Using_TOPN", [Using TopN]
)
```

## SQL Server Profiler

The Query Plan can be obtained from running SQL Server Profiler and grabbing the `DAX Query Plan`{:.console} event.

![SQL Server Profiler Setup](/assets/img/0020-queryPlanGraph/SQLProfilerSetup.png)

>Clear cache prior to query execution to avoid using the cache
>```xml
><Batch xmlns="http://schemas.microsoft.com/analysisservices/2003/engine">
>  <ClearCache>
>    <Object>
>      <DatabaseID>SemanticModel_ABC</DatabaseID>
>    </Object>
>  </ClearCache>
></Batch>
>```
{: .prompt-tip }

 When we run our query we see two events, the Logical query plan and the Physical query plan. The SQLBI guys go into detail on DAX query plans in their [Optimizing DAX course](https://www.sqlbi.com/p/optimizing-dax-video-course/), plus they also have a [white paper](https://www.sqlbi.com/whitepapers/understanding-dax-query-plans/) on the subject. The Logical Query Plan is created first, and resembles the DAX query. This is then converted the Physical Plan for execution. We can see a number of rows with increasing indent. Each increase in indent represents a nested operation. So we need to read the plan from the leaf to the root to understand how data stored in SSAS Tabular is being processed to return the output of the query.

![SQL Server Profiler Results](/assets/img/0020-queryPlanGraph/SQLProfilerLog.png)

My main bugbear with this is that if you have several groups of operations that all use the same step, it can be quite hard to keep track of all the interactions. What I'd really like is a graphical view like you get from SQL Server.

![SQL Server Query Plan](/assets/img/0020-queryPlanGraph/SQLServerQueryPlan.png)
[*SQL Server Query Plan*](https://learn.microsoft.com/en-us/sql/relational-databases/performance/display-an-actual-execution-plan?view=sql-server-ver16)

Lets save this trace: File > Save As > Trace XML File... > `trace.xml`{:.console}

## Processing XML Trace

We now need to process the XML to generate the appropriate data structure to generate a graph.

### Dependencies

```python
import xmltodict
import json
import re
```

### XML to dict

```python
EventSubClass ={
    1: 'logical',
    2: 'physical'
}
queries = {}

with open('trace.xml', encoding='utf-16') as fd:
    queryPlan = xmltodict.parse(fd.read(), encoding='utf-16')

for event in queryPlan['TraceData']['Events']['Event']:
    if event['@name'] == 'DAX Query Plan':
        
        for column in event['Column']:
            
            if column['@name'] == 'TextData':
                query = column['#text']
    
            if column['@name'] == 'EventSubclass':
                queryType = EventSubClass[int(column['#text'])]
    
        queries[queryType] = query
```

### Generate Graph

```python
def extract_records(line) -> int:
    match = re.search(r'#Records=(\d+)', line)
    if match:
        return int(match.group(1))
    return None

def extract_operation_type(line) -> list:
    match = re.search(r'(.*): (\w*)', line)
    if match:
        return [match.group(1).strip(), match.group(2).strip()]
    return None

def generate_graph(lines: list)->list:
    stack = []
    level_parents = {}
    graph = []

    for index, line in enumerate(lines):
        current_level = len(line) - len(line.lstrip())
        
        while len(stack) > current_level:
            stack.pop()
        
        parent_index = level_parents.get(current_level - 1, None)
        
        stack.append((index, line))
        
        level_parents[current_level] = index

        operationType = extract_operation_type(line)

        graph.append({
            'srcid': parent_index,
            'dstid': index,
            'operation': line.strip(),
            'operationShort': operationType[0],
            'operationType': operationType[1],
            'isCache': operationType[0] == 'Cache',
            'level': current_level,
            'records': extract_records(line)
        })
    
    return graph
```

```python
graphs = {}

for queryType, query in queries.items():
    graphs[queryType] = generate_graph(lines = query.split('\n'))

with open('queryPlan.json', 'w') as fp:
    json.dump(graphs, fp)
```

### Output

The output of the script above is a json file.

```json
{
  "logical": [
    {
      "srcid": null,
      "dstid": 0,
      "operation": "GroupSemiJoin: RelLogOp DependOnCols()() 0-2 RequiredCols(0, 1, 2)('Calendar'[Date], 'States'[State], ''[Using_TOPN])",
      "operationShort": "GroupSemiJoin",
      "operationType": "RelLogOp",
      "isCache": false,
      "level": 0,
      "records": null
    },
    {
      "srcid": 0,
      "dstid": 1,
      "operation": "Scan_Vertipaq: RelLogOp DependOnCols()() 0-0 RequiredCols(0)('Calendar'[Date])",
      "operationShort": "Scan_Vertipaq",
      "operationType": "RelLogOp",
      "isCache": false,
      "level": 1,
      "records": null
    },
    ...
  ],
  "physical": [
    {
      "srcid": null,
      "dstid": 0,
      "operation": "GroupSemijoin: IterPhyOp LogOp=GroupSemiJoin IterCols(0, 1, 2)('Calendar'[Date], 'States'[State], ''[Using_TOPN])",
      "operationShort": "GroupSemijoin",
      "operationType": "IterPhyOp",
      "isCache": false,
      "level": 0,
      "records": null
    },
    {
      "srcid": 0,
      "dstid": 1,
      "operation": "Spool_Iterator<SpoolIterator>: IterPhyOp LogOp=VarScope IterCols(0, 1)('Calendar'[Date], 'States'[State]) #Records=13413 #KeyCols=2 #ValueCols=1",
      "operationShort": "Spool_Iterator<SpoolIterator>",
      "operationType": "IterPhyOp",
      "isCache": false,
      "level": 1,
      "records": 13413
    },
    ...
  ]
}
```

## Graphs

We can now use [Vega](https://vega.github.io/vega/) to draw the graph.

>Click on `...`{:.console} to view Vega spec
{: .prompt-tip }

### Logical Query Plan

<div id="LQPvis"></div>
  <script type="text/javascript">
    var spec = "/assets/vega/0020-queryPlanGraph/logicalQueryPlanSpec.json";
    vegaEmbed('#LQPvis', spec).then(function(result) {}).catch(console.error);
  </script>

### Physical Query Plan

<div id="PQPvis"></div>
  <script type="text/javascript">
    var spec = "/assets/vega/0020-queryPlanGraph/physicalQueryPlanSpec.json";
    vegaEmbed('#PQPvis', spec).then(function(result) {}).catch(console.error);
  </script>

## Conclusion

I find this way of looking at the query plan much easier to parse and understand. While I'm not fully happy with the visuals they are a good proof of concept, and hopefully the Power BI or Dax Studio teams could consider creating something like this. Please vote on my [Fabric idea](https://ideas.fabric.microsoft.com/ideas/idea/?ideaid=d1062fa5-385e-ee11-a81c-6045bd84f99b) if you want something like this too.