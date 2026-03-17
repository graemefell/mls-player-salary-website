# Convert RDS data files to JSON for the static React app
# Run this after data_pull.R to generate JSON files for the web app
#
# Usage: Rscript code/convert_to_json.R

library(jsonlite)

# Read the chart data (has numeric salary values, not dollar-formatted strings)
data <- readRDS("data/salaries_charts.rds")

# Ensure output directory exists
dir.create("public/data", recursive = TRUE, showWarnings = FALSE)

# Write as JSON array of objects
write_json(data, "public/data/salaries.json", na = "null", auto_unbox = TRUE)

cat("Written", nrow(data), "records to public/data/salaries.json\n")
