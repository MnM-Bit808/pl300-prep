import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from svgkit import model, matrix, pq
from bankkit import Batch

B = Batch(5, "model_dax", "Create model calculations by using DAX", "model", {"model": 40})
add = B.add

# ================= Measures and aggregation =================
add("Measures and aggregation", "single",
    "Sales has Quantity and UnitPrice columns but no amount column. You need a Revenue measure.\n\nWhich expression should you use?",
    "B",
    "SUMX goes row by row, multiplies Quantity by UnitPrice for each row, and adds the results. Multiplying two SUMs multiplies the totals, which is wrong whenever there's more than one row.",
    "Row-by-row calculation, then total → an X iterator such as SUMX.",
    options=["`SUM ( Sales[Quantity] ) * SUM ( Sales[UnitPrice] )`", "`SUMX ( Sales, Sales[Quantity] * Sales[UnitPrice] )`",
             "`SUM ( Sales[Quantity] * Sales[UnitPrice] )`", "`CALCULATE ( SUM ( Sales[Quantity] ), Sales[UnitPrice] )`"], difficulty=1)

add("Measures and aggregation", "single",
    "Sales has one row per order line, and an order can have several lines. You need the number of orders.\n\nWhich expression should you use?",
    "C",
    "DISTINCTCOUNT counts each OrderID once, however many lines it has. COUNTROWS counts lines, and COUNT counts non-blank values, which also counts lines.",
    "Count of entities in a line-level table → DISTINCTCOUNT of the ID.",
    options=["`COUNTROWS ( Sales )`", "`COUNT ( Sales[OrderID] )`", "`DISTINCTCOUNT ( Sales[OrderID] )`", "`SUM ( Sales[OrderID] )`"], difficulty=1)

add("Measures and aggregation", "single",
    "A Margin % measure divides profit by revenue. Some products have zero revenue, and the visual shows Infinity or errors.\n\nWhat should you use?",
    "A",
    "DIVIDE returns BLANK (or an alternative value you supply) when the denominator is zero or blank, and it's optimised for this. The / operator returns Infinity or an error. IFERROR works but is slower and hides other errors.",
    "Division in measures → DIVIDE.",
    options=["`DIVIDE ( [Profit], [Revenue] )`", "`[Profit] / [Revenue]`", "`IFERROR ( [Profit] / [Revenue], 0 )`", "`[Profit] / ( [Revenue] + 1 )`"], difficulty=1)

add("Measures and aggregation", "single",
    "Why should you create explicit measures instead of relying on implicit measures (dragging a numeric column into a visual)?",
    "D",
    "Explicit measures have one definition reused everywhere, can hold business logic, are required by calculation groups, and are what Analyze in Excel and other tools see. Implicit measures are just default aggregations of a column.",
    "Define measures explicitly; reuse them everywhere.",
    options=["Implicit measures can't be formatted", "Explicit measures are stored on every row", "Implicit measures are slower to refresh",
             "They're reusable, can hold logic, and are needed for features such as calculation groups"], difficulty=1)

add("Measures and aggregation", "single",
    "Sales has one row per order line. You need the average order value, meaning the average total per order.\n\nWhich expression should you use?",
    "B",
    "AVERAGEX over the distinct order IDs calculates each order's total (CALCULATE turns each ID into a filter) and averages those totals. AVERAGE of Amount averages lines, not orders.",
    "Average per entity → AVERAGEX over VALUES of the entity's ID.",
    options=["`AVERAGE ( Sales[Amount] )`", "`AVERAGEX ( VALUES ( Sales[OrderID] ), CALCULATE ( SUM ( Sales[Amount] ) ) )`",
             "`AVERAGEX ( Sales, Sales[Amount] )`", "`DIVIDE ( SUM ( Sales[Amount] ), COUNTROWS ( Sales ) )`"], difficulty=3)

add("Measures and aggregation", "multi",
    "An employee is active when TermDate is blank. Which two measures return the number of active employees? Each correct answer presents a complete solution.",
    ["A", "C"],
    "Both count rows where TermDate is blank: FILTER with ISBLANK keeps only those rows, and COUNTBLANK counts blank values in the column. COUNT counts non-blank values, which gives terminated employees.",
    "'No end date' = blank → ISBLANK filter or COUNTBLANK.",
    options=["`COUNTROWS ( FILTER ( Employees, ISBLANK ( Employees[TermDate] ) ) )`", "`COUNT ( Employees[TermDate] )`",
             "`COUNTBLANK ( Employees[TermDate] )`", "`DISTINCTCOUNT ( Employees[TermDate] )`"], select=2)

add("Measures and aggregation", "single",
    "You need a calculated column in Stores that shows the store name when Status is Open, and is blank otherwise.\n\nWhich expression should you use?",
    "A",
    "IF checks the condition per row and returns the name or BLANK(). A calculated column has a row context, so Stores[Status] refers to the current row.",
    "Row-by-row condition in a column → IF.",
    options=["`IF ( Stores[Status] = \"Open\", Stores[Store Name], BLANK () )`", "`FILTER ( Stores, Stores[Status] = \"Open\" )`",
             "`CALCULATE ( Stores[Store Name], Stores[Status] = \"Open\" )`", "`SWITCH ( Stores[Store Name], \"Open\" )`"], difficulty=1)

add("Measures and aggregation", "single",
    "You need a calculated column that labels each customer's credit limit: Low below 1,000, Medium below 10,000, otherwise High.\n\nWhich expression should you use?",
    "C",
    "SWITCH ( TRUE (), … ) checks each condition in order and returns the first match, which suits ranges. SWITCH on the column itself only matches exact values.",
    "Ranges → SWITCH ( TRUE (), condition, result, … ).",
    options=["`SWITCH ( Customer[Limit], 1000, \"Low\", 10000, \"Medium\", \"High\" )`", "`IF ( Customer[Limit] < 1000, \"Low\", \"High\" )`",
             "`SWITCH ( TRUE (), Customer[Limit] < 1000, \"Low\", Customer[Limit] < 10000, \"Medium\", \"High\" )`",
             "`LOOKUPVALUE ( Customer[Limit], \"Low\", 1000 )`"])

add("Measures and aggregation", "single",
    "Sales relates many-to-one to Product. You need a calculated column in Sales that shows each sale's product category.\n\nWhich function should you use?",
    "B",
    "RELATED fetches a value from the one side of a relationship into the current row on the many side. RELATEDTABLE goes the other way, returning the many-side rows for a one-side row.",
    "Many side needs a one-side value → RELATED.",
    options=["`RELATEDTABLE ( Product[Category] )`", "`RELATED ( Product[Category] )`", "`VALUES ( Product[Category] )`", "`LOOKUPVALUE ( Sales[Category] )`"], difficulty=1)

add("Measures and aggregation", "single",
    "You need a calculated column in Customer that counts each customer's rows in Sales. Customer relates one-to-many to Sales.\n\nWhich expression should you use?",
    "D",
    "RELATEDTABLE returns the Sales rows related to the current customer (it performs context transition), and COUNTROWS counts them. COUNTROWS(Sales) alone would count every sale for every customer.",
    "One side needs to count its many-side rows → COUNTROWS ( RELATEDTABLE ( … ) ).",
    options=["`COUNTROWS ( Sales )`", "`COUNT ( RELATED ( Sales[OrderID] ) )`", "`DISTINCTCOUNT ( Customer[CustomerKey] )`", "`COUNTROWS ( RELATEDTABLE ( Sales ) )`"])

# ================= CALCULATE and filter context =================
add("CALCULATE and filter context", "single",
    "You need a Blue Sales measure. When a user selects Red in a Color slicer, Blue Sales must return blank rather than ignoring the slicer. The existing filter context must be kept.\n\nWhich expression should you use?",
    "C",
    "A plain filter argument in CALCULATE replaces any existing filter on Color, so it would return blue sales even when Red is selected. KEEPFILTERS intersects with the existing filter instead: Red and Blue together leave nothing, so the result is blank.",
    "Add a filter without overriding the user's → KEEPFILTERS.",
    options=["`CALCULATE ( [Sales], Product[Color] = \"Blue\" )`", "`CALCULATE ( [Sales], ALL ( Product[Color] ) )`",
             "`CALCULATE ( [Sales], KEEPFILTERS ( Product[Color] = \"Blue\" ) )`", "`CALCULATE ( [Sales], REMOVEFILTERS ( Product ) )`"], difficulty=3)

add("CALCULATE and filter context", "single",
    "The matrix in the exhibit uses Blue Sales = CALCULATE ( [Sales], Product[Color] = \"Blue\" ). Blue products sold 400 in total.\n\nWhat does Blue Sales show in the Red row?",
    "B",
    "The filter argument replaces the row's Color filter (Red) with Blue, so every row, including Red and Green, shows the blue total of 400. That's why KEEPFILTERS exists.",
    "A CALCULATE filter on a column overrides the existing filter on that column.",
    options=["Blank", "400", "The red sales", "An error"],
    image=(matrix("Sales by Color", ["Color", "Sales", "Blue Sales"],
                  [("Blue", ["400", None], 0, False), ("Green", ["250", None], 0, False), ("Red", ["350", None], 0, False),
                   ("Total", ["1,000", None], 0, True)], "Matrix with an unknown Blue Sales column", w=600, col_w=[200, 170, 170], q_col=2),
           "Matrix of Sales by Color: Blue 400, Green 250, Red 350, total 1,000, with the Blue Sales column shown as a question mark."), difficulty=2)

add("CALCULATE and filter context", "single",
    "You need each product's share of total sales across all products, whatever product filters are applied.\n\nWhich denominator should you use?",
    "A",
    "ALL(Product) removes every filter on the Product table, so the denominator is sales for all products (other tables' filters, like dates, still apply). ALLSELECTED would respect slicer selections.",
    "Share of all items regardless of selections → ALL on that dimension.",
    options=["`CALCULATE ( [Sales], ALL ( Product ) )`", "`CALCULATE ( [Sales], ALLSELECTED ( Product ) )`", "`CALCULATE ( [Sales], Product )`", "`SUM ( Sales[Amount] )`"])

add("CALCULATE and filter context", "single",
    "A matrix lists products under their categories. You need each product's share of its own category's sales.\n\nWhich denominator should you use?",
    "D",
    "ALLEXCEPT removes all filters on Product except Category, so the denominator is the total for the product's category. ALL(Product) would use all categories.",
    "Share of the parent group → ALLEXCEPT, keeping the parent column.",
    options=["`CALCULATE ( [Sales], ALL ( Product ) )`", "`CALCULATE ( [Sales], Product[Category] )`", "`CALCULATE ( [Sales], ALLSELECTED () )`",
             "`CALCULATE ( [Sales], ALLEXCEPT ( Product, Product[Category] ) )`"])

add("CALCULATE and filter context", "single",
    "Which filter is generally preferred in CALCULATE for sales above 1,000, and why?",
    "B",
    "A boolean filter on one column is evaluated over just that column's distinct values, which is efficient. FILTER(Sales, …) iterates the whole fact table. Note they're not identical: the boolean form replaces any existing filter on Amount, while FILTER(Sales, …) keeps the current context.",
    "Prefer column predicates over FILTER on whole tables.",
    options=["`FILTER ( Sales, Sales[Amount] > 1000 )`, because it's always faster", "`Sales[Amount] > 1000`, because it filters one column instead of iterating the table",
             "Both are identical in meaning and speed", "Neither; filters can't use comparison operators"], difficulty=3)

add("CALCULATE and filter context", "single",
    "You write CALCULATE ( [Sales], [Margin %] > 0.2 ) and Power BI rejects it.\n\nHow should you rewrite the filter?",
    "C",
    "Boolean filter arguments can't reference measures. Use FILTER over the items you want to test, here each product, and evaluate the measure for each: FILTER ( VALUES ( Product[Product] ), [Margin %] > 0.2 ).",
    "Filtering by a measure → FILTER over a column's values.",
    options=["`CALCULATE ( [Sales], KEEPFILTERS ( [Margin %] > 0.2 ) )`", "`CALCULATE ( [Sales], ALL ( [Margin %] ) )`",
             "`CALCULATE ( [Sales], FILTER ( VALUES ( Product[Product] ), [Margin %] > 0.2 ) )`", "`IF ( [Margin %] > 0.2, [Sales] )`"], difficulty=3)

add("CALCULATE and filter context", "yesno",
    "For each statement about evaluation context, select Yes if it is true.",
    [True, False, True],
    "Calculated columns are evaluated with a row context for each row. A row context doesn't filter related tables by itself; CALCULATE (or a measure reference, which implies CALCULATE) converts it into a filter context. Measures are evaluated in the filter context of each cell of a visual.",
    "Row context ≠ filter context; CALCULATE converts one into the other.",
    statements=["A calculated column is evaluated with a row context for each row.",
                "A row context automatically filters related tables.",
                "Referencing a measure inside a calculated column triggers context transition."], difficulty=3)

add("CALCULATE and filter context", "single",
    "A card's title must read 'Sales for North' when one region is selected, and 'Sales for All regions' otherwise.\n\nWhich expression should the title measure use?",
    "A",
    "SELECTEDVALUE returns the single value in the current filter context, or the alternate result when there are none or several. VALUES would error with several regions; MAX would return one region even when several are selected.",
    "Show the selected item or a fallback → SELECTEDVALUE.",
    options=["`\"Sales for \" & SELECTEDVALUE ( Region[Region], \"All regions\" )`", "`\"Sales for \" & VALUES ( Region[Region] )`",
             "`\"Sales for \" & MAX ( Region[Region] )`", "`\"Sales for \" & ALL ( Region[Region] )`"], difficulty=1)

add("CALCULATE and filter context", "single",
    "A measure must show a value on product rows of a matrix but stay blank on category subtotal rows and the grand total.\n\nWhich function tells you whether the current row is at product level?",
    "D",
    "ISINSCOPE ( Product[Product] ) is TRUE when Product is the level currently being grouped, so IF ( ISINSCOPE ( … ), [Measure] ) blanks subtotals. HASONEVALUE can be TRUE at a subtotal when a category holds only one product.",
    "Detect matrix level → ISINSCOPE.",
    options=["HASONEFILTER", "SELECTEDVALUE", "ISFILTERED", "ISINSCOPE"], difficulty=3,
    image=(matrix("Unit Price by Category and Product", ["Category / Product", "Sales", "Unit Price"],
                  [("Footwear", ["538,210", None], 0, True), ("Trail Shoe", ["420,600", "120.00"], 1, False), ("Sandal", ["117,610", "45.00"], 1, False),
                   ("Bags", ["168,940", None], 0, True), ("Daypack", ["168,940", "60.00"], 1, False), ("Total", ["707,150", None], 0, True)],
                  "Matrix where subtotals should be blank", w=640, col_w=[240, 180, 160]),
           "Matrix of Unit Price by Category and Product: product rows show a price, while the Footwear and Bags subtotals and the grand total show blank. Bags contains only one product, Daypack."))

add("CALCULATE and filter context", "single",
    "The matrix in the exhibit shows Rank = RANKX ( Product[Product], [Sales] ). Every product shows 1.\n\nHow should you fix it?",
    "B",
    "In each row, the filter context contains only that product, so it's ranked against itself. ALL ( Product[Product] ) gives RANKX the full list to compare against: RANKX ( ALL ( Product[Product] ), [Sales] ).",
    "RANKX needs the full list → ALL on the ranked column.",
    options=["Use RANKX ( Sales, [Sales] )", "Use RANKX ( ALL ( Product[Product] ), [Sales] )", "Wrap [Sales] in DIVIDE", "Sort the matrix by Sales"],
    image=(matrix("Sales and Rank by Product", ["Product", "Sales", "Rank"],
                  [("Daypack", ["168,940", "1"], 0, False), ("Rain Jacket", ["412,380", "1"], 0, False), ("Trail Shoe", ["538,210", "1"], 0, False),
                   ("Total", ["1,119,530", "1"], 0, True)], "Matrix where every rank is 1", w=560, col_w=[200, 160, 140]),
           "Matrix with Product, Sales and Rank columns where every row, including the total, shows a rank of 1."))

add("CALCULATE and filter context", "single",
    "You need the total sales of the five best-selling products, whatever product filters exist.\n\nWhich expression should you use?",
    "C",
    "TOPN returns a table of the five products with the highest sales (from ALL products), and CALCULATE uses it as a filter. RANKX returns positions, not a filter table.",
    "Total for the top N → CALCULATE with a TOPN table.",
    options=["`TOPN ( 5, [Sales] )`", "`CALCULATE ( [Sales], RANKX ( ALL ( Product[Product] ), [Sales] ) <= 5 )`",
             "`CALCULATE ( [Sales], TOPN ( 5, ALL ( Product[Product] ), [Sales] ) )`", "`MAXX ( TOPN ( 5, Product ), [Sales] )`"], difficulty=3)

add("CALCULATE and filter context", "single",
    "What does this measure return?\n\n`Test = VAR s = [Sales] RETURN CALCULATE ( s, ALL ( 'Date' ) )`",
    "A",
    "A variable is evaluated once, where it's defined, and then behaves as a constant. CALCULATE can't change its value, so Test returns the same as [Sales] in the current context. To ignore date filters, put [Sales] itself inside CALCULATE.",
    "Variables are constants once evaluated; CALCULATE can't change them.",
    options=["The same value as [Sales] in the current filter context", "Sales for all dates", "An error", "Blank"], difficulty=3)

add("CALCULATE and filter context", "single",
    "Sales has an active relationship to Date on OrderDate and an inactive one on DeliveryDate.\n\nWhich expression returns sales by delivery date?",
    "B",
    "USERELATIONSHIP activates the inactive relationship for this calculation and deactivates the active one between the same tables.",
    "Use an inactive relationship → USERELATIONSHIP inside CALCULATE.",
    options=["`CALCULATE ( [Sales], CROSSFILTER ( Sales[DeliveryDate], 'Date'[Date], BOTH ) )`",
             "`CALCULATE ( [Sales], USERELATIONSHIP ( Sales[DeliveryDate], 'Date'[Date] ) )`",
             "`CALCULATE ( [Sales], ALL ( Sales[OrderDate] ) )`", "`CALCULATE ( [Sales], 'Date'[Date] = Sales[DeliveryDate] )`"], difficulty=1)

add("CALCULATE and filter context", "single",
    "The Customer to Sales relationship is single-direction. One measure must count customers who bought the products selected in a Product slicer.\n\nWhat should the measure use?",
    "C",
    "CROSSFILTER ( Sales[CustomerKey], Customer[CustomerKey], BOTH ) makes the relationship bidirectional for this measure only, so the product filter flows through Sales to Customer. Making it permanently bidirectional affects every visual.",
    "Bidirectional for one measure only → CROSSFILTER.",
    options=["USERELATIONSHIP", "KEEPFILTERS", "CROSSFILTER with BOTH", "ALLEXCEPT"], difficulty=3)

add("CALCULATE and filter context", "single",
    "A Budget table has a Category column but no relationship to Product. You need Budget to respond to a Product[Category] slicer without adding a relationship.\n\nWhich expression should you use?",
    "A",
    "TREATAS applies the selected Product categories as a filter on Budget[Category], creating a virtual relationship for this measure.",
    "Virtual relationship in a measure → TREATAS.",
    options=["`CALCULATE ( SUM ( Budget[Amount] ), TREATAS ( VALUES ( Product[Category] ), Budget[Category] ) )`",
             "`CALCULATE ( SUM ( Budget[Amount] ), RELATED ( Product[Category] ) )`", "`SUM ( Budget[Amount] )`",
             "`CALCULATE ( SUM ( Budget[Amount] ), USERELATIONSHIP ( Budget[Category], Product[Category] ) )`"], difficulty=3)

# ================= Time intelligence =================
add("Time intelligence", "single",
    "You need a calendar year-to-date sales measure. The Date table is marked as a date table.\n\nWhich expression should you use?",
    "D",
    "TOTALYTD ( [Sales], 'Date'[Date] ) sums sales from 1 January to the last date in the current context. SAMEPERIODLASTYEAR shifts dates back a year, and DATESMTD is month to date.",
    "Year to date → TOTALYTD (or CALCULATE with DATESYTD).",
    options=["`CALCULATE ( [Sales], SAMEPERIODLASTYEAR ( 'Date'[Date] ) )`", "`CALCULATE ( [Sales], DATESMTD ( 'Date'[Date] ) )`",
             "`SUM ( Sales[Amount] )`", "`TOTALYTD ( [Sales], 'Date'[Date] )`"], difficulty=1)

add("Time intelligence", "single",
    "The financial year ends on 30 June. You need fiscal year-to-date sales.\n\nWhich expression should you use?",
    "B",
    "TOTALYTD's optional year-end argument sets the fiscal year end, here \"6/30\", so the year-to-date restarts on 1 July.",
    "Fiscal YTD → TOTALYTD with a year-end date.",
    options=["`TOTALYTD ( [Sales], 'Date'[Date] )`", "`TOTALYTD ( [Sales], 'Date'[Date], \"6/30\" )`", "`TOTALQTD ( [Sales], 'Date'[Date] )`",
             "`DATEADD ( 'Date'[Date], 6, MONTH )`"])

add("Time intelligence", "single",
    "You need last year's sales for the same period as the current filter context.\n\nWhich expression should you use?",
    "A",
    "SAMEPERIODLASTYEAR shifts the dates in context back exactly one year, whether the context is a day, month or quarter. PREVIOUSYEAR returns the whole previous year.",
    "Same period last year → SAMEPERIODLASTYEAR.",
    options=["`CALCULATE ( [Sales], SAMEPERIODLASTYEAR ( 'Date'[Date] ) )`", "`CALCULATE ( [Sales], PREVIOUSYEAR ( 'Date'[Date] ) )`",
             "`[Sales] - 365`", "`CALCULATE ( [Sales], 'Date'[Year] - 1 )`"], difficulty=1)

add("Time intelligence", "single",
    "The matrix in the exhibit shows Sales and Sales PY (prior year).\n\nWhat should YoY % show for 2026?",
    "C",
    "Year-over-year % = (this year − last year) ÷ last year = (1,320 − 1,200) ÷ 1,200 = 10%. Dividing by this year's sales (9.1%) uses the wrong base.",
    "YoY % = DIVIDE ( [Sales] − [Sales PY], [Sales PY] ).",
    options=["9.1%", "110%", "10.0%", "120"],
    image=(matrix("Sales year over year", ["Year", "Sales", "Sales PY", "YoY %"],
                  [("2025", ["1,200", "1,050", "14.3%"], 0, False), ("2026", ["1,320", "1,200", None], 0, False)],
                  "Matrix with a YoY % value to work out", w=640, col_w=[150, 150, 150, 140], q_col=3),
           "Matrix of Year, Sales, Sales PY and YoY %: 2025 shows 1,200, 1,050 and 14.3%; 2026 shows 1,320 and 1,200, with YoY % unknown."), difficulty=1)

add("Time intelligence", "single",
    "You need last year's year-to-date sales, up to the same date last year. [Sales YTD] already exists.\n\nWhich expression should you use?",
    "B",
    "Shifting the dates back a year with SAMEPERIODLASTYEAR and evaluating [Sales YTD] in that context gives last year's year-to-date up to the matching date. PREVIOUSYEAR would return the full previous year.",
    "Prior-year YTD → [Sales YTD] evaluated over SAMEPERIODLASTYEAR.",
    options=["`CALCULATE ( [Sales YTD], PREVIOUSYEAR ( 'Date'[Date] ) )`", "`CALCULATE ( [Sales YTD], SAMEPERIODLASTYEAR ( 'Date'[Date] ) )`",
             "`TOTALYTD ( [Sales], 'Date'[Date] ) - 1`", "`CALCULATE ( [Sales], DATESYTD ( 'Date'[Date] ) )`"])

add("Time intelligence", "single",
    "A matrix shows sales by day. For each day, you need sales on the same day one month earlier.\n\nWhich expression should you use?",
    "D",
    "DATEADD shifts the current dates by one month, so each day maps to the same day last month. PREVIOUSMONTH returns every date of the previous month, giving the whole month's total on every row.",
    "Shift the current period → DATEADD. Whole previous period → PREVIOUSMONTH.",
    options=["`CALCULATE ( [Sales], PREVIOUSMONTH ( 'Date'[Date] ) )`", "`CALCULATE ( [Sales], DATESMTD ( 'Date'[Date] ) )`",
             "`CALCULATE ( [Sales], PARALLELPERIOD ( 'Date'[Date], -1, YEAR ) )`", "`CALCULATE ( [Sales], DATEADD ( 'Date'[Date], -1, MONTH ) )`"], difficulty=3)

add("Time intelligence", "single",
    "You need a rolling three-month sales total ending on the last date in the current context.\n\nWhich filter should CALCULATE use?",
    "A",
    "DATESINPERIOD returns the dates from the given end date back three months, giving a rolling window. DATESQTD is calendar quarter to date, which resets every quarter.",
    "Rolling window → DATESINPERIOD ( dates, MAX date, −N, unit ).",
    options=["`DATESINPERIOD ( 'Date'[Date], MAX ( 'Date'[Date] ), -3, MONTH )`", "`DATESQTD ( 'Date'[Date] )`",
             "`PREVIOUSQUARTER ( 'Date'[Date] )`", "`DATEADD ( 'Date'[Date], -3, MONTH )`"], difficulty=3)

add("Time intelligence", "single",
    "Which expression returns month-to-date sales?",
    "C",
    "TOTALMTD sums from the first day of the month to the last date in context. TOTALQTD is quarter to date and TOTALYTD is year to date.",
    "MTD / QTD / YTD → TOTALMTD / TOTALQTD / TOTALYTD.",
    options=["`TOTALQTD ( [Sales], 'Date'[Date] )`", "`TOTALYTD ( [Sales], 'Date'[Date] )`", "`TOTALMTD ( [Sales], 'Date'[Date] )`",
             "`CALCULATE ( [Sales], PREVIOUSMONTH ( 'Date'[Date] ) )`"], difficulty=1)

add("Time intelligence", "single",
    "A measure uses SAMEPERIODLASTYEAR ( Sales[OrderDate] ) directly on the fact table. Results are wrong for periods with no sales on some days.\n\nWhat should you do?",
    "B",
    "Time intelligence functions need a date column with every day present (no gaps), which a fact table's date column rarely has. Use a proper Date table, related to Sales and marked as a date table, and reference 'Date'[Date].",
    "Time intelligence → a complete Date table, never the fact table's dates.",
    options=["Wrap the measure in IFERROR", "Use a contiguous Date table, related and marked, and reference its Date column", "Turn on Auto date/time",
             "Use DATEADD instead"])

add("Time intelligence", "single",
    "A card must always show sales for March 2026, whatever the user selects in date slicers.\n\nWhich expression should you use?",
    "D",
    "REMOVEFILTERS('Date') clears every date filter (including a slicer on a different Date column), then the two filters select March 2026. Filtering only Year and Month without clearing would still intersect with filters on other Date columns, such as a selected date range.",
    "Fixed period regardless of slicers → clear the Date table, then filter.",
    options=["`CALCULATE ( [Sales], 'Date'[Month] = 3 )`", "`CALCULATE ( [Sales], KEEPFILTERS ( 'Date'[Year] = 2026 ) )`",
             "`CALCULATE ( [Sales], DATESMTD ( 'Date'[Date] ) )`",
             "`CALCULATE ( [Sales], REMOVEFILTERS ( 'Date' ), 'Date'[Year] = 2026, 'Date'[MonthNumber] = 3 )`"], difficulty=3)

add("Time intelligence", "single",
    "An AccountBalances table has one row per account per day that a balance was recorded; not every account has a row every day. A matrix shows months.\n\nWhich expression returns each month's closing balance using the last date that has data?",
    "A",
    "LASTNONBLANK finds the last date in the period where the balance expression isn't blank, then CALCULATE sums the balances on that date. LASTDATE would use the calendar's last day, which may have no rows, giving blank.",
    "Closing balance when the last day may be empty → LASTNONBLANK.",
    options=["`CALCULATE ( SUM ( AccountBalances[Balance] ), LASTNONBLANK ( 'Date'[Date], CALCULATE ( SUM ( AccountBalances[Balance] ) ) ) )`",
             "`SUM ( AccountBalances[Balance] )`", "`CALCULATE ( SUM ( AccountBalances[Balance] ), LASTDATE ( 'Date'[Date] ) )`",
             "`AVERAGE ( AccountBalances[Balance] )`"], difficulty=3)

add("Time intelligence", "yesno",
    "Accounts = CALCULATE ( DISTINCTCOUNT ( Balances[AccountID] ), LASTDATE ( 'Date'[Date] ) ). For each statement, select Yes if it is true.",
    [True, True, False],
    "LASTDATE returns the last date in the current context, so the measure counts the accounts that have a row on that day. If no rows exist on that exact day (for example a weekend), the result is blank. It does not count every account seen during the period.",
    "LASTDATE = last calendar date in context, whether or not it has data.",
    statements=["In a month row, the measure counts accounts that have a row on the month's last date.",
                "If no balances were recorded on the last day of a month, that month shows blank.",
                "The measure counts every account that had a row at any time during the month."], difficulty=3)

add("Time intelligence", "single",
    "A Headcount table holds one row per department per month, recording headcount on the last day of the month. A matrix shows quarters and years.\n\nWhy is SUM ( Headcount[Employees] ) wrong for a quarter, and what should you use?",
    "C",
    "Headcount is semi-additive: it adds across departments but not across time. Summing three month-end snapshots triples the headcount. Evaluate the sum on the last date of the period instead, for example CALCULATE ( SUM ( … ), LASTDATE ( 'Date'[Date] ) ).",
    "Snapshots add across categories but not over time.",
    options=["It's correct; quarters should add the months", "It counts departments, so use DISTINCTCOUNT", "It adds three month-end snapshots; take the value at the period's last date instead",
             "It needs AVERAGE over all days"],
    image=(matrix("Employees by Quarter and Month", ["Quarter / Month", "SUM of Employees"],
                  [("2026 Q1", ["1,812"], 0, True), ("January", ["600"], 1, False), ("February", ["602"], 1, False), ("March", ["610"], 1, False)],
                  "Matrix summing monthly headcount snapshots", w=520, col_w=[240, 200]),
           "Matrix where January, February and March headcounts are about 600 each, but the 2026 Q1 row shows 1,812."))

add("Time intelligence", "dropdown",
    "You use a quick measure to build a three-month rolling average of Sales, including the current month.\n\nSelect the settings.",
    {"parts": [1, 1, 0]},
    "With monthly periods, the current month plus the two before it make three months. Periods after is 0, since future months shouldn't be included.",
    "N-period rolling window including the current period → N−1 before, 0 after.",
    parts=[{"label": "Period", "options": ["Days", "Months", "Years"]},
           {"label": "Periods before", "options": ["3", "2", "1"]},
           {"label": "Periods after", "options": ["0", "1", "3"]}], difficulty=2)

add("Time intelligence", "single",
    "You need a running total of sales from the first date in the data to the current date in context.\n\nWhich expression should you use?",
    "B",
    "ALL('Date'[Date]) removes the current date filter, and the condition keeps every date up to the current context's last date, giving a cumulative total. Filtering on MIN would only include dates up to the period's start.",
    "Running total → FILTER ( ALL ( dates ), date <= MAX ( date ) ).",
    options=["`CALCULATE ( [Sales], DATESYTD ( 'Date'[Date] ) )`",
             "`CALCULATE ( [Sales], FILTER ( ALL ( 'Date'[Date] ), 'Date'[Date] <= MAX ( 'Date'[Date] ) ) )`",
             "`CALCULATE ( [Sales], FILTER ( ALL ( 'Date'[Date] ), 'Date'[Date] <= MIN ( 'Date'[Date] ) ) )`", "`SUMX ( 'Date', [Sales] )`"], difficulty=3)

add("Time intelligence", "single",
    "A measure returns the change in sales compared with the previous month as a ratio, such as 0.05 for 5% growth.\n\nWhich expression should you use?",
    "D",
    "Get the previous month's sales with DATEADD (or PREVIOUSMONTH at month level), then divide the difference by it. DIVIDE avoids errors when the previous month has no sales.",
    "Change ratio = DIVIDE ( current − previous, previous ).",
    options=["`[Sales] - CALCULATE ( [Sales], DATEADD ( 'Date'[Date], -1, MONTH ) )`", "`DIVIDE ( [Sales], [Sales] )`",
             "`DIVIDE ( CALCULATE ( [Sales], DATEADD ( 'Date'[Date], -1, MONTH ) ), [Sales] )`",
             "`VAR p = CALCULATE ( [Sales], DATEADD ( 'Date'[Date], -1, MONTH ) ) RETURN DIVIDE ( [Sales] - p, p )`"])

# ================= Calculated tables and other functions =================
add("Calculated tables", "single",
    "Sales and Forecast both have date columns. You need a calculated date table covering the earliest to the latest date across both tables.\n\nWhich expression should you use?",
    "A",
    "MIN and MAX each accept two values, so the inner MIN/MAX find each table's extremes and the outer ones compare them. CALENDAR then returns every date in that range. CALENDARAUTO would scan every date column in the model, not just these two.",
    "CALENDAR ( earliest, latest ) across tables → nested MIN/MAX.",
    options=["`CALENDAR ( MIN ( MIN ( Sales[Date] ), MIN ( Forecast[Date] ) ), MAX ( MAX ( Sales[Date] ), MAX ( Forecast[Date] ) ) )`",
             "`CALENDAR ( MIN ( Sales[Date] ), MAX ( Forecast[Date] ) )`", "`UNION ( Sales[Date], Forecast[Date] )`",
             "`CALENDAR ( MAX ( Sales[Date] ), MIN ( Forecast[Date] ) )`"])

add("Calculated tables", "single",
    "You need a date table with 10 full calendar years, ending with the current year.\n\nWhich expression should you use?",
    "C",
    "Start on 1 January nine years before this year and end on 31 December this year: that's ten full years including the current one. YEAR(TODAY())-10 would give eleven years.",
    "N full years including this one → start at YEAR(TODAY()) − (N − 1).",
    options=["`CALENDAR ( DATE ( YEAR ( TODAY () ) - 10, 1, 1 ), DATE ( YEAR ( TODAY () ), 12, 31 ) )`", "`CALENDARAUTO ( 10 )`",
             "`CALENDAR ( DATE ( YEAR ( TODAY () ) - 9, 1, 1 ), DATE ( YEAR ( TODAY () ), 12, 31 ) )`",
             "`CALENDAR ( TODAY () - 3650, TODAY () )`"])

add("Calculated tables", "single",
    "You need a calculated table named Numbers with every integer from −100 to 100.\n\nWhich expression should you use?",
    "B",
    "GENERATESERIES ( start, end, increment ) returns a one-column table (named Value) with the sequence. It's also what numeric range parameters use behind the scenes.",
    "Sequence of numbers → GENERATESERIES.",
    options=["`CALENDAR ( -100, 100 )`", "`GENERATESERIES ( -100, 100, 1 )`", "`SEQUENCE ( -100, 100 )`", "`VALUES ( -100 : 100 )`"], difficulty=1)

add("Calculated tables", "single",
    "You need a calculated table with one row per year and a column holding that year's total sales.\n\nWhich expression should you use?",
    "D",
    "SUMMARIZECOLUMNS groups by the given column and adds named expressions, giving one row per year with its sales.",
    "Grouped summary table in DAX → SUMMARIZECOLUMNS.",
    options=["`VALUES ( 'Date'[Year] )`", "`CALENDAR ( 'Date'[Year], [Total Sales] )`", "`FILTER ( 'Date', [Total Sales] > 0 )`",
             "`SUMMARIZECOLUMNS ( 'Date'[Year], \"Sales\", [Total Sales] )`"])

add("Calculated tables", "single",
    "The exhibit shows two single-column tables. You create ProductList = INTERSECT ( GroupA, GroupB ).\n\nWhich rows does ProductList contain?",
    "A",
    "INTERSECT returns the rows of the first table that also appear in the second: Bags and Shoes. UNION would combine both lists; EXCEPT would return GroupA rows that aren't in GroupB (Hats).",
    "INTERSECT = in both. EXCEPT = in first only. UNION = combined.",
    options=["Bags, Shoes", "Bags, Hats, Shoes, Socks", "Hats", "Socks"],
    image=(pq([("GroupA[Product]", "text"), ("GroupB[Product]", "text")], [["Bags", "Bags"], ["Hats", "Shoes"], ["Shoes", "Socks"]],
              "Two single-column tables: GroupA and GroupB", col_w=[200, 200]),
           "Two lists side by side: GroupA holds Bags, Hats, Shoes; GroupB holds Bags, Shoes, Socks."), difficulty=1)

add("Calculated tables", "single",
    "Sales has a ProductKey that sometimes doesn't exist in Product.\n\nWhat is the difference between VALUES ( Product[Category] ) and DISTINCT ( Product[Category] ) in this model?",
    "C",
    "VALUES can include the extra blank row Power BI adds for unmatched keys; DISTINCT doesn't. That's why the two can return different counts when referential integrity is broken.",
    "VALUES may include the blank row for unmatched keys; DISTINCT doesn't.",
    options=["There's no difference", "DISTINCT includes blanks, VALUES doesn't", "VALUES can include the blank row for unmatched keys; DISTINCT doesn't",
             "VALUES returns a single value, DISTINCT returns a table"], difficulty=3)

add("Calculated tables", "single",
    "Employee has EmployeeID and ParentEmployeeID (the manager). You need a column that lists each employee's chain of managers up to the CEO.\n\nWhich function should you use?",
    "B",
    "PATH ( Employee[EmployeeID], Employee[ParentEmployeeID] ) returns a delimited string of IDs from the top of the hierarchy to the employee. PATHITEM and LOOKUPVALUE then extract each level, for example to build Level 1, Level 2 columns for a hierarchy.",
    "Parent-child hierarchy → PATH, then PATHITEM per level.",
    options=["RELATED", "PATH", "LOOKUPVALUE", "TREATAS"])

add("Calculated tables", "single",
    "You need the number of product categories that had at least one sale in the selected period.\n\nWhich expression should you use?",
    "D",
    "DISTINCTCOUNT ( Product[Category] ) alone counts every category in the Product table, because filters on Date don't reach Product. Adding Sales as a filter table restricts Product to the rows that have matching sales in the current context.",
    "Count dimension items that have facts → use the fact table as a CALCULATE filter.",
    options=["`DISTINCTCOUNT ( Product[Category] )`", "`COUNTROWS ( Product )`", "`DISTINCTCOUNT ( Sales[ProductKey] )`",
             "`CALCULATE ( DISTINCTCOUNT ( Product[Category] ), Sales )`"], difficulty=3)

add("Calculated tables", "single",
    "A Rates table holds Currency, Date and Rate, with no relationship to Sales. You need a calculated column in Sales that returns the rate for each sale's currency and date.\n\nWhich function should you use?",
    "A",
    "LOOKUPVALUE returns a value from a table by matching one or more columns to values, no relationship needed: LOOKUPVALUE ( Rates[Rate], Rates[Currency], Sales[Currency], Rates[Date], Sales[Date] ).",
    "Look up by matching columns without a relationship → LOOKUPVALUE.",
    options=["LOOKUPVALUE", "RELATED", "USERELATIONSHIP", "SELECTEDVALUE"])

# ================= Calculation groups, parameters and newer features =================
add("Calculation groups and parameters", "single",
    "You create a calculation group named Time Calc. Which expression should its Prior Year calculation item use?",
    "C",
    "A calculation item applies to whichever measure is in the visual, referenced through SELECTEDMEASURE (). Writing [Sales] would make every measure return prior-year sales.",
    "Calculation items use SELECTEDMEASURE ().",
    options=["`CALCULATE ( [Sales], SAMEPERIODLASTYEAR ( 'Date'[Date] ) )`", "`SELECTEDVALUE ( 'Time Calc'[Name] )`",
             "`CALCULATE ( SELECTEDMEASURE (), SAMEPERIODLASTYEAR ( 'Date'[Date] ) )`", "`SAMEPERIODLASTYEAR ( SELECTEDMEASURE () )`"], difficulty=2)

add("Calculation groups and parameters", "single",
    "After you create a calculation group, report authors can no longer drag a numeric column into a visual to sum it.\n\nWhy?",
    "B",
    "Creating a calculation group turns on Discourage implicit measures, because calculation groups only work with explicit measures. Authors must use measures you define.",
    "Calculation groups → implicit measures discouraged; use explicit measures.",
    options=["Calculation groups make columns read-only", "The model now discourages implicit measures", "Numeric columns are converted to text",
             "The relationship to the column's table is removed"], difficulty=3)

add("Calculation groups and parameters", "single",
    "Users want a slicer that switches a line chart between Sales, Profit and Units, all of which are measures.\n\nWhat should you create?",
    "A",
    "A field parameter can contain measures as well as columns. Put it in the chart's value well and in a slicer, and the user's choice swaps the measure shown.",
    "Switch measures in a visual → field parameter of measures.",
    options=["A field parameter containing the three measures", "A calculation group", "Three bookmarks", "A numeric range parameter"], difficulty=1)

add("Calculation groups and parameters", "single",
    "You want a running total of Sales across the months shown in one matrix, without adding a new measure to the semantic model.\n\nWhat should you use?",
    "D",
    "Visual calculations are defined on a visual and operate on its data, for example RUNNINGSUM ( [Sales] ). They don't add anything to the model.",
    "Calculation for one visual only → visual calculation.",
    options=["A calculated column", "A calculation group", "A quick measure", "A visual calculation using RUNNINGSUM"], difficulty=3)

add("Calculation groups and parameters", "single",
    "In DAX query view, which keyword must a query begin with to return a table?",
    "C",
    "DAX queries start with EVALUATE followed by a table expression, for example EVALUATE SUMMARIZECOLUMNS ( 'Date'[Year], \"Sales\", [Sales] ). DEFINE can come before it to declare query-scoped measures.",
    "DAX queries → EVALUATE (optionally after DEFINE).",
    options=["SELECT", "RETURN", "EVALUATE", "MEASURE"], difficulty=1)

add("Totals and blanks", "single",
    "The matrix in the exhibit shows Max Price per product, and the total row shows 120 instead of the 270 the finance team expects (the sum of each product's maximum).\n\nHow should you write the measure?",
    "B",
    "In the total row, MAX is evaluated over all products together, so it returns the single highest price. To sum each product's maximum, iterate the products: SUMX ( VALUES ( Product[Product] ), CALCULATE ( MAX ( Sales[Price] ) ) ).",
    "Totals are recalculated in their own context; iterate to sum per-item results.",
    options=["`MAX ( Sales[Price] )`", "`SUMX ( VALUES ( Product[Product] ), CALCULATE ( MAX ( Sales[Price] ) ) )`", "`SUM ( Sales[Price] )`",
             "`MAXX ( Sales, Sales[Price] )`"],
    image=(matrix("Max Price by Product", ["Product", "Max Price"],
                  [("Daypack", ["60"], 0, False), ("Rain Jacket", ["90"], 0, False), ("Trail Shoe", ["120"], 0, False),
                   ("Total", ["120"], 0, True)], "Matrix where the total shows the overall maximum", w=480, col_w=[220, 160]),
           "Matrix of Max Price by Product: Daypack 60, Rain Jacket 90, Trail Shoe 120, and a total of 120."), difficulty=3)

add("Totals and blanks", "single",
    "A colleague adds + 0 to every measure so that blanks show as zero. Matrices now list every product, even those with no sales.\n\nWhy?",
    "C",
    "Visuals hide rows where every measure is blank. Adding 0 turns blanks into zeros, so every row of the dimension has a value and appears. It also makes visuals slower. Leave blanks as blank, or handle zeros only where needed.",
    "Blank hides rows; zero shows them.",
    options=["+ 0 removes relationship filters", "+ 0 turns on Show items with no data", "Blanks become 0, so no row is blank and every product is shown",
             "+ 0 converts the measure to a calculated column"])

add("Totals and blanks", "single",
    "A single card must show 0 instead of (Blank) when there are no sales. Other visuals should keep blanks.\n\nWhat should the card's measure use?",
    "A",
    "COALESCE ( [Sales], 0 ) returns the first non-blank value, so the card shows 0. Using it only in the card's measure keeps other visuals from listing empty rows.",
    "Blank to zero for one visual → COALESCE in a dedicated measure.",
    options=["`COALESCE ( [Sales], 0 )`", "`ISBLANK ( [Sales] )`", "`[Sales] & 0`", "`BLANK () + [Sales]`"], difficulty=1)

add("CALCULATE and filter context", "single",
    "The matrix in the exhibit uses % of Category = DIVIDE ( [Sales], CALCULATE ( [Sales], ALLEXCEPT ( Product, Product[Category] ) ) ).\n\nWhat does it show for Trail Shoe?",
    "C",
    "The denominator keeps only the Category filter, so for Trail Shoe it's Footwear's total, 500. Trail Shoe's 300 ÷ 500 = 60%. Dividing by the grand total (800) would give 37.5%.",
    "ALLEXCEPT keeps the parent's filter: share of the parent group.",
    options=["37.5%", "100%", "60.0%", "300"],
    image=(matrix("Sales by Category and Product", ["Category / Product", "Sales", "% of Category"],
                  [("Footwear", ["500", "100.0%"], 0, True), ("Trail Shoe", ["300", None], 1, False), ("Sandal", ["200", "40.0%"], 1, False),
                   ("Bags", ["300", "100.0%"], 0, True), ("Daypack", ["300", "100.0%"], 1, False), ("Total", ["800", "100.0%"], 0, True)],
                  "Matrix with a share-of-category value to work out", w=640, col_w=[240, 160, 180], q_col=2),
           "Matrix of Sales by Category and Product: Footwear 500 (Trail Shoe 300, Sandal 200 at 40%), Bags 300 (Daypack 300), total 800. Trail Shoe's percentage is unknown."))

add("Time intelligence", "single",
    "The matrix in the exhibit uses a running total measure that adds sales from the first date in the data up to the last date in each row's context.\n\nWhat value appears for March?",
    "B",
    "A running total adds every earlier month to the current one: 100 + 120 + 90 = 310. 90 is March alone, and 210 would stop at February.",
    "Running total = everything up to and including the current period.",
    options=["90", "310", "210", "103.3"],
    image=(matrix("Sales running total", ["Month", "Sales", "Running Total"],
                  [("January", ["100", "100"], 0, False), ("February", ["120", "220"], 0, False), ("March", ["90", None], 0, False)],
                  "Matrix with a running total value to work out", w=560, col_w=[200, 150, 170], q_col=2),
           "Matrix of Month, Sales and Running Total: January 100 and 100, February 120 and 220, March 90 with the running total unknown."), difficulty=1)

B.save()
