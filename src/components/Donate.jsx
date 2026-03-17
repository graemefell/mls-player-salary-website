// TODO: Replace this placeholder URL with your Stripe Payment Link.
// Create one at https://dashboard.stripe.com/payment-links
const STRIPE_PAYMENT_LINK = 'https://donate.stripe.com/YOUR_LINK_HERE'

export default function Donate() {
  return (
    <div className="donate-page">
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
        Donate via Stripe
      </a>
    </div>
  )
}
