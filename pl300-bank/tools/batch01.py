import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from svgkit import model, pq, dialog, visual_error
from bankkit import Batch

B = Batch(1, "prepare_get-data", "Get or connect to data", "prepare", {"prepare": 1})
add = B.add


# ---------------- Storage modes ----------------
add("Storage modes", "single",
    "A 3 GB sales model refreshes once a night from Azure SQL Database. Users want the fastest possible response when they click through report visuals, and yesterday's data is current enough.\n\nWhich storage mode should you use?",
    "A",
    "Import loads a compressed copy of the data into memory, which gives the fastest visual response, and a nightly scheduled refresh matches the 'yesterday is fine' requirement. DirectQuery sends every visual's query to the database, so it's slower. Dual is a per-table setting for composite models. Direct Lake needs Delta tables in OneLake, which an Azure SQL database isn't.",
    "Fast visuals + periodic freshness is fine → Import.",
    options=["Import", "DirectQuery", "Dual", "Direct Lake"], difficulty=1)

add("Storage modes", "single",
    "A warehouse-management database records stock movements every few seconds. The data is too large to import, and supervisors need report values that reflect the database when they open or interact with a page. They accept slower visuals.\n\nWhich storage mode should you use?",
    "B",
    "DirectQuery leaves the data at the source and queries it whenever a visual renders, so values reflect the database at that moment and size limits on imported data don't apply. Import would be stale between refreshes and too big. Dual and Direct Lake don't fit an operational SQL database.",
    "Too big to import or must be current at query time → DirectQuery.",
    options=["Import", "DirectQuery", "Dual", "Direct Lake"], difficulty=1)

add("Storage modes", "single",
    "Data engineers maintain Delta tables in a Microsoft Fabric lakehouse that update every 10 minutes. You need a semantic model with near-Import performance that doesn't duplicate the data through scheduled import refreshes.\n\nWhich storage mode should you use?",
    "C",
    "Direct Lake reads the Delta (Parquet) files in OneLake directly into memory on demand, so performance is close to Import without an import copy that has to be refreshed. Import would duplicate the data on each refresh, and DirectQuery would route queries through the SQL analytics endpoint, which is slower.",
    "Delta tables in OneLake + Import-like speed without copies → Direct Lake.",
    options=["Import", "DirectQuery", "Direct Lake", "Dual"])

add("Storage modes", "single",
    "Which data can a Direct Lake semantic model read?",
    "B",
    "Direct Lake works over Delta tables stored in OneLake, such as lakehouse or warehouse tables in Microsoft Fabric. An Azure SQL database, Excel files or SharePoint lists would need to be brought into OneLake first (for example with a pipeline, Dataflow Gen2 or mirroring) before Direct Lake can use them.",
    "Direct Lake = Delta tables in OneLake only.",
    options=["Any SQL Server or Azure SQL database", "Delta tables in OneLake, such as Fabric lakehouse or warehouse tables",
             "Excel and CSV files in SharePoint Online", "Any Power BI semantic model in the same workspace"])

add("Storage modes", "single",
    "Your DirectQuery model connects to an Azure SQL database. You add a sales targets table from an Excel workbook.\n\nWhat is the result?",
    "D",
    "Excel can't be queried live, so the new table is imported. A model that mixes DirectQuery and Import tables is a composite model, which Power BI supports. The rest of the model stays DirectQuery.",
    "Mixing Import and DirectQuery tables → composite model.",
    options=["Power BI blocks the change, because a model can only use one storage mode",
             "Every table switches to Import mode",
             "The Excel table is queried live in DirectQuery mode",
             "The model becomes a composite model, with the Excel table in Import mode"])

add("Storage modes", "single",
    "The exhibit shows a composite model. Sales uses DirectQuery for real-time data. SalesAgg is an imported aggregation table that answers summary visuals. Product and Date relate to both fact tables.\n\nWhich storage mode should you set for Product and Date?",
    "C",
    "Dual tables act as Import when queried with SalesAgg (answered from memory) and as DirectQuery when joined to Sales (so the join can run at the source). That avoids limited relationships and extra source queries. Import would force cross-source joins with Sales; DirectQuery would slow down the aggregation queries.",
    "Dimensions shared by Import and DirectQuery facts → Dual.",
    options=["Import", "DirectQuery", "Dual", "Direct Lake"],
    image=(model(880, 400, {
        "Product": {"x": 40, "y": 140, "w": 190, "tag": "?", "fields": [("ProductKey", "", "pink"), ("Product", "", None), ("Category", "", None)]},
        "Sales": {"x": 330, "y": 40, "w": 220, "tag": "DirectQuery", "fields": [("DateKey", "", "green"), ("ProductKey", "", "pink"), ("Amount", "sum", None)]},
        "SalesAgg": {"x": 330, "y": 230, "w": 220, "tag": "Import", "fields": [("MonthKey", "", "green"), ("ProductKey", "", "pink"), ("Amount", "sum", None)]},
        "Date": {"x": 650, "y": 140, "w": 190, "tag": "?", "fields": [("DateKey", "", "green"), ("Month", "", None), ("Year", "", None)]},
    }, [
        {"pts": [(230, 190), (280, 190), (280, 110), (330, 110)], "ends": ("1", "*"), "dir": ">"},
        {"pts": [(230, 220), (280, 220), (280, 300), (330, 300)], "ends": ("1", "*"), "dir": ">"},
        {"pts": [(650, 190), (600, 190), (600, 110), (550, 110)], "ends": ("1", "*"), "dir": ">"},
        {"pts": [(650, 220), (600, 220), (600, 300), (550, 300)], "ends": ("1", "*"), "dir": ">"},
    ], "Model view: composite model with storage modes", "Storage mode tags shown in the top-right of each table. Question marks are the tables to set."),
        "Model view with four tables. Sales is DirectQuery, SalesAgg is Import, and Product and Date, marked with question marks, relate to both."))

add("Storage modes", "yesno",
    "You create a report in Power BI Desktop with a live connection to a semantic model published in the Power BI service.\n\nFor each statement, select Yes if it is true.",
    [True, False, True],
    "A live connection uses the published model as-is: you can add report-level measures (stored in the report), but you can't add calculated columns, edit relationships or use Power Query, and the Table and Model views are hidden. Row-level security defined in the model applies to you as a report viewer.",
    "Live connection = report layer only, plus report-level measures.",
    statements=["You can create report-level measures.", "You can add a calculated column to a table in the semantic model.",
                "Row-level security defined in the semantic model still applies to report viewers."])

add("Storage modes", "single",
    "You have a live connection to a shared semantic model. You need to add a small Excel table of regional targets to your report and relate it to the model's Region table.\n\nWhat should you do?",
    "A",
    "Selecting Make changes to this model converts the live connection into a composite model: the shared semantic model is connected through DirectQuery, and you can add local tables such as the Excel file and relate them. It needs the tenant setting that allows DirectQuery connections to semantic models, and Build permission on the model. Copying the model loses the shared, governed source.",
    "Need to extend a live-connected model → Make changes to this model (composite).",
    options=["Select Make changes to this model, then import the Excel table",
             "Add the Excel table through Power Query in the live-connected report",
             "Create a calculated table in the live-connected report",
             "Ask the model owner to send you the .pbix file and edit a copy"])

add("Storage modes", "single",
    "The DirectQuery source is a SQL Server database that already restricts which rows each user can see. Report users must see only the rows the database allows them to see, based on their own identity.\n\nWhat should you configure?",
    "C",
    "With DirectQuery and single sign-on (SSO) enabled on the gateway connection, the report user's identity is passed to the database, so the database's own security decides which rows return. Import would cache one account's view of the data. RLS in Power BI would duplicate the rules rather than use the database's.",
    "Use the source's own per-user security → DirectQuery + SSO.",
    options=["Import mode with scheduled refresh", "Import mode with row-level security in Power BI",
             "DirectQuery with single sign-on (SSO) for the data source", "A live connection"], difficulty=3)

# ---------------- Gateways ----------------
add("Gateways", "yesno",
    "You publish a semantic model that imports from several sources and set up scheduled refresh in the Power BI service.\n\nFor each source, select Yes if an on-premises data gateway is required.",
    [True, False, False, True],
    "A gateway is needed for sources inside your organisation's network, such as an on-premises SQL Server or a file on a network share. Cloud sources the service can reach directly, such as Azure SQL Database and SharePoint Online, don't need one.",
    "Inside the company network → gateway. Cloud → no gateway.",
    statements=["A SQL Server database on a server in your office", "An Azure SQL database", "An Excel file in SharePoint Online",
                "A CSV file on a network file share (\\\\fileserver\\finance)"], difficulty=1)

add("Gateways", "single",
    "An analyst installed an on-premises data gateway in personal mode on her laptop. Her imported models refresh, but a new DirectQuery report to the same on-premises SQL Server fails to connect in the service.\n\nWhat is the most likely cause?",
    "B",
    "Personal mode supports scheduled refresh of imported data for one user only. It doesn't support DirectQuery or live connections, and it stops working when the laptop is off. A gateway in standard mode, usually installed on a server, supports DirectQuery and can be shared and managed centrally.",
    "DirectQuery through a gateway → standard mode, not personal.",
    options=["DirectQuery doesn't support SQL Server", "Personal mode doesn't support DirectQuery",
             "The gateway must be installed on the SQL Server itself", "DirectQuery requires a virtual network data gateway"])

add("Gateways", "order",
    "A semantic model imports from an on-premises SQL Server. No gateway exists yet.\n\nSelect the actions you should perform and arrange them in order so that scheduled refresh works.",
    ["A", "B", "C", "D"],
    "Install the gateway, sign in and register it, add a connection (server, database and credentials) for it in the service, then map the semantic model's data source to that connection in the model's settings before scheduling refresh. Personal mode and Publish to web don't belong in this setup.",
    "Install → register → add connection → map model → schedule.",
    items=["Install the on-premises data gateway (standard mode) on a server that can reach SQL Server",
           "Sign in and register the gateway with your organisation's Power BI tenant",
           "In the Power BI service, add a data source connection for the SQL Server on the gateway",
           "In the semantic model's settings, map the data source to the gateway connection and set the refresh schedule",
           "Switch the gateway to personal mode", "Publish the report to the web"])

add("Gateways", "single",
    "Which source requires a virtual network (VNet) data gateway rather than an on-premises data gateway?",
    "C",
    "A VNet data gateway reaches Azure data services that are locked inside an Azure virtual network or behind private endpoints, without you installing gateway software on a machine. On-premises servers still need the on-premises data gateway, and public cloud sources such as SharePoint Online need no gateway at all.",
    "Azure source inside a virtual network → VNet data gateway.",
    options=["A SQL Server on a server in your office", "An Excel file in SharePoint Online",
             "An Azure SQL database that only accepts connections through a private endpoint in an Azure virtual network",
             "A public web API"], difficulty=3)

# ---------------- Connectors and authentication ----------------
add("Connectors and authentication", "dropdown",
    "You need to import data from a web API. Each request returns JSON, and you have a username and password for the API.\n\nSelect the connector and the authentication method.",
    {"parts": [1, 1]},
    "A web API is reached through its URL with the Web connector, which parses the JSON response for you. In Power BI, Basic authentication means a username and password. The JSON connector is for JSON files, Web API authentication is for API keys, and Organizational account is for Microsoft Entra sign-in.",
    "API URL → Web connector. Username + password → Basic.",
    parts=[{"label": "Connector", "options": ["JSON", "Web", "OData feed", "Dataflows"]},
           {"label": "Authentication", "options": ["Anonymous", "Basic", "Web API", "Organizational account"]}])

add("Connectors and authentication", "single",
    "A web API issues your team a single access key instead of a username and password.\n\nWhich authentication method should you select in the Web connector?",
    "C",
    "Web API authentication takes a key. Basic is username plus password, Anonymous sends nothing, and Organizational account signs in with Microsoft Entra ID.",
    "API key → Web API authentication.",
    options=["Anonymous", "Basic", "Web API", "Organizational account"], difficulty=1)

add("Connectors and authentication", "multi",
    "An Excel workbook is stored in a OneDrive for Business folder that is also synced to your computer. The semantic model must refresh in the Power BI service without a gateway.\n\nWhich two connectors can you use? Each correct answer presents a complete solution.",
    ["B", "D"],
    "Both connect to the file through its cloud address, so the service refreshes it directly. The Web connector takes the file's direct link; the SharePoint folder connector takes the OneDrive for Business site URL, because OneDrive for Business is built on SharePoint. The Excel workbook and Folder connectors browse your local disk and pick up the synced copy, which needs a gateway.",
    "OneDrive/SharePoint + no gateway → connect by URL (Web or SharePoint folder).",
    options=["Excel workbook", "Web", "Folder", "SharePoint folder", "Text/CSV"], select=2)

add("Connectors and authentication", "single",
    "The exhibit shows Power Query Editor after you connect to a folder with the Folder connector.\n\nWhich column holds the contents of each file?",
    "A",
    "Content holds each file as Binary data. Combine (or clicking the double-arrow icon on Content) reads those binaries. The other columns are metadata about the file: name, extension, dates, folder path, and Attributes, a Record with more properties such as Size.",
    "Folder connector: Content = file data; everything else = metadata.",
    options=["Content", "Name", "Attributes", "Folder Path"], difficulty=1,
    image=(pq([("Content", "bin"), ("Name", "text"), ("Extension", "text"), ("Date modified", "dt"), ("Attributes", "rec"), ("Folder Path", "text")],
              [["Binary", "Sales_2026-07.csv", ".csv", "05/08/2026 07:12", "Record", "C:\\Data\\Sales\\"],
               ["Binary", "Sales_2026-08.csv", ".csv", "04/09/2026 07:09", "Record", "C:\\Data\\Sales\\"],
               ["Binary", "Sales_2026-09.csv", ".csv", "06/10/2026 07:15", "Record", "C:\\Data\\Sales\\"]],
              "Power Query Editor: results of the Folder connector",
              col_w=[100, 170, 100, 150, 100, 150], steps=["Source"]),
           "Power Query preview of a folder: columns Content (Binary), Name, Extension, Date modified, Attributes (Record) and Folder Path, one row per CSV file."))

add("Connectors and authentication", "single",
    "You use Combine & Transform Data on a folder of CSV files. Power BI creates helper queries. You need to change a step so that it applies to every file before the files are stacked.\n\nWhich query should you edit?",
    "B",
    "Combine builds a function from the Transform Sample File query and runs it against every file. Changes made to Transform Sample File apply to all files before they are appended. Editing the final combined query changes the result after combining; editing the Sample File parameter only picks which file is the sample.",
    "Per-file change during combine → edit Transform Sample File.",
    options=["The final combined query", "Transform Sample File", "The Sample File parameter", "The Source step of the final query"],
    difficulty=3)

add("Connectors and authentication", "single",
    "You import a CSV file. Rows after row 200 contain decimal values in a column that Power Query typed as Whole Number, and they now show errors.\n\nBased on the exhibit, what should you change?",
    "C",
    "By default the Text/CSV connector detects data types from the first 200 rows. Choosing Based on entire dataset makes it look at every row before choosing types, so the column becomes Decimal Number. Changing the delimiter or file origin doesn't affect type detection; Do not detect data types would leave every column as text.",
    "CSV types wrong beyond row 200 → Data Type Detection: Based on entire dataset.",
    options=["File Origin", "Delimiter", "Data Type Detection: Based on entire dataset", "Data Type Detection: Do not detect data types"],
    image=(dialog(560, "Sales_Q3.csv", [
        ("label", "File Origin", "65001: Unicode (UTF-8)"),
        ("label", "Delimiter", "Comma"),
        ("label", "Data Type Detection", "Based on first 200 rows"),
        ("note", "Other options: Based on entire dataset, Do not detect data types"),
    ], "Text/CSV import dialog", buttons=("Load", "Transform Data", "Cancel")),
        "CSV import dialog showing File Origin UTF-8, Delimiter Comma, and Data Type Detection set to Based on first 200 rows."))

add("Connectors and authentication", "single",
    "A colleague built a workbook with a Power Pivot data model, Power Query queries and measures. You need to bring all of it into Power BI Desktop with the least effort.\n\nWhat should you do?",
    "D",
    "File > Import > Power Query, Power Pivot, Power View in Power BI Desktop migrates the workbook's queries, data model and measures into a new Power BI file. Connecting with the Excel workbook connector only imports sheet and table data, not the model or measures.",
    "Excel Power Pivot model → File > Import > Power Query, Power Pivot, Power View.",
    options=["Get data > Excel workbook, and select every table", "Copy the measures into DAX query view",
             "Save the workbook as CSV and use the Folder connector",
             "File > Import > Power Query, Power Pivot, Power View"])

add("Connectors and authentication", "single",
    "You want to give colleagues a small file that opens Power BI Desktop already pointed at the correct SQL Server database, so they only need to sign in.\n\nWhat should you share?",
    "A",
    "A PBIDS (Power BI data source) file holds connection details only. Opening it launches Power BI Desktop and starts Get data for that source, asking for credentials. A PBIT template holds queries, model and report pages; a PBIX holds everything including data.",
    "Share a connection only → .pbids.",
    options=["A .pbids file", "A .pbit file", "A .pbix file", "A .json theme file"])

# ---------------- Data source settings, credentials, privacy ----------------
add("Data source settings", "single",
    "Twelve queries in a report read from the SQL Server shown in the exhibit. The database has been moved to a new server.\n\nWhat is the quickest way to point every query at the new server?",
    "A",
    "In Data source settings, Change Source updates the server for every query that uses that data source in the file. Editing each query's Source step works but takes twelve edits. Edit Permissions changes credentials and privacy levels, not the address. Clear Permissions removes saved credentials.",
    "Source moved → Data source settings > Change Source.",
    options=["Select the source and choose Change Source", "Edit the Source step in each of the twelve queries",
             "Select the source and choose Edit Permissions", "Select the source and choose Clear Permissions"],
    image=(dialog(620, "Data source settings", [
        ("radio", "Manage settings for data sources", ["Data sources in current file", "Global permissions"], 0),
        ("list", ["sqlsrv-old01; SalesDB", "C:\\Finance\\Targets.xlsx"], 0),
        ("buttons_inline", ["Change Source...", "Export PBIDS", "Edit Permissions...", "Clear Permissions"]),
    ], "Data source settings dialog in Power BI Desktop", buttons=("Close",)),
        "Data source settings dialog listing sqlsrv-old01; SalesDB (selected) and an Excel file, with buttons Change Source, Export PBIDS, Edit Permissions and Clear Permissions."))

add("Data source settings", "single",
    "Scheduled refresh of a published semantic model fails. The exhibit shows the model's settings page in the Power BI service. The database password changed last night.\n\nWhat should you do?",
    "C",
    "The data source credentials stored for the semantic model are no longer valid. Edit credentials and enter the new password, then refresh. Republishing doesn't update service-side credentials, and the gateway itself is working.",
    "Refresh fails after a password change → edit the data source credentials in the service.",
    options=["Republish the report from Power BI Desktop", "Reinstall the on-premises data gateway",
             "Select Edit credentials and enter the new password", "Turn off scheduled refresh and turn it on again"],
    image=(dialog(640, "Settings for Sales Model", [
        ("heading", "Data source credentials"),
        ("note", "⚠ Your data source can't be refreshed because the credentials are invalid."),
        ("table", ["Data source", "Status"], [["SqlServer: sqlsrv01; SalesDB", "Credentials invalid"]], 0),
        ("buttons_inline", ["Edit credentials"]),
        ("heading", "Scheduled refresh"),
        ("check", "Keep your data up to date (daily, 06:00)", True),
    ], "Semantic model settings page in the Power BI service", buttons=("Apply", "Discard")),
        "Semantic model settings showing a warning that credentials for SqlServer sqlsrv01 SalesDB are invalid, an Edit credentials button and a daily scheduled refresh."))

add("Data source settings", "dropdown",
    "You set privacy levels for three data sources.\n\nSelect the correct privacy level for each source.",
    {"parts": [0, 1, 2]},
    "Private is for data that must not be shared with any other source, such as salaries. Organizational data can flow to other organisational sources but not to public ones. Public data, such as open government statistics, can be combined with anything. Privacy levels control whether Power Query may send data from one source to another while combining them.",
    "Private = isolated. Organizational = inside the company. Public = anyone.",
    parts=[{"label": "An HR workbook containing employee salaries", "options": ["Private", "Organizational", "Public"]},
           {"label": "The company's internal sales database", "options": ["Private", "Organizational", "Public"]},
           {"label": "A government open-data population API", "options": ["Private", "Organizational", "Public"]}])

add("Data source settings", "single",
    "A query merges an internal SQL Server table with a public web API. Refresh fails with a Formula.Firewall error.\n\nWhat is the error protecting against?",
    "B",
    "When sources are combined, Power Query may send values from one source to another, for example passing customer IDs from SQL Server into calls to the web API. Privacy levels and the Formula.Firewall error stop organisational or private data from leaking to a less private source. Set the levels correctly or restructure the query.",
    "Formula.Firewall = privacy levels stopping data leaking between sources.",
    options=["The web API's request rate limit", "Private or organisational data being sent to a less private source while combining",
             "Expired gateway credentials", "A circular reference between two queries"], difficulty=3)

# ---------------- Parameters ----------------
add("Parameters", "single",
    "The exhibit shows a Power Query parameter used in every query's Source step. After publishing, you need to switch the published semantic model from the development server to the production server without editing the report in Power BI Desktop.\n\nWhere should you change it?",
    "B",
    "Power Query parameters appear in the semantic model's settings in the Power BI service, under Parameters, where you can change their values without republishing. The next refresh uses the new server. Report-level settings and dashboards don't control data sources.",
    "Change a parameter after publishing → semantic model settings > Parameters.",
    options=["In the report's Format pane", "In the semantic model's settings, under Parameters",
             "In the workspace settings", "In the dashboard tile settings"],
    image=(dialog(560, "Manage Parameters", [
        ("label", "Name", "ServerName"),
        ("label", "Type", "Text"),
        ("label", "Suggested Values", "List of values"),
        ("label", "Current Value", "sqlsrv-dev01"),
        ("check", "Required", True),
    ], "Manage Parameters dialog in Power Query Editor"),
        "Manage Parameters dialog for a parameter named ServerName of type Text, suggested values from a list, current value sqlsrv-dev01."))

add("Parameters", "single",
    "A parameter named Region must only accept values that appear in a Regions query, which the business updates regularly.\n\nHow should you set the parameter's Suggested Values?",
    "C",
    "Suggested Values: Query takes the allowed values from a list query, so the choices update when the source list changes. Any value accepts anything typed; List of values is a fixed list you type and maintain by hand.",
    "Parameter choices from a maintained list → Suggested Values: Query.",
    options=["Any value", "List of values", "Query", "Required"])

add("Parameters", "single",
    "You save a report as a Power BI template (.pbit). It uses Power Query parameters for the server name and region.\n\nWhat happens when a colleague opens the template?",
    "A",
    "A template contains the queries, model and report but no data. When it opens, Power BI Desktop prompts for the parameter values, then loads the data. That makes templates ideal for reusing one report for another server, region or client.",
    "Template + parameters → prompted for values on open.",
    options=["Power BI Desktop prompts for the parameter values, then loads data using them",
             "The report opens with the data that was in the original file",
             "The parameters are removed and must be recreated", "The template opens in the Power BI service"])

add("Parameters", "single",
    "You configure incremental refresh on a Sales table.\n\nWhich filter on OrderDate prevents a row from being loaded into two partitions?",
    "B",
    "RangeStart and RangeEnd must be Date/Time parameters, and the filter must be inclusive on one side and exclusive on the other, usually >= RangeStart and < RangeEnd. With <= on both ends, a row exactly on a partition boundary would load twice.",
    "Incremental refresh filter: >= RangeStart and < RangeEnd.",
    options=["`[OrderDate] >= RangeStart and [OrderDate] <= RangeEnd`",
             "`[OrderDate] >= RangeStart and [OrderDate] < RangeEnd`",
             "`[OrderDate] > RangeStart and [OrderDate] > RangeEnd`",
             "`[OrderDate] = RangeStart or [OrderDate] = RangeEnd`"], difficulty=3)

# ---------------- Refresh and real-time options ----------------
add("Refresh options", "single",
    "You configure incremental refresh on a large Sales table. Old rows are sometimes corrected, and the table has a LastModified column.\n\nWhich setting makes Power BI refresh only the partitions in which rows have actually changed?",
    "C",
    "Detect data changes uses a date/time column, such as LastModified, to check each partition's maximum value and refresh only partitions where it changed. The incremental window alone refreshes the most recent periods whether or not anything changed.",
    "Refresh only changed partitions → Detect data changes on a LastModified column.",
    options=["Only refresh complete days", "Increase the archive period", "Detect data changes, using LastModified",
             "Get the latest data in real time with DirectQuery"], difficulty=3)

add("Refresh options", "single",
    "An incremental refresh policy uses Get the latest data in real time with DirectQuery, creating a hybrid table.\n\nWhat does the workspace require?",
    "B",
    "Hybrid tables, where recent data is a DirectQuery partition and older data is imported, need Premium capacity, Premium per user or Fabric capacity. Incremental refresh itself also works on Pro, but the real-time DirectQuery partition doesn't.",
    "Real-time partition in incremental refresh → Premium, PPU or Fabric capacity.",
    options=["Any Pro workspace", "Premium capacity, Premium per user or Fabric capacity",
             "An on-premises data gateway in personal mode", "A Direct Lake semantic model"], difficulty=3)

add("Refresh options", "single",
    "A DirectQuery report in a shared-capacity (Pro) workspace must update its visuals automatically while users keep the page open.\n\nWhich feature should you use, and what is the shortest interval allowed?",
    "D",
    "Automatic page refresh re-runs a page's queries at a fixed interval while it's open, for DirectQuery sources. In shared capacity the minimum interval is 30 minutes; shorter intervals need capacity, where the admin sets the minimum. Scheduled refresh applies to imported data, not open pages.",
    "Auto-updating DirectQuery page → automatic page refresh (30 min minimum on shared).",
    options=["Scheduled refresh, every 15 minutes", "Automatic page refresh, every 1 second",
             "Scheduled refresh, every 30 minutes", "Automatic page refresh, every 30 minutes"], difficulty=3)

add("Refresh options", "single",
    "A Pro workspace's semantic model has grown to 1.4 GB, and publishing fails because it is too large.\n\nWhat is the limit, and which change removes it without reducing the data?",
    "A",
    "Semantic models in shared capacity are limited to 1 GB. Moving the workspace to Premium per user or a Premium/Fabric capacity raises the limit (PPU allows up to 100 GB). Removing data would also work, but the requirement is to keep it. Gateways don't affect model size.",
    "Shared capacity model size limit = 1 GB.",
    options=["1 GB; move the workspace to Premium per user or Premium/Fabric capacity",
             "10 GB; enable the large semantic model storage format in the Pro workspace",
             "1 GB; install a standard on-premises gateway", "2 GB; split the report into two pages"], difficulty=2)

add("Refresh options", "single",
    "The DirectQuery visual in the exhibit fails to load.\n\nWhat should you do?",
    "B",
    "DirectQuery limits intermediate query results to 1 million rows. The visual is asking for too much detail, for example a table of every transaction. Aggregate it, add filters, or use a less granular field so fewer rows return. More visuals or refresh settings don't change the limit.",
    "DirectQuery 1-million-row error → reduce the visual's granularity.",
    options=["Increase the scheduled refresh frequency", "Reduce the rows the visual returns, for example by summarising or filtering it",
             "Switch the gateway to personal mode", "Enable Auto date/time"],
    image=(visual_error(760, 300, "Transaction details", [
        "Couldn't load the data for this visual",
        "The resultset of a query to external data source has exceeded",
        "the maximum allowed size of '1000000' rows."], "Report visual showing a DirectQuery row-limit error"),
        "A table visual named Transaction details displaying the error: the resultset of a query to external data source has exceeded the maximum allowed size of 1000000 rows."))

# ---------------- Query folding ----------------
add("Query folding", "single",
    "A query in a DirectQuery model shows the error in the exhibit after you add a transformation. The model must stay in DirectQuery mode.\n\nWhat should you do?",
    "C",
    "In DirectQuery, every Power Query step must fold into a source query. A step that can't fold triggers this error. Since the model must stay DirectQuery, do the transformation at the source, for example in a SQL view, or replace it with a step that folds. Switching to Import would also clear the error but breaks the requirement.",
    "DirectQuery + non-folding step → move the logic to the source.",
    options=["Switch the query to Import mode", "Enable Auto date/time",
             "Perform the transformation in the source, for example in a SQL view", "Clear the data source permissions"], difficulty=3,
    image=(pq([("OrderID", "int"), ("Customer", "text"), ("Amount", "dec")],
              [["10248", "Contoso Ltd", "1,240.00"], ["10249", "Fabrikam Inc", "860.50"], ["10250", "Litware", "2,115.75"]],
              "Power Query Editor: DirectQuery folding error",
              banner=("warn", "This step results in a query that is not supported in DirectQuery mode."),
              steps=["Source", "Navigation", "Filtered Rows", "Added Custom"], col_w=[120, 200, 140]),
        "Power Query Editor with a warning banner: This step results in a query that is not supported in DirectQuery mode. Applied steps: Source, Navigation, Filtered Rows, Added Custom (selected)."))

add("Query folding", "single",
    "The exhibit shows the applied steps of a query against SQL Server. View Native Query is available on Filtered Rows but unavailable on Grouped Rows.\n\nWhich step most likely stopped folding?",
    "C",
    "Filtering folds into a WHERE clause, so folding was still working at Filtered Rows. An index column has no direct SQL equivalent, so it runs locally, and steps after it (including the grouping) can't fold either. Reorder: group before adding the index.",
    "Steps after a non-folding step usually don't fold either.",
    options=["Source", "Filtered Rows", "Added Index", "Grouped Rows"],
    image=(pq([("CustomerKey", "int"), ("Orders", "int")],
              [["11185", "68"], ["11300", "67"], ["11277", "65"]],
              "Power Query Editor: applied steps for a SQL Server query",
              steps=["Source", "Navigation", "Filtered Rows", "Added Index", "Grouped Rows"], col_w=[160, 140]),
        "Power Query Editor showing a query with applied steps Source, Navigation, Filtered Rows, Added Index and Grouped Rows (selected)."))

add("Query folding", "single",
    "You import a SQL Server table by typing a native SQL statement in the connector's Advanced options. You then add filter and group steps in Power Query.\n\nWhat should you expect?",
    "B",
    "When you supply your own SQL statement, Power Query usually doesn't fold later steps into it, so the filter and group run locally after the full result is retrieved. Put the filtering and grouping in the SQL statement itself, or connect to the table and let Power Query generate the SQL.",
    "Custom native SQL → later steps generally don't fold.",
    options=["The filter and group steps fold into the native SQL statement",
             "The later steps generally don't fold, so they run locally after the query returns", "The query switches to DirectQuery",
             "Power Query rejects any steps after a native SQL statement"], difficulty=3)

add("Query folding", "single",
    "Which tool shows the SQL that Power Query sends to the source for a given step?",
    "A",
    "Right-click a step and choose View Native Query to see the SQL generated for that step when it folds. Performance Analyzer times report visuals and their DAX queries; Column profiling describes the data; the Advanced Editor shows the M code, not the SQL sent to the source.",
    "See the generated SQL → View Native Query.",
    options=["View Native Query", "Performance Analyzer", "Column profiling", "Advanced Editor"], difficulty=1)

# ---------------- Shared semantic models and dataflows ----------------
add("Shared models and dataflows", "single",
    "An analyst in another workspace needs to build a new report in Power BI Desktop on your published semantic model, without being given a role in your workspace.\n\nWhat must you grant?",
    "C",
    "Build permission on the semantic model lets people create reports on it from Desktop or the service, and use Analyze in Excel, without a workspace role. Read-only access lets them view reports but not build on the model.",
    "Build on someone else's model → Build permission.",
    options=["Reshare permission on a report", "The Viewer role in your workspace", "Build permission on the semantic model",
             "Certification of the semantic model"])

add("Shared models and dataflows", "single",
    "Three teams each rebuild the same 15-step Power Query cleanup of the customer master data in their own semantic models.\n\nWhat should you do to build the cleanup once and reuse it?",
    "A",
    "A dataflow runs Power Query in the service and stores the cleaned table, and each team's semantic model connects to that output. Copying M code keeps three copies to maintain, and a calculated table works in only one model.",
    "Same Power Query logic in several models → dataflow.",
    options=["Create a dataflow for the customer table and have each model connect to it",
             "Copy the M code into each team's file", "Create a calculated table in one model",
             "Use a PBIDS file for the customer source"])

add("Shared models and dataflows", "single",
    "In Microsoft Fabric, you build a Dataflow Gen2 that cleans sales data. A Direct Lake semantic model must read the result.\n\nWhat should you configure on the dataflow?",
    "B",
    "Dataflow Gen2 can write its output to a data destination such as a lakehouse or warehouse, which stores it as Delta tables in OneLake. Direct Lake models read those tables. Scheduled refresh alone keeps the dataflow's internal staging, which Direct Lake doesn't read.",
    "Dataflow Gen2 → output destination (lakehouse) → Direct Lake reads it.",
    options=["A scheduled refresh only", "A data destination, such as a lakehouse table",
             "An on-premises gateway in personal mode", "Incremental refresh with RangeStart and RangeEnd"], difficulty=3)

add("Shared models and dataflows", "single",
    "In Power BI Desktop, how do you load tables produced by a Power BI dataflow?",
    "D",
    "Get data has a Dataflows connector that lists the dataflows you can access and their tables. The dataflow's output is stored in the service, so you don't connect to its original sources or to a file.",
    "Use dataflow output in Desktop → Get data > Dataflows.",
    options=["Get data > Folder", "Get data > Power BI semantic models", "Copy the dataflow's M code into a blank query",
             "Get data > Dataflows"], difficulty=1)


B.save()
