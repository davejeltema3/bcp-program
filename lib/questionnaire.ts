/**
 * BCP Founders Onboarding Questionnaire
 *
 * Human-answered questions only. AI-derived fields (subscribers, upload cadence,
 * content type, top/bottom videos, etc.) are filled in post-submission.
 *
 * Google Sheet column order (for reference):
 * Timestamp | First Name | Email | Channel URL | Questionnaire Submitted? |
 * Active Creator | Duration | Subscribers | Total Videos | Channel Age |
 * Upload Cadence | Content Type | Target Audience | Top Videos | Bottom Videos |
 * Average Views (30 Days) | Shorts Evaluation | Monetized? |
 * Comfortable with AI? | Hours per Week | Best Video Theory |
 * Content Goals | Program Goals | Challenge | Analytics Access |
 * Anything Else? | AI Evaluation | Notes
 */

export interface Choice {
  text: string;
  value: string;
}

export interface QuestionItem {
  id: string;
  question: string;
  subtext?: string;
  type: 'text' | 'textarea' | 'multiple-choice' | 'url';
  placeholder?: string;
  required?: boolean;
  choices?: Choice[];
}

export const questions: QuestionItem[] = [
  // Q1 — Channel URL
  {
    id: 'channel_url',
    question: 'What is your YouTube channel URL?',
    subtext: 'Paste the link to your channel. This is how I find you.',
    type: 'url',
    placeholder: 'https://youtube.com/@yourchannel',
    required: true,
  },
  // Q2 — Monetized
  {
    id: 'monetized',
    question: 'Is your channel monetized?',
    type: 'multiple-choice',
    required: true,
    choices: [
      { text: 'Yes', value: 'yes' },
      { text: 'No', value: 'no' },
      { text: 'Don\'t plan to', value: 'no-plan' },
    ],
  },
  // Q3 — AI Comfort
  {
    id: 'ai_comfort',
    question: 'How comfortable are you with AI tools?',
    type: 'multiple-choice',
    required: true,
    choices: [
      { text: 'What is AI?', value: '1' },
      { text: 'I\'ve tried ChatGPT a few times', value: '2' },
      { text: 'I use AI occasionally for specific tasks', value: '3' },
      { text: 'AI is part of my regular workflow', value: '4' },
      { text: 'I\'m deep in the AI rabbit hole', value: '5' },
    ],
  },
  // Q4 — Hours per week
  {
    id: 'hours_per_week',
    question: 'How many hours per week can you realistically put into your channel?',
    subtext: 'Be honest. I\'d rather plan around reality than aspirations.',
    type: 'text',
    placeholder: 'e.g. 10-15 hours, mostly weekends...',
    required: true,
  },
  // Q5 — Challenge
  {
    id: 'challenge',
    question: 'What is the number one challenge you\'re facing with your YouTube channel right now?',
    subtext: 'The thing that\'s holding you back or slowing you down the most.',
    type: 'textarea',
    placeholder: 'e.g. "I can\'t figure out what content to make next" or "My views have plateaued and I don\'t know why"...',
    required: true,
  },
  // Q6 — What hasn't worked
  {
    id: 'what_didnt_work',
    question: 'What have you tried that hasn\'t worked?',
    subtext: 'Past strategies, programs, investments. Helps me avoid retreading the same ground.',
    type: 'textarea',
    placeholder: 'e.g. "Tried posting shorts daily for 3 months, got nowhere" or "Paid for a YouTube course that didn\'t help"...',
    required: false,
  },
  // Q7 — Content goals
  {
    id: 'content_goals',
    question: 'What are your goals for your YouTube channel in the next 6-12 months?',
    subtext: 'Be specific. "Hit 10k subs" or "Post consistently twice a week" or "Figure out my niche."',
    type: 'textarea',
    placeholder: 'e.g. 1) Hit 5k subs and get monetized. 2) Develop a consistent posting schedule...',
    required: true,
  },
  // Q7 — Program goals
  {
    id: 'program_goals',
    question: 'What do you want to get out of this program?',
    subtext: 'What does success look like for you at the end of 3 months?',
    type: 'textarea',
    placeholder: 'e.g. "A clear content strategy and someone who can tell me what I\'m doing wrong"...',
    required: true,
  },
  // Q8 — Best video theory (after program goals per Dave's request)
  {
    id: 'best_video_theory',
    question: 'Why do you think the videos that have done well on your channel did well?',
    subtext: 'I can find which ones performed best. What I can\'t find is your theory about why. That\'s the valuable part.',
    type: 'textarea',
    placeholder: 'e.g. "I think my tutorial on X did well because it hit a real pain point people were searching for..."',
    required: true,
  },
  // Q9 — Analytics access (subtext rendered as structured HTML in the component)
  {
    id: 'analytics_access',
    question: 'Can you grant me viewer access to your YouTube analytics?',
    subtext: 'ANALYTICS_ACCESS_STRUCTURED',
    type: 'multiple-choice',
    required: true,
    choices: [
      { text: 'I\'ve granted access', value: 'granted' },
      { text: 'I\'ll do it later', value: 'later' },
      { text: 'I\'d rather skip this', value: 'skipped' },
    ],
  },
  // Q10 — Anything else
  {
    id: 'anything_else',
    question: 'Anything else I should know?',
    subtext: 'Context, concerns, hopes, random thoughts. This is your catch-all.',
    type: 'textarea',
    placeholder: 'Anything that didn\'t fit above...',
    required: false,
  },
];

export interface QuestionnaireData {
  [key: string]: string;
}
