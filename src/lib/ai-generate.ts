import { Event } from "@/types/database";

export interface MarketingPlan {
  socialPosts: { platform: string; content: string }[];
  emailCampaign: { subject: string; body: string };
  eventDescription: string;
}

/**
 * Generate a marketing plan for an event.
 *
 * Currently uses template-based generation. To switch to OpenAI:
 * 1. Install openai: `npm install openai`
 * 2. Add OPENAI_API_KEY to .env.local
 * 3. Replace the body of this function with an API call:
 *
 *    import OpenAI from "openai";
 *    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
 *    const completion = await openai.chat.completions.create({
 *      model: "gpt-4o",
 *      messages: [{ role: "user", content: buildPrompt(event) }],
 *    });
 *    return parseResponse(completion.choices[0].message.content);
 */
export async function generateMarketingPlan(
  event: Event
): Promise<MarketingPlan> {
  // Simulate a short delay to feel realistic
  await new Promise((resolve) => setTimeout(resolve, 800));

  const { name, date, location, description, owner } = event;
  const loc = location || "our venue";
  const desc = description || name;
  const dateStr = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const hooks = [
    `The wait is over.`,
    `Mark your calendars.`,
    `You don't want to miss this.`,
    `It's happening.`,
    `Rev up your plans.`,
    `Get ready to ride.`,
  ];
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  const ctas = [
    "Drop a 🔥 if you're coming!",
    "Tag someone who needs to be there.",
    "Save this post — you'll thank us later.",
    "Link in bio for details.",
    "Comment below if we'll see you there!",
  ];

  const socialPosts = [
    {
      platform: "Instagram",
      content: `${pick(hooks)} 🏍️\n\n${name} is coming to ${loc} on ${dateStr}.\n\n${desc}\n\nWho's rolling in? ${pick(ctas)}`,
    },
    {
      platform: "Facebook",
      content: `📅 ${dateStr} | 📍 ${loc}\n\n${name}\n\n${desc}\n\nBring the crew, bring the energy. This is one event you won't forget.\n\nMore details coming soon — stay tuned!`,
    },
    {
      platform: "X / Twitter",
      content: `${pick(hooks)} 🔥\n\n${name} — ${dateStr} at ${loc}.\n\n${desc.length > 80 ? desc.slice(0, 80) + "…" : desc}\n\nDetails ⬇️`,
    },
  ];

  const emailCampaign = {
    subject: `You're Invited: ${name} — ${dateStr}`,
    body: [
      `Hey there,`,
      ``,
      `We're excited to announce ${name}, happening on ${dateStr} at ${loc}.`,
      ``,
      desc !== name ? desc : `Join us for an unforgettable experience.`,
      ``,
      `Here's what to expect:`,
      `• An incredible lineup and atmosphere`,
      `• Exclusive experiences you won't find anywhere else`,
      `• A chance to connect with the community`,
      ``,
      owner ? `Hosted by ${owner}. ` : "",
      `Space is limited — make sure to RSVP early.`,
      ``,
      `See you there,`,
      `The Harley Events Team`,
    ]
      .filter(Boolean)
      .join("\n"),
  };

  const eventDescription = `${name} takes place on ${dateStr} at ${loc}. ${desc !== name ? desc + " " : ""}Join us for an exciting event that brings the community together for an experience built around passion, energy, and the open road.`;

  return { socialPosts, emailCampaign, eventDescription };
}
