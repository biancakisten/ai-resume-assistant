# User Stories

## Epic 1 - User Authentication

### User Story 1.1

**As a** new user

**I want to** create an account

**So that** I can securely save my resumes and analyses.

#### Acceptance Criteria

- User can register with email and password.
- User receives confirmation of successful registration.
- Duplicate email addresses are not allowed.

---

### User Story 1.2

**As a** registered user

**I want to** log into my account

**So that** I can access my saved information.

#### Acceptance Criteria

- User enters email and password.
- Invalid credentials display an error.
- Successful login redirects to the dashboard.

---

### User Story 1.3

**As a** logged-in user

**I want to** log out

**So that** my account remains secure.

#### Acceptance Criteria

- Logout button is visible.
- User session ends.
- User is redirected to the login page.

---

# Epic 2 - Resume Management

### User Story 2.1

**As a** user

**I want to** upload my resume

**So that** AI can analyze it.

#### Acceptance Criteria

- User can upload PDF or DOCX files.
- Invalid file types are rejected.
- Upload progress is displayed.
- Upload succeeds or displays an error.

---

### User Story 2.2

**As a** user

**I want to** replace my resume

**So that** I always analyze the latest version.

#### Acceptance Criteria

- Existing resume can be replaced.
- Old resume is removed.
- New resume becomes the active resume.

---

### User Story 2.3

**As a** user

**I want to** delete my resume

**So that** I can remove outdated information.

#### Acceptance Criteria

- Confirmation dialog is shown.
- Resume is permanently deleted.

---

# Epic 3 - Job Description

### User Story 3.1

**As a** user

**I want to** paste a job description

**So that** AI can compare it to my resume.

#### Acceptance Criteria

- Large text input is available.
- User can edit before submitting.
- Job description is saved.

---

### User Story 3.2

**As a** user

**I want to** view previous job descriptions

**So that** I can reuse them.

#### Acceptance Criteria

- Saved job descriptions are listed.
- User can select one for analysis.

---

# Epic 4 - AI Analysis

### User Story 4.1

**As a** job seeker

**I want** AI to evaluate my resume

**So that** I know how to improve it.

#### Acceptance Criteria

- Resume score is generated.
- ATS score is displayed.
- Strengths are identified.
- Weaknesses are identified.
- Missing keywords are listed.

---

### User Story 4.2

**As a** job seeker

**I want** personalized recommendations

**So that** I can improve my chances of getting hired.

#### Acceptance Criteria

- AI suggests improvements.
- AI recommends missing skills.
- AI suggests certifications.
- Suggestions are easy to understand.

---

# Epic 5 - Cover Letter

### User Story 5.1

**As a** job seeker

**I want** an AI-generated cover letter

**So that** I can apply more quickly.

#### Acceptance Criteria

- Cover letter includes company name.
- Cover letter references the job description.
- User can copy the result.
- User can regenerate the content.

---

# Epic 6 - Interview Preparation

### User Story 6.1

**As a** job seeker

**I want** interview questions based on the job

**So that** I can prepare for interviews.

#### Acceptance Criteria

- Technical questions are generated.
- Behavioural questions are generated.
- HR questions are generated.
- Suggested answers are provided.

---

# Epic 7 - Dashboard

### User Story 7.1

**As a** user

**I want** a dashboard

**So that** I can quickly see my progress.

#### Acceptance Criteria

- Resume score is visible.
- ATS score is visible.
- Recent analyses are displayed.
- Saved job descriptions are displayed.
- Recent cover letters are displayed.

---

# MVP (Minimum Viable Product)

Version 1.0 will include:

- User authentication
- Resume upload
- Job description input
- AI resume analysis
- ATS score
- Resume improvement suggestions
- Cover letter generation
- Interview questions
- Dashboard