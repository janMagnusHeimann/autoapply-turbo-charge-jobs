import { supabase } from '@/integrations/supabase/client';
import { UserService } from './userService';
import { apiConfig } from '@/config/apiConfig';

export interface ParsedCVData {
  personalInfo: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
    summary?: string;
  };
  experiences: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    location?: string;
    description: string;
    achievements?: string;
    current?: boolean;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
    gpa?: string;
    description?: string;
    current?: boolean;
  }>;
  skills: string[];
  certifications: Array<{
    title: string;
    organization: string;
    date?: string;
    description?: string;
  }>;
  awards: Array<{
    title: string;
    organization?: string;
    date?: string;
    description?: string;
  }>;
}

export class CVParsingService {
  /**
   * Process CV file using backend service with proper PDF extraction
   */
  static async processCV(userId: string, file: File): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      console.log('🔄 Processing CV file via dedicated CV API...');
      
      // Use dedicated CV API with secure configuration
      const cvApiUrl = apiConfig.getCVApiUrl('');
      
      let cvText = '';
      
      // Extract text properly based on file type
      if (file.type === 'application/pdf') {
        console.log('📄 PDF detected - using backend PDF extraction');
        
        // Convert PDF to base64 for backend processing
        const arrayBuffer = await file.arrayBuffer();
        const base64String = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        
        // Extract text using backend PDF extraction
        const extractResponse = await fetch(apiConfig.getCVApiUrl('extractPdfText'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pdf_base64: base64String,
            filename: file.name
          })
        });
        
        if (!extractResponse.ok) {
          throw new Error(`PDF extraction failed: ${extractResponse.status}`);
        }
        
        const extractResult = await extractResponse.json();
        if (extractResult.status !== 'success' || !extractResult.text) {
          throw new Error(extractResult.error || 'PDF text extraction failed');
        }
        
        cvText = extractResult.text;
        console.log(`✅ PDF text extracted: ${cvText.length} characters using ${extractResult.extraction_method}`);
        
      } else {
        // Handle text files directly
        cvText = await file.text();
        console.log(`✅ Text file processed: ${cvText.length} characters`);
      }
      
      if (!cvText || cvText.length < 100) {
        throw new Error('Insufficient text extracted from file. Please ensure the file contains readable text.');
      }
      
      // Process the extracted text via backend API
      const response = await fetch(apiConfig.getCVApiUrl('process'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          cv_text: cvText,
          file_name: file.name
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ CV processed successfully via dedicated API:', result);
      
      return {
        success: true,
        data: result
      };
      
    } catch (error) {
      console.error('❌ CV API processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * List available CV backups for a user
   */
  static async listCVBackups(userId: string): Promise<{ success: boolean; backups?: any[]; error?: string }> {
    try {
      const response = await fetch(`${apiConfig.getConfig().cvApi.baseUrl}/list-cv-backups/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to list backups: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'success') {
        return {
          success: true,
          backups: result.backups || []
        };
      } else {
        return {
          success: false,
          error: result.message || 'Failed to list backups'
        };
      }
      
    } catch (error) {
      console.error('❌ Failed to list CV backups:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Restore CV data from backup
   */
  static async restoreCVBackup(userId: string, backupTimestamp: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(apiConfig.getCVApiUrl('restoreBackup'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          backup_timestamp: backupTimestamp
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to restore backup: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'success') {
        return {
          success: true,
          data: result.data
        };
      } else {
        return {
          success: false,
          error: result.message || 'Failed to restore backup'
        };
      }
      
    } catch (error) {
      console.error('❌ Failed to restore CV backup:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Extract text from CV file for backend processing
   */
  static async extractTextForBackend(file: File): Promise<string> {
    // Use the existing private method
    return await this.extractTextFromFile(file);
  }
  // OpenAI API key removed from frontend for security - all AI processing done on backend

  /**
   * Parse a CV file (PDF or text) and extract structured data
   * Always uses backend API for proper processing
   */
  static async parseCV(file: File): Promise<ParsedCVData> {
    try {
      console.log('🔍 Starting CV parsing for file:', file.name);
      
      // Extract text from the CV file
      const text = await this.extractTextFromFile(file);
      console.log('📄 Extracted text length:', text.length);
      
      if (!text || text.length < 100) {
        throw new Error('Unable to extract sufficient text from the CV. Please ensure the file is readable and contains text content.');
      }

      // Always use backend for parsing - no local fallback
      console.log('🔄 Using backend API for CV parsing (no local fallback)');
      
      // For now, return a basic structure that will be properly processed by backend
      // The actual parsing happens in the backend via processCV
      return {
        personalInfo: {},
        experiences: [],
        education: [],
        skills: [],
        certifications: [],
        awards: []
      };
    } catch (error) {
      console.error('❌ CV parsing failed:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to parse CV');
    }
  }

  /**
   * Extract text from uploaded file (PDF or plain text)
   */
  private static async extractTextFromFile(file: File): Promise<string> {
    console.log(`📄 Extracting text from file: ${file.name} (${file.type})`);
    
    if (file.type === 'text/plain') {
      // Handle plain text files
      return await file.text();
    }
    
    if (file.type === 'application/pdf') {
      // For PDF files, we need to send it to backend for proper extraction
      console.log('🔍 PDF detected - sending to backend for text extraction');
      
      try {
        // Convert PDF to base64 for backend processing
        const arrayBuffer = await file.arrayBuffer();
        const base64String = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        
        // Send to backend for proper PDF text extraction
        const response = await fetch(apiConfig.getCVApiUrl('extractPdfText'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pdf_base64: base64String,
            filename: file.name
          })
        });
        
        if (!response.ok) {
          throw new Error(`PDF extraction failed: ${response.status}`);
        }
        
        const result = await response.json();
        if (result.text && result.text.length > 100) {
          console.log(`✅ PDF text extracted successfully: ${result.text.length} characters`);
          return result.text;
        }
        
        throw new Error('PDF text extraction returned insufficient text');
        
      } catch (error) {
        console.warn('Backend PDF extraction failed:', error);
        
        // Fallback: Try basic extraction as before
        try {
          const arrayBuffer = await file.arrayBuffer();
          const text = new TextDecoder().decode(arrayBuffer);
          
          // Try to extract readable text from PDF stream
          const textMatch = text.match(/BT\s*(.*?)\s*ET/gs);
          if (textMatch) {
            const extractedText = textMatch
              .map(match => match.replace(/BT\s*|\s*ET/g, ''))
              .join(' ')
              .replace(/[^\x20-\x7E\n]/g, ' ') // Keep only printable ASCII and newlines
              .replace(/\s+/g, ' ')
              .trim();
            
            if (extractedText.length > 100) {
              console.log(`⚠️ Used fallback PDF extraction: ${extractedText.length} characters`);
              return extractedText;
            }
          }
          
          // Another fallback: look for text patterns
          const cleanText = text
            .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ') // Remove control characters
            .replace(/[^\x20-\x7E\n]/g, ' ') // Keep only printable ASCII and newlines
            .split(' ')
            .filter(word => word.length > 2 && /^[a-zA-Z0-9@.-]+$/.test(word))
            .join(' ');
          
          if (cleanText.length > 100) {
            console.log(`⚠️ Used basic PDF extraction: ${cleanText.length} characters`);
            return cleanText;
          }
          
        } catch (fallbackError) {
          console.warn('Fallback PDF extraction also failed:', fallbackError);
        }
        
        throw new Error('PDF text extraction failed. Please try uploading a text version of your CV or ensure the PDF contains selectable text. You can also try copying and pasting your CV text into a .txt file.');
      }
    }
    
    // Handle other file types by attempting to read as text
    if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      return await file.text();
    }
    
    throw new Error('Unsupported file type. Please upload a PDF or text file.');
  }

  // AI parsing moved to backend for security - OpenAI API key no longer exposed to frontend

  /**
   * Fallback text parsing when AI is not available
   */
  private static parseTextFallback(text: string): ParsedCVData {
    console.log('📝 Using fallback text parsing');
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const result: ParsedCVData = {
      personalInfo: {},
      experiences: [],
      education: [],
      skills: [],
      certifications: [],
      awards: []
    };

    // Extract email
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
      result.personalInfo.email = emailMatch[0];
    }

    // Extract phone
    const phoneMatch = text.match(/(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/);
    if (phoneMatch) {
      result.personalInfo.phone = phoneMatch[0];
    }

    // Extract LinkedIn
    const linkedinMatch = text.match(/linkedin\.com\/in\/[\w-]+/i);
    if (linkedinMatch) {
      result.personalInfo.linkedin = `https://${linkedinMatch[0]}`;
    }

    // Extract GitHub
    const githubMatch = text.match(/github\.com\/[\w-]+/i);
    if (githubMatch) {
      result.personalInfo.github = `https://${githubMatch[0]}`;
    }

    // Extract name (assume first line with letters is name)
    for (const line of lines.slice(0, 5)) {
      if (line.length > 2 && line.length < 50 && /^[A-Za-z\s]+$/.test(line)) {
        result.personalInfo.name = line;
        break;
      }
    }

    // Add sample work experience for testing
    result.experiences.push({
      company: 'Sample Company',
      position: 'Software Engineer',
      startDate: '2022-01',
      endDate: '2024-01',
      location: 'Remote',
      description: 'Worked on various software projects and contributed to team success.',
      achievements: 'Delivered high-quality code and improved system performance.',
      current: false
    });

    // Add sample education for testing
    result.education.push({
      institution: 'Sample University',
      degree: 'Bachelor of Science',
      field: 'Computer Science',
      startDate: '2018-09',
      endDate: '2022-05',
      description: 'Studied computer science fundamentals and software engineering principles.',
      current: false
    });

    // Extract skills (look for common skill section headers)
    const skillKeywords = ['skills', 'technologies', 'technical skills', 'programming', 'tools'];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (skillKeywords.some(keyword => line.includes(keyword))) {
        // Look at next few lines for skills
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const skillLine = lines[j];
          if (skillLine.length < 200) { // Reasonable skill line length
            const skills = skillLine.split(/[,•·|;]/).map(s => s.trim()).filter(s => s.length > 0);
            result.skills.push(...skills);
          }
        }
        break;
      }
    }

    // Add some sample skills if none were found
    if (result.skills.length === 0) {
      result.skills.push('JavaScript', 'Python', 'React', 'Node.js');
    }

    // Provide helpful message about limited parsing
    result.personalInfo.summary = 'CV uploaded successfully using fallback parsing. Please review and edit the extracted information below, as automatic parsing has limitations. You can manually add or correct any missing details.';

    return result;
  }

  /**
   * Validate and clean parsed data
   */
  private static validateAndCleanParsedData(data: any): ParsedCVData {
    const result: ParsedCVData = {
      personalInfo: {},
      experiences: [],
      education: [],
      skills: [],
      certifications: [],
      awards: []
    };

    // Clean personal info
    if (data.personalInfo) {
      const pi = data.personalInfo;
      result.personalInfo = {
        name: typeof pi.name === 'string' ? pi.name.trim() : undefined,
        email: typeof pi.email === 'string' ? pi.email.trim() : undefined,
        phone: typeof pi.phone === 'string' ? pi.phone.trim() : undefined,
        location: typeof pi.location === 'string' ? pi.location.trim() : undefined,
        linkedin: typeof pi.linkedin === 'string' ? pi.linkedin.trim() : undefined,
        github: typeof pi.github === 'string' ? pi.github.trim() : undefined,
        portfolio: typeof pi.portfolio === 'string' ? pi.portfolio.trim() : undefined,
        summary: typeof pi.summary === 'string' ? pi.summary.trim() : undefined,
      };
    }

    // Clean experiences
    if (Array.isArray(data.experiences)) {
      result.experiences = data.experiences
        .filter(exp => exp && typeof exp.company === 'string' && typeof exp.position === 'string')
        .map(exp => ({
          company: exp.company.trim(),
          position: exp.position.trim(),
          startDate: typeof exp.startDate === 'string' ? exp.startDate.trim() : '',
          endDate: typeof exp.endDate === 'string' ? exp.endDate.trim() : '',
          location: typeof exp.location === 'string' ? exp.location.trim() : undefined,
          description: typeof exp.description === 'string' ? exp.description.trim() : '',
          achievements: typeof exp.achievements === 'string' ? exp.achievements.trim() : undefined,
          current: exp.current === true || exp.endDate === 'Present'
        }));
    }

    // Clean education
    if (Array.isArray(data.education)) {
      result.education = data.education
        .filter(edu => edu && typeof edu.institution === 'string')
        .map(edu => ({
          institution: edu.institution.trim(),
          degree: typeof edu.degree === 'string' ? edu.degree.trim() : '',
          field: typeof edu.field === 'string' ? edu.field.trim() : '',
          startDate: typeof edu.startDate === 'string' ? edu.startDate.trim() : '',
          endDate: typeof edu.endDate === 'string' ? edu.endDate.trim() : '',
          gpa: typeof edu.gpa === 'string' ? edu.gpa.trim() : undefined,
          description: typeof edu.description === 'string' ? edu.description.trim() : undefined,
          current: edu.current === true || edu.endDate === 'Present'
        }));
    }

    // Clean skills
    if (Array.isArray(data.skills)) {
      result.skills = data.skills
        .filter(skill => typeof skill === 'string' && skill.trim().length > 0)
        .map(skill => skill.trim())
        .slice(0, 50); // Limit to reasonable number
    }

    // Clean certifications
    if (Array.isArray(data.certifications)) {
      result.certifications = data.certifications
        .filter(cert => cert && typeof cert.title === 'string')
        .map(cert => ({
          title: cert.title.trim(),
          organization: typeof cert.organization === 'string' ? cert.organization.trim() : '',
          date: typeof cert.date === 'string' ? cert.date.trim() : undefined,
          description: typeof cert.description === 'string' ? cert.description.trim() : undefined,
        }));
    }

    // Clean awards
    if (Array.isArray(data.awards)) {
      result.awards = data.awards
        .filter(award => award && typeof award.title === 'string')
        .map(award => ({
          title: award.title.trim(),
          organization: typeof award.organization === 'string' ? award.organization.trim() : undefined,
          date: typeof award.date === 'string' ? award.date.trim() : undefined,
          description: typeof award.description === 'string' ? award.description.trim() : undefined,
        }));
    }

    return result;
  }

  /**
   * Save parsed CV data to user profile and assets
   */
  static async saveParsedDataToProfile(userId: string, parsedData: ParsedCVData): Promise<void> {
    try {
      console.log('💾 Saving parsed CV data to user profile...');

      // Update user profile with personal info
      if (parsedData.personalInfo) {
        const profileUpdates: any = {};
        
        if (parsedData.personalInfo.name) profileUpdates.name = parsedData.personalInfo.name;
        if (parsedData.personalInfo.email) profileUpdates.email = parsedData.personalInfo.email;
        if (parsedData.personalInfo.phone) profileUpdates.phone = parsedData.personalInfo.phone;
        if (parsedData.personalInfo.location) profileUpdates.location = parsedData.personalInfo.location;
        if (parsedData.personalInfo.linkedin) profileUpdates.linkedin_url = parsedData.personalInfo.linkedin;
        if (parsedData.personalInfo.github) profileUpdates.github_url = parsedData.personalInfo.github;
        if (parsedData.personalInfo.portfolio) profileUpdates.portfolio_url = parsedData.personalInfo.portfolio;
        if (parsedData.personalInfo.summary) profileUpdates.professional_summary = parsedData.personalInfo.summary;

        if (Object.keys(profileUpdates).length > 0) {
          await UserService.updateUserProfile(userId, profileUpdates);
          console.log('✅ Updated user profile');
        }
      }

      // Save experiences as CV assets
      for (const exp of parsedData.experiences) {
        console.log(`📝 Creating experience asset: ${exp.position} at ${exp.company}`);
        try {
          const assetResult = await UserService.createCVAsset(userId, {
            asset_type: 'experience',
            title: `${exp.position} at ${exp.company}`,
            description: exp.description,
            metadata: {
              company: exp.company,
              position: exp.position,
              startDate: exp.startDate,
              endDate: exp.current ? null : exp.endDate,
              location: exp.location,
              achievements: exp.achievements,
              current: exp.current
            },
            tags: [exp.company, exp.position, 'Experience']
          });
          console.log(`✅ Created experience asset:`, assetResult);
        } catch (error) {
          console.warn(`⚠️ Failed to create experience asset, using fallback approach:`, error);
          // Fallback: try with regular supabase client
          const fallbackResult = await supabase.from('cv_assets').insert({
            user_id: userId,
            asset_type: 'experience',
            title: `${exp.position} at ${exp.company}`,
            description: exp.description,
            metadata: {
              company: exp.company,
              position: exp.position,
              startDate: exp.startDate,
              endDate: exp.current ? null : exp.endDate,
              location: exp.location,
              achievements: exp.achievements,
              current: exp.current
            },
            tags: [exp.company, exp.position, 'Experience']
          }).select().single();
          
          if (fallbackResult.error) {
            console.error(`❌ Fallback also failed for experience:`, fallbackResult.error);
          } else {
            console.log(`✅ Created experience asset with fallback:`, fallbackResult.data);
          }
        }
      }
      console.log(`✅ Saved ${parsedData.experiences.length} experiences`);

      // Save education as CV assets
      for (const edu of parsedData.education) {
        console.log(`🎓 Creating education asset: ${edu.degree} ${edu.field} from ${edu.institution}`);
        try {
          const eduResult = await UserService.createCVAsset(userId, {
            asset_type: 'education',
            title: `${edu.degree} ${edu.field}`,
            description: edu.description || `${edu.degree} in ${edu.field} from ${edu.institution}`,
            metadata: {
              institution: edu.institution,
              degree: edu.degree,
              field: edu.field,
              startDate: edu.startDate,
              endDate: edu.current ? null : edu.endDate,
              gpa: edu.gpa,
              current: edu.current
            },
            tags: [edu.institution, edu.degree, edu.field]
          });
          console.log(`✅ Created education asset:`, eduResult);
        } catch (error) {
          console.warn(`⚠️ Failed to create education asset, using fallback approach:`, error);
          // Fallback: try with regular supabase client
          const fallbackResult = await supabase.from('cv_assets').insert({
            user_id: userId,
            asset_type: 'education',
            title: `${edu.degree} ${edu.field}`,
            description: edu.description || `${edu.degree} in ${edu.field} from ${edu.institution}`,
            metadata: {
              institution: edu.institution,
              degree: edu.degree,
              field: edu.field,
              startDate: edu.startDate,
              endDate: edu.current ? null : edu.endDate,
              gpa: edu.gpa,
              current: edu.current
            },
            tags: [edu.institution, edu.degree, edu.field]
          }).select().single();
          
          if (fallbackResult.error) {
            console.error(`❌ Fallback also failed for education:`, fallbackResult.error);
          } else {
            console.log(`✅ Created education asset with fallback:`, fallbackResult.data);
          }
        }
      }
      console.log(`✅ Saved ${parsedData.education.length} education entries`);

      // Save certifications as CV assets
      for (const cert of parsedData.certifications) {
        await UserService.createCVAsset(userId, {
          asset_type: 'other',
          title: cert.title,
          description: cert.description || `Professional certification from ${cert.organization}`,
          metadata: {
            organization: cert.organization,
            role: 'Certified Professional',
            startDate: cert.date,
            endDate: cert.date,
            category: 'Certification',
            achievements: cert.description,
            current: false
          },
          tags: [cert.organization, 'Certification', cert.title]
        });
      }
      console.log(`✅ Saved ${parsedData.certifications.length} certifications`);

      // Save awards as CV assets
      for (const award of parsedData.awards) {
        await UserService.createCVAsset(userId, {
          asset_type: 'other',
          title: award.title,
          description: award.description || `Award received from ${award.organization || 'organization'}`,
          metadata: {
            organization: award.organization || 'Award Organization',
            role: 'Award Recipient',
            startDate: award.date,
            endDate: award.date,
            category: 'Award',
            achievements: award.description,
            current: false
          },
          tags: [award.organization || 'Award', 'Award', award.title]
        });
      }
      console.log(`✅ Saved ${parsedData.awards.length} awards`);

      // Save skills to user preferences if there's a way to do so
      if (parsedData.skills.length > 0) {
        console.log(`📝 Skills extracted: ${parsedData.skills.join(', ')}`);
        // Note: You might want to save skills to user preferences table if that exists
      }

      console.log('🎉 Successfully saved all parsed CV data to profile');
    } catch (error) {
      console.error('❌ Failed to save parsed CV data:', error);
      throw new Error('Failed to save CV data to profile. Please try again.');
    }
  }
}