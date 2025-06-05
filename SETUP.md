# ReallyGoodJob - Setup Guide

## 🚀 Quick Start

The project structure has been created according to the README.md specifications. Follow these steps to get started:

### 1. Environment Configuration

Copy the example environment file and configure your values:

```bash
cp env.example .env
```

Edit `.env` with your actual values:

```env
# Database - Set up PostgreSQL first
DATABASE_URL=postgres://username:password@localhost:5432/reallygoodjob_db

# Google OAuth2 - Create in Google Cloud Console
GOOGLE_CLIENT_ID=your_actual_google_client_id
GOOGLE_CLIENT_SECRET=your_actual_google_client_secret

# Security - Generate secure random keys
ENCRYPTION_KEY=your_32_character_encryption_key
JWT_SECRET=your_jwt_secret_key
```

### 2. Database Setup

1. **Install PostgreSQL** (if not already installed)
2. **Create Database:**
   ```sql
   CREATE DATABASE reallygoodjob_db;
   ```
3. **Update DATABASE_URL** in `.env` with your actual PostgreSQL credentials

### 3. Google OAuth2 Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the Gmail API
4. Create OAuth2 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/auth/google/callback`
5. Copy Client ID and Client Secret to your `.env` file

### 4. Generate Security Keys

**Encryption Key (32 characters exactly):**
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

**JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Install Dependencies & Start

Dependencies are already installed. To start the server:

```bash
# Compile SCSS (if you make style changes)
npm run build:css

# Start the development server
npm run dev
```

### 6. Access the Application

- **Landing Page:** http://localhost:3000
- **Health Check:** http://localhost:3000/health

## 📁 Project Structure

The complete file structure has been created as per README.md:

```
src/
├── config/config.js           ✅ Configuration management
├── models/                    ✅ Database models (User, Campaign, etc.)
├── routes/                    ✅ API route handlers
├── controllers/               🔄 To be implemented
├── services/                  🔄 To be implemented  
├── middleware/                ✅ Auth, admin, error handling
├── templates/                 ✅ Email mood templates
├── workers/sendWorker.js      ✅ Cron job scheduler
└── server.js                  ✅ Main application server
```

## 🎯 Next Steps

The MVP foundation is ready! Next implementation priorities:

1. **Authentication Controllers** - Complete Google OAuth2 flow
2. **Campaign Management** - CRUD operations for campaigns
3. **Gmail Service** - Email sending via Gmail API
4. **Template Service** - Process email templates with placeholders
5. **Admin Panel** - Campaign approval workflow

## ⚠️ Important Notes

- Database tables will be auto-created on first run
- All route handlers are currently placeholders
- Templates are ready for the three moods (Happy, Cheerful, Ecstatic)
- Send worker is initialized but needs implementation
- SCSS compiles to `public/css/main.css`

## 🐛 Troubleshooting

**Database Connection Issues:**
- Ensure PostgreSQL is running
- Check DATABASE_URL format: `postgres://user:pass@host:port/dbname`

**OAuth Issues:**
- Verify redirect URI matches Google Console exactly
- Ensure Gmail API is enabled in Google Cloud

**Dependencies:**
- Run `npm install` if any packages are missing
- Use `npm run dev` for development with auto-restart

---

**Ready to start building!** 🎉 