# pull and clean MLS player salary data
rm(list=ls())
library(rvest)
library(tidyverse)
library(pdftools)

source("code/funs.R")

# helper: map short position codes to spelled-out names ------------------------
expand_position <- function(pos) {
  case_when(
    pos %in% c("GK", "l GK") ~ "Goalkeeper",
    pos %in% c("D", "D/F") ~ "Defender",
    pos %in% c("D-M", "D/M", "l D-M") ~ "Defensive Midfield",
    pos %in% c("M", "MF", "rM", "aM", "yM") ~ "Central Midfield",
    pos %in% c("M-D", "M/D") ~ "Defensive Midfield",
    pos %in% c("M-F", "M/F") ~ "Attacking Midfield",
    pos %in% c("F-M", "F/M", "aF") ~ "Forward",
    pos %in% c("F") ~ "Forward",
    pos %in% c("", "UNK", "NA") | is.na(pos) ~ "Unknown",
    TRUE ~ pos  # keep as-is if unrecognized (e.g. spelled-out from 2024/25)
  )
}

# process each  ----------------------------------------------------------------

# 2024 from CSV (keep spelled-out position names as-is)
dta.24 <- read.csv("input/salaries_2024.csv") %>%
  mutate(
    `Base Salary` = as.numeric(gsub("[\\$,]", "", CY.Base.Salary)),
    `Guaranteed Comp` = as.numeric(gsub("[\\$,]", "", CY.Guaranteed.Comp)),
    Name = paste(fname, lname, sep = " "),
    Club = club,
    Position = position,
    Year = 2024
  ) %>%
  select(Name, Club, `Last Name` = lname, `First Name` = fname, Position, `Base Salary`, `Guaranteed Comp`, Year)

# 2025 from PDF (keep spelled-out position names as-is)
dta.25 <- parse_2025_pdf("input/2025-Fall-Salary-Release.pdf") %>%
  mutate(Position = Position_long) %>%
  mutate(Year = 2025)

#downloaded data
dta.23 <- readxl::read_excel("input/salaries_2023.xlsx") %>%
  select(Club = Team, `Last Name`, `First Name`, Position, `Base Salary`, `Guaranteed Comp`) %>%
  mutate(Name = paste(`First Name`, `Last Name`, sep = " ")) %>%
  mutate(Position = expand_position(Position)) %>%
  mutate(Year = 2023)

dta.20 <- readxl::read_excel("input/salaries_2020.xlsx")%>%
  mutate(Name = paste(`First Name`, `Last Name`, sep = " ")) %>%
  mutate(Position = ifelse(Position=="NA", "UNK", Position)) %>%
  mutate(Position = expand_position(Position)) %>%
  mutate(Year = 2020)

dta.21 <- readxl::read_excel("input/salaries_2021.xlsx")%>%
  mutate(Club = 
           case_when(Club == "New England Revolutio"~ "New England Revolution",
                     TRUE ~ Club)) %>%
  mutate(`Last Name` = 
           case_when(Club == "New England Revolution"~ sub("n", "", `Last Name`),
                     TRUE ~ `Last Name`)) %>%
  mutate(Name = paste(`First Name`, `Last Name`, sep = " ")) %>%
  mutate(Position = ifelse(Position=="NA", "UNK", Position)) %>%
  mutate(Position = expand_position(Position)) %>%
  mutate(Year = 2021)
  
dta.22 <- readxl::read_excel("input/salaries_2022.xlsx") %>%
  mutate(Club = 
           case_when(Club == "Colorado Rapid"~ "Colorado Rapids",
                     Club == "Houston Dynam"~ "Houston Dynamo",
                    is.na(Club) & grepl("Major League S", `Last Name`) ~ "Major League Soccer",
                    Club == "Minnesota Unit"~ "Minnesota United",
                    Club == "New England R"~ "New England Revolution",
                    Club == "New York City F"~ "New York City FC",
                    is.na(Club) & grepl("New York City F", `Last Name`) ~ "New York City FC",
                    Club == "New York Red"~ "New York Red Bulls",
                    is.na(Club) & grepl("Orlando City SC", `Last Name`) ~ "Orlando City SC",
                    Club == "Philadelphia Un"~ "Philadelphia Union",
                    Club == "Portland Timbe"~ "Portland Timbers",
                    Club %in% c("San Jose Earth","San Jose Earth quakes") ~ "San Jose Earthquakes",
                    Club == "Seattle Sounde" ~ "Seattle Sounders FC",
                    Club == "Sporting Kansa" ~ "Sporting Kansas City",
                    Club == "Vancouver Whit" ~ "Vancouver Whitecaps",
                    TRUE ~ Club)) %>%
  mutate(`Last Name` = 
           case_when(`Last Name` == "s"~ "Colorado Rapids",
                     `Last Name` == "o"~ "Houston Dynamo",
                     grepl("Major League S ", `Last Name`) ~ gsub("Major League S ", "", `Last Name`),
                     `Last Name` == "o"~ "Houston Dynamo",
                     Club == "Minnesota United"~ sub("e", "", `Last Name`),
                     grepl("New York City F ", `Last Name`) ~ gsub("New York City F ", "", `Last Name`),
                     Club == "New York Red Bulls"~ sub("B", "", `Last Name`),
                     grepl("Orlando City SC ", `Last Name`) ~ gsub("Orlando City SC ", "", `Last Name`),
                     Club == "San Jose Earthquakes" & !is.na(`Last Name`) ~ sub("q", "", `Last Name`),
                     Club == "Seattle Sounders FC"~ sub("r", "", `Last Name`),
                     TRUE ~ `Last Name`)) %>%
  mutate(Name = paste(`First Name`, `Last Name`, sep = " ")) %>%
  mutate(Position = ifelse(Position=="NA", "UNK", Position)) %>%
  mutate(Position = expand_position(Position)) %>%
  mutate(Year = 2022)

dta.pre.20 <- data.table::fread("input/salaries_2013-2021.csv") %>% 
  mutate(Position = ifelse(Playing_Position =="NA", "UNK", Playing_Position),
         Year = as.numeric(format(Reporting_date, "%Y"))) %>%
  select(Club,
         `Last Name` = Last_name,
         `First Name` = First_name,
         Position,
         `Base Salary` = Base_salary,
         `Guaranteed Comp` = Guaranteed_Comp,
         Year) %>%
  mutate(Name = paste(`First Name`, `Last Name`, sep = " "))  %>%
  mutate(Position = expand_position(Position)) %>%
  filter(!Year %in% c(2020,2021,2022,2023,2024,2025))

# clean and append  ------------------------------------------------------------

dta.table <- bind_rows(dta.25, dta.24, dta.23, dta.22, dta.21, dta.20, dta.pre.20) %>%
  select(Name, Club, Year, Position, `Base Salary`, `Guaranteed Comp`) %>%
  mutate(`Base Salary` = scales::dollar(`Base Salary`)) %>%
  mutate(`Guaranteed Comp` = scales::dollar(`Guaranteed Comp`)) %>%
  mutate(Year = as.character(Year)) %>% 
  mutate(Club = trimws(Club)) %>%
  mutate(Club = ifelse(Club %in% c("MLS Pool", "Major League Soccer", "Retired", "", "Without a Club"),
                       "Unattached", Club)) %>%
  mutate(Club = ifelse(Club == "Montreal Impact","CF Montreal", Club)) %>%
  mutate(Club = ifelse(Club == "St. Louis SC","St. Louis City SCl", Club)) %>%
  mutate(Club = ifelse(Club == "NYCFC","New York City FC", Club)) %>%
  mutate(Club = ifelse(Club == "Montreal","CF Montreal", Club)) %>%
  mutate(Club = ifelse(Club == "New England Revolutio","New England Revolution", Club)) %>%
 mutate(Position = ifelse(is.na(Position) | Position == "Nathan-Dylan", "Unknown", Position)) 

dta.chart <- bind_rows(dta.25, dta.24, dta.23, dta.22, dta.21,dta.20, dta.pre.20) %>%
  select(Name, Club, Year, Position, `Base Salary`, `Guaranteed Comp`) %>%
  mutate(Club = trimws(Club)) %>%
  mutate(Club = ifelse(Club %in% c("MLS Pool", "Major League Soccer", "Retired", "", "Without a Club"),
                       "Unattached", Club)) %>%
  mutate(Club = ifelse(Club == "Montreal Impact","CF Montreal", Club)) %>%
  mutate(Club = ifelse(Club == "St. Louis SC","St. Louis City SC", Club)) %>%
  mutate(Club = ifelse(Club == "NYCFC","New York City FC", Club)) %>%
  mutate(Club = ifelse(Club == "Montreal","CF Montreal", Club)) %>%
  mutate(Club = ifelse(Club == "New England Revolutio","New England Revolution", Club)) %>%
 mutate(Position = ifelse(is.na(Position) | Position == "Nathan-Dylan", "Unknown", Position)) 


# save all  -------------------------------------------------------------------

saveRDS(dta.table, "data/salaries_table.rds")
saveRDS(dta.chart, "data/salaries_charts.rds")
