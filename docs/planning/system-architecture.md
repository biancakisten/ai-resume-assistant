# System Architecture

## Overview

The AI Resume Assistant is a full-stack web application consisting of:

- React Frontend
- Node.js Backend API
- Supabase Database
- OpenAI API

---

## High-Level Architecture

User

↓

React Frontend

↓

Express API

↓

Supabase Database

↓

OpenAI API

---

## Responsibilities

### React

Responsible for:

- User Interface
- Authentication
- Routing
- Forms
- Uploads
- Displaying AI Results

---

### Express

Responsible for:

- Authentication
- Business Logic
- File Uploads
- Calling OpenAI
- Communicating with Supabase

---

### Supabase

Responsible for:

- User Accounts
- Resume Storage
- Saved Analyses
- Job Descriptions
- Cover Letters

---

### OpenAI

Responsible for:

- Resume Analysis
- ATS Score
- Cover Letter Generation
- Interview Questions
- Career Suggestions

---

## Communication Flow

User

↓

React

↓

Express

↓

Supabase

↓

OpenAI

↓

Express

↓

React

↓

User