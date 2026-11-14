import type { ChatRole } from "./chatRules"

export interface LocalAnswer {
  reply: string
  suggestions: string[]
}

// quick-reply buttons shown under the bot's messages
export const SUGGESTIONS: Record<ChatRole, string[]> = {
  STUDENT: ["Cheapest boarding near my campus", "Boardings with WiFi and meals", "How do I book a room?"],
  OWNER: ["How do I add a boarding?", "How do booking requests work?", "Why is my boarding not visible?"],
  ADMIN: ["How do I approve a user?", "How do I add a campus?", "What does the dashboard show?"]
}

// lowercase, punctuation removed
const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()

// ───────────── small talk (no AI call) ─────────────
const GREET = "(?:hi+|hello+|hey+|hiya|yo|good ?(?:morning|afternoon|evening|night)|gm)"
const FILLER = "(?:there|bot|assistant|friend|sir|madam)"
const HOWRU = "(?:how are you|how r u|how are u|how do you do)"

const greetingRe = new RegExp(`^${GREET}(?: ${FILLER})?(?: ${HOWRU})?$`)
const howRe = new RegExp(`^${HOWRU}$`)
const thanksRe = /^(?:thanks?(?: a lot| so much)?|thank you(?: so much| very much| a lot)?|thx|ty)$/
const byeRe = /^(?:bye(?: bye)?|goodbye|good bye|see you(?: later)?|see ya|later|ok bye)$/
const helpRe = /^(?:help(?: me)?|who are you|what are you|what can you do|what do you do|how can you help(?: me)?)$/

const GREETING: Record<ChatRole, string> = {
  STUDENT:
    "Hi there! 👋 I can find boardings for you by budget, facilities or distance to your campus. What are you looking for?",
  OWNER: "Hi there! 👋 I can help you list your boarding and handle booking requests. What would you like to know?",
  ADMIN: "Hi there! 👋 I can explain approvals, campuses and the dashboard. What would you like to know?"
}
const HOWRU_REPLY = "I'm doing great, thanks for asking! 😊 How can I help you?"
const THANKS_REPLY = "You're welcome! 😊 Ask me anything else any time."
const BYE_REPLY = "Bye! 👋 Come back any time you need help."

const HELP: Record<ChatRole, string> = {
  STUDENT:
    "I can find boardings for you by budget, facilities and distance to your campus, and explain how searching, booking, favorites and compare work.",
  OWNER:
    "I can explain how to add and edit your boarding, why a boarding may not be visible, and how to handle booking requests from students.",
  ADMIN: "I can explain how to approve users and boardings, manage campuses, and what the dashboard shows."
}

export const otherReply = (role: ChatRole) =>
  role === "STUDENT"
    ? "I can only help with finding boardings and using this website. Try: “boardings under Rs. 20,000 with WiFi”."
    : "I can only help with using this website. Pick one of the questions below, or ask in your own words."

export const smallTalk = (message: string, role: ChatRole): LocalAnswer | null => {
  const t = normalize(message)
  if (!t || t.length > 40) return null
  const suggestions = SUGGESTIONS[role]

  if (greetingRe.test(t)) return { reply: GREETING[role], suggestions }
  if (howRe.test(t)) return { reply: HOWRU_REPLY, suggestions }
  if (thanksRe.test(t)) return { reply: THANKS_REPLY, suggestions }
  if (byeRe.test(t)) return { reply: BYE_REPLY, suggestions: [] }
  if (helpRe.test(t)) return { reply: HELP[role], suggestions }
  return null
}

// ───────────── simple platform questions (no AI call) ─────────────
type Faq = { test: RegExp; answer: string }

// order matters: the first match wins
const FAQ: Record<ChatRole, Faq[]> = {
  STUDENT: [
    {
      test: /\bcancel\b/,
      answer:
        "Open “My bookings” and press “Cancel request” (or “Cancel booking” if it was already approved). Cancelling an approved booking gives the room back to the owner."
    },
    {
      test: /\b(contact|phone|number|address|email|exact location)\b/,
      answer:
        "For privacy, an owner's phone number, email and exact address stay hidden until the owner approves your booking request. After that they appear on the boarding page and under “My bookings”."
    },
    {
      test: /\b(book|booking|reserve|request a room|request room|move in)\b/,
      answer:
        "Open a boarding, press “Request a room”, choose your move-in date and send it. The owner then approves or rejects your request. After approval, the owner's contact details and exact address appear under “My bookings”. You can have up to 3 pending requests, and you can't request another room while you have an approved booking."
    },
    {
      test: /\b(favou?rites?|save|saved|heart)\b/,
      answer: "Press the heart icon on a boarding to save it. Your saved boardings are listed under “Favorites”."
    },
    {
      test: /\b(compare|comparison)\b/,
      answer:
        "Tick “Compare” on 2 or 3 boardings, then press “Compare now” in the bar at the bottom of the page to see them side by side."
    },
    {
      test: /\b(cost|calculator|expenses?)\b/,
      answer:
        "Every boarding page has a monthly cost calculator. It adds the rent, food, utilities and transport to your campus to show the real monthly cost."
    },
    {
      test: /\b(account|register|sign ?up|log ?in|approved|approval)\b/,
      answer:
        "New accounts must be approved by an admin before you can log in. If your account is still pending, please wait for the approval."
    }
  ],
  OWNER: [
    {
      test: /\b(visible|showing|re ?approval|not approved|pending approval)\b/,
      answer:
        "Students only see boardings that an admin has approved. A new boarding stays pending until the admin reviews it, and some edits may need approval again. You get a notification when the admin decides."
    },
    {
      test: /\b(add|create|list|post|new)\b.*\b(boarding|listing|room|place)\b/,
      answer:
        "Open “My boardings” and add a new boarding: fill in the title, description, monthly rent, room counts and facilities, pick the location on the map and upload photos. An admin reviews it before students can see it."
    },
    {
      test: /\b(photos?|images?|pictures?|upload)\b/,
      answer: "You can upload photos in the boarding form when you add or edit a boarding. The first photo is used as the cover image."
    },
    {
      test: /\b(booking|requests?|students?|reject)\b/,
      answer:
        "Open “Booking requests” to see requests from students. Approving a request gives the student your phone, email and exact address and uses up one room. When you reject a request or cancel an approved booking, you must give a reason and the student is notified. When the last room is taken, the other pending requests close automatically."
    },
    {
      test: /\b(rooms?|available|full|capacity)\b/,
      answer:
        "Each boarding has a total and an available room count. Approving a booking reduces the available rooms by one, and cancelling an approved booking gives the room back. When no room is free, students can't send new requests."
    },
    {
      test: /\b(delete|remove)\b/,
      answer:
        "You can delete a boarding from “My boardings”, but only when it has no pending or approved booking requests. Reject or cancel those first."
    }
  ],
  ADMIN: [
    {
      test: /\b(dashboard|stats|statistics|counts?|overview)\b/,
      answer:
        "The dashboard shows counts of users, boardings, campuses and bookings, and the items that are waiting for your approval."
    },
    {
      test: /\b(campus|campuses|university)\b/,
      answer:
        "Under “Campuses” you can add, edit or delete campuses. Pick the location on the map, search for a place, or paste a Google Maps link. Distance and travel-time estimates for students use these locations."
    },
    {
      test: /\b(boarding|boardings|listing|listings)\b/,
      answer:
        "Open “Boardings” to review new or edited listings. Approve them so students can see them, or reject them with a reason."
    },
    {
      test: /\b(users?|accounts?|register|approve|reject|suspend)\b/,
      answer:
        "Open “Users” to see pending registrations. You can approve, reject or suspend an account. People can log in only after approval."
    }
  ]
}

export const faqAnswer = (message: string, role: ChatRole): LocalAnswer | null => {
  const t = normalize(message)
  const hit = FAQ[role].find((f) => f.test.test(t))
  return hit ? { reply: hit.answer, suggestions: SUGGESTIONS[role] } : null
}

// "How do I ...?" style questions are answered locally first (instant, no AI quota used)
export const looksLikeQuestion = (message: string) =>
  /^(how|what|where|why|when|can i|can you|do i|does|is it|is there)\b/.test(normalize(message))