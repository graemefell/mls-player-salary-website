const STRIPE_PAYMENT_LINK = 'https://donate.stripe.com/YOUR_LINK_HERE'

export default function About() {
  return (
    <div className="about-page">
      <section className="about-section">
        <h4><strong>Data Sources</strong></h4>
        <p>
          This application uses data sourced from the latest available MLS player salary datasets
          at{' '}
          <a href="https://mlsplayers.org/resources/salary-guide" target="_blank" rel="noopener noreferrer">
            mlsplayers.org
          </a>.
        </p>

        <h4><strong>Positions</strong></h4>
        <p>
          Player positions for years prior to 2024 are approximated. The original salary
          releases listed positions in abbreviated formats (e.g. "M", "D", "M-D"), which have
          been mapped to the closest standard position categories used in this application.
        </p>

        <h4><strong>Latest Refresh</strong></h4>
        <p>
          The data was last refreshed on: <em>October 1, 2025</em>
        </p>

        <h4><strong>Inspiration</strong></h4>
        <p>
          This project was inspired by the public Tableau visualization{' '}
          <a href="https://public.tableau.com/app/profile/bo.mccready8742/viz/MajorLeagueSoccerSalaries2025/MLSSalaries25" target="_blank" rel="noopener noreferrer">
            Major League Soccer Salaries 2025
          </a>{' '}
          by Bo McCready.
        </p>
      </section>

      <hr className="about-divider" />

      <section className="about-section donate-section">
        <h2>Support This Project</h2>
        <p>
          If you find this MLS salary data useful, consider making a donation to help
          cover hosting costs and keep the data up to date.
        </p>
        <a
          href={STRIPE_PAYMENT_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="donate-button"
        >
          Donate via Stripe (coming soon)
        </a>
      </section>
    </div>
  )
}
