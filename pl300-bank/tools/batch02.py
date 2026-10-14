import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from svgkit import pq, colprofile, error_pane
from bankkit import Batch

B = Batch(2, "prepare_profile-clean", "Profile and clean the data", "prepare", {"prepare": 43})
add = B.add

# ================= Profiling =================
add("Profile the data", "single",
    "You turn on Column quality in Power Query Editor. The exhibit shows the result for four columns of an Orders query.\n\nWhich statement is true?",
    "C",
    "Column quality splits each column into Valid, Error and Empty. Revenue shows 3% Error, which means some values failed a step, usually a type conversion such as text that couldn't become a number. Email has 8% Empty (missing values), not errors. CustomerID and Region are 100% valid, though that says nothing about duplicates.",
    "Column quality: Valid / Error / Empty per column. Error usually = failed type conversion.",
    options=["Email contains values that failed type conversion", "CustomerID contains duplicate values",
             "Revenue contains values that failed a step such as a type conversion", "Region contains missing values"],
    image=(pq([("CustomerID", "int"), ("Email", "text"), ("Revenue", "dec"), ("Region", "text")],
              [["10021", "ana@contoso.com", "1,240.00", "North"], ["10022", "null", "860.50", "South"],
               ["10023", "li@fabrikam.com", "Error", "East"]],
              "Power Query Editor with column quality shown",
              profile=[(100, 0, 0, "1,000 distinct, 1,000 unique"), (92, 0, 8, "905 distinct, 905 unique"),
                       (97, 3, 0, "961 distinct, 948 unique"), (100, 0, 0, "4 distinct, 0 unique")],
              col_w=[170, 190, 170, 170], footer="Column profiling based on top 1000 rows"),
           "Power Query preview of four columns with quality bars: CustomerID 100% valid, Email 92% valid and 8% empty, Revenue 97% valid and 3% error, Region 100% valid."))

add("Profile the data", "dropdown",
    "The exhibit shows column distribution for the State column of a 25,000-row Customers query.\n\nSelect the answer that completes each statement.",
    {"parts": [1, 0, 2]},
    "Distinct counts how many different values appear (48 states). Unique counts values that appear exactly once (31). Both figures come from the first 1,000 rows only, as the status bar says, so they describe a sample, not all 25,000 rows.",
    "Distinct = different values. Unique = values that appear exactly once. Default sample = top 1,000 rows.",
    parts=[{"label": "The number of different State values in the sample is", "options": ["31", "48", "1,000", "25,000"]},
           {"label": "The number of State values that appear exactly once in the sample is", "options": ["31", "48", "17", "952"]},
           {"label": "These figures are based on", "options": ["all 25,000 rows", "the rows currently visible on screen", "the first 1,000 rows"]}],
    image=(pq([("CustomerID", "int"), ("State", "text"), ("Segment", "text")],
              [["50114", "Texas", "Retail"], ["50115", "Ohio", "Corporate"], ["50116", "Texas", "Retail"]],
              "Power Query Editor with column distribution for State",
              profile=[(100, 0, 0, "1,000 distinct, 1,000 unique"), (100, 0, 0, "48 distinct, 31 unique"), (100, 0, 0, "3 distinct, 0 unique")],
              col_w=[180, 190, 180], footer="Column profiling based on top 1000 rows"),
           "Power Query preview showing CustomerID 1,000 distinct and 1,000 unique, State 48 distinct and 31 unique, Segment 3 distinct and 0 unique, with the status bar reading column profiling based on top 1000 rows."), difficulty=1)

add("Profile the data", "single",
    "A Customers query returns 80,000 rows. Before using Email as a key, you must confirm that no email address appears twice in the whole query.\n\nWhat should you do first?",
    "B",
    "Profiling looks only at the first 1,000 rows unless you change it. Switch the status bar setting to Column profiling based on entire data set, then check that distinct, unique and the row count are all equal. Removing duplicates would hide the problem rather than confirm it.",
    "Profiling a whole table → switch to 'based on entire data set'.",
    options=["Turn on Column quality", "Change column profiling to be based on the entire data set",
             "Apply Remove Duplicates to Email", "Sort Email in ascending order"])

add("Profile the data", "single",
    "The exhibit shows the column profile of an Age column in a patient registration query.\n\nWhat does the profile reveal?",
    "D",
    "Column statistics show a minimum of -1 and a maximum of 212, which are impossible ages. They're probably placeholders or data entry errors. There are no errors or empty values, and 87 distinct values is normal for ages, so the problem is out-of-range values that need replacing or filtering.",
    "Min/Max in the column profile are the quickest check for impossible values.",
    options=["The column contains conversion errors", "The column is mostly empty", "The column has too many distinct values to load",
             "The column contains out-of-range values that need investigating"],
    image=(colprofile("Age", "int",
                      [("Count", "1,000"), ("Error", "0"), ("Empty", "0"), ("Distinct", "87"), ("Unique", "9"),
                       ("Min", "-1"), ("Max", "212"), ("Average", "41.6"), ("Zero", "0")],
                      [("-1", 14), ("0-17", 96), ("18-34", 288), ("35-49", 262), ("50-64", 214), ("65-99", 121), ("212", 5)],
                      "Column profile for Age"),
           "Column profile for Age: count 1,000, no errors or empties, 87 distinct, min -1, max 212, average 41.6. The value distribution has small bars at -1 and 212."))

add("Profile the data", "single",
    "Product descriptions come from a free-text field. You need to see how many descriptions are 0–50, 51–100 and over 100 characters long. The check must not add any step to the query or change the model.\n\nWhat should you use?",
    "A",
    "In the column profile, the value distribution can be grouped by Text length, which shows how many values have each length without adding a step. Adding a Text.Length custom column would change the query and the model.",
    "Inspect text lengths without changing the query → Column profile grouped by Text length.",
    options=["The column profile, with the value distribution grouped by Text length", "A custom column using Text.Length",
             "A calculated column using LEN", "Column quality"],
    image=(colprofile("Description", "text",
                      [("Count", "1,000"), ("Error", "0"), ("Empty", "37"), ("Distinct", "941"), ("Unique", "918"),
                       ("Empty string", "12"), ("Min", "(text)"), ("Max", "(text)")],
                      [("0", 12), ("1-25", 64), ("26-50", 233), ("51-100", 418), ("101-200", 228), ("200+", 8)],
                      "Column profile for Description grouped by text length", group_by="Text length"),
           "Column profile for a Description text column. The value distribution is grouped by text length, with the largest bar at 51 to 100 characters."), difficulty=2)

add("Profile the data", "single",
    "Column quality shows 12% Empty for the Phone column.\n\nWhich values does Power Query count as Empty?",
    "C",
    "Empty counts both null and empty text (\"\"). The column profile's statistics list them separately as Empty and Empty string if you need to tell them apart. Zeros are valid values.",
    "Empty = null + empty string.",
    options=["Only null values", "Only empty text values", "Null values and empty text values", "Zeros and null values"])

add("Profile the data", "yesno",
    "For each statement about Power Query data profiling, select Yes if it is true.",
    [True, False, True],
    "The column profile shows statistics and value distribution for the one selected column. Profiling only describes the data; it never adds steps or changes values. Column quality, distribution and profile are switched on from the View tab.",
    "Profiling describes data; it never changes it.",
    statements=["The column profile shows statistics for the currently selected column.",
                "Turning on column profiling adds a step to Applied steps.",
                "Column quality and column distribution are turned on from the View tab."], difficulty=1)

add("Profile the data", "single",
    "Which profiling feature shows a small value-distribution histogram under every column header at once?",
    "B",
    "Column distribution shows a mini histogram plus distinct and unique counts under each header. Column quality shows Valid, Error and Empty percentages; Column profile shows full detail for one selected column.",
    "Distribution for all columns at a glance → Column distribution.",
    options=["Column quality", "Column distribution", "Column profile", "Query diagnostics"], difficulty=1)

add("Profile the data", "single",
    "An OrderDate column has the Text data type. Column quality shows 100% Valid, but you know some rows contain TBD.\n\nWhy isn't TBD flagged, and how do you surface it?",
    "A",
    "Quality is judged against the column's type, and any text is valid text. Changing the type to Date makes rows that can't convert, such as TBD, show as Error, which column quality then reports.",
    "Errors appear only after a type change fails; check quality after setting types.",
    options=["TBD is valid text. Change the column to the Date type and check column quality again",
             "Profiling ignores the first 1,000 rows. Switch to the entire data set",
             "Column quality only checks numeric columns. Use column distribution instead",
             "TBD is treated as null. Use Remove Empty"],
    image=(pq([("OrderID", "int"), ("OrderDate", "text"), ("Amount", "dec")],
              [["5101", "2026-09-14", "320.00"], ["5102", "TBD", "145.50"], ["5103", "2026-09-15", "980.25"]],
              "Power Query Editor with a Text-typed OrderDate column",
              profile=[(100, 0, 0, "1,000 distinct, 1,000 unique"), (100, 0, 0, "212 distinct, 3 unique"), (100, 0, 0, "988 distinct, 977 unique")],
              col_w=[150, 190, 160]),
           "Power Query preview where OrderDate has the ABC text type and 100% valid quality, with one row showing TBD."))

add("Profile the data", "dropdown",
    "The exhibit shows the column profile of DaysToShip.\n\nSelect the answer that completes each statement.",
    {"parts": [2, 0, 1]},
    "Empty is 120, so 120 rows have no value. Unique is 4: four values appear exactly once. Distinct is 18 different values in total. The count of 1,000 includes empty rows.",
    "Read Empty, Distinct and Unique separately; they answer different questions.",
    parts=[{"label": "Rows with no value", "options": ["4", "18", "120", "1,000"]},
           {"label": "Values that appear exactly once", "options": ["4", "18", "120", "880"]},
           {"label": "Different values in the column", "options": ["4", "18", "120", "1,000"]}],
    image=(colprofile("DaysToShip", "int",
                      [("Count", "1,000"), ("Error", "0"), ("Empty", "120"), ("Distinct", "18"), ("Unique", "4"),
                       ("Min", "0"), ("Max", "21"), ("Average", "4.2"), ("Zero", "35")],
                      [("0", 35), ("1", 140), ("2", 212), ("3", 168), ("4", 115), ("5-7", 130), ("8+", 80)],
                      "Column profile for DaysToShip"),
           "Column profile for DaysToShip: count 1,000, error 0, empty 120, distinct 18, unique 4, min 0, max 21, average 4.2."))

add("Profile the data", "single",
    "The exhibit shows the column profile of a Quantity column. The business confirms that 9999 is a placeholder meaning 'not recorded'.\n\nWhat should you do so totals and averages aren't distorted?",
    "B",
    "Replacing the placeholder with null makes those rows count as missing, so SUM and AVERAGE ignore them. Removing the rows would also drop their other columns, such as revenue. Replacing with 0 would still drag averages down.",
    "Placeholder values → replace with null, not 0.",
    options=["Remove rows where Quantity is 9999", "Replace 9999 with null", "Replace 9999 with 0", "Change Quantity to the Text type"],
    image=(colprofile("Quantity", "int",
                      [("Count", "1,000"), ("Error", "0"), ("Empty", "0"), ("Distinct", "41"), ("Unique", "2"),
                       ("Min", "1"), ("Max", "9,999"), ("Average", "368.4"), ("Zero", "0")],
                      [("1", 210), ("2", 188), ("3-5", 241), ("6-10", 162), ("11-50", 140), ("51-99", 22), ("9999", 37)],
                      "Column profile for Quantity"),
           "Column profile for Quantity: max 9,999 and average 368.4, with a bar of 37 rows at 9999 and every other value between 1 and 99."))

# ================= Inconsistent values =================
add("Resolve inconsistent values", "multi",
    "The column profile of Region shows separate bars for North, north and 'North ' (with a trailing space).\n\nWhich two transformations make every variant appear as North? Each correct answer presents part of the solution.",
    ["A", "B"],
    "Trim removes leading and trailing spaces, and Capitalize Each Word standardises the casing. Together they turn all three variants into North. Clean removes non-printable characters, not spaces. Remove Duplicates is case-sensitive and would keep all three.",
    "Inconsistent text → Trim (spaces) + a casing transform.",
    options=["Trim", "Capitalize Each Word", "Clean", "Remove Duplicates", "Fill Down"], select=2,
    image=(colprofile("Region", "text",
                      [("Count", "1,000"), ("Error", "0"), ("Empty", "0"), ("Distinct", "7"), ("Unique", "0")],
                      [("North", 212), ("north", 41), ("North ", 18), ("South", 255), ("East", 236), ("West", 219), ("WEST", 19)],
                      "Column profile for Region with inconsistent values", footer=None),
           "Value distribution for Region with bars for North, north, North with a trailing space, South, East, West and WEST."))

add("Resolve inconsistent values", "single",
    "Customer names exported from an old system look correct, but filters on them fail because some values contain hidden line-feed characters.\n\nWhich transformation removes them?",
    "C",
    "Clean removes non-printable control characters such as line feeds. Trim only removes spaces at the start and end. Lowercase changes casing.",
    "Hidden non-printable characters → Clean. Extra spaces → Trim.",
    options=["Trim", "lowercase", "Clean", "Capitalize Each Word"])

add("Resolve inconsistent values", "single",
    "You select Country and choose Remove Duplicates. The exhibit shows the result.\n\nWhy do France and FRANCE both remain?",
    "B",
    "Power Query comparisons are case-sensitive, so France and FRANCE are different values. Standardise the casing first, then remove duplicates. Note that the Power BI model itself is case-insensitive, which is why leaving them would cause problems later.",
    "Power Query is case-sensitive: fix casing before Remove Duplicates.",
    options=["Remove Duplicates only checks the first 1,000 rows", "Power Query treats values with different casing as different values",
             "One of the values has a trailing space", "Remove Duplicates keeps one row per original source file"],
    image=(pq([("Country", "text")], [["France"], ["FRANCE"], ["Germany"], ["Spain"]],
              "Power Query Editor after Remove Duplicates on Country",
              steps=["Source", "Removed Other Columns", "Removed Duplicates"], col_w=[220]),
           "Power Query result after Removed Duplicates, still showing both France and FRANCE, plus Germany and Spain."), difficulty=1)

add("Resolve inconsistent values", "single",
    "You need to list the OrderID values that appear more than once in a query so you can investigate them.\n\nWhat should you do?",
    "A",
    "Keep Rows > Keep Duplicates keeps only rows whose selected column values occur more than once. Remove Duplicates does the opposite, and Column quality doesn't show duplicates.",
    "Investigate duplicates → Keep Duplicates.",
    options=["Select OrderID, then Home > Keep Rows > Keep Duplicates", "Select OrderID, then Remove Duplicates",
             "Turn on Column quality", "Sort OrderID descending"], difficulty=1)

add("Resolve inconsistent values", "single",
    "You select only the Email column of a Contacts query and choose Remove Duplicates. Several contacts share an email address.\n\nWhich rows remain?",
    "C",
    "Remove Duplicates on selected columns keeps one row per distinct value in those columns (the first one it encounters) and keeps all of that row's columns. Other rows with the same email are removed, even if their other columns differ.",
    "Remove Duplicates on a column keeps the first row per value.",
    options=["Only rows where every column is identical", "No rows, because duplicates exist", "The first row for each email address, with all its columns",
             "The last row for each email address"])

add("Resolve inconsistent values", "single",
    "A StreetType column holds abbreviations such as St, Rd and Ave, plus a few full words such as Station. You replace St with Street, and Station becomes Streetation.\n\nWhat should you change?",
    "D",
    "By default, Replace Values on text replaces the text wherever it appears inside a value. Under Advanced options, tick Match entire cell contents so only cells that are exactly St change, and Station is left alone.",
    "Replace Values matches inside text unless 'Match entire cell contents' is ticked.",
    options=["Use Trim before replacing", "Replace 'st' in lowercase instead", "Use Replace Errors instead",
             "Tick Match entire cell contents in Replace Values"])

add("Resolve inconsistent values", "single",
    "A Country column contains about 40 countries, each written several ways (UK, U.K., United Kingdom, and so on). The business maintains the list of variants and keeps adding new ones.\n\nWhat is the most maintainable way to standardise the values?",
    "B",
    "A mapping table of variant to standard name, merged into the query, handles any number of variants, and the business can add new rows without anyone editing the query. Dozens of Replace Values steps would need editing for every new variant.",
    "Many changing variants → mapping table + merge.",
    options=["Add a Replace Values step for each variant", "Merge with a mapping table of variants and standard names",
             "Use Capitalize Each Word", "Use Column from Examples once"], difficulty=3)

# ================= Nulls and blanks =================
add("Resolve nulls and blanks", "single",
    "The exhibit shows data imported from a spreadsheet with merged Region cells. Each region name appears only on the first row of its group.\n\nWhat should you do?",
    "A",
    "Fill Down copies the last non-null value into the null cells below it until it reaches the next value, which is exactly the merged-cell pattern. Fill Up copies upwards, which would assign rows to the wrong region.",
    "Merged-cell exports with nulls below each label → Fill Down.",
    options=["Fill Down on Region", "Fill Up on Region", "Remove Empty on Region", "Replace null with Unknown"],
    image=(pq([("Region", "text"), ("Store", "text"), ("Sales", "dec")],
              [["North", "Leeds", "41,200"], ["null", "York", "38,950"], ["null", "Hull", "22,410"],
               ["South", "Brighton", "47,880"], ["null", "Bath", "30,120"]],
              "Power Query Editor: Region appears only on the first row of each group", col_w=[150, 170, 140]),
           "Power Query preview where Region shows North then null, null, then South then null; Store and Sales are filled on every row."), difficulty=1)

add("Resolve nulls and blanks", "single",
    "You apply Fill Down to the Region column in the exhibit, but nothing changes.\n\nWhat should you do first?",
    "C",
    "Fill Down only fills null cells. These cells hold empty text, which isn't null. Replace the empty values with null first (Replace Values, leaving Value To Find empty and typing null as the replacement), then Fill Down works.",
    "Fill Down ignores empty strings; convert them to null first.",
    options=["Use Fill Up instead", "Change Region to the Any type", "Replace the empty values in Region with null", "Trim the Region column"],
    image=(pq([("Region", "text"), ("Store", "text"), ("Sales", "dec")],
              [["North", "Leeds", "41,200"], ["", "York", "38,950"], ["", "Hull", "22,410"], ["South", "Brighton", "47,880"]],
              "Power Query Editor: Region cells below each label are empty text",
              steps=["Source", "Promoted Headers", "Changed Type", "Filled Down"], col_w=[150, 170, 140]),
           "Power Query preview after a Filled Down step where Region shows North then two blank cells (not null), then South."), difficulty=3)

add("Resolve nulls and blanks", "single",
    "A report export puts each group's label on the last row of the group, with nulls in the rows above it.\n\nWhich transformation assigns the right label to every row?",
    "B",
    "Fill Up copies each value into the null cells above it, which matches labels placed at the bottom of each group. Fill Down would copy each label into the next group.",
    "Label at the bottom of each group → Fill Up.",
    options=["Fill Down", "Fill Up", "Remove Blank Rows", "Replace Errors"])

add("Resolve nulls and blanks", "single",
    "Survey Score is null when a respondent skipped a question. Managers want the average score of answered questions only.\n\nHow should you handle the nulls?",
    "A",
    "AVERAGE ignores blanks, so leaving the nulls gives the average of answered questions. Replacing them with 0 counts skipped questions as scores of zero and lowers the average. Removing the rows would also remove those respondents' other answers.",
    "Nulls are ignored by averages; zeros are not.",
    options=["Leave them as null", "Replace them with 0", "Remove the rows", "Replace them with the text N/A"])

add("Resolve nulls and blanks", "single",
    "A CompletedDate column uses the text values N/A, '-' and blank to mean 'not completed'.\n\nWhat should you do before changing the column to the Date type?",
    "C",
    "Converting the variants to null means the type change succeeds, profiling counts them as Empty, and DAX treats them as blank. Leaving them as text would make them errors when the type changes, and replacing errors afterwards hides what they meant.",
    "Text markers for 'missing' → replace with null before changing type.",
    options=["Remove the rows", "Replace them with 01/01/1900", "Replace N/A, '-' and empty values with null",
             "Change the type first and remove errors"])

add("Resolve nulls and blanks", "single",
    "In Replace Values, how do you target null cells?",
    "B",
    "Type null (lowercase, without quotes) in Value To Find. Power Query then replaces true nulls rather than the text 'null'.",
    "Replace nulls → type null in Value To Find.",
    options=["Leave Value To Find empty", "Type null in Value To Find", "Type \"null\" in quotes", "Use Replace Errors"], difficulty=1)

add("Resolve nulls and blanks", "single",
    "The Product dimension contains 3 rows where ProductKey is null.\n\nWhat should you do before creating a one-to-many relationship to the Sales table?",
    "D",
    "A dimension's key must be unique and non-blank. Rows with a null key can't be matched and break the 'one' side. Filter them out (Remove Empty on ProductKey), or replace them with a proper Unknown member key if facts point to it. Fill Down would invent keys.",
    "Dimension keys must be unique and not blank.",
    options=["Fill Down ProductKey", "Replace null with 0 in every column", "Leave them; Power BI ignores null keys",
             "Remove the rows with a null ProductKey (or give them a defined Unknown key)"])

add("Resolve nulls and blanks", "single",
    "An Excel export has spacer rows where every column is empty.\n\nWhich command removes only those rows?",
    "B",
    "Remove Rows > Remove Blank Rows deletes rows where every column is null or empty. Remove Empty from a column's filter removes rows where that one column is empty, which could delete rows that have data elsewhere.",
    "Entirely empty rows → Remove Blank Rows.",
    options=["Remove Empty on the first column", "Home > Remove Rows > Remove Blank Rows", "Remove Duplicates", "Remove Errors"], difficulty=1)

# ================= Errors =================
add("Resolve errors", "single",
    "In Excel, some cells in a Margin column show #N/A. In Power Query they appear as Error. All rows must be kept, and those margins should be treated as missing.\n\nWhat should you do?",
    "A",
    "Excel error values arrive in Power Query as errors. Replace Errors with null keeps every row and marks the value as missing. Remove Errors deletes the rows; replacing with 0 would count them as zero margin.",
    "Excel #N/A → Power Query Error → Replace Errors (with null if 'missing').",
    options=["Replace errors with null", "Remove errors", "Replace errors with 0", "Keep errors"],
    image=(pq([("Product", "text"), ("Units", "int"), ("Margin", "dec")],
              [["Trail Shoe", "120", "0.31"], ["Rain Jacket", "45", "Error"], ["Daypack", "88", "0.27"], ["Gaiters", "16", "Error"]],
              "Power Query Editor: Excel #N/A values shown as Error",
              profile=[(100, 0, 0, "212 distinct, 212 unique"), (100, 0, 0, "96 distinct, 40 unique"), (94, 6, 0, "61 distinct, 30 unique")],
              col_w=[170, 130, 150]),
           "Power Query preview where the Margin column shows Error in two rows and 6% error in column quality."))

add("Resolve errors", "order",
    "A Discount column is text. Some rows contain N/A, which becomes an error when converted. Some rows are null. Every row must be kept, and both errors and nulls must become 0.\n\nSelect the actions you should perform and arrange them in order.",
    ["A", "B", "C"],
    "Errors only exist after the type change, so change the type first, then replace the errors that it creates, then replace the nulls. Removing or keeping errors would drop rows.",
    "Change type → Replace Errors → replace nulls.",
    items=["Change Discount to Decimal Number", "Replace errors in Discount with 0", "Replace null in Discount with 0",
           "Remove errors in Discount", "Keep errors in Discount"], difficulty=2)

add("Resolve errors", "single",
    "Before deciding how to fix errors in a large Shipments query, you want to look at only the rows that contain errors.\n\nWhat should you use?",
    "C",
    "Keep Rows > Keep Errors filters the query to rows with an error in the selected column(s), so you can see what caused them. Remove Errors and Replace Errors change the data before you've investigated.",
    "Investigate errors → Keep Errors.",
    options=["Remove Errors", "Replace Errors", "Keep Errors", "Column distribution"], difficulty=1)

add("Resolve errors", "single",
    "The exhibit shows an error after you change a Price column to Decimal Number.\n\nWhat is the best fix?",
    "B",
    "DataFormat.Error means a value couldn't be converted. Here the text includes ' USD', so remove that suffix (Replace Values or Extract) and then change the type. Replacing the errors with 0 would throw away real prices.",
    "DataFormat.Error → fix the text so it converts, then change type.",
    options=["Replace the errors with 0", "Remove the ' USD' text from Price, then change the type to Decimal Number",
             "Change Price to Whole Number", "Set the privacy level of the source to Public"],
    image=(error_pane("= Table.TransformColumnTypes(#\"Promoted Headers\",{{\"Price\", type number}})",
                      "DataFormat.Error", "We couldn't convert to Number.", ["1,250.00 USD"],
                      "Power Query error after changing Price to a number",
                      steps=["Source", "Promoted Headers", "Changed Type"]),
           "Power Query error pane: DataFormat.Error, we couldn't convert to Number, details 1,250.00 USD. The Changed Type step is selected."))

add("Resolve errors", "single",
    "The source team renamed a column from Revenue to Net Revenue. Refresh now fails with the error in the exhibit.\n\nWhat should you do?",
    "A",
    "Expression.Error saying a column wasn't found means a step still refers to the old name, here the Changed Type step. Edit that step (and any later steps) to use Net Revenue, or rename it back early in the query. Data source settings and privacy levels don't affect column names.",
    "Column 'X' wasn't found → a step references a renamed or removed column.",
    options=["Update the steps that reference Revenue to use Net Revenue", "Change the data source in Data source settings",
             "Replace errors in Revenue with 0", "Set the privacy level to Organizational"],
    image=(error_pane("= Table.TransformColumnTypes(Sales_Table,{{\"OrderID\", Int64.Type}, {\"Revenue\", type number}})",
                      "Expression.Error", "The column 'Revenue' of the table wasn't found.", ["Revenue"],
                      "Power Query error: column not found", steps=["Source", "Navigation", "Changed Type", "Filtered Rows"], highlight_step=2),
           "Power Query error pane: Expression.Error, the column Revenue of the table wasn't found. The Changed Type step is selected."))

add("Resolve errors", "multi",
    "A query that worked yesterday now fails with DataSource.Error: Could not find file.\n\nWhat are two possible causes? Each correct answer presents a complete solution.",
    ["A", "C"],
    "This error means the path in the Source step doesn't lead to a file: it was moved, renamed or deleted, or the location isn't reachable from this computer, for example a mapped drive letter that doesn't exist here. A wrong privacy level or a renamed column produce different errors.",
    "Could not find file → the path is wrong or unreachable.",
    options=["The file was renamed or moved", "A column in the file was renamed",
             "The path uses a mapped drive letter that isn't available on this computer", "The privacy level is set to Private"],
    select=2)

add("Resolve errors", "dropdown",
    "The exhibit shows a refresh error in Power BI Desktop.\n\nSelect the answer that completes each statement.",
    {"parts": [2, 0]},
    "DataSource.Error is about reaching the source, here a file that isn't at the stated path. Pointing the query at the file's new location with Data source settings > Change Source fixes it for every query that uses that file.",
    "DataSource.Error = can't reach the source. Fix the path with Change Source.",
    parts=[{"label": "The error category is", "options": ["DataFormat.Error", "Expression.Error", "DataSource.Error"]},
           {"label": "The best fix is", "options": ["Change Source in Data source settings", "Replace Errors with null", "Change the column types"]}],
    image=(error_pane("= Excel.Workbook(File.Contents(\"C:\\Users\\amira\\Desktop\\Targets.xlsx\"), null, true)",
                      "DataSource.Error", "Could not find file 'C:\\Users\\amira\\Desktop\\Targets.xlsx'.",
                      ["C:\\Users\\amira\\Desktop\\Targets.xlsx"], "Power Query error: file not found",
                      steps=["Source", "Navigation", "Promoted Headers", "Changed Type"], highlight_step=0),
           "Power Query error pane: DataSource.Error, could not find file C:\\Users\\amira\\Desktop\\Targets.xlsx. The Source step is selected."))

add("Resolve errors", "single",
    "You add the custom column in the exhibit and every row shows an error.\n\nHow should you fix the formula?",
    "C",
    "In M, & joins text, and Quantity is a number, so the operation fails. Convert the number with Text.From (or Number.ToText) first. M has no automatic conversion between text and numbers.",
    "Joining text and numbers in M → Text.From the number first.",
    options=["Replace & with +", "Change Product to the Number type",
             "Use `[Product] & \" x \" & Text.From([Quantity])`", "Replace errors with an empty string"],
    image=(error_pane("= Table.AddColumn(#\"Changed Type\", \"Label\", each [Product] & \" x \" & [Quantity])",
                      "Expression.Error", "We cannot apply operator & to types Text and Number.",
                      ["Operator: &", "Left: Trail Shoe x ", "Right: 3"], "Power Query error in a custom column",
                      steps=["Source", "Changed Type", "Added Custom"]),
           "Power Query error pane: Expression.Error, we cannot apply operator ampersand to types Text and Number, from a custom column joining Product and Quantity."))

add("Resolve errors", "single",
    "After Close & Apply, Power BI Desktop reports that the Sales table loaded with errors in 12 rows.\n\nHow can you see which rows have the errors?",
    "B",
    "Select View errors in the load message. Power BI creates an 'Errors in Sales' query in Power Query Editor that lists the affected rows and columns. The cells with errors load as blanks in the model, so you won't see them in report visuals.",
    "Load errors → View errors creates an 'Errors in …' query.",
    options=["Open DAX query view", "Select View errors, which creates a query listing the rows with errors",
             "Use Performance Analyzer", "Check the semantic model's refresh history in Desktop"])

add("Resolve errors", "yesno",
    "For each statement about errors in Power Query, select Yes if it is true.",
    [True, True, False],
    "Remove Errors drops whole rows; Replace Errors keeps them with a new value. When a query loads, cell-level errors become blanks and Power BI reports how many rows were affected; the refresh itself doesn't fail because of them.",
    "Cell errors load as blanks with a warning; they don't fail the refresh.",
    statements=["Remove Errors deletes the rows that contain an error in the selected columns.",
                "Replace Errors keeps the rows and substitutes a value of your choice.",
                "A single cell-level error in a loaded column makes the whole refresh fail."])

# ================= Types and imports =================
add("Data types", "single",
    "UK supplier files store dates as text in day/month/year order. When you change DeliveryDate to Date, 13/04/2026 shows as an error and 03/04/2026 becomes 4 March.\n\nWhat should you do?",
    "A",
    "Your computer's locale reads dates as month/day. Change Type > Using Locale lets you set Date with the English (United Kingdom) locale, so the text is read as day/month. Splitting and rebuilding the date also works but takes more steps.",
    "Dates or numbers in another country's format → Change Type > Using Locale.",
    options=["Change Type > Using Locale, Date, English (United Kingdom)", "Change the type to Date/Time/Timezone",
             "Replace errors with null", "Change the type to Text"],
    image=(pq([("OrderID", "int"), ("DeliveryDate", "text"), ("Converted", "date")],
              [["7001", "03/04/2026", "04/03/2026"], ["7002", "13/04/2026", "Error"], ["7003", "28/04/2026", "Error"]],
              "Power Query Editor: UK dates converted with the wrong locale", col_w=[140, 180, 170]),
           "Power Query preview: DeliveryDate text 03/04/2026 converts to 04/03/2026, while 13/04/2026 and 28/04/2026 become Error."))

add("Data types", "single",
    "A German supplier's file shows amounts such as 1.234,50. Changing the column to Decimal Number produces wrong values.\n\nWhat should you do?",
    "C",
    "In German formatting, the dot separates thousands and the comma is the decimal separator. Change Type > Using Locale with German reads 1.234,50 as one thousand two hundred thirty-four point five.",
    "Number formats from other countries → Using Locale.",
    options=["Replace every dot with nothing", "Change the type to Fixed decimal number", "Change Type > Using Locale, Decimal Number, German",
             "Change the type to Whole Number"])

add("Data types", "single",
    "Automatic type detection turned the ZipCode column into Whole Number, and codes such as 02134 became 2134.\n\nWhat should you do?",
    "B",
    "Codes such as ZIP codes, phone numbers and account IDs are labels, not quantities, so they should be Text. Change the type in (or replace) the automatic Changed Type step so the leading zeros are kept. Formatting in the report can't restore digits that were lost.",
    "Identifiers with leading zeros → Text type.",
    options=["Format the column with leading zeros in the report", "Set ZipCode to Text in the Changed Type step",
             "Change the type to Decimal Number", "Add 0 in a custom column"], difficulty=1)

add("Data types", "single",
    "Every new query you create automatically gets a Changed Type step that converts ID columns to numbers. You want to choose types yourself in this file.\n\nWhat should you change?",
    "D",
    "In Options > Current File > Data Load, Type Detection controls whether column types are detected automatically for unstructured sources. Setting it to never detect stops the automatic Changed Type step for new queries in this file.",
    "Stop automatic type detection → Options > Current File > Data Load > Type Detection.",
    options=["Query reduction options", "Privacy levels", "Auto date/time", "Type Detection in the current file's Data Load options"], difficulty=3)

add("Data types", "single",
    "Finance reports invoice totals that are off by fractions of a cent because of floating-point rounding.\n\nWhich data type should the Amount column use?",
    "B",
    "Fixed decimal number (shown as a currency type) stores values with exactly four decimal places, which avoids floating-point rounding errors in financial totals. Decimal Number is floating point; Whole Number drops the cents.",
    "Money with exact totals → Fixed decimal number.",
    options=["Decimal Number", "Fixed decimal number", "Whole Number", "Text"])

add("Data types", "single",
    "A Date/Time column OrderTimestamp always shows a time of 00:00:00, and reports only use the date.\n\nWhat should you do?",
    "A",
    "Changing the type to Date drops the meaningless time part, which makes the column match a Date table's key and lets Power BI offer date hierarchies. Formatting only hides the time; the stored value would still be a date-time.",
    "Only the date matters → change the type to Date.",
    options=["Change the type to Date", "Format the column to hide the time in the report", "Change the type to Text",
             "Split the column by delimiter"], difficulty=1)

# ================= Shape imported files =================
add("Shape imported files", "dropdown",
    "The exhibit shows an Excel sheet in Power Query Editor. A report title and a 'Generated' line sit above the real column headers.\n\nSelect the steps that produce a clean table.",
    {"parts": [1, 0]},
    "The first three rows (title, generated date, and a blank row) aren't data, so remove the top 3 rows. The header row then becomes the first row, and Use First Row as Headers turns it into column names.",
    "Junk above the headers → Remove Top Rows, then Use First Row as Headers.",
    parts=[{"label": "Remove top rows", "options": ["2", "3", "4"]},
           {"label": "Then", "options": ["Use First Row as Headers", "Transpose", "Fill Down"]}],
    image=(pq([("Column1", "text"), ("Column2", "text"), ("Column3", "text"), ("Column4", "text")],
              [["Contoso Monthly Sales Report", "null", "null", "null"], ["Generated 01/10/2026", "null", "null", "null"],
               ["null", "null", "null", "null"], ["Region", "Month", "Units", "Revenue"],
               ["North", "Sep", "1,204", "58,330"], ["South", "Sep", "986", "47,120"]],
              "Power Query Editor: Excel sheet with title rows above the headers", col_w=[260, 120, 120, 120]),
           "Power Query preview with columns Column1 to Column4. Rows 1 and 2 hold a report title and generated date, row 3 is blank, row 4 holds the headers Region, Month, Units, Revenue, and data starts at row 5."))

add("Shape imported files", "single",
    "A CSV file always has five lines of notes before the header row, but the number of notes might change in future.\n\nWhat is the most robust way to remove them?",
    "C",
    "Remove Top Rows with a fixed count breaks if the number of note lines changes. Skipping rows until the header row appears adapts automatically: in M, Table.Skip accepts a condition, such as each [Column1] <> \"Region\", instead of a number. Promoting headers first would use a note line as headers.",
    "Variable junk rows → remove rows by condition, not a fixed count.",
    options=["Remove Top Rows: 5", "Use First Row as Headers, then remove 4 rows",
             "Remove rows until the row that contains the header text, using a condition", "Transpose the table"], difficulty=3)

add("Shape imported files", "single",
    "A query imports an Excel table. Its Changed Type step converts DeliveryDays to Whole Number. Next month, the source table gains a new column named Notes.\n\nWhat happens to Notes after refresh?",
    "B",
    "Steps refer to the columns they were written for. A new column in the source passes through with its default type (often text or Any) unless a step removes it or a step uses Remove Other Columns, which drops anything not listed. Nothing errors just because a column was added.",
    "New source columns flow through unless a step removes them; removed or renamed columns cause errors.",
    options=["Refresh fails with a column-not-found error", "Notes appears, with no type change applied to it",
             "Notes is converted to Whole Number", "Notes is merged into DeliveryDays"], difficulty=3)

B.save()
