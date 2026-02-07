"""
Generate synthetic Fabric workspace data for Graph database
This script creates a realistic Fabric tenant structure with workspaces, items, groups, and users
"""

from faker import Faker
import json
import random
from datetime import datetime, timedelta

fake = Faker()
Faker.seed(42)  # For reproducible results
random.seed(42)

# Configuration
NUM_WORKSPACES = 8
NUM_ADMIN_USERS = 3
NUM_CONTRIBUTOR_USERS_PER_GROUP = 5
NUM_VIEWER_USERS_PER_APP = 4
LAKEHOUSE_WORKSPACES = 2

# Storage for all entities
persons = []
groups = []
workspaces = []
items = []

# Storage for edges by type
member_of_edges = []
pim_eligible_edges = []
has_permission_on_edges = []
contains_edges = []
source_of_edges = []

node_id_counter = 1


def create_node(node_type, properties):
    """Create a node with a unique ID"""
    global node_id_counter
    node = {
        "id": node_id_counter,
        **properties
    }
    node_id_counter += 1
    
    if node_type == "Person":
        persons.append(node)
    elif node_type == "Group":
        groups.append(node)
    elif node_type == "Workspace":
        workspaces.append(node)
    elif node_type == "Item":
        items.append(node)
    
    return node


def create_edge(source_id, target_id, edge_type, properties=None):
    """Create an edge between two nodes"""
    edge = {
        "source": source_id,
        "target": target_id,
        **({} if properties is None else properties)
    }
    
    if edge_type == "MEMBER_OF":
        member_of_edges.append(edge)
    elif edge_type == "PIM_ELIGIBLE":
        pim_eligible_edges.append(edge)
    elif edge_type == "HAS_PERMISSION_ON":
        has_permission_on_edges.append(edge)
    elif edge_type == "CONTAINS":
        contains_edges.append(edge)
    elif edge_type == "SOURCE_OF":
        source_of_edges.append(edge)
    
    return edge


# Create Admin Group with users
admin_group = create_node("Group", {
    "name": "Fabric Administrators",
    "type": "Security",
    "description": "Global Fabric administrators"
})

admin_users = []
for i in range(NUM_ADMIN_USERS):
    user = create_node("Person", {
        "name": fake.name(),
        "email": fake.email(),
        "department": "IT"
    })
    admin_users.append(user)
    create_edge(user["id"], admin_group["id"], "MEMBER_OF", {
        "since": fake.date_between(start_date="-2y", end_date="-6m").isoformat()
    })

# Create two Contributor Groups with users
contributor_groups = []
contributor_users_by_group = []

for i in range(2):
    group = create_node("Group", {
        "name": f"Data Contributors Team {chr(65 + i)}",
        "type": "Security",
        "description": f"Contributors for Team {chr(65 + i)}"
    })
    contributor_groups.append(group)
    
    users = []
    for j in range(NUM_CONTRIBUTOR_USERS_PER_GROUP):
        user = create_node("Person", {
            "name": fake.name(),
            "email": fake.email(),
            "department": random.choice(["Analytics", "Data Engineering", "Business Intelligence"])
        })
        users.append(user)
        create_edge(user["id"], group["id"], "MEMBER_OF", {
            "since": fake.date_between(start_date="-1y", end_date="-1m").isoformat()
        })
    
    contributor_users_by_group.append(users)

# Generate workspaces and their contents
lakehouses = []
semantic_models = []
reports = []
apps = []
viewer_groups = []

for ws_idx in range(NUM_WORKSPACES):
    # Create workspace
    workspace_name = f"{fake.company()} {random.choice(['Analytics', 'Data', 'BI', 'Insights', 'Reporting'])}"
    workspace = create_node("Workspace", {
        "name": workspace_name,
        "description": fake.bs(),
        "capacity": random.choice(["F2", "F4", "F8", "F16", "F32", "F64"])
    })
    
    # Admin group has Admin permission on all workspaces
    create_edge(admin_group["id"], workspace["id"], "HAS_PERMISSION_ON", {
        "role": "Admin",
        "assignedDate": fake.date_between(start_date="-1y", end_date="-6m").isoformat()
    })
    
    # Assign one of the contributor groups
    assigned_contributor_group = contributor_groups[ws_idx % 2]
    create_edge(assigned_contributor_group["id"], workspace["id"], "HAS_PERMISSION_ON", {
        "role": "Contributor",
        "assignedDate": fake.date_between(start_date="-6m", end_date="-1m").isoformat()
    })
    
    # Workspace contains relationship
    has_lakehouse = ws_idx < LAKEHOUSE_WORKSPACES
    lakehouse_node = None
    
    if has_lakehouse:
        # Create lakehouse
        lakehouse_node = create_node("Item", {
            "name": f"{workspace_name} Lakehouse",
            "type": "Lakehouse",
            "description": "Data lakehouse for analytics"
        })
        lakehouses.append(lakehouse_node)
        create_edge(workspace["id"], lakehouse_node["id"], "CONTAINS")
    
    # Create 1-3 semantic models per workspace
    num_models = random.randint(1, 3)
    workspace_models = []
    
    for model_idx in range(num_models):
        semantic_model = create_node("Item", {
            "name": f"{fake.catch_phrase()} Model",
            "type": "SemanticModel",
            "description": fake.bs()
        })
        semantic_models.append(semantic_model)
        workspace_models.append(semantic_model)
        create_edge(workspace["id"], semantic_model["id"], "CONTAINS")
        
        # Connect to lakehouse if available
        if has_lakehouse:
            if random.random() > 0.3:  # 70% chance to connect to lakehouse
                create_edge(lakehouse_node["id"], semantic_model["id"], "SOURCE_OF")
        
        # If there are 2 lakehouses and this is a workspace without one, 
        # connect to one of the lakehouses
        if not has_lakehouse and len(lakehouses) > 0:
            if random.random() > 0.5:  # 50% chance
                source_lakehouse = random.choice(lakehouses)
                create_edge(source_lakehouse["id"], semantic_model["id"], "SOURCE_OF")
        
        # Create 1-2 reports per semantic model
        num_reports = random.randint(1, 2)
        
        for report_idx in range(num_reports):
            report = create_node("Item", {
                "name": f"{fake.catch_phrase()} Report",
                "type": "Report",
                "description": fake.bs()
            })
            reports.append(report)
            create_edge(workspace["id"], report["id"], "CONTAINS")
            create_edge(semantic_model["id"], report["id"], "SOURCE_OF")
    
    # Create org app if workspace has reports
    workspace_reports = [r for r in reports if any(
        e["source"] == workspace["id"] and e["target"] == r["id"]
        for e in contains_edges
    )]
    
    if workspace_reports:
        # Create app
        app = create_node("Item", {
            "name": f"{workspace_name} App",
            "type": "OrgApp",
            "description": f"Organizational app for {workspace_name}"
        })
        apps.append(app)
        create_edge(workspace["id"], app["id"], "CONTAINS")
        
        # App contains all workspace reports
        for report in workspace_reports:
            create_edge(app["id"], report["id"], "CONTAINS")
        
        # Create viewer group for this app
        viewer_group = create_node("Group", {
            "name": f"{workspace_name} Viewers",
            "type": "Security",
            "description": f"Viewers for {workspace_name} app"
        })
        viewer_groups.append(viewer_group)
        
        # Viewer group has Read permission on app
        create_edge(viewer_group["id"], app["id"], "HAS_PERMISSION_ON", {
            "role": "Read"
        })
        
        # Create viewer users
        for viewer_idx in range(NUM_VIEWER_USERS_PER_APP):
            user = create_node("Person", {
                "name": fake.name(),
                "email": fake.email(),
                "department": random.choice(["Sales", "Marketing", "Finance", "Operations", "HR"])
            })
            create_edge(user["id"], viewer_group["id"], "MEMBER_OF", {
                "since": fake.date_between(start_date="-3m", end_date="today").isoformat()
            })

# Add PIM eligible users (some admin users have PIM eligibility)
pim_eligible_users = random.sample(admin_users, k=min(2, len(admin_users)))
for user in pim_eligible_users:
    # Find the MEMBER_OF edge and move it to PIM_ELIGIBLE
    edge_to_move = None
    for i, edge in enumerate(member_of_edges):
        if edge["source"] == user["id"] and edge["target"] == admin_group["id"]:
            edge_to_move = member_of_edges.pop(i)
            break
    
    if edge_to_move:
        edge_to_move["eligibilityStart"] = fake.date_between(start_date="-6m", end_date="today").isoformat()
        pim_eligible_edges.append(edge_to_move)

# Generate output
total_edges = (len(member_of_edges) + len(pim_eligible_edges) + len(has_permission_on_edges) + 
                len(contains_edges) + len(source_of_edges))

output = {
    "metadata": {
        "generated": datetime.now().isoformat(),
        "description": "Synthetic Fabric workspace data",
        "counts": {
            "persons": len(persons),
            "groups": len(groups),
            "workspaces": len(workspaces),
            "items": len(items),
            "member_of_edges": len(member_of_edges),
            "pim_eligible_edges": len(pim_eligible_edges),
            "has_permission_on_edges": len(has_permission_on_edges),
            "contains_edges": len(contains_edges),
            "source_of_edges": len(source_of_edges),
            "total_edges": total_edges
        }
    },
    "persons": persons,
    "groups": groups,
    "workspaces": workspaces,
    "items": items,
    "member_of_edges": member_of_edges,
    "pim_eligible_edges": pim_eligible_edges,
    "has_permission_on_edges": has_permission_on_edges,
    "contains_edges": contains_edges,
    "source_of_edges": source_of_edges
}

# Save to JSON files - one per table
import os
output_dir = "fabric_graph_tables"
os.makedirs(output_dir, exist_ok=True)

# Save node tables
with open(f"{output_dir}/persons.json", 'w', encoding='utf-8') as f:
    json.dump(persons, f, indent=2, ensure_ascii=False)

with open(f"{output_dir}/groups.json", 'w', encoding='utf-8') as f:
    json.dump(groups, f, indent=2, ensure_ascii=False)

with open(f"{output_dir}/workspaces.json", 'w', encoding='utf-8') as f:
    json.dump(workspaces, f, indent=2, ensure_ascii=False)

with open(f"{output_dir}/items.json", 'w', encoding='utf-8') as f:
    json.dump(items, f, indent=2, ensure_ascii=False)

# Save edge tables
with open(f"{output_dir}/member_of_edges.json", 'w', encoding='utf-8') as f:
    json.dump(member_of_edges, f, indent=2, ensure_ascii=False)

with open(f"{output_dir}/pim_eligible_edges.json", 'w', encoding='utf-8') as f:
    json.dump(pim_eligible_edges, f, indent=2, ensure_ascii=False)

with open(f"{output_dir}/has_permission_on_edges.json", 'w', encoding='utf-8') as f:
    json.dump(has_permission_on_edges, f, indent=2, ensure_ascii=False)

with open(f"{output_dir}/contains_edges.json", 'w', encoding='utf-8') as f:
    json.dump(contains_edges, f, indent=2, ensure_ascii=False)

with open(f"{output_dir}/source_of_edges.json", 'w', encoding='utf-8') as f:
    json.dump(source_of_edges, f, indent=2, ensure_ascii=False)

print(f"✅ Generated {len(persons)} persons, {len(groups)} groups, {len(workspaces)} workspaces, {len(items)} items")
print(f"📊 Summary:")
print(f"   - {len(persons)} persons")
print(f"   - {len(groups)} groups")
print(f"   - {len(workspaces)} workspaces")
print(f"   - {len([i for i in items if i['type'] == 'Lakehouse'])} lakehouses")
print(f"   - {len([i for i in items if i['type'] == 'SemanticModel'])} semantic models")
print(f"   - {len([i for i in items if i['type'] == 'Report'])} reports")
print(f"   - {len([i for i in items if i['type'] == 'OrgApp'])} organizational apps")
print(f"\n📊 Edges:")
print(f"   - {len(member_of_edges)} MEMBER_OF")
print(f"   - {len(pim_eligible_edges)} PIM_ELIGIBLE")
print(f"   - {len(has_permission_on_edges)} HAS_PERMISSION_ON")
print(f"   - {len(contains_edges)} CONTAINS")
print(f"   - {len(source_of_edges)} SOURCE_OF")
print(f"\n💾 Tables saved to: {output_dir}/")
print(f"   Node tables: persons.json, groups.json, workspaces.json, items.json")
print(f"   Edge tables: member_of_edges.json, pim_eligible_edges.json, has_permission_on_edges.json, contains_edges.json, source_of_edges.json")