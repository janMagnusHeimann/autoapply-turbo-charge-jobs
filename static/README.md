# Static Assets Directory

This directory contains static assets and resources for the AutoApply project.

## Structure

```
static/
├── images/          # Images and icons
├── templates/       # Document templates (CV, cover letters)
├── schemas/         # JSON schemas for validation
├── configs/         # Configuration files
└── docs/           # Static documentation assets
```

## Usage

- **Images**: Logo files, icons, and UI assets
- **Templates**: PDF/HTML templates for CV and cover letter generation
- **Schemas**: JSON schemas for data validation
- **Configs**: Default configuration files for agents and tools
- **Docs**: Assets for documentation (diagrams, screenshots)

## Guidelines

1. Keep file sizes optimized
2. Use descriptive naming conventions
3. Organize by category/type
4. Include proper attribution for external assets
5. Compress images appropriately for web use

## Examples

### CV Templates
- `templates/cv_modern.html` - Modern CV template
- `templates/cv_classic.html` - Classic CV template
- `templates/cover_letter.html` - Cover letter template

### Configuration Files
- `configs/agent_defaults.json` - Default agent configurations
- `configs/tool_registry.json` - Tool registry definitions
- `schemas/job_listing.json` - Job listing validation schema