#helper functions

# parse 2025 PDF salary release ------------------------------------------------

parse_2025_pdf <- function(pdf_path) {
  txt <- pdf_text(pdf_path)
  all_lines <- unlist(strsplit(txt, "\n"))
  
  # Remove header lines and very short lines
  all_lines <- all_lines[nchar(trimws(all_lines)) > 5]
  all_lines <- all_lines[!grepl("^\\s*First Name", all_lines)]
  all_lines <- all_lines[!grepl("^\\s*Guaranteed Comp", all_lines)]
  
  # Each player spans 2 lines: line1 has name/team/position/start of salary,

  # line2 has rest of salary and guaranteed comp.
  # Combine consecutive pairs into single strings.
  combined <- character()
  i <- 1
  while (i <= length(all_lines)) {
    line1 <- all_lines[i]
    # Check if next line is a continuation (starts with spaces or a digit/dollar)
    if (i + 1 <= length(all_lines)) {
      line2 <- all_lines[i + 1]
      # Continuation lines typically start with spaces or digits or $
      if (grepl("^\\s+[\\$0-9]", line2) || grepl("^[0-9]", trimws(line2))) {
        combined <- c(combined, paste0(line1, trimws(line2)))
        i <- i + 2
        next
      }
    }
    combined <- c(combined, line1)
    i <- i + 1
  }
  
  # Known positions to match
  positions <- c("Attacking Midfield", "Center Forward", "Center-back",
                  "Central Midfield", "Defensive Midfield", "Goalkeeper",
                  "Left-back", "Left Midfield", "Left Wing",
                  "Right-back", "Right Midfield", "Right Wing", "Substitute")
  pos_pattern <- paste0("(", paste(positions, collapse = "|"), ")")
  
  records <- list()
  for (line in combined) {
    m <- regmatches(line, regexpr(pos_pattern, line))
    if (length(m) == 0) next
    
    pos_start <- regexpr(pos_pattern, line)
    before_pos <- substr(line, 1, pos_start - 1)
    after_pos <- substr(line, pos_start + nchar(m), nchar(line))
    
    # Parse name and team from before_pos (fixed-width: ~cols 1-12, 14-25, 27-43)
    # Use the whitespace pattern: fields separated by 2+ spaces
    parts <- trimws(strsplit(trimws(before_pos), "\\s{2,}")[[1]])
    if (length(parts) < 3) next
    
    first_name <- parts[1]
    last_name <- parts[2]
    team <- paste(parts[3:length(parts)], collapse = " ")
    
    # Extract salary figures from after_pos
    salary_matches <- regmatches(after_pos,
                                  gregexpr("\\$?[0-9,]+\\.\\d{2}", after_pos))[[1]]
    
    base_sal <- NA_real_
    guar_comp <- NA_real_
    if (length(salary_matches) >= 1) {
      base_sal <- as.numeric(gsub("[\\$,]", "", salary_matches[1]))
    }
    if (length(salary_matches) >= 2) {
      guar_comp <- as.numeric(gsub("[\\$,]", "", salary_matches[2]))
    }
    
    records <- c(records, list(data.frame(
      `First Name` = first_name,
      `Last Name` = last_name,
      Club = team,
      Position_long = m,
      `Base Salary` = base_sal,
      `Guaranteed Comp` = guar_comp,
      Name = paste(first_name, last_name, sep = " "),
      stringsAsFactors = FALSE,
      check.names = FALSE
    )))
  }
  
  bind_rows(records)
}

# scrape main page for latest data----------------------------------------------

load_main_data <- function(){
  url <- "https://mlsplayers.org/resources/salary-guide"
  webpage <- read_html(url)
  table <- webpage %>%
    html_node("table") %>%  
    html_table(fill = TRUE)
  
  # Remove any rows with missing data
  table <- na.omit(table)
  
  # Convert relevant columns to appropriate data types
  latest_salaries <- table %>%
    mutate(
      `Base Salary` = as.numeric(gsub("[\\$,]", "", `Base Salary`)),
      `Guaranteed Compensation` = as.numeric(gsub("[\\$,]", "", `Guaranteed Compensation`))
    )
  return(latest_salaries)
  
}

# scrape all pdf links from mlsplayers site ------------------------------------

get_links <- function(){
  url <- "https://mlsplayers.org/resources/salary-guide"
  # Read the webpage
  webpage <- read_html(url)
  # Extract all links
  links <- webpage %>%
    html_nodes("a") %>%  # Select all <a> (anchor) tags
    html_attr("href")    # Extract the 'href' attribute (the link)
  # Remove any NA values or duplicates
  links <- links[!is.na(links)]
  links <- unique(links)
  #salary pages
  filtered_links <- links[grepl("^http://s3.amazonaws.com/mlspa", links)]
  #pdfs only
  filtered_links <- filtered_links[!grepl("\\.csv\\?", filtered_links)]
  return(filtered_links)
}


# scrape a pdf from mlsplayers site and convert to tidy table ------------------

#helper for line
parse_line <- function(line) {
  sapply(seq_along(col_positions), function(i) {
    start <- col_positions[i]
    end <- if (i < length(col_positions)) col_positions[i + 1] - 1 else nchar(line)
    substring(line, start, end) %>% trimws() # Extract and trim whitespace
  })
}

#helper for page
process_page <- function(page_text) {
  # Pre-parse: Split into lines and filter out irrelevant lines
  lines <- strsplit(page_text, "\n")[[1]]
  lines <- lines[!sapply(lines, function(line){ nchar(trimws(line)) < 5 || grepl("2022 Fall Salary Guide", line, ignore.case = TRUE)
  })]
  first_row <- lines.f[1]
  col_positions <- sapply(column_titles, function(title) {
    gregexpr(title, first_row)[[1]][1]
  })
  lines <- lines[-1]
  # Parse: Extract data into columns (you should define the `parse_line` function separately)
  parsed_lines <- do.call(rbind, lapply(lines, parse_line))
  table_df <- as.data.frame(parsed_lines, stringsAsFactors = FALSE)
  
  # Set column names
  colnames(table_df) <- c("Team", "First Name ", "Last Name", "Base Salary", "Guaranteed Comp", "Position")
  table_df <- table_df %>% mutate(Year = "2023")
  
  return(table_df)
}
process_url <- function(url){
  url <- "http://s3.amazonaws.com/mlspa/2023-Salary-Report-as-of-Sept-15-2023.pdf?mtime=20231018173909"
  # Extract year
  base_pattern <- "http://s3.amazonaws.com/mlspa/"
  match <- sub(base_pattern, "", url, fixed=TRUE) # Remove the base URL
  year <- substr(match, 1, 4) # Take the first 4 characters
  if(year=="Sala"){
    year = "2024"
  }

  # Get pdf file
  pdf_file <- year
  download.file(url, pdf_file, mode = "wb")
  
  # Extract text from the PDF
  pdf_text_data <- pdf_text(pdf_file)
  
  # Column names
  column_titles <- case_when(
    year == "2022" ~ c("Club", "Last Name", "First Name", "Position", "2022 Base Salary", "2022 Guar. Comp."),
    year == "2023" ~ c("Team", "First Name ", "Last Name", "2023 Base Salary", "2023 Guaranteed Comp", "Position"),
    year == "2024" ~ c("First Name", "Last Name", "Team Contract", "Main Position", "Base Salary", "Guaranteed Comp"),
    TRUE ~ c("Club", "Last Name", "First Name", "Position", "2022 Base Salary", "2022 Guar. Comp.")
  )
  
  #following exampel is for page [1]
  all_data <- map(pdf_text_data, process_page) %>% 
    bind_rows() 
  
return(all_data)
}

#
# 
# lines <- strsplit(page_text, "\n")[[3]]
# lines
# lines <- lines[!sapply(lines, function(line){ nchar(trimws(line)) < 5 || grepl("2022 Fall Salary Guide", line, ignore.case = TRUE)
# })]
# first_row <- lines.f[1]
# col_positions <- sapply(column_titles, function(title) {
#   gregexpr(title, first_row)[[1]][1]
# })

