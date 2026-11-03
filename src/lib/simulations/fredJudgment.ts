/**
 * FRED — a managerial judgment simulation.
 *
 * A branching exercise: the participant works through a series of management
 * decisions, each choice carrying a judgment quality (0–3) and the
 * competencies it demonstrates. Nothing is revealed until the end, so the
 * participant cannot play to the rubric.
 *
 * The graph, wording, qualities and tags are the simulation as authored — do
 * not reword them here. Changing a `quality` or a `tags` entry changes what
 * every past run would have scored, so treat this file as the instrument.
 */

export type CompetencyCode = 'AC' | 'IQ' | 'EM' | 'FJ' | 'DV' | 'TM' | 'FT';

export interface SimulationChoice {
  label: string;
  next: string;
  /** Judgment soundness of this choice, 0 (poor) to 3 (sound). */
  quality: number;
  tags: CompetencyCode[];
}

export interface DecisionNode {
  tag: string;
  text: string;
  choices: SimulationChoice[];
  isBeat?: false;
}

export interface BeatNode {
  isBeat: true;
  tag: string;
  text: string;
  next: string;
}

export type SimulationNode = DecisionNode | BeatNode;

export const MAX_QUALITY = 3;

export const COMPETENCIES: Record<CompetencyCode, string> = {
  AC: "Accountability",
  IQ: "Inquiry & Diagnosis",
  EM: "Empathy",
  FJ: "Fair Judgment",
  DV: "Development",
  TM: "Team Management",
  FT: "Follow-through"
};
export const COMPETENCY_DESCRIPTIONS: Record<CompetencyCode, string> = {
  AC: "Addresses performance issues clearly and appropriately, without letting empathy or circumstance excuse them away.",
  IQ: "Seeks relevant evidence before reaching conclusions, and knows the difference between evidence and speculation.",
  EM: "Understands the employee's perspective and circumstances without losing objectivity.",
  FJ: "Balances individual circumstances against organisational and team expectations, applied consistently.",
  DV: "Converts career aspirations into realistic, criteria-based development action, without overpromising.",
  TM: "Manages the wider team's trust and perception of fairness, and protects confidential information appropriately.",
  FT: "Establishes a concrete review point and actually monitors whether agreed changes occur."
};

export const NODES: Record<string, SimulationNode> = {
  N1: {
    tag: "Six weeks in",
    text: "Fred has arrived late every Monday for six weeks — anywhere from twenty minutes to almost an hour. His performance is still broadly on target, but the pattern is starting to become visible to the rest of the team. What do you do?",
    choices: [
      { label: "Speak privately with Fred about the pattern and ask him what's happening", next: "N2", quality: 3, tags: ["AC"] },
      { label: "Review the attendance and performance information available to you first", next: "N1_records", quality: 3, tags: ["IQ"] },
      { label: "Speak informally with one or two team members to see if they've noticed anything", next: "N1_team", quality: 1, tags: ["IQ"] },
      { label: "Give Fred some time to correct the behaviour himself before intervening", next: "N1d", quality: 0, tags: ["AC"] }
    ]
  },
  N1_records: {
    tag: "What the records show",
    text: "Fred has been late four times in six weeks, only ever on Mondays. His sales performance remains broadly on target, and there are no other attendance issues. Two other team members have occasionally been late too, but nothing like a pattern. What now?",
    choices: [
      { label: "Speak to Fred now", next: "N2", quality: 3, tags: ["AC"] },
      { label: "Speak informally with team members as well before deciding", next: "N1_team", quality: 1, tags: ["IQ"] },
      { label: "Give it a bit more time", next: "N1d", quality: 0, tags: ["AC"] }
    ]
  },
  N1_team: {
    tag: "What the team says",
    text: "The team members you spoke to haven't really noticed anything beyond the lateness itself — no one has an explanation, they've just clocked that it's happening and it's becoming visible. What now?",
    choices: [
      { label: "Speak to Fred now", next: "N2", quality: 2, tags: ["AC"] },
      { label: "Check the attendance and performance records as well", next: "N1_records", quality: 2, tags: ["IQ"] },
      { label: "Give it a bit more time", next: "N1d", quality: 0, tags: ["AC"] }
    ]
  },
  N1d: {
    isBeat: true,
    tag: "Two weeks later",
    text: "Fred is late three more times — anywhere from twenty-five to fifty-five minutes — and it's now impossible for the rest of the team not to notice. You decide you can't leave it any longer.",
    next: "N2"
  },
  N2: {
    tag: "The first conversation",
    text: "You sit down with Fred. He says: \u201cI'm sorry. I've had a few things going on recently. It shouldn't happen again.\u201d He doesn't offer anything further. How do you respond?",
    choices: [
      { label: "Accept the explanation, clearly state the attendance expectation, and ask him to make sure it doesn't happen again", next: "N2_bridge", quality: 3, tags: ["AC"] },
      { label: "Ask whether there's something specific about Mondays making it hard for him to get in on time", next: "N3", quality: 3, tags: ["IQ"] },
      { label: "Tell him repeated lateness is unacceptable and formal action may follow if it continues", next: "N2_bridge", quality: 1, tags: ["AC"] },
      { label: "Ask if there's anything happening at work or outside of it that he thinks you should know about", next: "N3", quality: 3, tags: ["EM"] }
    ]
  },
  N2_bridge: {
    isBeat: true,
    tag: "A couple of weeks later",
    text: "Fred takes it at face value, and for a while his timekeeping is fine. Then one afternoon he seems distracted, and mentions \u2014 almost in passing \u2014 that he's \u201cbeen thinking about a few things.\u201d",
    next: "N3"
  },
  N3: {
    tag: "What's really going on",
    text: "Pressed gently, Fred explains: months ago you'd talked about him moving toward a District Sales Manager role. He'd assumed you were both going to work on that, but nothing's really happened since \u2014 he admits he's become frustrated and started looking elsewhere. He's careful to add: \u201cI'm not saying that's why I'm late. I'm just telling you I'm not particularly motivated at the moment.\u201d How do you respond?",
    choices: [
      { label: "Focus on the lateness first \u2014 career discussions are separate, and he needs to meet current expectations", next: "N4a", quality: 3, tags: ["AC"] },
      { label: "Explore his career concerns further, and discuss what would need to happen for him to be ready for a DSM role", next: "N4a", quality: 3, tags: ["DV"] },
      { label: "Acknowledge the career frustration, but make clear it doesn't remove his responsibility for attendance \u2014 agree to address both, separately", next: "N4a", quality: 3, tags: ["AC","DV","EM"] },
      { label: "Tell him that if he's serious about leaving, you'd rather help him find an internal opportunity than lose him", next: "N4a", quality: 1, tags: ["DV"] }
    ]
  },
  N4a: {
    tag: "The team notices",
    text: "Separately, a team member comes to you: \u201cPeople have started noticing Fred comes in late every Monday. I'm not sure what the issue is, but it doesn't seem fair if the rest of us are expected to follow the rules.\u201d They don't know why Fred is late. How do you respond to them?",
    choices: [
      { label: "Tell them Fred's situation is confidential and can't be discussed", next: "N4b", quality: 3, tags: ["TM"] },
      { label: "Acknowledge the concern, and reinforce that attendance expectations apply consistently to everyone", next: "N4b", quality: 3, tags: ["TM","FJ"] },
      { label: "Explain there may be circumstances they're not aware of, and ask them not to speculate", next: "N4b", quality: 3, tags: ["TM","EM"] }
    ]
  },
  N4b: {
    tag: "Beyond that conversation",
    text: "Do you say anything to the team more broadly?",
    choices: [
      { label: "Yes \u2014 reinforce generally that repeated lateness will be addressed and everyone's expected to meet agreed working arrangements, without naming anyone", next: "N5", quality: 3, tags: ["TM","FJ"] },
      { label: "No \u2014 the individual conversation should be enough for now", next: "N5", quality: 2, tags: ["TM","FJ"] }
    ]
  },
  N5: {
    tag: "The transfer request",
    text: "Fred comes to you again: \u201cI know I've been late, I'm not trying to cause a problem. But honestly, I'm questioning whether I have a future here. If the DSM thing isn't going to happen, I'd like to explore a transfer.\u201d What do you do?",
    choices: [
      { label: "Refuse to discuss a transfer until his attendance improves", next: "N6_bridge", quality: 2, tags: ["AC"] },
      { label: "Agree to explore the transfer, while making clear the attendance issue still needs to be addressed", next: "N6_bridge", quality: 3, tags: ["DV","AC"] },
      { label: "Tell him you'll support his development, but first agree specific expectations for his current role", next: "N6_bridge", quality: 3, tags: ["AC","DV"] },
      { label: "Refer the matter to HR before making any commitment", next: "N6_bridge", quality: 3, tags: ["FJ"] }
    ]
  },
  N6_bridge: {
    isBeat: true,
    tag: "The bigger picture",
    text: "You take a closer look. Fred is still hitting his sales targets. His customer relationships remain strong. He's recently taken on extra work voluntarily and put in unpaid overtime. There are no disciplinary issues beyond the lateness \u2014 which remains a genuine, unresolved concern. It's time to set out exactly how you're going to handle this.",
    next: "DP6a"
  },
  DP6a: {
    tag: "Your action plan \u2014 1 of 4",
    text: "What expectation will you set regarding attendance?",
    choices: [
      { label: "Zero tolerance \u2014 any further lateness triggers formal process immediately", next: "DP6b", quality: 1, tags: ["AC"] },
      { label: "A clear, specific expectation \u2014 on time from now on, with a review point in a few weeks \u2014 no formal threat yet", next: "DP6b", quality: 3, tags: ["AC"] },
      { label: "A general reminder that he needs to do better", next: "DP6b", quality: 0, tags: ["AC"] }
    ]
  },
  DP6b: {
    tag: "Your action plan \u2014 2 of 4",
    text: "What, if anything, will you do about Fred's career aspirations?",
    choices: [
      { label: "Promise him the DSM role if his attendance improves", next: "DP6c", quality: 0, tags: ["DV"] },
      { label: "Give him clear, specific criteria for what DSM-readiness would require \u2014 without promising the role", next: "DP6c", quality: 3, tags: ["DV"] },
      { label: "Avoid the topic going forward", next: "DP6c", quality: 1, tags: ["DV"] }
    ]
  },
  DP6c: {
    tag: "Your action plan \u2014 3 of 4",
    text: "What support or development will you offer?",
    choices: [
      { label: "None specific \u2014 expect him to manage it himself", next: "DP6d", quality: 1, tags: ["DV"] },
      { label: "A concrete stretch assignment tied to the DSM criteria you've set", next: "DP6d", quality: 3, tags: ["DV"] },
      { label: "Offer to personally cover for him on the odd Monday", next: "DP6d", quality: 0, tags: ["FJ"] }
    ]
  },
  DP6d: {
    tag: "Your action plan \u2014 4 of 4",
    text: "How will you monitor whether things actually improve?",
    choices: [
      { label: "No specific follow-up planned", next: "END", quality: 0, tags: ["FT"] },
      { label: "A general sense that you'll check in at some point", next: "END", quality: 1, tags: ["FT"] },
      { label: "A specific review point in three to four weeks, covering both attendance and the development plan", next: "END", quality: 3, tags: ["FT"] }
    ]
  }
};

/** Narrative consequence, chosen by the overall judgment score. */
export const EPILOGUES: Array<{ min: number; name: string; text: string }> = [
  { min: 80, name: "A steady turnaround", text: "Fred's timekeeping settles. The development conversation continues on the terms you set, and he's given a clear plan toward DSM readiness. It doesn't guarantee anything long-term \u2014 but the issue has been handled, not just survived." },
  { min: 60, name: "A partial recovery", text: "Fred is punctual for several weeks. Then the lateness returns, intermittently. Nothing has escalated, but nothing is fully resolved either \u2014 this will likely need revisiting." },
  { min: 40, name: "Quiet disengagement", text: "Fred keeps hitting his targets, but he's visibly less engaged than he was. He hasn't raised anything further, and neither, really, have you." },
  { min: 0,  name: "Fred moves on", text: "Fred accepts another role elsewhere. That alone doesn't tell you whether this was handled well \u2014 the decisions you made along the way are what this assessment measures, not whether he stayed." }
];

export const START_NODE = 'N1';
export const END_NODE = 'END';

export const SIMULATION_TITLE = 'FRED — a managerial judgment simulation';

export const SIMULATION_BRIEF = [
  "You manage a sales team of about ten people. Fred — three years in, generally a solid performer — has arrived late every Monday for six weeks straight, anywhere from twenty minutes to almost an hour. His numbers are still on target. It's starting to become visible to the rest of the team.",
  "There's no single right sequence here. You're not being scored on guessing what's \u201creally\u201d going on with Fred — you're being scored on how soundly you decide, with whatever information you actually have at each point.",
];

export const SIMULATION_NOTE =
  'Your decisions are assessed on judgment quality and on which management competencies they demonstrate. Both stay hidden until the end.';
