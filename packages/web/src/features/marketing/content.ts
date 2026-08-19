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

export type Lesson = {
  slug: string;
  title: string;
  band: 'Pre-K–K' | 'Grades 1–2' | 'Grades 3–4' | 'Grades 5–6';
  minutes: number;
  strand: 'Plan' | 'Earn' | 'Spend' | 'Save' | 'Protect';
  buildingBlock: string;
  summary: string;
  objective: string;
  vocabulary: string[];
  materials: string[];
  warmup: string;
  mission: { title: string; instructions: string }[];
  reflect: string[];
  check: string;
  familyBridge: string;
  productConnection: string;
  inclusionNote: string;
  standardsNote: string;
};

export const lessons: Lesson[] = [
  {
    slug: 'the-waiting-garden',
    title: 'The Waiting Garden',
    band: 'Pre-K–K',
    minutes: 15,
    strand: 'Plan',
    buildingBlock: 'Executive function',
    summary:
      'Practice waiting for a later reward and noticing what helps while you wait.',
    objective:
      'Students will choose between a small reward now and a larger pretend reward later, then name one strategy that makes waiting easier.',
    vocabulary: ['now', 'later', 'wait', 'choice'],
    materials: [
      'Two paper seed shapes per student',
      'Crayons',
      'A visible two-minute timer',
    ],
    warmup:
      'Show one paper seed. Ask: “What does a seed need before it becomes a plant?” Connect waiting for growth to waiting for something we want.',
    mission: [
      {
        title: 'Choose',
        instructions:
          'Offer one seed to color now or two seeds after the timer. Say clearly that either choice is allowed.',
      },
      {
        title: 'Try a waiting tool',
        instructions:
          'Students who wait choose a tool: take three slow breaths, sing a quiet verse, or watch the timer.',
      },
      {
        title: 'Notice',
        instructions:
          'Give the promised seeds. Invite everyone to draw what their seed could grow into.',
      },
    ],
    reflect: [
      'What did you choose?',
      'What made waiting easy or hard?',
      'When might waiting help you reach a goal?',
    ],
    check:
      'Listen for a student to name their choice and one waiting strategy. Do not score the choice itself as right or wrong.',
    familyBridge:
      'At home, choose a small everyday wait—finishing one task before another activity—and let the child pick a waiting tool.',
    productConnection:
      'Later product use can turn “save for later” into a familiar action, but this lesson works without an account or device.',
    inclusionNote:
      'Waiting can be especially hard for some learners. Offer a shorter timer, a visual countdown, movement, or an immediate option without shame.',
    standardsNote:
      'Builds the early-childhood foundation for planning, self-control, and delayed gratification described in the CFPB youth financial-capability framework.',
  },
  {
    slug: 'need-want-or-both',
    title: 'Need, Want, or Both?',
    band: 'Grades 1–2',
    minutes: 25,
    strand: 'Spend',
    buildingBlock: 'Financial habits and norms',
    summary:
      'Sort everyday items while discovering that context can change a decision.',
    objective:
      'Students will explain why an item may be a need, a want, or different depending on the situation.',
    vocabulary: ['need', 'want', 'choice', 'reason'],
    materials: [
      'Item cards drawn by the teacher or class',
      'Three signs: Need, Want, It Depends',
    ],
    warmup:
      'Hold up a water bottle and a party balloon. Ask what each one helps a person do. Avoid defining every object as only one category.',
    mission: [
      {
        title: 'Move and sort',
        instructions:
          'Read an item card. Students move near the sign that fits their thinking.',
      },
      {
        title: 'Add the story',
        instructions:
          'Change one detail: “What if the boots are for walking through snow to school?” Let students move again.',
      },
      {
        title: 'Build a balanced basket',
        instructions:
          'In pairs, select four cards for a pretend basket and explain the choices.',
      },
    ],
    reflect: [
      'Why can two people sort the same thing differently?',
      'Which detail changed your mind?',
      'How can we ask questions before we spend?',
    ],
    check:
      'Ask each pair to explain one classification using “because.” Look for reasoning, not agreement with a single answer key.',
    familyBridge:
      'During a shopping moment, pick one item and ask: “What job would this do for us? Is it a need, a want, or does it depend?”',
    productConnection:
      'Before a simulated classroom purchase, students can name the purpose of the choice and what they will have left.',
    inclusionNote:
      'Never ask students to disclose what their family can or cannot buy. Keep examples fictional and treat needs as context dependent.',
    standardsNote:
      'Introduces spending decisions and comparison while building habits and values appropriate to early elementary learners.',
  },
  {
    slug: 'three-path-plan',
    title: 'The Three-Path Plan',
    band: 'Grades 1–2',
    minutes: 30,
    strand: 'Plan',
    buildingBlock: 'Financial habits and norms',
    summary:
      'Give each pretend coin a job: use soon, save for later, or help others.',
    objective:
      'Students will create and explain a plan for a limited set of pretend coins.',
    vocabulary: ['plan', 'spend', 'save', 'share'],
    materials: [
      'Ten paper coins per pair',
      'Three labeled circles or containers',
    ],
    warmup:
      'Place three paper coins where everyone can see them. Ask: “Can the same coin do three jobs at once?”',
    mission: [
      {
        title: 'Meet the paths',
        instructions:
          'Introduce Use Soon, Save for Later, and Help Others. Explain that plans can look different.',
      },
      {
        title: 'Make a plan',
        instructions:
          'Pairs place ten coins across the three paths. Zero is allowed in a path if they can explain why.',
      },
      {
        title: 'Change the plan',
        instructions:
          'Add a new goal or need. Pairs may move coins, then describe the tradeoff.',
      },
    ],
    reflect: [
      'Which path got the most coins?',
      'What changed when new information arrived?',
      'How is a plan different from a rule?',
    ],
    check:
      'Students can assign all ten coins, confirm the total stays ten, and explain one tradeoff.',
    familyBridge:
      'Plan ten buttons, beans, or drawn circles together. Talk about how family priorities can lead to different plans.',
    productConnection:
      'The activity previews assigning simulated earnings to current use and a savings goal. Sharing remains a learning prompt, not a required product transaction.',
    inclusionNote:
      'Do not equate sharing money with kindness. Helping can also mean time, care, skills, or materials.',
    standardsNote:
      'Supports early planning and saving habits while preparing learners for later spending and saving outcomes.',
  },
  {
    slug: 'goal-trail',
    title: 'Build a Goal Trail',
    band: 'Grades 3–4',
    minutes: 35,
    strand: 'Save',
    buildingBlock: 'Financial habits and norms',
    summary: 'Turn a future goal into visible, reachable steps.',
    objective:
      'Students will set a simulated savings goal, calculate the remaining amount, and choose a repeatable action.',
    vocabulary: ['goal', 'save', 'balance', 'progress'],
    materials: [
      'Goal Trail worksheet or blank paper',
      'Counters or pencils',
      'Optional classroom ledger',
    ],
    warmup:
      'Draw a trail with a start and finish. Ask why a hiker might mark smaller stops instead of thinking only about the finish.',
    mission: [
      {
        title: 'Choose the finish',
        instructions:
          'Select a fictional classroom reward costing 12–30 units. Record why it matters.',
      },
      {
        title: 'Mark the trail',
        instructions:
          'Start with a sample balance. Subtract to find what remains, then divide the trail into smaller checkpoints.',
      },
      {
        title: 'Test a detour',
        instructions:
          'Offer a smaller spend-now choice. Students show how taking it would change the trail without labeling the choice bad.',
      },
    ],
    reflect: [
      'What makes a goal feel reachable?',
      'What would make you change a goal?',
      'How can checking progress help?',
    ],
    check:
      'Review whether the remaining amount and checkpoints match the student’s numbers, then ask for one sentence explaining a possible tradeoff.',
    familyBridge:
      'Choose a non-money family goal—such as finishing a book or preparing for a trip—and draw checkpoints together.',
    productConnection:
      'Students can compare the paper trail with their simulated balance and transaction history, then record a next checkpoint.',
    inclusionNote:
      'Use fictional or classroom goals. Students should never be asked to reveal family savings, debt, or purchasing limits.',
    standardsNote:
      'Addresses grade-4 expectations around reasons for saving, setting goals, and the opportunity cost of spending now.',
  },
  {
    slug: 'classroom-store-budget',
    title: 'The Classroom Store Budget',
    band: 'Grades 3–4',
    minutes: 40,
    strand: 'Spend',
    buildingBlock: 'Knowledge and decision-making',
    summary:
      'Compare options, stay within a limit, and defend a plan with evidence.',
    objective:
      'Students will create a balanced purchase plan under a fixed simulated budget and calculate the amount remaining.',
    vocabulary: ['budget', 'price', 'compare', 'tradeoff'],
    materials: [
      'A fictional menu of 8–12 items',
      'A 20-unit budget card per group',
      'Scratch paper',
    ],
    warmup:
      'Ask whether the lowest price is always the best choice. Invite examples where usefulness, durability, or joy might matter too.',
    mission: [
      {
        title: 'Set priorities',
        instructions:
          'Groups choose two things their plan should accomplish before looking at the menu.',
      },
      {
        title: 'Build and total',
        instructions:
          'Select items, add prices, and stay at or below 20 units. Record the remainder.',
      },
      {
        title: 'Meet a surprise',
        instructions:
          'Change one price or add a new option. Groups decide whether to revise and explain with evidence.',
      },
    ],
    reflect: [
      'Which priority guided you?',
      'What did you give up?',
      'When did new information improve your plan?',
    ],
    check:
      'The plan stays within 20 units, the arithmetic is accurate, and the explanation connects a choice to a stated priority.',
    familyBridge:
      'Plan a fictional snack table with a set number of points. Compare two plans without discussing actual family grocery spending.',
    productConnection:
      'A classroom store can become a decision lab when the student sees price, balance, remaining amount, and transaction history together.',
    inclusionNote:
      'Avoid praise such as “good spender” or “bad spender.” Evaluate the clarity of the plan and math, not personal preference.',
    standardsNote:
      'Supports grade-4 spending outcomes involving budgeting, comparison, prices, and the consequences of choices.',
  },
  {
    slug: 'interest-joins-the-team',
    title: 'Interest Joins the Team',
    band: 'Grades 5–6',
    minutes: 45,
    strand: 'Save',
    buildingBlock: 'Knowledge and decision-making',
    summary: 'Model how savings can grow when time and interest work together.',
    objective:
      'Students will compare repeated simple growth across periods and explain why time changes a savings outcome.',
    vocabulary: ['principal', 'interest', 'rate', 'growth'],
    materials: [
      'Four-round growth table',
      'Calculators optional',
      'Two fictional account cards',
    ],
    warmup:
      'Ask: “If two plants start the same size but one grows a little each week, when will the difference become easy to see?”',
    mission: [
      {
        title: 'Start equal',
        instructions:
          'Both fictional accounts begin with 100 units. Account A adds 0 each round; Account B adds 5% of the starting principal each round.',
      },
      {
        title: 'Run four rounds',
        instructions:
          'Calculate and record each balance. Circle the amount created by interest rather than deposits.',
      },
      {
        title: 'Change one variable',
        instructions:
          'Test a different time period, rate, or starting amount. Describe which change mattered and why.',
      },
    ],
    reflect: [
      'What did time do in the model?',
      'Is a higher rate the only thing that matters?',
      'What information would you need before choosing a real savings account?',
    ],
    check:
      'Students accurately complete the model and distinguish principal from interest in an explanation.',
    familyBridge:
      'Look for the words rate and interest in a public advertisement or sample—not a private account—and discuss what questions the ad leaves unanswered.',
    productConnection:
      'Sprout Streak plans to keep interest-based savings practice in the base learning experience. The production mechanic is not yet complete.',
    inclusionNote:
      'State that the model is simplified and fictional. Do not ask students whether their household has savings or earns interest.',
    standardsNote:
      'Builds toward saving and investing concepts in the national progression; it is a bridge lesson rather than a claim of full grade-8 mastery.',
  },
  {
    slug: 'the-opportunity-cost-challenge',
    title: 'The Opportunity Cost Challenge',
    band: 'Grades 5–6',
    minutes: 40,
    strand: 'Plan',
    buildingBlock: 'Knowledge and decision-making',
    summary: 'Find the next-best option given up whenever a choice is made.',
    objective:
      'Students will identify the opportunity cost of a decision and use priorities to compare alternatives.',
    vocabulary: ['alternative', 'opportunity cost', 'priority', 'constraint'],
    materials: [
      'Four fictional choice cards',
      'Priority ranking sheet',
      'Timer',
    ],
    warmup:
      'Give the class five free minutes but two activity options. Ask what choosing one means giving up.',
    mission: [
      {
        title: 'Rank what matters',
        instructions:
          'Students privately rank three priorities such as time, usefulness, enjoyment, or progress toward a goal.',
      },
      {
        title: 'Choose under a limit',
        instructions:
          'Review fictional options with prices and benefits. Choose one under the stated time or money constraint.',
      },
      {
        title: 'Name the cost',
        instructions:
          'Identify the next-best option not chosen. That—not every rejected option—is the opportunity cost.',
      },
    ],
    reflect: [
      'Why is opportunity cost more than price?',
      'Could two people choose differently and both reason well?',
      'What constraint had the greatest effect?',
    ],
    check:
      'Students name the chosen option, the next-best alternative, and the priority that drove the decision.',
    familyBridge:
      'Use a time choice—two possible weekend activities—to practice naming the next-best option given up.',
    productConnection:
      'Before a simulated spend, a brief prompt can ask what goal or alternative the student is choosing not to fund yet.',
    inclusionNote:
      'Use neutral fictional scenarios. Scarcity is a universal concept; financial hardship is not an appropriate classroom disclosure prompt.',
    standardsNote:
      'Reinforces decision-making and opportunity cost across earning, spending, and saving topics.',
  },
  {
    slug: 'plan-for-the-unexpected',
    title: 'Plan for the Unexpected',
    band: 'Grades 5–6',
    minutes: 45,
    strand: 'Protect',
    buildingBlock: 'Knowledge and decision-making',
    summary:
      'Use a reserve to respond to surprises without abandoning every goal.',
    objective:
      'Students will revise a fictional plan after an unexpected event and explain how a reserve changes their options.',
    vocabulary: ['risk', 'reserve', 'unexpected', 'adjust'],
    materials: [
      'Fictional monthly plan',
      'Surprise cards',
      'Pencils or spreadsheet',
    ],
    warmup:
      'Ask why a soccer team plans for substitute players even when everyone expects to play.',
    mission: [
      {
        title: 'Build the base plan',
        instructions:
          'Allocate 50 fictional units among current use, a goal, helping others, and an optional reserve.',
      },
      {
        title: 'Draw a surprise',
        instructions:
          'Reveal a neutral event such as replacing a lost class supply for 8 units. Revise the plan.',
      },
      {
        title: 'Compare resilience',
        instructions:
          'Compare two fictional plans—one with a reserve and one without. Name benefits and tradeoffs of each.',
      },
    ],
    reflect: [
      'What choices did a reserve create?',
      'When can a plan change without being a failure?',
      'How is managing risk different from predicting the future?',
    ],
    check:
      'The revised allocation still totals 50 units, covers the event, and includes a clear explanation of the adjustment.',
    familyBridge:
      'Make a backup plan for a non-financial surprise, such as rain during an outdoor activity. Name what the backup protects.',
    productConnection:
      'A future learning prompt can help students label part of simulated savings as “goal” or “just in case.” This labeling is planned.',
    inclusionNote:
      'Keep surprises low-stakes and fictional. Avoid scenarios involving housing, food, health, job loss, or family emergencies.',
    standardsNote:
      'Introduces managing risk and planning for uncertainty in a developmentally appropriate bridge toward later standards.',
  },
];

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

export function getLesson(slug?: string) {
  return lessons.find(lesson => lesson.slug === slug);
}
