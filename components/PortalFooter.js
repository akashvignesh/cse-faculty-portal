import Link from "next/link";

function HomeIcon() {
  return (
    <svg
      className="portal-footer-home-icon"
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M8 1.2 1.5 6.6v7.2c0 .4.3.7.7.7h3.9c.4 0 .7-.3.7-.7V10h2.4v3.8c0 .4.3.7.7.7h3.9c.4 0 .7-.3.7-.7V6.6z" />
    </svg>
  );
}

export default function PortalFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="portal-footer" aria-label="Site footer">
      <div className="portal-footer-top">
        <div className="portal-footer-meta">
          <Link className="portal-footer-home" href="/" aria-label="CSE Faculty Portal home">
            <HomeIcon />
          </Link>
          <span>CSE Faculty Portal</span>
        </div>

        <div className="portal-footer-help">
          Need Help? <a href="mailto:cse-consult@buffalo.edu">cse-consult@buffalo.edu</a>
        </div>
      </div>

      <div className="portal-footer-bottom">
        &copy; {currentYear}{" "}
        <a href="https://buffalo.edu" target="_blank" rel="noreferrer">
          University at Buffalo
        </a>
        . All rights reserved. |{" "}
        <a
          href="https://www.buffalo.edu/administrative-services/policy1/ub-policy-lib/privacy.html"
          target="_blank"
          rel="noreferrer"
        >
          Privacy
        </a>{" "}
        |{" "}
        <a
          href="https://www.buffalo.edu/access/about-us/contact-us.html"
          target="_blank"
          rel="noreferrer"
        >
          Accessibility
        </a>
      </div>
    </footer>
  );
}
