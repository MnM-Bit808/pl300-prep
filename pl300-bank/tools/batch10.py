import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from svgkit import model, pq
from bankkit import Batch

B = Batch(10, "case-studies", "Case studies", "case", {"case": 1})
add = B.add

# =====================================================================
# Case 1: Tailwind Traders (retail)
# =====================================================================
B.case("CS1", "Tailwind Traders", [
    ("Overview", [
        "Tailwind Traders runs 140 home-improvement stores in four regions. It is moving store and regional reporting from spreadsheets to Power BI.",
        "All reports will be published to one workspace, Retail Analytics, on Fabric capacity F64."]),
    ("Data sources", [
        "Sales: an Azure SQL database. The Sales table has one row per receipt line (about 900 million rows) with StoreKey, ProductKey, DateKey, Quantity and Amount.",
        "Inventory: an on-premises SQL Server. The StockLevel table records each product's stock on hand at each store at the end of every day.",
        "Targets: an Excel workbook in SharePoint Online with one row per product category per month.",
        "Store: a table in the Azure SQL database with StoreKey, StoreName, Region and ManagerEmail. Each store has one manager."]),
    ("Requirements", [
        "Data must be current as of 7:00 AM each day, and visuals must respond quickly.",
        "Store managers must see only their own store. Regional directors must see every store in their region; a director can cover more than one region, and coverage changes several times a year. Executives must see everything.",
        "Inventory reports must show stock on hand at the end of each month, quarter and year.",
        "Sales must be compared with targets by category and month.",
        "The 400 store managers have free Power BI licences. They must get a single, curated set of reports that's separate from work in progress in the workspace."]),
    ("Exhibit", ["The current draft model is shown below."],
     (model(900, 440, {
         "Store": {"x": 30, "y": 40, "w": 200, "fields": [("StoreKey", "", "pink"), ("StoreName", "", None), ("Region", "", None), ("ManagerEmail", "", None)]},
         "Sales": {"x": 350, "y": 30, "w": 200, "fields": [("StoreKey", "", "pink"), ("ProductKey", "", "blue"), ("DateKey", "", "green"), ("Amount", "sum", None)]},
         "Product": {"x": 30, "y": 230, "w": 200, "fields": [("ProductKey", "", "blue"), ("Product", "", None), ("Category", "", None)]},
         "Date": {"x": 670, "y": 40, "w": 200, "fields": [("DateKey", "", "green"), ("Month", "", None), ("Year", "", None)]},
         "StockLevel": {"x": 350, "y": 230, "w": 200, "fields": [("StoreKey", "", None), ("ProductKey", "", None), ("DateKey", "", None), ("OnHand", "sum", None)]},
     }, [{"pts": [(230, 100), (350, 100)], "ends": ("1", "*"), "dir": ">"},
         {"pts": [(230, 290), (290, 290), (290, 140), (350, 140)], "ends": ("1", "*"), "dir": ">"},
         {"pts": [(670, 120), (550, 120)], "ends": ("1", "*"), "dir": ">"}], "Tailwind Traders draft model",
         legend="StockLevel is not yet related to any table."),
      "Draft model: Store, Product and Date each relate one-to-many to Sales. StockLevel (StoreKey, ProductKey, DateKey, OnHand) has no relationships yet.")),
])

add("Prepare the data", "single",
    "Which data sources need an on-premises data gateway for scheduled refresh?",
    "C",
    "Only the on-premises SQL Server holding StockLevel is inside the company network. Azure SQL Database and SharePoint Online are cloud sources the service reaches directly.",
    "Gateway only for sources inside the company network.",
    options=["The Azure SQL database only", "The SharePoint Online workbook only", "The on-premises SQL Server only", "All three sources"],
    case="CS1", difficulty=1)

add("Prepare the data", "single",
    "How should you configure the Sales table to meet the freshness and performance requirements while keeping refresh times practical?",
    "B",
    "Data only needs to be current by 7 AM, so Import gives the fastest visuals, and incremental refresh avoids reloading 900 million rows every night by refreshing only recent partitions. DirectQuery would slow every visual.",
    "Daily freshness + fast visuals + huge fact → Import with incremental refresh.",
    options=["DirectQuery", "Import with incremental refresh", "Import with a full refresh every night", "Dual"], case="CS1")

add("Model the data", "single",
    "Which measure meets the inventory requirement?",
    "A",
    "Stock on hand is semi-additive: it adds across stores and products but not across days. Evaluating the sum on the last date of the period gives the closing stock for any month, quarter or year. StockLevel has a row every day, so LASTDATE always finds data.",
    "Closing stock → sum on the period's last date.",
    options=["`CALCULATE ( SUM ( StockLevel[OnHand] ), LASTDATE ( 'Date'[Date] ) )`", "`SUM ( StockLevel[OnHand] )`",
             "`AVERAGE ( StockLevel[OnHand] )`", "`TOTALYTD ( SUM ( StockLevel[OnHand] ), 'Date'[Date] )`"], case="CS1")

add("Model the data", "single",
    "How should the Targets table be related so that targets can be compared with sales by category and month?",
    "D",
    "Targets are at category-and-month grain, while Product is at product grain, so Category isn't unique on either side. Microsoft's pattern is a many-to-many relationship from Product[Category] to Targets[Category] with Product filtering Targets, plus a month-level link to Date, and keeping target visuals at month level or above.",
    "Higher-grain facts → many-to-many on the shared attribute, single direction.",
    options=["Merge Targets into Sales", "One-to-many from Targets to Product on Category", "Append Targets to Sales",
             "Many-to-many between Product[Category] and Targets[Category], with Product filtering Targets, plus a month-level link to Date"],
    case="CS1", difficulty=3)

add("Manage and secure", "single",
    "How should you meet the security requirements for regional directors with the least ongoing maintenance?",
    "B",
    "Directors can cover several regions and coverage changes, so a mapping table (one row per director per region) with a dynamic role using USERPRINCIPALNAME () handles it: changes are new rows, not new roles. Executives get a role with no filter; store managers use a dynamic role on ManagerEmail.",
    "Many-to-many user access that changes → mapping table + dynamic role.",
    options=["One static role per region, edited whenever coverage changes", "A director-region mapping table with a dynamic role using USERPRINCIPALNAME ()",
             "Give directors the Contributor role", "A separate report per region"], case="CS1")

add("Manage and secure", "single",
    "How should you distribute reports to the store managers?",
    "C",
    "A workspace app gives managers a curated set of reports separate from the workspace's work in progress (audiences can tailor content). Because the workspace is on F64, free-licensed users can view it. Viewer roles would expose the workspace itself.",
    "Curated content for many free-licence readers → app on F64+ capacity.",
    options=["Give each manager the Viewer role", "Publish to web", "Publish a workspace app", "Email PDF exports"], case="CS1", difficulty=1)

add("Manage and secure", "yesno",
    "For each statement about the store managers' access, select Yes if it is true.",
    [True, False, True],
    "F64 capacity lets free users view content. Store managers aren't added to the executives' role, so RLS restricts them to their store. RLS applies in apps just as in the workspace.",
    "F64+ capacity: free viewers. RLS follows users into apps.",
    statements=["Store managers with free licences can view the app because the workspace is on F64.",
                "Store managers see every store when they open the app, because apps bypass RLS.",
                "Row-level security applies to store managers when they view reports in the app."], case="CS1")

# =====================================================================
# Case 2: Contoso Clinics (healthcare, Fabric)
# =====================================================================
B.case("CS2", "Contoso Clinics", [
    ("Overview", [
        "Contoso Clinics operates 35 outpatient clinics. Its data team uses Microsoft Fabric.",
        "Analysts want to understand appointment no-shows and track daily patient volumes."]),
    ("Data", [
        "Appointments: a Delta table in a Fabric lakehouse, updated every 15 minutes, with one row per appointment (about 300 million rows). Columns include PatientKey, ClinicKey, DateKey, BookingChannel, LeadTimeDays, AgeBand and NoShow (Yes or No).",
        "Patient: a lakehouse table with PatientKey, PatientName, DateOfBirth and PostalCode.",
        "Clinic and Date dimension tables are also in the lakehouse."]),
    ("Requirements", [
        "Reports must show near-current data without copying it through scheduled imports, with Import-like performance.",
        "Analysts must see every appointment but must not be able to see or query PatientName or DateOfBirth. Clinical managers must see them.",
        "Every report and semantic model must carry a sensitivity label before it is published.",
        "Analysts need to find which factors make a no-show more likely.",
        "Operations managers want unusual daily appointment volumes flagged automatically.",
        "Executives want an AI-written summary on the overview page."]),
])

add("Prepare the data", "single",
    "Which storage mode should the semantic model use?",
    "A",
    "The data is in Delta tables in OneLake and must be near-current with Import-like speed and no import copies. Direct Lake reads the Delta files directly into memory. Import would copy 300 million rows; DirectQuery would be slower.",
    "Fabric Delta tables + no copies + fast → Direct Lake.",
    options=["Direct Lake", "Import", "DirectQuery", "Dual"], case="CS2", difficulty=1)

add("Manage and secure", "single",
    "Which feature meets the requirement for PatientName and DateOfBirth?",
    "C",
    "Object-level security hides those columns from analysts entirely (they can't see or query them) while clinical managers' role allows them. RLS filters rows, which isn't needed: analysts must see every appointment.",
    "Hide columns from some users → object-level security.",
    options=["Row-level security", "Hide the columns in report view", "Object-level security", "A sensitivity label"], case="CS2")

add("Manage and secure", "single",
    "What should the admin configure so that every report and semantic model has a sensitivity label before publishing?",
    "B",
    "A mandatory labeling policy in Microsoft Purview, enabled for Power BI, requires a label on content. A default label alone doesn't force users to choose an appropriate one.",
    "Required labels → mandatory labeling policy.",
    options=["Certification", "A mandatory labeling policy", "Row-level security", "Workspace roles"], case="CS2", difficulty=1)

add("Visualize and analyze", "single",
    "Which visual best meets the analysts' no-show requirement?",
    "D",
    "Key influencers ranks the factors (booking channel, lead time, age band and so on) associated with NoShow being Yes, and Top segments finds combinations of them. A decomposition tree breaks totals down rather than ranking drivers.",
    "What drives an outcome → Key influencers.",
    options=["Decomposition tree", "Waterfall chart", "Gauge", "Key influencers, analysing NoShow"], case="CS2", difficulty=1)

add("Visualize and analyze", "single",
    "How should you meet the operations managers' requirement?",
    "A",
    "Turn on anomaly detection for a line chart of daily appointments (from the Analytics pane), optionally with Explain by fields such as Clinic. Unusual days are flagged against the expected range.",
    "Flag unusual points over time → anomaly detection on a line chart.",
    options=["Anomaly detection on a line chart of daily appointments", "A data alert on a table visual", "A Top N filter", "A forecast"],
    case="CS2", difficulty=1)

add("Visualize and analyze", "yesno",
    "For each statement about the executives' requirement, select Yes if it is true.",
    [True, True, False],
    "A narrative visual with Copilot can write and refresh the summary. Copilot needs the tenant setting enabled and a workspace on supported paid capacity, which Contoso's Fabric capacity can provide. Copilot answers respect each user's permissions, so OLS still hides patient columns from analysts.",
    "Copilot: tenant setting + capacity; respects security.",
    statements=["A narrative visual with Copilot can provide the summary.", "Copilot requires an admin tenant setting and a workspace on supported paid capacity.",
                "Copilot lets analysts see PatientName in its answers, because it bypasses object-level security."], case="CS2")

# =====================================================================
# Case 3: Litware Logistics
# =====================================================================
B.case("CS3", "Litware Logistics", [
    ("Overview", [
        "Litware Logistics delivers parcels for retailers across three countries. Its operations team wants to monitor on-time delivery."]),
    ("Data", [
        "Shipments: one row per shipment with ShipmentID, CustomerKey, OrderDate, ShipDate, PromisedDate, DeliveredDate and Weight.",
        "A Date table is marked as a date table. Shipments currently has an active relationship from OrderDate to Date.",
        "A shipment is late when DeliveredDate is after PromisedDate."]),
    ("Requirements", [
        "Report on-time delivery % by delivery month, and shipment counts by order month on the same page.",
        "Users must be able to right-click a customer and open a page listing that customer's shipments.",
        "The operations manager must be notified when on-time delivery for the current month drops below 92%.",
        "Each depot must receive a printable delivery manifest of 20 to 200 pages every morning as PDF.",
        "Reports move from Development to Test to Production. Each stage must use its own database."]),
    ("Exhibit", ["A sample of the Shipments table."],
     (pq([("ShipmentID", "int"), ("OrderDate", "date"), ("PromisedDate", "date"), ("DeliveredDate", "date")],
         [["90011", "01/10/2026", "03/10/2026", "03/10/2026"], ["90012", "01/10/2026", "03/10/2026", "05/10/2026"],
          ["90013", "02/10/2026", "04/10/2026", "null"]], "Sample rows from the Shipments table", col_w=[140, 150, 160, 160]),
      "Sample shipments: 90011 delivered on its promised date, 90012 delivered two days late, 90013 not yet delivered (DeliveredDate null).")),
])

add("Model the data", "single",
    "How should you support on-time % by delivery month alongside counts by order month?",
    "B",
    "Add an inactive relationship from DeliveredDate to Date and write the on-time measure with USERELATIONSHIP, keeping OrderDate as the active relationship for shipment counts. (A separate Delivery Date table would also work, but the measure-level approach meets this requirement with less change.)",
    "Second date role in specific measures → inactive relationship + USERELATIONSHIP.",
    options=["Make both relationships active", "Add an inactive DeliveredDate relationship and use USERELATIONSHIP in the on-time measure",
             "Merge DeliveredDate into the Date table", "Use Auto date/time"], case="CS3")

add("Model the data", "single",
    "Which measure returns the on-time %, counting only delivered shipments?",
    "C",
    "Count delivered shipments whose DeliveredDate is on or before PromisedDate, divide by all delivered shipments, and use DIVIDE for safety. Undelivered shipments (null DeliveredDate, like 90013) must be excluded from both counts.",
    "Ratio of qualifying rows → DIVIDE of two filtered counts.",
    options=["`DIVIDE ( COUNTROWS ( Shipments ), [Late] )`", "`COUNTROWS ( FILTER ( Shipments, Shipments[DeliveredDate] <= Shipments[PromisedDate] ) )`",
             "`DIVIDE ( COUNTROWS ( FILTER ( Shipments, NOT ISBLANK ( Shipments[DeliveredDate] ) && Shipments[DeliveredDate] <= Shipments[PromisedDate] ) ), COUNTROWS ( FILTER ( Shipments, NOT ISBLANK ( Shipments[DeliveredDate] ) ) ) )`",
             "`AVERAGE ( Shipments[DeliveredDate] )`"], case="CS3", difficulty=3)

add("Visualize and analyze", "single",
    "How should you meet the right-click requirement?",
    "A",
    "Create a Customer Shipments page with Customer in its Drill through well. Users then right-click a customer in any visual and choose Drill through. Tooltips appear on hover, not on right-click.",
    "Right-click to a detail page → drillthrough.",
    options=["A drillthrough page with Customer in the Drill through well", "A report page tooltip", "A bookmark per customer", "A page navigator"],
    case="CS3", difficulty=1)

add("Manage and secure", "single",
    "How should you meet the notification requirement?",
    "D",
    "Pin a card (or KPI or gauge) showing current-month on-time % to a dashboard and set a data alert below 92%. Data alerts work only on dashboard tiles of those types.",
    "Threshold notification → data alert on a card, KPI or gauge dashboard tile.",
    options=["A subscription to the report", "A bookmark", "Conditional formatting on the report", "A data alert on a dashboard card tile"], case="CS3", difficulty=1)

add("Manage and secure", "single",
    "What should you create for the depot manifests?",
    "B",
    "A paginated report (built in Power BI Report Builder) with a subscription that attaches a PDF each morning. It handles long, printable documents with repeated headers; standard report subscriptions export pages, not 200-page documents.",
    "Long printable documents on a schedule → paginated report + subscription.",
    options=["A Power BI report subscription", "A paginated report with a scheduled subscription", "A dashboard", "Publish to web"], case="CS3", difficulty=1)

add("Manage and secure", "single",
    "How should you meet the deployment requirement?",
    "C",
    "A deployment pipeline with Development, Test and Production stages, using deployment rules (data source or parameter rules) so each stage connects to its own database. The workspaces must be on Premium, PPU or Fabric capacity.",
    "Dev/Test/Prod with different databases → deployment pipeline + rules.",
    options=["Three copies of the .pbix edited by hand", "Git integration only", "A deployment pipeline with deployment rules", "Sensitivity labels"],
    case="CS3", difficulty=1)

# =====================================================================
# Case 4: Wide World Importers (finance)
# =====================================================================
B.case("CS4", "Wide World Importers", [
    ("Overview", [
        "Wide World Importers sells goods in several currencies. Finance reports in US dollars. The financial year runs from 1 July to 30 June."]),
    ("Data", [
        "Transactions: one row per invoice line, with InvoiceDate, Currency and LocalAmount.",
        "Rates: one row per currency per day, with Currency, Date and RateToUSD.",
        "Budget: one row per department per month, in US dollars.",
        "A Date table marked as a date table includes FiscalYear and FiscalQuarter columns."]),
    ("Requirements", [
        "Show fiscal year-to-date sales in US dollars.",
        "Each transaction must be converted using the rate for its own currency and date.",
        "Compare actual sales with budget by department and month.",
        "Each department head receives a monthly email of the report filtered to their department, from a single subscription.",
        "Finance analysts must build their own PivotTables in Excel on the semantic model, and must not be able to edit workspace content.",
        "Users must be able to tell that the finance semantic model is the official, reviewed source."]),
])

add("Model the data", "single",
    "Which calculation converts transactions to US dollars as required?",
    "A",
    "Each line needs its own rate, so convert row by row. A calculated column (or Power Query merge) fetches the rate for the line's currency and date, for example with LOOKUPVALUE, and SUMX of LocalAmount × rate gives the USD total. Multiplying totals by an average rate is wrong whenever rates or currencies vary.",
    "Per-row conversion → bring the matching rate to each row, then SUMX.",
    options=["Bring each line's rate (matching currency and date) onto the row, then `SUMX ( Transactions, Transactions[LocalAmount] * Transactions[Rate] )`",
             "`SUM ( Transactions[LocalAmount] ) * AVERAGE ( Rates[RateToUSD] )`", "`SUM ( Transactions[LocalAmount] )`",
             "`SUMX ( Rates, Rates[RateToUSD] )`"], case="CS4", difficulty=3)

add("Model the data", "single",
    "[Sales USD] exists. Which measure returns fiscal year-to-date sales in US dollars?",
    "C",
    "TOTALYTD's year-end argument sets the fiscal year end, \"6/30\", so the total restarts on 1 July.",
    "Fiscal YTD → TOTALYTD with the year-end date.",
    options=["`TOTALYTD ( [Sales USD], 'Date'[Date] )`", "`TOTALQTD ( [Sales USD], 'Date'[Date] )`", "`TOTALYTD ( [Sales USD], 'Date'[Date], \"6/30\" )`",
             "`CALCULATE ( [Sales USD], 'Date'[FiscalYear] )`"], case="CS4", difficulty=1)

add("Model the data", "single",
    "How should Budget be related to the model so budget can be compared with actual sales by department and month?",
    "B",
    "Budget is at department-and-month grain. Relate it to the Department dimension and to Date at month level (for example a first-of-month date related to Date[Date]), and keep budget comparisons at month level or above in visuals.",
    "Monthly budget → relate at month level and avoid day-level visuals.",
    options=["Merge Budget into Transactions", "Relate Budget to Department and to Date at month level", "Relate Budget directly to Transactions",
             "Leave Budget unrelated and use slicers"], case="CS4")

add("Manage and secure", "single",
    "How should you meet the department heads' email requirement?",
    "D",
    "A dynamic per-recipient subscription reads each recipient's email and their department filter from a table, sending each head a filtered version from one subscription.",
    "One subscription, filtered per person → dynamic per-recipient subscription.",
    options=["One subscription per department head", "A data alert", "Publish to web", "A dynamic per-recipient subscription"], case="CS4")

add("Manage and secure", "single",
    "How should you give finance analysts access to build PivotTables in Excel?",
    "A",
    "Build permission on the semantic model (without an editing workspace role) lets them use Analyze in Excel. Contributor or Member would let them edit workspace content.",
    "Excel PivotTables without edit rights → Build permission.",
    options=["Grant Build permission on the semantic model", "Add them as workspace Contributors", "Share the .pbix file", "Export the data to CSV each month"],
    case="CS4", difficulty=1)

add("Manage and secure", "single",
    "How should you mark the finance semantic model as the official, reviewed source?",
    "C",
    "Certification, by a reviewer authorised in tenant settings, marks the model as meeting organisational standards. Promotion only shows that the owner thinks it's ready.",
    "Official and reviewed → certified.",
    options=["Promote it", "Add a sensitivity label", "Have an authorised reviewer certify it", "Pin it to a dashboard"], case="CS4", difficulty=1)

B.save()
