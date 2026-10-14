import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from charts import column, linechart, scatter, pie, waterfall, kpi, gauge, data_table, filters_pane
from bankkit import Batch

B = Batch(7, "visualize_visuals-formatting", "Create reports: choose, build and format visuals", "visualize", {"visualize": 1})
add = B.add
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

# ================= Choose the right visual =================
add("Choose a visual", "single",
    "The exhibit shows two years of monthly revenue as a column chart. Managers say it's hard to see the overall trend and the seasonal pattern.\n\nWhich visual should replace it?",
    "B",
    "A line chart joins consecutive months, so the trend and the yearly seasonal shape are easy to follow. Columns for 24 periods emphasise individual months rather than movement over time. Pie and treemap visuals show part-to-whole, not change over time.",
    "Change over time, many periods → line chart.",
    options=["Pie chart", "Line chart", "Treemap", "Multi-row card"],
    image=(column("Revenue by Month", [m[:1] for m in MONTHS] * 2,
                  [("Revenue", [310, 290, 340, 360, 400, 450, 470, 460, 410, 380, 520, 610, 330, 315, 365, 390, 430, 480, 505, 495, 440, 410, 560, 650])],
                  "Column chart of revenue for 24 months", w=820, xlabel="Month (2025–2026)"),
           "Column chart with 24 monthly bars from January 2025 to December 2026, rising through the year with peaks each December."), difficulty=1)

add("Choose a visual", "single",
    "You need to compare sales across 12 product categories with long names, so that users can quickly see which categories sell most.\n\nWhich visual should you use?",
    "C",
    "A horizontal bar chart has room for long labels, and sorting it by sales descending makes the ranking obvious. A pie chart with 12 slices is hard to compare; a line chart implies a sequence that categories don't have.",
    "Compare many categories → bar chart, sorted.",
    options=["Pie chart with 12 slices", "Line chart", "Bar chart sorted by sales descending", "Gauge"], difficulty=1)

add("Choose a visual", "dropdown",
    "Select the visual that best meets each requirement.",
    {"parts": [0, 1, 2]},
    "A donut (or pie) works for a part-to-whole with only a few parts. A 100% stacked column shows how shares change across periods. A waterfall shows how increases and decreases build from a starting value to an ending value.",
    "Few-part share → donut. Share over time → 100% stacked. Build-up of changes → waterfall.",
    parts=[{"label": "Share of revenue from three sales channels this year", "options": ["Donut chart", "100% stacked column chart", "Waterfall chart"]},
           {"label": "How each channel's share changed over 12 months", "options": ["Donut chart", "100% stacked column chart", "Waterfall chart"]},
           {"label": "How price, volume and cost changes moved profit from last year to this year", "options": ["Donut chart", "100% stacked column chart", "Waterfall chart"]}],
    difficulty=1)

add("Choose a visual", "single",
    "The exhibit shows sales by region per year. Users want to compare each region's share of the yearly total, but the totals change every year.\n\nWhat should you change?",
    "A",
    "A 100% stacked column chart scales every year to 100%, so the segments show each region's share and are directly comparable across years. A clustered chart compares absolute values; adding data labels doesn't fix the changing totals.",
    "Compare shares across categories with different totals → 100% stacked.",
    options=["Change it to a 100% stacked column chart", "Change it to a clustered column chart", "Add data labels", "Sort the axis by total sales"],
    image=(column("Sales by Year and Region", ["2023", "2024", "2025", "2026"],
                  [("North", [120, 150, 210, 260]), ("South", [90, 95, 100, 105]), ("West", [60, 80, 120, 170])],
                  "Stacked column chart of sales by year and region", stacked=True, legend_title="Region"),
           "Stacked column chart for 2023 to 2026 with North, South and West segments. Total sales grow every year, from 270 to 535."))

add("Choose a visual", "single",
    "The exhibit plots stores by sales (x-axis) and profit margin (y-axis).\n\nWhich store has high sales but an unusually low margin?",
    "D",
    "Store D sits far to the right (high sales) but near the bottom (low margin), away from the cluster of other stores. That separation is exactly what a scatter chart is good at revealing.",
    "Scatter charts show relationships and outliers between two measures.",
    options=["Store A", "Store B", "Store C", "Store D"],
    image=(scatter("Margin % vs Sales by Store", [("Store A", 190, 31), ("Store B", 250, 26), ("Store C", 330, 34), ("Store E", 400, 29),
                                                  ("Store F", 270, 37), ("Store D", 610, 9)],
                   "Scatter chart of margin against sales by store", "Sales (K)", "Margin %", yfmt=lambda v: f"{v:g}%", xfmt=lambda v: f"{v:g}"),
           "Scatter chart: stores A, B, C, E and F cluster at 190 to 400K sales with 26 to 37% margin; Store D sits at 610K sales and 9% margin."), difficulty=1)

add("Choose a visual", "single",
    "You need to show monthly revenue (in millions) and profit margin % (between 8% and 15%) in one visual, each readable on its own scale.\n\nWhat should you use?",
    "C",
    "A line and clustered column chart (combo) shows revenue as columns on the primary axis and margin % as a line on a secondary axis, so both scales stay readable. On one shared axis the percentage line would sit flat at the bottom.",
    "Two measures with very different scales → combo chart with a secondary axis.",
    options=["A clustered column chart with both measures", "Two pie charts", "A line and clustered column chart, with margin % on the secondary axis",
             "A 100% stacked column chart"],
    image=(linechart("Revenue and Margin % by Month", MONTHS[:6], [], "Combo chart with revenue columns and a margin line",
                     columns=[("Revenue", [2.1, 2.4, 2.2, 2.8, 3.1, 3.3])], secondary=("Margin %", [11, 9, 13, 12, 15, 14], lambda v: f"{v:.0f}%"),
                     hi=4),
           "Line and clustered column chart: revenue columns from 2.1 to 3.3 million on the left axis and a margin % line between 9% and 15% on a right-hand secondary axis."))

add("Choose a visual", "dropdown",
    "You're building a KPI visual that compares this month's sales with the sales target and shows the monthly trend.\n\nSelect the field for each well.",
    {"parts": [0, 1, 2]},
    "Indicator is the value being evaluated, Trend axis is the field the background trend uses (usually a date field), and Target is what the indicator is compared against. The visual colours the value by whether it meets the target.",
    "KPI visual: Indicator = value, Trend axis = time, Target = goal.",
    parts=[{"label": "Indicator", "options": ["[Sales]", "Date[Month]", "[Sales Target]"]},
           {"label": "Trend axis", "options": ["[Sales]", "Date[Month]", "[Sales Target]"]},
           {"label": "Target", "options": ["[Sales]", "Date[Month]", "[Sales Target]"]}], difficulty=1)

add("Choose a visual", "single",
    "The exhibit shows a KPI visual. Higher values are better.\n\nWhat does it tell you?",
    "B",
    "The indicator (412K) is below the goal (450K) by 8.4%, which is why it's shown in red. The shaded background is the trend over the trend axis.",
    "KPI visual: colour = meeting or missing the target.",
    options=["Sales are 8.4% above target", "Sales are 8.4% below target", "Sales grew 8.4% since last month", "The target is 412K"],
    image=(kpi("Sales vs Target", "412K", "Goal: 450K (-8.4%)", "bad", "KPI visual below target", trend=[380, 395, 370, 410, 400, 412]),
           "KPI visual showing 412K in red with the text Goal: 450K (-8.4%) and a shaded trend in the background."), difficulty=1)

add("Choose a visual", "single",
    "The exhibit shows a gauge.\n\nWhich statement is true?",
    "D",
    "The gauge runs from 0 to 1M, the filled arc shows the current value of 620K, and the marker shows the target of 750K, so the value hasn't reached the target yet.",
    "Gauge: value arc, min/max range and target marker.",
    options=["The target has been exceeded", "The maximum value is 750K", "The gauge shows a trend over time", "Current value is 620K, below the 750K target"],
    image=(gauge("Quarter Sales", 620000, 0, 1000000, 750000, "Gauge with a target marker"),
           "Gauge from 0 to 1M with the arc filled to 620K and a target marker at 750K."), difficulty=1)

add("Choose a visual", "single",
    "Sales leadership wants to see how many opportunities move through each stage: Lead, Qualified, Proposal, Negotiation and Won.\n\nWhich visual should you use?",
    "A",
    "A funnel chart shows a sequence of stages, each narrower than the last, making drop-off between stages visible. A waterfall shows increases and decreases to a total, not stage conversion.",
    "Sequential stages with drop-off → funnel.",
    options=["Funnel chart", "Waterfall chart", "Scatter chart", "Ribbon chart"], difficulty=1)

add("Choose a visual", "single",
    "You need to shade each state on a map by total sales, darker for higher sales.\n\nWhich visual should you use?",
    "C",
    "A filled map (choropleth) shades whole geographic areas by value. A basic map places bubbles at locations; a scatter chart has no geography.",
    "Shade areas by value → filled map.",
    options=["Map with bubbles sized by sales", "Scatter chart", "Filled map", "Treemap"], difficulty=1)

add("Choose a visual", "single",
    "An executive page must show Revenue, Profit, Orders and Margin % together as headline numbers in one compact visual.\n\nWhich visual should you use?",
    "B",
    "The card visual can display several callout values (one per measure) in a single visual, so related headline numbers stay aligned and formatted together. A gauge or KPI visual shows one measure.",
    "Several headline numbers together → card visual with multiple values.",
    options=["Four gauges", "A card visual with all four measures", "A KPI visual", "A table with one row"])

add("Choose a visual", "single",
    "You need the same line chart of monthly sales repeated for each of eight regions, with shared axes so users can compare them.\n\nWhat should you use?",
    "D",
    "Small multiples split one visual into a grid of mini charts, one per region, with consistent axes, and new regions appear automatically. Eight separate charts would need maintaining and could drift apart in scale.",
    "Same chart per category → small multiples.",
    options=["Eight separate line charts", "A ribbon chart", "A field parameter", "Small multiples using Region"], difficulty=1)

add("Choose a visual", "dropdown",
    "Select the slicer setup that meets each requirement.",
    {"parts": [1, 0, 2]},
    "A relative date slicer keeps a rolling window such as the last 30 days. A Between (range) slicer lets users pick a numeric range. A dropdown slicer with search suits long lists such as 300 customers.",
    "Rolling dates → relative date. Ranges → Between. Long lists → dropdown with search.",
    parts=[{"label": "Always show the last 30 days, rolling forward each day", "options": ["Between slider", "Relative date slicer", "Dropdown with search"]},
           {"label": "Pick a unit price range from 10 to 50", "options": ["Between slider", "Relative date slicer", "Dropdown with search"]},
           {"label": "Pick one of 300 customers by typing part of the name", "options": ["Between slider", "Relative date slicer", "Dropdown with search"]}])

# ================= Analytics and reading charts =================
add("Analytics pane", "single",
    "The exhibit shows a line chart with a shaded forecast.\n\nWhere is the forecast configured, and what does the shaded area represent?",
    "A",
    "Forecast is added from the Analytics pane of a line chart with a continuous date axis. The dashed line is the predicted value; the shaded band is the confidence interval around it.",
    "Forecast → Analytics pane, line chart with continuous dates; band = confidence interval.",
    options=["The Analytics pane; the shaded area is the confidence interval", "The Format pane; the shaded area is last year's sales",
             "The Filters pane; the shaded area is filtered-out data", "A quick measure; the shaded area is the running total"],
    image=(linechart("Sales by Month with Forecast", MONTHS[:9], [("Sales", [310, 330, 320, 360, 380, 375, 410, 430, 425])],
                     "Line chart with a forecast band", forecast=([445, 460, 470], [410, 415, 418], [480, 505, 522]), hi=600),
           "Line chart of sales from January to September, followed by a dashed forecast line for three more months inside a shaded band that widens over time."))

add("Analytics pane", "single",
    "The exhibit shows sales by representative with an average line from the Analytics pane.\n\nHow many representatives are above the average?",
    "C",
    "The dashed average line sits at 52K. Bianca (61K), Chen (74K) and Farah (58K) are above it; the other three are below.",
    "Analytics lines are calculated from the data in the visual.",
    options=["One", "Two", "Three", "Four"],
    image=(column("Sales by Representative", ["Ahmed", "Bianca", "Chen", "Dev", "Elena", "Farah"], [("Sales", [41, 61, 74, 38, 40, 58])],
                  "Column chart with an average line", ref_lines=[("Average 52K", 52, True)], labels=True, hi=80),
           "Column chart of sales by representative: Ahmed 41, Bianca 61, Chen 74, Dev 38, Elena 40, Farah 58, with a dashed average line at 52."), difficulty=1)

add("Analytics pane", "single",
    "The exhibit shows a waterfall chart of profit from last year to this year.\n\nWhich factor reduced profit the most?",
    "B",
    "Red bars are decreases. Cost of goods (−90K) is the largest drop; returns took off 25K. Price and volume increased profit.",
    "Waterfall: green = increase, red = decrease, blue = totals.",
    options=["Price", "Cost of goods", "Returns", "Volume"],
    image=(waterfall("Profit bridge: last year to this year", 500000, [("Price", 60000), ("Volume", 45000), ("Cost of goods", -90000), ("Returns", -25000)],
                     "Waterfall chart of profit changes", start_label="Last year", end_label="This year"),
           "Waterfall from last year's profit of 500K: Price +60K, Volume +45K, Cost of goods −90K, Returns −25K, ending at 490K this year."), difficulty=1)

add("Format visuals", "single",
    "In the exhibit, the bars for two regions look very different, but their sales are almost the same.\n\nWhat should you change?",
    "D",
    "The value axis starts at 900K, which exaggerates small differences. Setting the axis to start at 0 shows the bars in proportion to their values.",
    "Bar and column axes should start at zero.",
    options=["Add data labels", "Change the colours", "Sort by region name", "Set the value axis to start at 0"],
    image=(column("Sales by Region", ["North", "South"], [("Sales", [960000, 985000])], "Column chart with a truncated axis", lo=900000, hi=1000000, labels=True, w=520),
           "Column chart where the axis starts at 900K: North at 960K looks less than half the height of South at 985K."), difficulty=1)

add("Format visuals", "single",
    "Product sales range from 100 to 2,000,000. On a column chart, most products look like empty bars next to the biggest ones.\n\nWhich axis setting helps users compare them?",
    "A",
    "A logarithmic scale spaces values by orders of magnitude (100, 1K, 10K…), so small and large values are both readable. Note that log scales can't show zero or negative values.",
    "Values spanning orders of magnitude → logarithmic axis.",
    options=["Logarithmic value axis", "Start the axis at 0", "Invert the axis", "Turn off gridlines"])

# ================= Conditional formatting and formatting =================
add("Conditional formatting", "single",
    "The exhibit shows a table visual. Which conditional formatting option produced the horizontal bars in the Sales column?",
    "C",
    "Data bars draw a bar inside each cell, proportional to the value. Background colour shades the cell; icons add symbols; field value takes a colour from a field or measure.",
    "Bars inside cells → data bars.",
    options=["Background colour", "Icons", "Data bars", "Field value"],
    image=(data_table("Sales by Product", ["Product", "Sales", "Trend"],
                      [["Trail Shoe", "538,210", "▲ 12%"], ["Rain Jacket", "412,380", "▲ 4%"], ["Daypack", "168,940", "▼ -6%"], ["Gaiters", "42,770", "● 0%"]],
                      "Table visual with data bars and icons", bars_col=1, icon_col=2, col_w=[200, 220, 150]),
           "Table of Sales by Product with blue bars inside the Sales cells and green, red and amber icons in the Trend column."), difficulty=1)

add("Conditional formatting", "dropdown",
    "Select the conditional formatting style for each requirement.",
    {"parts": [1, 0, 2, 3]},
    "Rules apply colours by thresholds (red/amber/green). Gradient shades from low to high. Field value uses a colour a field or measure returns. Icons add symbols such as arrows.",
    "Thresholds → Rules. Smooth shading → Gradient. Colour from a measure → Field value. Symbols → Icons.",
    parts=[{"label": "Red below 90% of target, amber to 100%, green above", "options": ["Gradient", "Rules", "Field value", "Icons"]},
           {"label": "Shade from light to dark as sales increase", "options": ["Gradient", "Rules", "Field value", "Icons"]},
           {"label": "Use the hex colour returned by a [Status Colour] measure", "options": ["Gradient", "Rules", "Field value", "Icons"]},
           {"label": "Show an up or down arrow beside each value", "options": ["Gradient", "Rules", "Field value", "Icons"]}])

add("Conditional formatting", "single",
    "A chart's title must read 'Sales for North' or 'Sales for South' depending on the selected region.\n\nWhat should you do?",
    "B",
    "Create a measure that builds the text (for example with SELECTEDVALUE), then select the fx button next to the visual's Title text and choose that measure. Many formatting properties accept a measure this way.",
    "Dynamic titles → fx on Title text with a text measure.",
    options=["Type both titles and hide one", "Use the fx button on the title and pick a measure that returns the text", "Create a bookmark per region",
             "Add the region to the legend"], difficulty=1)

add("Conditional formatting", "single",
    "In a column chart, bars for products below target must be red and the others blue.\n\nWhat should you do?",
    "A",
    "Under Columns > Colours, select fx and use Rules or Field value with a measure such as a below-target flag or colour measure. Moving a field into Legend would colour by category, not by a condition.",
    "Colour bars by a condition → fx on the series colour.",
    options=["Use fx on the column colour with a rule or a colour measure", "Put Product in the Legend", "Apply a report theme", "Add an average line"])

add("Format visuals", "single",
    "A column chart of sales by month skips months that had no sales. Users must see every month, including empty ones.\n\nWhat should you do?",
    "C",
    "Turn on Show items with no data for the Month field in the visual's field well. Months without sales then appear with no bar instead of disappearing.",
    "Show empty categories → 'Show items with no data'.",
    options=["Add 0 to the measure", "Use a line chart", "Turn on Show items with no data for the Month field", "Turn on Auto date/time"], difficulty=1)

add("Format visuals", "single",
    "A product table must show a small line of each product's monthly sales trend inside each row.\n\nWhat should you add?",
    "D",
    "Sparklines in tables and matrices draw a tiny chart per row, for example sales over Month. They're added from the Values well's menu (Add a sparkline).",
    "Mini trend per row → sparkline.",
    options=["A line chart beside the table", "Data bars", "A tooltip page", "A sparkline in the table"])

add("Format visuals", "single",
    "A matrix has several measures, and users want each measure on its own row instead of as columns.\n\nWhich setting should you change?",
    "B",
    "In the matrix's Format pane, under Values, turn on Switch values to rows. Each measure then appears as a row under the row headers.",
    "Measures as rows in a matrix → Switch values to rows.",
    options=["Turn off stepped layout", "Turn on Switch values to rows", "Transpose the data in Power Query", "Use a table visual"])

add("Format visuals", "single",
    "A matrix shows Category and Product indented in one column. Users want Category and Product in separate columns, like a spreadsheet.\n\nWhat should you change?",
    "C",
    "Turning off Stepped layout (Row headers in the Format pane) shows each hierarchy level in its own column instead of indenting levels in one column.",
    "Separate columns per row level → turn off stepped layout.",
    options=["Switch values to rows", "Add a hierarchy", "Turn off Stepped layout", "Turn on word wrap"], difficulty=1)

add("Format visuals", "single",
    "You've formatted one chart's colours, fonts and borders carefully and want another chart to look the same.\n\nWhat is the quickest way?",
    "A",
    "Format painter copies formatting from one visual to another in one click. Themes set defaults for the whole report rather than copying one visual's settings.",
    "Copy one visual's formatting → Format painter.",
    options=["Format painter", "Copy and paste the visual", "Apply a theme", "Export and import a template"], difficulty=1)

add("Accessibility", "single",
    "Some users are colour-blind and can't tell the red and green status colours apart.\n\nWhat should you do?",
    "B",
    "Don't rely on colour alone: add data labels, icons (such as arrows), markers or patterns, and choose colours with good contrast. Changing the theme only helps if the new colours are distinguishable, and still relies on colour.",
    "Never rely on colour alone to convey meaning.",
    options=["Use a darker green", "Add icons or labels so meaning doesn't depend on colour", "Remove all colour", "Add a legend"], difficulty=1)

add("Accessibility", "single",
    "Screen-reader users need a description of what each chart shows.\n\nWhat should you set?",
    "D",
    "Alt text (in the visual's General settings) is read by screen readers. It can be static or built from a measure so it describes the current values.",
    "Screen readers read a visual's alt text.",
    options=["Tooltips", "The visual title only", "Tab order", "Alt text for each visual"], difficulty=1)

add("Custom visuals", "single",
    "IT wants report authors across the organisation to use only a few approved custom visuals, available to everyone without each author importing them.\n\nWhat should you do?",
    "C",
    "Power BI admins can add approved visuals as organizational visuals in the admin portal; they then appear for everyone in the visuals pane. Importing from a file per report doesn't centralise control.",
    "Approved custom visuals for everyone → organizational visuals.",
    options=["Ask each author to import the visual from a file", "Use only R visuals", "Add them as organizational visuals in the admin portal",
             "Put them in a report theme"])

# ================= Filters and interactions =================
add("Filters", "dropdown",
    "Select the filter level for each requirement.",
    {"parts": [0, 2, 1]},
    "Visual-level filters affect one visual, page-level filters every visual on a page, and report-level filters every page.",
    "Visual → one visual. Page → one page. Report (all pages) → everything.",
    parts=[{"label": "Only one chart should exclude returned orders", "options": ["Visual level", "Page level", "Report level"]},
           {"label": "Every page must show only the current year", "options": ["Visual level", "Page level", "Report level"]},
           {"label": "Only the Europe page should show European countries", "options": ["Visual level", "Page level", "Report level"]}], difficulty=1)

add("Filters", "single",
    "A bar chart must show only the 10 customers with the highest sales.\n\nWhat should you use?",
    "A",
    "A Top N filter on Customer, by the Sales measure with Show items: Top 10, in the visual's filters keeps the ten largest customers for the current context.",
    "Top 10 in one visual → visual-level Top N filter.",
    options=["A visual-level Top N filter on Customer, by Sales", "A page-level basic filter on Customer", "A slicer on Customer", "A calculated column ranking customers"], difficulty=1)

add("Filters", "single",
    "A chart has a Top 10 customers filter by Sales. A user selects Asia in a Region slicer.\n\nWhat does the chart show?",
    "B",
    "Top N is evaluated in the current filter context, so it shows the top 10 customers within Asia. To always rank across all regions, you'd need a measure-based approach.",
    "Top N filters respect other filters.",
    options=["The overall top 10, filtered to those in Asia", "The top 10 customers in Asia", "No change", "An error"])

add("Filters", "single",
    "You need to show only customers whose Sales measure is above 10,000.\n\nAt which level can you filter on the measure's value?",
    "C",
    "Filters on measure values are available only at visual level, because a measure's value depends on the visual's grouping. Page and report filters work on columns.",
    "Filtering by a measure's value → visual-level filter.",
    options=["Report level", "Page level", "Visual level", "In a slicer"])

add("Filters", "single",
    "A page must always show the previous three complete calendar months, updating automatically.\n\nWhich filter should you use on the Date column?",
    "D",
    "A relative date filter set to 'is in the last 3 calendar months' rolls forward automatically and uses complete months. A basic or advanced filter on fixed dates would need manual updates.",
    "Rolling periods → relative date filter.",
    options=["A basic filter with three months ticked", "An advanced filter with fixed dates", "A Top N filter on Date", "A relative date filter: last 3 calendar months"])

add("Filters", "single",
    "The exhibit shows the Filters pane. Report readers must not change the Year filter, and shouldn't see the Internal flag filter at all.\n\nWhat should you do?",
    "A",
    "Lock the Year filter so readers can see but not change it, and hide the Internal flag filter so it isn't shown in reading view. Both settings are on each filter card.",
    "Visible but fixed → lock. Invisible → hide.",
    options=["Lock the Year filter and hide the Internal flag filter", "Delete both filters", "Hide both filters", "Convert both to slicers"],
    image=(filters_pane([("Filters on this page", [("Region", "is (All)")]),
                         ("Filters on all pages", [("Year", "is 2026"), ("Internal flag", "is False")])], "Filters pane"),
           "Filters pane with a page filter on Region and two all-pages filters: Year is 2026 and Internal flag is False."))

add("Interactions", "single",
    "A matrix shows categories with a Category → Product hierarchy. Users want to see every category with its products listed underneath at once.\n\nWhat should they use?",
    "B",
    "Expand all down one level in the hierarchy shows the next level for every category at the same time, keeping the category rows. Drill down shows only one category's products.",
    "See every parent with its children → Expand all down one level.",
    options=["Drill down on one category", "Expand all down one level in the hierarchy", "Go to the next level in the hierarchy", "A drillthrough page"])

add("Interactions", "single",
    "A button must open the company intranet page about the sales process.\n\nWhich action type should you set?",
    "D",
    "The Web URL action opens a web address. Page navigation, bookmark and drillthrough actions only move within the report.",
    "Open a website from a button → Web URL action.",
    options=["Page navigation", "Bookmark", "Drillthrough", "Web URL"], difficulty=1)

add("Interactions", "single",
    "A visual shows the message 'Too many values. Not showing all data.'\n\nWhat should you do?",
    "C",
    "Power BI reduces the data points it plots for very high-cardinality fields. Filter or summarise the field (for example a Top N filter or a coarser level) so the visual shows a meaningful amount of data.",
    "'Too many values' → filter or summarise to fewer data points.",
    options=["Refresh the semantic model", "Turn on Auto date/time", "Filter or summarise the field so fewer data points are needed", "Increase the page size"])

add("Interactions", "single",
    "Users export data from a matrix and need all the detail columns from the underlying rows, not just the matrix's grouped totals.\n\nWhich export option should they choose?",
    "B",
    "Underlying data exports the detail rows behind the visual's values. Summarized data exports what the visual shows. Admins and model owners can restrict underlying data export.",
    "Detail rows → Underlying data. Visual's numbers → Summarized data.",
    options=["Summarized data", "Underlying data", "Export to PDF", "Copy visual as image"])

add("Interactions", "single",
    "Users need to drill into a chart by clicking a column, moving from Year to Quarter for the clicked year.\n\nWhat must be true?",
    "A",
    "The axis must hold a hierarchy (or several fields), and drill mode must be on (the single down-arrow in the visual header). Clicking a column then drills into that year.",
    "Click-to-drill needs a hierarchy on the axis and drill mode on.",
    options=["The axis holds a Year → Quarter hierarchy and drill mode is on", "The chart is a table", "A drillthrough page exists", "The year is a slicer"])

add("Report layout", "single",
    "A report page shows a slicer for Region. On a second page, you need the same selection applied automatically, without showing the slicer there.\n\nWhat should you do?",
    "D",
    "In the Sync slicers pane, tick the second page under Sync but leave it unticked under Visible. The selection applies there without the slicer appearing.",
    "Apply a slicer's selection elsewhere without showing it → sync, not visible.",
    options=["Copy the slicer and hide it", "Use a report-level filter", "Use a bookmark", "Sync the slicer to the second page without making it visible"])

add("Report layout", "single",
    "The report must look good on phones in portrait orientation.\n\nWhat should you create?",
    "A",
    "A mobile layout (View > Mobile layout) arranges selected visuals for portrait phone screens. The Power BI mobile app uses it automatically.",
    "Phone-friendly report → mobile layout.",
    options=["A mobile layout for each page", "A smaller page size", "A paginated report", "A dashboard"], difficulty=1)

add("Report layout", "single",
    "You want a consistent header, logo position and grid for every new page in a report.\n\nWhat helps most?",
    "C",
    "Duplicating a template page that already has the header, logo and layout (plus a report theme for colours and fonts) keeps every new page consistent. Themes don't place objects like logos on pages.",
    "Consistent page layout → duplicate a template page (with a theme).",
    options=["Turn on gridlines", "Use bookmarks", "Build one template page and duplicate it for each new page", "Use a different theme per page"], difficulty=1)

B.save()
