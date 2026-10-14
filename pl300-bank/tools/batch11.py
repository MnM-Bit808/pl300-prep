import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from charts import column, scatter, waterfall, gauge
from svgkit import matrix
from bankkit import Batch

B = Batch(11, "visualize_top-up", "Visualize and analyze: mixed-format practice", "visualize", {"visualize": 82})
add = B.add
CR = "Create reports"
UX = "Enhance reports for usability"
AN = "Identify patterns and trends"

# ---------------- Reading exhibits ----------------
add("Read a chart", "yesno",
    "The exhibit shows quarterly sales with a constant line at the 500K target.\n\nFor each statement, select Yes if it is true.",
    [True, False, True],
    "Q2 (530K) and Q4 (610K) are above the 500K line; Q1 (420K) and Q3 (480K) are below. Q4 is the highest quarter.",
    "Read reference lines against each bar's value.",
    statements=["Two quarters are above target.", "Q3 is above target.", "Q4 has the highest sales."],
    image=(column("Sales by Quarter", ["Q1", "Q2", "Q3", "Q4"], [("Sales", [420000, 530000, 480000, 610000])], "Column chart with a target line",
                  ref_lines=[("Target 500K", 500000, True)], labels=True, w=640),
           "Column chart: Q1 420K, Q2 530K, Q3 480K, Q4 610K, with a dashed target line at 500K."), topic=CR, difficulty=1)

add("Read a chart", "yesno",
    "The exhibit shows a gauge for monthly support tickets resolved.\n\nFor each statement, select Yes if it is true.",
    [False, True, True],
    "The value (8,400) hasn't reached the 9,000 target marker. The gauge's maximum is 12,000. The filled arc shows the current value against the range.",
    "Gauge: arc = value, marker = target, ends = min and max.",
    statements=["The target has been met.", "The maximum value on the gauge is 12,000.", "The filled arc represents the current value."],
    image=(gauge("Tickets resolved this month", 8400, 0, 12000, 9000, "Gauge for tickets resolved", fmt=lambda v: f"{v:,.0f}"),
           "Gauge from 0 to 12,000 with the arc filled to 8,400 and a target marker at 9,000."), topic=CR, difficulty=1)

add("Read a chart", "dropdown",
    "The exhibit shows each region's share of sales per year.\n\nSelect the answer that completes each statement.",
    {"parts": [1, 0]},
    "In a 100% stacked chart, each segment's height is its share of that year. North has the largest share in 2026 (about 49%). West's share rises every year (22% → 25% → 28% → 32%).",
    "100% stacked: compare segment heights as shares.",
    parts=[{"label": "The region with the largest share in 2026 is", "options": ["West", "North", "South"]},
           {"label": "The region whose share grows every year is", "options": ["West", "North", "South"]}],
    image=(column("Share of Sales by Region", ["2023", "2024", "2025", "2026"],
                  [("North", [44, 47, 49, 49]), ("South", [34, 28, 23, 19]), ("West", [22, 25, 28, 32])],
                  "100% stacked column chart of sales share by region", pct=True, legend_title="Region"),
           "100% stacked columns for 2023 to 2026. North's share is 44%, 47%, 49%, 49%; South's 34%, 28%, 23%, 19%; West's 22%, 25%, 28%, 32%."), topic=CR)

add("Read a chart", "yesno",
    "The exhibit plots products by units sold and average discount.\n\nFor each statement, select Yes if it is true.",
    [True, False, True],
    "Gaiters sells the most units at the lowest discount, so it doesn't need discounting to sell. Daypack has the highest discount but low units. Most products cluster between 10% and 20% discount.",
    "Scatter: read each point on both axes.",
    statements=["Gaiters sells the most units with the smallest discount.", "Daypack sells the most units.",
                "Most products have an average discount between 10% and 20%."],
    image=(scatter("Units vs Average Discount by Product", [("Trail Shoe", 420, 14), ("Rain Jacket", 380, 17), ("Sandal", 300, 12), ("Fleece", 350, 19),
                                                           ("Daypack", 140, 34), ("Gaiters", 690, 6)],
                   "Scatter chart of units against discount", "Units sold", "Average discount %", yfmt=lambda v: f"{v:g}%", xfmt=lambda v: f"{v:g}"),
           "Scatter chart: Gaiters at 690 units and 6% discount; Daypack at 140 units and 34%; Trail Shoe, Rain Jacket, Sandal and Fleece between 300 and 420 units at 12 to 19%."),
    topic=AN)

add("Read a chart", "dropdown",
    "The exhibit shows a waterfall of cash from the start to the end of the quarter.\n\nSelect the answer that completes each statement.",
    {"parts": [0, 2]},
    "Collections (+180K) is the largest increase. The ending balance is 300 + 180 − 120 − 40 + 25 = 345K.",
    "Waterfall: start + every step = end.",
    parts=[{"label": "The largest increase came from", "options": ["Collections", "Interest", "Payroll"]},
           {"label": "The ending cash balance is", "options": ["300K", "325K", "345K"]}],
    image=(waterfall("Cash flow this quarter", 300000, [("Collections", 180000), ("Payroll", -120000), ("Suppliers", -40000), ("Interest", 25000)],
                     "Waterfall of cash movements", start_label="Opening", end_label="Closing"),
           "Waterfall from an opening balance of 300K: Collections +180K, Payroll −120K, Suppliers −40K, Interest +25K, then the closing balance."), topic=AN)

add("Read a chart", "yesno",
    "The exhibit shows a matrix with subtotals.\n\nFor each statement, select Yes if it is true.",
    [True, True, False],
    "Footwear's subtotal (750) is the sum of its products. Bags (300) is the smallest category. The grand total is 750 + 300 + 450 = 1,500, not 1,200.",
    "Matrix subtotals and totals add up the rows beneath them (for additive measures).",
    statements=["The Footwear subtotal equals Trail Shoe plus Sandal.", "Bags is the category with the lowest sales.", "The grand total is 1,200."],
    image=(matrix("Sales by Category and Product", ["Category / Product", "Sales"],
                  [("Footwear", ["750"], 0, True), ("Trail Shoe", ["500"], 1, False), ("Sandal", ["250"], 1, False),
                   ("Bags", ["300"], 0, True), ("Daypack", ["300"], 1, False),
                   ("Apparel", ["450"], 0, True), ("Rain Jacket", ["450"], 1, False), ("Total", [None], 0, True)],
                  "Matrix with category subtotals", w=520, col_w=[250, 180]),
           "Matrix: Footwear 750 (Trail Shoe 500, Sandal 250), Bags 300 (Daypack 300), Apparel 450 (Rain Jacket 450), with the grand total cell left empty."),
    topic=CR, difficulty=1)

# ---------------- Drop-down matching ----------------
add("Choose a visual", "dropdown",
    "Select the visual for each requirement.",
    {"parts": [1, 0, 2]},
    "A ribbon chart shows how rankings change between periods. A histogram (a column chart over binned values) shows how values are distributed. A shape map shades custom regions defined by a TopoJSON file, such as sales territories.",
    "Rank changes → ribbon. Distribution → binned column. Custom regions → shape map.",
    parts=[{"label": "How the distribution of order values looks (how many orders fall in each value band)", "options": ["Ribbon chart", "Column chart of binned values", "Shape map"]},
           {"label": "How each product's sales ranking changed month by month", "options": ["Ribbon chart", "Column chart of binned values", "Shape map"]},
           {"label": "Sales shaded by the company's own sales territories, drawn from a TopoJSON file", "options": ["Ribbon chart", "Column chart of binned values", "Shape map"]}],
    topic=CR)

add("Choose a visual", "dropdown",
    "Select the visual for each requirement.",
    {"parts": [2, 0, 1]},
    "A card shows one number. A KPI visual shows a value compared with a target, with a trend. A gauge shows progress within a range towards a target.",
    "One number → card. Value vs target with trend → KPI. Progress in a range → gauge.",
    parts=[{"label": "Total revenue as a single large number", "options": ["KPI", "Gauge", "Card"]},
           {"label": "This month's revenue against target, with the monthly trend behind it", "options": ["KPI", "Gauge", "Card"]},
           {"label": "Revenue so far as progress between 0 and the annual maximum, with a target marker", "options": ["KPI", "Gauge", "Card"]}],
    topic=CR, difficulty=1)

add("Analytics pane", "dropdown",
    "Select the Analytics pane line for each requirement.",
    {"parts": [0, 1, 2, 3]},
    "Average and median lines are calculated from the data in the visual. A constant line can take a fixed value or a measure through fx. A percentile line marks a chosen percentile, such as the 90th.",
    "Analytics lines: average, median, percentile from the data; constant from you or a measure.",
    parts=[{"label": "The mean of the values shown", "options": ["Average line", "Constant line", "Median line", "Percentile line"]},
           {"label": "A target returned by a [Target] measure", "options": ["Average line", "Constant line", "Median line", "Percentile line"]},
           {"label": "The middle value, unaffected by a few extreme values", "options": ["Average line", "Constant line", "Median line", "Percentile line"]},
           {"label": "The value below which 90% of the points fall", "options": ["Average line", "Constant line", "Median line", "Percentile line"]}],
    topic=AN)

add("Filters", "dropdown",
    "Select the approach for each requirement.",
    {"parts": [2, 1, 0]},
    "Filtering on a measure's value, such as customers with sales over 1,000, is only possible at visual level. Report-level filters apply to every page. Slicers put the choice on the canvas for users.",
    "Measure condition → visual filter. Everywhere → report filter. User's choice on canvas → slicer.",
    parts=[{"label": "Users pick a region from a control on the page", "options": ["Visual-level filter", "Report-level filter", "Slicer"]},
           {"label": "Test accounts are excluded from every page", "options": ["Visual-level filter", "Report-level filter", "Slicer"]},
           {"label": "One table shows only customers whose Sales is above 1,000", "options": ["Visual-level filter", "Report-level filter", "Slicer"]}],
    topic=CR)

add("Interactions", "dropdown",
    "A user selects a region in a bar chart. Select the Edit interactions setting for each other visual.",
    {"parts": [2, 1, 0]},
    "None leaves a visual unchanged. Highlight keeps the totals visible and highlights the selection within them. Filter shows only the selection, and is the only option for line charts.",
    "Unchanged → None. Selection within totals → Highlight. Only the selection → Filter.",
    parts=[{"label": "A line chart of monthly sales must show only the selected region's trend", "options": ["None", "Highlight", "Filter"]},
           {"label": "A column chart must show the selected region's portion inside each month's total", "options": ["None", "Highlight", "Filter"]},
           {"label": "A card of company-wide revenue must not change", "options": ["None", "Highlight", "Filter"]}],
    topic=UX)

add("Format visuals", "dropdown",
    "Select the setting that meets each requirement.",
    {"parts": [1, 0]},
    "To make month names sort in calendar order everywhere, set the column's Sort by column to the month number. To keep a bar chart ranked by value, sort the visual by the measure, descending.",
    "Text in a natural order → Sort by column. Rank in one visual → sort the visual by the measure.",
    parts=[{"label": "Month names must appear January to December in every visual", "options": ["Sort the visual by Sales", "Set Sort by column to Month Number"]},
           {"label": "A bar chart must always show the best-selling product first", "options": ["Sort the visual by Sales, descending", "Set Sort by column to Product ID"]}],
    topic=CR, difficulty=1)

add("Report design", "dropdown",
    "Select the quickest way to meet each requirement.",
    {"parts": [2, 0, 1]},
    "A report theme (JSON) sets colours and fonts for every visual. Format painter copies one visual's formatting to another. Duplicating a template page reuses a fixed layout, such as a header and logo.",
    "Report-wide style → theme. One visual's style → Format painter. Repeated layout → template page.",
    parts=[{"label": "Every visual uses the company's brand colours and font", "options": ["Duplicate a template page", "Format painter", "Apply a report theme"]},
           {"label": "A new chart must look exactly like a chart you've already formatted", "options": ["Format painter", "Apply a report theme", "Duplicate a template page"]},
           {"label": "Every new page has the same header bar, logo and title position", "options": ["Format painter", "Duplicate a template page", "Apply a report theme"]}],
    topic=CR, difficulty=1)

# ---------------- Yes/No series ----------------
add("Bookmarks", "yesno",
    "For each statement about bookmarks, select Yes if it is true.",
    [True, False, True],
    "With Data turned on, a bookmark captures and reapplies filter and slicer state. Bookmarks don't refresh data. Report readers can create personal bookmarks in the Power BI service.",
    "Bookmarks capture state, not data refreshes.",
    statements=["A bookmark with the Data property on reapplies slicer selections.", "Applying a bookmark refreshes the semantic model.",
                "Readers can create personal bookmarks in the Power BI service."], topic=UX, difficulty=1)

add("Drillthrough", "yesno",
    "For each statement about drillthrough, select Yes if it is true.",
    [True, True, False],
    "Adding a field to a page's Drill through well adds a back button automatically. A drillthrough page can have several drillthrough fields. Cross-report drillthrough only works between reports that use the same semantic model.",
    "Drillthrough: back button added; several fields allowed; cross-report needs the same model.",
    statements=["Power BI adds a back button to a drillthrough page automatically.", "A drillthrough page can use more than one drillthrough field.",
                "Cross-report drillthrough works between reports that use different semantic models."], topic=UX)

add("Slicers", "yesno",
    "For each statement about slicers, select Yes if it is true.",
    [True, False, True],
    "Sync slicers can apply a selection to other pages even where the slicer isn't visible. Slicers work on columns, not on measure values. A relative date slicer moves its window forward automatically.",
    "Slicers use columns; sync can be invisible; relative dates roll.",
    statements=["A slicer can filter another page without being visible on it.", "A slicer can filter directly on a measure's value, such as Sales above 1,000.",
                "A relative date slicer set to the last 7 days updates automatically each day."], topic=UX, difficulty=1)

add("Conditional formatting", "yesno",
    "For each statement about conditional formatting, select Yes if it is true.",
    [True, True, False],
    "Formatting can be based on any field or measure, even one not shown in the visual. Icons are available in tables and matrices. Conditional formatting changes only how values look; the data in the model is untouched.",
    "Conditional formatting changes appearance only.",
    statements=["A table's background colour can be based on a measure that isn't displayed in the table.", "Icons are available as conditional formatting in table and matrix visuals.",
                "Conditional formatting changes the values stored in the model."], topic=CR, difficulty=1)

add("Accessibility", "yesno",
    "For each statement about accessible reports, select Yes if it is true.",
    [True, True, False],
    "Screen readers read alt text. The Selection pane's Tab order sets keyboard navigation. Colour alone isn't enough to convey meaning; add labels, icons or markers.",
    "Alt text, tab order, and never colour alone.",
    statements=["Screen readers read a visual's alt text.", "Tab order for keyboard users is set in the Selection pane.",
                "Using red and green alone is enough to show good and bad results."], topic=UX, difficulty=1)

add("Tooltips", "yesno",
    "For each statement about tooltips, select Yes if it is true.",
    [True, True, False],
    "Fields in a visual's Tooltips well appear in its default tooltip. A tooltip page can be hidden from the page tabs and still work. One tooltip page can serve many visuals.",
    "Tooltips well for default tooltips; tooltip pages are reusable and can be hidden.",
    statements=["Fields added to a visual's Tooltips well appear when users hover over it.", "A report page tooltip still works when its page is hidden.",
                "A report page tooltip can be used by only one visual."], topic=UX, difficulty=1)

add("Mobile layout", "yesno",
    "For each statement about mobile layouts, select Yes if it is true.",
    [True, False, True],
    "Only visuals placed on a page's mobile layout appear when a phone shows that page in portrait. The mobile layout lives in the same report, not a separate one. Rotating the phone to landscape shows the standard layout.",
    "Mobile layout = per page, inside the same report.",
    statements=["Visuals not added to a page's mobile layout aren't shown on phones in portrait view.", "A mobile layout must be created as a separate report.",
                "Phone users can rotate to landscape to see the standard page layout."], topic=UX)

# ---------------- Ordering ----------------
add("Tooltips", "order",
    "You need a mini chart to appear when users hover over a product in a bar chart.\n\nSelect the actions you should perform and arrange them in order.",
    ["A", "B", "C", "D"],
    "Create the page, turn on Allow use as tooltip (and set a small canvas), build the mini chart, then on the bar chart set Tooltip type to Report page and choose the new page. Drillthrough and bookmarks aren't involved.",
    "Tooltip page → allow as tooltip → build → assign to the visual.",
    items=["Add a new page", "In Page information, turn on Allow use as tooltip and set the canvas to Tooltip size",
           "Add the mini chart to the page", "On the bar chart, set Tooltip type to Report page and select the new page",
           "Add Product to the Drill through well", "Create a bookmark of the page"], topic=UX)

add("Bookmarks", "order",
    "You need two buttons that switch between showing a chart and a table in the same position.\n\nSelect the actions you should perform and arrange them in order.",
    ["A", "B", "C", "D", "E"],
    "Place both visuals, set visibility in the Selection pane and capture a bookmark for each state (with Data off so slicers aren't reset), then assign each bookmark to a button.",
    "Set visibility → bookmark each state → link buttons.",
    items=["Place the chart and the table in the same position", "Hide the table in the Selection pane, then add a bookmark named Chart view",
           "Show the table and hide the chart, then add a bookmark named Table view", "Turn off the Data property for both bookmarks",
           "Set each button's action to its bookmark", "Create a drillthrough page", "Turn on Auto date/time"], topic=UX)

add("Field parameters", "order",
    "Users need a slicer to switch a column chart's axis between Region, Channel and Product.\n\nSelect the actions you should perform and arrange them in order.",
    ["A", "B", "C"],
    "Create a field parameter with the three fields (Modeling > New parameter > Fields), keep the option to add a slicer, then put the parameter on the chart's axis. A calculation group changes measures, not axis fields.",
    "New parameter > Fields → slicer → parameter on the axis.",
    items=["Select Modeling > New parameter > Fields", "Add Region, Channel and Product, and keep Add slicer to this page selected",
           "Put the new parameter field on the column chart's X-axis", "Create a calculation group", "Create three bookmarks"], topic=UX)

add("Small multiples", "order",
    "You need a line chart of monthly sales repeated for each region in a grid.\n\nSelect the actions you should perform and arrange them in order.",
    ["A", "B", "C", "D"],
    "Add a line chart, put Month on the X-axis and Sales on the Y-axis, add Region to Small multiples, then adjust the grid layout in the Format pane.",
    "Small multiples: build the chart, then add the splitting field.",
    items=["Add a line chart", "Put Month on the X-axis and Sales on the Y-axis", "Add Region to the Small multiples well",
           "Set the grid's rows and columns in the Format pane", "Add Region to the Legend", "Create one line chart per region"], topic=CR, difficulty=1)

add("Decomposition tree", "order",
    "Analysts want to break down total Sales by Region and Channel, then let Power BI choose the next level automatically.\n\nSelect the actions you should perform and arrange them in order.",
    ["A", "B", "C", "D"],
    "Add the visual, put Sales in Analyze and the candidate fields in Explain by, expand by Region and Channel, then use the + on a node and choose High value to let AI pick the next level.",
    "Analyze + Explain by → expand → AI split.",
    items=["Add a decomposition tree visual", "Put Sales in Analyze, and Region, Channel and Product in Explain by",
           "Expand the root by Region, then a region by Channel", "Select + on a channel and choose High value",
           "Turn on anomaly detection", "Add Sales to the Tooltips well"], topic=AN)

B.save()
