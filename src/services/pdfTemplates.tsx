import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Link } from '@react-pdf/renderer';
import type { CVData, CVTemplate, PDFSection } from '@/types/cv';

// Register fonts (you can add custom fonts here)
// Font.register({
//   family: 'Inter',
//   src: '/fonts/Inter-Regular.ttf'
// });

/**
 * PDF Template System for Dynamic CV Generation
 */

// Base styles shared across templates
const baseStyles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.4,
    padding: 40,
    backgroundColor: '#ffffff'
  },
  header: {
    marginBottom: 20
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5
  },
  title: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 10
  },
  contactInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    fontSize: 9
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    paddingBottom: 2
  },
  itemTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2
  },
  itemSubtitle: {
    fontSize: 9,
    color: '#666666',
    marginBottom: 3
  },
  itemDate: {
    fontSize: 9,
    color: '#666666',
    fontStyle: 'italic'
  },
  bullet: {
    fontSize: 9,
    marginLeft: 10,
    marginBottom: 2
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  skill: {
    fontSize: 9,
    marginRight: 8,
    marginBottom: 3,
    padding: 2,
    backgroundColor: '#f0f0f0',
    borderRadius: 2
  },
  highlightedSkill: {
    fontSize: 9,
    marginRight: 8,
    marginBottom: 3,
    padding: 2,
    backgroundColor: '#e3f2fd',
    borderRadius: 2,
    fontWeight: 'bold'
  }
});

// Technical template styles
const technicalStyles = StyleSheet.create({
  ...baseStyles,
  sectionTitle: {
    ...baseStyles.sectionTitle,
    color: '#2196f3',
    borderBottomColor: '#2196f3'
  },
  name: {
    ...baseStyles.name,
    color: '#1976d2'
  },
  projectTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2196f3',
    marginBottom: 2
  },
  techStack: {
    fontSize: 8,
    color: '#666666',
    fontStyle: 'italic',
    marginBottom: 3
  }
});

// Academic template styles
const academicStyles = StyleSheet.create({
  ...baseStyles,
  sectionTitle: {
    ...baseStyles.sectionTitle,
    color: '#4caf50',
    borderBottomColor: '#4caf50'
  },
  name: {
    ...baseStyles.name,
    color: '#388e3c'
  },
  publicationTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2
  },
  publicationVenue: {
    fontSize: 9,
    fontStyle: 'italic',
    color: '#666666',
    marginBottom: 2
  },
  citationCount: {
    fontSize: 8,
    color: '#4caf50',
    fontWeight: 'bold'
  }
});

// Creative template styles
const creativeStyles = StyleSheet.create({
  ...baseStyles,
  page: {
    ...baseStyles.page,
    backgroundColor: '#fafafa'
  },
  sectionTitle: {
    ...baseStyles.sectionTitle,
    color: '#ff5722',
    borderBottomColor: '#ff5722',
    fontSize: 13
  },
  name: {
    ...baseStyles.name,
    color: '#ff5722',
    fontSize: 26
  },
  creativeHeader: {
    backgroundColor: '#ff5722',
    color: 'white',
    padding: 15,
    marginBottom: 20,
    borderRadius: 5
  }
});

// Premium LaTeX-style template styles (matching your CV exactly)
const premiumStyles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10.2,
    lineHeight: 1.16, // Matches your reduced baselineskip
    paddingTop: 28, // 1.4cm converted to points
    paddingBottom: 28,
    paddingLeft: 28,
    paddingRight: 28,
    backgroundColor: '#ffffff'
  },
  header: {
    textAlign: 'center',
    marginBottom: 8 // 0.1em equivalent
  },
  name: {
    fontSize: 14, // Large in LaTeX, scaled down for PDF
    fontWeight: 'bold',
    marginBottom: 2 // 0.05em equivalent
  },
  contactLine: {
    fontSize: 10.2,
    marginBottom: 2,
    textAlign: 'center'
  },
  summary: {
    fontSize: 10.2,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 4,
    lineHeight: 1.2,
    textAlign: 'justify'
  },
  sectionTitle: {
    fontSize: 12, // Large equivalent
    fontWeight: 'bold',
    marginTop: 8, // 0.15em equivalent
    marginBottom: 2, // 0.05em equivalent
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 0
  },
  skillsContainer: {
    marginBottom: 8
  },
  skillCategory: {
    flexDirection: 'row',
    marginBottom: 2,
    fontSize: 10.2
  },
  skillCategoryName: {
    fontWeight: 'bold',
    minWidth: 80
  },
  skillsList: {
    flex: 1,
    flexWrap: 'wrap'
  },
  experienceItem: {
    marginBottom: 4 // 0.05em vspace equivalent
  },
  jobTitle: {
    fontSize: 10.2,
    fontWeight: 'bold',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1
  },
  companyName: {
    fontSize: 10.2,
    fontStyle: 'italic',
    marginBottom: 2
  },
  bulletPoint: {
    fontSize: 10.2,
    marginLeft: 12,
    marginBottom: 1, // 0.05pt itemsep
    flexDirection: 'row'
  },
  bulletSymbol: {
    width: 8,
    fontSize: 10.2
  },
  bulletText: {
    flex: 1,
    fontSize: 10.2,
    lineHeight: 1.16
  },
  projectItem: {
    marginBottom: 2,
    flexDirection: 'row'
  },
  projectBullet: {
    width: 8,
    fontSize: 10.2
  },
  projectContent: {
    flex: 1
  },
  projectTitle: {
    fontWeight: 'bold',
    fontSize: 10.2
  },
  projectDescription: {
    fontSize: 10.2
  },
  projectUrl: {
    fontSize: 10.2,
    fontStyle: 'italic'
  },
  publicationItem: {
    marginBottom: 2,
    flexDirection: 'row'
  },
  publicationBullet: {
    width: 8,
    fontSize: 10.2
  },
  publicationContent: {
    flex: 1,
    fontSize: 10.2
  },
  publicationTitle: {
    fontWeight: 'normal' // Not bold in your LaTeX
  }
});

// Template Components

const HeaderSection: React.FC<{ cvData: CVData; template: CVTemplate }> = ({ cvData, template }) => {
  const styles = getStylesForTemplate(template.type);
  const { profile } = cvData;

  // Helper function to extract clean social media handles/urls
  const getSocialLinks = () => {
    const links = [];
    
    if (profile.linkedinUrl) {
      const handle = profile.linkedinUrl.includes('linkedin.com') 
        ? profile.linkedinUrl.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//, '').replace(/\/$/, '')
        : profile.linkedinUrl;
      links.push(`linkedin.com/in/${handle}`);
    }
    
    if (profile.githubUrl) {
      const handle = profile.githubUrl.includes('github.com')
        ? profile.githubUrl.replace(/https?:\/\/(www\.)?github\.com\//, '').replace(/\/$/, '')
        : profile.githubUrl;
      links.push(`github.com/${handle}`);
    }
    
    if (profile.portfolioUrl) {
      const cleanUrl = profile.portfolioUrl.replace(/https?:\/\//, '').replace(/\/$/, '');
      links.push(cleanUrl);
    }
    
    if (profile.twitterUrl) {
      const handle = profile.twitterUrl.includes('twitter.com') || profile.twitterUrl.includes('x.com')
        ? profile.twitterUrl.replace(/https?:\/\/(www\.)?(twitter|x)\.com\//, '').replace(/\/$/, '')
        : profile.twitterUrl;
      links.push(`x.com/${handle}`);
    }
    
    if (profile.mediumUrl) {
      const handle = profile.mediumUrl.includes('medium.com')
        ? profile.mediumUrl.replace(/https?:\/\/(www\.)?medium\.com\/@?/, '').replace(/\/$/, '')
        : profile.mediumUrl;
      links.push(`medium.com/@${handle}`);
    }
    
    return links;
  };

  if (template.type === 'premium') {
    // LaTeX-style centered header
    let websiteUrl = 'www.portfolio.com';
    if (profile.portfolioUrl && profile.portfolioUrl.trim()) {
      websiteUrl = profile.portfolioUrl.replace(/https?:\/\//, '').replace(/\/$/, '').trim();
      if (!websiteUrl) websiteUrl = 'www.portfolio.com';
    }
    
    const socialLinks = getSocialLinks();
    const email = (profile.email && profile.email.trim()) ? profile.email : 'contact@example.com';
    const contactLine = [email, ...socialLinks.slice(0, 2)].filter(item => item && item.trim()).join(' | ') || email;
    const additionalLinks = socialLinks.slice(2).filter(item => item && item.trim()).join(' | ');

    return (
      <View style={premiumStyles.header}>
        <Text style={premiumStyles.name}>{profile.name || 'Professional User'}</Text>
        <Text style={premiumStyles.contactLine}>{websiteUrl}</Text>
        <Text style={premiumStyles.contactLine}>{contactLine}</Text>
        {additionalLinks && (
          <Text style={premiumStyles.contactLine}>{additionalLinks}</Text>
        )}
      </View>
    );
  }

  if (template.type === 'creative') {
    const socialLinks = getSocialLinks();
    
    return (
      <View style={creativeStyles.creativeHeader}>
        <Text style={[creativeStyles.name, { color: 'white' }]}>{profile.name || 'Professional User'}</Text>
        <Text style={[creativeStyles.title, { color: 'white' }]}>{profile.title || 'Professional'}</Text>
        <View style={baseStyles.contactInfo}>
          <Text style={{ color: 'white' }}>{profile.email || 'contact@example.com'}</Text>
          {profile.phone && profile.phone.trim() && <Text style={{ color: 'white' }}>{profile.phone}</Text>}
          <Text style={{ color: 'white' }}>{profile.location || 'Location'}</Text>
        </View>
        {socialLinks.length > 0 && (
          <View style={{ marginTop: 5 }}>
            {socialLinks.slice(0, 3).map((link, index) => (
              <Text key={index} style={{ color: 'white', fontSize: 8 }}>{link}</Text>
            ))}
          </View>
        )}
      </View>
    );
  }

  // Default template with social links
  const socialLinks = getSocialLinks();
  
  return (
    <View style={styles.header}>
      <Text style={styles.name}>{profile.name || 'Professional User'}</Text>
      <Text style={styles.title}>{profile.title || 'Professional'}</Text>
      <View style={styles.contactInfo}>
        <Text>{profile.email || 'contact@example.com'}</Text>
        {profile.phone && profile.phone.trim() && <Text>{profile.phone}</Text>}
        <Text>{profile.location || 'Location'}</Text>
      </View>
      {socialLinks.length > 0 && (
        <View style={{ marginTop: 5, flexDirection: 'row', flexWrap: 'wrap' }}>
          {socialLinks.map((link, index) => (
            <Text key={index} style={{ fontSize: 8, color: '#0066cc', marginRight: 10, marginBottom: 2 }}>
              {link}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

const SummarySection: React.FC<{ cvData: CVData; template: CVTemplate }> = ({ cvData, template }) => {
  const styles = getStylesForTemplate(template.type);

  if (template.type === 'premium') {
    // LaTeX-style italic summary without title
    return (
      <View>
        <Text style={premiumStyles.summary}>
          {cvData.customSummary}
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>Professional Summary</Text>
      <Text style={{ fontSize: 10, lineHeight: 1.5, marginBottom: 10 }}>
        {cvData.customSummary || cvData.profile.professionalSummary || 'Experienced professional with expertise in modern technologies.'}
      </Text>
    </View>
  );
};

const ExperienceSection: React.FC<{ cvData: CVData; template: CVTemplate }> = ({ cvData, template }) => {
  const styles = getStylesForTemplate(template.type);

  if (template.type === 'premium') {
    return (
      <View>
        <Text style={premiumStyles.sectionTitle}>Professional Experience</Text>
        {cvData.experiences.slice(0, 6).map((exp, index) => (
          <View key={index} style={premiumStyles.experienceItem}>
            {/* Job Title and Date */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={{ fontSize: 10.2, fontWeight: 'bold' }}>
                {(exp.position || 'Position').trim()}, {(exp.company || '').includes('Part-Time') ? 'Part-Time' : (exp.company || '').includes('Intern') ? 'Intern' : 'Full-Time'}
              </Text>
              <Text style={{ fontSize: 10.2 }}>
                {exp.startDate || 'Start'} - {exp.endDate || 'Present'}
              </Text>
            </View>
            
            {/* Company Name */}
            <Text style={premiumStyles.companyName}>
              {((exp.company || 'Company').replace(', Part-Time', '').replace(', Intern', '').replace(', Full-Time', '').trim()) || 'Company'}
            </Text>
            
            {/* Achievements */}
            {(exp.achievements || []).slice(0, 4).map((achievement, achIndex) => (
              <View key={achIndex} style={premiumStyles.bulletPoint}>
                <Text style={premiumStyles.bulletSymbol}>•</Text>
                <Text style={premiumStyles.bulletText}>{(achievement || 'Achievement').trim() || 'Achievement'}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>Work Experience</Text>
      {cvData.experiences.slice(0, 4).map((exp, index) => (
        <View key={index} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.itemTitle}>{exp.position || 'Position'}</Text>
            <Text style={styles.itemDate}>
              {exp.startDate || 'Start'} - {exp.endDate || 'Present'}
            </Text>
          </View>
          <Text style={styles.itemSubtitle}>
            {exp.company || 'Company'} {exp.location && `• ${exp.location}`}
          </Text>
          {(exp.achievements || []).slice(0, 4).map((achievement, achIndex) => (
            <Text key={achIndex} style={styles.bullet}>
              • {achievement || 'Achievement'}
            </Text>
          ))}
          {(exp.technologies || []).length > 0 && (
            <Text style={{ fontSize: 8, color: '#666', marginTop: 3, fontStyle: 'italic' }}>
              Technologies: {exp.technologies.join(', ')}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
};

const ProjectsSection: React.FC<{ cvData: CVData; template: CVTemplate }> = ({ cvData, template }) => {
  const styles = getStylesForTemplate(template.type);

  if (cvData.selectedProjects.length === 0) return null;

  if (template.type === 'premium') {
    return (
      <View>
        <Text style={premiumStyles.sectionTitle}>Selected Projects</Text>
        {cvData.selectedProjects.map((project, index) => (
          <View key={index} style={premiumStyles.projectItem}>
            <Text style={premiumStyles.projectBullet}>•</Text>
            <View style={premiumStyles.projectContent}>
              <Text style={premiumStyles.projectTitle}>
                {project.name}:
              </Text>
              <Text style={premiumStyles.projectDescription}>
                {' '}{project.description}
                {project.impactStatement && '; ' + project.impactStatement}
                {project.url && (
                  <Text style={premiumStyles.projectUrl}>
                    {' '}({project.url.replace('https://', '').replace('http://', '')})
                  </Text>
                )}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>Key Projects</Text>
      {cvData.selectedProjects.map((project, index) => (
        <View key={index} style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={template.type === 'technical' ? technicalStyles.projectTitle : styles.itemTitle}>
              {project.name}
            </Text>
            {project.stars > 0 && (
              <Text style={{ fontSize: 8, color: '#666' }}>
                ⭐ {project.stars}
              </Text>
            )}
          </View>
          {template.type === 'technical' && (
            <Text style={technicalStyles.techStack}>
              {project.technologies.join(' • ')}
            </Text>
          )}
          <Text style={{ fontSize: 9, lineHeight: 1.4, marginBottom: 3 }}>
            {project.description}
          </Text>
          {project.impactStatement && (
            <Text style={styles.bullet}>
              • {project.impactStatement}
            </Text>
          )}
          {project.url && (
            <Link src={project.url} style={{ fontSize: 8, color: '#0066cc' }}>
              {project.url}
            </Link>
          )}
        </View>
      ))}
    </View>
  );
};

const PublicationsSection: React.FC<{ cvData: CVData; template: CVTemplate }> = ({ cvData, template }) => {
  const styles = getStylesForTemplate(template.type);

  if (cvData.selectedPublications.length === 0) return null;

  if (template.type === 'premium') {
    return (
      <View>
        <Text style={premiumStyles.sectionTitle}>Publications</Text>
        {cvData.selectedPublications.map((pub, index) => (
          <View key={index} style={premiumStyles.publicationItem}>
            <Text style={premiumStyles.publicationBullet}>•</Text>
            <View style={premiumStyles.publicationContent}>
              <Text style={premiumStyles.publicationTitle}>
                "{pub.title || 'Publication Title'}", <Text style={{ fontStyle: 'italic' }}>{pub.venue || 'Venue'}-{pub.year || new Date().getFullYear()}</Text>: {pub.abstract || 'Research contribution and impact.'} 
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>Publications</Text>
      {cvData.selectedPublications.map((pub, index) => (
        <View key={index} style={{ marginBottom: 8 }}>
          <Text style={academicStyles.publicationTitle}>
            {pub.title || 'Publication Title'}
          </Text>
          <Text style={academicStyles.publicationVenue}>
            {(pub.authors || []).join(', ')} • {pub.venue || 'Venue'} • {pub.year || new Date().getFullYear()}
          </Text>
          {pub.citationCount && (
            <Text style={academicStyles.citationCount}>
              Cited {pub.citationCount} times
            </Text>
          )}
          {pub.url && (
            <Link src={pub.url} style={{ fontSize: 8, color: '#0066cc' }}>
              {pub.url}
            </Link>
          )}
        </View>
      ))}
    </View>
  );
};

const EducationSection: React.FC<{ cvData: CVData; template: CVTemplate }> = ({ cvData, template }) => {
  const styles = getStylesForTemplate(template.type);

  if (cvData.education.length === 0) {
    return null;
  }

  if (template.type === 'premium') {
    return (
      <View>
        <Text style={premiumStyles.sectionTitle}>Education</Text>
        {cvData.education.slice(0, 3).map((edu, index) => (
          <View key={index} style={premiumStyles.experienceItem}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={{ fontSize: 10.2, fontWeight: 'bold' }}>
                {edu.degree || 'Degree'} in {edu.field || 'Field'}
              </Text>
              <Text style={{ fontSize: 10.2 }}>
                {edu.startDate || 'Start'} - {edu.endDate || 'Present'}
              </Text>
            </View>
            <Text style={premiumStyles.companyName}>
              {edu.institution || 'Institution'}{edu.location ? `, ${edu.location}` : ''}
            </Text>
            {edu.gpa && (
              <Text style={{ fontSize: 10.2, fontStyle: 'italic' }}>GPA: {edu.gpa}</Text>
            )}
            {(edu.honors || []).length > 0 && (
              <View style={premiumStyles.bulletPoint}>
                <Text style={premiumStyles.bulletSymbol}>•</Text>
                <Text style={premiumStyles.bulletText}>Honors: {(edu.honors || []).join(', ')}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>Education</Text>
      {cvData.education.slice(0, 3).map((edu, index) => (
        <View key={index} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.itemTitle}>{edu.degree || 'Degree'} in {edu.field || 'Field'}</Text>
            <Text style={styles.itemDate}>
              {edu.startDate || 'Start'} - {edu.endDate || 'Present'}
            </Text>
          </View>
          <Text style={styles.itemSubtitle}>
            {edu.institution || 'Institution'}{edu.location ? ` • ${edu.location}` : ''}
          </Text>
          {edu.gpa && (
            <Text style={{ fontSize: 9, fontStyle: 'italic', marginBottom: 2 }}>GPA: {edu.gpa}</Text>
          )}
          {(edu.honors || []).length > 0 && (
            <Text style={styles.bullet}>
              • Honors: {(edu.honors || []).join(', ')}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
};

const SkillsSection: React.FC<{ cvData: CVData; template: CVTemplate }> = ({ cvData, template }) => {
  const styles = getStylesForTemplate(template.type);
  const { skills } = cvData;

  // Group skills by category
  const skillsByCategory = skills.all.reduce((acc, skill) => {
    if (!acc[skill.category]) {
      acc[skill.category] = [];
    }
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<string, typeof skills.all>);

  if (template.type === 'premium') {
    // LaTeX-style skills with category labels and inline lists
    return (
      <View>
        <Text style={premiumStyles.sectionTitle}>Technical Skills</Text>
        <View style={premiumStyles.skillsContainer}>
          {Object.entries(skillsByCategory).map(([category, categorySkills], index) => (
            <View key={category} style={premiumStyles.skillCategory}>
              <Text style={premiumStyles.skillCategoryName}>
                {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}:
              </Text>
              <Text style={premiumStyles.skillsList}>
                {categorySkills
                  .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
                  .map(skill => skill.name)
                  .join(', ')}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>Technical Skills</Text>
      {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
        <View key={category} style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 3, textTransform: 'capitalize' }}>
            {category.replace('_', ' ')}:
          </Text>
          <View style={styles.skillsContainer}>
            {categorySkills
              .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
              .map((skill, index) => (
                <Text 
                  key={index} 
                  style={skill.isHighlighted ? styles.highlightedSkill : styles.skill}
                >
                  {skill.name}
                  {skill.proficiencyLevel === 'expert' && ' ★'}
                </Text>
              ))
            }
          </View>
        </View>
      ))}
    </View>
  );
};

// Helper function to get styles for template type
const getStylesForTemplate = (templateType: CVTemplate['type']) => {
  switch (templateType) {
    case 'premium':
      return premiumStyles;
    case 'technical':
      return technicalStyles;
    case 'academic':
      return academicStyles;
    case 'creative':
      return creativeStyles;
    default:
      return baseStyles;
  }
};

// Main CV Document Component
export const CVDocument: React.FC<{ cvData: CVData; template: CVTemplate }> = ({ cvData, template }) => {
  const styles = getStylesForTemplate(template.type);

  // Define section order based on template
  const getSectionOrder = (): React.ReactNode[] => {
    const sections: React.ReactNode[] = [
      <HeaderSection key="header" cvData={cvData} template={template} />,
      <SummarySection key="summary" cvData={cvData} template={template} />
    ];

    if (template.sections.projectsFirst && cvData.selectedProjects.length > 0) {
      sections.push(<ProjectsSection key="projects" cvData={cvData} template={template} />);
      sections.push(<ExperienceSection key="experience" cvData={cvData} template={template} />);
    } else {
      sections.push(<ExperienceSection key="experience" cvData={cvData} template={template} />);
      if (template.sections.showProjects && cvData.selectedProjects.length > 0) {
        sections.push(<ProjectsSection key="projects" cvData={cvData} template={template} />);
      }
    }

    if (template.sections.showPublications && cvData.selectedPublications.length > 0) {
      sections.push(<PublicationsSection key="publications" cvData={cvData} template={template} />);
    }

    if (cvData.education.length > 0) {
      sections.push(<EducationSection key="education" cvData={cvData} template={template} />);
    }

    sections.push(<SkillsSection key="skills" cvData={cvData} template={template} />);

    return sections;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {getSectionOrder()}
      </Page>
    </Document>
  );
};

// Template definitions
export const CV_TEMPLATES: CVTemplate[] = [
  {
    id: 'premium',
    name: 'Premium LaTeX',
    type: 'premium',
    description: 'Professional LaTeX-inspired design with precise typography and minimal spacing',
    maxPages: 1,
    sections: {
      showProjects: true,
      showPublications: true,
      projectsFirst: false,
      maxProjects: 3,
      maxPublications: 1
    },
    styling: {
      primaryColor: '#000000',
      accentColor: '#000000',
      fontSize: 10.2,
      fontFamily: 'Helvetica',
      headerStyle: 'centered'
    }
  },
  {
    id: 'technical',
    name: 'Technical',
    type: 'technical',
    description: 'Clean, modern design optimized for software engineering roles',
    maxPages: 2,
    sections: {
      showProjects: true,
      showPublications: false,
      projectsFirst: true,
      maxProjects: 4,
      maxPublications: 0
    },
    styling: {
      primaryColor: '#2196f3',
      accentColor: '#1976d2',
      fontSize: 10,
      fontFamily: 'Helvetica',
      headerStyle: 'modern'
    }
  },
  {
    id: 'academic',
    name: 'Academic',
    type: 'academic',
    description: 'Research-focused template with emphasis on publications',
    maxPages: 2,
    sections: {
      showProjects: true,
      showPublications: true,
      projectsFirst: false,
      maxProjects: 2,
      maxPublications: 5
    },
    styling: {
      primaryColor: '#4caf50',
      accentColor: '#388e3c',
      fontSize: 10,
      fontFamily: 'Helvetica',
      headerStyle: 'classic'
    }
  },
  {
    id: 'creative',
    name: 'Creative',
    type: 'creative',
    description: 'Bold, eye-catching design for creative and design roles',
    maxPages: 1,
    sections: {
      showProjects: true,
      showPublications: false,
      projectsFirst: true,
      maxProjects: 3,
      maxPublications: 0
    },
    styling: {
      primaryColor: '#ff5722',
      accentColor: '#d84315',
      fontSize: 10,
      fontFamily: 'Helvetica',
      headerStyle: 'creative'
    }
  },
  {
    id: 'compact',
    name: 'Compact',
    type: 'compact',
    description: 'Space-efficient design for experienced professionals',
    maxPages: 1,
    sections: {
      showProjects: true,
      showPublications: false,
      projectsFirst: false,
      maxProjects: 2,
      maxPublications: 0
    },
    styling: {
      primaryColor: '#9c27b0',
      accentColor: '#7b1fa2',
      fontSize: 9,
      fontFamily: 'Helvetica',
      headerStyle: 'minimal'
    }
  },
  {
    id: 'executive',
    name: 'Executive',
    type: 'executive',
    description: 'Professional template for senior leadership roles',
    maxPages: 2,
    sections: {
      showProjects: false,
      showPublications: false,
      projectsFirst: false,
      maxProjects: 0,
      maxPublications: 0
    },
    styling: {
      primaryColor: '#37474f',
      accentColor: '#263238',
      fontSize: 11,
      fontFamily: 'Helvetica',
      headerStyle: 'classic'
    }
  }
];