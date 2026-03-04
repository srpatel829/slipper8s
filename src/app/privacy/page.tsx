import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-block"
        >
          ← Back to Slipper8s
        </Link>

        <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: March 3, 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>

            <h3 className="text-base font-medium mt-4 mb-2 text-foreground">
              Information you provide:
            </h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>
                <strong className="text-foreground">Required:</strong> First name, last name, email
                address, username
              </li>
              <li>
                <strong className="text-foreground">Optional:</strong> Favorite team, country, state
                (US only), gender, date of birth, phone number, profile photo
              </li>
            </ul>

            <h3 className="text-base font-medium mt-4 mb-2 text-foreground">
              Information collected automatically:
            </h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>IP address and browser type (for security and rate limiting)</li>
              <li>Usage data (pages viewed, features used)</li>
              <li>Device information (screen size, operating system)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>
                <strong className="text-foreground">Account management:</strong> Authenticate your
                identity, manage your profile
              </li>
              <li>
                <strong className="text-foreground">Game functionality:</strong> Display your picks,
                scores, and rankings on leaderboards
              </li>
              <li>
                <strong className="text-foreground">Communication:</strong> Send transactional
                emails (welcome, pick confirmations, results) and optional notifications
              </li>
              <li>
                <strong className="text-foreground">Leaderboard dimensions:</strong> Country, state,
                gender, and conference data are used to create filtered leaderboard views
              </li>
              <li>
                <strong className="text-foreground">Service improvement:</strong> Understand usage
                patterns to improve the experience
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. What&apos;s Displayed Publicly</h2>
            <p className="text-muted-foreground leading-relaxed">
              The following information is visible to other Slipper8s users on leaderboards and
              player profiles:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
              <li>Your first name, last name, and username</li>
              <li>Your picks, scores, rankings, and percentiles</li>
              <li>Your profile photo (if uploaded)</li>
              <li>Your favorite team (if provided)</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              The following is <strong className="text-foreground">never</strong> displayed
              publicly:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
              <li>Your email address</li>
              <li>Your phone number</li>
              <li>Your date of birth</li>
              <li>Your IP address</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Data Storage and Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data is stored in a PostgreSQL database hosted on Neon (cloud infrastructure).
              Phone numbers are encrypted at rest. We use industry-standard security measures
              including HTTPS encryption, secure authentication tokens, and rate limiting. Profile
              photos are resized server-side and stored on secure cloud storage.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Email Communications</h2>
            <p className="text-muted-foreground leading-relaxed">
              We send two types of emails:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
              <li>
                <strong className="text-foreground">Mandatory emails</strong> (cannot be opted
                out): Welcome email, entry confirmations, entries locked notification, final results
              </li>
              <li>
                <strong className="text-foreground">Optional emails</strong> (can be disabled in
                settings): Deadline reminders, daily recaps, play-in slot updates
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Emails are sent via Resend and we do not sell or share your email address with third
              parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">We use the following services:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
              <li>
                <strong className="text-foreground">Vercel:</strong> Hosting and deployment
              </li>
              <li>
                <strong className="text-foreground">Neon:</strong> Database hosting
              </li>
              <li>
                <strong className="text-foreground">Resend:</strong> Email delivery
              </li>
              <li>
                <strong className="text-foreground">Google OAuth:</strong> Optional sign-in
                (subject to Google&apos;s Privacy Policy)
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              We do not sell your personal data to any third party.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Cookies and Tracking</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies for authentication (session tokens). We do not use
              advertising cookies or third-party tracking pixels. Analytics, if implemented, will use
              privacy-respecting methods.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your game history (picks, scores, rankings) is retained permanently for historical
              leaderboards and the Hall of Champions. If you delete your account, personal
              information (name, email, phone) is anonymized, but game records are retained with an
              anonymized identifier to maintain leaderboard integrity.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">You have the right to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate personal data</li>
              <li>Request deletion of your account (with anonymization as described above)</li>
              <li>Opt out of optional email notifications</li>
              <li>Export your picks and score data</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              To exercise these rights, contact us at{" "}
              <a href="mailto:support@slipper8s.com" className="text-primary hover:underline">
                support@slipper8s.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Children&apos;s Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Slipper8s is not directed at children under 13. We do not knowingly collect personal
              information from children under 13. If we become aware of such collection, we will
              delete the information promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. Material changes will be
              communicated via email. Continued use of the Service after changes constitutes
              acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Questions about this Privacy Policy? Reach out at{" "}
              <a href="mailto:support@slipper8s.com" className="text-primary hover:underline">
                support@slipper8s.com
              </a>
              .
            </p>
          </section>
        </div>

        <div className="border-t border-border mt-12 pt-6">
          <p className="text-xs text-muted-foreground text-center">
            Slipper8s — Where sleeper picks become glass slippers
          </p>
        </div>
      </div>
    </div>
  )
}
