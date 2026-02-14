# AI & Automation + Nominee Campaign Tools

## Overview
This document covers the implementation of AI-powered automation features and nominee campaign management tools for PawaVotes.

---

## Part 1: AI & Automation Features

### 1. AI Chatbot for Customer Support

#### Features
- **Intent Detection**: Automatically understands user queries
- **Pattern Matching**: Recognizes keywords and phrases
- **Context-Aware Responses**: Provides relevant answers
- **Multi-Topic Support**: Handles voting, payments, awards, support
- **Session Management**: Tracks conversation history
- **Escalation**: Flags low-confidence responses for human review

#### Supported Intents
1. **Greetings** - Welcome messages
2. **How to Vote** - Voting process explanation
3. **USSD Voting** - Shortcode voting guide
4. **Payment Methods** - Available payment options
5. **Vote Cost** - Pricing information
6. **Create Award** - Award creation guide
7. **Nominee Submission** - Nomination process
8. **Check Results** - Results and leaderboards
9. **Payment Failed** - Troubleshooting payments
10. **Vote Not Counted** - Vote verification
11. **Refund** - Refund policy
12. **Contact Support** - Support information
13. **Thank You** - Acknowledgment

#### API Endpoints

**POST `/api/chatbot`**
```json
{
  "message": "How do I vote?",
  "sessionId": "unique-session-id",
  "userId": "user-id-optional",
  "userType": "guest|organization|org-admin|voter"
}
```

**Response:**
```json
{
  "success": true,
  "response": "To vote, you can...",
  "intent": "how_to_vote",
  "confidence": 0.95,
  "messageId": "message-id"
}
```

**GET `/api/chatbot?sessionId=xxx`**
- Retrieves chat history for a session

#### Usage Example
```typescript
const response = await fetch('/api/chatbot', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'How do I vote via USSD?',
    sessionId: 'session-123',
  }),
});

const data = await response.json();
console.log(data.response); // Chatbot response
```

#### Confidence Levels
- **High (>0.7)**: Confident response, auto-resolved
- **Medium (0.3-0.7)**: Acceptable response
- **Low (<0.3)**: Escalated to human support

---

### 2. Auto-Categorization of Nominees

#### Features
- **Keyword Matching**: Analyzes nominee name and description
- **ML-like Scoring**: Calculates confidence scores
- **Multiple Suggestions**: Provides alternative categories
- **Reasoning**: Explains categorization logic

#### Supported Categories
- Best Artist
- Best Actor/Actress
- Best Student
- Best Teacher
- Best Entrepreneur
- Best Athlete
- Best Doctor
- Best Nurse
- Community Leader
- Best Journalist

#### Service Function
```typescript
import { autoCategorizNominee } from '@/services/auto-categorization';

const result = autoCategorizNominee(
  'John Doe',
  'Award-winning musician and performer',
  availableCategories
);

console.log(result);
// {
//   suggestedCategory: 'category-id',
//   confidence: 0.85,
//   alternativeCategories: [...],
//   reasoning: 'Matched 8 relevant keywords for "Best Artist"'
// }
```

#### Integration Points
- Nomination submission form
- Admin nominee review
- Bulk nominee import

---

### 3. Automated Winner Announcements

#### Features
- **Automatic Calculation**: Counts votes per category
- **Top 3 Winners**: Identifies 1st, 2nd, 3rd place
- **Status Updates**: Marks nominees as winners
- **Email Notifications**: Sends winner notifications (TODO)
- **Social Media Posts**: Auto-posts to social media (TODO)
- **Certificates**: Generates winner certificates (TODO)

#### API Endpoints

**POST `/api/awards/[id]/announce-winners`**
- Announces winners for an award
- Requires voting period to be ended
- Only organization owner or superadmin can announce

**Response:**
```json
{
  "success": true,
  "message": "Winners announced successfully",
  "winners": [
    {
      "position": 1,
      "categoryName": "Best Artist",
      "nomineeName": "John Doe",
      "totalVotes": 10000,
      "totalAmount": 5000
    }
  ],
  "totalCategories": 5,
  "totalWinners": 15
}
```

**GET `/api/awards/[id]/announce-winners`**
- Retrieves announced winners
- Public endpoint

#### Usage
```typescript
// Announce winners
const response = await fetch(`/api/awards/${awardId}/announce-winners`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

// Get winners
const winners = await fetch(`/api/awards/${awardId}/announce-winners`);
```

#### Automation Triggers
- Manual: Admin clicks "Announce Winners" button
- Scheduled: Cron job runs after voting ends
- Webhook: Triggered by voting end event

---

## Part 2: Nominee Campaign Tools

### 1. Campaign Dashboard for Nominees

#### Features
- **Campaign Overview**: Name, description, goal
- **Progress Tracking**: Current amount vs goal
- **Supporter List**: Names, emails, contributions
- **Analytics**: Views, clicks, shares, donations
- **Status Management**: Draft, Active, Paused, Completed

#### Data Model
```typescript
{
  nomineeId: ObjectId,
  awardId: ObjectId,
  categoryId: ObjectId,
  campaignName: string,
  description: string,
  goalAmount: number,
  currentAmount: number,
  supporters: [{
    name: string,
    email: string,
    phone: string,
    amount: number,
    joinedAt: Date
  }],
  analytics: {
    views: number,
    clicks: number,
    shares: number,
    donations: number
  },
  status: 'draft' | 'active' | 'paused' | 'completed'
}
```

---

### 2. Fundraising Integration

#### Features
- **Goal Setting**: Set fundraising targets
- **Progress Bar**: Visual progress indicator
- **Donation Tracking**: Track all contributions
- **Supporter Recognition**: Acknowledge donors
- **Milestone Celebrations**: Celebrate funding milestones

#### Integration
```typescript
// Add supporter
campaign.supporters.push({
  name: 'Jane Doe',
  email: 'jane@example.com',
  amount: 100,
  joinedAt: new Date()
});

campaign.currentAmount += 100;
campaign.analytics.donations += 1;
await campaign.save();
```

---

### 3. Supporter Management

#### Features
- **Supporter Database**: Store supporter information
- **Segmentation**: Group by contribution level
- **Communication**: Email supporters
- **Engagement Tracking**: Monitor supporter activity

#### Supporter Tiers
- **Bronze**: GHS 1-50
- **Silver**: GHS 51-200
- **Gold**: GHS 201-500
- **Platinum**: GHS 501+

---

### 4. Campaign Analytics

#### Metrics Tracked
- **Views**: Campaign page visits
- **Clicks**: Link clicks
- **Shares**: Social media shares
- **Donations**: Total contributions
- **Conversion Rate**: Visitors to supporters
- **Average Donation**: Mean contribution amount

#### Analytics Dashboard
```typescript
{
  views: 1500,
  clicks: 450,
  shares: 89,
  donations: 45,
  conversionRate: 3.0%, // 45/1500
  averageDonation: 125.50
}
```

---

### 5. Social Media Scheduler

#### Features
- **Multi-Platform**: Facebook, Twitter, Instagram, TikTok
- **Schedule Posts**: Set future post times
- **Content Templates**: Pre-made post templates
- **Auto-Posting**: Automatic post publishing
- **Performance Tracking**: Engagement metrics

#### Data Model
```typescript
scheduledPosts: [{
  platform: 'facebook' | 'twitter' | 'instagram' | 'tiktok',
  content: string,
  scheduledFor: Date,
  posted: boolean,
  postedAt: Date
}]
```

#### Usage
```typescript
// Schedule a post
campaign.scheduledPosts.push({
  platform: 'facebook',
  content: 'Vote for me in the Best Artist category!',
  scheduledFor: new Date('2026-02-15T10:00:00'),
  posted: false
});
```

---

### 6. Email to Supporters

#### Features
- **Bulk Email**: Send to all supporters
- **Segmented Email**: Target specific groups
- **Templates**: Pre-designed email templates
- **Personalization**: Use supporter names
- **Tracking**: Open rates, click rates

#### Email Templates
1. **Thank You**: After donation
2. **Update**: Campaign progress
3. **Milestone**: Goal reached
4. **Reminder**: Vote reminder
5. **Winner Announcement**: If won

#### Data Model
```typescript
emailCampaigns: [{
  subject: string,
  content: string,
  sentAt: Date,
  recipientCount: number
}]
```

#### Usage
```typescript
// Send email to supporters
const emailContent = {
  subject: 'Thank you for your support!',
  content: 'Dear {{name}}, thank you for supporting my campaign...',
  sentAt: new Date(),
  recipientCount: campaign.supporters.length
};

campaign.emailCampaigns.push(emailContent);

// Send emails (integrate with email service)
for (const supporter of campaign.supporters) {
  await sendEmail({
    to: supporter.email,
    subject: emailContent.subject,
    html: emailContent.content.replace('{{name}}', supporter.name)
  });
}
```

---

## API Endpoints Summary

### Chatbot
- `POST /api/chatbot` - Send message
- `GET /api/chatbot?sessionId=xxx` - Get history

### Auto-Categorization
- Service function (no API endpoint)
- Used in nomination forms

### Winner Announcements
- `POST /api/awards/[id]/announce-winners` - Announce winners
- `GET /api/awards/[id]/announce-winners` - Get winners

### Campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns?nomineeId=xxx` - Get campaigns
- `GET /api/campaigns?awardId=xxx` - Get award campaigns

---

## Database Models

### ChatMessage
- sessionId, userId, userType
- message, response
- intent, confidence
- resolved, escalated
- metadata, timestamps

### NomineeCampaign
- nomineeId, awardId, categoryId, organizationId
- campaignName, description
- goalAmount, currentAmount
- supporters[], socialMedia{}
- emailCampaigns[], scheduledPosts[]
- analytics{}, status
- timestamps

---

## Future Enhancements

### AI & Automation
1. **Natural Language Processing**: Use OpenAI/Claude API
2. **Sentiment Analysis**: Analyze voter feedback
3. **Predictive Analytics**: Forecast winners
4. **Smart Pricing**: Dynamic vote pricing
5. **Content Moderation**: Auto-filter inappropriate content

### Campaign Tools
1. **Video Campaigns**: Upload campaign videos
2. **Live Streaming**: Stream campaign events
3. **Crowdfunding**: Integrated payment processing
4. **Merchandise**: Sell campaign merchandise
5. **Event Management**: Organize campaign events

---

## Implementation Checklist

### Phase 1: Core Features ✅
- [x] Chatbot service
- [x] Chatbot API
- [x] Auto-categorization service
- [x] Winner announcement API
- [x] Campaign model
- [x] Campaign API

### Phase 2: UI Components
- [ ] Chatbot widget
- [ ] Campaign dashboard page
- [ ] Supporter management page
- [ ] Social media scheduler UI
- [ ] Email composer

### Phase 3: Integrations
- [ ] Email service (SendGrid/Mailgun)
- [ ] Social media APIs
- [ ] Payment gateway for donations
- [ ] Analytics tracking (Google Analytics)

### Phase 4: Advanced Features
- [ ] AI-powered responses (OpenAI)
- [ ] Predictive analytics
- [ ] Smart recommendations
- [ ] Automated reporting

---

## Testing

### Chatbot Testing
```bash
curl -X POST http://localhost:3000/api/chatbot \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I vote?",
    "sessionId": "test-123"
  }'
```

### Campaign Testing
```bash
curl -X POST http://localhost:3000/api/campaigns \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "nomineeId": "nominee-id",
    "campaignName": "Vote for John",
    "description": "Support my campaign",
    "goalAmount": 5000
  }'
```

---

## Support

For questions or issues:
- Email: dev@pawavotes.com
- Documentation: /docs
- GitHub: github.com/pawavotes

---

## Changelog

### v1.0.0 (2026-02-13)
- Initial implementation
- Chatbot with 13 intents
- Auto-categorization for 10 categories
- Winner announcement system
- Campaign management
- Supporter tracking
- Social media scheduler
- Email campaigns
