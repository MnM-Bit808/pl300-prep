import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from svgkit import dialog, pq, deps, pipeline
from charts import side_pane
from bankkit import Batch

B = Batch(9, "manage_workspaces-sharing-governance", "Manage and secure Power BI: workspaces, sharing, refresh and governance", "manage", {"manage": 19})
add = B.add
WS = "Create and manage workspaces and items"
SH = "Share and distribute content"
GV = "Secure and govern Power BI items"
RF = "Manage semantic models and refresh"

# ================= Workspaces and roles =================
add("Workspace roles", "dropdown",
    "Select the least-privileged workspace role for each person.",
    {"parts": [0, 2, 1, 3]},
    "Viewer can only view and interact. Contributor can create, edit and delete content. Member can also share, publish or update the app, and add Members, Contributors and Viewers. Only Admin can delete the workspace, change its settings or add Admins.",
    "View → Viewer. Edit → Contributor. Share/app/add people → Member. Settings/delete/Admins → Admin.",
    parts=[{"label": "Can delete the workspace and add other Admins", "options": ["Admin", "Member", "Contributor", "Viewer"]},
           {"label": "Publishes and edits reports but doesn't share or manage the app", "options": ["Admin", "Member", "Contributor", "Viewer"]},
           {"label": "Publishes and updates the workspace app and adds Contributors", "options": ["Admin", "Member", "Contributor", "Viewer"]},
           {"label": "Only reads and interacts with reports", "options": ["Admin", "Member", "Contributor", "Viewer"]}],
    topic=WS, difficulty=1)

add("Workspace roles", "single",
    "The exhibit shows a workspace's Manage access panel. Priya must be able to add other people to the workspace, using the least privilege.\n\nWhich role should Priya have?",
    "B",
    "Contributors can't add people. Members can add Members, Contributors and Viewers, which meets the requirement without the extra rights of Admin.",
    "Add people (not Admins) → Member.",
    options=["Admin", "Member", "Contributor", "Viewer"],
    image=(dialog(600, "Manage access: Sales Analytics", [
        ("table", ["Name", "Role"], [["Finance Admins (group)", "Admin"], ["Priya Nair", "Contributor"], ["Sales Team (group)", "Viewer"]], 1),
        ("buttons_inline", ["+ Add people or groups"]),
    ], "Workspace Manage access panel", buttons=("Close",)),
        "Manage access for the Sales Analytics workspace: Finance Admins group as Admin, Priya Nair as Contributor (selected), Sales Team group as Viewer."),
    topic=WS, difficulty=1)

add("Workspace roles", "single",
    "Several people need the same workspace role, and staff join and leave often.\n\nWhat is the best way to grant access?",
    "C",
    "Assign the role to a Microsoft Entra security group (or Microsoft 365 group). Membership changes are then handled by the group, not by editing workspace access.",
    "Grant access to groups, not individuals.",
    options=["Add each person individually", "Share the workspace link by email", "Add a security group to the role", "Give everyone Admin"],
    topic=WS, difficulty=1)

add("Workspace licensing", "single",
    "A workspace is on shared capacity (Pro). Free-licensed users report that they can't open its reports.\n\nWhat would let free users view the content without buying each of them a Pro licence?",
    "D",
    "On shared capacity, both creators and viewers need Pro (or PPU) licences. Content in a workspace on Premium capacity (P SKU) or Fabric capacity F64 or larger can be viewed by free users. Premium per user doesn't help, since every viewer would need PPU.",
    "Free viewers → content on P SKU or F64+ capacity.",
    options=["Move the workspace to Premium per user", "Share the reports with Publish to web", "Give the users the Viewer role",
             "Move the workspace to Premium capacity or Fabric F64 or larger"], topic=WS, difficulty=3)

add("Workspace licensing", "single",
    "An analyst publishes reports to My workspace and wants colleagues to collaborate on them.\n\nWhat should the analyst do?",
    "A",
    "My workspace is for personal content; you can't add collaborators to it. Create a shared workspace, assign roles, and publish there.",
    "Collaboration → a shared workspace, not My workspace.",
    options=["Create a shared workspace and publish there", "Give colleagues the Viewer role in My workspace", "Share the .pbix by email", "Use Publish to web"],
    topic=WS, difficulty=1)

add("Workspaces", "single",
    "You want report and semantic model definitions in a workspace to be version-controlled, with changes committed to a repository.\n\nWhat should you configure?",
    "C",
    "Git integration connects a workspace to an Azure DevOps or GitHub repository, so items can be committed, compared and restored. Saving copies of .pbix files by hand doesn't give real version history.",
    "Version control for workspace items → Git integration.",
    options=["Usage metrics", "A deployment pipeline only", "Git integration for the workspace", "Personal bookmarks"], topic=WS, difficulty=3)

# ================= Apps =================
add("Apps", "single",
    "You publish a workspace app. Later you update a report in the workspace, but app users still see the old version.\n\nWhat should you do?",
    "B",
    "An app is a published snapshot. Changes in the workspace reach app users only when someone with the right role selects Update app.",
    "Workspace changes reach app users only after Update app.",
    options=["Refresh the semantic model", "Update the app", "Reinstall the app for each user", "Republish the report from Desktop"], topic=SH, difficulty=1)

add("Apps", "single",
    "The exhibit shows an app's audience setup. The Finance audience must not see the Pipeline report.\n\nWhat should you do?",
    "A",
    "In the Finance audience, hide the Pipeline report (each audience controls which content its members see). Content hidden from an audience is still available to other audiences.",
    "Different content per group in one app → audiences.",
    options=["Hide the Pipeline report in the Finance audience", "Delete the Pipeline report", "Create a second workspace", "Apply RLS to the report"],
    image=(side_pane("App audiences", [("Audiences", "heading", None), ("Sales", "item", None), ("Finance", "item", "selected"),
                                       ("Content visible to Finance", "heading", None), ("Revenue Overview", "item", "visible"),
                                       ("Pipeline", "item", "visible"), ("Budget vs Actual", "item", "visible")], "App audience settings", w=420),
           "App audience settings with Sales and Finance audiences. Finance is selected and currently sees Revenue Overview, Pipeline and Budget vs Actual."),
    topic=SH, difficulty=1)

add("Apps", "single",
    "App users want to build their own reports in Excel and Power BI Desktop using the app's semantic model.\n\nWhat should you set when publishing the app?",
    "D",
    "In the app's permissions, allow audience members to build content with the underlying semantic models. That grants Build permission without giving them a workspace role.",
    "App users building their own content → allow Build in app permissions.",
    options=["Give them the Contributor role", "Share the .pbix file", "Turn on Publish to web", "Allow users to build content with the semantic models in the app permissions"],
    topic=SH)

add("Apps", "single",
    "Why distribute content to a large audience through an app rather than giving everyone a workspace role?",
    "C",
    "Apps give readers a curated, navigable package, separate what they see from work in progress in the workspace, and support audiences. Workspace roles are for people who work on the content.",
    "Consumers → app. Creators → workspace roles.",
    options=["Apps don't require licences", "Apps refresh data faster", "Apps separate a curated view for readers from the working workspace", "Apps bypass RLS"],
    topic=SH, difficulty=1)

# ================= Sharing =================
add("Sharing", "single",
    "You share a report with a colleague and want them to view it but not share it with anyone else.\n\nWhat should you do in the share dialog?",
    "B",
    "Clear Allow recipients to share this report. They can view and interact but can't reshare. Build permission is a separate check box.",
    "Stop resharing → clear the reshare option when sharing.",
    options=["Give them the Viewer role", "Clear Allow recipients to share this report", "Turn on Publish to web", "Remove their Build permission only"], topic=SH, difficulty=1)

add("Sharing", "dropdown",
    "Select the sharing approach for each requirement.",
    {"parts": [0, 0, 1]},
    "Publish to web makes a report public to anyone with the link, with no sign-in or security, so it's only for public data. Embedding in SharePoint Online keeps Power BI sign-in and permissions. Microsoft Entra B2B guest access lets external partners sign in with their own accounts.",
    "Public data → Publish to web. Intranet → SharePoint embed. External partners → B2B guests.",
    parts=[{"label": "Show a report inside an internal SharePoint Online page, respecting each viewer's access", "options": ["Embed in SharePoint Online", "Microsoft Entra B2B guest access", "Publish to web"]},
           {"label": "Publish public census statistics on the company's public website", "options": ["Publish to web", "Embed in SharePoint Online", "Microsoft Entra B2B guest access"]},
           {"label": "Let a partner company's staff view a report securely with their own work accounts", "options": ["Publish to web", "Microsoft Entra B2B guest access", "Embed in SharePoint Online"]}],
    topic=SH)

add("Sharing", "single",
    "A colleague asks for a Publish to web link for a report that contains customer revenue.\n\nWhat should you advise?",
    "A",
    "Publish to web creates a public link that anyone on the internet can open without signing in, and it can't apply RLS. It's only for data meant to be public. Use sharing, an app or a secure embed instead.",
    "Publish to web = public internet. Never for confidential data.",
    options=["Don't use it: anyone with the link could see the data, with no sign-in", "It's fine, because Publish to web respects RLS",
             "It's fine if the link is sent only by email", "Use it, but set a sensitivity label"], topic=SH, difficulty=1)

add("Sharing", "single",
    "A user wants to analyse a published semantic model in an Excel PivotTable connected live to it.\n\nWhat do they need?",
    "C",
    "Analyze in Excel connects Excel to the semantic model and requires Build permission (or a workspace role that includes it). The PivotTable then uses the model's measures, and RLS applies.",
    "Analyze in Excel → Build permission on the semantic model.",
    options=["The .pbix file", "Export data permission only", "Build permission on the semantic model", "A dashboard tile"], topic=SH, difficulty=1)

add("Sharing", "single",
    "You need to see everyone who has access to a semantic model, including access through apps and direct sharing, and remove one person's Build permission.\n\nWhere should you go?",
    "B",
    "The semantic model's Manage permissions page lists direct access, access through apps and links, with each person's permissions (Read, Build, Reshare), and lets you remove them.",
    "Review and change item-level access → Manage permissions.",
    options=["Workspace settings", "The semantic model's Manage permissions page", "The admin portal's usage metrics", "Lineage view"], topic=SH)

# ================= Dashboards, subscriptions and alerts =================
add("Subscriptions and alerts", "single",
    "Managers want a report page emailed to them every Monday at 8 AM, with the page attached as a PDF.\n\nWhat should you create?",
    "A",
    "A report subscription emails a snapshot of selected pages on a schedule and can attach the report as PDF or PowerPoint. Alerts are triggered by thresholds, not schedules.",
    "Scheduled emails of report pages → subscription.",
    options=["A subscription on the report", "A data alert", "A Power Automate flow with no trigger", "Publish to web"], topic=SH, difficulty=1)

add("Subscriptions and alerts", "single",
    "Each regional manager should receive the same subscription email, but filtered to their own region, without you creating one subscription per manager.\n\nWhat should you use?",
    "D",
    "A dynamic per-recipient subscription reads recipients and their filter values (such as Region) from a semantic model table, so each person gets their own filtered version from a single subscription.",
    "One subscription, personalised per person → dynamic per-recipient subscription.",
    options=["One standard subscription per manager", "A data alert", "A bookmark per region", "A dynamic per-recipient subscription"], topic=SH, difficulty=3)

add("Subscriptions and alerts", "single",
    "A data alert on a dashboard card fires when sales drop below 1 million. The operations team also wants a Teams message posted automatically each time.\n\nWhat should you do?",
    "B",
    "Data alerts can trigger a Power Automate flow (using the Power BI alert trigger), which can post to Teams, send emails or start other processes.",
    "Act automatically on an alert → Power Automate.",
    options=["Create a second alert", "Trigger a Power Automate flow from the alert", "Subscribe the Teams channel to the report", "Use Publish to web"], topic=SH)

add("Dashboards", "single",
    "You want a dashboard tile that shows an entire report page, including its slicers, and stays interactive.\n\nWhat should you pin?",
    "C",
    "Pin a live page: the whole page becomes one tile that updates and keeps the page's slicers and interactions within the tile. Pinning individual visuals creates separate static tiles, and slicers can't be pinned alone.",
    "Whole interactive page on a dashboard → pin a live page.",
    options=["Each visual separately", "The slicers individually", "The live page", "A screenshot image"], topic=SH, difficulty=1)

add("Dashboards", "single",
    "A dashboard tile's title must change, and clicking the tile should open a different report page than the one it was pinned from.\n\nWhere do you change these?",
    "A",
    "Tile details (from the tile's More options) let you change the title and subtitle and set a custom link, such as another report page or a web address.",
    "Change a tile's title or click target → Edit details on the tile.",
    options=["Edit details on the tile", "Edit the original visual and re-pin", "Dashboard settings", "Workspace settings"], topic=SH)

# ================= Paginated reports =================
add("Paginated reports", "single",
    "Finance needs an invoice-style report that prints cleanly across many pages, with headers repeated on every page.\n\nWhich tool do you use to create it?",
    "B",
    "Paginated reports are built in Power BI Report Builder. They're designed for pixel-perfect, page-by-page layouts that print and export reliably, with repeating headers and footers.",
    "Printable, multi-page layouts → paginated report in Power BI Report Builder.",
    options=["Power BI Desktop report view", "Power BI Report Builder", "Power Query Editor", "Tabular Editor"], topic=SH, difficulty=1)

add("Paginated reports", "single",
    "Which requirement is the clearest sign you need a paginated report rather than a Power BI report?",
    "D",
    "Paginated reports suit operational outputs that run to many pages, such as statements or invoices, and need exports to Word, Excel, CSV or XML with exact layout. Interactive exploration is what Power BI reports do best.",
    "Many printable pages and exact exports → paginated.",
    options=["Users drill down and cross-filter visuals", "Users need AI visuals", "A single-page dashboard view",
             "A 300-page customer statement, exported to Word and Excel with exact layout"], topic=SH, difficulty=1)

add("Paginated reports", "single",
    "A paginated report must let users choose a customer before it runs, then show only that customer's statement.\n\nWhat should you add?",
    "A",
    "Report parameters prompt users for values (here a customer) and filter the dataset query. They're the main way to make paginated reports interactive.",
    "Paginated report filtering by user choice → report parameter.",
    options=["A report parameter", "A slicer", "A bookmark", "A drillthrough page"], topic=SH, difficulty=1)

# ================= Semantic models: refresh, lineage, endorsement =================
add("Refresh", "single",
    "The exhibit shows a semantic model's refresh history.\n\nWhat has Power BI done after the latest failure, and why?",
    "C",
    "After four consecutive scheduled refresh failures, Power BI disables the refresh schedule and notifies the owner. Fix the cause (here, credentials), then turn the schedule back on.",
    "Four consecutive failures → schedule disabled.",
    options=["Retried every hour until it succeeded", "Deleted the semantic model", "Turned off scheduled refresh because it failed four times in a row",
             "Switched the model to DirectQuery"],
    image=(pq([("Type", "text"), ("Start", "dt"), ("Status", "text"), ("Message", "text")],
              [["Scheduled", "06/10/2026 06:00", "Failed", "Invalid credentials"], ["Scheduled", "07/10/2026 06:00", "Failed", "Invalid credentials"],
               ["Scheduled", "08/10/2026 06:00", "Failed", "Invalid credentials"], ["Scheduled", "09/10/2026 06:00", "Failed", "Invalid credentials"],
               ["", "", "Schedule disabled", "Too many consecutive failures"]],
              "Refresh history for a semantic model", col_w=[120, 170, 150, 230]),
           "Refresh history with four scheduled refreshes from 6 to 9 October that each failed with invalid credentials, followed by a row saying the schedule was disabled after too many consecutive failures."),
    topic=RF, difficulty=1)

add("Refresh", "single",
    "A semantic model uses an on-premises SQL Server through a gateway. Refresh fails with 'The data source is missing a gateway connection'.\n\nWhat should you do?",
    "B",
    "In the semantic model's settings, under Gateway and cloud connections, map the data source to a gateway connection (creating the connection on the gateway first if needed). Republishing doesn't create the mapping.",
    "Missing gateway connection → map the source to a connection in the model's settings.",
    options=["Install a second gateway", "Map the data source to a gateway connection in the semantic model's settings", "Switch to DirectQuery", "Clear the data source permissions"],
    topic=RF)

add("Refresh", "single",
    "Several critical semantic models depend on one on-premises gateway server. If it goes down, all refreshes fail.\n\nWhat should you set up?",
    "D",
    "A gateway cluster: install additional gateway members in the same cluster on other servers, so refreshes continue if one member is unavailable.",
    "Gateway high availability → a gateway cluster.",
    options=["A personal-mode gateway for each analyst", "A VNet data gateway", "A second workspace", "Additional gateway members in a cluster"], topic=RF)

add("Refresh", "single",
    "A semantic model must refresh as soon as the nightly ETL (extract, transform, load) job finishes, which varies between 2 AM and 5 AM.\n\nWhat should you use?",
    "C",
    "Trigger the refresh when the job finishes, for example from the ETL pipeline or a Power Automate flow calling the refresh action or API. A fixed schedule would either run too early or wait unnecessarily.",
    "Refresh after an upstream job → trigger it (pipeline, Power Automate or API).",
    options=["Scheduled refresh at 2 AM", "Scheduled refresh every 30 minutes", "Trigger the refresh when the ETL job completes", "Automatic page refresh"],
    topic=RF)

add("Lineage and impact", "single",
    "The exhibit shows lineage view. You plan to remove a column from the Sales semantic model.\n\nWhat should you check first?",
    "A",
    "Impact analysis on the semantic model shows downstream reports, dashboards and workspaces that depend on it (and lets you notify their contacts), so you can see what the change might break. Lineage view already shows two reports and a dashboard downstream.",
    "Before changing a shared model → impact analysis.",
    options=["Impact analysis for the semantic model", "Usage metrics for the dashboard", "The refresh history", "The gateway status"],
    image=(deps({
        "SQL Server": (20, 150, 160, ["Data source", "via gateway"], "source"),
        "Sales": (240, 150, 160, ["Semantic model"], "query"),
        "Sales Overview": (470, 60, 180, ["Report"], "query"),
        "Regional Detail": (470, 150, 180, ["Report"], "query"),
        "Exec Dashboard": (710, 60, 170, ["Dashboard"], "query"),
    }, [("SQL Server", "Sales"), ("Sales", "Sales Overview"), ("Sales", "Regional Detail"), ("Sales Overview", "Exec Dashboard")],
        "Lineage view", w=900, h=300),
        "Lineage view: SQL Server feeds the Sales semantic model, which feeds the Sales Overview and Regional Detail reports; Sales Overview feeds the Exec Dashboard."),
    topic=RF)

add("Endorsement", "dropdown",
    "Select the endorsement that fits each situation.",
    {"parts": [0, 1, 2]},
    "Promoted means the owner thinks the item is ready to share. Certified means an authorised reviewer has checked it against organisational standards. Master data marks the authoritative source for core reference data, such as the customer master list.",
    "Promoted = owner's endorsement. Certified = official review. Master data = core reference data.",
    parts=[{"label": "The model's owner thinks it's ready for others to reuse", "options": ["Promoted", "Certified", "Master data"]},
           {"label": "A governance team has reviewed the model against company standards", "options": ["Promoted", "Certified", "Master data"]},
           {"label": "The single authoritative source of customer reference data", "options": ["Promoted", "Certified", "Master data"]}],
    topic=GV)

add("Endorsement", "single",
    "Who can certify a semantic model?",
    "C",
    "Only users or groups the Power BI (Fabric) admin has authorised in the tenant's certification setting can certify content. Workspace roles alone aren't enough.",
    "Certify → people authorised in tenant settings.",
    options=["Any workspace Admin", "The model's owner", "People authorised by the admin in the tenant's certification setting", "Anyone with Build permission"],
    topic=GV, difficulty=1)

# ================= Deployment pipelines =================
add("Deployment pipelines", "single",
    "The exhibit shows a deployment pipeline. You changed one report in Development.\n\nWhat happens when you deploy from Development to Test?",
    "B",
    "Deploying copies the selected (or changed) content from the source stage to the target stage's workspace. The comparison indicator shows the stages differ. Production is untouched until you deploy from Test.",
    "Deploy = copy content to the next stage's workspace; later stages are unaffected.",
    options=["The change goes straight to Production", "The changed content is copied to the Test workspace", "Test is deleted and recreated", "Only the data is copied, not the report"],
    image=(pipeline([("Development", "Sales [Dev]", ["Sales model", "Sales Overview", "Regional Detail"], "1 item changed"),
                     ("Test", "Sales [Test]", ["Sales model", "Sales Overview", "Regional Detail"], None),
                     ("Production", "Sales", ["Sales model", "Sales Overview", "Regional Detail"], None)],
                    "Deployment pipeline with three stages", compare=["Different", "Same"]),
           "Deployment pipeline: Development (1 item changed), Test and Production, each with a Sales model and two reports. Development and Test are marked Different; Test and Production are marked Same."),
    topic=WS, difficulty=1)

add("Deployment pipelines", "single",
    "In a deployment pipeline, the Production stage must automatically use the production database and a parameter value of Prod.\n\nWhat should you configure?",
    "A",
    "Deployment rules on the Production stage (data source rules and parameter rules) change the connection and parameter values whenever content is deployed into that stage.",
    "Per-stage connections or parameters → deployment rules.",
    options=["Deployment rules for the Production stage", "Manual edits after each deployment", "A separate gateway per stage", "Row-level security"], topic=WS)

add("Deployment pipelines", "single",
    "Which workspaces can be assigned to deployment pipeline stages?",
    "C",
    "Deployment pipelines need workspaces on Premium per user, Premium capacity or Fabric capacity. Shared-capacity (Pro) workspaces can't be assigned to stages.",
    "Deployment pipelines → Premium, PPU or Fabric workspaces.",
    options=["Any workspace, including My workspace", "Only shared-capacity workspaces", "Workspaces on Premium per user, Premium or Fabric capacity", "Only workspaces with Git integration"],
    topic=WS, difficulty=3)

# ================= Sensitivity labels and governance =================
add("Sensitivity labels", "single",
    "Your organisation requires every report and semantic model to have a sensitivity label before it's saved or published.\n\nWhat should the admin configure?",
    "D",
    "A mandatory labeling policy (set up in Microsoft Purview and enabled for Power BI) forces users to apply a label. A default label can also be applied automatically, but mandatory labeling is what enforces the requirement.",
    "Labels required → mandatory labeling policy.",
    options=["Certification", "Row-level security", "Workspace roles", "A mandatory labeling policy"], topic=GV)

add("Sensitivity labels", "yesno",
    "A report has the Highly Confidential label, which includes encryption. For each statement, select Yes if it is true.",
    [True, True, False],
    "Supported exports, such as Excel, PowerPoint and PDF, carry the label and its protection, so only authorised people can open them. Labels are defined in Microsoft Purview and applied in Power BI Desktop or the service. A label doesn't filter rows; that's RLS.",
    "Labels classify and protect exported files; they don't filter data.",
    statements=["An exported Excel file keeps the label's protection.", "Labels can be applied in Power BI Desktop as well as in the service.",
                "The label restricts which rows each user sees in the report."], topic=GV)

add("Sensitivity labels", "single",
    "A semantic model has the Confidential label. You create a new report on it in the service.\n\nWhat happens to the report's label?",
    "B",
    "With downstream inheritance enabled, new content created from a labelled semantic model inherits its label (unless a label was set manually). This keeps classification consistent.",
    "Downstream inheritance → new content inherits the model's label.",
    options=["The report has no label until someone adds one", "The report inherits the Confidential label", "The report is blocked", "The model's label is removed"],
    topic=GV)

add("Governance", "single",
    "An admin wants to stop users from exporting underlying data from reports across the organisation.\n\nWhere is this controlled?",
    "C",
    "Export settings are tenant settings in the admin portal (with options such as allowing only summarized data). Report authors can also restrict export per report, but organisation-wide control is in tenant settings.",
    "Organisation-wide export rules → admin portal tenant settings.",
    options=["Each user's personal settings", "Row-level security", "Tenant settings in the admin portal", "Deployment rules"], topic=GV)

add("Governance", "single",
    "You need to know how often a report was viewed in the last 30 days and by how many users.\n\nWhat should you open?",
    "A",
    "The report's usage metrics report shows views, unique viewers and page usage over recent days. Lineage view and refresh history don't track viewing.",
    "Who's viewing → usage metrics.",
    options=["The report's usage metrics", "Lineage view", "Refresh history", "Performance Analyzer"], topic=GV, difficulty=1)

add("Governance", "single",
    "A semantic model in another workspace must be used by your report, but you don't have a role in that workspace.\n\nWhich permission lets you connect to it from Power BI Desktop?",
    "D",
    "Build permission on the semantic model lets you discover it, connect from Desktop (as a live connection or composite model) and build reports, without any role in its workspace.",
    "Use someone else's model → Build permission.",
    options=["Read permission only", "Reshare permission", "The Viewer role in your own workspace", "Build permission on the semantic model"], topic=GV, difficulty=1)

B.save()
