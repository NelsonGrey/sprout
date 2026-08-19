import type { ReactNode } from 'react';
import {
  AlertTriangle,
  Cookie,
  ExternalLink,
  LifeBuoy,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { usePageMeta } from './usePageMeta';

const policyLinks = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/cookies', label: 'Cookies' },
  { href: '/support', label: 'Support' },
];

function LegalPage({
  eyebrow,
  title,
  summary,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const [path] = useLocation();

  return (
    <div className="bg-canvas">
      <section className="border-b border-border py-12 lg:py-16">
        <div className="mx-auto site-container">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-brand-bright">
            {icon} {eyebrow}
          </div>
          <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-[-0.045em] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
            {summary}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-warning-soft bg-warning-soft px-3 py-1.5 text-xs font-bold text-warning">
            <AlertTriangle size={14} aria-hidden="true" /> Working draft — August
            19, 2026
          </div>
        </div>
      </section>

      <div className="mx-auto grid site-container gap-10 py-12 lg:grid-cols-[210px_minmax(0,1fr)] lg:py-16">
        <aside>
          <nav
            aria-label="Legal and support pages"
            className="grid gap-1 rounded-2xl border border-border bg-surface p-2 lg:sticky lg:top-4"
          >
            {policyLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={path === link.href ? 'page' : undefined}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold ${
                  path === link.href
                    ? 'bg-mint text-brand-strong'
                    : 'text-muted hover:bg-mint hover:text-ink'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>
        <article className="min-w-0 space-y-10 rounded-[28px] border border-border bg-surface p-6 shadow-card sm:p-9 lg:p-12">
          {children}
        </article>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-2xl font-black tracking-[-0.025em] text-ink">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-[15px] leading-7 text-muted">
        {children}
      </div>
    </section>
  );
}

function BulletList({ children }: { children: ReactNode }) {
  return <ul className="ml-5 list-disc space-y-2">{children}</ul>;
}

function DraftNotice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-warning-soft bg-warning-soft p-5 text-sm leading-6 text-warning">
      <strong className="text-ink-soft">Pre-launch notice.</strong> {children}
    </div>
  );
}

export function PrivacyPage() {
  usePageMeta(
    'Privacy',
    'The working Sprout Streak privacy notice for schools, families, educators, and students.'
  );

  return (
    <LegalPage
      eyebrow="Privacy"
      title="Student privacy should be designed in, not added later."
      summary="This working notice explains the information Sprout Streak expects to handle, why it is needed, and the safeguards required before a student-data pilot begins."
      icon={<ShieldCheck size={16} aria-hidden="true" />}
    >
      <DraftNotice>
        Sprout Streak is in pre-launch development. This draft is provided for
        stakeholder review; it is not a claim of FERPA, COPPA, state-law, or
        district-policy compliance. A final notice, data inventory, retention
        schedule, contracts, and qualified legal/privacy review are launch
        gates.
      </DraftNotice>

      <Section title="1. Scope and who we are">
        <p>
          Sprout Streak is a financial-learning product of Nelson Grey LLC. It
          is being designed for schools, educators, families, and students,
          initially from Pre-K through grade 6. This notice covers the public
          website and the Sprout Streak web application. A final notice will
          identify the product’s business contact and effective date before a
          pilot opens.
        </p>
      </Section>

      <Section title="2. Schools, families, and our role">
        <p>
          When a school or district provides student information, the school or
          district remains responsible for its education records and determines
          the approved educational purpose. Sprout Streak expects to act only
          under the institution’s instructions and agreement. A separate family
          experience may require a different consent and account relationship;
          that workflow is planned and is not yet represented as complete.
        </p>
      </Section>

      <Section title="3. Information the product may handle">
        <BulletList>
          <li>
            <strong>Adult and authorized-user accounts:</strong> name, email
            address, sign-in identifier, role, school affiliation, and access
            permissions.
          </li>
          <li>
            <strong>School and classroom records:</strong> school, grade,
            classroom, roster, staff assignment, student name or school-assigned
            identifier, and invited-account information when configured by an
            authorized adult.
          </li>
          <li>
            <strong>Learning and simulated transaction records:</strong>
            classroom or family-context balances, earn/spend entries, notes,
            timestamps, and learning activity needed to show progress and
            history. Sprout Streak balances are instructional and are not real
            money.
          </li>
          <li>
            <strong>Technical and security information:</strong> authentication,
            device, browser, network, error, and security-event information
            generated by the service and its infrastructure providers.
          </li>
          <li>
            <strong>Communications:</strong> information an adult provides in a
            support, procurement, accessibility, or security request. Students
            should not submit support requests or personal information without
            a parent, guardian, teacher, or other authorized adult.
          </li>
        </BulletList>
        <p>
          The product is being designed to avoid collecting precise location,
          contact lists, advertising identifiers, biometric data, or sensitive
          financial-account credentials from students.
        </p>
      </Section>

      <Section title="4. How information is used">
        <BulletList>
          <li>Provide authorized school, classroom, and learning functions.</li>
          <li>Maintain accounts, roles, rosters, balances, and history.</li>
          <li>Secure, troubleshoot, support, and improve the service.</li>
          <li>Meet documented school instructions and legal obligations.</li>
          <li>
            Produce aggregate or de-identified service insights only when the
            method and contract prevent reasonable re-identification and
            prohibit using the result to profile or advertise to students.
          </li>
        </BulletList>
      </Section>

      <Section title="5. Children and consent">
        <p>
          Sprout Streak is intended to include children under 13, so child
          privacy is a core design constraint. The product will not ask a child
          to approve legal terms or provide parental consent. In an authorized
          school context, a school may be permitted to provide consent for a
          limited educational use, subject to applicable law and district
          policy. Direct-to-family use will require an appropriate parent or
          guardian consent path where required. Those workflows must be
          documented and verified before launch.
        </p>
      </Section>

      <Section title="6. Advertising, sale, and profiling">
        <p>
          Sprout Streak does not display behavioral advertising and is not
          designed to sell student personal information. Student information
          will not be used to build commercial marketing profiles. Adding an
          advertising network, social-media tracking technology, or unrelated
          commercial use would require a product decision, privacy review, and
          an updated notice before deployment.
        </p>
      </Section>

      <Section title="7. When information may be disclosed">
        <p>Information may be available only to:</p>
        <BulletList>
          <li>
            Authorized school, district, classroom, family, or student users,
            according to their documented role and context.
          </li>
          <li>
            Contracted infrastructure and identity providers, including Google
            Firebase and configured sign-in providers, solely to operate and
            secure the service under appropriate terms.
          </li>
          <li>
            Authorities or other parties when legally required, or when
            necessary to protect a person or the security and integrity of the
            service, subject to appropriate review.
          </li>
        </BulletList>
        <p>
          The vendor inventory, data locations, subprocessors, contractual
          controls, and change-notice process are not yet final and must be
          published before a student-data pilot.
        </p>
      </Section>

      <Section title="8. Education records and school requests">
        <p>
          If information maintained for a school is an education record, access,
          correction, export, or deletion requests should ordinarily begin with
          the school or district. The institution can verify identity, authority,
          and its recordkeeping obligations. Sprout Streak expects to support
          the institution’s authorized response and to restrict use and
          redisclosure through its school agreement and technical controls.
        </p>
      </Section>

      <Section title="9. Retention and deletion">
        <p>
          Exact retention periods have not been finalized. Student and school
          information will be retained only for the period documented in the
          applicable school agreement and retention schedule, then deleted or
          de-identified unless law requires otherwise. Security logs, backups,
          inactive accounts, and support records also need defined limits. A
          verified deletion procedure—including downstream provider handling—is
          a pilot launch gate.
        </p>
      </Section>

      <Section title="10. Security">
        <p>
          Current foundations include authenticated access, role-aware
          authorization, and managed cloud infrastructure. Before launch, Sprout
          Streak still needs a completed security review, incident-response
          process, vendor review, recovery testing, and district-facing security
          documentation. No online service can promise absolute security.
        </p>
      </Section>

      <Section title="11. Choices and requests">
        <p>
          Adults can use the in-product account-deletion flow for their own
          account. Requests involving school-managed student records should be
          directed first to the school or district. A verified Nelson Grey LLC
          privacy contact and request-response process will be posted here and
          on the <Link href="/support" className="font-bold text-brand underline">Support page</Link>{' '}
          before pilot intake opens.
        </p>
      </Section>

      <Section title="12. Changes and official resources">
        <p>
          The final notice will explain how material changes are communicated
          and when school or parent approval is required. Stakeholders reviewing
          this draft may also consult the official{' '}
          <a
            href="https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions"
            className="font-bold text-brand underline"
          >
            FTC COPPA guidance <ExternalLink className="inline" size={13} />
          </a>{' '}
          and the U.S. Department of Education’s{' '}
          <a
            href="https://studentprivacy.ed.gov/resources/responsibilities-third-party-service-providers-under-ferpa"
            className="font-bold text-brand underline"
          >
            FERPA service-provider guidance{' '}
            <ExternalLink className="inline" size={13} />
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  );
}

export function TermsPage() {
  usePageMeta(
    'Terms',
    'Working terms for the pre-launch Sprout Streak financial-learning service.'
  );

  return (
    <LegalPage
      eyebrow="Terms"
      title="Clear rules for a learning environment."
      summary="These working terms describe the expected responsibilities of institutions, adults, and students using Sprout Streak."
      icon={<Scale size={16} aria-hidden="true" />}
    >
      <DraftNotice>
        These terms are not final launch terms and should not be relied upon as a
        complete district agreement. Institutional agreements, data-processing
        terms, and applicable law will control where they conflict with public
        website terms. Qualified legal review is required before launch.
      </DraftNotice>

      <Section title="1. The service">
        <p>
          Sprout Streak is a Nelson Grey LLC financial-learning product. It uses
          simulated classroom and family contexts to help students practice
          earning, spending, saving, planning, and reflection. Any balances,
          rewards, purchases, or transactions shown in Sprout Streak are
          instructional records only; they are not money, deposits, securities,
          stored value, credit, or a promise of cash redemption.
        </p>
      </Section>

      <Section title="2. Eligibility and adult authorization">
        <p>
          A school, district, parent, guardian, or other authorized adult must
          approve a child’s access as required by law and policy. Children may
          not create an institutional relationship, accept legal terms, or
          provide consent on behalf of an adult. Institutional users represent
          that they have authority to configure accounts, roles, rosters, and
          learning records within their assigned scope.
        </p>
      </Section>

      <Section title="3. Accounts and access">
        <BulletList>
          <li>Provide accurate account and role information.</li>
          <li>Protect sign-in credentials and do not share another person’s account.</li>
          <li>Use only the schools, classrooms, students, and records you are authorized to access.</li>
          <li>Notify the authorized school contact of suspected misuse or unauthorized access.</li>
        </BulletList>
        <p>
          Schools and districts are responsible for approving their users,
          keeping roles current, and promptly removing access when it is no
          longer appropriate.
        </p>
      </Section>

      <Section title="4. Acceptable use">
        <p>Users may not:</p>
        <BulletList>
          <li>Harass, embarrass, threaten, or discriminate against another person.</li>
          <li>Enter unnecessary sensitive information in names, notes, or transaction descriptions.</li>
          <li>Attempt to access, change, export, or delete records outside their authorization.</li>
          <li>Probe security, disrupt service, introduce malicious code, or evade safeguards.</li>
          <li>Use student information for advertising, commercial profiling, or an unrelated purpose.</li>
          <li>Copy, resell, or commercially exploit the service or curriculum except as expressly permitted.</li>
        </BulletList>
      </Section>

      <Section title="5. Educational content and adult judgment">
        <p>
          Sprout Streak provides educational activities, not financial, legal,
          tax, investment, or banking advice. Educators and families should adapt
          lessons to student needs, local standards, accessibility requirements,
          and community context. The starter curriculum requires educator review
          and classroom validation before it is represented as a complete course.
        </p>
      </Section>

      <Section title="6. Privacy and student information">
        <p>
          Use of personal information is described in the{' '}
          <Link href="/privacy" className="font-bold text-brand underline">
            Privacy notice
          </Link>
          . Schools should not use Sprout Streak with student records until the
          applicable agreement, privacy review, authorization, consent path,
          and retention instructions are complete.
        </p>
      </Section>

      <Section title="7. Ownership and limited use">
        <p>
          Nelson Grey LLC and its licensors retain rights in the service,
          branding, software, and original curriculum. Final terms are expected
          to give authorized institutions and families a limited,
          non-transferable right to use the service for approved educational
          purposes during their authorized access period. Users retain rights in
          content they are authorized to submit, subject to the permissions
          required to operate the service.
        </p>
      </Section>

      <Section title="8. Availability, changes, and suspension">
        <p>
          Sprout Streak is pre-launch and may change substantially. The final
          agreement must define support, availability, material product changes,
          data return, suspension, termination, and transition responsibilities.
          Access may be restricted to protect students, users, data, or service
          integrity, with institutional coordination where appropriate.
        </p>
      </Section>

      <Section title="9. Warranties, liability, and governing terms">
        <p>
          Warranty disclaimers, liability limits, indemnity, dispute terms,
          governing law, procurement clauses, and any state-specific terms are
          intentionally not invented in this draft. They require qualified legal
          review and, for institutional use, may be addressed in a negotiated
          agreement.
        </p>
      </Section>

      <Section title="10. Questions">
        <p>
          Review the <Link href="/support" className="font-bold text-brand underline">Support page</Link>{' '}
          for pre-launch routing. A verified legal contact and effective date
          will appear in the final terms before pilot intake opens.
        </p>
      </Section>
    </LegalPage>
  );
}

export function CookiesPage() {
  usePageMeta(
    'Cookies',
    'How Sprout Streak uses cookies and local browser storage during pre-launch development.'
  );

  return (
    <LegalPage
      eyebrow="Cookies and local storage"
      title="Only what the service needs."
      summary="Sprout Streak does not currently use advertising or behavioral-tracking cookies. This working notice explains the limited browser storage used by the product foundation."
      icon={<Cookie size={16} aria-hidden="true" />}
    >
      <DraftNotice>
        This notice reflects the current repository implementation. A verified
        production cookie scan and vendor inventory are required before launch.
        If the deployed service differs, this notice and any required consent
        controls must be updated first.
      </DraftNotice>

      <Section title="1. What these technologies are">
        <p>
          Cookies are small pieces of information stored by a browser. Web
          applications can also use local storage, session storage, and similar
          technologies. Some are necessary for sign-in, security, preferences,
          and reliable operation; others can be used for analytics or
          advertising.
        </p>
      </Section>

      <Section title="2. Current categories">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[580px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-ink-soft">
                <th className="py-3 pr-4 font-black">Category</th>
                <th className="py-3 pr-4 font-black">Current use</th>
                <th className="py-3 font-black">Choice</th>
              </tr>
            </thead>
            <tbody className="align-top">
              <tr className="border-b border-border">
                <td className="py-4 pr-4 font-bold text-ink-soft">Essential</td>
                <td className="py-4 pr-4">Authentication, account security, service integrity, and configured sign-in-provider flows.</td>
                <td className="py-4">Required for signed-in functions.</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-4 pr-4 font-bold text-ink-soft">Preference</td>
                <td className="py-4 pr-4">A temporary local setting remembers the selected pre-launch visual-theme comparison.</td>
                <td className="py-4">Can be cleared in browser settings.</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-4 pr-4 font-bold text-ink-soft">Analytics</td>
                <td className="py-4 pr-4">No web analytics integration is active in the current application code.</td>
                <td className="py-4">Not currently used.</td>
              </tr>
              <tr>
                <td className="py-4 pr-4 font-bold text-ink-soft">Advertising and social tracking</td>
                <td className="py-4 pr-4">No advertising cookies, embedded social feeds, social pixels, or student-facing share widgets are active.</td>
                <td className="py-4">Not used.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="3. Identity and infrastructure providers">
        <p>
          Configured authentication and infrastructure providers, including
          Google Firebase and an identity provider selected during sign-in, may
          use essential cookies or browser storage under their own notices to
          complete authentication and protect the service. The final vendor
          inventory must document the exact deployed behavior.
        </p>
      </Section>

      <Section title="4. Managing browser storage">
        <p>
          Browser controls can display or clear cookies and local storage.
          Blocking essential storage may prevent sign-in or other application
          functions. Because no optional analytics or advertising technologies
          are currently active, Sprout Streak does not currently show an
          optional-cookie preference banner. That decision must be revisited
          before adding any optional technology.
        </p>
      </Section>

      <Section title="5. Social links">
        <p>
          Sprout Streak does not currently include social-media links. If added,
          they should be plain outbound links intended for adult stakeholders,
          clearly leave the Sprout Streak service, and avoid embedded feeds,
          pixels, automatic data collection, student sharing prompts, or requests
          that children contact the company through social media.
        </p>
      </Section>

      <Section title="6. Changes and questions">
        <p>
          This page will be updated before new cookie categories or vendors are
          enabled. Questions can be routed through the{' '}
          <Link href="/support" className="font-bold text-brand underline">
            Support page
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}

const supportRoutes = [
  {
    audience: 'District and school staff',
    guidance:
      'Use your designated Sprout Streak implementation or procurement contact. That route should handle access, privacy, security, rostering, and institution-wide issues.',
  },
  {
    audience: 'Educators',
    guidance:
      'Start with your school administrator for classroom access, roster corrections, role changes, or student-record questions.',
  },
  {
    audience: 'Parents and guardians',
    guidance:
      'For school-managed accounts or education records, begin with the student’s teacher, school, or district so they can verify identity and authority.',
  },
  {
    audience: 'Students',
    guidance:
      'Ask a parent, guardian, teacher, or trusted school adult for help. Do not post your name, school, password, balance, or screenshots on social media.',
  },
];

export function SupportPage() {
  usePageMeta(
    'Support',
    'Pre-launch support routing for Sprout Streak schools, educators, families, and students.'
  );

  return (
    <LegalPage
      eyebrow="Support"
      title="Help should reach the right trusted adult."
      summary="Sprout Streak support is being designed around school authority, family verification, child safety, accessibility, and clear escalation paths."
      icon={<LifeBuoy size={16} aria-hidden="true" />}
    >
      <DraftNotice>
        Public pilot intake and direct support are not yet open. A verified
        support address, service hours, response targets, identity-verification
        procedure, and security escalation path must be published before launch.
        No contact address is shown here until it is operational and monitored.
      </DraftNotice>

      <Section title="Choose the right path">
        <div className="grid gap-3 sm:grid-cols-2">
          {supportRoutes.map(route => (
            <div
              key={route.audience}
              className="rounded-2xl border border-border bg-canvas p-5"
            >
              <h3 className="font-black text-ink-soft">{route.audience}</h3>
              <p className="mt-2 text-sm leading-6">{route.guidance}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Common questions">
        <div className="space-y-5">
          <div>
            <h3 className="font-black text-ink-soft">I cannot sign in.</h3>
            <p className="mt-1">Confirm that you are using the email and sign-in method approved by your school or account administrator. Do not send a password to anyone.</p>
          </div>
          <div>
            <h3 className="font-black text-ink-soft">A name, role, roster, or balance is wrong.</h3>
            <p className="mt-1">Contact the teacher or school administrator responsible for that classroom or record. They can verify the correction and its educational context.</p>
          </div>
          <div>
            <h3 className="font-black text-ink-soft">I want to access, correct, export, or delete student information.</h3>
            <p className="mt-1">For school-managed records, begin with the school or district. For an adult’s own Sprout Streak account, the application includes an account-deletion flow. The final support process will cover verified privacy requests and data export.</p>
          </div>
          <div>
            <h3 className="font-black text-ink-soft">I found a possible security or privacy issue.</h3>
            <p className="mt-1">Do not include student records, passwords, or exploit details in a public post or social-media message. The pre-launch security reporting channel is not yet open and is a launch gate.</p>
          </div>
          <div>
            <h3 className="font-black text-ink-soft">I need an accessibility accommodation.</h3>
            <p className="mt-1">Tell your school or authorized adult what task is blocked and what assistive technology you use, without sending unnecessary student information. A direct accessibility contact and documented response process must be in place before launch.</p>
          </div>
        </div>
      </Section>

      <Section title="District review">
        <p>
          Procurement teams can review the current capability and launch-gate
          status in the{' '}
          <Link href="/readiness" className="font-bold text-brand underline">
            Readiness center
          </Link>
          . A district support package still needs named escalation ownership,
          severity definitions, response targets, incident communications,
          accessibility handling, and data-request procedures.
        </p>
      </Section>
    </LegalPage>
  );
}
