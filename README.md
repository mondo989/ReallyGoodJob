# ReallyGoodJob (MVP)

> **Emphasis:** This README outlines a minimal viable product. Code must be strictly modular, adhere to the specified file structure, and avoid unnecessary files or technical debt. Follow this spec precisely when building features.

---

## Table of Contents

1. [Project Overview](#project-overview)  
2. [Goals & MVP Scope](#goals--mvp-scope)  
3. [High-Level Feature Set](#high-level-feature-set)  
4. [Data Models & Relationships](#data-models--relationships)  
5. [Template Structure & Moods](#template-structure--moods)  
6. [Scheduling & Tier Logic](#scheduling--tier-logic)  
7. [Gmail Integration & Quota](#gmail-integration--quota)  
8. [Analytics & Tracking](#analytics--tracking)  
9. [Campaign Submission & Approval Flow](#campaign-submission--approval-flow)  
10. [Dashboard & Admin Panel](#dashboard--admin-panel)  
11. [Social Sharing](#social-sharing)  
12. [File Structure](#file-structure)  
13. [SCSS Styling Guidelines](#scss-styling-guidelines)  
14. [Environment Variables & Configuration](#environment-variables--configuration)  
15. [Getting Started](#getting-started)  
16. [Future Considerations](#future-considerations)  

---

## Project Overview

**Working Title:** ReallyGoodJob  
**MVP Goal:** Provide individual users a simple, streamlined way to sign in with their Gmail account and send plain-text “thank you” or “appreciation” emails to one or more recipients (businesses, causes, or individuals) based on approved campaigns.  
**Target User:** Individual consumers who want to send appreciation emails.

> **Modularity Emphasis:**  
> - All code must be organized into logical folders (controllers, services, models, routes, etc.).  
> - Avoid creating extra files or folders beyond what’s specified herein.  
> - Modules should export only what’s required; no unused code.

---

## Goals & MVP Scope

- **Authenticate** users via Gmail OAuth2.  
- **Campaign Submission & Approval**  
  - Consumers can submit campaigns (name, description, recipient list CSV, optional sender note).  
  - Only Admins can review, approve, or reject campaigns.  
  - Approved campaigns become visible/usable by all users.  
- **Template/Mood System**  
  - Plain-text templates with three initial moods: Happy, Cheerful, Ecstatic.  
  - Templates include placeholders for `[Sender Name]`, `[Recipient Name]`, `[Campaign Name]`, `[Sender Note]`.  
- **Send Logic**  
  - Free Tier: Up to 5 campaigns/month, one send per campaign per day (user selects window: Morning/Afternoon/Evening).  
  - Premium Tier: Up to 3 sends/day per campaign (one per window), each send uses a different mood in round-robin.  
  - Each scheduled send loops through all recipients in a campaign’s recipient list, generating and sending one personalized email per recipient.  
- **Tracking & Analytics**  
  - Log each send in `EmailLog` with status (Sent/Failed).  
  - Embed a 1×1 open-tracking pixel (difficulty rating: 4/10).  
  - Skip click-tracking for MVP (defer to v2).  
  - Dashboard shows per-campaign totals: emails sent, emails opened.  

> **Note:** MVP will skip attachments or images to reduce complexity. All emails are plain text.

---

## High-Level Feature Set

1. **User Authentication (OAuth2)**  
   - Frontend “Sign in with Google” button directs to backend `/auth/google`.  
   - Backend exchanges authorization code for `access_token` & `refresh_token`.  
   - Encrypt and store tokens in database.  
   - Manage session or JWT for authenticated requests.

2. **Campaign Management**  
   - **Consumer-Facing**  
     - Submit new campaign (fields: `name`, `description`, CSV upload of recipients, optional `senderNote`).  
     - View list of approved campaigns to select for scheduling.  
     - View own scheduled campaigns & send history.  
   - **Admin-Facing**  
     - List “Pending” campaigns; Approve, Edit, or Reject.  
     - Edit any campaign’s metadata, expiration, and recipient list.  
     - View platform-wide metrics: total sends, active users, bounce rates.

3. **Template & Mood Engine**  
   - Three initial moods: **Happy**, **Cheerful**, **Ecstatic**.  
   - Plain-text template files with placeholders:  
     ```  
     Subject: [Campaign Name] – A Thank You from [Sender Name]
     
     Hello [Recipient Name],

     [Mood-specific opening line]

     [Sender Note]

     Best regards,
     [Sender Name]
     ```  
   - Placeholders resolved at send-time by `templateService`.

4. **Scheduling & Tier Logic**  
   - **Free Tier**  
     - Campaign Sends/Month: Max 5 distinct campaigns.  
     - Sends per Campaign: 1 send/day in chosen window.  
     - Windows:  
       - Morning: 08:00–12:00  
       - Afternoon: 12:00–17:00  
       - Evening: 17:00–21:00  
     - If user attempts > 5 total sends in a calendar month, block scheduling until next month.  
   - **Premium Tier**  
     - Sends per Campaign/Day: Up to 3 (one in each window).  
     - Mood Rotation: Maintain `currentMoodId` in `SendSchedule`. After each send, update to next mood (Happy → Cheerful → Ecstatic → repeat).  
     - `RemainingSendsThisWindow`: Default = 1; after send, set to 0 for that window until next day.  
     - Daily Reset: At 00:00 server time, reset `dailySendsCount=0` and `remainingSendsThisWindow=1` for all windows.

5. **Send Execution Worker**  
   - Cron job runs at window boundaries (e.g., 08:00, 12:00, 17:00).  
   - Fetch `SendSchedule` records where `nextRunAt ≤ now`, `window == currentWindow`, and `remainingSendsThisWindow > 0`.  
   - For each, pick next mood, generate subject/body, call `gmailService.sendEmail(userId, recipientEmail, subject, body)`.  
   - After each send:  
     - Decrement `remainingSendsThisWindow`.  
     - Increment `dailySendsCount`.  
     - Update `nextRunAt` to next valid window or next day’s window if limit reached.  

6. **Duplicate Sends Prevention**  
   - If `EmailLog` exists for same `(campaignId, recipientId)` with `sentAt ≥ now – 30 days`, skip scheduling.  

---

## Data Models & Relationships

> All `id` fields are UUIDs. Timestamps in UTC.

1. **User**  
   - `id` (UUID)  
   - `email` (string, unique)  
   - `name` (string)  
   - `oauthEncryptedTokens` (string, AES-256 encrypted JSON of `{ access_token, refresh_token }`)  
   - `tier` (enum: Free, Premium)  
   - `stripeCustomerId` (string, nullable)  
   - `createdAt` (timestamp)  
   - `updatedAt` (timestamp)

2. **Campaign**  
   - `id` (UUID)  
   - `name` (string)  
   - `description` (string)  
   - `status` (enum: Pending, Active, Rejected, Expired)  
   - `createdByUserId` (UUID)  
   - `approvedByAdminId` (UUID, nullable)  
   - `createdAt` (timestamp)  
   - `approvedAt` (timestamp, nullable)  
   - `expirationAt` (timestamp, default = `createdAt + 90 days`)  
   - `duplicateWindowDays` (int, default = 30)  
   - `freeTierLimitPerMonth` (int, default = 5)  
   - `premiumTierLimitPerDay` (int, default = 3)  

3. **Recipient** (many-to-one → Campaign)  
   - `id` (UUID)  
   - `campaignId` (UUID)  
   - `email` (string)  
   - `displayName` (string)  
   - `personalizedName` (string, defaults to `displayName`)  
   - `createdAt` (timestamp)

4. **TemplateMood**  
   - `id` (UUID)  
   - `name` (enum: Happy, Cheerful, Ecstatic)  
   - `subjectLine` (string with placeholders)  
   - `bodyText` (string with placeholders)  
   - `createdAt` (timestamp)

5. **SendSchedule**  
   - `id` (UUID)  
   - `campaignId` (UUID)  
   - `userId` (UUID)  
   - `currentMoodId` (UUID, points to next mood in rotation)  
   - `window` (enum: Morning, Afternoon, Evening)  
   - `nextRunAt` (timestamp)  
   - `remainingSendsThisWindow` (int, Free = 1, Premium = 1)  
   - `dailySendsCount` (int, resets at midnight)  
   - `createdAt` (timestamp)  
   - `updatedAt` (timestamp)

6. **EmailLog**  
   - `id` (UUID)  
   - `campaignId` (UUID)  
   - `recipientId` (UUID)  
   - `userId` (UUID)  
   - `moodId` (UUID)  
   - `subjectSent` (string)  
   - `bodySent` (string)  
   - `status` (enum: Sent, Failed)  
   - `errorMessage` (string, nullable)  
   - `openedAt` (timestamp, nullable)  
   - `sentAt` (timestamp)  
   - `createdAt` (timestamp)

---

## Template Structure & Moods

- **Placeholders** (must be replaced at send-time):  
  - `[Sender Name]` → fetched from user profile (Gmail).  
  - `[Recipient Name]` → from `Recipient.personalizedName`.  
  - `[Campaign Name]` → from `Campaign.name`.  
  - `[Sender Note]` → optional user-input at scheduling time.  

- **Initial Moods (3)**  
  1. **Happy**  
     - **Subject:** `Thank You from [Sender Name] – [Campaign Name]`  
     - **Body:**  
       ```  
       Hello [Recipient Name],

       I’m filled with happiness to reach out and express my gratitude on behalf of the [Campaign Name] campaign. [Sender Note]

       Warmly,
       [Sender Name]
       ```  
  2. **Cheerful**  
     - **Subject:** `Spreading Cheer: [Campaign Name] Thanks!`  
     - **Body:**  
       ```  
       Hi [Recipient Name],

       I hope you’re having a wonderful day! The [Campaign Name] campaign inspired me to send you this cheerful note of appreciation. [Sender Note]

       Cheers,
       [Sender Name]
       ```  
  3. **Ecstatic**  
     - **Subject:** `Ecstatic About [Campaign Name]! Thank You, [Recipient Name]!`  
     - **Body:**  
       ```  
       Hey [Recipient Name]!

       I’m absolutely ecstatic to send you this message from the [Campaign Name] campaign. [Sender Note]

       Best,
       [Sender Name]
       ```

- **TemplatePersonalization Logic**  
  - At send-time, select correct `TemplateMood` row.  
  - Replace placeholders using simple string interpolation.  

---

## Scheduling & Tier Logic

```text
1. Windows (Time Slots)
   - Morning: 08:00–12:00
   - Afternoon: 12:00–17:00
   - Evening: 17:00–21:00

2. Free Tier
   - Monthly Campaign Limit: 5 distinct campaigns.
   - Sends per Campaign: 1 send/day in chosen window.
   - RemainingSendsThisWindow: Default = 1; after send, set to 0 until next day.
   - Monthly Reset: At 00:00 on first of month, reset each user’s monthly send counters.

3. Premium Tier
   - Daily Send Limit per Campaign: 3 (one in each window).
   - Mood Rotation: Maintain currentMoodId in SendSchedule. After each send, update to next mood.
   - RemainingSendsThisWindow: Default = 1; after send, set to 0 for that window until next day.
   - Daily Reset: At 00:00 server time, reset dailySendsCount=0 and remainingSendsThisWindow=1 for all windows.

4. Duplicate Prevention
   - If EmailLog exists for same (campaignId, recipientId) with sentAt ≥ now – 30 days, skip scheduling.
Worker Execution Flow

At each window boundary (08:00, 12:00, 17:00):
  └─ Query SendSchedule where:
        nextRunAt ≤ currentTime
        window == currentWindow
        remainingSendsThisWindow > 0
  └─ For each schedule:
        • Fetch associated Campaign, User, Recipients, currentMoodId
        • For each Recipient not in duplicateWindow:
            – Render subject/body via TemplateService
            – Call gmailService.sendEmail(userId, recipient.email, subject, body)
            – Insert record in EmailLog (status based on API response)
        • Decrement remainingSendsThisWindow
        • Increment dailySendsCount
        • Set nextRunAt:
            – If Free → next day same window at 08:00
            – If Premium & dailySendsCount < 3 → next window today
            – Else → next day morning window
Gmail Integration & Quota

Per-User Quota:
Free Gmail: 500 emails/day
Google Workspace: 2,000 emails/day
MVP Cap: 100 sends/day/user (config.MAX_SENDS_PER_DAY) to stay well below Gmail limits.
OAuth Scopes:
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
https://www.googleapis.com/auth/gmail.send
Token Handling:
User clicks “Sign in with Google” → Redirect to /auth/google.
Google returns code to /auth/google/callback.
Backend calls Google OAuth token endpoint, receives { access_token, refresh_token, expires_in }.
Encrypt { access_token, refresh_token, expires_at } with AES-256, store in User.oauthEncryptedTokens.
Use refresh_token when access_token expires.
Send Method (gmailService.sendEmail)
Accepts: (userId, recipientEmail, subject, bodyPlainText).
Decrypt tokens, ensure valid access_token (refresh if needed).
Construct raw MIME message:
From: "Sender Name" <user.email>
To: recipientEmail
Subject: subject
Content-Type: text/plain; charset="UTF-8"

bodyPlainText

<img src="https://yourdomain.com/track/open.png?emailLogId=LOG_ID" alt="" />
Base64URL‐encode raw message, POST to https://www.googleapis.com/gmail/v1/users/me/messages/send.
Return API response status for logging.
Analytics & Tracking

Open-Tracking Pixel (4/10 Difficulty)
Endpoint: GET /track/open.png?emailLogId=<id>
Implementation:
router.get('/track/open.png', async (req, res) => {
  const { emailLogId } = req.query;
  await EmailLog.update({ openedAt: new Date() }, { where: { id: emailLogId } });
  // Return 1×1 transparent PNG
  res.set('Content-Type', 'image/png');
  res.send(Buffer.from(TRANSPARENT_PIXEL_BASE64, 'base64'));
});
Embed <img src="https://yourdomain.com/track/open.png?emailLogId=..." alt="" /> at bottom of each email.
Click-Tracking (5/10 Difficulty – Deferred to v2)
Not implemented in MVP. Future plan: wrap outbound URLs with redirect route, increment clickCount in EmailLog, then redirect.
Dashboard Metrics
Per-Campaign:
totalRecipients = COUNT(Recipient WHERE campaignId)
emailsSent = COUNT(EmailLog WHERE campaignId)
emailsOpened = COUNT(EmailLog WHERE campaignId AND openedAt IS NOT NULL)
Expose these in UI (Campaign View).
Campaign Submission & Approval Flow

Consumer Submission
Frontend: /consumer/campaigns/new form fields:
Campaign Name
Campaign Description
Recipient List CSV Upload (columns: email, displayName, optional personalizedName)
Optional Sender Note
Backend Route: POST /api/consumer/campaigns
Validate fields, parse CSV, insert Recipient rows, create Campaign with status = 'Pending', createdByUserId = user.id.
Return success message: “Campaign submitted—pending admin approval.”
Admin Review
Frontend Admin Panel: /admin/campaigns/pending
List pending campaigns (display name, description, submittedBy, createdAt).
Buttons: “Approve,” “Reject,” “Edit.”
Backend Routes:
GET /api/admin/campaigns?status=Pending
POST /api/admin/campaigns/:id/approve → set status = 'Active', approvedByAdminId = admin.id, approvedAt = now.
POST /api/admin/campaigns/:id/reject → set status = 'Rejected', approvedByAdminId = admin.id, approvedAt = now.
PUT /api/admin/campaigns/:id → edit campaign fields before approval.
Post-Approval
Campaign becomes visible under /consumer/campaigns/active.
Consumers can click “Schedule Sends” on an active campaign.
Dashboard & Admin Panel

Consumer Dashboard
Routes & Views
/dashboard – landing with summary:
“My Active Campaigns” (list with status, next send time, sends remaining)
“My Send History” (table: campaignName | recipientEmail | subject | sentAt | status)
/campaigns – list all approved campaigns, search/filter by name.
/campaigns/:id/schedule – form to select window (Morning/Afternoon/Evening) and optional Sender Note, preview email then “Confirm & Schedule.”
/campaigns/:id/preview – show sample plain-text email for first recipient with placeholders resolved.
Admin Panel
Routes & Views
/admin – dashboard summary:
“Pending Campaigns” count, “Active Campaigns” count, “Total Sends (all time).”
/admin/campaigns/pending – list pending campaigns.
/admin/campaigns/:id – detail view: all campaign fields, recipient list, approve/reject/edit buttons.
/admin/users – list all users, tier status, total sends.
/admin/metrics – platform-wide metrics:
Total campaigns (by status), total sends (daily/weekly/monthly), average sends per user, bounce/failure rates (via EmailLog.status == 'Failed').
Styling Note: Admin views can be minimal HTML; focus on data richness, not aesthetics.
Social Sharing

After a successful send batch (one window’s job completes), store a share link:
https://yourdomain.com/share/campaign/<campaignId>?user=<userHandle>&sentAt=<timestamp>
Share landing page displays:
“I just sent a #ThankYou wave to [Campaign Name]! Join me in spreading positivity.”
Consumer Dashboard: “Share to Twitter” button opens:
https://twitter.com/intent/tweet?text=I%20just%20sent%20a%20%23ThankYou%20wave%20to%20[Campaign%20Name]!%20Join%20me%20here:%20https://yourdomain.com/share/campaign/[campaignId]
Note: MVP uses text-only sharing (no dynamically generated images).
File Structure

Strictly follow this tree. Do not create additional top-level folders or files.
Names in ALL CAPS denote files or folders to be created verbatim.
/ReallyGoodJob
├── node_modules/
├── public/
│   └── index.html                     # Basic landing page placeholder
├── src/
│   ├── controllers/
│   │   ├── authController.js          # Handles /auth/google and callback
│   │   ├── campaignController.js      # CRUD: consumer & admin for Campaigns
│   │   ├── recipientController.js     # Manage Recipient creation via CSV parsing
│   │   ├── scheduleController.js      # Scheduling endpoints (create, view, cancel)
│   │   ├── adminController.js         # Admin-specific endpoints
│   │   ├── analyticsController.js     # Endpoints for campaign metrics
│   │   ├── trackingController.js      # /track/open.png endpoint
│   │   └── userController.js          # User profile, tier status
│   ├── models/
│   │   ├── userModel.js               # User schema
│   │   ├── campaignModel.js           # Campaign schema
│   │   ├── recipientModel.js          # Recipient schema
│   │   ├── templateMoodModel.js       # TemplateMood schema
│   │   ├── scheduleModel.js           # SendSchedule schema
│   │   └── emailLogModel.js           # EmailLog schema
│   ├── routes/
│   │   ├── authRoutes.js              # /auth/google, /auth/google/callback
│   │   ├── campaignRoutes.js          # /api/consumer/campaigns, /api/admin/campaigns
│   │   ├── recipientRoutes.js         # /api/recipients (for CSV parsing)
│   │   ├── scheduleRoutes.js          # /api/schedules
│   │   ├── adminRoutes.js             # /api/admin/*
│   │   ├── analyticsRoutes.js         # /api/analytics/*
│   │   └── trackingRoutes.js          # /track/open.png
│   ├── services/
│   │   ├── gmailService.js            # Handles Gmail API calls (sendEmail, refreshToken)
│   │   ├── templateService.js         # Loads & interpolates template files
│   │   ├── schedulerService.js        # Manages SendSchedule and mood rotation
│   │   ├── csvParserService.js        # Parses uploaded CSV into Recipient entries
│   │   ├── encryptionService.js       # AES-256 encrypt/decrypt for tokens
│   │   └── analyticsService.js        # Aggregates metrics for controllers
│   ├── middleware/
│   │   ├── authMiddleware.js          # Verifies JWT/session for protected routes
│   │   ├── adminMiddleware.js         # Checks admin role
│   │   └── errorHandler.js            # Global error handler
│   ├── utils/
│   │   ├── dateUtils.js               # Helpers for date resets and comparisons
│   │   └── emailUtils.js              # MIME message builder
│   ├── templates/
│   │   ├── happy.txt                  # Happy mood template
│   │   ├── cheerful.txt               # Cheerful mood template
│   │   └── ecstatic.txt               # Ecstatic mood template
│   ├── workers/
│   │   └── sendWorker.js              # Cron/queue worker to execute sends
│   ├── config/
│   │   └── config.js                  # Loads ENV vars, defines constants
│   └── server.js                      # Main Express app initialization
├── .env                               # Environment variables (not committed)
├── .gitignore                         # node_modules, .env, logs, etc.
├── package.json
├── package-lock.json
└── README.md                          # (This file)
Technical Debt Warning:
Do not add extra folders at root or inside src/ unless explicitly specified.
No temporary or “scratch” files.
Any new functionality must fit into existing modules.
Remove unused code/folders immediately to maintain modularity.
SCSS Styling Guidelines

Use SCSS for all styling.
Organize SCSS files under src/styles/ (create that folder if needed).
Follow BEM naming conventions.
Create partials for variables (_variables.scss), mixins (_mixins.scss), and base styles (_base.scss).
Compile SCSS into a single public/css/main.css using your build step.
Environment Variables & Configuration

Create a .env file in the project root with the following keys:

# Server & Database
PORT=3000
DATABASE_URL=postgres://username:password@localhost:5432/reallygoodjob_db

# Google OAuth2
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Encryption (32-byte key for AES-256)
ENCRYPTION_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# JWT Secret
JWT_SECRET=your_jwt_secret

# Gmail API Quota Cap
MAX_SENDS_PER_DAY=100

# Node Environment
NODE_ENV=development
Modularity Warning:
Do not hardcode any of these values. Always reference process.env.* in config/config.js.
Getting Started

Clone Repository
git clone https://github.com/yourorg/ReallyGoodJob.git
cd ReallyGoodJob
Install Dependencies
npm install
Create & Configure .env
Copy the template above.
Fill in GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ENCRYPTION_KEY, JWT_SECRET, and DATABASE_URL.
Database Setup
Ensure PostgreSQL is running and reachable via DATABASE_URL.
Run migrations or use ORM sync to create tables:
npm run db:migrate
Google OAuth2 Setup
In Google Cloud Console, create OAuth credentials with redirect URI set to http://localhost:3000/auth/google/callback.
Enable Gmail API and add authorized origins.
Start the Server
npm start
Server runs on http://localhost:3000 by default.
Create an Admin User
Manually insert a user row in the User table with tier = Premium and set an isAdmin flag (add that field if needed).
Alternatively, create a temporary seed script to do the same.
Access Admin Panel
Log in with the admin account.
Navigate to http://localhost:3000/admin to review pending campaigns.
Submit & Approve a Campaign (MVP Flow)
As a consumer user, visit /consumer/campaigns/new, fill out the form, and upload a CSV of recipients.
Admin logs in at /admin/campaigns/pending and approves the new campaign.
Consumer schedules a send under /campaigns/:id/schedule.
Observe Sending
Worker (src/workers/sendWorker.js) triggers at the next window.
Check the EmailLog table for sent entries and any errors.
View “Emails Opened” metrics as recipients open the emails (via tracking pixel).
Future Considerations


Final Technical Debt Warning:
Adhere strictly to the file structure above.
Remove any unused code immediately to keep the codebase clean.
Before adding new functionality, verify if an existing module can be extended.
Keep configuration values in environment variables; do not hardcode.
This README contains all the critical information to begin implementation. Follow it closely to build a clean, maintainable MVP without accumulating unnecessary complexity.
