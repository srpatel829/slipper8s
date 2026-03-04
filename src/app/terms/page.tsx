import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-block"
        >
          ← Back to Slipper8s
        </Link>

        <h1 className="text-3xl font-bold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: March 3, 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using Slipper8s (&quot;the Service&quot;), available at slipper8s.com,
              you agree to be bound by these Terms of Service. If you do not agree, please do not
              use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              Slipper8s is a free college basketball tournament prediction game. Players select 8
              teams and earn points based on seed value multiplied by wins. The Service is provided
              for entertainment purposes only and does not involve real money wagering, gambling, or
              prizes unless explicitly stated for a specific season.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Account Registration</h2>
            <p className="text-muted-foreground leading-relaxed">
              To use Slipper8s, you must create an account using either a valid email address (magic
              link login) or Google OAuth. You are responsible for maintaining the confidentiality of
              your account. You agree to provide accurate information during registration. Usernames
              must not contain offensive or inappropriate language. We reserve the right to modify or
              remove usernames at our discretion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. User Conduct</h2>
            <p className="text-muted-foreground leading-relaxed">You agree not to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
              <li>Create multiple accounts to gain an unfair advantage</li>
              <li>Use automated tools, bots, or scripts to interact with the Service</li>
              <li>Attempt to manipulate scores, rankings, or leaderboard positions</li>
              <li>Interfere with or disrupt the Service or its infrastructure</li>
              <li>Use the Service for any unlawful purpose</li>
              <li>Harass, abuse, or harm other users</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Entries and Picks</h2>
            <p className="text-muted-foreground leading-relaxed">
              All picks must be submitted before the published entry deadline. The deadline is
              enforced server-side using UTC time. Picks submitted after the deadline will be
              rejected. You may edit or delete your picks at any time before the deadline. Once the
              deadline passes, all entries are locked and cannot be modified. There is no limit on
              the number of entries per player.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Scoring and Results</h2>
            <p className="text-muted-foreground leading-relaxed">
              Scores are calculated automatically based on publicly available game results. While we
              strive for accuracy, we reserve the right to correct scoring errors at any time. Final
              results and rankings are determined at our sole discretion. In the event of a data
              discrepancy, the administrator&apos;s determination is final.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Private Leagues</h2>
            <p className="text-muted-foreground leading-relaxed">
              Users may create private leagues and share invite codes with others. League
              administrators are responsible for managing their league members. We are not
              responsible for any disputes within private leagues.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Slipper8s name, logo, and all content created by us are our intellectual property.
              Team names, logos, and related marks are property of their respective owners and are
              used for informational purposes only. Slipper8s is not affiliated with, endorsed by,
              or connected to the NCAA or any college basketball program.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is provided &quot;as is&quot; without warranties of any kind. We are not
              liable for any damages arising from your use of the Service, including but not limited
              to service interruptions, data loss, or scoring errors. Our total liability shall not
              exceed $0 as this is a free service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Account Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to suspend or terminate any account that violates these terms or
              engages in conduct we deem harmful to the Service or its users. Upon termination,
              personal data will be anonymized but game history may be retained for leaderboard
              integrity.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms at any time. Continued use of the Service after changes
              constitutes acceptance. Material changes will be communicated via email to registered
              users.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Questions about these Terms? Reach out at{" "}
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
