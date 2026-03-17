# MLS Player Salaries Website

A static React dashboard for viewing and exporting Major League Soccer player salaries. Deployed on Cloudflare Pages.

## Stack

- **Data pipeline**: R scripts (`code/data_pull.R` → `code/convert_to_json.R`)
- **Frontend**: React 18 + Vite, Recharts, react-select
- **Hosting**: Cloudflare Pages (static site)
- **Donations**: Stripe Payment Link

## Local Development

```bash
# 1. Generate JSON data from RDS (requires R + jsonlite)
Rscript code/convert_to_json.R

# 2. Install JS dependencies
npm install

# 3. Start dev server
npm run dev
```

## Deployment (Cloudflare Pages)

1. Push repo to GitHub
2. In Cloudflare Pages → Create a project → connect the GitHub repo
3. Build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Every push to `main` triggers a new deploy

## Data Refresh

1. Run `Rscript code/data_pull.R` to pull latest salary data
2. Run `Rscript code/convert_to_json.R` to regenerate the JSON
3. Commit `public/data/salaries.json` and push
