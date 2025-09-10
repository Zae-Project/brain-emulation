# Repository Administration Guide

This guide is for repository administrators to enable the governance features that support our collaboration workflow.

## 🗣️ Enabling GitHub Discussions

GitHub Discussions provides a space for community conversations, research discussions, and Q&A that doesn't require formal issue tracking.

### To Enable Discussions:

1. Go to your repository on GitHub.com
2. Click the **Settings** tab
3. Scroll down to the **Features** section
4. Check the box next to **Discussions**
5. Click **Set up discussions**

### Discussion Categories

We recommend setting up these categories:

- **💡 Ideas** - For brainstorming new features and concepts
- **❓ Q&A** - For questions and help requests  
- **🔬 Research** - For discussing neuroscience papers and concepts
- **🗣️ General** - For open-ended discussions
- **📢 Announcements** - For project updates (admin-only posting)

### Discussion Templates

This repository includes discussion templates in `.github/DISCUSSION_TEMPLATE/` that will automatically be available once discussions are enabled.

## 🛡️ Setting Up Branch Protection

Branch protection prevents direct pushes to important branches and enforces quality controls.

### To Enable Branch Protection for Main:

1. Go to your repository on GitHub.com
2. Click the **Settings** tab
3. Click **Branches** in the left sidebar
4. Click **Add rule**
5. For **Branch name pattern**, enter: `main`

### Recommended Protection Settings:

#### ✅ Basic Protection:
- [x] **Restrict pushes that create files larger than 100 MB**
- [x] **Require a pull request before merging**
  - [x] Require approvals: **1** (minimum)
  - [x] Dismiss stale reviews when new commits are pushed
  - [x] Require review from code owners (if you have CODEOWNERS file)

#### ✅ Additional Protections:
- [x] **Require status checks to pass before merging**
  - Add any CI/CD checks you want to require
- [x] **Require branches to be up to date before merging**
- [x] **Require conversation resolution before merging**

#### 🔒 Advanced Protection:
- [x] **Restrict pushes that create files larger than 100 MB**
- [x] **Include administrators** (applies rules to admins too)
- [ ] **Allow force pushes** (generally leave unchecked)
- [ ] **Allow deletions** (generally leave unchecked)

### Bypass Options:

You can allow certain users or roles to bypass these restrictions if needed, but for most projects it's better to apply the rules consistently.

## 🔧 Additional Repository Settings

### Issue Templates
The repository includes issue templates in `.github/ISSUE_TEMPLATE/` that will automatically be available.

### Pull Request Template
The `.github/pull_request_template.md` file will automatically populate the description when creating new pull requests.

### Workflow Files
The `.github/workflows/` directory contains GitHub Actions that:
- Provide information about branch protection on new PRs
- Can be extended for CI/CD as the project grows

## 📊 Monitoring and Maintenance

### Regular Tasks:
- Review and close stale issues/PRs
- Monitor discussions for questions that need answers
- Update protection rules as the project evolves
- Review and update templates based on community feedback

### Analytics:
- Use GitHub's Insights tab to monitor:
  - Community engagement
  - Contributor activity
  - Traffic and clones
  - Popular content

## 🚨 Troubleshooting

### Common Issues:

**"I can't push to main"**
- This is expected! Users should create feature branches and submit PRs.
- Point them to the contributing guidelines.

**"Discussions not showing up"**
- Make sure discussions are enabled in repository settings.
- Check that the user has appropriate permissions.

**"PR template not appearing"**
- Ensure the file is at `.github/pull_request_template.md`
- Check file permissions and commit status.

### Emergency Access:
If you need to bypass protection rules temporarily:
1. Go to Settings > Branches
2. Edit the branch protection rule
3. Temporarily disable the restrictions
4. **Remember to re-enable them after the emergency**

## 📈 Future Enhancements

As the project grows, consider:

- **CODEOWNERS file** - Automatically request reviews from relevant experts
- **Status checks** - Add CI/CD pipelines for automated testing
- **Security scanning** - Enable Dependabot and CodeQL
- **Community health files** - Add CODE_OF_CONDUCT.md, SECURITY.md
- **Project boards** - Organize issues and PRs with GitHub Projects

---

This governance structure balances open collaboration with quality control, ensuring the brain_emulation project remains welcoming while maintaining high standards.