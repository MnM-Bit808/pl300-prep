import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from svgkit import pq, dialog, error_pane, merge_dialog, deps
from bankkit import Batch

B = Batch(3, "prepare_transform-load", "Transform and load the data", "prepare", {"prepare": 88})
add = B.add

ORD = ("Orders", [("OrderID", "int"), ("CustomerID", "int"), ("Amount", "dec")],
       [["5001", "301", "420.00"], ["5002", "305", "96.50"], ["5003", "399", "1,180.00"]], 1)
CUS = ("Customers", [("CustomerID", "int"), ("Name", "text"), ("City", "text")],
       [["301", "Ana Silva", "Porto"], ["302", "Li Wei", "Leeds"], ["305", "Omar Haddad", "Dubai"]], 0)

# ================= Merge =================
add("Merge queries", "single",
    "The exhibit shows a Merge you're about to run. Every order must stay in the result.\n\nWhat happens to the 588 orders that have no matching customer?",
    "B",
    "Left outer keeps every row of the first table (Orders). Orders with no matching CustomerID stay, and when you expand the Customers column their Name and City are null. An inner join would drop them, and a left anti join would return only them.",
    "Left outer keeps every first-table row; unmatched rows get nulls.",
    options=["They are removed from the result", "They stay, and the expanded customer columns are null for them",
             "They are moved to a separate query", "The merge fails until every order matches"],
    image=(merge_dialog(ORD, CUS, "Left Outer (all from first, matching from second)",
                        "The selection matches 9,412 of 10,000 rows from the first table.", "Merge dialog: Orders with Customers"),
           "Merge dialog with Orders as the first table and Customers as the second, both keyed on CustomerID, join kind Left Outer. The note says the selection matches 9,412 of 10,000 rows."), difficulty=1)

add("Merge queries", "single",
    "Using the same tables as the previous exhibit, you need a list of only the orders whose CustomerID has no matching customer, so the data team can fix them.\n\nWhich join kind should you choose?",
    "C",
    "Left anti returns only rows from the first table that have no match in the second: the orphan orders. Left outer returns all orders, inner returns only matched ones, and right anti returns customers with no orders.",
    "Rows in the first table with no match → Left anti.",
    options=["Left outer", "Inner", "Left anti", "Right anti"], difficulty=1)

add("Merge queries", "single",
    "The exhibit shows a Merge where no rows match, even though the CustomerID values look identical.\n\nWhat is the most likely cause?",
    "A",
    "Look at the type icons: CustomerID is a whole number in Orders but text in Customers. Merge compares values including their type, so 301 (number) never equals \"301\" (text). Give both columns the same data type before merging.",
    "Merge keys must have the same data type.",
    options=["The key columns have different data types", "The join kind should be Inner", "Fuzzy matching is turned off",
             "The second table has more rows than the first"],
    image=(merge_dialog(ORD, ("Customers", [("CustomerID", "text"), ("Name", "text"), ("City", "text")],
                              [["301", "Ana Silva", "Porto"], ["302", "Li Wei", "Leeds"], ["305", "Omar Haddad", "Dubai"]], 0),
                        "Left Outer (all from first, matching from second)",
                        "!The selection matches 0 of 10,000 rows from the first table.", "Merge dialog with mismatched key types"),
           "Merge dialog where Orders.CustomerID has the whole-number icon and Customers.CustomerID has the text icon. The note warns that the selection matches 0 of 10,000 rows."))

add("Merge queries", "single",
    "After merging Orders with a Promotions table on ProductID and expanding it, Orders has 12,800 rows instead of 10,000. The exhibit shows part of the result.\n\nWhat caused the increase?",
    "D",
    "When a key appears more than once in the second table, each matching row is joined, so an order is repeated once per matching promotion. Make the second table's key unique first (for example keep only the current promotion per product), or aggregate it.",
    "Duplicate keys in the second table multiply rows after a merge.",
    options=["Left outer joins always add rows", "Expanding the column added header rows", "Fuzzy matching created extra matches",
             "ProductID appears more than once in Promotions"],
    image=(pq([("OrderID", "int"), ("ProductID", "int"), ("Amount", "dec"), ("PromoCode", "text")],
              [["5001", "77", "420.00", "SPRING10"], ["5001", "77", "420.00", "LOYAL5"], ["5002", "12", "96.50", "null"], ["5003", "77", "1,180.00", "SPRING10"],
               ["5003", "77", "1,180.00", "LOYAL5"]],
              "Power Query Editor: Orders after merging and expanding Promotions",
              steps=["Source", "Changed Type", "Merged Queries", "Expanded Promotions"], col_w=[120, 130, 130, 150]),
           "Merged result where orders 5001 and 5003 each appear twice, once with promo code SPRING10 and once with LOYAL5."))

add("Merge queries", "single",
    "Daily targets are stored per store per day. You need to merge them into a sales table using both StoreID and Date.\n\nHow do you set up the match in the Merge dialog?",
    "B",
    "Ctrl-select StoreID then Date in the first table, and StoreID then Date in the second, in the same order. Power Query matches on the combination. Merging twice, once per column, would match on each column separately.",
    "Composite keys → select several columns, in the same order, in both tables.",
    options=["Merge on StoreID, then merge the result again on Date", "Select StoreID and Date in both tables, in the same order",
             "Concatenate the two tables first", "Use fuzzy matching on Date"])

add("Merge queries", "dropdown",
    "Sales is the first table and Products is the second in each merge.\n\nSelect the join kind for each requirement.",
    {"parts": [0, 1, 3]},
    "Left outer keeps every sale and adds product details where they exist. Inner keeps only sales whose product exists. Right anti returns rows from the second table (Products) with no match in Sales: products never sold.",
    "Left/Right = whose rows you keep; Outer = all, Inner = matches, Anti = non-matches.",
    parts=[{"label": "Every sale, with product details where available", "options": ["Left outer", "Inner", "Left anti", "Right anti"]},
           {"label": "Only sales whose product exists in Products", "options": ["Left outer", "Inner", "Full outer", "Right anti"]},
           {"label": "Products that have never been sold", "options": ["Left outer", "Inner", "Left anti", "Right anti"]}])

add("Merge queries", "single",
    "You need to combine Orders with Customers, but the original Orders query must stay unchanged because other queries reference it.\n\nWhich command should you use?",
    "C",
    "Merge Queries as New creates a third query containing the result and leaves both originals untouched. Plain Merge Queries adds the step to the selected query, changing Orders.",
    "Keep originals unchanged → Merge Queries as New.",
    options=["Merge Queries", "Append Queries", "Merge Queries as New", "Append Queries as New"], difficulty=1)

add("Merge queries", "single",
    "After expanding a merged Customers column, your new columns are named Customers.Name and Customers.City.\n\nHow could you have avoided the prefix?",
    "A",
    "The expand dialog has a Use original column name as prefix check box. Clear it and the columns keep their plain names (unless a name clashes with an existing column).",
    "Expand dialog → clear 'Use original column name as prefix'.",
    options=["Clear Use original column name as prefix in the expand dialog", "Use Merge Queries as New", "Rename the Customers query",
             "Use an inner join"], difficulty=1)

add("Merge queries", "single",
    "A fuzzy merge matches supplier names from invoices to a supplier list. It wrongly matches Contoso to Contosa Foods.\n\nWhat should you change?",
    "B",
    "The similarity threshold runs from 0 to 1 (default 0.8). Raising it requires closer matches, which removes weak matches like this one. Lowering it would accept even looser matches.",
    "Too many wrong fuzzy matches → raise the similarity threshold.",
    options=["Lower the similarity threshold", "Raise the similarity threshold", "Turn on Ignore case", "Switch to an inner join"], difficulty=3)

add("Merge queries", "single",
    "A fuzzy merge fails to match 'Contoso Ltd' to 'Contoso Limited' and 'Intl' to 'International'.\n\nWhat should you add to the fuzzy matching options?",
    "D",
    "A transformation table maps known equivalents (From → To), such as Ltd → Limited, before the similarity is scored. Raising the threshold would make matching stricter, the opposite of what's needed.",
    "Known abbreviations in a fuzzy merge → transformation table.",
    options=["A higher similarity threshold", "A Remove Duplicates step", "A composite key", "A transformation table"], difficulty=3)

add("Merge queries", "single",
    "OrderHeader has one row per order (OrderID, OrderDate, CustomerID). OrderLines has one row per product on an order (OrderID, ProductID, Quantity, Price). You need one fact table for analysis by date, customer and product.\n\nHow should you merge them?",
    "B",
    "The fact table should be at the most detailed grain, the order line. Merge with OrderLines as the first table (left outer on OrderID) and expand OrderDate and CustomerID. Starting from OrderHeader would need the lines nested or aggregated, losing product detail.",
    "Header + detail → merge the header into the detail table.",
    options=["OrderHeader first, inner join, expand ProductID", "OrderLines first, left outer join on OrderID, expand OrderDate and CustomerID",
             "Append OrderHeader to OrderLines", "Keep both tables and relate them on OrderID only"])

add("Merge queries", "single",
    "Which situation calls for a merge in Power Query rather than a relationship in the model?",
    "C",
    "Merging is for flattening, such as folding Subcategory and Category lookups into Product so the model has one Product dimension (a star rather than a snowflake). Slicing facts by a dimension attribute is exactly what relationships are for.",
    "Merge to flatten lookups; relate to slice facts by dimensions.",
    options=["Filtering Sales by Product[Color] in a report", "Showing sales by Date[Month]", "Folding Subcategory and Category lookups into a single Product table",
             "Using a Region slicer on several fact tables"])

# ================= Append =================
add("Append queries", "single",
    "You append Sales2025 and Sales2026. The exhibit shows the result: Channel is null for every 2025 row.\n\nWhy?",
    "A",
    "Append matches columns by name. Channel exists only in Sales2026, so rows from Sales2025 have no value for it and get null. Nothing is broken; fill or default it if reports need a value.",
    "Append matches by column name; missing columns become null.",
    options=["Sales2025 has no Channel column", "Append matches columns by position", "The 2025 Channel values failed type conversion",
             "Append Queries as New removes columns"],
    image=(pq([("OrderID", "int"), ("Date", "date"), ("Amount", "dec"), ("Channel", "text")],
              [["9001", "30/12/2025", "220.00", "null"], ["9002", "31/12/2025", "75.40", "null"], ["9101", "02/01/2026", "310.00", "Online"],
               ["9102", "02/01/2026", "64.90", "Store"]],
              "Power Query Editor: Sales2025 appended with Sales2026", query_name="Append1",
              steps=["Source"], col_w=[120, 140, 130, 130]),
           "Appended query Append1 where the 2025 rows have null in Channel and the 2026 rows show Online and Store."), difficulty=1)

add("Append queries", "single",
    "Before appending, you notice Amount is named SalesAmount in one of the two queries.\n\nWhat happens if you append without changing it, and how do you fix it?",
    "D",
    "Append matches by name, so you'd get two half-empty columns, Amount and SalesAmount. Rename one so the names match before appending.",
    "Rename columns to match before appending.",
    options=["Power Query matches them by position automatically", "Append fails with an error", "Amount is converted to SalesAmount automatically",
             "You get two separate, half-empty columns; rename one so the names match first"])

add("Append queries", "single",
    "You need to stack four regional queries with identical columns into one new query.\n\nWhat should you do?",
    "B",
    "Append Queries as New has a Three or more tables option, where you add all four queries to one list. Repeated two-table appends work but add needless steps.",
    "Stack several queries → Append as New, three or more tables.",
    options=["Merge Queries as New on a common key", "Append Queries as New, choose Three or more tables, and add all four queries",
             "Append two queries at a time, three times", "Pivot the queries"], difficulty=1)

add("Append queries", "single",
    "An Excel workbook gets a new sheet each month, all with identical columns. You need one table of every sheet, including sheets added in future.\n\nWhat should you do?",
    "C",
    "Connect to the workbook and work from its navigation table (the list of sheets and tables), filter to the sheets you need, and expand their Data column. New sheets then appear automatically on refresh. Selecting sheets individually in the Navigator hard-codes today's sheets.",
    "Sheets added over time → combine from the workbook's sheet list, not individual sheets.",
    options=["Select each sheet in the Navigator and append them", "Use the Folder connector on the workbook",
             "Use the workbook's list of sheets, filter to the sheets, and expand their data", "Merge the sheets on a common key"], difficulty=3)

add("Append queries", "single",
    "Monthly extracts overlap by one day, so after appending, some transactions appear twice with the same TransactionID.\n\nWhat should you do?",
    "A",
    "Remove Duplicates on TransactionID (the unique key) keeps one row per transaction. Removing duplicates across all columns could miss duplicates where a non-key column differs slightly.",
    "Overlapping appended files → Remove Duplicates on the business key.",
    options=["Select TransactionID and Remove Duplicates", "Remove Duplicates across all columns", "Use Keep Duplicates", "Group By Date"])

add("Append queries", "yesno",
    "For each statement about appending queries, select Yes if it is true.",
    [True, False, False],
    "Append lines up columns by name. Columns aren't matched by position. The source queries can have Enable load turned off; the appended query still evaluates them on refresh.",
    "Append = by name; sources can be unloaded staging queries.",
    statements=["Append matches columns by their names.", "Append matches columns by their position.",
                "The source queries must stay loaded into the model for the appended query to refresh."])

add("Append queries", "single",
    "You select Sales_North and choose Append Queries (not as New), adding Sales_South.\n\nWhat is the result?",
    "B",
    "Plain Append Queries adds the step to the selected query, so Sales_North now contains both regions while still being called Sales_North. Append Queries as New would leave both originals unchanged.",
    "Plain Append changes the selected query; 'as New' doesn't.",
    options=["A new query named Append1 with both regions", "Sales_North now contains both regions", "Sales_South now contains both regions",
             "Both queries are deleted and replaced"], difficulty=1)

# ================= Reshape =================
add("Reshape data", "single",
    "The exhibit shows sales with one column per quarter. Reports need a Quarter slicer, and Q1 2027 columns will be added next year.\n\nWhat should you do?",
    "C",
    "Select Region (the column to keep) and choose Unpivot Other Columns. The quarter headers become values in an Attribute column (rename it Quarter) and the numbers go into Value (rename it Sales). Because the step is written as 'everything except Region', new quarter columns are unpivoted automatically.",
    "Values spread across columns → Unpivot Other Columns from the columns to keep.",
    options=["Select the quarter columns and choose Unpivot Only Selected Columns", "Transpose the table", "Select Region and choose Unpivot Other Columns",
             "Pivot the Region column"],
    image=(pq([("Region", "text"), ("2026 Q1", "int"), ("2026 Q2", "int"), ("2026 Q3", "int"), ("2026 Q4", "int")],
              [["North", "412", "438", "455", "470"], ["South", "380", "391", "402", "433"], ["East", "295", "310", "322", "340"]],
              "Power Query Editor: one column per quarter", col_w=[130, 110, 110, 110, 110]),
           "Power Query preview with a Region column and four quarter columns, 2026 Q1 to 2026 Q4, holding sales numbers."), difficulty=1)

add("Reshape data", "single",
    "The exhibit shows a long table with one row per store per metric. Reports need Revenue, Cost and Units as separate columns.\n\nWhat should you do?",
    "A",
    "Pivot Column on Metric, using Value as the values column, turns each metric into its own column with one row per store. Unpivot does the opposite. Transpose would flip the whole table.",
    "Attribute/value rows that should be columns → Pivot Column.",
    options=["Pivot the Metric column, using Value as the values", "Unpivot the Value column", "Transpose the table", "Group By Metric"],
    image=(pq([("Store", "text"), ("Metric", "text"), ("Value", "dec")],
              [["Leeds", "Revenue", "58,330"], ["Leeds", "Cost", "41,120"], ["Leeds", "Units", "1,204"], ["York", "Revenue", "47,120"],
               ["York", "Cost", "33,870"], ["York", "Units", "986"]],
              "Power Query Editor: one row per store per metric", col_w=[140, 140, 140]),
           "Power Query preview with columns Store, Metric and Value, where Metric repeats Revenue, Cost and Units for each store."))

add("Reshape data", "single",
    "You pivot the Metric column with the aggregation set to Don't Aggregate, and some cells show the error in the exhibit.\n\nWhat is the cause?",
    "B",
    "With Don't Aggregate, each store-metric pair must appear once. Some pairs appear more than once (for example two Revenue rows for one store), so Power Query can't put a single value in the cell. Choose an aggregation such as Sum, or remove the duplicates first.",
    "Pivot with Don't Aggregate fails when a row/column pair repeats.",
    options=["Metric contains null values", "Some store and metric pairs appear more than once", "Value has the Text type",
             "Pivoting needs the Value column selected first"],
    image=(error_pane("= Table.Pivot(#\"Changed Type\", List.Distinct(#\"Changed Type\"[Metric]), \"Metric\", \"Value\")",
                      "Expression.Error", "There were too many elements in the enumeration to complete the operation.",
                      ["[List]"], "Power Query error after pivoting without aggregation",
                      steps=["Source", "Changed Type", "Pivoted Column"]),
           "Power Query error pane: Expression.Error, there were too many elements in the enumeration to complete the operation, on the Pivoted Column step."), difficulty=3)

add("Reshape data", "single",
    "A sheet lists one field per row: column A holds field names (Name, Region, Revenue) and columns B to F hold one record each.\n\nHow do you turn it into one row per record?",
    "C",
    "Transpose swaps rows and columns, so each record becomes a row and the field names land in the first row; then Use First Row as Headers. Unpivot and Pivot reshape values within a table rather than flipping its orientation.",
    "Records laid out as columns → Transpose, then promote headers.",
    options=["Unpivot Other Columns", "Pivot Column A", "Transpose, then Use First Row as Headers", "Fill Down column A"],
    image=(pq([("Column1", "text"), ("Column2", "text"), ("Column3", "text"), ("Column4", "text")],
              [["Name", "Leeds", "York", "Hull"], ["Region", "North", "North", "North"], ["Revenue", "58,330", "47,120", "22,410"]],
              "Power Query Editor: one record per column", col_w=[130, 120, 120, 120]),
           "Power Query preview with Column1 holding Name, Region and Revenue, and Columns 2 to 4 each holding one store's values."))

add("Reshape data", "order",
    "An Excel sheet has a title in row 1 and headers Region, 2024, 2025, 2026 in row 2, with sales below. You need columns Region, Year (whole number) and Sales.\n\nSelect the actions you should perform and arrange them in order.",
    ["A", "B", "C", "D", "E"],
    "Remove the title row, promote the real headers, unpivot every column except Region, rename Attribute and Value, then set Year to a whole number (it arrives as text, because it came from column headers). Transpose and Pivot aren't needed.",
    "Title → headers → unpivot → rename → set types.",
    items=["Remove the top 1 row", "Use First Row as Headers", "Select Region and choose Unpivot Other Columns",
           "Rename Attribute to Year and Value to Sales", "Change Year to Whole Number", "Transpose the table", "Pivot the Region column"],
    difficulty=2)

add("Reshape data", "single",
    "A Tags column holds lists such as red;blue;green. Reports need to count products per tag.\n\nWhat should you do?",
    "D",
    "Split Column by Delimiter with ';' and, under Advanced options, Split into Rows gives one row per tag with the product repeated, so counting by tag works. Splitting into columns would scatter tags across Tag.1, Tag.2 and so on.",
    "Lists in one cell → split by delimiter into rows.",
    options=["Split by delimiter into columns", "Extract the first characters", "Replace ';' with a space",
             "Split by the ';' delimiter into rows"],
    image=(pq([("ProductID", "int"), ("Product", "text"), ("Tags", "text")],
              [["11", "Trail Shoe", "red;blue"], ["12", "Rain Jacket", "green"], ["13", "Daypack", "red;green;black"]],
              "Power Query Editor: a Tags column with semicolon-separated lists", col_w=[120, 160, 200]),
           "Power Query preview with ProductID, Product and a Tags column holding values such as red;blue and red;green;black."), difficulty=1)

add("Reshape data", "single",
    "A FullName column holds values such as Haddad, Omar Khalil. You need LastName and the rest of the name in two columns.\n\nHow should you split it?",
    "A",
    "Split by the comma delimiter at the left-most occurrence gives two columns: everything before the first comma and everything after it. Splitting at each occurrence could create more columns if a name has more commas; splitting by spaces would break multi-word names.",
    "Split once at the first delimiter → Left-most delimiter.",
    options=["Split by delimiter ',' at the left-most delimiter", "Split by delimiter ' ' at each occurrence", "Split by number of characters",
             "Split by delimiter ',' into rows"])

add("Reshape data", "single",
    "Product codes always follow the pattern AB12345UK: two letters, five digits, then a two-letter country code. You need the country code in its own column.\n\nWhat should you do?",
    "C",
    "Because the country code is always the last two characters, Extract > Last Characters (2) is the simplest reliable option. A delimiter split needs a separator, which these codes don't have.",
    "Fixed-pattern codes → Extract first/last/range of characters.",
    options=["Split by delimiter", "Unpivot the column", "Add Column > Extract > Last Characters with a count of 2", "Use fuzzy matching"], difficulty=1)

add("Reshape data", "single",
    "You need a column of customer initials (for example AS for Ana Silva) and don't want to write M code.\n\nWhat should you use?",
    "B",
    "Column From Examples lets you type the desired output for a few rows; Power Query infers the transformation and writes the M for you. A conditional column handles if/then rules, not text patterns like this.",
    "Show Power Query the result you want → Column From Examples.",
    options=["Conditional Column", "Column From Examples", "Index Column", "Custom Column with DAX"], difficulty=1)

add("Reshape data", "single",
    "You need to replace an OrderDate column with just the year, without keeping the full date.\n\nWhere should you choose Date > Year?",
    "A",
    "The Transform tab changes the selected column in place. The same command on the Add Column tab keeps OrderDate and adds a new Year column.",
    "Transform tab = change in place; Add Column tab = new column.",
    options=["On the Transform tab", "On the Add Column tab", "In the column's filter menu", "In Data source settings"], difficulty=1)

add("Reshape data", "single",
    "You need an OrderSize column that shows Small below 100, Medium from 100 to 999 and Large from 1,000, based on Amount, without writing code.\n\nWhat should you use?",
    "C",
    "Conditional Column builds if/else-if rules through a dialog (Amount less than 100 → Small, and so on). Grouping would summarise rows, and a merge would need a separate band table.",
    "If/then rules without code → Conditional Column.",
    options=["Group By", "Column From Examples on OrderID", "Conditional Column", "Pivot Column"], difficulty=1)

# ================= Group By =================
add("Group and aggregate", "single",
    "You run the Group By shown in the exhibit on an Orders query with 10,000 rows and 1,450 distinct customers.\n\nWhat does the result contain?",
    "B",
    "Group By returns one row per distinct value of the grouping column, here 1,450 customers, with a new Orders column holding the count of rows for each. The other columns are dropped unless you add them as groupings or aggregations.",
    "Group By = one row per group, plus the aggregations you define.",
    options=["10,000 rows with an extra Orders column", "1,450 rows: CustomerID and the number of orders for each", "One row with the total count",
             "1,450 rows with every original column"],
    image=(dialog(560, "Group By", [
        ("radio", "Specify the column to group by and the desired output.", ["Basic", "Advanced"], 0),
        ("label", "Group by", "CustomerID"),
        ("label", "New column name", "Orders"),
        ("label", "Operation", "Count Rows"),
    ], "Group By dialog"),
        "Group By dialog in Basic mode: group by CustomerID, new column Orders, operation Count Rows."), difficulty=1)

add("Group and aggregate", "single",
    "You need one row per Region and Month with total Amount and the number of orders.\n\nWhat should you do in the Group By dialog?",
    "D",
    "Advanced mode lets you add several grouping columns (Region, Month) and several aggregations (Sum of Amount, Count Rows) in one step. Basic mode allows only one grouping column and one aggregation.",
    "Several groupings or aggregations → Group By, Advanced.",
    options=["Use Basic mode twice", "Group by Region only, then pivot Month", "Use Basic mode with Sum",
             "Use Advanced mode with Region and Month, and add Sum of Amount and Count Rows"])

add("Group and aggregate", "single",
    "Which Group By operation returns, for each group, a nested table of all the rows in that group?",
    "C",
    "All Rows keeps each group's full detail as a nested Table, which you can then transform, for example to keep the latest row per customer. The other operations return single values.",
    "Need each group's detail rows → All Rows.",
    options=["Count Rows", "Count Distinct Rows", "All Rows", "Max"], difficulty=2)

add("Group and aggregate", "single",
    "A transactions table has 40 million rows with a TransactionDateTime column. Reports only show sales by day and store.\n\nWhich Group By produces the smallest table that still meets the requirement?",
    "A",
    "Grouping by the date part (not the date-time) and StoreID gives one row per store per day, the grain reports use. Grouping by date-time keeps every timestamp; grouping by month loses daily detail.",
    "Aggregate to exactly the grain the reports need.",
    options=["Group by Date (date part only) and StoreID, with Sum of Amount", "Group by TransactionDateTime and StoreID, with Sum of Amount",
             "Group by Month and StoreID, with Sum of Amount", "Group by StoreID only, with All Rows"])

add("Group and aggregate", "single",
    "You group a Customers query by City and count rows. The exhibit shows the result.\n\nWhat should you do so each city appears once?",
    "B",
    "Like other Power Query comparisons, Group By is case-sensitive, so Paris and PARIS form separate groups. Standardise the casing (and trim spaces) before grouping.",
    "Group By is case-sensitive; clean text first.",
    options=["Use Count Distinct Rows instead", "Standardise City's casing before the Group By step", "Sort City before grouping",
             "Group by City and Country"],
    image=(pq([("City", "text"), ("Customers", "int")], [["Paris", "412"], ["PARIS", "38"], ["Lyon", "205"], ["paris", "9"]],
              "Power Query Editor: Group By result by City",
              steps=["Source", "Changed Type", "Grouped Rows"], col_w=[180, 140]),
           "Group By result showing separate rows for Paris, PARIS and paris, plus Lyon."))

add("Group and aggregate", "single",
    "You build a Product dimension by removing duplicates from a flat sales query. You need a whole-number surrogate key, starting at 1, for each product row.\n\nWhat should you add?",
    "A",
    "Add Column > Index Column > From 1 numbers the rows 1, 2, 3 and so on, which works as a surrogate key once the table holds one row per product. A conditional column applies rules, not numbering.",
    "Surrogate key in Power Query → Index column from 1.",
    options=["An index column starting from 1", "A conditional column", "A custom column with Text.Length", "A duplicate of ProductName"],
    image=(pq([("ProductName", "text"), ("Category", "text"), ("ProductKey", "int")],
              [["Trail Shoe", "Footwear", "1"], ["Rain Jacket", "Apparel", "2"], ["Daypack", "Bags", "3"]],
              "Power Query Editor: Product dimension with a new key column",
              steps=["Source", "Removed Other Columns", "Removed Duplicates", "Added Index"], col_w=[170, 140, 130]),
           "Product query after Removed Duplicates and Added Index, with a new ProductKey column numbered 1, 2, 3."), difficulty=1)

# ================= Query structure and loading =================
add("Query structure and loading", "single",
    "A flat AllSales query holds sales and product columns together. You need a Product dimension that automatically picks up any future cleaning steps added to AllSales.\n\nHow should you create it?",
    "B",
    "Reference starts the new query from the output of AllSales, so later changes to AllSales flow into it. Keep the product columns and remove duplicates. Duplicate copies the steps once, so later fixes wouldn't reach it.",
    "Build a dimension from a staging query → Reference, not Duplicate.",
    options=["Duplicate AllSales, keep the product columns, remove duplicates", "Reference AllSales, keep the product columns, remove duplicates",
             "Append AllSales to itself", "Create a calculated table with DAX"])

add("Query structure and loading", "order",
    "Create a Product dimension from the AllSales query so that it stays in sync with AllSales.\n\nSelect the actions you should perform and arrange them in order.",
    ["A", "B", "C", "D"],
    "Reference AllSales, keep only the product columns, remove duplicates on ProductID so there's one row per product, then give the query a clear name. Duplicating would break the link to AllSales; appending would add rows, not remove them.",
    "Reference → choose columns → remove duplicates → rename.",
    items=["Right-click AllSales and select Reference", "Choose Columns: ProductID, ProductName, Category",
           "Select ProductID and Remove Duplicates", "Rename the query Product", "Right-click AllSales and select Duplicate",
           "Append AllSales to the new query"])

add("Query structure and loading", "single",
    "AllSales now only feeds the Product, Customer and Sales queries built from it.\n\nWhat should you change on AllSales to avoid loading the same data twice?",
    "C",
    "Turn off Enable load on AllSales. It stays in Power Query as a staging query, the queries that reference it still refresh, and the model only holds the star schema tables.",
    "Staging queries → Enable load off.",
    options=["Delete AllSales", "Turn off Include in report refresh", "Turn off Enable load", "Convert AllSales to a parameter"], difficulty=1)

add("Query structure and loading", "single",
    "A Holidays table loaded from a static file never changes. You want it to stay in the model but skip it during refresh to save time.\n\nWhat should you change?",
    "D",
    "Include in report refresh controls whether a loaded query is refreshed; turning it off keeps the existing data in the model. Turning off Enable load would remove the table from the model entirely.",
    "Keep in model, skip refreshing → clear Include in report refresh.",
    options=["Turn off Enable load", "Delete the query after the first load", "Mark it as a date table", "Turn off Include in report refresh"])

add("Query structure and loading", "single",
    "The exhibit shows Query Dependencies. You add a step to AllSales that renames Product Name to ProductName.\n\nWhich queries can be affected?",
    "B",
    "Product, Customer and Sales all reference AllSales, so any change to its output flows into all three (and could break steps that use the old name). The source file itself isn't changed by Power Query.",
    "A change to a referenced query flows to everything downstream.",
    options=["Only AllSales", "AllSales, Product, Customer and Sales", "Only Product", "The source Excel file"],
    image=(deps({
        "Sales_2026.xlsx": (30, 170, 190, ["Excel workbook", "C:\\Data\\"], "source"),
        "AllSales": (290, 170, 180, ["Not loaded (staging)"], "staging"),
        "Product": (560, 50, 170, ["Loaded to model"], "query"),
        "Customer": (560, 170, 170, ["Loaded to model"], "query"),
        "Sales": (560, 290, 170, ["Loaded to model"], "query"),
    }, [("Sales_2026.xlsx", "AllSales"), ("AllSales", "Product"), ("AllSales", "Customer"), ("AllSales", "Sales")],
        "Query Dependencies view", w=780, h=400, legend="Dashed border: query with Enable load turned off."),
        "Query dependencies: an Excel workbook feeds AllSales (a staging query that isn't loaded), which feeds Product, Customer and Sales, all loaded to the model."))

add("Query structure and loading", "single",
    "The source table regularly gains new columns that reports don't need. The model must not grow when that happens.\n\nWhich step should you use?",
    "A",
    "Choose Columns (Remove Other Columns) lists the columns to keep, so new source columns are excluded automatically. Remove Columns lists the columns to drop, so any new column passes through and loads.",
    "Lock the column list → Choose Columns / Remove Other Columns.",
    options=["Choose Columns (Remove Other Columns)", "Remove Columns", "Unpivot Other Columns", "Promote Headers"])

add("Query structure and loading", "single",
    "Only rows with Status = Finished are used in reports. The source is SQL Server, and the query later adds a non-folding step.\n\nWhere should you filter on Status?",
    "C",
    "Filter as early as possible, before any step that breaks folding, so the filter becomes part of the SQL and unwanted rows never leave the server. Filtering after a non-folding step forces Power Query to download every row first; a report filter still loads them all.",
    "Filter early, before non-folding steps.",
    options=["In a report-level filter", "As the last step of the query", "Early in the query, before the non-folding step", "In a calculated table"])

add("Query structure and loading", "single",
    "The Order table has 100 million rows. During development you want to work with a small sample in Power BI Desktop, then publish with the full data, editing as little as possible.\n\nWhat should you do?",
    "B",
    "Add a parameter (for example RowLimit) used in a Keep Top Rows step, or in a filter, while developing; after publishing, change the parameter in the semantic model settings so the service loads everything. Editing queries before every publish is error-prone.",
    "Dev sample → a parameter controlling rows, changed in the service after publishing.",
    options=["Copy 1,000 rows into an Excel file and connect to that", "Use a parameter in a Keep Top Rows or filter step, and change it in the service after publishing",
             "Use DirectQuery in Desktop and Import in the service", "Turn off Enable load during development"], difficulty=3)

add("Query structure and loading", "single",
    "What does Close & Apply do in Power Query Editor?",
    "A",
    "Close & Apply closes the editor and applies the query changes, loading the results into the model. Apply alone loads without closing. Neither publishes anything.",
    "Close & Apply = load changes into the model.",
    options=["Closes the editor and loads the query changes into the model", "Publishes the report to the service",
             "Discards unsaved query changes", "Refreshes only the selected query"], difficulty=1)

B.save()
