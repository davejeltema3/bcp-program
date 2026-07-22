/**
 * Live stream channel-review submission questions.
 *
 * This is the only file to edit to change the form. The page renders from this
 * array and the sheet columns are built from it (id drives the answer key,
 * `column` is the sheet header). Keep `id` stable so old rows line up; change
 * `column`/`question`/`choices` freely.
 *
 * Modeled on Nate's survey (channel state, frustration, AI, confidence, live
 * question, what's working, video requests) plus a feature-consent checkbox.
 * The sheet also has two Dave-only columns to the right, "Featured?" and
 * "Notes", that the form never writes.
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
    id: 'frustration',
    column: 'Biggest Frustration',
    question: "What's your biggest frustration right now?",
    type: 'multiple-choice',
    required: true,
    choices: [
      { text: "Titles and thumbnails aren't clicking", value: 'packaging' },
      { text: "I don't know what to make next", value: 'ideas' },
      { text: 'My views are stuck', value: 'views' },
      { text: "I can't find the time", value: 'time' },
      { text: "I'm not sure what's working", value: 'unclear' },
      { text: 'Something else', value: 'other' },
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
    required: true,
    choices: [
      { text: 'Not confident', value: '1' },
      { text: 'A little', value: '2' },
      { text: 'Mixed', value: '3' },
      { text: 'Pretty confident', value: '4' },
      { text: 'Very confident', value: '5' },
    ],
  },
  {
    id: 'question',
    column: 'Question',
    question: 'Got a question for the stream?',
    subtext: "I'll try to hit as many as I can live.",
    type: 'textarea',
    placeholder: 'Ask me anything about growth, packaging, or ideas...',
    required: false,
  },
  {
    id: 'working',
    column: 'Working Lately',
    question: 'Anything working lately you want to share?',
    type: 'textarea',
    placeholder: 'A recent win, a change that moved the needle...',
    required: false,
  },
  {
    id: 'requests',
    column: 'Video Requests',
    question: 'What would you most like me to make a video about?',
    type: 'textarea',
    placeholder: 'The topic you keep wishing someone would cover...',
    required: false,
  },
  {
    id: 'consent',
    column: 'Consent',
    question: "I'm OK with you featuring my channel in a public live stream and video.",
    type: 'checkbox',
    required: true,
  },
];
