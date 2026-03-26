import { Event } from "@/types/database";

export interface SocialPostDraft {
  id: string;
  platform: string;
  angle: string;
  content: string;
}

export interface EmailCampaignDraft {
  id: string;
  title: string;
  subject: string;
  body: string;
}

export interface EventDescriptionDraft {
  id: string;
  label: string;
  content: string;
}

export interface MarketingPlan {
  socialPosts: SocialPostDraft[];
  emailCampaigns: EmailCampaignDraft[];
  eventDescriptions: EventDescriptionDraft[];
}

function rid(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function delay(ms = 500) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function eventContext(event: Event) {
  const { name, date, location, description, owner } = event;
  const loc = location || "our venue";
  const desc = (description || "").trim() || name;
  const dateStr = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const shortDate = new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return { name, loc, desc, dateStr, shortDate, owner };
}

function socialPostTemplates(event: Event): Omit<SocialPostDraft, "id">[] {
  const { name, loc, desc, dateStr, shortDate } = eventContext(event);
  return [
    {
      platform: "Instagram",
      angle: "Hype / save the date",
      content: `🏍️ SAVE THE DATE\n\n${name}\n📍 ${loc}\n📅 ${dateStr}\n\n${desc}\n\nDrop a 🔥 in the comments if we’ll see you there.`,
    },
    {
      platform: "Instagram",
      angle: "Story-style / FOMO",
      content: `It’s going down → ${shortDate}\n${name}\n${loc}\n\n${desc.slice(0, 200)}${desc.length > 200 ? "…" : ""}\n\nSwipe up / link in bio for details.`,
    },
    {
      platform: "Facebook",
      angle: "Community invite",
      content: `You’re invited: ${name}\n\nJoin us on ${dateStr} at ${loc}.\n\n${desc}\n\nBring friends, bring good energy. More updates coming — who’s in? 👋`,
    },
    {
      platform: "Facebook",
      angle: "Details-first",
      content: `📅 When: ${dateStr}\n📍 Where: ${loc}\n\nWhat: ${name}\n\n${desc}\n\nQuestions? Drop them below — we’re happy to help.`,
    },
    {
      platform: "X / Twitter",
      angle: "Punchy single tweet",
      content: `${name} • ${shortDate} • ${loc}\n\n${desc.length > 200 ? desc.slice(0, 200) + "…" : desc}\n\n#Harley #Motorcycles #Events`,
    },
    {
      platform: "X / Twitter",
      angle: "Thread starter",
      content: `🧵 Quick thread on ${name} (${shortDate})\n\n1/ We’re hosting something special at ${loc}.\n\n2/ ${desc.slice(0, 220)}${desc.length > 220 ? "…" : ""}\n\n3/ Mark ${shortDate} — details in replies.`,
    },
    {
      platform: "LinkedIn",
      angle: "Professional / dealership",
      content: `We’re hosting ${name} on ${dateStr} at ${loc}.\n\n${desc}\n\nOpen to riders and guests — a great chance to connect with the local riding community. RSVP through our team or visit us for more information.`,
    },
    {
      platform: "TikTok / Reels caption",
      angle: "Short caption",
      content: `POV: ${shortDate} hits different 🏍️ ${name} @ ${loc} — you coming? #fyp #harley #bikeevent`,
    },
  ];
}

/** Regenerate one social slot by index (same platform/angle template as the pack). */
export async function regenerateSocialPostAtIndex(
  event: Event,
  index: number
): Promise<Omit<SocialPostDraft, "id">> {
  await delay(220);
  const list = socialPostTemplates(event);
  const i = Math.max(0, Math.min(index, list.length - 1));
  return list[i];
}

/** Multiple social posts across platforms and angles (template-based). */
export async function generateSocialPosts(event: Event): Promise<SocialPostDraft[]> {
  await delay(350);
  return socialPostTemplates(event).map((p) => ({ ...p, id: rid("social") }));
}

function emailCampaignTemplates(event: Event): Omit<EmailCampaignDraft, "id">[] {
  const { name, loc, desc, dateStr, owner } = eventContext(event);
  const host = owner ? `\n\n— ${owner}` : "";

  return [
    {
      title: "Launch / announcement",
      subject: `Save the date: ${name} — ${dateStr}`,
      body: [
        `Hi there,`,
        ``,
        `We’re excited to invite you to **${name}** on **${dateStr}** at **${loc}**.`,
        ``,
        desc,
        ``,
        `Add it to your calendar and stay tuned — we’ll share more details soon.`,
        host,
        ``,
        `See you there,`,
        `The team`,
      ].join("\n"),
    },
    {
      title: "Reminder (1 week out style)",
      subject: `Reminder: ${name} is almost here`,
      body: [
        `Hey,`,
        ``,
        `Just a friendly reminder: **${name}** is coming up on **${dateStr}** at **${loc}**.`,
        ``,
        desc,
        ``,
        `If you’re planning to join us, reply and let us know — we’d love to see you.`,
        host,
        ``,
        `Thanks,`,
        `The team`,
      ].join("\n"),
    },
    {
      title: "Last chance / urgency",
      subject: `Last call — ${name} (${dateStr})`,
      body: [
        `Hi,`,
        ``,
        `**${name}** is right around the corner (${dateStr}) at **${loc}**.`,
        ``,
        desc,
        ``,
        `Space and logistics are easier when we know who’s coming — hit reply or stop by if you’re in.`,
        host,
        ``,
        `Ride safe,`,
        `The team`,
      ].join("\n"),
    },
    {
      title: "VIP / insider angle",
      subject: `Inside look: ${name}`,
      body: [
        `Hey,`,
        ``,
        `Want the inside track on **${name}**? Here’s what to know:`,
        ``,
        `• **When:** ${dateStr}`,
        `• **Where:** ${loc}`,
        `• **Why go:** ${desc.slice(0, 280)}${desc.length > 280 ? "…" : ""}`,
        ``,
        `We’re building this for the community — you’re part of it.`,
        host,
        ``,
        `— The team`,
      ].join("\n"),
    },
  ];
}

/** Regenerate one email idea by index. */
export async function regenerateEmailCampaignAtIndex(
  event: Event,
  index: number
): Promise<Omit<EmailCampaignDraft, "id">> {
  await delay(220);
  const list = emailCampaignTemplates(event);
  const i = Math.max(0, Math.min(index, list.length - 1));
  return list[i];
}

/** Several email campaign ideas (different angles). */
export async function generateEmailCampaigns(
  event: Event
): Promise<EmailCampaignDraft[]> {
  await delay(350);
  return emailCampaignTemplates(event).map((c) => ({ ...c, id: rid("email") }));
}

function eventDescriptionTemplates(event: Event): Omit<EventDescriptionDraft, "id">[] {
  const { name, loc, desc, dateStr } = eventContext(event);
  return [
    {
      label: "Short blurb (social / SMS)",
      content: `${name} — ${dateStr} at ${loc}. ${desc !== name ? desc : "Join us for a great day with the community."}`,
    },
    {
      label: "Standard (app / calendar)",
      content: `${name} takes place on ${dateStr} at ${loc}. ${desc !== name ? desc + " " : ""}Come out for rides, conversation, and a welcoming atmosphere — all skill levels welcome.`,
    },
    {
      label: "Long-form (website / press)",
      content: `${name} is scheduled for ${dateStr} at ${loc}. ${desc !== name ? desc + " " : ""}This event brings together riders and enthusiasts for an experience focused on community, the open road, and shared passion. Whether you’re a longtime rider or new to the scene, you’ll find a friendly crowd and plenty to see and do. Plan to arrive with time to connect — we look forward to hosting you.`,
    },
    {
      label: "SEO-style summary",
      content: `${name} in ${loc} on ${dateStr}. ${desc} Motorcycle event for local riders and guests. Details and updates available from the organizing team.`,
    },
  ];
}

/** Regenerate one description variant by index. */
export async function regenerateEventDescriptionAtIndex(
  event: Event,
  index: number
): Promise<Omit<EventDescriptionDraft, "id">> {
  await delay(200);
  const list = eventDescriptionTemplates(event);
  const i = Math.max(0, Math.min(index, list.length - 1));
  return list[i];
}

/** Short, standard, and long description variants. */
export async function generateEventDescriptions(
  event: Event
): Promise<EventDescriptionDraft[]> {
  await delay(300);
  return eventDescriptionTemplates(event).map((v) => ({ ...v, id: rid("desc") }));
}

/**
 * Full marketing pack: many social posts, multiple email ideas, several descriptions.
 * Template-based; swap for an LLM later using the same return shape.
 */
export async function generateMarketingPlan(event: Event): Promise<MarketingPlan> {
  await delay(450);
  const [socialPosts, emailCampaigns, eventDescriptions] = await Promise.all([
    generateSocialPosts(event),
    generateEmailCampaigns(event),
    generateEventDescriptions(event),
  ]);
  return { socialPosts, emailCampaigns, eventDescriptions };
}
