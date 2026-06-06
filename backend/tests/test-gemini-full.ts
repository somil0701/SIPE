import 'dotenv/config';
import { env } from './src/config/env';
import axios from 'axios';

async function testGeminiFull() {
  const prompt = `You are an expert ATS resume reviewer for software engineering and technology roles.
Extract the resume into structured JSON and provide actionable critique.

Return ONLY valid JSON with this exact shape:
{
  "parsedData": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "contactInfo": { "email": "string", "phone": "string", "location": "string", "linkedin": "string", "github": "string", "portfolio": "string" },
    "summary": "string",
    "experience": [{ "company": "string", "title": "string", "startDate": "string", "endDate": "string", "description": "string", "bullets": ["string"], "technologies": ["string"] }],
    "education": [{ "institution": "string", "degree": "string", "field": "string", "graduationDate": "string", "details": ["string"] }],
    "projects": [{ "name": "string", "description": "string", "technologies": ["string"], "link": "string", "role": "string", "impact": "string", "bullets": ["string"] }],
    "skills": ["string"],
    "certifications": [{ "name": "string", "issuer": "string", "date": "string" }],
    "achievements": ["string"]
  },
  "summary": "2-3 sentence resume assessment",
  "strengths": ["specific resume strengths"],
  "weaknesses": ["specific resume weaknesses"],
  "missingSections": ["sections missing from the resume"],
  "missingKeywords": ["important ATS keywords missing or weakly represented"],
  "priorityImprovements": [{ "priority": "high|medium|low", "title": "string", "recommendation": "specific action", "impact": "why it matters" }],
  "projectAnalysis": [{ "name": "string", "technologies": ["string"], "qualityScore": 0, "qualityRating": "string", "descriptionQuality": "string", "measurableImpact": false, "strengths": ["string"], "weaknesses": ["string"], "suggestedDescription": "stronger truthful rewrite with placeholders for unknown metrics" }],
  "experienceAnalysis": [{ "company": "string", "title": "string", "weakBullets": ["string"], "actionRewrites": ["stronger truthful rewrite with placeholders for unknown metrics"], "quantificationIdeas": ["string"], "suggestions": ["string"] }]
}

Do not invent employers, degrees, certifications, achievements, links, or metrics. If a metric is missing, suggest a placeholder like [metric] rather than fabricating a value.

Resume text:
Somil Choudhary
+91 8287156256|somil2005@gmail.com|linkedin.com/in/somil-choudhary|github.com/somil0701
Education
Guru Gobind Singh Indraprastha UniversityDwarka, Delhi
Bachelor of Technology in Computer Science and EngineeringAug. 2023 – Present
Indian Institute of Technology Madras (Online)Chennai, Tamil Nadu
Bachelor of Science in Data Science and ApplicationsMay. 2023 – Present
Experience
Software Developer InternJuly 2025 – Sep 2025
Ansun Multitech India Ltd.New Delhi, India
•
Revamped and optimized a production-scale web application, significantly improving load performance and user
responsiveness
•
Optimized frontend assets andreduced page load time by
 ̃
30%using lazy loaading and code splitting
•
Enhanced UI/UX by redesigning key components for better accessibility and mobile compatibility
•
Improved performance across 10+ key pages, enhancing user experience for production traffic
•
Collaborated with the team to identify andfix performance bottlenecksand UI inconsistencies
Technical Lead (Volunteer)August 2025 - August 2026
Google Developer Groups (GDG)Remote
•
Spearheaded development of the flagship hackathon website, delivering ahigh-performance, visually
immersive platformfor 500+ participants
•
Mentored and coordinated a team, enforcingbest practices in frontend architecture, code quality, and
deployment workflows
•
Drove technical strategy by selecting tools, optimizing performance, and ensuringscalable and maintainable
codebase
Projects
FindMySpot|VueJS, ChartJS, Flask, Redis, Celery, SQLAlchemy, SQLite3, SMTPJan 2026
•
Engineered a full-stack parking management platform with RBAC, real-time slot reservation, occupancy
monitoring, and automated billing workflows
•
Developed RESTful APIs and database models using Flask and SQLAlchemy, improving backend responsiveness
through Redis-based caching and optimized query handling
•
Integrated Celery with Redis for asynchronous task processing, enabling non-blocking email notifications and report
generation
•
Built a responsive Vue.js SPA with interactive analytics dashboards using Chart.js for occupancy, revenue, and
usage trend visualization
SIPE (Smart Interview Preparation Engine)|React, Tailwind, ReCharts, NodeJS, Postgres, PrismaMay 2026
•
Built a personalized coding practice platform with adaptive recommendations and performance tracking
•
Implemented topic-wise analytics and weakness detection algorithms for data-driven interview preparation
•
Developed a real-time code submission editor with multi-language execution and test case evaluation
•
Optimized APIs, caching, and background jobs for scalable analytics and recommendation workflows
Technical Skills
Languages: C++, JavaScript, Python
Frontend: React, Next.js, Vue.js, Tailwind
Backend: Node.js, Express, Flask
Database: PostgreSQL, MongoDB, SQLite, Redis
Tools: Git, Docker, GCP, Linux
Extra Curricular Activities
•Solved 800+ DSA Questions on different coding platforms such asLeetCode, GeeksforGeeks,Codeforces, etc.
•Achieved a peak rating of1278+(Pupil) onCodeforces,1564+onCodeChef,1709+onLeetCode
•Strong problem-solving skills across data structures and algorithms, including graphs, DP, and greedy techniques`;

  const model = encodeURIComponent(env.GEMINI_MODEL || 'gemini-3.5-flash');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
  
  console.log('Sending request to Gemini API...');
  console.log('Model:', model);
  const startTime = Date.now();
  
  try {
    const response = await axios.post(
      url,
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
          maxOutputTokens: 8192,
        },
      },
      { timeout: 120000 }
    );
    
    console.log('Success in', Date.now() - startTime, 'ms');
  } catch (error: any) {
    console.log('Failed in', Date.now() - startTime, 'ms');
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else {
      console.error('Network/Axios Error:', error.message, error.code);
    }
  }
}

testGeminiFull();
