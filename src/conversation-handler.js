/**
 * ShadowSpark Technologies WhatsApp Conversation Handler
 * Menu-driven responses with lead capture and business hours checking
 */

// Business hours configuration (WAT - West Africa Time)
const BUSINESS_HOURS = {
  monday: { open: 9, close: 18 },
  tuesday: { open: 9, close: 18 },
  wednesday: { open: 9, close: 18 },
  thursday: { open: 9, close: 18 },
  friday: { open: 9, close: 18 },
  saturday: { open: 10, close: 14 },
  sunday: null, // Closed
};

// Services catalog with pricing
const SERVICES = {
  chatbot: {
    name: "WhatsApp AI Chatbot",
    price: "₦350,000",
    description: "Intelligent AI-powered chatbot that handles customer inquiries 24/7",
  },
  autoresponder: {
    name: "WhatsApp Auto-Responder",
    price: "₦150,000",
    description: "Automated message responses for common customer questions",
  },
  leadfollowup: {
    name: "AI Lead Follow-Up System",
    price: "₦250,000",
    description: "Automated system to nurture and follow up with leads",
  },
  automation: {
    name: "Business Process Autopilot",
    price: "₦100,000/month",
    description: "Automate your business workflows and processes",
  },
};

// Company information
const COMPANY_INFO = {
  name: "ShadowSpark Technologies",
  location: "Port Harcourt, Rivers State",
  website: "shadowspark-tech.org",
};

/**
 * Check if current time is within business hours (WAT timezone)
 */
function isBusinessHours() {
  const now = new Date();
  
  // Convert to WAT (UTC+1)
  const watOffset = 1 * 60; // WAT is UTC+1
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  const watTime = new Date(utcTime + watOffset * 60000);
  
  const day = watTime.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const hour = watTime.getHours();
  
  const schedule = BUSINESS_HOURS[day];
  
  if (!schedule) return false; // Closed on this day
  
  return hour >= schedule.open && hour < schedule.close;
}

/**
 * Get business hours message
 */
function getBusinessHoursMessage() {
  return `Our business hours are:
📅 Monday - Friday: 9:00 AM - 6:00 PM WAT
📅 Saturday: 10:00 AM - 2:00 PM WAT
📅 Sunday: Closed

We'll respond to your message during our next business hours.`;
}

/**
 * Main menu display
 */
function getMainMenu() {
  return `Welcome to *${COMPANY_INFO.name}*! 🚀

How can we help you today?

1️⃣ View Our Services
2️⃣ Get Pricing Information
3️⃣ Book a Consultation
4️⃣ Request a Demo
5️⃣ Speak to a Human

Reply with the number of your choice (1-5).`;
}

/**
 * Services menu display
 */
function getServicesMenu() {
  const servicesList = Object.entries(SERVICES)
    .map(([key, service], index) => `${index + 1}. *${service.name}*\n   ${service.description}`)
    .join("\n\n");

  return `📋 *Our Services*

${servicesList}

Reply with:
• Number (1-4) for details
• *MENU* to return to main menu
• *PRICING* to see all prices`;
}

/**
 * Pricing menu display
 */
function getPricingMenu() {
  const pricingList = Object.entries(SERVICES)
    .map(([key, service]) => `• *${service.name}*: ${service.price}`)
    .join("\n");

  return `💰 *Our Pricing*

${pricingList}

All prices are one-time setup fees except Business Process Autopilot which is a monthly subscription.

Would you like to:
• Type *DEMO* to request a demo
• Type *BOOK* to schedule a consultation
• Type *MENU* to return to main menu`;
}

/**
 * Service detail by index (1-4)
 */
function getServiceDetail(index) {
  const services = Object.values(SERVICES);
  if (index < 1 || index > services.length) {
    return null;
  }
  
  const service = services[index - 1];
  return `✨ *${service.name}*

${service.description}

💵 Price: ${service.price}

Interested? Reply with:
• *DEMO* - Request a demo
• *BOOK* - Schedule a consultation
• *PRICING* - View all pricing
• *MENU* - Back to main menu`;
}

/**
 * Consultation booking response
 */
function getConsultationMessage() {
  return `📅 *Book a Free Consultation*

Great! We'd love to discuss how we can help your business.

Please provide the following information:
1. Your Name
2. Business Name
3. Phone Number
4. Preferred Date & Time

Or call us directly to schedule:
📍 Location: ${COMPANY_INFO.location}
🌐 Website: ${COMPANY_INFO.website}

${!isBusinessHours() ? "\n" + getBusinessHoursMessage() : ""}`;
}

/**
 * Demo request response
 */
function getDemoMessage() {
  return `🎯 *Request a Demo*

Excellent choice! We'll show you exactly how our solution works.

Please share:
1. Your Name
2. Business Name
3. Email Address
4. Which service interests you most?

We'll contact you within 24 hours to arrange your personalized demo.

${!isBusinessHours() ? "\n" + getBusinessHoursMessage() : ""}`;
}

/**
 * Human agent request
 */
function getHumanAgentMessage() {
  if (isBusinessHours()) {
    return `👤 *Connecting you to our team...*

A team member will respond shortly. Please describe your inquiry, and we'll assist you as soon as possible.

📍 ${COMPANY_INFO.location}
🌐 ${COMPANY_INFO.website}`;
  } else {
    return `👤 *Connect with Our Team*

We'd love to help! However, we're currently outside business hours.

${getBusinessHoursMessage()}

You can also:
🌐 Visit: ${COMPANY_INFO.website}
📧 Email us with your inquiry

Or continue chatting with me - I'm available 24/7! Type *MENU* to see what I can help with.`;
  }
}

/**
 * Capture lead information
 * @param {string} userMessage - The user's message
 * @param {string} userId - User's identifier
 * @returns {Object} Lead data if captured, null otherwise
 */
function captureLead(userMessage, userId) {
  // Simple lead capture - in production, you'd integrate with CRM/database
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const phoneRegex = /(\+?234|0)[789]\d{9}/;
  
  const hasEmail = emailRegex.test(userMessage);
  const hasPhone = phoneRegex.test(userMessage);
  
  if (hasEmail || hasPhone) {
    return {
      userId,
      message: userMessage,
      email: hasEmail ? userMessage.match(emailRegex)[0] : null,
      phone: hasPhone ? userMessage.match(phoneRegex)[0] : null,
      timestamp: new Date().toISOString(),
    };
  }
  
  return null;
}

/**
 * Main message handler - routes incoming messages to appropriate responses
 * @param {string} userMessage - The incoming message text
 * @param {string} userId - User's identifier
 * @returns {string} Response message
 */
function handleIncomingMessage(userMessage, userId) {
  const message = userMessage.trim().toUpperCase();
  
  // Check for lead capture (contains contact info)
  const lead = captureLead(userMessage, userId);
  if (lead) {
    // Log lead for follow-up (in production, save to database)
    console.log("Lead captured:", lead);
  }
  
  // Menu keywords
  if (message === "MENU" || message === "START" || message === "HI" || message === "HELLO") {
    return getMainMenu();
  }
  
  // Main menu options
  if (message === "1") {
    return getServicesMenu();
  }
  
  if (message === "2" || message === "PRICING") {
    return getPricingMenu();
  }
  
  if (message === "3" || message === "BOOK" || message === "CONSULTATION") {
    return getConsultationMessage();
  }
  
  if (message === "4" || message === "DEMO") {
    return getDemoMessage();
  }
  
  if (message === "5" || message === "HUMAN" || message === "AGENT") {
    return getHumanAgentMessage();
  }
  
  // Services menu - individual service details
  if (message === "SERVICES") {
    return getServicesMenu();
  }
  
  // Check for service number selection (1-4 when in services context)
  const serviceNum = parseInt(message);
  if (!isNaN(serviceNum) && serviceNum >= 1 && serviceNum <= 4) {
    const detail = getServiceDetail(serviceNum);
    if (detail) return detail;
  }
  
  // Default response for unrecognized input
  return `I'm not sure I understood that. ${getMainMenu()}`;
}

// Export for use in webhook handler
module.exports = {
  handleIncomingMessage,
  isBusinessHours,
  captureLead,
  SERVICES,
  COMPANY_INFO,
};
