/**
 * Assessment Tool Submission Handler
 * Handles form submissions, FBI crime data, CRM integration, and Telegram alerts
 */

const { PrismaClient } = require('@prisma/client');

// Use the same database connection as CRM
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_wWoIX4Hb8nqJ@ep-tiny-credit-ailqtwur-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

// FBI Crime Data API
const FBI_API_KEY = process.env.FBI_API_KEY || 'iiHnOKfno2Mgkt5AynpvPpUQTEyxE77jo1RU8PIv';
const FBI_API_BASE = 'https://api.usa.gov/crime/fbi/cde';

// Telegram webhook for notifications
const TELEGRAM_WEBHOOK = process.env.TELEGRAM_WEBHOOK || 'https://crm.salient-group.com/api/webhooks/telegram';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8049307730'; // Sam's Telegram ID

/**
 * Fetch FBI Crime Data for a location
 */
async function getFBICrimeData(city, state) {
  try {
    const stateCode = state.toUpperCase();
    
    // FBI API endpoint for city-level crime data
    const url = `${FBI_API_BASE}/summarized/state/${stateCode}/crime?API_KEY=${FBI_API_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`FBI API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    // Extract latest year's data
    if (data && data.results && data.results.length > 0) {
      const latest = data.results[data.results.length - 1];
      return {
        year: latest.data_year,
        property_crime_rate: latest.property_crime_rate || 0,
        violent_crime_rate: latest.violent_crime_rate || 0,
        burglary_rate: latest.burglary || 0,
        larceny_rate: latest.larceny || 0,
        motor_vehicle_theft_rate: latest.motor_vehicle_theft || 0,
        aggravated_assault_rate: latest.aggravated_assault || 0,
        robbery_rate: latest.robbery || 0
      };
    }
    
    return null;
  } catch (error) {
    console.error('FBI API fetch error:', error);
    return null;
  }
}

/**
 * Send Telegram notification
 */
async function sendTelegramAlert(lead, isTest = false) {
  try {
    const testPrefix = isTest ? '🧪 **TEST SUBMISSION** - ' : '';
    const message = `${testPrefix}🚨 **New Security Assessment Lead**

**Business:** ${lead.businessName}
**Industry:** ${lead.vertical}
**Contact:** ${lead.contactName}
**Email:** ${lead.email}
**Phone:** ${lead.phone}

**Location:** ${lead.city}, ${lead.state}
**Score:** ${lead.leadScore}/100

**Top Concerns:**
${lead.concerns?.slice(0, 3).map(c => `• ${c}`).join('\n') || '• No concerns listed'}

[View in CRM](https://crm.salient-group.com/contacts/${lead.id})`;

    const response = await fetch('https://api.telegram.org/bot' + process.env.TELEGRAM_BOT_TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });
    
    if (!response.ok) {
      console.error('Telegram send failed:', await response.text());
    }
  } catch (error) {
    console.error('Telegram alert error:', error);
  }
}

/**
 * Save lead to CRM database
 */
async function saveLeadToCRM(assessmentData, crimeData) {
  try {
    // Map vertical to CRM enum
    const verticalMap = {
      warehouse: 'logistics',
      office: 'commercial_re',
      retail: 'retail',
      healthcare: 'healthcare',
      construction: 'construction',
      residential: 'hoa',
      events: 'events',
      education: 'education',
      hospitality: 'hospitality',
      manufacturing: 'manufacturing',
      government: 'government',
      financial: 'financial'
    };
    
    const vertical = verticalMap[assessmentData.businessType] || 'other';
    
    // Calculate lead score (0-100 based on urgency + fit)
    const baseScore = Math.min(assessmentData.overallScore || 50, 100);
    const urgencyBonus = assessmentData.currentSecurity === 'none' ? 15 : 0;
    const incidentBonus = assessmentData.incidents === 'frequent' ? 10 : 
                         assessmentData.incidents === 'regular' ? 5 : 0;
    const leadScore = Math.min(baseScore + urgencyBonus + incidentBonus, 100);
    
    // Create contact in CRM
    const contact = await prisma.contact.create({
      data: {
        firstName: assessmentData.contactName.split(' ')[0] || assessmentData.contactName,
        lastName: assessmentData.contactName.split(' ').slice(1).join(' ') || '',
        email: assessmentData.email,
        phone: assessmentData.phone,
        company: assessmentData.businessName,
        title: '', // Optional from form
        vertical: vertical,
        state: assessmentData.state,
        city: assessmentData.city,
        source: 'assessment', // Mark as from assessment tool
        leadScore: leadScore,
        notes: JSON.stringify({
          assessmentDate: new Date().toISOString(),
          overallScore: assessmentData.overallScore,
          topConcerns: assessmentData.concerns?.slice(0, 5) || [],
          facilityDetails: {
            sqft: assessmentData.sqft,
            employees: assessmentData.employees,
            visitors: assessmentData.visitors,
            hours: assessmentData.hours,
            currentSecurity: assessmentData.currentSecurity
          },
          crimeData: crimeData
        })
      }
    });
    
    return contact;
  } catch (error) {
    console.error('CRM save error:', error);
    throw error;
  }
}

/**
 * Main handler
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const formData = req.body;
    const isTest = formData.isTest || false;
    
    // 1. Fetch FBI crime data
    const crimeData = await getFBICrimeData(formData.city, formData.state);
    
    // 2. Save lead to CRM
    const savedLead = await saveLeadToCRM(formData, crimeData);
    
    // 3. Send Telegram alert
    await sendTelegramAlert({
      ...savedLead,
      concerns: formData.concerns,
      vertical: formData.businessType
    }, isTest);
    
    // 4. Return enriched data (including crime stats)
    return res.status(200).json({
      success: true,
      leadId: savedLead.id,
      crimeData: crimeData,
      message: 'Assessment submitted successfully' + (isTest ? ' (TEST MODE)' : ''),
      isTest: isTest
    });
    
  } catch (error) {
    console.error('Submission error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process assessment',
      details: error.message
    });
  }
};
