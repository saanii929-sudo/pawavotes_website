// AI Chatbot Service for PawaVotes
// This uses pattern matching and keyword detection for intelligent responses

interface Intent {
  name: string;
  patterns: string[];
  responses: string[];
  confidence: number;
}

const intents: Intent[] = [
  {
    name: 'greeting',
    patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
    responses: [
      'Hello! Welcome to PawaVotes. How can I help you today?',
      'Hi there! I\'m here to assist you with voting and awards. What can I do for you?',
      'Hey! Thanks for reaching out. How may I assist you?',
    ],
    confidence: 0.9,
  },
  {
    name: 'how_to_vote',
    patterns: ['how to vote', 'how do i vote', 'voting process', 'cast vote', 'vote for'],
    responses: [
      'To vote, you can:\n1. Visit our website and select your award\n2. Choose a category and nominee\n3. Select number of votes\n4. Pay via Mobile Money or USSD\n\nYou can also dial our USSD code for quick voting!',
    ],
    confidence: 0.95,
  },
  {
    name: 'ussd_voting',
    patterns: ['ussd', 'ussd code', 'dial code', 'shortcode', 'phone voting'],
    responses: [
      'You can vote via USSD by dialing our shortcode. Simply follow the prompts to:\n1. Select an award\n2. Choose a category\n3. Pick your nominee\n4. Enter number of votes\n5. Approve payment on your phone\n\nIt works on all networks: MTN, Vodafone, and AirtelTigo!',
    ],
    confidence: 0.95,
  },
  {
    name: 'payment_methods',
    patterns: ['payment', 'pay', 'mobile money', 'momo', 'how to pay', 'payment options'],
    responses: [
      'We accept multiple payment methods:\n• Mobile Money (MTN, Vodafone, AirtelTigo)\n• USSD payments\n• Bank transfers\n• Credit/Debit cards\n\nAll payments are secure and processed through Paystack.',
    ],
    confidence: 0.9,
  },
  {
    name: 'vote_cost',
    patterns: ['how much', 'cost', 'price', 'vote price', 'how much per vote'],
    responses: [
      'Vote prices vary by award. Typically:\n• Standard vote: GHS 0.50\n• Bulk packages available with discounts\n\nCheck the specific award page for exact pricing.',
    ],
    confidence: 0.85,
  },
  {
    name: 'create_award',
    patterns: ['create award', 'organize award', 'host award', 'start award', 'new award'],
    responses: [
      'To create an award:\n1. Sign up as an organization\n2. Go to Dashboard > Awards\n3. Click "Create New Award"\n4. Set up categories and nominees\n5. Configure voting period and pricing\n\nNeed help? Contact our support team!',
    ],
    confidence: 0.9,
  },
  {
    name: 'nominee_submission',
    patterns: ['nominate', 'submit nominee', 'add nominee', 'nomination', 'become nominee'],
    responses: [
      'To submit a nomination:\n1. Visit the award page\n2. Click "Submit Nomination"\n3. Fill in nominee details\n4. Upload required documents/photos\n5. Submit for review\n\nThe organizer will review and approve your nomination.',
    ],
    confidence: 0.9,
  },
  {
    name: 'check_results',
    patterns: ['results', 'who won', 'winner', 'check results', 'voting results', 'leaderboard'],
    responses: [
      'To check results:\n1. Visit the award page\n2. Go to "Results" or "Leaderboard" section\n3. View live standings\n\nResults are updated in real-time during the voting period!',
    ],
    confidence: 0.9,
  },
  {
    name: 'payment_failed',
    patterns: ['payment failed', 'transaction failed', 'payment not working', 'cant pay'],
    responses: [
      'If your payment failed:\n1. Check your mobile money balance\n2. Ensure your number is registered for mobile money\n3. Try again or use a different payment method\n4. Contact your network provider if issue persists\n\nNeed more help? Contact our support team.',
    ],
    confidence: 0.85,
  },
  {
    name: 'vote_not_counted',
    patterns: ['vote not counted', 'vote missing', 'didnt receive vote', 'vote not showing'],
    responses: [
      'If your vote isn\'t showing:\n1. Check if payment was successful\n2. Wait a few minutes for processing\n3. Check your email for confirmation\n4. Contact support with your payment reference\n\nWe\'ll investigate and resolve it quickly!',
    ],
    confidence: 0.85,
  },
  {
    name: 'refund',
    patterns: ['refund', 'money back', 'return payment', 'cancel vote'],
    responses: [
      'Refund policy:\n• Votes are final once payment is confirmed\n• Refunds only for technical errors\n• Contact support with payment reference\n• Processing time: 5-7 business days\n\nEmail: support@pawavotes.com',
    ],
    confidence: 0.8,
  },
  {
    name: 'contact_support',
    patterns: ['contact', 'support', 'help', 'customer service', 'talk to human'],
    responses: [
      'Contact our support team:\n📧 Email: support@pawavotes.com\n📞 Phone: +233 24 123 4567\n⏰ Hours: Mon-Fri, 8AM-6PM GMT\n\nOr use the contact form on our website!',
    ],
    confidence: 0.9,
  },
  {
    name: 'thank_you',
    patterns: ['thank you', 'thanks', 'appreciate', 'helpful'],
    responses: [
      'You\'re welcome! Happy to help. Feel free to ask if you have more questions!',
      'Glad I could help! Enjoy voting on PawaVotes!',
      'My pleasure! Let me know if you need anything else.',
    ],
    confidence: 0.9,
  },
];

export function detectIntent(message: string): { intent: string; confidence: number; response: string } {
  const lowerMessage = message.toLowerCase();
  
  let bestMatch: Intent | null = null;
  let highestScore = 0;

  for (const intent of intents) {
    for (const pattern of intent.patterns) {
      if (lowerMessage.includes(pattern.toLowerCase())) {
        const score = intent.confidence * (pattern.length / lowerMessage.length);
        if (score > highestScore) {
          highestScore = score;
          bestMatch = intent;
        }
      }
    }
  }

  if (bestMatch && highestScore > 0.3) {
    const response = bestMatch.responses[Math.floor(Math.random() * bestMatch.responses.length)];
    return {
      intent: bestMatch.name,
      confidence: highestScore,
      response,
    };
  }

  // Default response
  return {
    intent: 'unknown',
    confidence: 0,
    response: 'I\'m not sure I understand. Could you rephrase that? Or type "help" to see what I can assist with.\n\nCommon topics:\n• How to vote\n• Payment methods\n• Create an award\n• Check results\n• Contact support',
  };
}

export function generateHelpMessage(): string {
  return `I can help you with:

🗳️ Voting
• How to vote
• USSD voting
• Payment methods
• Vote pricing

🏆 Awards
• Create an award
• Submit nominations
• Check results

💰 Payments
• Payment issues
• Refunds
• Transaction help

📞 Support
• Contact information
• Technical help

Just ask me anything!`;
}
