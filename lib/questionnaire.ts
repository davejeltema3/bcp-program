export interface QuestionItem {
  id: string;
  section: string;
  question: string;
  subtext?: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'analytics';
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
}

export const sections = [
  { id: 'about', title: 'About You', number: 1 },
  { id: 'channel', title: 'Your Channel From Your POV', number: 2 },
  { id: 'business', title: 'Business Context', number: 3 },
  { id: 'goals', title: 'Where You\'re Going', number: 4 },
  { id: 'workflow', title: 'How You Work', number: 5 },
  { id: 'analytics', title: 'Analytics Access', number: 6 },
  { id: 'other', title: 'Anything Else', number: 7 },
];

export const questionnaire: QuestionItem[] = [
  // Section 1 — About You
  {
    id: 'name_channel',
    section: 'about',
    question: 'Your name and YouTube channel link',
    type: 'text',
    placeholder: 'Name — youtube.com/@yourchannel',
    required: true,
  },
  {
    id: 'day_job',
    section: 'about',
    question: 'Day job or primary income source',
    subtext: 'Helps me understand how much bandwidth you realistically have.',
    type: 'text',
    placeholder: 'e.g. Full-time software engineer, freelance designer, YouTube is my full-time thing...',
    required: true,
  },
  {
    id: 'weekly_hours',
    section: 'about',
    question: 'Realistic hours per week you can put into the channel',
    subtext: 'Be honest. I\'d rather plan around reality than aspirations.',
    type: 'text',
    placeholder: 'e.g. 10-15 hours, mostly weekends...',
    required: true,
  },
  {
    id: 'life_style',
    section: 'about',
    question: 'Anything about your life or work style I should know',
    subtext: 'Perfectionist? ADHD? Night owl? Travel a lot? All useful context.',
    type: 'textarea',
    placeholder: 'Anything that affects how you create...',
  },
  // Section 2 — Your Channel From Your POV
  {
    id: 'best_videos',
    section: 'channel',
    question: 'Top 2-3 best-performing videos and why you think they worked',
    subtext: 'Links are great. Your theory about why they worked is what I really want.',
    type: 'textarea',
    placeholder: 'e.g. "My video on X got 50k views — I think the title hit a real pain point people were searching for..."',
    required: true,
  },
  {
    id: 'worst_videos',
    section: 'channel',
    question: '2-3 underperformers and why you think they flopped',
    subtext: 'Same deal. Your read on what went wrong matters more than the numbers.',
    type: 'textarea',
    placeholder: 'e.g. "My tutorial on Y barely got 500 views — I think it was too niche and the title was confusing..."',
    required: true,
  },
  {
    id: 'audience_gap',
    section: 'channel',
    question: 'Who you want to make content for, and how that compares to who\'s actually watching',
    subtext: 'If there\'s a gap between who you want and who you have, tell me about it.',
    type: 'textarea',
    placeholder: 'e.g. "I want to reach small business owners, but my audience is mostly other marketers..."',
    required: true,
  },
  {
    id: 'bottleneck',
    section: 'channel',
    question: 'Your biggest bottleneck in the creation process',
    subtext: 'The thing that slows you down or stops you from publishing more.',
    type: 'textarea',
    placeholder: 'e.g. "Editing takes forever" or "I can\'t come up with titles" or "I overthink everything and never hit publish"...',
    required: true,
  },
  {
    id: 'creation_process',
    section: 'channel',
    question: 'Walk me through your current process start to finish',
    subtext: 'From idea to published video. How does it actually work right now?',
    type: 'textarea',
    placeholder: 'e.g. "I brainstorm ideas in a Google doc, then outline, then write a rough script, record in one take, edit in Premiere, thumbnail in Canva..."',
    required: true,
  },
  // Section 3 — Business Context
  {
    id: 'email_list',
    section: 'business',
    question: 'Email list size and platform',
    subtext: 'If you don\'t have one, just say so. No judgment.',
    type: 'text',
    placeholder: 'e.g. 2,500 subscribers on Kit (ConvertKit)',
  },
  {
    id: 'revenue',
    section: 'business',
    question: 'Current monthly revenue and rough breakdown',
    subtext: 'AdSense, sponsorships, products, services. Approximate is fine.',
    type: 'text',
    placeholder: 'e.g. ~$500/mo — mostly AdSense, one small course doing $100/mo',
  },
  {
    id: 'existing_offers',
    section: 'business',
    question: 'Existing products, offers, or services',
    subtext: 'Anything you currently sell or have sold in the past.',
    type: 'textarea',
    placeholder: 'e.g. I have a $49 ebook and tried a group coaching program last year...',
  },
  {
    id: 'what_didnt_work',
    section: 'business',
    question: 'What you\'ve tried that didn\'t work or felt wasted',
    subtext: 'Past programs, strategies, investments. Helps me avoid retreading.',
    type: 'textarea',
    placeholder: 'e.g. "Paid $2k for a YouTube course that taught me nothing I couldn\'t find for free" or "Tried posting shorts daily for 3 months, got nowhere"...',
  },
  // Section 4 — Where You're Going
  {
    id: 'goals_6_12',
    section: 'goals',
    question: '1-3 specific goals for the next 6-12 months and why they matter',
    subtext: 'Not vague. Specific. "Hit 10k subs" or "Launch a course" or "Quit my job by December."',
    type: 'textarea',
    placeholder: 'e.g. 1) Hit 5k subs and get monetized — because I want proof this is viable. 2) Launch a paid community...',
    required: true,
  },
  {
    id: 'worth_it',
    section: 'goals',
    question: 'What would make this investment 100% worth it for you?',
    subtext: 'Your internal scoreboard. What does success look like at the end of 3 months?',
    type: 'textarea',
    placeholder: 'e.g. "If I had a clear content strategy and was publishing consistently with growing views, I\'d call that a win..."',
    required: true,
  },
  {
    id: 'off_limits',
    section: 'goals',
    question: 'Anything off-limits? (topics, formats, monetization approaches)',
    subtext: 'Things you won\'t do or aren\'t willing to try. Good to know upfront.',
    type: 'textarea',
    placeholder: 'e.g. "I won\'t do clickbait" or "I\'m not interested in selling courses"...',
  },
  // Section 5 — How You Work
  {
    id: 'ai_comfort',
    section: 'workflow',
    question: 'How comfortable are you with AI tools?',
    type: 'select',
    options: [
      { label: '1 — What is AI?', value: '1' },
      { label: '2 — I\'ve tried ChatGPT a few times', value: '2' },
      { label: '3 — I use AI occasionally for specific tasks', value: '3' },
      { label: '4 — AI is part of my regular workflow', value: '4' },
      { label: '5 — I\'m deep in the AI rabbit hole', value: '5' },
    ],
    required: true,
  },
  {
    id: 'tools_used',
    section: 'workflow',
    question: 'Tools you currently use for your channel',
    subtext: 'Editing software, thumbnail tools, analytics, scheduling, etc.',
    type: 'textarea',
    placeholder: 'e.g. Premiere Pro, Canva, TubeBuddy, Google Docs for scripting...',
  },
  // Section 6 — Analytics Access
  {
    id: 'analytics_access',
    section: 'analytics',
    question: '',
    type: 'analytics',
  },
  // Section 7 — Anything Else
  {
    id: 'anything_else',
    section: 'other',
    question: 'Anything else I should know?',
    subtext: 'Context, concerns, hopes, random thoughts. This is your catch-all.',
    type: 'textarea',
    placeholder: 'Anything that didn\'t fit above...',
  },
];

export interface QuestionnaireData {
  [key: string]: string;
}
