import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from svgkit import model, pq, dialog, perf_pane
from bankkit import Batch

B = Batch(6, "optimise-and-secure", "Optimise model performance and secure data", "model", {"model": 100, "manage": 1})
add = B.add
OPT = "Optimize model performance"
SEC = "Implement row-level and object-level security"

# ================= Optimise performance =================
add("Performance Analyzer", "dropdown",
    "The exhibit shows Performance Analyzer after you refresh a report page.\n\nSelect the answer that completes each statement.",
    {"parts": [0, 1, 2]},
    "The matrix spends 4,120 ms in its DAX query, so its measures or model are the bottleneck. The card's own query and display are tiny; its 3,900 ms of Other is time spent waiting, mostly for other visuals. The sensible first step is to copy the matrix's query and analyse it (for example in DAX query view or DAX Studio).",
    "DAX query = model/measure work. Visual display = rendering. Other = waiting.",
    parts=[{"label": "The visual with the slowest DAX query is", "options": ["the matrix", "the card", "the slicer"]},
           {"label": "The visual that spends most of its time waiting is", "options": ["the matrix", "the card", "the slicer"]},
           {"label": "Your first optimisation step should be to", "options": ["remove the slicer", "change the card's format", "copy and analyse the matrix's query"]}],
    image=(perf_pane([("Sales by Product (matrix)", 4470, 4120, 310, 40, True), ("Total Sales (card)", 3937, 25, 12, 3900, True),
                      ("Region (slicer)", 96, 48, 30, 18, False)], "Performance Analyzer pane"),
           "Performance Analyzer: the matrix takes 4,470 ms (DAX query 4,120, visual display 310, other 40); the card takes 3,937 ms (DAX query 25, display 12, other 3,900); the slicer takes 96 ms."),
    topic=OPT)

add("Performance Analyzer", "single",
    "Performance Analyzer shows that a matrix's DAX query is slow. You want to run that exact query on its own and try changes to the measure.\n\nWhat should you do?",
    "B",
    "Copy query in Performance Analyzer copies the DAX the visual sent. Paste it into DAX query view (or DAX Studio) to run it, inspect the result and test faster versions of the measure.",
    "Investigate a slow visual → Copy query → DAX query view.",
    options=["Export the visual's data to Excel", "Use Copy query, then run it in DAX query view", "Refresh the semantic model", "Turn on Auto date/time"],
    topic=OPT)

add("Reduce model size", "single",
    "The exhibit shows the largest columns in an imported Sales table.\n\nWhich change will shrink the model most without affecting reports, which never use transaction-level IDs?",
    "A",
    "TransactionGUID is unique on every row, so it barely compresses and takes most of the table's memory. Removing it (in Power Query) gives the largest saving. Low-cardinality columns such as Region are already tiny.",
    "Unused high-cardinality columns (GUIDs, IDs, timestamps) are the biggest wins to remove.",
    options=["Remove TransactionGUID", "Remove Region", "Change Amount to Text", "Hide TransactionGUID"],
    image=(pq([("Column", "text"), ("Cardinality", "int"), ("Size (MB)", "dec"), ("% of table", "dec")],
              [["TransactionGUID", "48,210,553", "1,412.6", "71.8%"], ["SaleDateTime", "31,904,118", "402.3", "20.4%"],
               ["Amount", "182,440", "96.1", "4.9%"], ["ProductKey", "4,120", "22.7", "1.2%"], ["Region", "6", "0.4", "0.0%"]],
              "Column sizes for the Sales table", col_w=[200, 150, 130, 130]),
           "Table of Sales column sizes: TransactionGUID 48 million distinct values and 1,412.6 MB (71.8%), SaleDateTime 402.3 MB, Amount 96.1 MB, ProductKey 22.7 MB, Region 0.4 MB."),
    topic=OPT)

add("Reduce model size", "single",
    "Product's key is a 12-character text code such as PRD-00045821, used in a relationship to a 50-million-row Sales table.\n\nWhat change usually improves compression and relationship performance?",
    "C",
    "Replacing a text key with an integer surrogate key (for example an index column) makes the key smaller to store and faster to join. Keep the text code as an attribute in Product if users need it.",
    "Relationship keys → whole-number surrogate keys.",
    options=["Make the relationship bidirectional", "Convert the key to Date", "Use an integer surrogate key for the relationship", "Add a prefix to every key"],
    topic=OPT)

add("Reduce model size", "single",
    "You need a ProfitBand column in Sales. You can build it as a DAX calculated column or as a column added in Power Query.\n\nWhich does Microsoft's guidance generally prefer, and why?",
    "B",
    "Columns added in Power Query are loaded like source columns and usually compress better. Calculated columns are computed after loading and can compress less efficiently. Use DAX calculated columns when the logic genuinely needs the model (for example RELATED across tables).",
    "Prefer Power Query columns over DAX calculated columns where possible.",
    options=["A calculated column, because it's always faster", "A Power Query column, because it usually compresses better",
             "Either; they're stored identically", "Neither; use a measure for slicing"],
    topic=OPT)

add("Reduce model size", "single",
    "A Temperature column holds values with eight decimal places, such as 21.47382915, although reports show one decimal.\n\nWhat should you do to reduce the model size?",
    "A",
    "Rounding to the precision reports actually use (here one decimal) collapses millions of near-unique values into a few hundred distinct ones, which compress far better. Formatting only changes how values look.",
    "Round numbers to the precision you need to cut cardinality.",
    options=["Round the values to one decimal place in Power Query", "Format the column to one decimal place", "Change the column to Text", "Hide the column"],
    topic=OPT)

add("Reduce model size", "single",
    "The Sales source holds 12 years of history, but reports only cover the current year and the previous three years.\n\nWhat should you do?",
    "D",
    "Filter the query to the required years (ideally in a step that folds to the source, or with an incremental refresh archive period) so older rows never load. Report filters still load and store every row.",
    "Don't load rows nobody reports on.",
    options=["Add a report-level filter on Year", "Hide old years with a slicer", "Use a calculated table for recent years", "Filter the query to the last four years"],
    topic=OPT)

add("Reduce model size", "single",
    "A model has 14 date columns across its tables, and Auto date/time is turned on.\n\nHow does this affect the model?",
    "C",
    "Auto date/time creates a hidden date table for each date column, here 14, each spanning that column's full years. Turning it off and using one proper Date table removes them.",
    "Auto date/time = one hidden table per date column.",
    options=["It has no effect on size", "It creates one shared hidden date table", "It creates 14 hidden date tables", "It converts the columns to Text"],
    topic=OPT)

add("Aggregations", "single",
    "A DirectQuery Sales table holds 3 billion rows. Most visuals show totals by month and product, which are slow.\n\nWhat should you implement?",
    "A",
    "An imported aggregation table summarised by month and product answers those visuals from memory. Configure it with Manage aggregations so Power BI uses it automatically, and set related dimensions to Dual. Detailed queries still go to the DirectQuery table.",
    "Big DirectQuery fact + summary visuals → imported aggregation table.",
    options=["An imported aggregation table configured with Manage aggregations", "Bidirectional relationships", "A calculated column for each month",
             "Auto date/time"], topic=OPT)

add("Aggregations", "single",
    "An aggregation table summarises Sales by month and product. A user opens a visual showing sales by day.\n\nWhat happens?",
    "B",
    "The aggregation can't answer day-level questions, so Power BI falls back to the detailed table (through DirectQuery). The user still gets correct results, just more slowly.",
    "Queries finer than the aggregation's grain fall back to the detail table.",
    options=["The visual shows an error", "The query falls back to the detailed table", "The visual shows monthly values on each day", "The visual shows blank"],
    difficulty=3, topic=OPT)

add("Report performance", "single",
    "A report page has 35 visuals and loads slowly, although each DAX query is fast.\n\nWhat does Microsoft recommend?",
    "C",
    "Each visual sends at least one query and must render, and they queue. Reduce the number of visuals per page: combine visuals, and move detail to drillthrough pages or report page tooltips.",
    "Fewer visuals per page; move detail to drillthrough and tooltips.",
    options=["Turn on Auto date/time", "Convert the model to DirectQuery", "Reduce the visuals on the page and move detail to drillthrough pages or tooltips",
             "Add more slicers"], topic=OPT)

add("Report performance", "single",
    "A scatter chart with 200,000 points has a long Visual display time in Performance Analyzer.\n\nWhat should you do?",
    "B",
    "Rendering hundreds of thousands of points is slow and unreadable. Reduce the points shown, for example by aggregating to a coarser level or applying a Top N filter. Faster DAX won't fix rendering time.",
    "Long visual display time → show fewer data points.",
    options=["Rewrite the measures with variables", "Reduce the number of points the visual shows", "Increase the refresh frequency", "Turn off query reduction"],
    topic=OPT)

add("DAX performance", "single",
    "According to Microsoft's DAX guidance, which function should you use to count the rows of a table?",
    "A",
    "COUNTROWS counts rows directly, states the intent clearly and doesn't depend on a column's blanks. COUNT ( column ) counts non-blank values, which may differ and reads less clearly.",
    "Count rows → COUNTROWS.",
    options=["COUNTROWS", "COUNT on the key column", "COUNTA on any column", "SUMX with 1"], topic=OPT, difficulty=1)

add("DAX performance", "single",
    "A measure uses IF ( HASONEVALUE ( Region[Region] ), VALUES ( Region[Region] ), \"Several\" ).\n\nWhat is a simpler equivalent?",
    "D",
    "SELECTEDVALUE ( Region[Region], \"Several\" ) returns the single value when exactly one exists, otherwise the alternate result. It's shorter and clearer.",
    "IF ( HASONEVALUE, VALUES ) → SELECTEDVALUE.",
    options=["`MAX ( Region[Region] )`", "`FIRSTNONBLANK ( Region[Region], 1 )`", "`ALL ( Region[Region] )`", "`SELECTEDVALUE ( Region[Region], \"Several\" )`"],
    topic=OPT)

add("DirectQuery performance", "single",
    "In a DirectQuery model, slicers on Product and Date are slow because every interaction queries the source. Sales must remain DirectQuery.\n\nWhat should you change?",
    "B",
    "Setting the dimension tables to Dual lets slicer lists be answered from memory while joins to the DirectQuery fact still run at the source. Import would create limited relationships with the DirectQuery fact.",
    "DirectQuery fact + small dimensions → Dual dimensions.",
    options=["Set Product and Date to Import", "Set Product and Date to Dual", "Set Sales to Dual", "Remove the relationships"], topic=OPT)

add("Refresh performance", "single",
    "Nightly refresh of a 400-million-row Import table takes four hours, although only recent rows change.\n\nWhat should you configure?",
    "C",
    "Incremental refresh partitions the table by date and refreshes only the recent window, keeping older partitions as they are. Refresh time drops dramatically.",
    "Slow full refresh of mostly unchanged history → incremental refresh.",
    options=["DirectQuery for every table", "A second gateway", "Incremental refresh", "Auto date/time"], topic=OPT, difficulty=1)

add("Model analysis tools", "single",
    "You want to check the model against a rule set of design best practices, such as unused columns, bidirectional relationships and missing formats.\n\nWhat should you use?",
    "A",
    "The Best Practice Analyzer in Tabular Editor runs a set of rules over the model and lists violations. Performance Analyzer times visuals; VertiPaq Analyzer reports sizes.",
    "Design rule checks → Best Practice Analyzer.",
    options=["Best Practice Analyzer in Tabular Editor", "Performance Analyzer", "Query Diagnostics", "Column profiling"], topic=OPT)

add("Model analysis tools", "single",
    "You need to see which tables and columns take up the most memory in an Import model.\n\nWhat should you use?",
    "D",
    "VertiPaq Analyzer (available in DAX Studio) reports the size and cardinality of every table and column, showing exactly where memory goes. Performance Analyzer only times report visuals.",
    "Where's the memory? → VertiPaq Analyzer (DAX Studio).",
    options=["Performance Analyzer", "Query Dependencies", "Column quality", "VertiPaq Analyzer in DAX Studio"], topic=OPT)

add("Relationship performance", "single",
    "The exhibit shows a model with a many-to-many, bidirectional relationship between Sales and Budget. Visuals that use both tables are slow.\n\nWhat should you change first?",
    "B",
    "Fact-to-fact, many-to-many, bidirectional relationships are expensive and can be ambiguous. Relate both facts to shared dimensions (Product, Date) with single-direction one-to-many relationships, and remove the direct link.",
    "Avoid fact-to-fact and bidirectional many-to-many links; share dimensions.",
    options=["Make the relationship one-to-one", "Relate Sales and Budget to shared dimensions and remove the direct relationship",
             "Add a second relationship", "Turn on Assume referential integrity"],
    image=(model(820, 320, {
        "Sales": {"x": 40, "y": 60, "w": 210, "fields": [("Category", "", "pink"), ("Month", "", None), ("Amount", "sum", None)]},
        "Budget": {"x": 560, "y": 60, "w": 210, "fields": [("Category", "", "pink"), ("Month", "", None), ("Budget", "sum", None)]},
    }, [{"pts": [(250, 140), (560, 140)], "ends": ("*", "*"), "dir": "<>"}], "Model view: Sales related directly to Budget",
        legend="Many-to-many relationship on Category with cross-filter direction Both."),
           "Model view where Sales and Budget are related directly on Category, many-to-many, with a bidirectional arrow."),
    topic=OPT, difficulty=3)

add("Reduce model size", "single",
    "You create a calculated table SalesCopy = Sales to use in another part of the report. Sales has 80 million rows.\n\nWhat is the effect?",
    "C",
    "A calculated table is materialised and stored, so SalesCopy roughly doubles the memory used by Sales. Copying small tables (like Date for a role-playing dimension) is fine; copying a large fact usually isn't.",
    "Calculated tables are stored in full; don't copy large facts.",
    options=["No effect; calculated tables aren't stored", "It halves refresh time", "It roughly doubles the memory used by that data", "It converts Sales to DirectQuery"],
    topic=OPT)

add("Reduce model size", "yesno",
    "For each statement about model size, select Yes if it is true.",
    [True, True, False],
    "Measures are formulas evaluated at query time and store no data. Calculated columns and tables are computed at refresh and stored. Hidden columns are still loaded and stored.",
    "Measures: no storage. Calculated columns/tables and hidden columns: stored.",
    statements=["Adding measures doesn't increase the stored size of the model.", "Calculated columns increase the stored size of the model.",
                "Hiding a column removes its data from the model."], topic=OPT, difficulty=1)

# ================= Security: RLS and OLS =================
add("Row-level security", "order",
    "You need regional managers to see only their own region's data. A static role per region is acceptable.\n\nSelect the actions you should perform and arrange them in order.",
    ["A", "B", "C", "D"],
    "Create roles and their DAX filters in Desktop, test them with View as, publish, then add members (ideally security groups) to each role on the semantic model's Security page. Workspace Contributors would bypass RLS.",
    "Create roles → test → publish → assign members.",
    items=["In Power BI Desktop, create a role per region in Manage roles", "Add a filter such as [Region] = \"North\" to the Region table in each role",
           "Test each role with View as", "Publish, then add each region's security group to its role in the Power BI service",
           "Add the managers to the workspace as Contributors", "Turn on Assume referential integrity"],
    domain="manage", topic=SEC, difficulty=1)

add("Row-level security", "single",
    "The exhibit shows a role in Manage roles. Geography relates one-to-many to Customer, which relates one-to-many to Sales.\n\nWhat does a member of the Germany role see?",
    "D",
    "The filter keeps only German rows in Geography, and it flows from the one side to the many side: Geography → Customer → Sales. Members see German customers and their sales only.",
    "RLS filters flow along relationships like any other filter.",
    options=["All data, because the filter is on a dimension", "Only the Geography table, filtered to Germany", "No data, because Sales isn't filtered",
             "Only German customers and their sales"],
    image=(dialog(640, "Manage security roles", [
        ("heading", "Roles"), ("list", ["Germany", "France", "Executives"], 0),
        ("heading", "Select tables"), ("list", ["Customer", "Geography", "Sales"], 1),
        ("label", "Filter data (DAX expression) for Geography", "[Country] = \"Germany\""),
    ], "Manage security roles dialog", buttons=("Save", "Cancel")),
        "Manage security roles: the Germany role is selected, the Geography table is selected, and its DAX filter is [Country] = \"Germany\"."),
    domain="manage", topic=SEC, difficulty=1)

add("Row-level security", "single",
    "Your model has a dynamic role that filters on USERPRINCIPALNAME (). You want to check in Power BI Desktop what amira@contoso.com would see.\n\nWhat should you select in the View as dialog shown in the exhibit?",
    "B",
    "Tick the dynamic role and tick Other user, entering amira@contoso.com. USERPRINCIPALNAME () then returns that email, so you see exactly her data. Ticking only the role would use your own identity.",
    "Test dynamic RLS for someone else → View as: role + Other user.",
    options=["Only the Other user box", "The SalesRep role and Other user, entering amira@contoso.com", "None, and refresh the model", "Every role"],
    image=(dialog(560, "View as roles", [
        ("check", "None", False), ("check", "Other user", False), ("label", "", "amira@contoso.com"),
        ("check", "SalesRep (dynamic)", False), ("check", "Executives", False),
    ], "View as roles dialog", buttons=("OK", "Cancel")),
        "View as roles dialog with check boxes for None, Other user (with an email box), SalesRep (dynamic) and Executives."),
    domain="manage", topic=SEC)

add("Row-level security", "single",
    "Which function should a dynamic RLS filter use to compare a table's Email column with the signed-in user, so it behaves the same in Power BI Desktop and the service?",
    "A",
    "USERPRINCIPALNAME () returns the user principal name (usually the work email) in both places. USERNAME () returns DOMAIN\\user in Desktop on a domain-joined machine, so tests in Desktop may not match the service.",
    "Dynamic RLS → USERPRINCIPALNAME ().",
    options=["USERPRINCIPALNAME ()", "USERNAME ()", "SELECTEDVALUE ()", "CUSTOMDATA ()"], domain="manage", topic=SEC)

add("Row-level security", "single",
    "Employee has EmployeeID, ManagerID, Email and Path = PATH ( Employee[EmployeeID], Employee[ManagerID] ). Managers must see their own rows and those of everyone below them.\n\nWhich role filter on Employee should you use?",
    "C",
    "PATHCONTAINS checks whether each employee's path (their chain of managers) contains the signed-in user's EmployeeID, looked up from their email. That returns the user and everyone under them at any level.",
    "Hierarchical RLS → PATH + PATHCONTAINS with the user's ID.",
    options=["`[Email] = USERPRINCIPALNAME ()`", "`[ManagerID] = USERPRINCIPALNAME ()`",
             "`PATHCONTAINS ( [Path], LOOKUPVALUE ( Employee[EmployeeID], Employee[Email], USERPRINCIPALNAME () ) )`",
             "`PATH ( [EmployeeID], USERPRINCIPALNAME () )`"], domain="manage", topic=SEC, difficulty=3)

add("Row-level security", "yesno",
    "For each statement about RLS, select Yes if it is true.",
    [True, True, True],
    "A user in several roles sees the union of what each role allows. Workspace Admins, Members and Contributors can edit the model, so RLS doesn't restrict them. RLS does apply to Viewers and to people with only Build permission, including when they use Analyze in Excel.",
    "Roles combine as a union; editors bypass RLS; Viewers and Build-only users don't.",
    statements=["A user assigned to two roles sees the rows allowed by either role.", "Workspace Contributors aren't restricted by RLS.",
                "RLS applies to a user with Build permission who connects through Analyze in Excel."], domain="manage", topic=SEC)

add("Row-level security", "single",
    "Store managers have a dynamic role. The CFO must see every store, and is a workspace Viewer.\n\nWhat should you do?",
    "B",
    "Once RLS exists, a Viewer in no role sees no data. Create a role with no filter (or a TRUE () filter) and add the CFO to it. Making the CFO a Contributor would grant editing rights just to bypass security.",
    "Full-access users under RLS → a role with no filter.",
    options=["Do nothing; Viewers see everything by default", "Create a role with no filter and add the CFO to it", "Make the CFO a workspace Contributor",
             "Add the CFO to the store managers' role"], domain="manage", topic=SEC)

add("Row-level security", "single",
    "The exhibit shows a model. A role filters Users with [Email] = USERPRINCIPALNAME (), but members still see every region's sales.\n\nWhat should you do?",
    "C",
    "Users is on the many side of its relationship with Region, so the filter on Users doesn't flow to Region and on to Sales. Set that relationship to filter in both directions and select Apply security filter in both directions, so the security filter reaches Region and then Sales.",
    "Security filter on a many-side mapping table → Both + Apply security filter in both directions.",
    options=["Move the role filter to Sales", "Change the role to use USERNAME ()", "Set Users–Region to Both and select Apply security filter in both directions",
             "Mark Users as a date table"],
    image=(model(880, 300, {
        "Users": {"x": 30, "y": 70, "w": 200, "fields": [("Email", "", None), ("RegionKey", "", "pink")]},
        "Region": {"x": 330, "y": 70, "w": 200, "fields": [("RegionKey", "", "pink"), ("Region", "", None)]},
        "Sales": {"x": 640, "y": 60, "w": 200, "fields": [("RegionKey", "", "pink"), ("DateKey", "", None), ("Amount", "sum", None)]},
    }, [{"pts": [(330, 140), (230, 140)], "ends": ("1", "*"), "dir": ">"},
        {"pts": [(530, 140), (640, 140)], "ends": ("1", "*"), "dir": ">"}], "Model view: user mapping table for dynamic RLS",
        legend="The role filter is on the Users table."),
           "Model view: Region relates one-to-many to Users and one-to-many to Sales, with single-direction filters flowing from Region to each."),
    domain="manage", topic=SEC, difficulty=3)

add("Row-level security", "single",
    "Where do you add people or security groups to an RLS role after publishing?",
    "A",
    "In the Power BI service, open the semantic model's Security page, select the role and add members. Roles themselves are defined in Power BI Desktop.",
    "Assign role members → semantic model > Security in the service.",
    options=["On the semantic model's Security page in the Power BI service", "In the workspace's Access settings", "In Power BI Desktop's View as dialog",
             "In the report's Format pane"], domain="manage", topic=SEC, difficulty=1)

add("Row-level security", "single",
    "Analysts must build their own reports on a semantic model protected by RLS, and RLS must still restrict what they see.\n\nHow should you grant access?",
    "D",
    "Workspace Contributors and above bypass RLS. Give the analysts Build permission on the semantic model (and keep them as Viewers or outside the workspace): they can create reports in their own workspace, and RLS applies to them.",
    "Build reports + stay restricted → Build permission, not an editor role.",
    options=["Add them as workspace Members", "Add them as workspace Contributors", "Give them the .pbix file",
             "Grant Build permission on the semantic model without an editing workspace role"], domain="manage", topic=SEC, difficulty=3)

add("Row-level security", "single",
    "You share a report with a colleague who isn't a member of any RLS role on the semantic model.\n\nWhat does the colleague see?",
    "B",
    "Sharing grants access to the report, but RLS still decides which rows they see. Belonging to no role means no rows, so visuals show no data.",
    "Sharing doesn't bypass RLS; no role = no data.",
    options=["All data", "No data", "Only data from the default role", "The data visible to the person who shared it"], domain="manage", topic=SEC)

add("Row-level security", "single",
    "After assigning members, you want to confirm in the Power BI service what a role shows.\n\nWhat should you use?",
    "C",
    "On the semantic model's Security page, the role's menu has Test as role, which opens the report as a member of that role would see it (and lets you test as a specific person).",
    "Test RLS in the service → Security > Test as role.",
    options=["Performance Analyzer", "Usage metrics", "Test as role on the semantic model's Security page", "Lineage view"], domain="manage", topic=SEC, difficulty=1)

add("Row-level security", "single",
    "Some sales reps cover several regions, and the list changes often. You need dynamic RLS by region.\n\nHow should you store who can see what?",
    "A",
    "A mapping table with one row per user per region (Email, RegionKey) handles any number of regions per person, and changes only need new rows, not new roles. A single region column in a user table can't hold several regions.",
    "Users with several allowed values → one row per user per value in a mapping table.",
    options=["A mapping table with one row per user and region", "One role per sales rep", "A comma-separated list of regions in each user's row",
             "Static roles per region combination"], domain="manage", topic=SEC)

add("Row-level security", "single",
    "Where should an RLS filter usually be defined for best performance and clarity?",
    "D",
    "Filter the small dimension (for example Region or Customer) and let relationships carry the filter to the fact. Filtering a large fact table row by row is slower and repeats logic for every fact table.",
    "Put RLS filters on dimensions.",
    options=["On every fact table separately", "On the Date table", "In a measure", "On the dimension table that identifies the user's scope"],
    domain="manage", topic=SEC)

add("Row-level security", "yesno",
    "A semantic model uses RLS. For each statement, select Yes if it is true.",
    [True, False, True],
    "Dashboard tiles and Q&A answers run against the model as the viewer, so RLS applies. Publish to web isn't available for reports that use RLS, because it would expose data publicly without identity.",
    "RLS follows the user everywhere they query the model; Publish to web is blocked.",
    statements=["Dashboard tiles pinned from the report respect RLS for each viewer.", "You can share the report publicly with Publish to web, and RLS still applies.",
                "Answers from Q&A respect RLS."], domain="manage", topic=SEC)

add("Row-level security", "single",
    "You create a report with a live connection to a shared semantic model that uses RLS.\n\nWhat applies to your report's viewers?",
    "B",
    "RLS is part of the semantic model, so it applies to every report built on it, including live-connected ones. You can't add or change roles from a live-connected report.",
    "RLS lives in the semantic model and follows every report built on it.",
    options=["No RLS, unless you recreate the roles in your report", "The model's RLS roles", "Only static roles", "RLS applies only in Desktop"],
    domain="manage", topic=SEC, difficulty=1)

add("Object-level security", "yesno",
    "You secure the Salary column with object-level security (OLS) for every role except HR. For each statement, select Yes if it is true.",
    [True, True, False],
    "OLS hides the column from users without access, as if it didn't exist; visuals that use it show an error for them. It doesn't filter rows, which is RLS's job.",
    "OLS hides tables/columns; RLS filters rows.",
    statements=["Non-HR users can't see or query the Salary column.", "A visual that uses Salary shows an error for non-HR users.",
                "OLS filters Employee rows by department."], domain="manage", topic=SEC)

add("Choose a security feature", "dropdown",
    "Select the feature that meets each requirement.",
    {"parts": [0, 1, 2]},
    "RLS restricts rows per user. OLS hides tables or columns. Sensitivity labels classify content and keep protection on exported files.",
    "Rows → RLS. Columns/tables → OLS. Classify and protect exports → sensitivity labels.",
    parts=[{"label": "Regional managers see only their region's rows", "options": ["Row-level security", "Object-level security", "Sensitivity labels"]},
           {"label": "Only HR can see the Salary column", "options": ["Row-level security", "Object-level security", "Sensitivity labels"]},
           {"label": "Exported files stay encrypted and marked Confidential", "options": ["Row-level security", "Object-level security", "Sensitivity labels"]}],
    domain="manage", topic=SEC, difficulty=1)

B.save()
