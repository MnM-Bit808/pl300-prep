import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from charts import key_influencers, decomp_tree, anomaly_chart, side_pane
from svgkit import matrix
from bankkit import Batch

B = Batch(8, "visualize_interactivity-ai", "Enhance reports for usability and analysis: interactivity, AI visuals and Copilot", "visualize", {"visualize": 46})
add = B.add
UX = "Enhance reports for usability"
AI = "Identify patterns and trends"
CP = "Copilot in Power BI"

# ================= Bookmarks and selection =================
add("Bookmarks", "single",
    "The exhibit shows the Selection pane. You need one button that shows the chart and hides the table, and another that does the reverse.\n\nWhat should you create?",
    "B",
    "Create two bookmarks: one captured with the chart visible and the table hidden (eye icons in the Selection pane), the other the reverse. Assign each to a button's Bookmark action. Turn off the Data property if users' slicer choices should be kept.",
    "Show/hide visuals with buttons → Selection pane + bookmarks.",
    options=["Two report pages", "Two bookmarks capturing different visibility, each assigned to a button", "A drillthrough page", "A field parameter"],
    image=(side_pane("Selection", [("Layer order", "heading", None), ("Sales chart", "item", "visible"), ("Sales table", "item", "hidden"),
                                   ("Show chart button", "item", "visible"), ("Show table button", "item", "visible")],
                     "Selection pane"),
           "Selection pane listing Sales chart (visible), Sales table (hidden), Show chart button and Show table button."), topic=UX, difficulty=1)

add("Bookmarks", "dropdown",
    "Select the bookmark property that controls each behaviour.",
    {"parts": [0, 1, 2]},
    "Data captures filters, slicers and sort order. Display captures visibility and spotlight/focus mode. Current page decides whether applying the bookmark also navigates to the page it was captured on.",
    "Data = filters. Display = visibility. Current page = navigation.",
    parts=[{"label": "Reapplies slicer and filter selections", "options": ["Data", "Display", "Current page"]},
           {"label": "Reapplies which visuals are shown or hidden", "options": ["Data", "Display", "Current page"]},
           {"label": "Takes the user to the page the bookmark was created on", "options": ["Data", "Display", "Current page"]}],
    topic=UX)

add("Bookmarks", "single",
    "A bookmark should affect only the three visuals in a chart group, leaving other visuals on the page as they are.\n\nWhat should you do when updating the bookmark?",
    "C",
    "Select the three visuals, then set the bookmark to apply to Selected visuals (instead of All visuals). Only those visuals' state is captured and reapplied.",
    "Limit a bookmark's effect → Selected visuals.",
    options=["Turn off Current page", "Turn off Display", "Select the visuals and set the bookmark to apply to Selected visuals", "Group all bookmarks"],
    topic=UX)

add("Bookmarks", "single",
    "Report readers in the Power BI service want to save their own filter combinations and return to them later, without the report author creating bookmarks.\n\nWhat should they use?",
    "A",
    "Personal bookmarks let each reader capture their own view (filters, slicers, visual state) in the service and choose one as their default. Report bookmarks are created by the author and shared with everyone.",
    "Readers' own saved views → personal bookmarks.",
    options=["Personal bookmarks", "Report bookmarks", "Subscriptions", "Sync slicers"], topic=UX, difficulty=1)

add("Bookmarks", "single",
    "You've grouped five bookmarks named after regions. You want a set of buttons, one per bookmark, that updates automatically when bookmarks in the group change.\n\nWhat should you insert?",
    "D",
    "A bookmark navigator (Insert > Buttons > Navigator > Bookmark navigator) creates one button per bookmark in the selected group and updates when the group changes. Building buttons one by one needs manual upkeep.",
    "Buttons for a bookmark group → bookmark navigator.",
    options=["Five blank buttons", "A page navigator", "A slicer", "A bookmark navigator for the group"], topic=UX)

add("Navigation", "single",
    "Report pages are added and renamed often. You want navigation buttons for every page that stay up to date without editing.\n\nWhat should you insert?",
    "B",
    "A page navigator creates a button for each page (optionally excluding hidden pages) and updates as pages are added, removed or renamed.",
    "Automatic page buttons → page navigator.",
    options=["One button per page with a Page navigation action", "A page navigator", "A bookmark per page", "A drillthrough button"], topic=UX, difficulty=1)

add("Navigation", "single",
    "In Power BI Desktop, clicking a button doesn't trigger its action while you're editing.\n\nHow do you test the action?",
    "C",
    "In Desktop editing mode, Ctrl+click a button to run its action (a plain click selects it for editing). In the service, a normal click works.",
    "Test buttons in Desktop → Ctrl+click.",
    options=["Publish first; buttons only work in the service", "Double-click the button", "Ctrl+click the button", "Turn on drill mode"], topic=UX, difficulty=1)

# ================= Drillthrough and tooltips =================
add("Drillthrough", "order",
    "You need users to right-click a product in any visual and open a Product Details page filtered to that product.\n\nSelect the actions you should perform and arrange them in order.",
    ["A", "B", "C"],
    "Create the target page, add Product to its Drill through well (which also adds a back button), and build the detail visuals. Users then right-click a product anywhere and choose Drill through > Product Details. Bookmarks and tooltips aren't needed.",
    "Drillthrough: target page + field in the Drill through well.",
    items=["Create a page named Product Details", "Add the Product field to that page's Drill through well", "Add the detail visuals to the page",
           "Create a bookmark for each product", "Set the page as a tooltip"], topic=UX, difficulty=1)

add("Drillthrough", "single",
    "A Customer Details report is separate from the Sales report, but both use the same semantic model. Users must right-click a customer in the Sales report and open the details report filtered to that customer.\n\nWhat should you enable?",
    "A",
    "Cross-report drillthrough: turn on Allow visuals in this report to use drillthrough targets from other reports in the source report, and set the target page's drillthrough to cross-report. Both reports must use the same semantic model (in the same workspace or app).",
    "Drill into another report → cross-report drillthrough.",
    options=["Cross-report drillthrough", "Sync slicers", "A report page tooltip", "Personal bookmarks"], topic=UX)

add("Drillthrough", "single",
    "Users drill through from a page that has Year and Region slicers set. The target page must respect both selections, not only the drilled-on product.\n\nWhich setting on the target page controls this?",
    "C",
    "Keep all filters (on by default) passes every filter from the source visual and page into the drillthrough page. With it off, only the drillthrough field's value is passed.",
    "Pass all source filters → Keep all filters.",
    options=["Allow use as tooltip", "Cross-report", "Keep all filters", "Show items with no data"], topic=UX)

add("Tooltips", "single",
    "You want a mini chart of a product's monthly sales to appear when users hover over that product in any visual.\n\nWhat should you build?",
    "B",
    "A report page tooltip: a page set to Allow use as tooltip (usually with the Tooltip canvas size) containing the mini chart, with Product as its tooltip field. Visuals using Product then show it on hover.",
    "Rich hover content → report page tooltip.",
    options=["A drillthrough page", "A report page tooltip", "A bookmark", "A sparkline"], topic=UX, difficulty=1)

# ================= Interactions =================
add("Interactions", "single",
    "When a user selects a month in a column chart, a card showing year-to-date sales must not change.\n\nWhat should you do?",
    "D",
    "Select the column chart, open Format > Edit interactions, and set the card's interaction to None. Other visuals can keep filter or highlight.",
    "Stop one visual reacting to another → Edit interactions: None.",
    options=["Add a visual-level filter to the card", "Lock the card", "Use a bookmark", "Set the chart's interaction with the card to None"], topic=UX, difficulty=1)

add("Interactions", "single",
    "Users want to Ctrl+click to select several columns in a chart and have other visuals filter to all of them.\n\nWhat does Power BI do by default?",
    "A",
    "Ctrl+click (or Shift+click in some visuals) adds data points to the selection, and other visuals cross-filter or cross-highlight to the combined selection. No configuration is needed.",
    "Ctrl+click = multi-select for cross-filtering.",
    options=["Multi-selection works by default, and other visuals respond to all selected points", "Only the last click counts",
             "Multi-selection needs a bookmark", "Multi-selection works only in slicers"], topic=UX, difficulty=1)

# ================= AI visuals and analysis =================
add("Key influencers", "single",
    "The exhibit shows a Key influencers visual analysing what makes a customer churn.\n\nWhat does the top influencer mean?",
    "B",
    "Customers with a month-to-month contract are 2.4 times more likely to churn than customers without that contract type. The right panel compares the churn rate for that group with everyone else.",
    "Key influencers: 'When X, the likelihood increases by N times'.",
    options=["2.4% of customers have month-to-month contracts", "Customers on month-to-month contracts are 2.4 times more likely to churn",
             "Month-to-month contracts cause 2.4 extra churned customers", "Contract type explains 2.4% of churn"],
    image=(key_influencers("What influences Churn to be Yes", [("Contract is Month-to-month", "2.4x", 2.4), ("Tenure is less than 6 months", "1.9x", 1.9),
                                                                ("Support tickets is more than 3", "1.6x", 1.6)],
                           "Key influencers visual for customer churn"),
           "Key influencers visual: when Contract is Month-to-month, the likelihood of Churn being Yes increases 2.4 times; tenure under 6 months 1.9 times; more than 3 support tickets 1.6 times."),
    topic=AI, difficulty=1)

add("Key influencers", "single",
    "Instead of individual factors, you want Key influencers to find groups of customers with a combination of attributes that have a high churn rate.\n\nWhich tab should you use?",
    "C",
    "The Top segments tab finds clusters of records defined by several attributes together (for example month-to-month contract and tenure under six months) where the outcome is much more common.",
    "Combinations of factors → Top segments.",
    options=["Key influencers", "Analyze", "Top segments", "Explain by"], topic=AI)

add("Decomposition tree", "single",
    "The exhibit shows a decomposition tree. Its last level was added using an AI split.\n\nWhich AI split was used, and what does it do?",
    "A",
    "The High value split picks, at that step, the field and value with the highest result, here the Online channel within the West region. Low value would pick the lowest.",
    "Decomposition tree AI split: High value / Low value picks the next field for you.",
    options=["High value: it chose the field with the highest value at that level", "Low value: it chose the smallest contributor",
             "Key influencers: it chose the strongest correlation", "Top segments: it grouped similar customers"],
    image=(decomp_tree("Sales breakdown", [("Sales", [("Total", 1240, True)], None),
                                           ("Region", [("West", 520, True), ("East", 410, False), ("North", 310, False)], None),
                                           ("Channel", [("Online", 330, True), ("Store", 190, False)], "High value"),
                                           ("Product", [("Trail Shoe", 160, True), ("Daypack", 95, False), ("Gaiters", 75, False)], None)],
                       "Decomposition tree with an AI split", h=300),
           "Decomposition tree: total sales 1,240 split by Region (West 520 highlighted), then Channel marked High value (Online 330 highlighted), then Product (Trail Shoe 160)."),
    topic=AI)

add("Decomposition tree", "single",
    "In a decomposition tree, you want AI splits to look for the biggest value relative to the other options at that level, rather than the absolute largest.\n\nWhat should you change?",
    "B",
    "The analysis type can be Absolute (pick the highest value) or Relative (pick the value that stands out most compared with its siblings). Relative helps find unusually strong small segments.",
    "AI split analysis type: Absolute vs Relative.",
    options=["Lock the level", "Set the AI split analysis type to Relative", "Turn on drill mode", "Use the Low value split"], topic=AI, difficulty=3)

add("Anomaly detection", "single",
    "The exhibit shows a line chart with anomaly detection turned on.\n\nWhat do the circled points and the shaded band represent?",
    "C",
    "The band is the expected range calculated from the series; circled points fall outside it, so they're flagged as anomalies. Selecting one shows possible explanations based on the Explain by fields.",
    "Anomaly detection: band = expected range, circles = anomalies.",
    options=["Forecast values and their confidence interval", "Values below the average line", "Anomalies outside the expected range shown by the band",
             "Data points removed by filters"],
    image=(anomaly_chart("Daily orders", ["1", "", "", "", "5", "", "", "", "", "10", "", "", "", "", "15", "", "", "", "", "20"],
                         [120, 125, 118, 130, 128, 126, 210, 131, 127, 133, 129, 135, 132, 60, 134, 138, 136, 140, 137, 141],
                         [6, 13], ([105 + i for i in range(20)], [145 + i for i in range(20)]), "Line chart with anomalies marked"),
           "Line chart of daily orders inside a shaded expected range. Day 7 (210 orders) and day 14 (60 orders) are circled outside the band."),
    topic=AI, difficulty=1)

add("Anomaly detection", "single",
    "Anomaly detection flags too many points as unusual.\n\nWhat should you change?",
    "A",
    "Lower the sensitivity in the anomaly settings. Higher sensitivity flags smaller deviations; lower sensitivity widens the expected range so only bigger deviations count.",
    "Too many anomalies → lower the sensitivity.",
    options=["Lower the sensitivity", "Raise the sensitivity", "Add more Explain by fields", "Switch to a column chart"], topic=AI)

add("Anomaly detection", "single",
    "When users select an anomaly, you want Power BI to suggest which categories, such as Region or Channel, might explain it.\n\nWhat should you configure?",
    "D",
    "Add fields to Explain by in the anomaly detection settings. Power BI then ranks possible explanations, showing which values of those fields changed most at that point.",
    "Explanations for anomalies → Explain by fields.",
    options=["Tooltips", "A drillthrough page", "Key influencers", "Explain by fields in the anomaly detection settings"], topic=AI)

add("Analyze feature", "single",
    "Users see a sharp rise in one month on a column chart and want Power BI to find which categories contributed most, without building a new visual.\n\nWhat can they use?",
    "B",
    "Right-click the data point and choose Analyze > Explain the increase. Power BI looks across the model's fields for the biggest contributors and shows the results as visuals.",
    "Why did this point rise? → Analyze > Explain the increase.",
    options=["Export data", "Analyze > Explain the increase", "Show as a table", "Drill through"], topic=AI)

add("AI visuals", "dropdown",
    "Select the visual that best answers each question.",
    {"parts": [0, 1, 2]},
    "Key influencers ranks factors that drive an outcome. The decomposition tree breaks a total down step by step, letting users choose (or AI choose) the next level. A line chart with anomaly detection flags unusual points over time.",
    "Drivers → Key influencers. Breakdown → decomposition tree. Unusual points over time → anomaly detection.",
    parts=[{"label": "Which factors make an order more likely to be returned?", "options": ["Key influencers", "Decomposition tree", "Line chart with anomaly detection"]},
           {"label": "Where does this quarter's revenue come from, by region, channel and product?", "options": ["Key influencers", "Decomposition tree", "Line chart with anomaly detection"]},
           {"label": "Which days had unusually low website traffic?", "options": ["Key influencers", "Decomposition tree", "Line chart with anomaly detection"]}],
    topic=AI, difficulty=1)

add("Q&A", "single",
    "Users type 'revenue by territory' in Q&A, but the model's measure is Sales Amount and the column is Region.\n\nWhat should you add so Q&A understands them?",
    "C",
    "Synonyms tell Q&A (and Copilot) that revenue means Sales Amount and territory means Region. Add them in Q&A setup or in the field's properties in Model view.",
    "Users' words differ from field names → synonyms.",
    options=["Display folders", "Descriptions only", "Synonyms for Sales Amount and Region", "A field parameter"], topic=AI)

# ================= Copilot =================
add("Copilot", "single",
    "An executive page needs an AI-written summary of its visuals that updates when slicers change.\n\nWhat should you add?",
    "B",
    "The narrative visual with Copilot generates a text summary of the page's visuals (or chosen visuals) and refreshes it as filters change. You can guide it with a custom prompt.",
    "AI summary on a page → narrative visual with Copilot.",
    options=["A text box", "A narrative visual with Copilot", "A Q&A visual", "A card visual"], topic=CP, difficulty=1)

add("Copilot", "single",
    "The exhibit shows the Copilot pane in Power BI Desktop.\n\nWhat will Copilot do in response to this prompt?",
    "A",
    "Asked to create a page, Copilot builds a new report page with visuals based on the semantic model and the prompt. You can then edit the page like any other.",
    "Copilot can create report pages from a prompt.",
    options=["Create a new report page with visuals about regional sales performance", "Change the semantic model's relationships",
             "Publish the report", "Refresh the data"],
    image=(side_pane("Copilot", [("Create a page that shows regional sales performance", "prompt", None),
                                 ("", "reply", ["Here's a page with sales by region, a", "trend by month and the top products."]),
                                 ("Keep it", "button", None), ("Undo", "button", None)], "Copilot pane", w=480),
           "Copilot pane: the user asks to create a page that shows regional sales performance; Copilot replies that it has created a page with sales by region, a monthly trend and top products, with Keep it and Undo buttons."),
    topic=CP, difficulty=1)

add("Copilot", "single",
    "The Copilot pane is greyed out for a report in Power BI Desktop.\n\nWhich two conditions must be met for Copilot to be available? Choose the option that lists both.",
    "D",
    "Copilot needs the admin tenant setting that allows Copilot (Azure OpenAI features) and a workspace on a supported paid capacity, such as Fabric F2 or higher, or Premium P1 or higher. In Desktop you sign in and choose such a workspace. Pro licences on shared capacity don't provide Copilot.",
    "Copilot = tenant setting on + supported paid capacity workspace.",
    options=["A Pro licence and DirectQuery mode", "Auto date/time and a marked date table", "A certified semantic model and an app",
             "The Copilot tenant setting turned on, and a workspace on a supported paid capacity"], topic=CP)

add("Copilot", "single",
    "Your organisation's capacity is in a region where Azure OpenAI isn't available, and Copilot doesn't work.\n\nWhat can an admin enable?",
    "C",
    "A tenant setting allows data sent to Azure OpenAI to be processed outside your capacity's geographic region. Turning it on lets Copilot work, subject to your organisation's data-residency rules.",
    "Azure OpenAI not in region → allow processing outside the geographic region.",
    options=["A gateway in personal mode", "Publish to web", "The setting that allows data to be processed outside your capacity's geographic region",
             "Large semantic model storage format"], topic=CP, difficulty=3)

add("Copilot", "single",
    "Copilot gives vague answers about a model with columns such as Amt, Cust_Nm and Dt_1.\n\nWhat should you do first?",
    "B",
    "Copilot works from the model's metadata. Clear field names, descriptions and synonyms (with a clean star schema and hidden technical columns) are the main ways to prepare a model for better answers.",
    "Better Copilot answers → clear names, descriptions, synonyms.",
    options=["Turn on Auto date/time", "Rename fields clearly and add descriptions and synonyms", "Convert to DirectQuery", "Add more report pages"],
    topic=CP, difficulty=1)

add("Copilot", "single",
    "You want Copilot to ignore technical helper tables and columns, and to follow business rules such as 'fiscal year starts in July' when answering.\n\nWhich feature should you use?",
    "A",
    "Prep data for AI lets model authors simplify the schema Copilot sees (AI data schema), add AI instructions with business context, and provide verified answers for common questions.",
    "Steer Copilot on a model → Prep data for AI (schema, instructions, verified answers).",
    options=["Prep data for AI", "Row-level security", "Display folders", "Bookmarks"], topic=CP, difficulty=3)

add("Copilot", "yesno",
    "For each statement about Copilot in Power BI, select Yes if it is true.",
    [True, True, False],
    "Copilot works with the user's own permissions, so RLS and access rules still apply to its answers. It can write and explain DAX queries in DAX query view. It doesn't change the semantic model's data; review what it produces before relying on it.",
    "Copilot respects permissions; helps with DAX; doesn't change source data.",
    statements=["Copilot respects row-level security for the user asking the question.", "Copilot can help write DAX queries in DAX query view.",
                "Copilot edits the source data to correct values it thinks are wrong."], topic=CP)

add("Copilot", "single",
    "A report reader in the service wants a quick written summary of the report page they're viewing.\n\nWhat can they do?",
    "D",
    "In the Copilot pane in the service, readers can ask Copilot to summarise the current page (or report). It doesn't change the report.",
    "Readers can ask Copilot for summaries of pages.",
    options=["Export the page to PDF", "Create a subscription", "Add a narrative visual themselves", "Ask Copilot in the service to summarise the page"],
    topic=CP, difficulty=1)

add("Copilot", "single",
    "You want Copilot answers to a common question, such as 'What were total sales last quarter?', to always use a specific visual you've approved.\n\nWhat should you set up?",
    "B",
    "Verified answers (part of Prep data for AI) link a visual to trigger phrases, so Copilot returns that approved visual when users ask matching questions.",
    "Approved responses to common questions → verified answers.",
    options=["A bookmark", "A verified answer", "A data alert", "A featured table"], topic=CP, difficulty=3)

# ================= Report usability =================
add("Report usability", "single",
    "Report readers keep asking how to use a page's slicers and buttons.\n\nWhat is a simple built-in way to guide them on the page?",
    "C",
    "A text box or an information button with a tooltip (or a bookmark that shows a help overlay) explains the page in place. Many reports add an 'i' button that toggles a help layer with bookmarks.",
    "In-report guidance → text, info buttons, help overlays.",
    options=["Hide the slicers", "Publish to web", "Add an info button or help overlay that explains the page", "Turn on drill mode"], topic=UX, difficulty=1)

add("Report usability", "single",
    "A report has detail pages that should only be reached through drillthrough, not from the page tabs.\n\nWhat should you do?",
    "A",
    "Hide those pages. Hidden pages don't appear as tabs in reading view, but drillthrough, buttons and bookmarks can still reach them.",
    "Pages for drillthrough or tooltips only → hide them.",
    options=["Hide the pages", "Delete the pages and recreate them as reports", "Lock the pages", "Move them to a dashboard"], topic=UX, difficulty=1)

add("Report usability", "single",
    "The matrix in the exhibit shows sales by category and product. Users want to see the products only for the category they're interested in, without expanding every category.\n\nWhat should they do?",
    "B",
    "Turn on drill mode and select one category to drill down into its products, or use the +/- icons to expand one category. Expand all down one level would show every category's products.",
    "One branch only → drill down or expand that single item.",
    options=["Expand all down one level", "Drill down into the selected category", "Switch values to rows", "Turn off stepped layout"],
    image=(matrix("Sales by Category", ["Category", "Sales"],
                  [("⊞ Apparel", ["412,380"], 0, False), ("⊞ Bags", ["168,940"], 0, False), ("⊞ Footwear", ["538,210"], 0, False), ("Total", ["1,119,530"], 0, True)],
                  "Matrix collapsed to categories", w=480, col_w=[220, 180]),
           "Matrix showing collapsed categories Apparel, Bags and Footwear with plus icons, and a total."),
    topic=UX, difficulty=1)

add("Report usability", "single",
    "You want readers to be able to switch a chart between showing sales by Region, by Channel or by Product, using a slicer.\n\nWhat should you create?",
    "C",
    "A field parameter with Region, Channel and Product lets a slicer swap the field on the chart's axis. Bookmarks would need three copies of the chart.",
    "Let readers swap a visual's field → field parameter.",
    options=["Three bookmarks", "A drillthrough page", "A field parameter", "A calculation group"], topic=UX, difficulty=1)

B.save()
