import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from svgkit import model, dialog, matrix
from bankkit import Batch

B = Batch(4, "model_design-relationships", "Design and implement a data model", "model", {"model": 1})
add = B.add

STAR = {
    "Customer": {"x": 30, "y": 40, "w": 190, "fields": [("CustomerKey", "", "pink"), ("Customer", "", None), ("City", "", None)]},
    "Orders": {"x": 330, "y": 120, "w": 200, "fields": [("CustomerKey", "", "pink"), ("ProductKey", "", "blue"), ("DateKey", "", "green"),
                                                        ("Quantity", "sum", None), ("Amount", "sum", None)]},
    "Product": {"x": 30, "y": 230, "w": 190, "fields": [("ProductKey", "", "blue"), ("Product", "", None), ("Category", "", None)]},
    "Date": {"x": 650, "y": 140, "w": 190, "fields": [("DateKey", "", "green"), ("Month", "", None), ("Year", "", None)]},
}
STAR_RELS = [
    {"pts": [(220, 100), (275, 100), (275, 180), (330, 180)], "ends": ("1", "*"), "dir": ">"},
    {"pts": [(220, 290), (275, 290), (275, 210), (330, 210)], "ends": ("1", "*"), "dir": ">"},
    {"pts": [(650, 200), (530, 200)], "ends": ("1", "*"), "dir": ">"},
]

# ================= Star schema =================
add("Star schema design", "single",
    "The exhibit shows a model in Model view.\n\nWhich table is the fact table?",
    "B",
    "Orders holds the numeric values you aggregate (Quantity, Amount) and a foreign key to each other table, and it sits on the many side of every relationship. Customer, Product and Date describe those orders, so they're dimensions.",
    "Fact = numbers to aggregate + foreign keys, on the many side.",
    options=["Customer", "Orders", "Product", "Date"],
    image=(model(880, 400, STAR, STAR_RELS, "Model view: a star schema with four tables"),
           "Model view with Customer, Product and Date each related one-to-many to Orders, which holds CustomerKey, ProductKey, DateKey, Quantity and Amount."), difficulty=1)

add("Star schema design", "dropdown",
    "The exhibit shows part of a hospital model. A patient who moves address gets a new row in Patient with new ValidFrom and ValidTo dates, keeping the same MRN (medical record number).\n\nSelect the answer that completes each statement.",
    {"parts": [1, 0, 2]},
    "Visits records events with a numeric Charge and keys to the dimensions, so it's the fact table. PatientKey is the surrogate key: a meaningless number unique per row, even when one MRN has several historical rows. MRN is the business key from the source system. Keeping history this way is a type 2 slowly changing dimension.",
    "Surrogate key = unique per row. Business key = the source system's identifier. Type 2 = history kept as extra rows.",
    parts=[{"label": "The fact table is", "options": ["Patient", "Visits", "Date"]},
           {"label": "The surrogate key in Patient is", "options": ["PatientKey", "MRN", "ValidFrom"]},
           {"label": "Patient is an example of", "options": ["a degenerate dimension", "a role-playing dimension", "a type 2 slowly changing dimension"]}],
    image=(model(880, 360, {
        "Patient": {"x": 30, "y": 40, "w": 220, "fields": [("PatientKey", "", "pink"), ("MRN", "", None), ("Name", "", None), ("City", "", None),
                                                          ("ValidFrom", "date", None), ("ValidTo", "date", None)]},
        "Visits": {"x": 350, "y": 60, "w": 200, "fields": [("VisitID", "", None), ("PatientKey", "", "pink"), ("DateKey", "", "green"), ("Charge", "sum", None)]},
        "Date": {"x": 650, "y": 80, "w": 190, "fields": [("DateKey", "", "green"), ("Month", "", None), ("Year", "", None)]},
    }, [{"pts": [(250, 150), (350, 150)], "ends": ("1", "*"), "dir": ">"},
        {"pts": [(650, 170), (550, 170)], "ends": ("1", "*"), "dir": ">"}], "Model view: hospital visits model"),
        "Model view with Patient (PatientKey, MRN, Name, City, ValidFrom, ValidTo) related to Visits (VisitID, PatientKey, DateKey, Charge), and Date related to Visits."))

add("Star schema design", "single",
    "A modeller says the Sales table's grain is 'one row per order line'.\n\nWhat does that tell you?",
    "C",
    "Grain is the level of detail one row represents. Here each row is one product on one order, so an order with three products has three rows. Totals add up correctly from that level, and you can't analyse below it.",
    "Grain = what one row of a fact table represents.",
    options=["The table has one row per order", "The table is a dimension", "Each row represents one product on one order",
             "The table can't be related to Date"], difficulty=1)

add("Star schema design", "single",
    "A fact table contains an InvoiceNumber column. Invoices have no other attributes in the source.\n\nHow should you model InvoiceNumber?",
    "A",
    "An identifier with no attributes of its own can stay in the fact table as a degenerate dimension. A separate table with one column per row of the fact table would add a huge relationship for nothing.",
    "Identifier with no attributes → leave it in the fact (degenerate dimension).",
    options=["Leave it in the fact table as a degenerate dimension", "Create an Invoice dimension table with one row per invoice",
             "Remove it, because facts can't contain text", "Move it to the Date table"], difficulty=3)

add("Star schema design", "single",
    "Why does Microsoft recommend a star schema over a snowflake schema for Power BI models?",
    "B",
    "Every dimension relates directly to the fact table, so filters travel one relationship, DAX stays simpler, and users see fewer tables. Power BI compresses repeated values well, so the storage saving a snowflake offers barely matters.",
    "Star = simpler, faster, friendlier. Flatten snowflakes.",
    options=["Snowflakes can't be refreshed", "Fewer relationship hops, simpler DAX and an easier field list, with little storage cost",
             "Star schemas use DirectQuery automatically", "Snowflakes don't support relationships"], difficulty=1)

add("Star schema design", "single",
    "The model has Sales and Returns fact tables. Users want to compare sales and returns by product and month in the same visual.\n\nHow should you design the model?",
    "C",
    "Relate both fact tables to the same Product and Date dimensions (conformed dimensions). A filter on a product or month then reaches both facts. Relating the two facts directly creates a fact-to-fact relationship that's fragile and usually many-to-many.",
    "Several facts → share dimensions; never relate fact to fact.",
    options=["Relate Sales directly to Returns on ProductKey", "Append Returns to Sales", "Relate both fact tables to the same Product and Date dimensions",
             "Merge Returns into Sales on OrderID"])

add("Star schema design", "single",
    "Customers sometimes move city. Reports must show sales by the city the customer lived in at the time of each sale.\n\nWhat should the Customer dimension do?",
    "D",
    "A type 2 slowly changing dimension adds a new row (with a new surrogate key) each time a tracked attribute changes, and each sale is linked to the row that was current when it happened. Overwriting the city (type 1) would move all history to the new city.",
    "History 'as it was' → type 2 dimension with a surrogate key per version.",
    options=["Overwrite City when it changes", "Store City in the Date table", "Delete old customers when they move",
             "Add a new row with a new surrogate key whenever City changes, and link each sale to the row current at the time"], difficulty=3)

add("Star schema design", "single",
    "Users need two slicers on the same page, Order Month and Ship Month, and want both to filter every visual at the same time.\n\nHow should you model the dates?",
    "A",
    "Only one relationship between two tables can be active, so one Date table can't be filtered by both dates at once. Two date tables (for example a calculated copy named Ship Date) each with an active relationship let both slicers work together. USERELATIONSHIP only switches relationships inside specific measures.",
    "Two date roles filtered at the same time → two date tables.",
    options=["Create a second date table for ship dates, each with its own active relationship", "Make both relationships active",
             "Use USERELATIONSHIP in every measure", "Set the relationship to bidirectional"], difficulty=2)

add("Star schema design", "single",
    "A single imported table has 60 columns: order details plus customer and product attributes repeated on every row. The model is large and confusing.\n\nWhat should you do?",
    "B",
    "Split it into a star: build Customer and Product dimensions (Reference the source, keep their columns, remove duplicates), keep only keys and numeric columns in the fact, then relate them. Repeated text moves out of the biggest table and the field list becomes clearer.",
    "Wide flat table → split into a fact and dimensions.",
    options=["Hide 40 of the columns", "Split it into a fact table and dimension tables related by keys", "Convert it to DirectQuery",
             "Create a calculated table for each attribute"])

add("Star schema design", "single",
    "The exhibit shows Sales related to Product, which is related to Subcategory, which is related to Category.\n\nWhat should you do to make the model a star schema?",
    "C",
    "Subcategory and Category are a snowflake hanging off Product. Merge them into Product in Power Query (adding Subcategory and Category columns), turn off load for the two lookups, and keep the single Product to Sales relationship.",
    "Snowflake chain → merge the outer tables into the dimension.",
    options=["Relate Category directly to Sales", "Set all relationships to bidirectional", "Merge Subcategory and Category into Product and stop loading them",
             "Append Subcategory and Category to Product"],
    image=(model(980, 300, {
        "Category": {"x": 20, "y": 90, "w": 170, "fields": [("CategoryKey", "", "pink"), ("Category", "", None)]},
        "Subcategory": {"x": 250, "y": 90, "w": 190, "fields": [("SubcategoryKey", "", "blue"), ("CategoryKey", "", "pink"), ("Subcategory", "", None)]},
        "Product": {"x": 500, "y": 90, "w": 190, "fields": [("ProductKey", "", "green"), ("SubcategoryKey", "", "blue"), ("Product", "", None)]},
        "Sales": {"x": 760, "y": 90, "w": 190, "fields": [("ProductKey", "", "green"), ("DateKey", "", None), ("Amount", "sum", None)]},
    }, [{"pts": [(190, 160), (250, 160)], "ends": ("1", "*"), "dir": ">"},
        {"pts": [(440, 160), (500, 160)], "ends": ("1", "*"), "dir": ">"},
        {"pts": [(690, 160), (760, 160)], "ends": ("1", "*"), "dir": ">"}], "Model view: a snowflaked product dimension"),
        "Model view showing a chain: Category to Subcategory to Product to Sales, each one-to-many."))

# ================= Relationships =================
add("Relationships", "single",
    "The exhibit shows a relationship's properties.\n\nIn which direction do filters flow?",
    "A",
    "Sales is on the many side (ProductKey repeats) and Product on the one side. With Single cross-filter direction, filters flow from the one side to the many side, so selecting a product filters Sales, but filtering Sales doesn't filter Product.",
    "Single direction: one side filters the many side.",
    options=["From Product to Sales", "From Sales to Product", "Both directions", "Neither, because the relationship is inactive"],
    image=(dialog(620, "Edit relationship", [
        ("label", "From table", "Sales (ProductKey)"),
        ("label", "To table", "Product (ProductKey)"),
        ("label", "Cardinality", "Many to one (*:1)"),
        ("label", "Cross-filter direction", "Single"),
        ("check", "Make this relationship active", True),
        ("check", "Apply security filter in both directions", False),
        ("check", "Assume referential integrity", False),
    ], "Edit relationship dialog"),
        "Edit relationship dialog: Sales ProductKey to Product ProductKey, cardinality Many to one, cross-filter direction Single, relationship active."), difficulty=1)

add("Relationships", "single",
    "You try to create a many-to-one relationship from Sales[ProductKey] to Product[ProductKey], but Power BI says the cardinality isn't valid because Product[ProductKey] doesn't contain unique values.\n\nWhat should you do?",
    "C",
    "The one side must hold each key once. Find and fix the duplicate (or blank) ProductKey rows in Product, usually in Power Query, then create the relationship. Choosing many-to-many would hide a data quality problem in a dimension.",
    "'One' side must be unique and not blank; fix the dimension data.",
    options=["Change the relationship to many-to-many", "Set the cross-filter direction to Both", "Remove the duplicate or blank keys from Product",
             "Make the relationship inactive"])

add("Relationships", "single",
    "Customer and CustomerDetails each have exactly one row per CustomerID.\n\nWhat is usually the best design?",
    "D",
    "A one-to-one relationship is valid, but two tables describing the same entity add a needless hop and split the fields users look for. Merging them into one Customer table is simpler and usually smaller.",
    "One-to-one usually means the tables should be merged.",
    options=["A one-to-one relationship with Single direction", "A many-to-many relationship", "Two separate unrelated tables",
             "Merge them into a single Customer table"])

add("Relationships", "single",
    "You change the Sales–Customer relationship to Both. Sales is also related to Product and Date.\n\nWhat is the main risk?",
    "B",
    "Bidirectional filtering can create more than one filter path between tables (ambiguity), slows queries, and can produce unexpected results, which is why Power BI may refuse a second bidirectional relationship. Use it only for a specific need.",
    "Bidirectional = risk of ambiguous paths and slower queries.",
    options=["Sales can no longer be filtered by Date", "Ambiguous filter paths and slower, less predictable results", "RLS stops working entirely",
             "The model can't be refreshed"])

add("Relationships", "single",
    "A Product slicer must show only products that have sales in the current filter context.\n\nWhat does Microsoft's guidance recommend instead of a bidirectional relationship?",
    "A",
    "Add a visual-level filter to the slicer, such as [Total Sales] is not blank, so only products with sales appear. Microsoft recommends this over making the relationship bidirectional just for a slicer.",
    "Slicer showing only 'used' items → visual-level measure filter, not bidirectional.",
    options=["A visual-level filter on the slicer where a sales measure is not blank", "A many-to-many relationship", "An inactive relationship",
             "Turning off Edit interactions on the slicer"], difficulty=3)

add("Relationships", "single",
    "Customers can share bank accounts, and each account can have several customers. Transactions relate to Account. Users need to filter transactions by customer.\n\nWhat should you model?",
    "C",
    "A bridge table (CustomerAccount, one row per customer–account pair) sits between Customer and Account. Customer filters the bridge, and the bridge needs to filter Account, which typically means setting the bridge–Account relationship to Both so the filter reaches Transactions.",
    "Many-to-many between dimensions → bridge table.",
    options=["Merge Customer into Transactions", "Relate Customer directly to Transactions on CustomerName", "A bridge table with one row per customer and account pair",
             "Two inactive relationships"], difficulty=3)

add("Relationships", "yesno",
    "For each statement about relationships, select Yes if it is true.",
    [True, True, False],
    "Only one relationship between two tables can be active at a time. Related columns must have compatible data types, so a text key can't relate to a number key. Power BI supports many-to-many cardinality directly; a bridge table is a design choice, not a requirement.",
    "One active relationship per pair of tables; matching types; many-to-many is native.",
    statements=["Only one relationship between the same two tables can be active.", "The two related columns must have the same (compatible) data type.",
                "A many-to-many relationship always requires a bridge table."])

add("Relationships", "single",
    "The exhibit shows two relationships between Date and Sales. One is drawn as a dashed line.\n\nHow can a measure use the dashed relationship?",
    "D",
    "A dashed line is an inactive relationship. It doesn't filter anything by default, but a measure can activate it for its own calculation with CALCULATE and USERELATIONSHIP.",
    "Dashed line = inactive; use it in a measure with USERELATIONSHIP.",
    options=["It filters automatically when users choose a ship date", "Set it to bidirectional", "Delete the solid relationship first",
             "Use CALCULATE with USERELATIONSHIP in the measure"],
    image=(model(820, 300, {
        "Date": {"x": 40, "y": 80, "w": 200, "fields": [("Date", "date", "green"), ("Month", "", None), ("Year", "", None)]},
        "Sales": {"x": 520, "y": 60, "w": 230, "fields": [("OrderDate", "date", "green"), ("ShipDate", "date", "green"), ("ProductKey", "", None), ("Amount", "sum", None)]},
    }, [{"pts": [(240, 130), (520, 130)], "ends": ("1", "*"), "dir": ">"},
        {"pts": [(240, 170), (520, 170)], "ends": ("1", "*"), "dash": True}], "Model view: active and inactive relationships",
        legend="Solid line: Date to Sales[OrderDate]. Dashed line: Date to Sales[ShipDate]."),
        "Model view: Date related to Sales twice, a solid line to OrderDate and a dashed line to ShipDate."), difficulty=1)

add("Relationships", "single",
    "The matrix in the exhibit shows a (Blank) product row with sales against it.\n\nWhat is the most likely cause?",
    "B",
    "When fact rows have a key that doesn't exist in the dimension, Power BI assigns them to a blank member so totals still add up. Fix it at the source or add the missing products (or an Unknown member) to the dimension.",
    "(Blank) row = fact keys with no matching dimension row.",
    options=["The relationship is inactive", "Some Sales rows have a ProductKey that doesn't exist in Product", "Product contains duplicate keys",
             "The matrix has Show items with no data turned on"],
    image=(matrix("Sales Amount by Category", ["Category", "Sales Amount"],
                  [("Apparel", ["412,380"], 0, False), ("Bags", ["168,940"], 0, False), ("Footwear", ["538,210"], 0, False),
                   ("(Blank)", ["24,605"], 0, False), ("Total", ["1,144,135"], 0, True)], "Matrix showing a (Blank) category", w=520,
                  col_w=[230, 200]),
           "Matrix of Sales Amount by Category: Apparel, Bags, Footwear, a (Blank) row with 24,605, and a total."))

add("Relationships", "single",
    "Your DirectQuery model's Sales[ProductKey] always has a matching Product row, guaranteed by the database. You want faster queries.\n\nWhich relationship setting should you enable?",
    "A",
    "Assume referential integrity tells Power BI it can use inner joins instead of outer joins when querying the source, which is faster. Only enable it when every fact key really does match, or rows will silently disappear.",
    "DirectQuery + guaranteed matches → Assume referential integrity.",
    options=["Assume referential integrity", "Apply security filter in both directions", "Cross-filter direction: Both", "Make this relationship inactive"], difficulty=3)

add("Relationships", "single",
    "In a composite model, Sales comes from SQL Server through DirectQuery and Targets is imported from Excel. In Model view, their relationship shows bracket-like marks after the cardinality indicators.\n\nWhat do the marks indicate?",
    "C",
    "They mark a limited relationship: the tables come from different source groups (or the relationship is many-to-many), so Power BI can't build the join in advance. It runs the join at query time, and no blank member is added for unmatched keys.",
    "Bracket-like marks = limited relationship.",
    options=["An inactive relationship", "A bidirectional relationship", "A limited relationship across source groups", "A relationship that has errors"], difficulty=3)

add("Relationships", "single",
    "Which cross-filter direction does a one-to-one relationship use?",
    "B",
    "One-to-one relationships always filter in both directions; you can't make them single-direction.",
    "One-to-one = always both directions.",
    options=["Always single", "Always both", "Whatever you choose", "None"], difficulty=2)

add("Relationships", "dropdown",
    "Select the cardinality Power BI should use for each pair of key columns.",
    {"parts": [0, 1, 2]},
    "Unique on one side and repeated on the other is many-to-one. Unique on both sides is one-to-one. Repeated on both sides is many-to-many.",
    "Cardinality comes from whether each side's values are unique.",
    parts=[{"label": "Sales[StoreID] repeats; Store[StoreID] is unique", "options": ["Many to one", "One to one", "Many to many"]},
           {"label": "Employee[EmpID] is unique; Badge[EmpID] is unique", "options": ["Many to one", "One to one", "Many to many"]},
           {"label": "Sales[Category] repeats; Budget[Category] repeats", "options": ["Many to one", "One to one", "Many to many"]}], difficulty=1)

add("Relationships", "single",
    "Every time you import tables, Power BI creates unwanted relationships between columns that happen to be named ID.\n\nWhat should you change?",
    "D",
    "Under Options > Current File > Data Load, clear the Relationships option to autodetect new relationships after data is loaded. You then create the correct relationships yourself in Model view.",
    "Unwanted auto relationships → turn off relationship autodetection in Data Load options.",
    options=["Rename every ID column", "Turn off Auto date/time", "Set all relationships to inactive",
             "Turn off autodetecting new relationships in the Data Load options"])

add("Relationships", "single",
    "Budget has one row per category per month (stored as the first day of the month). Date has one row per day.\n\nWhat is a sound way to relate Budget to Date?",
    "A",
    "Relating Budget's first-of-month date to Date[Date] lets month, quarter and year filters reach Budget. Visuals below month level would show the whole month's budget on the 1st, so measures should hide or allocate budget at day level.",
    "Monthly facts → relate on a month-level date, and guard against day-level visuals.",
    options=["Relate Budget's first-of-month date to Date[Date], and avoid showing budget below month level",
             "Merge Budget into Sales", "Create a one-to-one relationship", "Don't relate Budget; use a slicer for each table"], difficulty=3)

add("Relationships", "single",
    "You create a second relationship between Date and Sales, on ShipDate, while the OrderDate relationship already exists.\n\nWhat state is the new relationship created in?",
    "C",
    "Because only one relationship between two tables can be active, Power BI creates the second one as inactive (dashed line). You can switch which one is active, but not have both active.",
    "Second relationship between the same tables → inactive.",
    options=["Active, and the first becomes inactive", "Both active", "Inactive", "Bidirectional"], difficulty=1)

# ================= Date table and model properties =================
add("Date table", "single",
    "What happens when you mark a Date table as a date table?",
    "B",
    "Power BI validates the date column (unique, no blanks, no gaps) and uses that table for time intelligence. The automatic date hierarchy for that table's date column is removed. Data and relationships aren't changed.",
    "Mark as date table = validated column + used for time intelligence.",
    options=["Power BI creates a relationship to every fact table", "Time intelligence uses this table, and its auto date hierarchy is removed",
             "The table becomes DirectQuery", "Every date column in the model is converted to this table"])

add("Date table", "single",
    "The company's financial year starts on 1 July. Users need to analyse by fiscal year and fiscal quarter, and drill from one to the other.\n\nWhat should you do?",
    "C",
    "Add FiscalYear and FiscalQuarter columns to the Date table (calculated from the month), then create a hierarchy FiscalYear → FiscalQuarter → Month. Auto date/time only knows calendar years.",
    "Fiscal calendars → fiscal columns + hierarchy in your own Date table.",
    options=["Turn on Auto date/time", "Change every date column to Text", "Add fiscal year and quarter columns to the Date table and build a hierarchy",
             "Use a calculation group"])

add("Model properties", "single",
    "The matrix in the exhibit lists months alphabetically.\n\nWhat should you do so they appear in calendar order?",
    "A",
    "Select Month Name and set Sort by column to Month Number (a column with 1 to 12). Every visual then orders months correctly. Sorting a single visual by another field doesn't fix every visual.",
    "Text that has a natural order → Sort by column.",
    options=["Set Month Name's Sort by column to Month Number", "Rename the months 01-Jan, 02-Feb", "Sort the matrix by Sales",
             "Change Month Name to the Date type"],
    image=(matrix("Sales by Month", ["Month Name", "Sales"],
                  [("April", ["468,720"], 0, False), ("August", ["512,330"], 0, False), ("December", ["601,940"], 0, False),
                   ("February", ["412,300"], 0, False), ("January", ["386,150"], 0, False), ("July", ["498,010"], 0, False)],
                  "Matrix with months in alphabetical order", w=480, col_w=[220, 180]),
           "Matrix of Sales by Month Name listing April, August, December, February, January, July: alphabetical order."), difficulty=1)

add("Model properties", "single",
    "A table visual shows a column titled Sum of Year with values such as 4,048,104.\n\nWhat should you change?",
    "B",
    "Numeric columns like Year default to Sum. Set the column's Summarization property to Don't summarize in the model, so it's treated as a label in every visual.",
    "Numbers that are labels (Year, IDs) → Summarization: Don't summarize.",
    options=["Change Year to Text in every visual", "Set Year's Summarization to Don't summarize", "Format Year with no thousands separator",
             "Hide the Year column"],
    image=(matrix("Sales by Region", ["Region", "Sum of Year", "Sales"],
                  [("North", ["4,048,104", "1,204,330"], 0, False), ("South", ["3,036,078", "947,120"], 0, False),
                   ("Total", ["7,084,182", "2,151,450"], 0, True)], "Table visual summing a Year column", w=560, col_w=[160, 170, 170]),
           "Table visual with columns Region, Sum of Year and Sales, where Sum of Year shows values like 4,048,104."), difficulty=1)

add("Model properties", "single",
    "A map visual plots Paris in France and Paris in Texas at the same location.\n\nWhat should you do?",
    "D",
    "Give Bing enough context: set data categories (City, State or Province, Country) and use the fields together, for example a hierarchy or a combined 'City, Country' column categorised as a place. A single ambiguous city name can't be placed reliably.",
    "Ambiguous place names → data categories + more location context.",
    options=["Set the City column's Summarization to Count", "Use a table visual instead", "Change City to Text",
             "Set geographic data categories and add country or state context, for example a hierarchy"])

add("Model properties", "single",
    "Users must drill a map from Country to State to City.\n\nWhat should you create?",
    "A",
    "A hierarchy Country → State → City (with each column's geographic data category set) lets users drill down level by level in the map.",
    "Drill path on a map → geographic hierarchy.",
    options=["A hierarchy Country → State → City", "Three separate map visuals", "A calculated table", "A field parameter"], difficulty=1)

add("Model properties", "single",
    "A ProductImage column holds web addresses of product photos. You want the photos to appear in a table visual.\n\nWhat should you set?",
    "C",
    "Setting the column's data category to Image URL tells Power BI to render the address as an image in tables, matrices and slicers. Web URL would show it as a link.",
    "Show pictures from URLs → data category Image URL.",
    options=["Data category: Web URL", "Summarization: Count", "Data category: Image URL", "Format: Text"], difficulty=1)

add("Model properties", "single",
    "Report authors keep using foreign key columns such as Sales[ProductKey] in visuals instead of the Product table's fields.\n\nWhat should you do?",
    "B",
    "Hide the foreign key columns in the fact table. They still drive relationships, but authors only see the dimension fields, which have descriptive names and the right behaviour.",
    "Hide fact-table keys; use dimension attributes.",
    options=["Delete the relationship", "Hide the foreign key columns in the fact table", "Rename them to Do not use", "Set them to Don't summarize"], difficulty=1)

add("Model properties", "dropdown",
    "You want Excel users to look up Product information from this semantic model as an organizational data type.\n\nSelect how to configure the Product table as a featured table.",
    {"parts": [1, 0]},
    "Mark Product as a featured table. Its row label is what users see in Excel (ProductName). Its key column uniquely identifies each row (ProductID).",
    "Featured table: row label = friendly name; key column = unique ID.",
    parts=[{"label": "Row label", "options": ["ProductID", "ProductName", "Category"]},
           {"label": "Key column", "options": ["ProductID", "ProductName", "Category"]}], difficulty=3)

add("Model properties", "single",
    "Sales Amount must appear as currency with two decimal places in every visual.\n\nWhere is the most efficient place to set this?",
    "A",
    "Set the format on the column or measure in the model (Column tools or Measure tools). Every visual uses it by default, and you don't repeat the setting per visual.",
    "Format once in the model, not per visual.",
    options=["On the column or measure in the model", "In each visual's Format pane", "In Power Query", "In the report theme"], difficulty=1)

add("Model properties", "single",
    "You hide 30 unused columns in report view to make the model smaller.\n\nDoes this reduce the model's size?",
    "D",
    "Hidden columns are still loaded and stored; hiding only removes them from the field list. To shrink the model, remove the columns in Power Query.",
    "Hiding ≠ removing. Remove columns to save space.",
    options=["Yes, hidden columns are not stored", "Yes, but only in DirectQuery", "Only after a refresh", "No, hidden columns are still loaded and stored"], difficulty=1)

add("Calculated columns vs measures", "single",
    "Profit Margin % must recalculate correctly for any combination of filters users apply, including totals.\n\nWhat should you create?",
    "B",
    "A measure is evaluated in the current filter context, so it gives the right ratio at every level, including totals. A calculated column computes a value per row at refresh, and summing row-level percentages gives wrong totals.",
    "Ratios that respond to filters → measures.",
    options=["A calculated column", "A measure", "A Power Query custom column", "A calculated table"], difficulty=1)

add("Calculated columns vs measures", "single",
    "Users need a slicer of customer age bands (Under 25, 25–44, 45+) based on each customer's age.\n\nWhat should you create?",
    "A",
    "Slicers, rows and axes need values stored per row, so create a column: a calculated column in Customer, or better, a column added in Power Query. A measure can't be used as a slicer field.",
    "Slice or group by it → column. Aggregate it → measure.",
    options=["A column in the Customer table", "A measure", "A calculation group", "A visual calculation"], difficulty=1)

B.save()
