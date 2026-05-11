import type { Metadata } from "next";
import { Link2, Mail, BarChart3, Ban, Search, Globe, Bell, Send, Database } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | DamKoi",
  description: "DamKoi Privacy Policy — what data we collect, how we use it, and how to contact us.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen pt-24 pb-20 px-4 max-w-3xl mx-auto">
      <div className="nm-raised rounded-2xl p-8 md:p-12">
        <h1 className="text-3xl font-black tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-white/40 text-sm mb-10">
          Last updated: April 2025 &nbsp;·&nbsp; Effective immediately
        </p>

        <Section title="Who We Are">
          <p>
            DamKoi (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is a price intelligence service for online shoppers in Bangladesh.
            We operate the DamKoi website (<code>damkoi.com</code>) and the DamKoi Chrome Extension.
            Contact: <a href="mailto:team@damkoi.com" className="text-primary hover:underline">team@damkoi.com</a>
          </p>
        </Section>

        <Section title="What We Collect">
          <ul className="space-y-3 list-none">
            <Li icon={<Link2 size={18} className="text-indigo-400" />}>
              <strong>Product URLs:</strong> When you visit a Daraz product page with the extension active,
              or submit a URL on our website, we store that URL and its product ID to track price history.
              We do <em>not</em> collect any other URLs you visit.
            </Li>
            <Li icon={<Mail size={18} className="text-emerald-400" />}>
              <strong>Email address:</strong> Only if you voluntarily set a price alert. Used solely
              to send you a single notification email when your target price is reached. We do not send
              marketing emails.
            </Li>
            <Li icon={<BarChart3 size={18} className="text-blue-400" />}>
              <strong>Price data:</strong> We periodically scrape publicly available product prices
              from Daraz.com.bd to build price history. This data is not personally identifiable.
            </Li>
          </ul>
        </Section>

        <Section title="What We Do NOT Collect">
          <ul className="space-y-3 list-none">
            <Li icon={<Ban size={18} className="text-rose-400" />}>We do <strong>not</strong> track your browsing history beyond Daraz product pages.</Li>
            <Li icon={<Ban size={18} className="text-rose-400" />}>We do <strong>not</strong> collect passwords, payment information, or personal details.</Li>
            <Li icon={<Ban size={18} className="text-rose-400" />}>We do <strong>not</strong> require account registration to use the extension.</Li>
            <Li icon={<Ban size={18} className="text-rose-400" />}>We do <strong>not</strong> sell, rent, or share your data with third parties for advertising.</Li>
            <Li icon={<Ban size={18} className="text-rose-400" />}>We do <strong>not</strong> use cookies for tracking or analytics.</Li>
          </ul>
        </Section>

        <Section title="Chrome Extension Permissions">
          <ul className="space-y-3 list-none">
            <Li icon={<Search size={18} className="text-amber-400" />}>
              <strong>activeTab / tabs:</strong> Used only to read the current tab URL when you open the popup,
              to determine if you are on a Daraz product page.
            </Li>
            <Li icon={<Globe size={18} className="text-blue-400" />}>
              <strong>host_permissions (daraz.com.bd, api.damkoi.com):</strong> Allows the extension to
              fetch price data from our API and to inject the price history panel on Daraz product pages.
            </Li>
            <Li icon={<Bell size={18} className="text-indigo-400" />}>
              <strong>alarms / storage:</strong> Used locally to cache recent verdicts and schedule
              background badge updates. No data leaves your device via these permissions.
            </Li>
          </ul>
        </Section>

        <Section title="Data Retention">
          <p>
            Price history data is retained indefinitely as it forms the core value of the service (long-term
            price trends). Email addresses used for price alerts are deleted automatically 30 days after
            the alert is triggered or when you request deletion by emailing{" "}
            <a href="mailto:team@damkoi.com" className="text-primary hover:underline">team@damkoi.com</a>.
          </p>
        </Section>

        <Section title="Third-Party Services">
          <ul className="space-y-3 list-none">
            <Li icon={<Send size={18} className="text-emerald-400" />}>
              <strong>Resend:</strong> Used to send price alert emails. Your email is transmitted to Resend
              solely for this purpose and is subject to{" "}
              <a href="https://resend.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Resend&apos;s Privacy Policy
              </a>.
            </Li>
            <Li icon={<Database size={18} className="text-blue-400" />}>
              <strong>Supabase:</strong> Our database provider. Data is stored in servers compliant with
              standard cloud security practices. See{" "}
              <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Supabase&apos;s Privacy Policy
              </a>.
            </Li>
          </ul>
        </Section>

        <Section title="Your Rights">
          <p>
            You may request deletion of your email address from our price alert system at any time by
            emailing <a href="mailto:team@damkoi.com" className="text-primary hover:underline">team@damkoi.com</a> with
            the subject &quot;Delete my data&quot;. We will process the request within 7 business days.
          </p>
        </Section>

        <Section title="Changes to This Policy">
          <p>
            We may update this policy as the product evolves. The &quot;Last updated&quot; date at the top of
            this page will always reflect the most recent revision. Continued use of DamKoi after
            changes constitutes acceptance of the updated policy.
          </p>
        </Section>

        <div className="mt-10 pt-6 border-t border-white/5 text-sm text-white/40">
          Questions? Email us at{" "}
          <a href="mailto:team@damkoi.com" className="text-primary hover:underline">team@damkoi.com</a>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
        <span className="w-1 h-5 bg-primary rounded-full inline-block" />
        {title}
      </h2>
      <div className="text-white/60 text-sm leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

function Li({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 mt-0.5">{icon}</span>
      <span>{children}</span>
    </li>
  );
}
