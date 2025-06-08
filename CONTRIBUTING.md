# Contributing to AutoApply

First off, thank you for considering contributing to AutoApply! 🎉

AutoApply is an open-source project that helps people automate their job applications using AI. We welcome contributions from developers of all skill levels.

## 🚀 Quick Start

1. **Fork the repository**
2. **Clone your fork**: `git clone https://github.com/yourusername/autoapply.git`
3. **Install dependencies**: `npm install`
4. **Set up environment**: `cp .env.example .env` (add your API keys)
5. **Start development**: `npm run dev`

## 🎯 How to Contribute

### 🐛 Bug Reports

Before creating a bug report, please check if the issue already exists. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Screenshots** if applicable
- **Environment details** (OS, Node.js version, browser)

### ✨ Feature Requests

We love new ideas! When suggesting a feature:

- **Use a clear title** describing the feature
- **Explain the problem** this feature would solve
- **Describe the solution** you'd like to see
- **Consider alternatives** you've thought about

### 🔧 Code Contributions

#### Areas We Need Help With

1. **🔍 Job Board Parsers**
   - Add support for new job sites
   - Improve existing parsers
   - Handle edge cases better

2. **🤖 AI Features**
   - Better job matching algorithms
   - Cover letter generation
   - Interview question answering

3. **🎨 UI/UX Improvements**
   - Mobile responsiveness
   - Accessibility features
   - Better user experience

4. **⚡ Performance**
   - Optimize crawling speed
   - Reduce API costs
   - Improve database queries

5. **📚 Documentation**
   - Improve setup guides
   - Add code examples
   - Create video tutorials

#### Development Process

1. **Create a branch**: `git checkout -b feature/amazing-feature`
2. **Make changes** following our coding standards
3. **Test your changes**: `npm run lint && npm run typecheck`
4. **Commit**: Use [conventional commits](https://www.conventionalcommits.org/)
5. **Push**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

#### Coding Standards

- **TypeScript**: Use strict mode, proper types
- **ESLint**: Follow the configured rules (`npm run lint`)
- **Comments**: Document complex logic
- **Tests**: Add tests for new features (when available)

#### Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add LinkedIn job import
fix: resolve database connection timeout
docs: update installation guide
style: fix code formatting
refactor: simplify job parser logic
test: add unit tests for CV generation
```

## 📁 Project Structure

```
autoapply/
├── src/
│   ├── components/         # React components
│   │   ├── dashboard/      # Main app views
│   │   └── ui/            # Reusable components
│   ├── services/          # Business logic
│   ├── hooks/             # Custom React hooks
│   └── lib/               # Utilities
├── job-crawler/           # Background job crawler
├── supabase/             # Database schema
├── scripts/              # Setup scripts
└── docs/                 # Documentation
```

## 🔧 Development Setup

### Prerequisites

- Node.js 18+
- Git
- OpenAI API key

### Environment Setup

1. **Clone the repo**: `git clone https://github.com/yourusername/autoapply.git`
2. **Install dependencies**: `npm install`
3. **Set up environment**:
   ```bash
   cp .env.example .env
   # Add your OpenAI API key and Supabase credentials
   ```
4. **Set up database**: `npm run db:setup`
5. **Start development**: `npm run dev`

### Running Tests

```bash
npm run lint          # ESLint
npm run typecheck     # TypeScript check
npm run test          # Unit tests (when available)
```

### Job Crawler Development

```bash
cd job-crawler
npm install
npm run dev           # Development mode
npm run test          # Test parsers
```

## 🎨 Adding New Job Board Parsers

To add support for a new job board:

1. **Create parser** in `job-crawler/src/crawler/parsers.ts`
2. **Add job source** to database
3. **Test thoroughly** with real data
4. **Update documentation**

Example parser structure:

```typescript
export class YourJobBoardParser extends BaseParser {
  async parse(): Promise<CrawlResult> {
    // Implement parsing logic
    // Return standardized job data
  }
}
```

## 🤖 AI Feature Development

When working on AI features:

- **Cost-conscious**: Monitor token usage
- **Error handling**: Handle API failures gracefully
- **Rate limiting**: Respect OpenAI limits
- **Configurability**: Allow users to adjust settings

## 📝 Documentation Guidelines

- **Clear and concise**: Write for beginners
- **Code examples**: Include working examples
- **Screenshots**: Add visuals where helpful
- **Keep updated**: Update docs with code changes

## 🚀 Pull Request Process

1. **Update documentation** if needed
2. **Add/update tests** for new features
3. **Ensure CI passes** (linting, type checking)
4. **Describe changes** clearly in PR description
5. **Link related issues**

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement

## Testing
- [ ] Tested locally
- [ ] Added/updated tests
- [ ] Manual testing steps

## Screenshots (if applicable)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
```

## 🔍 Code Review Guidelines

### For Contributors

- **Test your code** thoroughly
- **Write clear descriptions** of changes
- **Be responsive** to feedback
- **Keep PRs focused** on single features

### For Reviewers

- **Be constructive** and helpful
- **Explain reasoning** behind suggestions
- **Appreciate contributions** from all levels
- **Focus on code quality** and user experience

## 🌟 Recognition

Contributors will be:

- **Listed in CONTRIBUTORS.md**
- **Mentioned in release notes**
- **Credited in documentation**
- **Invited to maintainer discussions** (for regular contributors)

## 📞 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and ideas
- **Documentation**: Check the README and wiki first

## 🎊 First-Time Contributors

New to open source? We've got you covered!

- Look for issues labeled `good first issue`
- Start with documentation improvements
- Ask questions in discussions
- Don't be afraid to make mistakes

### Easy First Contributions

- Fix typos in documentation
- Add missing JSDoc comments
- Improve error messages
- Add new job board parsers
- Enhance UI components

## 📋 Issue Labels

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention is needed
- `documentation`: Improvements to docs
- `question`: Further information is requested

## 🔒 Security

Found a security vulnerability? Please email us privately instead of opening a public issue.

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for making AutoApply better! 🚀

*Every contribution, no matter how small, makes a difference.*