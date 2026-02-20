# Assessment Tool - Local Testing Guide

## 🧪 Test Before Production

Run the assessment tool locally to test all Phase 1 features before deploying to `assess.salient-group.com`.

---

## Quick Start

```bash
# 1. Navigate to assessment directory
cd /Users/alex/.openclaw/workspace/salient-security-assessment

# 2. Install dependencies (first time only)
npm install

# 3. Start test server
npm test

# 4. Open in browser
# Server will print: http://localhost:3001
```

---

## What Gets Tested

✅ **FBI Crime Data Integration**
- Real API calls to `api.usa.gov/crime/fbi/cde`
- Crime statistics for selected state
- Comparison to national averages

✅ **CRM Database Integration**
- Saves lead to Neon PostgreSQL
- Creates contact in `crm.salient-group.com`
- Full assessment data in notes field

✅ **Telegram Notifications**
- Sends alert to your Telegram
- Message prefixed with "🧪 TEST SUBMISSION"
- Includes all lead details

✅ **Save/Resume Functionality**
- Auto-save on step change
- Manual save/load buttons
- LocalStorage persistence

✅ **All 10 Industry Verticals**
- Warehouse, Office, Retail, Healthcare
- Construction, Residential, Events, Education
- Hospitality, Manufacturing, Government, Financial

---

## Test Mode Differences

| Feature | Test Mode | Production |
|---------|-----------|------------|
| **URL** | `localhost:3001` | `assess.salient-group.com` |
| **Business Name** | Prefixed with `[TEST]` | Normal |
| **CRM Lead** | Saved with `[TEST]` prefix | Normal |
| **Telegram Alert** | Starts with "🧪 TEST SUBMISSION" | Normal alert |
| **Database** | Same Neon DB (safe to delete after) | Same Neon DB |

**Note:** Test leads are real database entries. You can delete them from CRM after testing.

---

## Testing Checklist

### Basic Flow
- [ ] Fill out Step 1 (Business Info)
- [ ] Select industry type (triggers vertical questions)
- [ ] Complete Step 2 (Facility Details + Vertical Questions)
- [ ] Complete Step 3 (Operations)
- [ ] Complete Step 4 (Current Security)
- [ ] Complete Step 5 (Contact Info)
- [ ] Submit assessment

### Expected Results
- [ ] Loading screen shows 7 status messages
- [ ] Results page displays with overall score
- [ ] FBI crime data appears with state name + year
- [ ] Crime breakdown shows (burglary, larceny, etc.)
- [ ] Risk categories show findings + recommendations
- [ ] Shift plan and pricing estimate display
- [ ] Telegram notification received (check your phone)
- [ ] Lead appears in CRM with `[TEST]` prefix

### Save/Resume
- [ ] Fill out Step 1
- [ ] Click "💾 Save Progress"
- [ ] See "✓ Progress saved" confirmation
- [ ] Refresh page
- [ ] Click "📂 Load Saved"
- [ ] Form state restored correctly
- [ ] Vertical questions reappear if past Step 1

### FBI Crime Data
- [ ] Check browser console for API call logs
- [ ] Verify crime rates display correctly
- [ ] Confirm "vs national avg" comparison shows (▲/▼)
- [ ] Test with different states to see varying data

### CRM Integration
- [ ] Open `https://crm.salient-group.com/contacts`
- [ ] Find lead with `[TEST]` prefix
- [ ] Click to view contact details
- [ ] Check Notes section for JSON assessment data
- [ ] Verify lead source = "assessment"
- [ ] Verify lead score is calculated

### Telegram Alert
- [ ] Check Telegram for notification
- [ ] Verify "🧪 TEST SUBMISSION" prefix
- [ ] Confirm all details present (name, email, phone, score)
- [ ] Click CRM link to verify it works

---

## Test Different Scenarios

### High-Risk Facility
- **Industry:** Warehouse
- **Docks:** 100+ (mega)
- **High-Value Cargo:** Yes
- **Current Security:** None
- **Incidents:** Frequent
- **Expected Score:** 80-95 (Urgent Need)

### Low-Risk Facility
- **Industry:** Office
- **Size:** 10,000 sq ft
- **Employees:** 25
- **Current Security:** Outsourced (good)
- **Incidents:** None
- **Expected Score:** 30-45 (Moderate Need)

### Healthcare Facility (Compliance-Heavy)
- **Industry:** Healthcare
- **Facility Type:** Hospital
- **Emergency Dept:** Yes
- **Behavioral Unit:** Yes
- **Expected:** High compliance category score

### Construction Site (Theft-Prone)
- **Industry:** Construction
- **Equipment Value:** Very High
- **Overnight Storage:** Unsecured
- **Site Perimeter:** Open
- **Expected:** High theft risk score

---

## Troubleshooting

### Server Won't Start
```bash
# Check if port 3001 is in use
lsof -i :3001

# Kill existing process if needed
kill -9 <PID>

# Or change port in server.js
const PORT = 3002; // Use different port
```

### Database Connection Error
```
Error: Can't reach database server
```
**Fix:** Check that DATABASE_URL is set in environment:
```bash
export DATABASE_URL="postgresql://neondb_owner:npg_wWoIX4Hb8nqJ@ep-tiny-credit-ailqtwur-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

### Telegram Not Sending
```
Telegram alert error: ...
```
**Fix:** Check TELEGRAM_BOT_TOKEN is set:
```bash
export TELEGRAM_BOT_TOKEN="<your-bot-token>"
```

### FBI API Fails
```
FBI API error: 403
```
**Fix:** API key may be invalid or rate-limited. Check:
- FBI API key in `api/submit.js`
- Rate limit status (1,000 requests/hour)

### Prisma Schema Not Found
```
Error: Cannot find module '@prisma/client'
```
**Fix:**
```bash
npm install
npx prisma generate
```

---

## Clean Up After Testing

### Delete Test Leads from CRM
1. Go to `https://crm.salient-group.com/contacts`
2. Filter by source: "assessment"
3. Find contacts with `[TEST]` prefix
4. Delete them

### Or via database (advanced):
```bash
# Connect to Neon PostgreSQL
psql "postgresql://neondb_owner:npg_wWoIX4Hb8nqJ@ep-tiny-credit-ailqtwur.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Delete test leads
DELETE FROM "Contact" WHERE company LIKE '[TEST]%';
```

---

## When to Deploy to Production

✅ **Deploy when:**
- All checklist items pass
- FBI crime data displays correctly
- CRM leads save properly
- Telegram alerts arrive
- Save/resume works
- No console errors
- All 10 industry verticals tested

❌ **Don't deploy if:**
- Database errors occur
- API calls fail repeatedly
- Telegram notifications missing
- Crime data doesn't display
- Save/resume broken
- Console shows errors

---

## Deployment Command

Once testing passes:

```bash
# 1. Commit changes
git add .
git commit -m "Phase 1: FBI crime data, CRM integration, Telegram alerts, save/resume"

# 2. Push to GitHub
git push origin main

# 3. Vercel auto-deploys from GitHub
# (Connected to sam-bowen-salient/salient-assessment)

# 4. Set environment variables in Vercel:
# - DATABASE_URL (from CRM project)
# - TELEGRAM_BOT_TOKEN (from CRM project)
# - FBI_API_KEY (already in vercel.json)

# 5. Verify at https://assess.salient-group.com
```

---

## Support

**Issues?**
- Check server console for error messages
- Check browser console (F12) for frontend errors
- Review `PHASE-1-ENHANCEMENTS.md` for architecture details

**Questions?**
Ask Alex (that's me!) 🌊
