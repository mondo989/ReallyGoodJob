const fs = require('fs');
const path = require('path');
const { TemplateMood } = require('../models/database');
const config = require('../config/config');

class TemplateService {
  constructor() {
    this.templatesPath = path.join(__dirname, '../templates');
  }

  /**
   * Initialize all template moods from template files
   */
  async initializeTemplateMoods() {
    try {
      console.log('🎨 Initializing template moods...');
      
      // Define mood mapping to template files
      const moodTemplates = {
        [config.MOODS.HAPPY]: 'happy.txt',
        [config.MOODS.CHEERFUL]: 'cheerful.txt',
        [config.MOODS.ECSTATIC]: 'ecstatic.txt',
        [config.MOODS.GRATEFUL]: 'grateful.txt',
        [config.MOODS.PROFESSIONAL]: 'professional.txt',
        [config.MOODS.WARM]: 'warm.txt',
        [config.MOODS.ENTHUSIASTIC]: 'enthusiastic.txt',
        [config.MOODS.HEARTFELT]: 'heartfelt.txt',
        [config.MOODS.INSPIRING]: 'inspiring.txt'
      };

      for (const [moodName, templateFile] of Object.entries(moodTemplates)) {
        try {
          // Check if mood already exists
          const existingMood = await TemplateMood.findOne({ where: { name: moodName } });
          
          if (!existingMood) {
            // Read template file
            const templatePath = path.join(this.templatesPath, templateFile);
            
            if (fs.existsSync(templatePath)) {
              const templateContent = fs.readFileSync(templatePath, 'utf8');
              const lines = templateContent.split('\n');
              
              // Extract subject line (first line after "Subject:")
              const subjectLine = lines.find(line => line.startsWith('Subject:'))?.replace('Subject: ', '').trim();
              
              // Extract body (everything after the first blank line)
              const bodyStartIndex = lines.findIndex(line => line.trim() === '') + 1;
              const bodyText = lines.slice(bodyStartIndex).join('\n').trim();
              
              if (subjectLine && bodyText) {
                await TemplateMood.create({
                  name: moodName,
                  subjectLine: subjectLine,
                  bodyText: bodyText
                });
                
                console.log(`✅ Created template mood: ${moodName}`);
              } else {
                console.warn(`⚠️ Could not parse template file: ${templateFile}`);
              }
            } else {
              console.warn(`⚠️ Template file not found: ${templateFile}`);
            }
          }
        } catch (error) {
          console.error(`❌ Error creating template mood ${moodName}:`, error);
        }
      }
      
      console.log('🎨 Template moods initialization complete');
    } catch (error) {
      console.error('❌ Error initializing template moods:', error);
    }
  }

  /**
   * Get all available template moods
   */
  async getAllMoods() {
    try {
      return await TemplateMood.findAll({
        order: [['name', 'ASC']]
      });
    } catch (error) {
      console.error('Error fetching template moods:', error);
      return [];
    }
  }

  /**
   * Get template mood by name
   */
  async getMoodByName(moodName) {
    try {
      return await TemplateMood.findOne({
        where: { name: moodName }
      });
    } catch (error) {
      console.error(`Error fetching template mood ${moodName}:`, error);
      return null;
    }
  }

  /**
   * Render template with placeholders
   */
  renderTemplate(template, data) {
    let rendered = template;
    
    // Replace placeholders
    const placeholders = {
      '[Sender Name]': data.senderName || 'Unknown Sender',
      '[Recipient Name]': data.recipientName || 'Dear Friend',
      '[Campaign Name]': data.campaignName || 'Campaign',
      '[Sender Note]': data.senderNote || ''
    };
    
    for (const [placeholder, value] of Object.entries(placeholders)) {
      rendered = rendered.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    }
    
    return rendered;
  }
}

module.exports = new TemplateService(); 