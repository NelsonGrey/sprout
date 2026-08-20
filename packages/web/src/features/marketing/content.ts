export type Audience = {
  slug: string;
  eyebrow: string;
  name: string;
  shortName: string;
  headline: string;
  summary: string;
  outcomes: { title: string; body: string }[];
  questions: { question: string; answer: string }[];
  workflow: { step: string; title: string; body: string }[];
  cta: string;
};

export const audiences: Audience[] = [
  {
    slug: 'districts',
    eyebrow: 'For district leadership',
    name: 'Superintendents & district teams',
    shortName: 'Districts',
    headline:
      'Plan one financial-learning direction from Pre-K through graduation.',
    summary:
      'Give curriculum, technology, student services, and school leaders a shared framework—without pretending every grade needs the same experience.',
    outcomes: [
      {
        title: 'A coherent progression',
        body: 'Start with choice and self-control, build habits in elementary school, then deepen knowledge and decision-making over time.',
      },
      {
        title: 'Implementation visibility',
        body: 'See where practice is happening across schools while keeping classroom work lightweight and age appropriate.',
      },
      {
        title: 'Procurement honesty',
        body: 'Review readiness by domain, including privacy, accessibility, interoperability, and support, before a purchase decision.',
      },
    ],
    questions: [
      {
        question: 'Can this serve the whole district?',
        answer:
          'That is the product direction. The working foundation currently centers on school and classroom administration, with Pre-K–6 curriculum development first. District controls and secondary curriculum remain planned.',
      },
      {
        question: 'Does Sprout Streak claim FERPA or COPPA certification?',
        answer:
          'No. Those laws do not provide a general product certification. Sprout Streak will publish its data practices and contracting materials before it is offered for district procurement.',
      },
      {
        question: 'Can schools start smaller?',
        answer:
          'Yes. The rollout model is designed to support a classroom or school pilot before broader adoption, with success measures agreed in advance.',
      },
    ],
    workflow: [
      {
        step: '01',
        title: 'Set the learning direction',
        body: 'Choose grade bands, instructional priorities, and a small set of student outcomes.',
      },
      {
        step: '02',
        title: 'Pilot with boundaries',
        body: 'Select schools, document data responsibilities, and train a focused educator cohort.',
      },
      {
        step: '03',
        title: 'Review evidence',
        body: 'Evaluate participation, learning artifacts, educator workload, accessibility, and family feedback.',
      },
    ],
    cta: 'Explore the readiness center',
  },
  {
    slug: 'schools',
    eyebrow: 'For school leadership',
    name: 'Principals & school staff',
    shortName: 'Schools',
    headline: 'A schoolwide language for choices, goals, and growth.',
    summary:
      'Coordinate classroom practice without flattening teacher judgment. Sprout Streak is designed for homerooms, specialists, support staff, and administrators to work within clear scopes.',
    outcomes: [
      {
        title: 'Less roster friction',
        body: 'Organize grades, classrooms, staff assignments, and student transitions from one school context.',
      },
      {
        title: 'Roles that fit real schools',
        body: 'Support classroom teachers, co-teachers, and cross-class specialists without defaulting everyone to full administration.',
      },
      {
        title: 'A teachable culture',
        body: 'Use shared language—earn, plan, save, spend, reflect—across classrooms and family conversations.',
      },
    ],
    questions: [
      {
        question: 'Is this a PBIS replacement?',
        answer:
          'No. Sprout Streak focuses on financial capability through everyday practice. Schools may connect it to existing routines, but it is not positioned as a complete behavior or discipline system.',
      },
      {
        question: 'What does a principal manage?',
        answer:
          'The current web foundation includes school setup, grades offered, staff access, scoped roles, student rosters, and year-to-year student movement.',
      },
      {
        question: 'What will staff need?',
        answer:
          'A short implementation routine, clear transaction norms, and shared language. A pilot should avoid adding a separate daily lesson block unless the school chooses one.',
      },
    ],
    workflow: [
      {
        step: '01',
        title: 'Define the school rhythm',
        body: 'Choose where money conversations naturally fit: morning meeting, classroom jobs, math, or advisory.',
      },
      {
        step: '02',
        title: 'Set access thoughtfully',
        body: 'Give each staff member the narrowest role that supports their real responsibilities.',
      },
      {
        step: '03',
        title: 'Listen and adjust',
        body: 'Use student reflection and staff feedback to improve the routine—not just increase transaction volume.',
      },
    ],
    cta: 'See the learning approach',
  },
  {
    slug: 'educators',
    eyebrow: 'For educators',
    name: 'Teachers & instructional staff',
    shortName: 'Educators',
    headline: 'Turn ordinary classroom moments into money practice.',
    summary:
      'Use an earn, save, spend, and reflect loop alongside classroom jobs, choices, and goals—without needing to become a personal-finance expert.',
    outcomes: [
      {
        title: 'Ready-to-use learning',
        body: 'Open a short lesson, see the objective and materials, then guide a student mission and reflection.',
      },
      {
        title: 'Fewer repetitive actions',
        body: 'Work with a whole class or a selected group, and let students see their own balance and history.',
      },
      {
        title: 'Practice, not prizes alone',
        body: 'Connect each transaction to vocabulary, a decision, or a reflection so the ledger becomes a learning tool.',
      },
    ],
    questions: [
      {
        question: 'Do I need a separate curriculum period?',
        answer:
          'No. Starter lessons range from 15 to 45 minutes, and the product loop is designed to reinforce the same ideas in small everyday moments.',
      },
      {
        question: 'Is the money real?',
        answer:
          'The classroom ledger is a simulation. Educators define age-appropriate ways to earn and use classroom currency; students never need a bank account or payment card.',
      },
      {
        question: 'Can specialists participate?',
        answer:
          'Yes. The web foundation includes scoped specialist access across assigned classes or grade levels, addressing a major limitation identified in existing tools.',
      },
    ],
    workflow: [
      {
        step: '01',
        title: 'Name the choice',
        body: 'Make the moment visible: earn, spend, save, wait, compare, or plan.',
      },
      {
        step: '02',
        title: 'Let students decide',
        body: 'Offer a meaningful, bounded choice and give students time to explain it.',
      },
      {
        step: '03',
        title: 'Reflect without shame',
        body: 'Ask what happened and what they might try next. A choice is information, not a character grade.',
      },
    ],
    cta: 'Browse starter lessons',
  },
  {
    slug: 'families',
    eyebrow: 'For families',
    name: 'Parents & guardians',
    shortName: 'Families',
    headline: 'Keep the conversation going after the school day.',
    summary:
      'Use the same calm language at home—choices, tradeoffs, goals, and waiting—while keeping family decisions separate from school administration.',
    outcomes: [
      {
        title: 'Simple conversation prompts',
        body: 'Each starter lesson includes a short family bridge that works at the store, in the kitchen, or during a weekly plan.',
      },
      {
        title: 'A child’s-eye view',
        body: 'Students can see their own progress and explain choices instead of relying on an adult-only score.',
      },
      {
        title: 'Room for different families',
        body: 'Activities avoid assumptions about allowance, income, banking access, or what a family can afford.',
      },
    ],
    questions: [
      {
        question: 'Do we need to pay children for chores?',
        answer:
          'No. Families choose their own approach. The learning activities can use time, tokens, pretend money, or real-life choices without requiring an allowance.',
      },
      {
        question: 'Will school and home balances be mixed?',
        answer:
          'The product direction is one student identity with clearly separated classroom and family contexts. Family mode is planned and is not represented as live today.',
      },
      {
        question: 'How do we avoid money anxiety?',
        answer:
          'Keep examples hypothetical when needed, invite rather than force disclosure, and focus on reasoning. The lesson guidance explicitly avoids ranking children by resources.',
      },
    ],
    workflow: [
      {
        step: '01',
        title: 'Notice',
        body: 'Point out a real choice without turning it into a lecture.',
      },
      {
        step: '02',
        title: 'Wonder',
        body: 'Ask what matters, what could wait, and what would change the decision.',
      },
      {
        step: '03',
        title: 'Try again',
        body: 'Let the next everyday choice become another low-stakes practice opportunity.',
      },
    ],
    cta: 'Try a family-friendly lesson',
  },
  {
    slug: 'students',
    eyebrow: 'For students',
    name: 'Young money explorers',
    shortName: 'Students',
    headline: 'Your choices. Your goals. Your next smart move.',
    summary:
      'Sprout Streak helps you practice what money can do: earn it, plan it, save it, spend it, and learn from every choice.',
    outcomes: [
      {
        title: 'Know what happened',
        body: 'See your balance and history so a number never feels like a mystery.',
      },
      {
        title: 'Grow toward a goal',
        body: 'Break a big goal into smaller steps and notice each bit of progress.',
      },
      {
        title: 'Choose without fear',
        body: 'There is not always one perfect answer. Explain your thinking, see the tradeoff, and try again.',
      },
    ],
    questions: [
      {
        question: 'Is Sprout money real money?',
        answer:
          'No. It is a safe practice space your teacher or family can use to help you learn.',
      },
      {
        question: 'What if I make a choice I regret?',
        answer:
          'That is part of learning. Look at what happened, name what you would change, and make a plan for your next choice.',
      },
      {
        question: 'Can other students see my balance?',
        answer:
          'Sprout Streak is being designed so your information is shown only to people who need it. Privacy controls are still part of the pre-launch readiness work.',
      },
    ],
    workflow: [
      {
        step: '01',
        title: 'Pause',
        body: 'What do you want now, and what do you want later?',
      },
      {
        step: '02',
        title: 'Choose',
        body: 'Pick the option that fits your goal and explain why.',
      },
      {
        step: '03',
        title: 'Grow',
        body: 'Check what happened. Keep your plan or change it with new information.',
      },
    ],
    cta: 'Start a student mission',
  },
];

// Lesson content moved to @sprout/shared in Slice 3 — see
// docs/detailed-design/05_IMPLEMENTATION_HANDOFF.md. It's the single
// canonical copy; packages/mobile reads a generated JSON asset from it
// rather than a hand-duplicated Dart copy.
export { type Lesson, lessons, getLesson } from '@sprout/shared';

export const gradeBands = [
  'All',
  'Pre-K–K',
  'Grades 1–2',
  'Grades 3–4',
  'Grades 5–6',
] as const;

export function getAudience(slug?: string) {
  return audiences.find(audience => audience.slug === slug);
}
