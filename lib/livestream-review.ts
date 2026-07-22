/**
 * Live stream channel-review submission questions.
 *
 * This is the only file to edit to change the form. The page renders from this
 * array and the sheet columns are built from it (id drives the answer key,
 * `column` is the sheet header). Keep `id` stable so old rows line up.
 *
 * Three distinct jobs, no overlap:
 *   core_problem  = what they're trying to solve, their words (open)
 *   focus         = where to aim the review (quick pick)
 *   burning_q     = the one question they'd ask live (open)
 * Plus quick reads on trajectory, AI, and confidence, and a feature consent.
 * The sheet also has two Dave-only columns, "Featured?" and "Notes".
 */

export interface ReviewChoice {
  text: string;
  value: string;
}

export interface ReviewQuestion {
  id: string;            // stable key, also the answers map key
  column: string;        // sheet column header
  question: string;      // shown to the visitor
  subtext?: string;
  type: 'text' | 'textarea' | 'url' | 'multiple-choice' | 'checkbox';
  placeholder?: string;
  required?: boolean;
  choices?: ReviewChoice[];
}

export const reviewQuestions: ReviewQuestion[] = [
  {
    id: 'channel_url',
    column: 'Channel URL',
    question: "What's your YouTube channel URL?",
    subtext: 'So I can pull it up on the stream.',
    type: 'url',
    placeholder: 'https://youtube.com/@yourchannel',
    required: true,
  },
  {
    id: 'core_problem',
    column: 'Core Problem',
    question: "In your own words, what's the core problem you're trying to solve?",
    subtext: 'Say it however you would say it. The main thing you keep running into.',
    type: 'textarea',
    placeholder: 'e.g. I get decent views but almost no subscribers...',
    required: true,
  },
  {
    id: 'channel_state',
    column: 'Channel State',
    question: "Where's your channel at right now?",
    type: 'multiple-choice',
    required: true,
    choices: [
      { text: 'Just getting started', value: 'starting' },
      { text: 'Growing, but slowly', value: 'slow' },
      { text: 'Growing steadily', value: 'steady' },
      { text: 'Stuck on a plateau', value: 'plateau' },
      { text: 'Sliding backwards', value: 'sliding' },
    ],
  },
  {
    id: 'focus',
    column: 'Feedback Focus',
    question: 'What do you most want me to look at?',
    type: 'multiple-choice',
    required: true,
    choices: [
      { text: 'Packaging (titles and thumbnails)', value: 'packaging' },
      { text: 'Ideas and topics', value: 'ideas' },
      { text: 'Retention and structure', value: 'retention' },
      { text: 'Growth strategy', value: 'strategy' },
      { text: 'Not sure, you pick', value: 'open' },
    ],
  },
  {
    id: 'ai_impact',
    column: 'AI Impact',
    question: 'How is AI affecting your work?',
    type: 'multiple-choice',
    required: false,
    choices: [
      { text: "I'm not using it", value: 'none' },
      { text: "I've dabbled", value: 'dabbled' },
      { text: "I'm using it and it's helping", value: 'helping' },
      { text: "I'm all in on it", value: 'all-in' },
    ],
  },
  {
    id: 'confidence',
    column: 'Confidence',
    question: "How do you feel about where your channel's headed?",
    type: 'multiple-choice',
    required: false,
    choices: [
      { text: 'Not confident', value: '1' },
      { text: 'A little', value: '2' },
      { text: 'Mixed', value: '3' },
      { text: 'Pretty confident', value: '4' },
      { text: 'Very confident', value: '5' },
    ],
  },
  {
    id: 'burning_question',
    column: 'Burning Question',
    question: "What's your one burning question?",
    subtext: "The thing that's been bugging you most. If you had 30 seconds with me, what would you ask?",
    type: 'textarea',
    placeholder: 'e.g. Why do my thumbnails get a low click rate?',
    required: true,
  },
  {
    id: 'consent',
    column: 'Consent',
    question: "I'm OK with you featuring my channel in a public live stream and video.",
    type: 'checkbox',
    required: true,
  },
];
