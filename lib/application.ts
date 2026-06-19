/**
 * BCP/BCA Application — question set.
 *
 * One application covering both offers. The lean asked set; the AI researches
 * the objective channel facts (subscribers, uploads, average views, shorts,
 * niche) after submission and returns a routing verdict. See
 * Projects/Systems Hub/application-spec.md.
 *
 * Human-answered questions only. Contact (first name, email, phone) is collected
 * on its own step. UTM params are captured silently.
 */

export interface Choice {
  text: string;
  value: string;
}

export interface ApplicationQuestion {
  id: string;
  question: string;
  subtext?: string;
  type: 'text' | 'textarea' | 'multiple-choice' | 'url';
  placeholder?: string;
  required?: boolean;
  choices?: Choice[];
}

export const applicationQuestions: ApplicationQuestion[] = [
  {
    id: 'channel_url',
    question: 'What is your YouTube channel URL?',
    subtext: 'Paste your channel link. This is how I find you and take a look.',
    type: 'url',
    placeholder: 'https://youtube.com/@yourchannel',
    required: true,
  },
  {
    id: 'primary_goal',
    question: 'What is your primary goal with YouTube?',
    type: 'multiple-choice',
    required: true,
    choices: [
      { text: 'A full-time career or real business growth', value: 'full-time' },
      { text: 'A meaningful side income', value: 'side-income' },
      { text: "More of a hobby or passion project", value: 'hobby' },
    ],
  },
  {
    id: 'monetized',
    question: 'Is your channel monetized?',
    subtext: 'Just helps me understand where you are. Not a dealbreaker either way.',
    type: 'multiple-choice',
    required: true,
    choices: [
      { text: 'Yes', value: 'yes' },
      { text: 'Not yet, but working toward it', value: 'not-yet' },
      { text: "No, and I'm not sure how", value: 'no' },
    ],
  },
  {
    id: 'channel_about',
    question: 'What is your channel about?',
    subtext: 'Your niche, topics, the kind of videos you make. A sentence or two is plenty.',
    type: 'text',
    placeholder: 'e.g. I teach beginner guitar, mostly 10-15 minute tutorials...',
    required: true,
  },
  {
    id: 'target_audience',
    question: 'Who do you want to make content for?',
    subtext: "If that's different from who watches now, tell me both. This matters more than people think.",
    type: 'text',
    placeholder: 'e.g. I want to reach small business owners, but right now I mostly get other creators...',
    required: true,
  },
  {
    id: 'challenge',
    question: "What is the #1 challenge you're facing with your channel right now?",
    subtext: 'The thing slowing you down or holding you back the most. Be specific.',
    type: 'textarea',
    placeholder: 'e.g. "My views plateaued and I don\'t know why" or "I can\'t figure out what to make next"...',
    required: true,
  },
  {
    id: 'program_goals',
    question: 'What are you hoping to get out of working with me?',
    subtext: 'Be honest. There are no wrong answers here.',
    type: 'textarea',
    placeholder: 'e.g. "A clear strategy and someone who can tell me what I\'m doing wrong"...',
    required: true,
  },
  {
    id: 'readiness',
    question: 'Where are you with investing in your growth?',
    type: 'multiple-choice',
    required: true,
    choices: [
      { text: "I'm ready to invest in serious help now", value: 'ready' },
      { text: 'Depends on the details', value: 'depends' },
      { text: 'Just exploring for now', value: 'exploring' },
    ],
  },
  {
    id: 'anything_else',
    question: 'Anything else I should know?',
    subtext: 'Context, concerns, hopes, random thoughts. Your catch-all.',
    type: 'textarea',
    placeholder: "Anything that didn't fit above...",
    required: false,
  },
];

export interface ApplicationData {
  // Answers
  channel_url?: string;
  primary_goal?: string;
  monetized?: string;
  channel_about?: string;
  target_audience?: string;
  challenge?: string;
  program_goals?: string;
  readiness?: string;
  anything_else?: string;
  // Contact
  first_name?: string;
  email?: string;
  phone?: string;
  // Attribution (captured silently)
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}
