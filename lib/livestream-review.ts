/**
 * Live stream channel-review submission questions.
 *
 * PLACEHOLDER SET — swap these for Dave's real questions. This is the only
 * file to edit: the page renders from this array and the sheet columns are
 * built from it (id drives the answer key, `column` is the sheet header).
 * Keep `id` stable if you want old rows to line up; change `column`/`question`
 * freely.
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
  type: 'text' | 'textarea' | 'url' | 'multiple-choice';
  placeholder?: string;
  required?: boolean;
  choices?: ReviewChoice[];
}

export const reviewQuestions: ReviewQuestion[] = [
  {
    id: 'channel_url',
    column: 'Channel URL',
    question: 'What is your YouTube channel URL?',
    subtext: 'Paste the link to your channel. This is how I find you.',
    type: 'url',
    placeholder: 'https://youtube.com/@yourchannel',
    required: true,
  },
  {
    id: 'about',
    column: 'Channel About',
    question: 'What is your channel about?',
    subtext: 'A sentence or two on what you make and who it is for.',
    type: 'textarea',
    placeholder: 'e.g. Woodworking builds for beginners on a budget...',
    required: true,
  },
  {
    id: 'focus',
    column: 'Feedback Focus',
    question: 'What do you most want feedback on?',
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
    id: 'stuck',
    column: 'Stuck On',
    question: 'What are you stuck on right now?',
    subtext: 'The thing slowing you down the most.',
    type: 'textarea',
    placeholder: 'e.g. My views plateaued and I cannot tell why...',
    required: true,
  },
  {
    id: 'anything_else',
    column: 'Anything Else',
    question: 'Anything else I should know?',
    subtext: 'Optional. Context, a specific video, a question.',
    type: 'textarea',
    placeholder: 'Anything that did not fit above...',
    required: false,
  },
];
