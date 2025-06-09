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

// Template Components

const HeaderSection: React.FC<{ cvData: CVData; template: CVTemplate }> = ({ cvData, template }) => {
  const styles = getStylesForTemplate(template.type);
  const { profile } = cvData;

  if (template.type === 'creative') {
    return (
      <View style={creativeStyles.creativeHeader}>
        <Text style={[creativeStyles.name, { color: 'white' }]}>{profile.name}</Text>
        <Text style={[creativeStyles.title, { color: 'white' }]}>{profile.title}</Text>
        <View style={baseStyles.contactInfo}>
          <Text style={{ color: 'white' }}>{profile.email}</Text>
          {profile.phone && <Text style={{ color: 'white' }}>{profile.phone}</Text>}
          <Text style={{ color: 'white' }}>{profile.location}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.header}>
      <Text style={styles.name}>{profile.name}</Text>
      <Text style={styles.title}>{profile.title}</Text>
      <View style={styles.contactInfo}>
        <Text>{profile.email}</Text>
        {profile.phone && <Text>{profile.phone}</Text>}
        <Text>{profile.location}</Text>
      </View>
      {profile.linkedinUrl && (
        <Link src={profile.linkedinUrl} style={{ fontSize: 9, color: '#0066cc' }}>
          LinkedIn: {profile.linkedinUrl}
        </Link>
      )}
      {profile.githubUrl && (
        <Link src={profile.githubUrl} style={{ fontSize: 9, color: '#0066cc' }}>
          GitHub: {profile.githubUrl}
        </Link>
      )}
    </View>
  );
};

const SummarySection: React.FC<{ cvData: CVData; template: CVTemplate }> = ({ cvData, template }) => {
  const styles = getStylesForTemplate(template.type);

  return (
    <View>
      <Text style={styles.sectionTitle}>Professional Summary</Text>
      <Text style={{ fontSize: 10, lineHeight: 1.5, marginBottom: 10 }}>
        {cvData.customSummary}
      </Text>
    </View>
  );
};

const ExperienceSection: React.FC<{ cvData: CVData; template: CVTemplate }> = ({ cvData, template }) => {
  const styles = getStylesForTemplate(template.type);

  return (
    <View>
      <Text style={styles.sectionTitle}>Work Experience</Text>
      {cvData.experiences.slice(0, 4).map((exp, index) => (
        <View key={index} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.itemTitle}>{exp.position}</Text>
            <Text style={styles.itemDate}>
              {exp.startDate} - {exp.endDate || 'Present'}
            </Text>
          </View>
          <Text style={styles.itemSubtitle}>
            {exp.company} {exp.location && `• ${exp.location}`}
          </Text>
          {exp.achievements.slice(0, 4).map((achievement, achIndex) => (
            <Text key={achIndex} style={styles.bullet}>
              • {achievement}
            </Text>
          ))}
          {exp.technologies.length > 0 && (
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

  return (
    <View>
      <Text style={styles.sectionTitle}>Publications</Text>
      {cvData.selectedPublications.map((pub, index) => (
        <View key={index} style={{ marginBottom: 8 }}>
          <Text style={academicStyles.publicationTitle}>
            {pub.title}
          </Text>
          <Text style={academicStyles.publicationVenue}>
            {pub.authors.join(', ')} • {pub.venue} • {pub.year}
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