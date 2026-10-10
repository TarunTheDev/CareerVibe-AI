import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { v4 as uuidv4 } from "uuid";

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || "careervibe";
const LLM_KEY = process.env.LLM_API_KEY;
const APP_ID = process.env.NEXT_PUBLIC_BASE_URL || "";
const LLM_BASE =
  process.env.LLM_BASE_URL || "https://integrations.emergentagent.com/llm/v1";
const LLM_PROVIDER = (process.env.LLM_PROVIDER || "local").toLowerCase();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 15000);

// ─── Real Job API Keys (fallback to hardcoded for convenience) ────────────────
const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || "";
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || "";
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";
const FINDWORK_KEY = process.env.FINDWORK_KEY || "";
const APIFY_KEY = process.env.APIFY_KEY || "";
const JOOBLE_API_KEY = process.env.JOOBLE_API_KEY || "";
const JSEARCH_API_KEY = process.env.JSEARCH_API_KEY || "";
const JSEARCH_RAPIDAPI_KEY =
  process.env.JSEARCH_RAPIDAPI_KEY || process.env.RAPIDAPI_KEY || "";
const JSEARCH_RAPIDAPI_HOST =
  process.env.JSEARCH_RAPIDAPI_HOST || "jsearch.p.rapidapi.com";
const THEMUSE_API_KEY = process.env.THEMUSE_API_KEY || "";
const USAJOBS_API_KEY = process.env.USAJOBS_API_KEY || "";
const USAJOBS_USER_AGENT =
  process.env.USAJOBS_USER_AGENT || process.env.USAJOBS_EMAIL || "";
const CAREERJET_AFFILIATE_ID = process.env.CAREERJET_AFFILIATE_ID || "";
const WHATJOBS_FEED_URL = process.env.WHATJOBS_FEED_URL || "";
const WHATJOBS_API_URL = process.env.WHATJOBS_API_URL || "";
const WHATJOBS_API_KEY = process.env.WHATJOBS_API_KEY || "";
const ARBEITSAMT_API_KEY =
  process.env.ARBEITSAMT_API_KEY || "jobboerse-jobsuche";

// ─── MongoDB ─────────────────────────────────────────────────────────────────
let _client;
const memorySavedJobs = new Map();
async function getDb() {
  if (!MONGO_URL) return null;
  if (!_client) {
    _client = new MongoClient(MONGO_URL);
    await _client.connect();
  }
  return _client.db(DB_NAME);
}

// ─── AI helper ────────────────────────────────────────────────────────────────
async function fetchWithTimeout(url, options, timeoutMs = AI_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(systemPrompt, userContent) {
  const prompt = `${systemPrompt}\n\n${userContent}`;

  // Groq (OpenAI-compatible) — primary provider: fast + reliable free tier.
  if (GROQ_API_KEY) {
    try {
      const resp = await fetchWithTimeout(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userContent },
            ],
            temperature: 0.35,
          }),
        },
      );

      if (resp.ok) {
        const data = await resp.json();
        const text = data.choices?.[0]?.message?.content || "";
        if (text) return text;
      } else {
        const err = await resp.text();
        console.warn(`Groq API ${resp.status}, falling through:`, err.substring(0, 160));
      }
    } catch (e) {
      console.warn("Groq API unavailable:", e.message);
      // fall through to next provider
    }
  }

  if (GEMINI_API_KEY) {
    const model = GEMINI_MODEL.replace(/^models\//, "");
    try {
      const resp = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            // gemini-3.x-flash is a thinking model: it spends part of the output
            // budget on internal reasoning (thoughtsTokenCount). Without an
            // explicit cap the visible answer is truncated mid-JSON, which makes
            // every strict-JSON caller fail. 4096 leaves room for thoughts + answer.
            generationConfig: { temperature: 0.35, maxOutputTokens: 4096 },
          }),
        },
      );

      if (resp.status === 429 || resp.status === 503) {
        // Quota exceeded or service unavailable — fall through to next provider
        console.warn(`Gemini API returned ${resp.status}, falling through to next provider`);
      } else if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`Gemini API error ${resp.status}: ${err.substring(0, 200)}`);
      } else {
        const data = await resp.json();
        return (
          data.candidates?.[0]?.content?.parts
            ?.map((part) => part.text || "")
            .join("") || ""
        );
      }
    } catch (e) {
      if (e.message?.includes("Gemini API error")) throw e; // Real error, propagate
      console.warn("Gemini API unavailable:", e.message);
      // fall through to next provider
    }
  }

  if (OPENAI_API_KEY) {
    const resp = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.35,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`OpenAI API error ${resp.status}: ${err.substring(0, 200)}`);
    }

    const data = await resp.json();
    return data.choices?.[0]?.message?.content || "";
  }

  if (LLM_KEY) {
    // Emergent proxy fallback (always try if key is available)
    const resp = await fetchWithTimeout(`${LLM_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LLM_KEY}`,
        "X-App-ID": APP_ID,
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || "gemini/gemini-2.0-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.35,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`LLM error ${resp.status}: ${err.substring(0, 200)}`);
    }

    const data = await resp.json();
    return data.choices?.[0]?.message?.content || "";
  }

  throw new Error("No external LLM provider configured");
}

// ─── JSON extractor ──────────────────────────────────────────────────────────
function extractJson(text) {
  if (!text) throw new Error("Empty LLM response");

  // 1) Direct parse
  try {
    return JSON.parse(text);
  } catch (_) {}

  // 2) Markdown code block
  const md = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (md) {
    try {
      return JSON.parse(md[1].trim());
    } catch (_) {}
  }

  // 3) Greedy { } or [ ] extraction
  const obj = text.match(/(\{[\s\S]*\})/);
  if (obj) {
    try {
      return JSON.parse(obj[1]);
    } catch (_) {}
  }
  const arr = text.match(/(\[[\s\S]*\])/);
  if (arr) {
    try {
      return JSON.parse(arr[1]);
    } catch (_) {}
  }

  throw new Error("Could not extract JSON from LLM response");
}

// ─── Local AI fallbacks ──────────────────────────────────────────────────────
const SECTION_NAMES = [
  "summary",
  "professional summary",
  "profile",
  "objective",
  "career objective",
  "career summary",
  "skills",
  "core competencies",
  "key skills",
  "strengths",
  "technical skills",
  "technologies",
  "tools",
  "experience",
  "work experience",
  "employment",
  "internship experience",
  "internships",
  "projects",
  "education",
  "certifications",
  "certificates",
  "achievements",
  "awards",
  "languages",
  "publications",
  "contact",
];

const SKILL_PATTERNS = [
  ["JavaScript", /\b(java\s*script|javascript|js)\b/i],
  ["TypeScript", /\b(type\s*script|typescript|ts)\b/i],
  ["React", /\breact(?:\.js|js)?\b/i],
  ["Next.js", /\bnext(?:\.js|js)?\b/i],
  ["Node.js", /\bnode(?:\.js|js)?\b/i],
  ["Express", /\bexpress(?:\.js|js)?\b/i],
  ["HTML", /\bhtml5?\b/i],
  ["CSS", /\bcss3?\b/i],
  ["Tailwind CSS", /\btailwind\b/i],
  ["Python", /\bpython\b/i],
  ["Java", /\bjava\b/i],
  ["C++", /(^|[^a-z0-9])c\+\+([^a-z0-9]|$)/i],
  ["C#", /(^|[^a-z0-9])c#([^a-z0-9]|$)/i],
  ["SQL", /\bsql\b/i],
  ["MongoDB", /\bmongo(?:db)?\b/i],
  ["PostgreSQL", /\bpostgres(?:ql)?\b/i],
  ["MySQL", /\bmysql\b/i],
  ["Firebase", /\bfirebase\b/i],
  ["AWS", /\baws|amazon web services\b/i],
  ["Google Cloud", /\b(gcp|google cloud|google cloud platform)\b/i],
  ["Azure", /\bazure\b/i],
  ["Docker", /\bdocker\b/i],
  ["Kubernetes", /\bkubernetes|k8s\b/i],
  ["Git", /\bgit(?:hub|lab)?\b/i],
  ["REST APIs", /\brest(?:ful)?\s*api|apis?\b/i],
  ["GraphQL", /\bgraphql\b/i],
  ["Machine Learning", /\b(machine learning|ml|scikit|sklearn|random forest|decision tree)\b/i],
  ["Deep Learning", /\bdeep learning|tensorflow|pytorch|keras\b/i],
  ["AI", /\b(artificial intelligence|llm|genai|generative ai|voice agent|nlp|natural language)\b/i],
  ["Data Analysis", /\bdata analysis|analytics|excel|power bi|tableau|exploratory analysis|eda\b/i],
  ["Excel", /\bexcel|spreadsheet\b/i],
  ["Tableau", /\btableau\b/i],
  ["Power BI", /\bpower\s*bi\b/i],
  ["Pandas", /\bpandas\b/i],
  ["NumPy", /\bnumpy\b/i],
  ["Streamlit", /\bstreamlit\b/i],
  ["Scikit-learn", /\bscikit-learn|scikit|sklearn\b/i],
  ["Seaborn", /\bseaborn\b/i],
  ["Matplotlib", /\bmatplotlib\b/i],
  ["SHAP", /\bshap\b/i],
  ["IoT", /\biot|embedded systems|arduino|raspberry\b/i],
  ["Embedded Systems", /\bembedded systems?|microcontrollers?|esp32|arduino uno|arduino ide\b/i],
  ["Arduino", /\barduino(?:\s+ide|\s+uno)?\b/i],
  ["ESP32", /\besp32\b/i],
  ["Sensors", /\bdht22|bme280|ir sensors?|sensor\b/i],
  ["Nutrition", /\b(nutrition|nutritional|dietary education|diet therapy)\b/i],
  ["Nutrition Counseling", /\b(nutrition education counseling|nutrition counseling|dietary counseling|nutrition consultation|nutrition consultations|client assessment)\b/i],
  ["Nutrition Assessment", /\b(nutrition assessments?|nutritional status|dietary assessments?|wic certifications?)\b/i],
  ["Meal Planning", /\b(meal planning|meal plans?|supplemental food packages?|healthy meals?|personalized nutrition plans?)\b/i],
  ["Food Preparation", /\b(food preparation|prepared meals?|cooking|culinary)\b/i],
  ["Kitchen Maintenance", /\b(kitchen maintenance|cleaned kitchens?|kitchen cleanliness|kitchen hygiene)\b/i],
  ["Kitchen Equipment Operation", /\b(kitchen equipment operation|kitchen equipment|food production equipment)\b/i],
  ["Food Sanitation", /\b(food sanitation|food safety|sanitation|hygiene standards?)\b/i],
  ["Food Safety", /\b(food safety|food hygiene|safe food handling|hygiene standards?)\b/i],
  ["Clinical Nutrition", /\b(clinical nutrition|registered dietitian|dietitian|dietician|hemodialysis|diabetes|high cholesterol|morbid obesity|renal nutrition|patient care)\b/i],
  ["Patient Counseling", /\b(patient counseling|nutrition education counseling|diabetes counseling|cholesterol management|lifestyle changes)\b/i],
  ["WIC Program", /\b(wic program|wic certifications?|usda established wic)\b/i],
  ["Food Science", /\b(food sciences?|dietary education)\b/i],
  ["Food Service", /\b(food service|dietary manager|food production|catering|kitchen operations)\b/i],
  ["Django", /\bdjango\b/i],
  ["Flask", /\bflask\b/i],
  ["Spring Boot", /\bspring boot\b/i],
  ["React Native", /\breact native\b/i],
  ["Flutter", /\bflutter\b/i],
  ["Figma", /\bfigma\b/i],
  ["Agile", /\bagile|scrum\b/i],
  ["Testing", /\btesting|jest|cypress|playwright|selenium\b/i],
  ["Observability", /\b(observability|prometheus|grafana|opentelemetry|open telemetry|distributed tracing|application logging|log aggregation)\b/i],
  ["Linux", /\blinux|unix|bash|shell scripting\b/i],
  ["CI/CD", /\bci\/cd|cicd|github actions|jenkins|gitlab ci\b/i],
  ["MS Excel", /\b(ms\.?\s*excel|microsoft excel|advanced excel|excel)\b/i],
  ["MS Word", /\b(ms\.?\s*word|microsoft word|word processing|ms word)\b/i],
  ["MS PowerPoint", /\b(ms\.?\s*powerpoint|microsoft powerpoint|powerpoint|presentation decks?)\b/i],
  ["MS Office", /\b(ms office|microsoft office|office suite)\b/i],
  ["Data Entry", /\b(data entry|record keeping|record management)\b/i],
  ["Documentation", /\b(documentation|document management|filing|records management)\b/i],
  ["Communication", /\b(communication skills?|verbal communication|written communication|business communication)\b/i],
  ["Presentation Skills", /\b(presentation skills?|presentations?|business presentation)\b/i],
  ["Team Collaboration", /\b(team collaboration|teamwork|cross-functional collaboration|collaboration)\b/i],
  ["Time Management", /\b(time management|prioritization|multitasking)\b/i],
  ["Problem Solving", /\b(problem solving|problem-solving|critical thinking)\b/i],
  ["Market Research", /\b(market research|consumer research|survey-based study|competitor research)\b/i],
  ["Reporting", /\b(reports?|reporting|weekly reports?|monthly reports?|dashboards?)\b/i],
  ["Operations Management", /\b(business operations|operations management|operations support|operational support)\b/i],
  ["Administrative Support", /\b(administrative support|administration|office administration|admin support)\b/i],
  ["Scheduling", /\b(scheduling|calendar management|meeting coordination|appointment scheduling)\b/i],
  ["Customer Service", /\b(customer service|customer support|client support|customer relationship)\b/i],
  ["CRM", /\b(customer relationship management|crm)\b/i],
  ["Coordination", /\b(coordination|coordinated with|liaison|stakeholder coordination)\b/i],
  ["Business Analysis", /\b(business analysis|requirements gathering|process analysis)\b/i],
  ["Process Improvement", /\b(process improvement|workflow improvement|continuous improvement)\b/i],
  ["Digital Marketing", /\b(digital marketing|seo|social media marketing|marketing campaigns?)\b/i],
  ["Sales", /\b(sales|lead generation|client acquisition|inside sales|field sales|b2b sales|b2c sales)\b/i],
  ["Sales Strategy", /\b(sales strategy|sales strategies|sales planning|go[- ]to[- ]market|gtm|sales forecast|forecasting)\b/i],
  ["Business Development", /\b(business development|new business|partnership development|channel partners?|strategic partnerships?)\b/i],
  ["Territory Management", /\b(territory management|territory expansion|territory planning|region(?:al)? management|market expansion)\b/i],
  ["Client Relationship Management", /\b(client relationship|customer relationship|relationship management|account management|key account|stakeholder management)\b/i],
  ["Revenue Growth", /\b(revenue growth|revenue generation|revenue maximization|sales growth|top[- ]line growth|profitability)\b/i],
  ["Distributor Management", /\b(distributor management|distributor networks?|distribution networks?|dealer management|channel management|distribution strategy)\b/i],
  ["Team Leadership", /\b(team leadership|team management|people management|led a team|leading teams?|mentored (the )?team|supervised)\b/i],
  ["Negotiation Skills", /\b(negotiation|negotiating|commercial agreements?|contract negotiation|deal closing)\b/i],
  ["Recruitment", /\b(recruitment|talent acquisition|candidate sourcing|hiring)\b/i],
  ["HR Operations", /\b(hr operations|human resources|employee onboarding|payroll support)\b/i],
  ["Finance Operations", /\b(finance operations|invoicing|accounts payable|reconciliations?|bookkeeping)\b/i],
  ["Procurement", /\b(procurement|vendor management|sourcing|purchase orders?)\b/i],
  ["FMCG", /\b(fmcg|fast moving consumer goods|consumer goods|retail distribution)\b/i],
  ["Retail Sales", /\b(retail sales|retail expansion|retail management|retail operations|retail outlets?)\b/i],
  ["Competitor Analysis", /\b(competitor analysis|competitive analysis|market analysis|market intelligence)\b/i],
  ["Pricing Strategy", /\b(pricing strategy|pricing strategies|pricing|price positioning)\b/i],
];

const ROLE_PATTERNS = [
  ["Nutrition Consultant", /\b(nutrition(?:al)? consultant|nutrition consultant|nutritionist|dietary consultant|nutrition coach)\b/i],
  ["Dietitian", /\b(dietitian|dietician|clinical dietitian|registered dietitian)\b/i],
  ["Food Service Manager", /\b(food service manager|dietary manager|catering manager|food production manager)\b/i],
  ["Kitchen Associate", /\b(kitchen associate|commis|cook|chef|culinary associate)\b/i],
  ["Frontend Developer", /\b(frontend|front-end|react developer|ui developer)\b/i],
  ["Full Stack Developer", /\b(full[- ]stack|mern|mean)\b/i],
  ["Backend Developer", /\b(backend|back-end|api developer|node developer)\b/i],
  ["Software Engineer", /\b(software engineer|software developer|programmer)\b/i],
  ["AI/ML Engineer", /\b(ai.{0,5}ml|machine learning intern|ai intern|ai and machine learning)\b/i],
  ["Data Analyst", /\b(data analyst|business analyst|analytics analyst)\b/i],
  ["Data Scientist", /\b(data scientist|machine learning engineer|ml engineer|ai engineer)\b/i],
  ["Python Developer", /\bpython\s+(programming|developer|engineer)\b/i],
  ["IoT Engineer", /\b(iot|embedded systems|iot.*embedded)\b/i],
  ["DevOps Engineer", /\b(devops|cloud engineer|site reliability|sre)\b/i],
  ["Mobile Developer", /\b(android developer|ios developer|mobile developer|flutter developer)\b/i],
  ["QA Engineer", /\b(qa engineer|quality assurance|test engineer)\b/i],
  ["Product Manager", /\bproduct manager\b/i],
  ["UX Designer", /\b(ux designer|ui\/ux|product designer)\b/i],
  ["Business Operations Intern", /\b(business operations intern|operations intern|operations trainee)\b/i],
  ["Business Operations Analyst", /\b(business operations analyst|operations analyst|business analyst)\b/i],
  ["Business Operations Specialist", /\b(business operations specialist|operations specialist)\b/i],
  ["Operations Executive", /\b(operations executive|operations associate|operations coordinator)\b/i],
  ["Administrative Assistant", /\b(administrative assistant|admin assistant|executive assistant|office assistant)\b/i],
  ["Office Administrator", /\b(office administrator|office administration|office coordinator)\b/i],
  ["Customer Support Executive", /\b(customer support executive|customer service executive|client support executive)\b/i],
  ["Regional Sales Manager", /\b(regional sales manager|area sales manager|territory sales manager|zonal sales manager|zone manager|state sales manager)\b/i],
  ["Sales Manager", /\b(sales manager|senior sales manager|sales and business development manager|sales & bd manager)\b/i],
  ["Business Development Manager", /\b(business development manager|bd manager|business development lead|head of business development|national sales manager|country sales manager)\b/i],
  ["Sales Executive", /\b(sales executive|business development executive|inside sales|sales representative|sales associate)\b/i],
  ["Key Account Manager", /\b(key account manager|account manager|kam|client account manager|strategic account manager)\b/i],
  ["Marketing Executive", /\b(marketing executive|digital marketing executive|marketing coordinator)\b/i],
  ["HR Executive", /\b(hr executive|human resources executive|talent acquisition executive|recruiter)\b/i],
  ["Finance Executive", /\b(finance executive|accounts executive|account executive|accounts payable executive)\b/i],
  ["Project Coordinator", /\b(project coordinator|program coordinator|project associate)\b/i],
  ["Teacher", /\b(teacher|educator|faculty|lecturer|tutor)\b/i],
];

const EXPERIENCE_SECTION_HEADINGS = [
  "experience",
  "work experience",
  "professional experience",
  "career experience",
  "internship experience",
  "employment",
  "work history",
];

const EDUCATION_SECTION_HEADINGS = [
  "education",
  "academic background",
  "academics",
  "qualifications",
  "educational background",
  "educational qualifications",
  "academic qualifications",
  "educational qualification",
];

const JOB_TITLE_HINTS = /\b(manager|director|lead|principal|staff|head|specialist|analyst|associate|coordinator|executive|consultant|engineer|developer|designer|architect|recruiter|assistant|administrator|officer|teacher|trainer|scientist|technician|advisor|accountant|bookkeeper|nurse|intern|trainee|apprentice|supervisor|planner|strategist|representative|agent|producer|writer|editor|coach|partner)\b/i;
const JOB_TITLE_BLOCKERS = /\b(education|skills|projects|certifications|languages|summary|objective|profile|contact|linkedin|github|portfolio|curriculum|resume|school|college|university|pvt|private limited|ltd|limited|inc|llc|gmbh|corp|corporation|company|address)\b/i;

function isExperienceHeading(line) {
  const normalized = normalizeHeading(line);
  return EXPERIENCE_SECTION_HEADINGS.some(
    (heading) => normalized === heading || normalized.startsWith(`${heading} `),
  );
}

function normalizeJobTitleLine(line) {
  return compactText(line).replace(/^[>*\-\u2022\s]+/, "").trim();
}

function looksLikeJobTitleLine(line) {
  const cleaned = normalizeJobTitleLine(line);
  const lower = cleaned.toLowerCase();
  if (!cleaned || cleaned.length < 3 || cleaned.length > 90) return false;
  if (JOB_TITLE_BLOCKERS.test(lower)) return false;
  if (/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b.*\b20\d{2}\b/i.test(lower))
    return false;
  if (/^\d{4}(?:\s*[–-]\s*\d{4}|\s*[–-]\s*(?:present|current))?$/i.test(lower)) return false;
  if (cleaned.split(/\s+/).length > 8) return false;
  return JOB_TITLE_HINTS.test(lower) || /^(hr|it|qa|ux|ui|po|pm|r&d)\b/i.test(lower);
}

function collectGenericJobTitles(text) {
  const lines = splitLines(text);
  const found = [];
  let inExperience = false;

  for (const [index, rawLine] of lines.entries()) {
    const line = cleanLine(rawLine);
    if (!line) continue;

    if (isExperienceHeading(line)) {
      inExperience = true;
      continue;
    }

    if (inExperience && isSectionHeading(line)) {
      inExperience = false;
      continue;
    }

    if (looksLikeJobTitleLine(line) && (inExperience || index < 24)) {
      found.push(line);
    }
  }

  return uniqueList(found, 8);
}

const ROLE_SKILLS = [
  {
    test: /\b(nutrition(?:al)? consultant|nutritionist|dietitian|dietician|clinical dietitian|registered dietitian|dietary|wic)\b/i,
    skills: ["Nutrition", "Nutrition Counseling", "Nutrition Assessment", "Meal Planning", "Clinical Nutrition", "Patient Counseling", "Food Science"],
  },
  {
    test: /\b(food service|dietary manager|kitchen|chef|commis|culinary|catering|food production)\b/i,
    skills: ["Food Preparation", "Kitchen Maintenance", "Kitchen Equipment Operation", "Food Sanitation", "Food Service", "Food Safety"],
  },
  {
    test: /\b(frontend|front-end|react|ui)\b/i,
    skills: ["JavaScript", "TypeScript", "React", "HTML", "CSS", "REST APIs", "Git"],
  },
  {
    test: /\b(full[- ]stack|mern|software engineer|software developer)\b/i,
    skills: ["JavaScript", "React", "Node.js", "Express", "SQL", "MongoDB", "REST APIs", "Git"],
  },
  {
    test: /\b(backend|back-end|api|server)\b/i,
    skills: ["Node.js", "Express", "SQL", "MongoDB", "REST APIs", "Docker", "Testing"],
  },
  {
    test: /\b(data scientist|machine learning|ml engineer|ai engineer)\b/i,
    skills: ["Python", "SQL", "Machine Learning", "Pandas", "NumPy", "Data Analysis", "AI"],
  },
  {
    test: /\b(data analyst|business analyst|analytics)\b/i,
    skills: ["SQL", "Python", "Data Analysis", "Excel", "Tableau", "Power BI"],
  },
  {
    test: /\b(business operations|operations analyst|operations specialist|operations executive|operations coordinator)\b/i,
    skills: ["Operations Management", "MS Excel", "Reporting", "Documentation", "Coordination", "Communication"],
  },
  {
    test: /\b(administrative assistant|office administrator|administration|office coordinator|executive assistant)\b/i,
    skills: ["Administrative Support", "Documentation", "Scheduling", "MS Office", "Communication", "Time Management"],
  },
  {
    test: /\b(customer support|customer service|client support|crm)\b/i,
    skills: ["Customer Service", "CRM", "Communication", "Coordination", "Documentation"],
  },
  {
    test: /\b(marketing|digital marketing|brand|social media)\b/i,
    skills: ["Digital Marketing", "Market Research", "Communication", "Presentation Skills", "MS Excel"],
  },
  {
    test: /\b(regional sales manager|area sales manager|territory sales manager|national sales manager|sales manager|business development manager|bd manager|sales and business development)\b/i,
    skills: ["Sales Strategy", "Business Development", "Territory Management", "Client Relationship Management", "Revenue Growth", "Distributor Management", "Team Leadership", "Negotiation Skills", "CRM", "Competitor Analysis", "Pricing Strategy", "MS Excel", "Reporting"],
  },
  {
    test: /\b(sales executive|sales representative|sales associate|business development executive|account executive|key account manager|inside sales)\b/i,
    skills: ["Sales", "Business Development", "Client Relationship Management", "CRM", "Communication", "Negotiation Skills", "Presentation Skills", "Reporting"],
  },
  {
    test: /\b(sales|business development|lead generation)\b/i,
    skills: ["Sales", "Business Development", "Communication", "CRM", "Presentation Skills", "Reporting"],
  },
  {
    test: /\b(hr|human resources|talent acquisition|recruitment)\b/i,
    skills: ["Recruitment", "Talent Acquisition", "Employee Engagement", "Performance Management", "Payroll", "HR Operations", "HR Policy Development", "Workforce Planning", "Conflict Resolution", "Labor Law Compliance", "HR Analytics and Reporting", "SAP HR", "HRMS Tools", "Communication", "Documentation", "Coordination"],
  },
  {
    test: /\b(finance|accounts|bookkeeping|invoicing|procurement|purchase order)\b/i,
    skills: ["Finance Operations", "MS Excel", "Documentation", "Reporting", "Procurement"],
  },
  {
    test: /\b(devops|cloud|sre|site reliability)\b/i,
    skills: ["AWS", "Docker", "Kubernetes", "Git", "Linux", "CI/CD"],
  },
  {
    test: /\b(mobile|android|ios|flutter|react native)\b/i,
    skills: ["React Native", "Flutter", "JavaScript", "Testing", "REST APIs", "Git"],
  },
  {
    test: /\b(iot|embedded|arduino|esp32|microcontroller|hardware)\b/i,
    skills: ["Embedded Systems", "IoT", "Arduino", "ESP32", "C++", "Sensors", "Git"],
  },
];

const CAREER_TRACKS = [
  {
    id: "operations",
    test:
      /\b(business operations?|operations analyst|operations specialist|operations executive|operations coordinator|operations support|business administration|bba|process coordination|reporting|documentation)\b/i,
    roles: [
      "Business Operations Analyst",
      "Business Operations Specialist",
      "Operations Executive",
      "Operations Coordinator",
    ],
    industries: ["Business Operations", "Administration"],
    related: ["administration", "customer-support", "finance", "hr", "sales", "marketing"],
  },
  {
    id: "administration",
    test:
      /\b(administrative assistant|administrative support|administration|office administration|office administrator|office coordinator|executive assistant|scheduling|data entry|document management)\b/i,
    roles: [
      "Administrative Assistant",
      "Office Administrator",
      "Office Coordinator",
      "Executive Assistant",
    ],
    industries: ["Administration", "Professional Services"],
    related: ["operations", "customer-support", "hr", "finance"],
  },
  {
    id: "customer-support",
    test:
      /\b(customer support|customer service|client support|client success|crm|customer relationship|help desk)\b/i,
    roles: [
      "Customer Support Executive",
      "Customer Success Associate",
      "Client Support Associate",
    ],
    industries: ["Customer Service", "Professional Services"],
    related: ["operations", "administration", "sales"],
  },
  {
    id: "marketing",
    test:
      /\b(marketing|digital marketing|brand|campaign|seo|social media|market research)\b/i,
    roles: ["Marketing Executive", "Marketing Coordinator", "Digital Marketing Executive"],
    industries: ["Marketing"],
    related: ["sales", "operations"],
  },
  {
    id: "sales-manager",
    test:
      /\b(regional sales manager|area sales manager|territory sales manager|national sales manager|sales manager|business development manager|bd manager|sales and business development|sales & business development|fmcg sales|distributor management|territory management|revenue growth|key account)\b/i,
    roles: [
      "Regional Sales Manager",
      "Sales Manager",
      "Business Development Manager",
      "Key Account Manager",
      "Territory Sales Manager",
    ],
    industries: ["Sales", "FMCG", "Retail", "Business Development"],
    related: ["sales", "marketing", "customer-support", "operations"],
  },
  {
    id: "sales",
    test:
      /\b(sales executive|sales representative|sales associate|business development executive|inside sales|client acquisition|lead generation)\b/i,
    roles: ["Sales Executive", "Business Development Executive", "Account Executive"],
    industries: ["Sales"],
    related: ["sales-manager", "marketing", "customer-support", "operations"],
  },
  {
    id: "hr",
    test:
      /\b(human resources|hr operations|recruitment|talent acquisition|candidate sourcing|payroll)\b/i,
    roles: ["HR Executive", "Recruiter", "Talent Acquisition Associate"],
    industries: ["Human Resources"],
    related: ["operations", "administration"],
  },
  {
    id: "finance",
    test:
      /\b(finance|accounts|accounting|bookkeeping|accounts payable|invoicing|reconciliations?|procurement|purchase orders?)\b/i,
    roles: ["Finance Executive", "Accounts Executive", "Procurement Associate"],
    industries: ["Finance"],
    related: ["operations", "administration"],
  },
  {
    id: "data",
    test:
      /\b(data analyst|data analytics|business intelligence|bi analyst|tableau|power bi|sql|python|machine learning|data scientist|analytics engineer)\b/i,
    roles: ["Data Analyst", "Business Intelligence Analyst", "Data Scientist"],
    industries: ["Data & AI"],
    related: ["software", "finance"],
  },
  {
    id: "software",
    test:
      /\b(frontend|front-end|backend|back-end|full[- ]stack|software engineer|software developer|web developer|react|node(?:\.js)?|javascript|typescript)\b/i,
    roles: ["Frontend Developer", "Full Stack Developer", "Software Engineer"],
    industries: ["Technology", "Software"],
    related: ["data", "devops", "design", "mobile"],
  },
  {
    id: "devops",
    test:
      /\b(devops|cloud engineer|site reliability|sre|aws|kubernetes|docker|ci\/cd)\b/i,
    roles: ["DevOps Engineer", "Cloud Engineer", "Site Reliability Engineer"],
    industries: ["Cloud", "Technology"],
    related: ["software", "data"],
  },
  {
    id: "mobile",
    test:
      /\b(android developer|ios developer|mobile developer|flutter|react native)\b/i,
    roles: ["Mobile Developer", "Flutter Developer", "React Native Developer"],
    industries: ["Technology", "Software"],
    related: ["software", "design"],
  },
  {
    id: "hardware",
    test:
      /\b(iot|embedded systems?|microcontrollers?|arduino|esp32|firmware|hardware)\b/i,
    roles: ["IoT Engineer", "Embedded Systems Engineer", "Hardware Intern"],
    industries: ["Electronics", "Embedded Systems"],
    related: ["software"],
  },
  {
    id: "design",
    test:
      /\b(ux designer|ui designer|product designer|figma|wireframing|prototyping)\b/i,
    roles: ["UX Designer", "UI Designer", "Product Designer"],
    industries: ["Design"],
    related: ["software", "mobile"],
  },
  {
    id: "nutrition",
    test:
      /\b(nutrition|nutritionist|dietitian|dietician|clinical nutrition|meal planning|wic)\b/i,
    roles: ["Nutrition Consultant", "Dietitian", "Nutritionist"],
    industries: ["Healthcare", "Nutrition & Wellness"],
    related: ["healthcare", "food-service"],
  },
  {
    id: "healthcare",
    test:
      /\b(healthcare|medical|patient care|clinical|hospital|nurse|therapy)\b/i,
    roles: ["Healthcare Associate", "Clinical Coordinator", "Patient Support Associate"],
    industries: ["Healthcare"],
    related: ["nutrition"],
  },
  {
    id: "food-service",
    test:
      /\b(food service|kitchen|culinary|chef|cook|catering|food safety|food sanitation)\b/i,
    roles: ["Food Service Associate", "Kitchen Associate", "Catering Assistant"],
    industries: ["Food Services", "Hospitality"],
    related: ["nutrition", "healthcare"],
  },
  {
    id: "education",
    test:
      /\b(teacher|educator|faculty|lecturer|tutor|teaching assistant|curriculum)\b/i,
    roles: ["Teacher", "Tutor", "Teaching Assistant"],
    industries: ["Education"],
    related: [],
  },
];

const RESOURCE_BY_SKILL = {
  JavaScript: {
    name: "JavaScript Guide - MDN",
    type: "Tutorial",
    url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
    free: true,
  },
  React: {
    name: "React Learn",
    type: "Tutorial",
    url: "https://react.dev/learn",
    free: true,
  },
  "Node.js": {
    name: "Node.js Learn",
    type: "Tutorial",
    url: "https://nodejs.org/en/learn",
    free: true,
  },
  Python: {
    name: "Python for Everybody",
    type: "Course",
    url: "https://www.py4e.com/",
    free: true,
  },
  SQL: {
    name: "SQLBolt",
    type: "Practice",
    url: "https://sqlbolt.com/",
    free: true,
  },
  AWS: {
    name: "AWS Skill Builder",
    type: "Course",
    url: "https://skillbuilder.aws/",
    free: true,
  },
  Docker: {
    name: "Docker Getting Started",
    type: "Tutorial",
    url: "https://docs.docker.com/get-started/",
    free: true,
  },
  "Machine Learning": {
    name: "Machine Learning Crash Course",
    type: "Course",
    url: "https://developers.google.com/machine-learning/crash-course",
    free: true,
  },
};

function compactText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16)),
    )
    .replace(/&amp;#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(parseInt(code, 16)),
    )
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripHtml(value) {
  return compactText(
    decodeHtmlEntities(value)
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<\/(p|div|li|h[1-6]|br|section|article)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  );
}

function cleanJobDescription(value, limit = 1200) {
  const cleaned = stripHtml(value)
    .replace(/sorry,\s*this job is not available in your region\.?/gi, "")
    .replace(/search for similar jobs in your region\.?/gi, "")
    .replace(/job no longer available\.?/gi, "")
    .replace(/this position is no longer listed[^.]*\.?/gi, "");
  return compactText(cleaned).substring(0, limit);
}

function isUnavailableJob(job) {
  const text = `${job?.title || ""} ${job?.description || ""} ${job?.applyUrl || ""}`;
  return /not available in your region|search for similar jobs in your region|job no longer available|position is no longer listed/i.test(
    text,
  );
}

function splitLines(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function cleanLine(line) {
  return compactText(line).replace(/^[>*\-\u2022\s]+/, "").trim();
}

function uniqueList(items, limit = 20) {
  const seen = new Set();
  const out = [];
  for (const item of items || []) {
    const value = compactText(item);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= limit) break;
  }
  return out;
}

const SKILL_ALIASES = new Map(
  [
    ["js", "JavaScript"],
    ["javascript", "JavaScript"],
    ["ts", "TypeScript"],
    ["typescript", "TypeScript"],
    ["react.js", "React"],
    ["reactjs", "React"],
    ["react", "React"],
    ["nextjs", "Next.js"],
    ["next.js", "Next.js"],
    ["nodejs", "Node.js"],
    ["node.js", "Node.js"],
    ["html/css", "HTML/CSS"],
    ["html5", "HTML"],
    ["html", "HTML"],
    ["css3", "CSS"],
    ["css", "CSS"],
    ["tailwind", "Tailwind CSS"],
    ["tailwind css", "Tailwind CSS"],
    ["c/c++", "C/C++"],
    ["c++", "C++"],
    ["c#", "C#"],
    ["sql", "SQL"],
    ["postgres", "PostgreSQL"],
    ["postgresql", "PostgreSQL"],
    ["mysql", "MySQL"],
    ["mongodb", "MongoDB"],
    ["mongo", "MongoDB"],
    ["rest", "REST APIs"],
    ["rest api", "REST APIs"],
    ["rest apis", "REST APIs"],
    ["api", "REST APIs"],
    ["apis", "REST APIs"],
    ["graphql", "GraphQL"],
    ["ml", "Machine Learning"],
    ["ai/ml", "AI/ML"],
    ["machine learning", "Machine Learning"],
    ["artificial intelligence", "AI"],
    ["generative ai", "AI"],
    ["genai", "AI"],
    ["llm", "AI"],
    ["nlp", "AI"],
    ["data analysis", "Data Analysis"],
    ["analytics", "Data Analysis"],
    ["embedded", "Embedded Systems"],
    ["embedded systems", "Embedded Systems"],
    ["microcontroller", "Embedded Systems"],
    ["microcontrollers", "Embedded Systems"],
    ["iot", "IoT"],
    ["arduino ide", "Arduino"],
    ["arduino uno", "Arduino"],
    ["arduino", "Arduino"],
    ["esp32", "ESP32"],
    ["sensors", "Sensors"],
    ["sensor", "Sensors"],
    ["pandas", "Pandas"],
    ["numpy", "NumPy"],
    ["matplotlib", "Matplotlib"],
    ["seaborn", "Seaborn"],
    ["scikit", "Scikit-learn"],
    ["sklearn", "Scikit-learn"],
    ["scikit-learn", "Scikit-learn"],
    ["gcp", "Google Cloud"],
    ["google cloud", "Google Cloud"],
    ["aws", "AWS"],
    ["azure", "Azure"],
    ["docker", "Docker"],
    ["kubernetes", "Kubernetes"],
    ["k8s", "Kubernetes"],
    ["git", "Git"],
    ["github", "Git"],
    ["ci/cd", "CI/CD"],
    ["cicd", "CI/CD"],
    ["linux", "Linux"],
    ["testing", "Testing"],
    ["selenium", "Testing"],
    ["playwright", "Testing"],
    ["ms excel", "MS Excel"],
    ["advanced ms excel", "MS Excel"],
    ["excel", "MS Excel"],
    ["ms word", "MS Word"],
    ["microsoft word", "MS Word"],
    ["word", "MS Word"],
    ["ms powerpoint", "MS PowerPoint"],
    ["microsoft powerpoint", "MS PowerPoint"],
    ["powerpoint", "MS PowerPoint"],
    ["ms office", "MS Office"],
    ["microsoft office", "MS Office"],
    ["office suite", "MS Office"],
    ["data entry", "Data Entry"],
    ["documentation", "Documentation"],
    ["document management", "Documentation"],
    ["communication", "Communication"],
    ["communication skills", "Communication"],
    ["presentation skills", "Presentation Skills"],
    ["presentations", "Presentation Skills"],
    ["team collaboration", "Team Collaboration"],
    ["teamwork", "Team Collaboration"],
    ["time management", "Time Management"],
    ["problem solving", "Problem Solving"],
    ["critical thinking", "Problem Solving"],
    ["market research", "Market Research"],
    ["reporting", "Reporting"],
    ["business operations", "Operations Management"],
    ["operations management", "Operations Management"],
    ["administration", "Administrative Support"],
    ["administrative support", "Administrative Support"],
    ["office administration", "Administrative Support"],
    ["scheduling", "Scheduling"],
    ["customer service", "Customer Service"],
    ["customer support", "Customer Service"],
    ["crm", "CRM"],
    ["customer relationship management", "CRM"],
    ["coordination", "Coordination"],
    ["business analysis", "Business Analysis"],
    ["process improvement", "Process Improvement"],
    ["digital marketing", "Digital Marketing"],
    ["sales", "Sales"],
    ["sales and business development", "Sales"],
    ["sales & business development", "Sales"],
    ["business development", "Business Development"],
    ["new business development", "Business Development"],
    ["sales strategy", "Sales Strategy"],
    ["sales strategy and planning", "Sales Strategy"],
    ["sales planning", "Sales Strategy"],
    ["go-to-market", "Sales Strategy"],
    ["gtm", "Sales Strategy"],
    ["territory management", "Territory Management"],
    ["territory expansion", "Territory Management"],
    ["region management", "Territory Management"],
    ["regional management", "Territory Management"],
    ["client relationship management", "Client Relationship Management"],
    ["customer relationship management", "CRM"],
    ["account management", "Client Relationship Management"],
    ["key account management", "Client Relationship Management"],
    ["relationship management", "Client Relationship Management"],
    ["stakeholder management", "Client Relationship Management"],
    ["revenue growth", "Revenue Growth"],
    ["revenue generation", "Revenue Growth"],
    ["sales growth", "Revenue Growth"],
    ["distributor management", "Distributor Management"],
    ["distribution management", "Distributor Management"],
    ["dealer management", "Distributor Management"],
    ["channel management", "Distributor Management"],
    ["team leadership", "Team Leadership"],
    ["team management", "Team Leadership"],
    ["people management", "Team Leadership"],
    ["leadership", "Team Leadership"],
    ["negotiation", "Negotiation Skills"],
    ["negotiation skills", "Negotiation Skills"],
    ["crm software", "CRM"],
    ["fmcg", "FMCG"],
    ["retail sales", "Retail Sales"],
    ["retail distribution", "Retail Sales"],
    ["retail management", "Retail Sales"],
    ["competitor analysis", "Competitor Analysis"],
    ["market analysis", "Competitor Analysis"],
    ["market research", "Market Research"],
    ["pricing strategy", "Pricing Strategy"],
    ["pricing strategies", "Pricing Strategy"],
    ["recruitment", "Recruitment"],
    ["talent acquisition", "Recruitment"],
    ["human resources", "HR Operations"],
    ["hr operations", "HR Operations"],
    ["finance operations", "Finance Operations"],
    ["invoicing", "Finance Operations"],
    ["bookkeeping", "Finance Operations"],
    ["accounts payable", "Finance Operations"],
    ["procurement", "Procurement"],
    ["purchase orders", "Procurement"],
    ["nutrition", "Nutrition"],
    ["nutritional", "Nutrition"],
    ["dietary education", "Nutrition"],
    ["nutrition counseling", "Nutrition Counseling"],
    ["nutrition education counseling", "Nutrition Counseling"],
    ["dietary counseling", "Nutrition Counseling"],
    ["nutrition consultation", "Nutrition Counseling"],
    ["nutrition consultations", "Nutrition Counseling"],
    ["nutrition assessment", "Nutrition Assessment"],
    ["nutrition assessments", "Nutrition Assessment"],
    ["nutritional status", "Nutrition Assessment"],
    ["meal planning", "Meal Planning"],
    ["personalized nutrition plans", "Meal Planning"],
    ["food preparation", "Food Preparation"],
    ["kitchen maintenance", "Kitchen Maintenance"],
    ["kitchen equipment operation", "Kitchen Equipment Operation"],
    ["food sanitation", "Food Sanitation"],
    ["food safety", "Food Safety"],
    ["clinical nutrition", "Clinical Nutrition"],
    ["dietitian", "Dietitian"],
    ["dietician", "Dietitian"],
    ["registered dietitian", "Dietitian"],
    ["wic", "WIC Program"],
    ["wic program", "WIC Program"],
    ["food science", "Food Science"],
    ["food sciences", "Food Science"],
    ["food service", "Food Service"],
    ["kitchen operations", "Food Service"],
    ["patient counseling", "Patient Counseling"],
    ["diabetes counseling", "Patient Counseling"],
  ].map(([key, value]) => [key.toLowerCase(), value]),
);

function normalizeSkillName(skill) {
  const raw = compactText(skill)
    .replace(/\s+/g, " ")
    .replace(/^[-*]+/, "")
    // Strip a leading conjunction left over from splitting lists like
    // "MS Excel, Word, and PowerPoint" → the "and PowerPoint" fragment.
    .replace(/^(and|&|or)\s+/i, "")
    .trim();
  if (!raw) return "";
  const key = raw.toLowerCase().replace(/\s*\+\s*/g, "+");
  return SKILL_ALIASES.get(key) || raw;
}

function skillKey(skill) {
  const normalized = normalizeSkillName(skill);
  if (normalized === "HTML/CSS") return "html/css";
  if (normalized === "AI/ML") return "ai/ml";
  return normalized.toLowerCase();
}

function skillKeysForCandidate(skill) {
  const normalized = normalizeSkillName(skill);
  const keys = new Set([skillKey(normalized)]);
  if (normalized === "HTML/CSS") {
    keys.add("html");
    keys.add("css");
  }
  if (normalized === "AI/ML") {
    keys.add("ai");
    keys.add("machine learning");
  }
  if (normalized === "Machine Learning") keys.add("ai/ml");
  if (normalized === "AI") keys.add("ai/ml");
  return [...keys];
}

function uniqueSkills(items, limit = 20) {
  const seen = new Set();
  const out = [];
  for (const item of items || []) {
    const value = normalizeSkillName(item);
    if (!value) continue;
    if (value.length < 2 || value.length > 40 || value.split(/\s+/).length > 4) continue;
    const key = skillKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= limit) break;
  }
  return out;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.split(/[,;\n]/);
  return [];
}

function normalizeHeading(line) {
  return compactText(line)
    .replace(/[:\-]+$/g, "")
    .toLowerCase();
}

function isLikelyStandaloneHeading(line, heading) {
  const normalized = normalizeHeading(line);
  if (normalized === heading) return true;
  const words = normalized.split(/\s+/).filter(Boolean);
  return words.length <= 4 && normalized.startsWith(`${heading} `);
}

function isSectionHeading(line) {
  const heading = normalizeHeading(line);
  return SECTION_NAMES.some(
    (name) => heading === name || isLikelyStandaloneHeading(line, name),
  );
}

function extractSectionLines(text, headings) {
  const lines = splitLines(text);
  const wanted = headings.map((heading) => heading.toLowerCase());
  const out = [];
  let inSection = false;

  for (const line of lines) {
    const normalized = normalizeHeading(line);
    const isWanted = wanted.some((heading) => isLikelyStandaloneHeading(line, heading));

    if (isWanted) {
      inSection = true;
      const colonIndex = line.indexOf(":");
      if (colonIndex >= 0) out.push(line.slice(colonIndex + 1));
      continue;
    }

    if (inSection && isSectionHeading(line)) break;
    if (inSection) out.push(line);
  }

  return out.map(cleanLine).filter(Boolean);
}

function normalizeResumeText(text) {
  const rawLines = String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/[\u2012\u2013\u2014\u2015]/g, "-")
    .replace(/[\u2022\u2023\u25E6\u2043]/g, "•")
    .replace(/\r/g, "")
    .split("\n");
  const out = [];
  let buffer = "";

  const flush = () => {
    const value = compactText(buffer);
    if (value) out.push(value);
    buffer = "";
  };

  const isBulletLine = (line) => /^[•*-]\s*/.test(line);
  const isDateOnlyLine = (line) =>
    /^\d{4}(?:\s*[-/]\s*\d{4}|\s*[-/]\s*(?:present|current))?$|^(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}(?:\s*[-/]\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}|(?:present|current))?$/i.test(
      line,
    );
  const shouldKeepStandalone = (line) =>
    isSectionHeading(line) ||
    isBulletLine(line) ||
    isDateOnlyLine(line) ||
    /^[A-Z][A-Za-z &/(),.-]{1,70}$/.test(line);

  for (const rawLine of rawLines) {
    const line = compactText(rawLine);
    if (!line) {
      flush();
      continue;
    }

    if (shouldKeepStandalone(line)) {
      flush();
      out.push(line);
      continue;
    }

    if (!buffer) {
      buffer = line;
      continue;
    }

    const previousEndsSentence = /[.!?:]$/.test(buffer);
    const currentStartsSentence = /^[A-Z0-9(]/.test(line);
    if (previousEndsSentence || currentStartsSentence) {
      buffer = `${buffer} ${line}`;
    } else {
      buffer = `${buffer} ${line}`;
    }
  }

  flush();
  return out.join("\n");
}

function inferCareerTracks(
  { skills = [], jobTitles = [], preferredRoles = [], industries = [], text = "" } = {},
  limit = 4,
) {
  const mergedText = compactText(
    [
      text,
      ...asArray(skills),
      ...asArray(jobTitles),
      ...asArray(preferredRoles),
      ...asArray(industries),
    ].join(" "),
  );
  return uniqueList(
    CAREER_TRACKS.filter((track) => track.test.test(mergedText)).map(
      (track) => track.id,
    ),
    limit,
  );
}

function rolesForTracks(trackIds = [], limit = 8) {
  return uniqueList(
    trackIds.flatMap(
      (trackId) =>
        CAREER_TRACKS.find((track) => track.id === trackId)?.roles || [],
    ),
    limit,
  );
}

function industriesForTracks(trackIds = [], limit = 6) {
  return uniqueList(
    trackIds.flatMap(
      (trackId) =>
        CAREER_TRACKS.find((track) => track.id === trackId)?.industries || [],
    ),
    limit,
  );
}

function evaluateRoleAlignment(profile, job, jobSkills = []) {
  const profileTracks = inferCareerTracks({
    skills: profile?.topSkills || [],
    jobTitles: profile?.jobTitles || [],
    preferredRoles: profile?.preferredRoles || [],
    industries: profile?.industries || [],
    text: `${profile?.summary || ""} ${profile?.education || ""}`,
  });
  const jobTracks = inferCareerTracks({
    skills: [...(jobSkills || []), ...(job?.tags || [])],
    jobTitles: [job?.title || ""],
    text: `${job?.title || ""} ${job?.description || ""} ${job?.company || ""}`,
  });

  if (!profileTracks.length || !jobTracks.length) {
    return { scoreAdjustment: 0, overlap: [], mismatch: false };
  }

  const overlap = jobTracks.filter((track) => profileTracks.includes(track));
  if (overlap.length) {
    return {
      scoreAdjustment: 16 + Math.min(8, (overlap.length - 1) * 4),
      overlap,
      mismatch: false,
    };
  }

  const related = jobTracks.some((jobTrack) => {
    const jobConfig = CAREER_TRACKS.find((track) => track.id === jobTrack);
    return profileTracks.some((profileTrack) =>
      jobConfig?.related?.includes(profileTrack),
    );
  });

  return {
    scoreAdjustment: related ? -8 : -28,
    overlap: [],
    mismatch: !related,
  };
}

function extractSkillsFromText(text, limit = 20) {
  const fullText = String(text || "");

  // Step 1: Extract skills EXPLICITLY listed in the skills section (highest priority)
  const skillsSectionLines = extractSectionLines(fullText, [
    "skills",
    "key skills",
    "core skills",
    "core competencies",
    "strengths",
    "tools",
    "technical skills",
  ]);
  const sectionSkills = [];
  for (const line of skillsSectionLines) {
    // Items may be comma/pipe separated on one line, or one per line
    const parts = line.split(/[|,;/]/g).map(v => normalizeSkillName(cleanLine(v))).filter(Boolean);
    if (parts.length === 1 && parts[0].length > 2) {
      // Single item per line — check if it matches a known skill pattern
      const lineText = parts[0];
      for (const [skill, pattern] of SKILL_PATTERNS) {
        if (pattern.test(lineText)) { sectionSkills.push(skill); break; }
      }
      // Also keep the raw normalized name (may be a new skill)
      sectionSkills.push(lineText);
    } else {
      sectionSkills.push(...parts);
    }
  }

  // Step 2: Pattern-scan the full text for all known skills
  const patternSkills = [];
  for (const [skill, pattern] of SKILL_PATTERNS) {
    if (pattern.test(fullText)) patternSkills.push(skill);
  }

  // Step 3: Inline skills from experience/project/cert sections (lower priority)
  const otherSectionLines = extractSectionLines(fullText, [
    "experience",
    "work experience",
    "internship experience",
    "projects",
    "certifications",
    "certificates",
  ]);
  const otherInlineSkills = otherSectionLines.flatMap((line) =>
    line.split(/[|,;/]/g).map((value) => normalizeSkillName(cleanLine(value))),
  );

  // Merge: section-listed skills first, then pattern-detected, then others
  const mergedSkills = [...sectionSkills, ...patternSkills, ...otherInlineSkills];
  // Filter out business/operations false positives when strong tech signals present
  if (/javascript|react|node(?:\.js)?|typescript|python|java|c\+\+|\.net|php|ruby|go|rust|docker|kubernetes|aws|azure|gcp|api|graphql|sql|nosql|mongodb|postgresql|linux|unix|bash|git|ci\/cd|devops|terraform|ansible|jenkins|html|css|sass|scss|tailwind|bootstrap|next\.js|express|django|flask|spring|react native|flutter|swift|kotlin|android|ios/i.test(fullText)) {
    const businessNoise = new Set(["Operations Management", "Administrative Support", "Data Entry", "Procurement", "HR Operations", "Finance Operations"]);
    return uniqueSkills(mergedSkills.filter(s => !businessNoise.has(s)), limit);
  }
  return uniqueSkills(mergedSkills, limit);
}

function extractCandidateName(text) {
  const blocked =
    /@|https?:|linkedin|github|portfolio|resume|curriculum|developer|engineer|analyst|manager|student|\d{4,}/i;

  for (const raw of splitLines(text).slice(0, 12)) {
    const line = cleanLine(raw).replace(/[^a-zA-Z .'-]/g, " ").trim();
    const words = line.split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.length > 4 || blocked.test(line)) continue;
    return line.toLowerCase().replace(/\b[a-z]/g, (char) => char.toUpperCase());
  }

  return "Candidate";
}

function extractYearsExperience(text) {
  const numberWords = new Map(
    [
      ["one", 1],
      ["two", 2],
      ["three", 3],
      ["four", 4],
      ["five", 5],
      ["six", 6],
      ["seven", 7],
      ["eight", 8],
      ["nine", 9],
      ["ten", 10],
      ["eleven", 11],
      ["twelve", 12],
      ["thirteen", 13],
      ["fourteen", 14],
      ["fifteen", 15],
      ["sixteen", 16],
      ["seventeen", 17],
      ["eighteen", 18],
      ["nineteen", 19],
      ["twenty", 20],
    ].map(([word, value]) => [word, value]),
  );
  const toNumber = (value) => {
    const normalized = String(value || "").toLowerCase();
    return numberWords.get(normalized) || Number(normalized);
  };
  const fullText = String(text || "");
  const explicit = [
    ...fullText.matchAll(
      /\b(\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp|expertise|background|practice|work|professional(?:\s+experience)?)\b/gi,
    ),
    ...fullText.matchAll(
      /\b(?:with|having|over|more than|around|nearly|approximately)\s+(\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\+?\s*(?:years?|yrs?)\b/gi,
    ),
  ]
    .map((match) => toNumber(match[1]))
    .filter((value) => Number.isFinite(value));

  if (explicit.length) return Math.max(...explicit);

  const workText = compactText(
    extractSectionLines(text, EXPERIENCE_SECTION_HEADINGS).join(" "),
  );
  const likelyInternshipOnly =
    /\bintern(?:ship)?\b/i.test(workText) &&
    !/\b(manager|director|lead|principal|staff|head|senior|specialist|analyst|associate|coordinator|executive|consultant|engineer|developer|designer|architect|teacher|professor|accountant|recruiter|administrator|officer|scientist|technician|advisor|bookkeeper|nurse|supervisor)\b/i.test(
      workText,
    );

  if (!likelyInternshipOnly) {
    const ranges = [
      ...workText.matchAll(
        /\b((?:19|20)\d{2})\s*[–-]\s*((?:19|20)\d{2}|present|current|ongoing)\b/gi,
      ),
    ];
    if (ranges.length) {
      const parsed = ranges
        .map((match) =>
          /present|current|ongoing/i.test(match[2])
            ? new Date().getFullYear()
            : Number(match[2]),
        )
        .filter((year) => Number.isFinite(year));
      if (parsed.length >= 2) {
        return Math.max(0, Math.min(20, Math.max(...parsed) - Math.min(...parsed)));
      }
    }
  }

  return 0;
}

function extractJobTitles(text) {
  const found = collectGenericJobTitles(text);
  for (const [role, pattern] of ROLE_PATTERNS) {
    if (pattern.test(text)) found.push(role);
  }
  return uniqueList(found, 8);
}

function inferPreferredRoles(skills, jobTitles, text = "") {
  const mergedText = `${text} ${(skills || []).join(" ")} ${(jobTitles || []).join(" ")}`;
  const roles = [];
  const trackRoles = rolesForTracks(
    inferCareerTracks({
      skills,
      jobTitles,
      text: mergedText,
    }),
    8,
  );
  for (const [role, pattern] of ROLE_PATTERNS) {
    if (pattern.test(mergedText)) roles.push(role);
  }

  const skillSet = new Set((skills || []).flatMap((value) => skillKeysForCandidate(value)));
  const has = (skill) => skillSet.has(skillKey(skill));
  const hasAny = (...values) => values.some((skill) => has(skill));
  if (hasAny("Nutrition", "Nutrition Counseling", "Nutrition Assessment", "Clinical Nutrition")) {
    roles.unshift("Nutrition Consultant", "Dietitian", "Nutritionist");
  }
  if (hasAny("Food Preparation", "Food Service", "Kitchen Maintenance", "Food Sanitation")) {
    roles.push("Food Service Associate", "Kitchen Associate");
  }
  const hasTechSkills = hasAny("JavaScript", "React", "Node.js", "Python", "TypeScript", "HTML", "CSS", "Java", "SQL", "AWS", "Docker", "Kubernetes", "REST APIs");
  if (
    !hasTechSkills &&
    hasAny(
      "Operations Management",
      "Administrative Support",
      "MS Excel",
      "Documentation",
      "Reporting",
    )
  ) {
    roles.unshift(
      "Business Operations Analyst",
      "Business Operations Specialist",
      "Operations Executive",
    );
  }
  if (hasAny("Administrative Support", "Scheduling", "MS Office")) {
    roles.push("Administrative Assistant", "Office Administrator");
  }
  if (hasAny("Customer Service", "CRM")) {
    roles.push("Customer Support Executive");
  }
  if (hasAny("Digital Marketing", "Market Research")) {
    roles.push("Marketing Executive");
  }
  if (hasAny("Sales Strategy", "Territory Management", "Distributor Management", "Revenue Growth")) {
    roles.unshift("Sales Manager", "Regional Sales Manager", "Business Development Manager");
  } else if (hasAny("Sales", "Business Development")) {
    roles.push("Sales Executive", "Business Development Executive");
  } else if (hasAny("CRM", "Communication")) {
    roles.push("Sales Executive");
  }
  if (hasAny("Recruitment", "HR Operations")) {
    roles.push("HR Executive", "Recruiter");
  }
  if (hasAny("Finance Operations", "Procurement")) {
    roles.push("Finance Executive");
  }

  if (!roles.length || hasTechSkills) {
    if (has("React") || has("HTML") || has("CSS")) roles.push("Frontend Developer");
    if (has("Node.js") || has("Express") || has("MongoDB"))
      roles.push("Full Stack Developer");
    if (has("Python") && (has("Machine Learning") || has("Data Analysis")))
      roles.push("Data Analyst");
    if (has("AWS") || has("Docker")) roles.push("DevOps Engineer");
    if (has("IoT") || has("Embedded Systems") || has("Arduino") || has("ESP32"))
      roles.push("IoT Engineer", "Embedded Systems Intern");
  }

  return uniqueList([...trackRoles, ...roles, ...(jobTitles || [])], 6);
}

function inferIndustries(skills, jobTitles, text = "") {
  const mergedText = `${text} ${(skills || []).join(" ")} ${(jobTitles || []).join(" ")}`.toLowerCase();
  const industries = industriesForTracks(
    inferCareerTracks({
      skills,
      jobTitles,
      text: mergedText,
    }),
    6,
  );
  if (/nutrition|dietitian|dietician|dietary|wic|clinical|patient|healthcare/.test(mergedText))
    industries.push("Healthcare", "Nutrition & Wellness");
  if (/food preparation|food service|kitchen|culinary|catering|chef|sanitation/.test(mergedText))
    industries.push("Food Services", "Hospitality");
  if (/react|node|software|frontend|backend|full stack/.test(mergedText))
    industries.push("Technology", "Software");
  if (/\b(data analyst|data analytics|business intelligence|machine learning|artificial intelligence|python|sql|tableau|power bi|data scientist)\b/.test(mergedText))
    industries.push("Data & AI");
  if (/cloud|aws|docker|kubernetes|devops/.test(mergedText)) industries.push("Cloud");
  if (/figma|ux|designer/.test(mergedText)) industries.push("Design");
  if (/business operations|administration|office|reporting|documentation|coordination|procurement/.test(mergedText))
    industries.push("Business Operations", "Administration");
  if (/marketing|digital marketing|brand|campaign/.test(mergedText))
    industries.push("Marketing");
  if (/sales|business development|lead generation/.test(mergedText))
    industries.push("Sales");
  if (/recruitment|human resources|talent acquisition|hr /.test(mergedText))
    industries.push("Human Resources");
  if (/finance|accounts|bookkeeping|invoicing|reconciliations?/.test(mergedText))
    industries.push("Finance");
  if (/teacher|education|faculty|lecturer|tutor/.test(mergedText))
    industries.push("Education");
  return uniqueList(industries.length ? industries : ["Professional Services"], 5);
}

function extractEducation(text) {
  const lines = extractSectionLines(text, EDUCATION_SECTION_HEADINGS);
  const degreePattern =
    /\b(?:Bachelor(?:'s)?(?:\s+of\s+[A-Za-z &]+)?|Master(?:'s)?(?:\s+of\s+[A-Za-z &]+)?|B\.?\s?Tech|B\.?\s?E\.?|M\.?\s?Tech|B\.?\s?Sc|M\.?\s?Sc|B\.?\s?Com|M\.?\s?Com|B\.?\s?A\b|M\.?\s?A\b|B\.?\s?BA|BBA|BCA|MCA|MBA|Ph\.?\s?D|Diploma|Associate(?:'s)? Degree)\b/i;
  const sectionDegree = lines.find((line) => degreePattern.test(line));
  if (sectionDegree) return compactText(sectionDegree);

  const match = String(text || "").match(
    new RegExp(`(${degreePattern.source}[^\\n]{0,140})`, "i"),
  );
  if (match) return compactText(match[1]);

  return lines.slice(0, 2).join(", ");
}

function extractGraduationYear(text) {
  const educationText = compactText(
    extractSectionLines(text, EDUCATION_SECTION_HEADINGS).join(" "),
  ) || String(text || "");
  const expected = educationText.match(
    /\b(20\d{2})\s*(?:\(|-|\s)*(?:expected|passing|graduation|graduate|passout|graduating)/i,
  );
  if (expected) return Number(expected[1]);

  const ranges = [
    ...educationText.matchAll(/\b(20\d{2})\s*[–-]\s*(20\d{2}|present|current|ongoing)\b/gi),
  ];
  if (ranges.length) {
    const years = ranges
      .map((match) =>
        /present|current|ongoing/i.test(match[2])
          ? new Date().getFullYear()
          : Number(match[2]),
      )
      .filter((year) => Number.isFinite(year));
    if (years.length) return Math.max(...years);
  }

  const years = [...educationText.matchAll(/\b(20\d{2})\b/g)].map((match) => Number(match[1]));
  return years.length ? Math.max(...years) : 0;
}

function inferStudentYear(graduationYear, text = "") {
  if (!graduationYear) return 0;
  if (graduationYear < new Date().getFullYear()) return 0;
  const degreeYears = /m\.?\s?tech|mca|master/i.test(text) ? 2 : 4;
  const now = new Date();
  const academicYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const startYear = graduationYear - degreeYears;
  return Math.max(1, Math.min(degreeYears, academicYear - startYear + 1));
}

function inferCareerStage(profile = {}) {
  const yearsExperience = Number(profile?.yearsExperience || 0);
  const graduationYear = Number(profile?.graduationYear || 0);
  const text = compactText(
    [
      profile?.summary || "",
      profile?.education || "",
      (profile?.jobTitles || []).join(" "),
      (profile?.preferredRoles || []).join(" "),
    ].join(" "),
  );
  const studentSignals = /\b(student|fresher|intern|internship|undergraduate|college|university|pursuing|bachelor|b\.?\s?tech|bba|b\.?\s?com|mba|mca|school|diploma|graduate)\b/i.test(
    text,
  );
  const seniorSignals = /\b(senior|lead|principal|staff|head|manager|director|vp|vice president|chief)\b/i.test(
    text,
  );
  const recentGrad = graduationYear > 0 && graduationYear >= new Date().getFullYear() - 1;

  if (yearsExperience >= 8) return "Senior";
  if (yearsExperience >= 3) return "Experienced";
  if (yearsExperience >= 1) return "Professional";
  if (seniorSignals) return "Experienced";
  if (studentSignals && recentGrad) return "Student / Fresher";
  if (studentSignals) return "Entry-level";
  return "Entry-level";
}

function extractProfileLocation(text) {
  const lines = splitLines(text).slice(0, 12);
  const blocked =
    /@|https?:|linkedin|github|portfolio|\+?\d[\d\s\-()]{7,}|resume|curriculum vitae/i;
  for (const raw of lines) {
    const line = cleanLine(raw);
    if (!line || blocked.test(line)) continue;
    if (/^[A-Za-z .'-]+,\s*[A-Za-z .'-]+(?:,\s*[A-Za-z .'-]+)?$/.test(line)) {
      return compactText(line);
    }
  }
  const joined = lines.join(" ");
  const match = joined.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g);
  return match ? compactText(match[0]) : "";
}

function extractObjectiveSummary(text) {
  const lines = extractSectionLines(text, [
    "summary",
    "professional summary",
    "profile",
    "objective",
    "career objective",
    "career summary",
  ]);
  const summary = compactText(lines.join(" "));
  return summary.length > 20 ? summary.substring(0, 320) : "";
}

function profileLocationParts(profile = {}) {
  const raw = compactText(profile.location || "");
  const parts = raw
    .split(",")
    .map((part) => compactText(part).toLowerCase())
    .filter(Boolean);
  const city = parts[0] || "";
  const country = parts[parts.length - 1] || "";
  return { city, country, raw: raw.toLowerCase() };
}

// Maps candidate country string to Adzuna country code + display name
const COUNTRY_MAP = {
  india: { code: "in", name: "India" },
  "united states": { code: "us", name: "United States" },
  usa: { code: "us", name: "United States" },
  "united kingdom": { code: "gb", name: "United Kingdom" },
  uk: { code: "gb", name: "United Kingdom" },
  england: { code: "gb", name: "United Kingdom" },
  australia: { code: "au", name: "Australia" },
  canada: { code: "ca", name: "Canada" },
  germany: { code: "de", name: "Germany" },
  austria: { code: "at", name: "Austria" },
  switzerland: { code: "ch", name: "Switzerland" },
  netherlands: { code: "nl", name: "Netherlands" },
  france: { code: "fr", name: "France" },
  singapore: { code: "sg", name: "Singapore" },
  "new zealand": { code: "nz", name: "New Zealand" },
  brazil: { code: "br", name: "Brazil" },
  russia: { code: "ru", name: "Russia" },
  poland: { code: "pl", name: "Poland" },
  "south africa": { code: "za", name: "South Africa" },
  mexico: { code: "mx", name: "Mexico" },
  // Indian states/cities → India
  maharashtra: { code: "in", name: "India" },
  mumbai: { code: "in", name: "India" },
  delhi: { code: "in", name: "India" },
  bangalore: { code: "in", name: "India" },
  bengaluru: { code: "in", name: "India" },
  hyderabad: { code: "in", name: "India" },
  pune: { code: "in", name: "India" },
  chennai: { code: "in", name: "India" },
  kolkata: { code: "in", name: "India" },
  gujarat: { code: "in", name: "India" },
  rajasthan: { code: "in", name: "India" },
  karnataka: { code: "in", name: "India" },
};

// European providers (Arbeitnow is pan-EU, Arbeitsamt is Germany-only)
const EU_COUNTRY_CODES = new Set(["de", "at", "ch", "nl", "fr", "pl", "be", "se", "dk", "no", "fi", "es", "it", "pt"]);

function getProfileCountryInfo(profile) {
  const { city, country, raw } = profileLocationParts(profile);
  // Try exact country match first, then city
  for (const key of [country, city, raw]) {
    const info = COUNTRY_MAP[key.toLowerCase().trim()];
    if (info) return info;
  }
  // Fallback: scan raw location for known names
  const rawLow = raw.toLowerCase();
  for (const [key, info] of Object.entries(COUNTRY_MAP)) {
    if (rawLow.includes(key)) return info;
  }
  return null; // unknown / not set
}

function locationAlignment(profile, job) {
  const candidate = profileLocationParts(profile);
  const text = compactText(`${job?.location || ""} ${job?.workType || ""}`).toLowerCase();
  if (!text) return 0;
  if (/remote|worldwide|global|anywhere/.test(text)) return 8;
  if (candidate.raw && text.includes(candidate.raw)) return 14;
  if (candidate.city && text.includes(candidate.city)) return 12;
  if (candidate.country && text.includes(candidate.country)) return 10;
  if (candidate.country === "india" && /\b(india|hyderabad|bangalore|bengaluru|pune|mumbai|delhi|gurgaon|noida|chennai|kolkata|remote india)\b/.test(text)) {
    return 10;
  }
  if (candidate.country && candidate.country !== "remote" && !/remote/.test(text)) return -8;
  return 0;
}

function extractProjects(text) {
  // Walk the raw lines to find the Projects section and extract ONLY project title lines
  const rawLines = splitLines(text);
  const wanted = ["projects", "project"];
  // Also recognise qualified project headings like "Academic Projects",
  // "Personal Projects", "Key Projects", "Major Projects", "Project Work".
  const isProjectHeading = (normalized) =>
    wanted.some((h) => normalized === h || normalized.startsWith(`${h} `)) ||
    /^(academic|personal|key|major|selected|notable|relevant|technical|college|university|capstone)\s+projects?$/.test(
      normalized,
    ) ||
    normalized === "project work" ||
    normalized === "projects undertaken";
  let inSection = false;
  const titleLines = [];

  for (const line of rawLines) {
    const normalized = normalizeHeading(line);
    const isWanted = isProjectHeading(normalized);

    if (isWanted) {
      inSection = true;
      continue;
    }

    if (inSection && isSectionHeading(line)) break;

    if (inSection) {
      // Skip bullet points (lines starting with •, *, -, →, or whitespace+bullet)
      const trimmed = line.trimStart();
      const isBullet = /^[•\*\-→\u2022\u2023\u25A0\u25E6\u2043]/.test(trimmed);
      // Skip lines that look like internship/job continuation text
      const isJobDesc =
        /^(remote|on-?site|hybrid|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4}|performed|developed|built|created|implemented|designed|led|managed|applied|completed|engaged|participated|contributed|executed)/i.test(
          trimmed,
        );
      if (!isBullet && !isJobDesc && trimmed.length > 4) {
        titleLines.push(trimmed);
      }
    }
  }

  if (titleLines.length > 0) {
    return uniqueList(
      titleLines.map((line) => {
        let name = cleanLine(line);
        // If line has | URL pattern, take just the project name before |
        const pipeIdx = name.indexOf("|");
        if (pipeIdx > 0) name = name.slice(0, pipeIdx).trim();
        // Remove trailing URL or GitHub links
        name = name.replace(/https?:\/\/\S+/g, "").trim();
        return name;
      }).filter((n) => n.length > 2 && n.length < 80),
      8,
    );
  }

  // Fallback: scan for GitHub project lines (title | github.com/...)
  const githubLines = rawLines.filter((line) => /github\.com\//i.test(line));
  if (githubLines.length > 0) {
    return uniqueList(
      githubLines.map((line) => {
        let name = cleanLine(line);
        const pipeIdx = name.indexOf("|");
        if (pipeIdx > 0) name = name.slice(0, pipeIdx).trim();
        name = name.replace(/https?:\/\/\S+/g, "").trim();
        return name;
      }).filter((n) => n.length > 2 && n.length < 80),
      8,
    );
  }

  return [];
}

function extractCertifications(text) {
  const sectionLines = extractSectionLines(text, ["certifications", "certificates"]);
  // More specific scan - require "certif" keyword or specific platforms, not just "google"
  const scanLines = splitLines(text).filter((line) => {
    const l = line.toLowerCase();
    return (
      /certif/i.test(l) ||
      /\b(coursera|udemy|edx|linkedin learning|freecodecamp|hackerrank|hackerearth)\b/i.test(l) ||
      /\b(aws certified|google certified|microsoft certified|oracle certified|azure certified)\b/i.test(l)
    );
  });
  return uniqueList(
    [...sectionLines, ...scanLines]
      .map(cleanLine)
      .filter(
        (line) =>
          line.length > 5 &&
          !isSectionHeading(line) &&
          !/^(performed|provided|required|worked|participated|monitored|registered|certified and enrolled)\b/i.test(line) &&
          line.length < 120,
      ),
    5,
  );
}

function buildSummary(profile) {
  const role = profile.preferredRoles?.[0] || profile.jobTitles?.[0] || profile.careerStage || "candidate";
  const skills = (profile.topSkills || []).slice(0, 5).join(", ");
  const exp =
    profile.yearsExperience > 0
      ? `${profile.yearsExperience} years of experience`
      : "project and internship experience";
  return compactText(
    `${profile.name || "Candidate"} is a ${role} with ${exp}${skills ? ` in ${skills}` : ""}.`,
  );
}

function detectProfileDomain(skills = [], preferredRoles = [], summary = "") {
  const text = `${preferredRoles.join(" ")} ${summary}`.toLowerCase();
  const skillText = skills.join(" ").toLowerCase();

  // Healthcare / Nutrition
  if (/nutrition|dietitian|dietician|dietary|clinical nutrition|wic|health|medical|nurse|doctor|patient|clinical|therapy|biological/i.test(text + " " + skillText)) {
    return "healthcare";
  }
  // Education
  if (/education|teacher|trainer|instructor|teaching|esl|tesol|school|college|academic/i.test(text + " " + skillText)) {
    return "education";
  }
  // Sales & Marketing
  if (/sales|marketing|revenue|crm|advertising|inbound|leads|negotiation|client acquisition|ad campaigns/i.test(text + " " + skillText)) {
    return "sales_marketing";
  }
  // Finance & Legal
  if (/finance|accounts|bookkeeping|procurement|invoicing|cpa|cfa|secures|tax|law|legal|compliance|audit/i.test(text + " " + skillText)) {
    return "finance_legal";
  }
  // Tech / Engineering (before Creative to avoid "writing" or "designer" false matches)
  if (/developer|engineer|software|full.?stack|frontend|backend|react|node(?:\.js)?|javascript|typescript|python|java|c\+\+|\.net|php|ruby|swift|kotlin|go|rust|api|docker|kubernetes|cloud|aws|azure|devops|agile|scrum|ci\/cd|git|rest|graphql|sql|database|mobile|android|ios|programming|coding|algorithm|data.?structure|microservice|serverless|terraform|ansible|jenkins|linux|unix|bash/i.test(text + " " + skillText)) {
    return "tech_engineering";
  }
  // Creative
  if (/creative|designer|ux|ui|figma|adobe|copywriter|writing|graphics|art|animator/i.test(text + " " + skillText)) {
    return "creative";
  }
  // Trades & Logistics
  if (/cdl|osha|forklift|logistics|warehouse|shipping|supply chain|driver|operator|mechanic/i.test(text + " " + skillText)) {
    return "trades_logistics";
  }
  // Business Operations
  if (/operations|admin|administrative|coordination|project management|pmp|agile|scrum|coordinator/i.test(text + " " + skillText)) {
    return "business_operations";
  }
  // Default to Tech/Engineering
  return "tech_engineering";
}

function sanitizeProfile(profile = {}, fallback = {}) {
  const profileSummary = compactText(profile.summary);
  const fallbackSummary = compactText(fallback.summary);
  const profileSkills = asArray(profile.topSkills);
  const fallbackSkills = asArray(fallback.topSkills);
  const profileSkillKeys = new Set(profileSkills.flatMap((skill) => skillKeysForCandidate(skill)));
  const fallbackSkillKeys = new Set(fallbackSkills.flatMap((skill) => skillKeysForCandidate(skill)));
  const skillOverlap = [...profileSkillKeys].filter((key) => fallbackSkillKeys.has(key)).length;
  const fallbackDominatesProfileSkills =
    fallbackSkills.length >= 6 &&
    (profileSkills.length < 4 ||
      fallbackSkills.length >= profileSkills.length + 4 ||
      (profileSkills.length > 0 && skillOverlap === profileSkillKeys.size));
  const preferFallbackSkills =
    fallbackSkills.length >= 3 &&
    (profileSkills.length < 3 || skillOverlap === 0 || fallbackDominatesProfileSkills);
  const profileRoles = asArray(profile.preferredRoles);
  const fallbackRoles = asArray(fallback.preferredRoles);
  const nonTechRole = /(nutrition|diet|food|kitchen|chef|catering|health|clinical|hospitality|sales|marketing|finance|account|teacher|education|nurse|medical)/i;
  const genericTechRole = /(observability|software engineer|developer|engineer|technology|data analyst|data scientist|devops|cloud)/i;
  const preferFallbackRoles =
    fallbackRoles.length > 0 &&
    (preferFallbackSkills ||
      !profileRoles.length ||
      (fallbackRoles.some((role) => nonTechRole.test(role)) &&
        profileRoles.every((role) => genericTechRole.test(role))));
  const profileIndustries = asArray(profile.industries);
  const fallbackIndustries = asArray(fallback.industries);
  const techIndustry = /^(technology|software|data & ai|cloud|design)$/i;
  const preferFallbackIndustries =
    fallbackIndustries.length > 0 &&
    (preferFallbackSkills ||
      (fallbackIndustries.some((industry) => !techIndustry.test(industry)) &&
        profileIndustries.length > 0 &&
        profileIndustries.every((industry) => techIndustry.test(industry))));
  const profileYears = Number(profile.yearsExperience);
  const fallbackYears = Number(fallback.yearsExperience);
  const yearsExperience =
    Number.isFinite(fallbackYears) &&
    fallbackYears > 0 &&
    (!Number.isFinite(profileYears) || profileYears === 0 || profileYears > fallbackYears + 3) &&
    preferFallbackSkills
      ? Math.max(0, fallbackYears)
      : Number.isFinite(profileYears)
        ? Math.max(0, profileYears)
        : Number(fallback.yearsExperience) || 0;

  const merged = {
    name: compactText(profile.name) || compactText(fallback.name) || "Candidate",
    yearsExperience,
    topSkills: uniqueSkills(
      preferFallbackSkills
        ? [...fallbackSkills, ...profileSkills]
        : [...profileSkills, ...fallbackSkills],
      20,
    ),
    jobTitles: uniqueList(
      [...asArray(profile.jobTitles), ...asArray(fallback.jobTitles)],
      8,
    ),
    preferredRoles: uniqueList(
      preferFallbackRoles
        ? [...fallbackRoles, ...profileRoles]
        : [...profileRoles, ...fallbackRoles],
      6,
    ),
    industries: uniqueList(
      preferFallbackIndustries
        ? [...fallbackIndustries, ...profileIndustries]
        : [...profileIndustries, ...fallbackIndustries],
      5,
    ),
    education: compactText(profile.education) || compactText(fallback.education),
    location: compactText(profile.location) || compactText(fallback.location),
    graduationYear:
      Number(profile.graduationYear) || Number(fallback.graduationYear) || 0,
    studentYear: Number(profile.studentYear) || Number(fallback.studentYear) || 0,
    projects: (() => {
      // Prefer AI-extracted projects if they look like real project names (short, no dates/descriptions)
      const aiProjects = asArray(profile.projects).map((p) => compactText(String(p || "")));
      const goodAiProjects = aiProjects.filter(
        (p) =>
          p.length > 2 &&
          p.length < 80 &&
          !/^(remote|on-?site|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4}|performed|developed|built|created|implemented|engaged|participated|contributed)/i.test(
            p,
          ),
      );
      if (goodAiProjects.length >= 2) return uniqueList(goodAiProjects, 8);
      // Merge AI + local if AI alone is insufficient
      const localProjects = asArray(fallback.projects).filter(
        (p) =>
          p.length > 2 &&
          p.length < 80 &&
          !/^(remote|on-?site|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4}|performed|developed|built|created|implemented|engaged|participated|contributed)/i.test(
            p,
          ),
      );
      return uniqueList([...goodAiProjects, ...localProjects], 8);
    })(),
    certifications: uniqueList(
      [...asArray(profile.certifications), ...asArray(fallback.certifications)],
      5,
    ),
  };

  const contextSkills = extractSkillsFromText(
    `${profileSummary} ${fallbackSummary} ${merged.education || ""} ${(merged.jobTitles || []).join(" ")} ${(merged.preferredRoles || []).join(" ")}`,
    20,
  );
  merged.topSkills = uniqueSkills(
    preferFallbackSkills
      ? [...merged.topSkills, ...contextSkills]
      : [...contextSkills, ...merged.topSkills],
    20,
  );

  const extraRoles = inferPreferredRoles(
    merged.topSkills,
    merged.jobTitles,
    `${profileSummary} ${fallbackSummary} ${merged.education || ""}`,
  );
  // Prefer already-detected roles; only append extras that don't dilute
  merged.preferredRoles = uniqueList(
    merged.preferredRoles.length >= 2
      ? [...merged.preferredRoles, ...extraRoles]
      : [...extraRoles, ...merged.preferredRoles],
    6,
  );
  merged.industries = uniqueList(
    [
      ...merged.industries,
      ...inferIndustries(
        merged.topSkills,
        merged.jobTitles,
        `${profileSummary} ${fallbackSummary} ${merged.education || ""}`,
      ),
    ],
    5,
  );
  merged.careerStage =
    compactText(profile.careerStage) || compactText(fallback.careerStage) || inferCareerStage(merged);
  if (!merged.studentYear && merged.graduationYear) {
    merged.studentYear = inferStudentYear(merged.graduationYear, merged.education);
  }

  const summaryMatchesFallback =
    !preferFallbackSkills ||
    fallbackSkills
      .slice(0, 4)
      .some((skill) => profileSummary.toLowerCase().includes(String(skill).toLowerCase().split(" ")[0]));
  merged.summary =
    summaryMatchesFallback && profileSummary
      ? profileSummary
      : fallbackSummary || buildSummary(merged);

  // Domain detection
  merged.domain = detectProfileDomain(merged.topSkills, merged.preferredRoles, merged.summary);

  return merged;
}

function buildLocalProfile(resumeText) {
  const skills = extractSkillsFromText(resumeText, 20);
  const jobTitles = extractJobTitles(resumeText);
  const graduationYear = extractGraduationYear(resumeText);
  // Determine preferred roles; for senior sales profiles, ensure Sales Manager roles lead
  let preferredRoles = inferPreferredRoles(skills, jobTitles, resumeText);
  const hasSalesManagerIndicator = skills.some(s =>
    /sales strategy|territory management|distributor management|revenue growth/i.test(s)
  ) || jobTitles.some(t => /regional sales manager|area sales manager|sales manager|business development manager/i.test(t))
    || /regional sales manager|area sales manager|national sales manager|sales and business development manager/i.test(resumeText);
  if (hasSalesManagerIndicator && !preferredRoles.some(r => /sales manager|business development manager|regional sales/i.test(r))) {
    preferredRoles = ["Sales Manager", "Regional Sales Manager", "Business Development Manager", ...preferredRoles].slice(0, 6);
  }
  const profile = {
    name: extractCandidateName(resumeText),
    yearsExperience: extractYearsExperience(resumeText),
    topSkills: skills,
    jobTitles,
    preferredRoles,
    industries: inferIndustries(skills, jobTitles, resumeText),
    education: extractEducation(resumeText),
    location: extractProfileLocation(resumeText),
    graduationYear,
    studentYear: inferStudentYear(graduationYear, resumeText),
    projects: extractProjects(resumeText),
    certifications: extractCertifications(resumeText),
  };
  profile.careerStage = inferCareerStage(profile);
  profile.summary = extractObjectiveSummary(resumeText) || buildSummary(profile);
  return sanitizeProfile(profile);
}

function inferExperienceLevel(text) {
  const value = String(text || "").toLowerCase();
  if (/\bintern(ship)?\b/.test(value)) return "Internship";
  if (/\b(senior|lead|principal|staff|architect|manager|director|head)\b/.test(value))
    return "Senior";
  if (/\b(junior|entry|graduate|fresher|associate|trainee|campus|apprentice)\b/.test(value))
    return "Entry-level";
  return "Mid-level";
}

function isStudentProfile(profile) {
  const stage = compactText(profile?.careerStage || inferCareerStage(profile)).toLowerCase();
  return stage === "student / fresher" || stage === "entry-level";
}

function isSeniorJob(job) {
  const text = `${job?.title || ""} ${job?.description || ""}`;
  return /\b(senior|lead|principal|staff|architect|manager|director|head)\b/i.test(text);
}

function isEntryFriendlyJob(job) {
  const text = `${job?.title || ""} ${job?.description || ""} ${job?.jobType || ""}`;
  return /\b(intern(?:ship)?|junior|entry|graduate|fresher|trainee|campus|apprentice|0\s*[-+to]{0,4}\s*1\s*year|0\s*[-+to]{0,4}\s*2\s*years?)\b/i.test(
    text,
  );
}

function isInternshipText(text) {
  return /\b(?:intern(?:ship)?|trainee|apprentice)\b/i.test(String(text || ""));
}

function requiredGraduationYear(job) {
  const text = `${job?.title || ""} ${job?.description || ""}`;
  const classOf = text.match(/\b(?:class of|batch of|graduating(?: in)?|graduates? of)\s*(20\d{2})\b/i);
  if (classOf) return Number(classOf[1]);
  const years = [...text.matchAll(/\b(20\d{2})\b/g)].map((match) => Number(match[1]));
  if (/final[-\s]?year|recent graduate|fresh graduate|new graduate/i.test(text) && years.length) {
    return Math.min(...years.filter((year) => year >= new Date().getFullYear()));
  }
  return 0;
}

function isFinalYearOnlyJob(job) {
  const text = `${job?.title || ""} ${job?.description || ""}`;
  return /final[-\s]?year students?|recent graduates?|fresh graduates?|new graduates?|last[-\s]?year students?|penultimate year/i.test(
    text,
  );
}

function isEligibilityMismatch(profile, job) {
  if (!isStudentProfile(profile)) return false;
  const studentYear = Number(profile?.studentYear || 0);
  const graduationYear = Number(profile?.graduationYear || 0);
  const requiredYear = requiredGraduationYear(job);
  const finalYearOnly = isFinalYearOnlyJob(job);

  if (requiredYear && graduationYear && requiredYear !== graduationYear) return true;
  if (finalYearOnly && studentYear > 0 && studentYear < 4) return true;
  return false;
}

function normalizeJobForFiltering(job) {
  const description = cleanJobDescription(job.description || job.snippet || job.summary || "");
  return {
    ...job,
    title: compactText(job.title),
    company: compactText(job.company) || "Company",
    location: compactText(job.location) || "Remote",
    description,
    applyUrl: compactText(job.applyUrl || job.url || job.link),
    requiredSkills: uniqueSkills(job.requiredSkills || job.tags || [], 14),
    tags: uniqueSkills(job.tags || job.requiredSkills || [], 8),
  };
}

function filterJobsForProfile(profile, jobs) {
  const student = isStudentProfile(profile);
  const normalized = (jobs || [])
    .map(normalizeJobForFiltering)
    .filter(
      (job) =>
        job.title &&
        job.applyUrl &&
        !isUnavailableJob(job) &&
        !isEligibilityMismatch(profile, job),
    );

  if (!student) return normalized;

  const filtered = normalized.filter((job) => !isSeniorJob(job) || isEntryFriendlyJob(job));
  return filtered.length >= 6 ? filtered : normalized.filter((job) => !isSeniorJob(job));
}

function sharedWordCount(left, right) {
  const stop = new Set(["and", "the", "for", "with", "developer", "engineer"]);
  const a = new Set(
    compactText(left)
      .toLowerCase()
      .match(/[a-z][a-z0-9+#.]*/g)
      ?.filter((word) => word.length > 2 && !stop.has(word)) || [],
  );
  const b =
    compactText(right)
      .toLowerCase()
      .match(/[a-z][a-z0-9+#.]*/g)
      ?.filter((word) => word.length > 2 && !stop.has(word)) || [];
  return b.filter((word) => a.has(word)).length;
}

function scoreJobsLocally(profile, rawJobs) {
  const candidateSkills = uniqueSkills(profile?.topSkills || [], 20);
  const candidateSet = new Set(candidateSkills.flatMap((skill) => skillKeysForCandidate(skill)));
  const roles = uniqueList([...(profile?.preferredRoles || []), ...(profile?.jobTitles || [])], 8);
  const student = isStudentProfile(profile);

  return rawJobs.map((job) => {
    const description = cleanJobDescription(job.description || "");
    const jobText = `${job.title || ""} ${description} ${job.company || ""} ${(job.tags || []).join(" ")}`;
    const inferredSkills = extractSkillsFromText(jobText, 14);
    const roleSkills = targetSkillsForTitle(job.title || "", { ...job, description });
    const jobSkills = uniqueSkills(
      [...(job.requiredSkills || []), ...(job.tags || []), ...inferredSkills, ...roleSkills],
      14,
    );
    const hasSkill = (skill) =>
      skillKeysForCandidate(skill).some((key) => candidateSet.has(key));
    const matchedSkills = jobSkills.filter(hasSkill);
    const missingSkills = jobSkills.filter((skill) => !hasSkill(skill));
    const roleBonus = roles.some((role) => sharedWordCount(role, job.title) > 0) ? 10 : 0;
    const preferredRoleBonus = roles.some(
      (role) => sharedWordCount(role, `${job.title || ""} ${description}`) >= 2,
    )
      ? 8
      : 0;
    const roleAlignment = evaluateRoleAlignment(profile, { ...job, description }, jobSkills);
    const locationBonus = locationAlignment(profile, job);
    const expLevel = inferExperienceLevel(`${job.title || ""} ${description}`);
    const entryBonus = student && isEntryFriendlyJob({ ...job, description }) ? 12 : 0;
    const expPenalty =
      student && expLevel === "Senior" ? 42 : student && expLevel === "Mid-level" ? 12 : 0;
    const eligibilityPenalty = isEligibilityMismatch(profile, { ...job, description }) ? 55 : 0;
    // Country mismatch penalty: non-remote job in a different country gets penalized
    const countryMismatchPenalty = (locationBonus < 0) ? 12 : 0;
    // Scale skill bonus: max 5 matched skills count; each worth 5 points (max 25 bonus)
    const skillBonus = Math.min(matchedSkills.length, 5) * 5;
    // Role match bonus: only if job title directly relates to candidate's primary role
    const directRoleMatch = roles.some((role) => sharedWordCount(role, job.title) >= 2);
    const directRoleBonus = directRoleMatch ? 14 : 0;
    // missingSkills penalty increases with more gaps
    const missingPenalty = Math.min(missingSkills.length * 5, 20);
    let score = Math.min(
      93,
      Math.max(
        30,
        36 +
          skillBonus +
          (directRoleMatch ? directRoleBonus : roleBonus) +
          (directRoleMatch ? 0 : preferredRoleBonus) +
          roleAlignment.scoreAdjustment +
          locationBonus +
          entryBonus -
          missingPenalty -
          expPenalty -
          eligibilityPenalty -
          countryMismatchPenalty,
      ),
    );
    if (student && expLevel === "Senior") score = Math.min(score, 58);
    if (student && !isEntryFriendlyJob({ ...job, description })) score = Math.min(score, 62);
    if (roleAlignment.mismatch) score = Math.min(score, 58);

    return {
      id: job.sourceId || uuidv4(),
      title: job.title,
      company: job.company,
      location: job.location,
      workType: job.workType || (/remote/i.test(jobText) ? "Remote" : "On-site"),
      jobType: job.jobType || (/\bintern(ship)?\b/i.test(jobText) ? "Internship" : "Full-time"),
      salaryMin: job.salaryMin || 0,
      salaryMax: job.salaryMax || 0,
      matchScore: score,
      tags: uniqueSkills([...matchedSkills, ...missingSkills, ...inferredSkills], 5),
      description,
      posted: job.posted || "Recently",
      requiredSkills: jobSkills,
      matchedSkills: matchedSkills.slice(0, 8),
      missingSkills: missingSkills.slice(0, 6),
      experienceLevel: expLevel,
      interviewLikelihood: score >= 85 ? "High" : score >= 70 ? "Medium" : "Low",
      applyUrl: job.applyUrl,
      source: job.source || "Web",
    };
  });
}

function targetSkillsForTitle(title, job = {}) {
  const roleText = `${title || ""} ${job.title || ""} ${job.description || ""}`;
  const roleSkills = ROLE_SKILLS.find((item) => item.test.test(roleText))?.skills || [];
  return uniqueSkills(
    [
      ...(job.requiredSkills || []),
      ...(job.missingSkills || []),
      ...extractSkillsFromText(roleText, 12),
      ...roleSkills,
    ],
    12,
  );
}

function resourcesForSkill(skill) {
  if (RESOURCE_BY_SKILL[skill]) return [RESOURCE_BY_SKILL[skill]];
  return [
    {
      name: `${skill} learning path`,
      type: "Tutorial",
      url: `https://www.freecodecamp.org/search?query=${encodeURIComponent(skill)}`,
      free: true,
    },
  ];
}

function localDreamJobGap(profile, dreamJob) {
  const targetSkills = targetSkillsForTitle(dreamJob);
  const candidateSet = new Set((profile?.topSkills || []).flatMap((skill) => skillKeysForCandidate(skill)));
  const hasSkill = (skill) => skillKeysForCandidate(skill).some((key) => candidateSet.has(key));
  const missing = targetSkills.filter((skill) => !hasSkill(skill));
  const strengths = uniqueSkills(
    (profile?.topSkills || []).filter((skill) =>
      targetSkills.some((target) => skillKeysForCandidate(target).some((key) => skillKeysForCandidate(skill).includes(key))),
    ),
    5,
  );
  const currentMatch = targetSkills.length
    ? Math.round(((targetSkills.length - missing.length) / targetSkills.length) * 100)
    : 45;

  return {
    dreamJobTitle: dreamJob,
    currentMatch: Math.max(20, Math.min(95, currentMatch)),
    skillGaps: missing.slice(0, 6).map((skill, index) => ({
      skill,
      priority: index < 2 ? "Essential" : index < 4 ? "Important" : "Nice-to-have",
      timeToLearn: index < 2 ? "4-6 weeks" : "2-4 weeks",
      resources: resourcesForSkill(skill),
    })),
    strengths: strengths.length ? strengths : (profile?.topSkills || []).slice(0, 5),
    timeline: missing.length > 4 ? "4-6 months" : "2-3 months",
    nextSteps: [
      `Build one portfolio project aligned with ${dreamJob}.`,
      "Fill the essential skill gaps with focused weekly practice.",
      "Update resume bullets to show measurable impact and matching keywords.",
    ],
    salaryRange: { min: 70000, max: 130000 },
    demandLevel: "High",
  };
}

function localAtsOptimize(profile, job) {
  const jobSkills = uniqueSkills(
    [
      ...(job?.requiredSkills || []),
      ...(job?.tags || []),
      ...extractSkillsFromText(`${job?.title || ""} ${job?.description || ""}`, 12),
    ],
    12,
  );
  const candidateSet = new Set((profile?.topSkills || []).flatMap((skill) => skillKeysForCandidate(skill)));
  const hasSkill = (skill) => skillKeysForCandidate(skill).some((key) => candidateSet.has(key));
  const matched = jobSkills.filter(hasSkill);
  const missing = jobSkills.filter((skill) => !hasSkill(skill));
  const keywordsAdded = uniqueSkills([...missing, ...matched], 8);
  const role = job?.title || profile?.preferredRoles?.[0] || "target role";
  const topSkills = uniqueList([...(profile?.topSkills || []), ...keywordsAdded], 8);
  const score = Math.min(95, Math.max(45, 58 + matched.length * 7 - missing.length * 2));

  return {
    optimizedSummary: `${profile?.name || "Candidate"} is a ${role} candidate with hands-on experience in ${topSkills.slice(0, 5).join(", ")}. They can contribute quickly by applying role-relevant skills, clear communication, and measurable project delivery.`,
    keyBullets: [
      `Built and improved projects using ${topSkills.slice(0, 3).join(", ")} with a focus on reliable delivery.`,
      `Applied ${keywordsAdded.slice(0, 3).join(", ")} to solve practical product and engineering problems.`,
      `Collaborated across requirements, implementation, testing, and iteration to improve user outcomes.`,
    ],
    keywordsAdded,
    atsScore: score,
    tips: [
      "Mirror exact role keywords from the job description where they truthfully match your experience.",
      "Add metrics such as latency, users, revenue, time saved, or accuracy improvements.",
      "Keep formatting simple: standard headings, no tables, and concise bullet points.",
    ],
  };
}

function localSkillRoadmap(profile, job) {
  const candidateSet = new Set((profile?.topSkills || []).flatMap((skill) => skillKeysForCandidate(skill)));
  const hasSkill = (skill) => skillKeysForCandidate(skill).some((key) => candidateSet.has(key));
  const missing = uniqueSkills(
    [
      ...(job?.missingSkills || []),
      ...targetSkillsForTitle(job?.title || "", job).filter(
        (skill) => !hasSkill(skill),
      ),
    ],
    6,
  );
  const roadmap = (missing.length ? missing : ["Project depth", "Interview practice"]).map(
    (skill, index) => ({
      skill,
      priority: index + 1,
      currentLevel: hasSkill(skill) ? "Basic" : "None",
      targetLevel: index < 2 ? "Intermediate" : "Working knowledge",
      weeklyHours: index < 2 ? 5 : 3,
      durationWeeks: index < 2 ? 4 : 2,
      resources: resourcesForSkill(skill),
      milestone: `Create a small portfolio deliverable that demonstrates ${skill}.`,
    }),
  );

  return {
    roadmap,
    totalWeeks: roadmap.reduce((sum, item) => sum + item.durationWeeks, 0),
    priorityOrder: roadmap.map((item) => item.skill),
    dailyPlan: "45 minutes of focused practice on weekdays plus one weekend project block",
  };
}

function createFallbackJobs(profile) {
  const student = isStudentProfile(profile);
  const roles = uniqueList(
    [
      ...buildSearchQueries(profile).slice(0, 8),
      ...(profile?.preferredRoles || []),
      ...(profile?.jobTitles || []),
      (profile?.topSkills || []).slice(0, 3).join(" "),
      "Jobs matching resume skills",
    ],
    6,
  );
  const skills = (profile?.topSkills || []).slice(0, 5).join(", ");
  const platforms = [
    {
      company: "LinkedIn Jobs Search",
      source: "LinkedIn",
      location: "Remote / Global",
      url: (role) =>
        `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(role)}`,
    },
    {
      company: "Internshala Internship Search",
      source: "Internshala",
      location: "India / Remote",
      url: (role) =>
        `https://internshala.com/internships/keywords-${encodeURIComponent(role.toLowerCase().replace(/\s+/g, "-"))}/`,
    },
    {
      company: "Indeed Jobs Search",
      source: "Indeed",
      location: "United States",
      url: (role) => `https://www.indeed.com/jobs?q=${encodeURIComponent(role)}`,
    },
    {
      company: "Wellfound Startup Jobs",
      source: "Wellfound",
      location: "Remote / Startup",
      url: (role) => `https://wellfound.com/jobs?keyword=${encodeURIComponent(role)}`,
    },
    {
      company: "Naukri Jobs Search",
      source: "Naukri",
      location: "India",
      url: (role) =>
        `https://www.naukri.com/${encodeURIComponent(role.toLowerCase().replace(/\s+/g, "-"))}-jobs`,
    },
  ];

  return roles.flatMap((role, roleIndex) =>
    platforms.map((platform, platformIndex) => ({
      sourceId: `fallback_${roleIndex}_${platformIndex}`,
      title: role,
      company: platform.company,
      location: platform.location,
      description: `Open ${platform.source} search results for ${role} roles${skills ? ` matching skills like ${skills}` : ""}.`,
      applyUrl: platform.url(role),
      salaryMin: 0,
      salaryMax: 0,
      posted: "Live search",
      source: platform.source,
      jobType: isInternshipText(role) ? "Internship" : "Full-time",
      workType: /remote/i.test(platform.location) ? "Remote" : "On-site",
    })),
  );
}

function getMemorySavedJobs(sessionId) {
  return memorySavedJobs.get(sessionId) || [];
}

function saveMemoryJob(sessionId, job) {
  const jobId = job.id || job.jobId || uuidv4();
  const existing = getMemorySavedJobs(sessionId).filter(
    (savedJob) => savedJob.jobId !== jobId,
  );
  const savedJob = { ...job, id: job.id || jobId, jobId, sessionId, savedAt: new Date() };
  memorySavedJobs.set(sessionId, [savedJob, ...existing]);
  return savedJob;
}

function removeMemoryJob(sessionId, jobId) {
  const remaining = getMemorySavedJobs(sessionId).filter(
    (savedJob) => savedJob.jobId !== jobId && savedJob.id !== jobId,
  );
  memorySavedJobs.set(sessionId, remaining);
}

// ─── Time-ago helper ─────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  try {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days <= 0) return "Today";
    if (days === 1) return "1 day ago";
    if (days < 7) return `${days} days ago`;
    if (days < 30)
      return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? "s" : ""} ago`;
    return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? "s" : ""} ago`;
  } catch (_) {
    return "Recently";
  }
}

// ─── Fetch real jobs from Adzuna ─────────────────────────────────────────────
// Covers: US, UK, India — 8 results per country = up to 24 real jobs
function buildSearchQueries(profile) {
  const skills = uniqueSkills(profile?.topSkills || [], 12);
  const student = isStudentProfile(profile);
  const allText = `${(profile?.preferredRoles || []).join(" ")} ${(profile?.jobTitles || []).join(" ")} ${profile?.summary || ""} ${skills.join(" ")}`;
  const aiSkill = skills.some((skill) => /ai|machine learning|scikit|pandas|numpy/i.test(skill));
  const webSkill = skills.some((skill) => /react|node|javascript|typescript|html|css/i.test(skill));
  const hardwareSkill = skills.some((skill) => /iot|embedded|arduino|esp32|sensor|microcontroller/i.test(skill));
  const nutritionSkill = skills.some((skill) => /nutrition|dietitian|dietician|dietary|clinical nutrition|wic/i.test(skill));
  const foodSkill = skills.some((skill) => /food|kitchen|culinary|sanitation|catering|meal/i.test(skill));
  // salesManagerSkill must be checked BEFORE businessSkill to avoid collisions
  const salesManagerSkill = skills.some((skill) =>
    /sales strategy|territory management|distributor management|revenue growth|business development|regional sales|area sales|key account/i.test(skill),
  ) || /regional sales manager|area sales manager|sales manager|business development manager|national sales manager/i.test(allText);
  const salesSkill = !salesManagerSkill && skills.some((skill) => /\bsales\b|crm|negotiation|client acquisition/i.test(skill));
  const businessSkill = !salesManagerSkill && !salesSkill && skills.some((skill) =>
    /operations management|administrative support|documentation|coordination/i.test(skill),
  );
  const marketingSkill = !salesManagerSkill && skills.some((skill) => /marketing|market research/i.test(skill));
  const hrSkill = skills.some((skill) => /recruitment|human resources|hr operations/i.test(skill));
  const financeSkill = skills.some((skill) => /finance|accounts|bookkeeping|procurement|invoicing/i.test(skill));
  const trackRoles = rolesForTracks(
    inferCareerTracks({
      skills,
      jobTitles: profile?.jobTitles || [],
      preferredRoles: profile?.preferredRoles || [],
      industries: profile?.industries || [],
      text: `${profile?.summary || ""} ${profile?.education || ""}`,
    }),
    10,
  );
  const baseRoles = uniqueList(
    [...(profile?.preferredRoles || []), ...(profile?.jobTitles || []), ...trackRoles],
    12,
  );
  const domainRoles = [
    nutritionSkill ? "Nutrition Consultant" : "",
    nutritionSkill ? "Nutritionist" : "",
    nutritionSkill ? "Dietitian" : "",
    nutritionSkill ? "Clinical Dietitian" : "",
    foodSkill ? "Food Service" : "",
    foodSkill ? "Kitchen Associate" : "",
    foodSkill ? "Catering Assistant" : "",
    salesManagerSkill ? "Sales Manager" : "",
    salesManagerSkill ? "Regional Sales Manager" : "",
    salesManagerSkill ? "Business Development Manager" : "",
    salesManagerSkill ? "Area Sales Manager" : "",
    salesManagerSkill ? "Key Account Manager" : "",
    salesSkill ? "Sales Executive" : "",
    salesSkill ? "Business Development Executive" : "",
    businessSkill ? "Business Operations Analyst" : "",
    businessSkill ? "Business Operations Specialist" : "",
    businessSkill ? "Operations Executive" : "",
    marketingSkill ? "Marketing Executive" : "",
    hrSkill ? "HR Executive" : "",
    financeSkill ? "Finance Executive" : "",
    hardwareSkill ? "Embedded Systems" : "",
    hardwareSkill ? "IoT Engineer" : "",
    webSkill ? "Frontend Developer" : "",
    webSkill ? "Full Stack Developer" : "",
    aiSkill ? "Machine Learning" : "",
    aiSkill ? "AI Engineer" : "",
  ].filter(Boolean);
  const roles = uniqueList([...baseRoles, ...domainRoles], 14);
  const skillPhrase = skills.slice(0, 3).join(" ");
  const preferredRole = compactText(profile?.preferredRoles?.[0] || profile?.jobTitles?.[0] || "");
  const internshipRole = (role) => (isInternshipText(role) ? role : `${role} intern`);

  if (!student) {
    return uniqueList(
      [
        preferredRole,
        ...roles,
        salesManagerSkill ? "sales business development manager" : "",
        salesManagerSkill ? "sales manager FMCG" : "",
        nutritionSkill ? "nutrition wellness" : "",
        foodSkill ? "food preparation kitchen" : "",
        businessSkill ? "business operations administration" : "",
        marketingSkill ? "marketing communication" : "",
        hrSkill ? "human resources recruitment" : "",
        financeSkill ? "finance operations accounts" : "",
        skillPhrase,
      ].filter(Boolean),
      18,
    );
  }

  return uniqueList(
    [
      preferredRole ? `${preferredRole} internship` : "",
      ...roles.map(internshipRole),
      ...roles.map((role) => `entry level ${role}`),
      ...roles.map((role) => `junior ${role}`),
      nutritionSkill ? "nutrition intern" : "",
      nutritionSkill ? "dietitian intern" : "",
      foodSkill ? "food service intern" : "",
      businessSkill ? "business operations intern" : "",
      businessSkill ? "operations intern" : "",
      businessSkill ? "administrative intern" : "",
      businessSkill ? "business analyst intern" : "",
      businessSkill ? "operations coordinator" : "",
      marketingSkill ? "marketing intern" : "",
      hrSkill ? "hr intern" : "",
      financeSkill ? "finance intern" : "",
      aiSkill ? "machine learning intern" : "",
      aiSkill ? "AI intern" : "",
      hardwareSkill ? "embedded systems intern" : "",
      hardwareSkill ? "iot intern" : "",
      hardwareSkill ? "hardware programming intern" : "",
      webSkill ? "frontend developer intern" : "",
      webSkill ? "full stack developer intern" : "",
      webSkill || aiSkill ? "software engineer intern" : "",
      webSkill || aiSkill ? "graduate software engineer" : "",
      skillPhrase ? `${skillPhrase} intern` : "",
    ].filter(Boolean),
    24,
  );
}

function parseSalary(value) {
  if (typeof value === "number") return value;
  const match = String(value || "").match(/(\d[\d,]*)/);
  return match ? Number(match[1].replace(/,/g, "")) : 0;
}

function xmlValue(xml, tag) {
  const match = String(xml || "").match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? stripHtml(match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")) : "";
}

function parseXmlFeedJobs(xml, source) {
  const blocks = String(xml || "").match(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi) || [];
  return blocks.slice(0, 20).map((block, index) => {
    const link =
      xmlValue(block, "link") ||
      (block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] || "");
    return {
      sourceId: `${source.toLowerCase().replace(/\W+/g, "_")}_${index}`,
      title: xmlValue(block, "title"),
      company: xmlValue(block, "company") || source,
      location: xmlValue(block, "location") || "Remote",
      description: cleanJobDescription(
        xmlValue(block, "description") || xmlValue(block, "summary") || xmlValue(block, "content"),
      ),
      applyUrl: link,
      salaryMin: parseSalary(xmlValue(block, "salary")),
      salaryMax: 0,
      posted: xmlValue(block, "pubDate") || xmlValue(block, "updated") || "Recently",
      source,
      jobType: isInternshipText(block) ? "Internship" : "Full-time",
      workType: /remote/i.test(block) ? "Remote" : "On-site",
    };
  });
}

async function fetchAdzunaJobs(query, isStudent = false, candidateCountryCode = null) {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) return [];
  // Prioritize candidate's home country (up to 15 results), then supplement with global
  const homeCode = candidateCountryCode;
  let countries;
  if (homeCode) {
    // Home country gets more results; add one or two fallback markets
    const extras = homeCode === "in" ? ["gb"] : homeCode === "gb" ? ["in"] : ["in", "gb"];
    countries = [homeCode, ...extras.filter((c) => c !== homeCode)];
  } else {
    countries = ["in", "us", "gb"];
  }
  const searchQuery = query;
  const allJobs = [];

  await Promise.allSettled(
    countries.map(async (country) => {
      try {
        const resultsPerPage = country === homeCode ? "15" : "8";
        const params = new URLSearchParams({
          app_id: ADZUNA_APP_ID,
          app_key: ADZUNA_APP_KEY,
          what: searchQuery,
          results_per_page: resultsPerPage,
          max_days_old: "30",
          "content-type": "application/json",
        });
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 9000);
        const res = await fetch(
          `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`,
          { signal: controller.signal },
        );
        clearTimeout(timer);
        if (!res.ok) return;

        const data = await res.json();
        for (const j of data.results || []) {
          if (!j.redirect_url || !j.title) continue;
          const titleLow = (j.title || "").toLowerCase();
          const description = cleanJobDescription(j.description || "");
          const descLow = description.toLowerCase();
          allJobs.push({
            sourceId: `adzuna_${j.id}`,
            title: j.title,
            company: j.company?.display_name || "Company",
            location: j.location?.display_name || country.toUpperCase(),
            description,
            applyUrl: j.redirect_url,
            salaryMin: j.salary_min ? Math.round(j.salary_min) : 0,
            salaryMax: j.salary_max ? Math.round(j.salary_max) : 0,
            posted: j.created ? timeAgo(j.created) : "Recently",
            source: "Adzuna",
            jobType: isInternshipText(titleLow)
              ? "Internship"
              : j.contract_time === "part_time"
                ? "Part-time"
                : "Full-time",
            workType: descLow.includes("remote")
              ? "Remote"
              : descLow.includes("hybrid")
                ? "Hybrid"
                : "On-site",
          });
        }
      } catch (e) {
        console.error(`Adzuna[${country}] error:`, e.message);
      }
    }),
  );

  return allJobs;
}

// ─── Fetch real jobs from LinkedIn via RapidAPI ───────────────────────────────
async function fetchLinkedInJobs(titleFilter, isStudent = false, candidateCountry = null) {
  if (!RAPIDAPI_KEY) return [];
  try {
    const normalizedTitle = compactText(titleFilter)
      .replace(/\b(internship|intern|entry level|junior)\b/gi, "")
      .trim();
    const titles = uniqueList(
      [titleFilter, normalizedTitle, isStudent ? `${normalizedTitle} intern` : ""].filter(Boolean),
      3,
    );
    // Prioritize candidate's country, add Remote as supplement
    const homeLocation = candidateCountry || "India";
    const locations = [homeLocation, "Remote"].filter((v, i, a) => a.indexOf(v) === i);
    const endpoints = ["active-jb-7d", "active-jb-30d"];

    const attempts = [];
    for (const endpoint of endpoints) {
      for (const title of titles) {
        for (const location of locations) {
          const params = new URLSearchParams({
            offset: "0",
            title_filter: title,
            location_filter: location,
            description_type: "text",
          });
          attempts.push(
            fetchWithTimeout(
              `https://linkedin-job-search-api.p.rapidapi.com/${endpoint}?${params}`,
              {
                headers: {
                  "x-rapidapi-host": "linkedin-job-search-api.p.rapidapi.com",
                  "x-rapidapi-key": RAPIDAPI_KEY,
                  "Content-Type": "application/json",
                },
              },
              9000,
            )
              .then(async (res) => {
                if (!res.ok) return [];
                const data = await res.json();
                return Array.isArray(data)
                  ? data
                  : data.data || data.jobs || data.results || [];
              })
              .catch(() => []),
          );
        }
      }
    }

    const responses = await Promise.allSettled(attempts);
    const items = responses.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    );

    const seen = new Set();
    return items
      .filter((j) => {
        const key = `${j.id || j.job_id || ""}_${j.url || j.job_url || j.title || ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 15)
      .map((j) => {
        const loc = (j.location || j.job_location || "").toLowerCase();
        const emp = (j.employment_type || j.job_type || "").toLowerCase();
        const titleL = (j.title || j.job_title || "").toLowerCase();
        const applyU =
          j.url ||
          j.job_url ||
          j.apply_url ||
          j.linkedin_job_url ||
          j.external_url ||
          "";
        const description = cleanJobDescription(j.description || j.job_description || "");
        return {
          sourceId: `li_${j.id || j.job_id || uuidv4()}`,
          title: j.title || j.job_title || "",
          company: j.company || j.organization || j.company_name || "Company",
          location: j.location || j.job_location || "Remote",
          description,
          applyUrl: applyU,
          salaryMin: 0,
          salaryMax: 0,
          posted: j.date_posted || j.posted_date || "Recently",
          source: "LinkedIn",
          jobType: isInternshipText(titleL)
            ? "Internship"
            : emp.includes("part")
              ? "Part-time"
              : emp.includes("contract")
                ? "Contract"
                : "Full-time",
          workType: loc.includes("remote")
            ? "Remote"
            : loc.includes("hybrid")
              ? "Hybrid"
              : "On-site",
        };
      })
      .filter((j) => j.title && j.applyUrl);
  } catch (e) {
    console.error("LinkedIn API error:", e.message);
    return [];
  }
}

// ─── Fetch real jobs from Findwork ────────────────────────────────────────────
async function fetchFindworkJobs(keywords) {
  if (!FINDWORK_KEY) return [];
  try {
    const params = new URLSearchParams({
      search: keywords,
      sort_by: "relevance",
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`https://findwork.dev/api/jobs/?${params}`, {
      headers: { Authorization: `Token ${FINDWORK_KEY}` },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return [];

    const data = await res.json();
    return (data.results || [])
      .slice(0, 12)
      .map((j) => {
        const emp = (j.employment_type || "").toLowerCase();
        const description = cleanJobDescription(j.text || "");
        return {
          sourceId: `fw_${j.id}`,
          title: j.role || "",
          company: j.company_name || "Company",
          location: j.location || (j.remote ? "Remote" : "USA"),
          description,
          applyUrl: j.url || `https://findwork.dev/jobs/${j.id}`,
          salaryMin: 0,
          salaryMax: 0,
          posted: j.date_posted ? timeAgo(j.date_posted) : "Recently",
          source: "Findwork",
          jobType: isInternshipText(emp)
            ? "Internship"
            : emp.includes("part")
              ? "Part-time"
              : emp.includes("contract")
                ? "Contract"
                : "Full-time",
          workType: j.remote ? "Remote" : "On-site",
        };
      })
      .filter((j) => j.title && j.applyUrl);
  } catch (e) {
    console.error("Findwork API error:", e.message);
    return [];
  }
}

// ─── Fetch real jobs from Apify LinkedIn scraper (fallback) ──────────────────
async function fetchApifyLinkedInJobs(query) {
  if (!APIFY_KEY) return [];
  try {
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodedQuery}&position=1&pageNum=0&f_TPR=r604800`; // last 7 days
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000); // Apify can be slow

    const res = await fetch(
      `https://api.apify.com/v2/acts/curious_coder~linkedin-jobs-scraper/run-sync-get-dataset-items?token=${APIFY_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: 10,
          scrapeCompany: false,
          splitByLocation: false,
          urls: [searchUrl],
        }),
        signal: controller.signal,
      },
    );
    clearTimeout(timer);
    if (!res.ok) return [];

    const items = await res.json();
    return (Array.isArray(items) ? items : [])
      .slice(0, 10)
      .map((j) => {
        const emp = (j.employmentType || "").toLowerCase();
        const titleL = (j.title || "").toLowerCase();
        const description = cleanJobDescription(j.descriptionText || j.description || "");
        return {
          sourceId: `apify_${j.id || uuidv4()}`,
          title: j.title || "",
          company: j.companyName || "Company",
          location: j.location || "Remote",
          description,
          applyUrl: j.link || j.applyUrl || "",
          salaryMin: 0,
          salaryMax: 0,
          posted: j.postedAt ? timeAgo(j.postedAt) : "Recently",
          source: "LinkedIn",
          jobType: isInternshipText(titleL)
            ? "Internship"
            : emp.includes("part")
              ? "Part-time"
              : emp.includes("contract")
                ? "Contract"
                : "Full-time",
          workType: (j.location || "").toLowerCase().includes("remote")
            ? "Remote"
            : "On-site",
        };
      })
      .filter((j) => j.title && j.applyUrl);
  } catch (e) {
    console.error("Apify LinkedIn error:", e.message);
    return [];
  }
}

// ─── Score real jobs with Gemini (batch) ─────────────────────────────────────
async function fetchJoobleJobs(query, isStudent = false, candidateCountry = null) {
  if (!JOOBLE_API_KEY) return [];
  try {
    const res = await fetchWithTimeout(
      `https://jooble.org/api/${JOOBLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: query,
          location: candidateCountry || (isStudent ? "India" : ""),
          page: 1,
          ResultOnPage: 10,
        }),
      },
      9000,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.jobs || data.results || [])
      .slice(0, 12)
      .map((j) => ({
        sourceId: `jooble_${j.id || uuidv4()}`,
        title: j.title || "",
        company: j.company || "Company",
        location: j.location || "Remote",
        description: cleanJobDescription(j.snippet || j.description || ""),
        applyUrl: j.link || j.url || "",
        salaryMin: parseSalary(j.salary),
        salaryMax: 0,
        posted: j.updated ? timeAgo(j.updated) : "Recently",
        source: "Jooble",
        jobType: isInternshipText(`${j.title || ""} ${j.snippet || ""}`)
          ? "Internship"
          : "Full-time",
        workType: /remote/i.test(`${j.location || ""} ${j.snippet || ""}`) ? "Remote" : "On-site",
      }))
      .filter((j) => j.title && j.applyUrl);
  } catch (e) {
    console.error("Jooble API error:", e.message);
    return [];
  }
}

function mapJSearchItems(items) {
  return (Array.isArray(items) ? items : [])
    .slice(0, 15)
    .map((j) => {
      const text = `${j.job_title || j.title || ""} ${j.job_description || j.description || ""}`;
      return {
        sourceId: `jsearch_${j.job_id || j.id || uuidv4()}`,
        title: j.job_title || j.title || "",
        company: j.employer_name || j.company || j.company_name || "Company",
        location:
          j.job_city || j.job_location || j.location || j.job_country || "Remote",
        description: cleanJobDescription(j.job_description || j.description || ""),
        applyUrl: j.job_apply_link || j.apply_link || j.url || j.link || "",
        salaryMin: parseSalary(j.job_min_salary || j.salary_min),
        salaryMax: parseSalary(j.job_max_salary || j.salary_max),
        posted: j.job_posted_at_datetime_utc
          ? timeAgo(j.job_posted_at_datetime_utc)
          : "Recently",
        source: j.job_publisher ? `JSearch: ${j.job_publisher}` : "JSearch",
        jobType: isInternshipText(text)
          ? "Internship"
          : /contract/i.test(text)
            ? "Contract"
            : "Full-time",
        workType: j.job_is_remote || /remote/i.test(text) ? "Remote" : "On-site",
        requiredSkills: uniqueSkills(j.job_required_skills || j.required_skills || [], 12),
      };
    })
    .filter((j) => j.title && j.applyUrl);
}

async function fetchJSearchJobs(query, isStudent = false, candidateCountry = null) {
  const jobs = [];
  const locationParam = candidateCountry || (isStudent ? "India" : "Remote");

  if (JSEARCH_API_KEY) {
    try {
      const params = new URLSearchParams({
        query,
        location: locationParam,
        page: "1",
        numPages: "1",
      });
      const res = await fetchWithTimeout(
        `https://api.openwebninja.com/v1/job-search?${params}`,
        { headers: { Authorization: `Bearer ${JSEARCH_API_KEY}` } },
        9000,
      );
      if (res.ok) {
        const data = await res.json();
        jobs.push(...mapJSearchItems(data.jobs || data.data || data.results || []));
      }
    } catch (e) {
      console.error("JSearch OpenWebNinja error:", e.message);
    }
  }

  if (JSEARCH_RAPIDAPI_KEY && jobs.length < 8) {
    try {
      const locationSuffix = candidateCountry ? ` in ${candidateCountry}` : isStudent ? " in India" : "";
      const params = new URLSearchParams({
        query: `${query}${locationSuffix}`,
        page: "1",
        num_pages: "1",
        date_posted: "month",
      });
      const res = await fetchWithTimeout(
        `https://${JSEARCH_RAPIDAPI_HOST}/search?${params}`,
        {
          headers: {
            "x-rapidapi-host": JSEARCH_RAPIDAPI_HOST,
            "x-rapidapi-key": JSEARCH_RAPIDAPI_KEY,
          },
        },
        9000,
      );
      if (res.ok) {
        const data = await res.json();
        jobs.push(...mapJSearchItems(data.data || data.jobs || data.results || []));
      }
    } catch (e) {
      console.error("JSearch RapidAPI error:", e.message);
    }
  }

  return jobs.slice(0, 15);
}

async function fetchMuseJobs(query, isStudent = false) {
  try {
    const params = new URLSearchParams({
      page: "1",
      descending: "true",
    });
    if (isStudent) params.append("level", "Entry Level");
    if (THEMUSE_API_KEY) params.append("api_key", THEMUSE_API_KEY);
    const res = await fetchWithTimeout(
      `https://www.themuse.com/api/public/jobs?${params}`,
      {},
      8000,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || [])
      .filter((j) => sharedWordCount(query, `${j.name || ""} ${j.contents || ""}`) > 0)
      .slice(0, 10)
      .map((j) => ({
        sourceId: `muse_${j.id || uuidv4()}`,
        title: j.name || "",
        company: j.company?.name || "Company",
        location: j.locations?.map((loc) => loc.name).join(", ") || "Remote",
        description: cleanJobDescription(j.contents || ""),
        applyUrl: j.refs?.landing_page || j.refs?.application || "",
        salaryMin: 0,
        salaryMax: 0,
        posted: j.publication_date ? timeAgo(j.publication_date) : "Recently",
        source: "The Muse",
        jobType: isInternshipText(j.name || "") ? "Internship" : "Full-time",
        workType: /remote/i.test(`${j.locations?.map((loc) => loc.name).join(" ") || ""} ${j.contents || ""}`)
          ? "Remote"
          : "On-site",
      }))
      .filter((j) => j.title && j.applyUrl);
  } catch (e) {
    console.error("The Muse API error:", e.message);
    return [];
  }
}

async function fetchUSAJobs(query, isStudent = false) {
  if (!USAJOBS_API_KEY || !USAJOBS_USER_AGENT) return [];
  try {
    const params = new URLSearchParams({
      Keyword: query,
      ResultsPerPage: "10",
      DatePosted: "30",
      WhoMayApply: "public",
    });
    if (isStudent) params.append("HiringPath", "students;graduates");
    const res = await fetchWithTimeout(`https://data.usajobs.gov/api/Search?${params}`, {
      headers: {
        Host: "data.usajobs.gov",
        "User-Agent": USAJOBS_USER_AGENT,
        "Authorization-Key": USAJOBS_API_KEY,
      },
    }, 9000);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.SearchResult?.SearchResultItems || [])
      .slice(0, 10)
      .map((item) => {
        const j = item.MatchedObjectDescriptor || {};
        const location =
          j.PositionLocationDisplay ||
          (j.PositionLocation || []).map((loc) => loc.LocationName).join(", ") ||
          "USA";
        return {
          sourceId: `usajobs_${j.PositionID || uuidv4()}`,
          title: j.PositionTitle || "",
          company: j.OrganizationName || j.DepartmentName || "USAJOBS",
          location,
          description: cleanJobDescription(j.UserArea?.Details?.JobSummary || ""),
          applyUrl: Array.isArray(j.ApplyURI) ? j.ApplyURI[0] : j.PositionURI || "",
          salaryMin: parseSalary(j.PositionRemuneration?.[0]?.MinimumRange),
          salaryMax: parseSalary(j.PositionRemuneration?.[0]?.MaximumRange),
          posted: j.PublicationStartDate ? timeAgo(j.PublicationStartDate) : "Recently",
          source: "USAJOBS",
          jobType: "Full-time",
          workType: /remote/i.test(location) ? "Remote" : "On-site",
        };
      })
      .filter((j) => j.title && j.applyUrl);
  } catch (e) {
    console.error("USAJOBS API error:", e.message);
    return [];
  }
}

async function fetchArbeitnowJobs(query) {
  try {
    const res = await fetchWithTimeout("https://www.arbeitnow.com/api/job-board-api", {}, 8000);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || data.jobs || [])
      .filter((j) => sharedWordCount(query, `${j.title || ""} ${(j.tags || []).join(" ")} ${j.description || ""}`) > 0)
      .slice(0, 12)
      .map((j) => ({
        sourceId: `arbeitnow_${j.slug || uuidv4()}`,
        title: j.title || "",
        company: j.company_name || "Company",
        location: j.location || (j.remote ? "Remote" : "Europe"),
        description: cleanJobDescription(j.description || ""),
        applyUrl: j.url || "",
        salaryMin: 0,
        salaryMax: 0,
        posted: j.created_at ? timeAgo(j.created_at * 1000) : "Recently",
        source: "Arbeitnow",
        jobType: isInternshipText(`${j.title || ""} ${j.description || ""}`) ? "Internship" : "Full-time",
        workType: j.remote ? "Remote" : "On-site",
        requiredSkills: uniqueSkills(j.tags || [], 12),
      }))
      .filter((j) => j.title && j.applyUrl);
  } catch (e) {
    console.error("Arbeitnow API error:", e.message);
    return [];
  }
}

async function fetchArbeitsamtJobs(query, isStudent = false) {
  try {
    const params = new URLSearchParams({
      was: query,
      page: "1",
      size: "10",
      pav: "false",
      veroeffentlichtseit: "30",
    });
    if (isStudent) params.append("angebotsart", "34");
    const res = await fetchWithTimeout(
      `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs?${params}`,
      { headers: { "X-API-Key": ARBEITSAMT_API_KEY } },
      9000,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.stellenangebote || data.jobs || [])
      .slice(0, 10)
      .map((j) => ({
        sourceId: `arbeitsamt_${j.refnr || j.hashId || uuidv4()}`,
        title: j.titel || j.beruf || "",
        company: j.arbeitgeber || "Bundesagentur fur Arbeit",
        location: j.arbeitsort?.ort || j.arbeitsort || "Germany",
        description: cleanJobDescription(j.beschreibung || j.titel || ""),
        applyUrl: j.externeUrl || j.url || `https://www.arbeitsagentur.de/jobsuche/jobdetail/${j.refnr || ""}`,
        salaryMin: 0,
        salaryMax: 0,
        posted: j.aktuelleVeroeffentlichungsdatum
          ? timeAgo(j.aktuelleVeroeffentlichungsdatum)
          : "Recently",
        source: "Arbeitsamt",
        jobType: isStudent ? "Internship" : "Full-time",
        workType: /homeoffice|remote/i.test(`${j.arbeitszeitmodelle || ""} ${j.titel || ""}`)
          ? "Remote"
          : "On-site",
      }))
      .filter((j) => j.title && j.applyUrl);
  } catch (e) {
    console.error("Arbeitsamt API error:", e.message);
    return [];
  }
}

async function fetchCareerjetJobs(query, isStudent = false, candidateCountry = null) {
  if (!CAREERJET_AFFILIATE_ID) return [];
  try {
    const params = new URLSearchParams({
      affid: CAREERJET_AFFILIATE_ID,
      keywords: query,
      location: candidateCountry || (isStudent ? "India" : ""),
      pagesize: "20",
      page: "1",
      sort: "date",
    });
    const res = await fetchWithTimeout(
      `http://public.api.careerjet.net/search?${params}&locale_code=en_IN`,
      {},
      9000,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.jobs || [])
      .slice(0, 20)
      .map((j) => ({
        sourceId: `careerjet_${j.url || uuidv4()}`,
        title: j.title || "",
        company: j.company || "Company",
        location: j.locations || j.location || "Remote",
        description: cleanJobDescription(j.description || ""),
        applyUrl: j.url || "",
        salaryMin: parseSalary(j.salary),
        salaryMax: 0,
        posted: j.date ? timeAgo(j.date) : "Recently",
        source: "Careerjet",
        jobType: isInternshipText(`${j.title || ""} ${j.description || ""}`) ? "Internship" : "Full-time",
        workType: /remote/i.test(`${j.locations || ""} ${j.description || ""}`) ? "Remote" : "On-site",
      }))
      .filter((j) => j.title && j.applyUrl);
  } catch (e) {
    console.error("Careerjet API error:", e.message);
    return [];
  }
}

async function fetchDevITJobs(query) {
  try {
    const res = await fetchWithTimeout("https://devitjobs.uk/job_feed.xml", {}, 8000);
    if (!res.ok) return [];
    const text = await res.text();
    return parseXmlFeedJobs(text, "DevITjobs UK")
      .filter((j) => sharedWordCount(query, `${j.title} ${j.description}`) > 0)
      .slice(0, 10);
  } catch (e) {
    console.error("DevITjobs UK feed error:", e.message);
    return [];
  }
}

async function fetchWhatJobsJobs(query) {
  try {
    if (WHATJOBS_FEED_URL) {
      const res = await fetchWithTimeout(WHATJOBS_FEED_URL, {}, 9000);
      if (!res.ok) return [];
      const text = await res.text();
      return parseXmlFeedJobs(text, "WhatJobs")
        .filter((j) => sharedWordCount(query, `${j.title} ${j.description}`) > 0)
        .slice(0, 15);
    }
    if (!WHATJOBS_API_URL) return [];
    const res = await fetchWithTimeout(WHATJOBS_API_URL, {
      headers: WHATJOBS_API_KEY ? { "x-feed-token": WHATJOBS_API_KEY } : {},
    }, 9000);
    if (!res.ok) return [];
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("xml")) {
      return parseXmlFeedJobs(await res.text(), "WhatJobs").slice(0, 15);
    }
    const data = await res.json();
    return (data.jobs || data.results || [])
      .slice(0, 15)
      .map((j) => ({
        sourceId: `whatjobs_${j.id || uuidv4()}`,
        title: j.title || "",
        company: j.company || "WhatJobs",
        location: j.location || "Remote",
        description: cleanJobDescription(j.description || ""),
        applyUrl: j.url || j.applyUrl || "",
        salaryMin: parseSalary(j.salaryMin || j.salary),
        salaryMax: parseSalary(j.salaryMax),
        posted: j.posted || "Recently",
        source: "WhatJobs",
        jobType: isInternshipText(`${j.title || ""} ${j.description || ""}`) ? "Internship" : "Full-time",
        workType: /remote/i.test(`${j.location || ""} ${j.description || ""}`) ? "Remote" : "On-site",
      }))
      .filter((j) => j.title && j.applyUrl);
  } catch (e) {
    console.error("WhatJobs feed error:", e.message);
    return [];
  }
}

async function scoreJobsWithGemini(profile, rawJobs) {
  // Compact job summaries for the prompt (keep under context limit)
  const jobSummaries = rawJobs.map((j, i) => ({
    idx: i,
    title: j.title,
    company: j.company,
    description: (j.description || "").substring(0, 250),
    location: j.location,
  }));

  const candidateLocation = profile?.location || "";
  const systemPrompt = `You are a precise job-matching AI. Analyze each job against the candidate's profile and return match data.

CANDIDATE LOCATION: "${candidateLocation}"

SCORING RULES:
- matchScore: 30–95 based on role alignment (most important), skills overlap, experience level, and location
- Role alignment is the MOST important factor: if the job title/responsibilities closely match the candidate's target role and experience, score higher (75-95). If it's a completely different domain, score lower (30-55).
- Location matters: if the job is in the candidate's country/city, score up to +8. If remote, +5. If a completely different country with no remote option, -10.
- matchedSkills: up to 6 skills the candidate HAS that the job requires (be specific, from the profile)
- missingSkills: up to 5 skills the job needs that the candidate LACKS
- tags: 3–5 key role/skill keywords extracted from the job
- workType: "Remote" | "Hybrid" | "On-site" (infer from description/location)
- jobType: "Full-time" | "Part-time" | "Internship" | "Contract" (infer from title/description)
- experienceLevel: "Internship" | "Entry-level" | "Mid-level" | "Senior"
- interviewLikelihood: "High" (score≥80) | "Medium" (65–79) | "Low" (<65)
- IMPORTANT: Vary your scores meaningfully. Do NOT give all jobs the same score. A perfect role match in the right location should score 88-95; a partial match 65-80; a weak match 40-60; a mismatch 30-45.

Return ONLY a valid JSON array — no markdown, no extra text:
[{"idx":0,"matchScore":87,"matchedSkills":["React","Node.js"],"missingSkills":["Kubernetes"],"tags":["React","Node.js","AWS"],"workType":"Remote","jobType":"Full-time","experienceLevel":"Mid-level","interviewLikelihood":"High"}]`;

  let scores = [];
  try {
    const raw = await callGemini(
      systemPrompt,
      `Candidate Profile:\n${JSON.stringify(profile, null, 2)}\n\nJobs to score:\n${JSON.stringify(jobSummaries, null, 2)}`,
    );
    scores = extractJson(raw);
    if (!Array.isArray(scores)) throw new Error("AI scoring returned non-array JSON");
  } catch (err) {
    console.warn("AI job scoring unavailable, using local scoring:", err.message);
    return scoreJobsLocally(profile, rawJobs);
  }

  // Merge Gemini scores back into the raw job objects
  const localScores = scoreJobsLocally(profile, rawJobs);
  const candidateSet = new Set((profile?.topSkills || []).flatMap((skill) => skillKeysForCandidate(skill)));
  const hasCandidateSkill = (skill) =>
    skillKeysForCandidate(skill).some((key) => candidateSet.has(key));
  const student = isStudentProfile(profile);

  return rawJobs.map((job, i) => {
    const s =
      (Array.isArray(scores) ? scores : []).find((x) => x.idx === i) || {};
    const local = localScores[i] || scoreJobsLocally(profile, [job])[0];
    const aiRequired = uniqueSkills(
      [...(s.matchedSkills || []), ...(s.missingSkills || []), ...(s.tags || [])],
      14,
    );
    const requiredSkills = uniqueSkills([...aiRequired, ...(local.requiredSkills || [])], 14);
    const matchedSkills = uniqueSkills(
      [...requiredSkills.filter(hasCandidateSkill), ...(local.matchedSkills || [])],
      8,
    );
    const matchedKeys = new Set(matchedSkills.flatMap((skill) => skillKeysForCandidate(skill)));
    const missingSkills = uniqueSkills(
      requiredSkills.filter(
        (skill) => !skillKeysForCandidate(skill).some((key) => matchedKeys.has(key)),
      ),
      6,
    );
    const aiScore = Number(s.matchScore);
    const locationBonus = locationAlignment(profile, job);
    const roleAlignment = evaluateRoleAlignment(profile, job, requiredSkills);
    // Use AI score weighted 40% local 60%, but cap AI's contribution so it can't push to 98
    let matchScore = Number.isFinite(aiScore)
      ? Math.round(Math.min(aiScore, 94) * 0.40 + local.matchScore * 0.60)
      : local.matchScore;
    matchScore += locationBonus + roleAlignment.scoreAdjustment;
    // Country mismatch penalty in Gemini path too
    if (locationBonus < 0) matchScore -= 12;
    const experienceLevel = s.experienceLevel || local.experienceLevel || "Mid-level";
    if (student && experienceLevel === "Senior") matchScore = Math.min(matchScore, 58);
    if (student && !isEntryFriendlyJob({ ...job, description: job.description || "" })) {
      matchScore = Math.min(matchScore, 62);
    }
    if (roleAlignment.mismatch) {
      matchScore = Math.min(matchScore, 58);
    }
    if (isEligibilityMismatch(profile, { ...job, description: job.description || "" })) {
      matchScore = Math.min(matchScore, 45);
    }
    const interviewLikelihood =
      matchScore >= 85 ? "High" : matchScore >= 70 ? "Medium" : "Low";
    return {
      id: job.sourceId || uuidv4(),
      title: job.title,
      company: job.company,
      location: job.location,
      workType: s.workType || local.workType || job.workType || "On-site",
      jobType: s.jobType || local.jobType || job.jobType || "Full-time",
      salaryMin: job.salaryMin || 0,
      salaryMax: job.salaryMax || 0,
      matchScore: Math.min(93, Math.max(30, matchScore)),
      tags: uniqueSkills([...(s.tags || []), ...(local.tags || []), ...matchedSkills, ...missingSkills], 5),
      description: cleanJobDescription(job.description || ""),
      posted: job.posted || "Recently",
      requiredSkills,
      matchedSkills,
      missingSkills,
      experienceLevel,
      interviewLikelihood,
      applyUrl: job.applyUrl, // ← real apply URL from the API
      source: job.source || "Web",
    };
  });
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function healthCheck() {
  return NextResponse.json({
    status: "ok",
    service: "CareerVibe API",
    version: "2.0.0",
  });
}

// POST /api/parse-resume
async function parseResume(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.startsWith("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart/form-data with a 'resume' file" },
      { status: 400 },
    );
  }
  try {
    const formData = await request.formData();
    const file = formData.get("resume");

    if (!file)
      return NextResponse.json(
        { error: "No resume file provided" },
        { status: 400 },
      );

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract text from PDF
    let resumeText = "";
    const fileName = file.name?.toLowerCase() || "";

    if (fileName.endsWith(".pdf") || file.type === "application/pdf") {
      try {
        const pdfParse = (await import("pdf-parse")).default;
        const pdfData = await pdfParse(buffer);
        resumeText = pdfData.text;
      } catch (e) {
        // Fallback: try to read as text if PDF parse fails
        resumeText = buffer
          .toString("utf-8")
          .replace(/[^\x20-\x7E\n\r\t]/g, " ");
      }
    } else if (
      fileName.endsWith(".docx") ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      try {
        const mammoth = await import("mammoth");
        const docxData = await mammoth.extractRawText({ buffer });
        resumeText = docxData.value || "";
      } catch (e) {
        resumeText = "";
      }
    } else {
      // Text file
      resumeText = buffer.toString("utf-8");
    }

    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json(
        {
          error:
            "Could not extract text from resume. Please ensure it is a text-based PDF/DOCX/TXT file and not only an image scan.",
        },
        { status: 400 },
      );
    }

    // Limit text to 8000 chars to fit in context
    const normalizedText = normalizeResumeText(resumeText);
    const effectiveText =
      normalizedText && normalizedText.length > 80 ? normalizedText : resumeText;
    const trimmedText = effectiveText.substring(0, 8000);

    const systemPrompt = `You are an expert resume parser with deep NLP skills. Extract comprehensive information from the resume text provided. Be thorough — read ALL sections: skills, projects, work experience, education, achievements, certifications, and descriptions.

Parse resumes from any industry. Do not default to software, engineering, AI, or Observability unless the resume explicitly supports that domain.
Treat the resume's summary/objective and experience titles as stronger signals than generic software tools or analytics keywords.
If the resume clearly shows professional experience, do not label the candidate as a student or fresher.
If the resume says "8+ years of expertise" or similar, treat that as yearsExperience.

Return ONLY a valid JSON object with no markdown, no explanation, no preamble:
{
  "name": "full name of candidate",
  "summary": "1-2 sentence professional summary highlighting role-specific strengths",
  "yearsExperience": 0,
  "topSkills": ["skill1","skill2","skill3"],
  "jobTitles": ["previous job title 1","previous job title 2"],
  "preferredRoles": ["inferred desired role 1","inferred desired role 2"],
  "industries": ["industry 1","industry 2"],
  "education": "highest degree, institution",
  "location": "candidate city/state/country if present",
  "graduationYear": 2028,
  "studentYear": 2,
  "careerStage": "Student / Fresher",
  "projects": ["Exact Project Title 1","Exact Project Title 2"],
  "certifications": ["cert 1"]
}

IMPORTANT RULES:
- Industry-neutral extraction: include domain skills for healthcare, nutrition, hospitality, finance, education, sales, operations, trades, design, and any other sector.
- Prefer the candidate's actual domain from the objective, summary, and role titles over generic tools like Excel, Word, PowerPoint, or analytics buzzwords.
- Do not invent tech skills like Observability unless the resume explicitly says observability, Prometheus, Grafana, OpenTelemetry, tracing, or logging.
- topSkills: Extract all explicit role skills from every section: skills list, projects, experience, certifications, and descriptions. Include 8-15 useful skills when present.
- yearsExperience: 0 for students/freshers/interns. Count only professional work experience. If the resume explicitly says "three years of experience" or similar, use that instead of subtracting unrelated education or course dates.
- graduationYear/studentYear: Infer from expected graduation date and academic calendar. For a 2024-2028 B.Tech in May 2026, studentYear is 2.
- careerStage: Use "Senior", "Experienced", "Professional", "Entry-level", or "Student / Fresher" based on the evidence in the resume.
- projects: Extract ONLY the project TITLE/NAME (the heading line). Do NOT include bullet point descriptions, action verbs, or dates. For example if the resume shows "AI Voice Agent Suite | https://github.com/...", extract just "AI Voice Agent Suite". Do not include descriptions like "Developed multiple AI-powered..." or "Built...".
- jobTitles: Include intern titles like "AI and Machine Learning Intern", "Software Developer Intern" etc.
- preferredRoles: Infer from skills and experience across any industry. Be specific, e.g. "Nutrition Consultant", "Dietitian", "IoT Engineer", "Frontend Developer", "Sales Executive", or "Teacher".
- summary: Write a compelling 1-2 sentence summary capturing their strongest role-specific skills and career direction.`;

    const localProfile = buildLocalProfile(trimmedText);
    let profile = localProfile;
    let parser = "local";

    try {
      const raw = await callGemini(
        systemPrompt,
        `Resume text:\n\n${trimmedText}`,
      );
      profile = sanitizeProfile(extractJson(raw), localProfile);
      parser = "ai";
    } catch (err) {
      console.warn("AI resume parsing unavailable, using local parser:", err.message);
    }

    return NextResponse.json({ profile, parser, resumeText: trimmedText });
  } catch (err) {
    console.error("parseResume error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to parse resume" },
      { status: 500 },
    );
  }
}

// POST /api/generate-jobs — fetch REAL jobs from external APIs, score with Gemini
async function generateJobs(request) {
  try {
    const { profile, sessionId } = await request.json();
    if (!profile)
      return NextResponse.json(
        { error: "No profile provided" },
        { status: 400 },
      );

    const isStudent = isStudentProfile(profile);
    const searchQueries = buildSearchQueries(profile);
    const primaryRole = searchQueries[0] || "jobs matching resume skills";
    const activeQueries = uniqueList(searchQueries, 8);
    const skillKw =
      (profile.topSkills || []).slice(0, 4).join(" ") || primaryRole;

    // Derive candidate country for location-aware fetching
    const candidateCountryInfo = getProfileCountryInfo(profile);
    const candidateCountryCode = candidateCountryInfo?.code || null;
    const candidateCountryName = candidateCountryInfo?.name || null;
    const isEUCandidate = candidateCountryCode ? EU_COUNTRY_CODES.has(candidateCountryCode) : false;

    console.log(
      `[generateJobs] Searching for: "${primaryRole}" | isStudent: ${isStudent} | country: ${candidateCountryName || "unknown"} | queries: ${searchQueries.join(" | ")}`,
    );

    // ── 1. Fetch from all APIs in parallel ────────────────────────────────────
    const providerFetches = [
      ...activeQueries.slice(0, 5).flatMap((query, index) => [
        [`Adzuna:${query}`, fetchAdzunaJobs(query, isStudent, candidateCountryCode)],
        [`LinkedIn:${query}`, fetchLinkedInJobs(query, isStudent, candidateCountryName)],
        [`Jooble:${query}`, fetchJoobleJobs(query, isStudent, candidateCountryName)],
        [`JSearch:${query}`, fetchJSearchJobs(query, isStudent, candidateCountryName)],
        // Arbeitnow is pan-European — only call for EU candidates
        ...(isEUCandidate ? [[`Arbeitnow:${query}`, fetchArbeitnowJobs(query)]] : []),
        // Arbeitsamt is Germany-only — only call for German candidates
        ...(candidateCountryCode === "de" && index < 2 ? [[`Arbeitsamt:${query}`, fetchArbeitsamtJobs(query, isStudent)]] : []),
      ]),
      ["Findwork", fetchFindworkJobs(skillKw)],
      ["The Muse", fetchMuseJobs(primaryRole, isStudent)],
      // USAJOBS is US-only — only call for US/unknown candidates
      ...((!candidateCountryCode || candidateCountryCode === "us") ? [["USAJOBS", fetchUSAJobs(primaryRole, isStudent)]] : []),
      ["Careerjet", fetchCareerjetJobs(primaryRole, isStudent, candidateCountryName)],
      ["DevITjobs UK", fetchDevITJobs(primaryRole)],
      ["WhatJobs", fetchWhatJobsJobs(primaryRole)],
    ];

    const providerResults = await Promise.allSettled(
      providerFetches.map(([, promise]) => promise),
    );

    let rawJobs = providerResults.flatMap((result, index) => {
      const name = providerFetches[index][0];
      if (result.status !== "fulfilled") {
        console.warn(`[generateJobs] ${name} failed: ${result.reason?.message || result.reason}`);
        return [];
      }
      console.log(`[generateJobs] ${name}: ${result.value.length} jobs`);
      return result.value;
    });

    console.log(
      `[generateJobs] Raw jobs after primary fetch: ${rawJobs.length}`,
    );

    rawJobs = filterJobsForProfile(profile, rawJobs);

    // ── 2. If still not enough, try secondary role from Adzuna ───────────────
    const extraQueries = activeQueries.slice(5).filter((query) => query && query !== primaryRole);
    if (rawJobs.length < 30 && extraQueries.length) {
      const moreResults = await Promise.allSettled(
        extraQueries.flatMap((query) => [
          fetchAdzunaJobs(query, isStudent, candidateCountryCode),
          fetchLinkedInJobs(query, isStudent, candidateCountryName),
          fetchJoobleJobs(query, isStudent, candidateCountryName),
          fetchJSearchJobs(query, isStudent, candidateCountryName),
          ...(isEUCandidate ? [fetchArbeitnowJobs(query)] : []),
          fetchCareerjetJobs(query, isStudent, candidateCountryName),
        ]),
      );
      const more = moreResults.flatMap((result) =>
        result.status === "fulfilled" ? result.value : [],
      );
      rawJobs = filterJobsForProfile(profile, [...rawJobs, ...more]);
      console.log(
        `[generateJobs] Raw jobs after expanded queries (${extraQueries.join(" | ")}): ${rawJobs.length}`,
      );
    }

    // ── 3. Last resort: Apify LinkedIn scraper ───────────────────────────────
    if (rawJobs.length < 4) {
      console.log("[generateJobs] Falling back to Apify LinkedIn scraper...");
      const apifyJobs = await fetchApifyLinkedInJobs(primaryRole);
      rawJobs = filterJobsForProfile(profile, [...rawJobs, ...apifyJobs]);
      console.log(`[generateJobs] Raw jobs after Apify: ${rawJobs.length}`);
    }

    // ── 4. Deduplicate by title + company ────────────────────────────────────
    const seen = new Set();
    rawJobs = rawJobs.filter((j) => {
      const key = `${(j.title || "").toLowerCase().trim()}__${(j.company || "").toLowerCase().trim()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    rawJobs = filterJobsForProfile(profile, rawJobs);

    if (rawJobs.length === 0) {
      console.warn("[generateJobs] Live job APIs unavailable, using search fallbacks.");
      rawJobs = createFallbackJobs(profile);
    }

    // ── 5. Pre-rank locally, then score a larger high-quality window ───────────
    const preRanked = scoreJobsLocally(profile, rawJobs)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 60);
    const scored = await scoreJobsWithGemini(profile, preRanked.slice(0, 45));

    // ── 6. Sort: country-match first, then by match score ───────────────────
    const jobCountryPriority = (job) => {
      const locText = (job.location || "").toLowerCase();
      if (!candidateCountryCode) return 0;
      if (candidateCountryCode === "in" &&
        /\b(india|mumbai|delhi|bangalore|bengaluru|pune|hyderabad|chennai|kolkata|gurgaon|noida|remote india)\b/.test(locText)) return 2;
      if (candidateCountryName && locText.includes(candidateCountryName.toLowerCase())) return 2;
      if (/remote|worldwide|global|anywhere/.test(locText)) return 1;
      return 0;
    };
    scored.sort((a, b) => {
      const pA = jobCountryPriority(a);
      const pB = jobCountryPriority(b);
      if (pB !== pA) return pB - pA;
      return b.matchScore - a.matchScore;
    });
    let qualityJobs = scored.filter((job) => {
      if (isEligibilityMismatch(profile, job)) return false;
      if (isStudent && job.experienceLevel === "Senior") return false;
      if (isStudent && !isEntryFriendlyJob(job) && job.matchScore < 60) return false;
      if ((job.matchedSkills || []).length === 0 && job.matchScore < 58) return false;
      if (job.matchScore < 42) return false;
      return true;
    });
    if (!qualityJobs.length) {
      qualityJobs = scoreJobsLocally(profile, createFallbackJobs(profile)).filter(
        (job) => (job.matchedSkills || []).length > 0 && !isEligibilityMismatch(profile, job),
      );
    }
    const topScored = scored.slice(0, 30);
    const qualityIds = new Set(qualityJobs.map((job) => job.id));
    const paddedJobs = [
      ...qualityJobs,
      ...topScored.filter((job) => !qualityIds.has(job.id)),
    ];
    const finalJobs = paddedJobs.slice(0, 30);

    console.log(
      `[generateJobs] Returning ${finalJobs.length} scored real jobs`,
    );

    // ── 7. Persist to MongoDB (non-fatal) ────────────────────────────────────
    try {
      const db = await getDb();
      await db
        .collection("sessions")
        .updateOne(
          { sessionId },
          {
            $set: {
              sessionId,
              profile,
              jobs: finalJobs,
              updatedAt: new Date(),
            },
          },
          { upsert: true },
        );
    } catch (_) {
      /* MongoDB failure is non-fatal */
    }

    return NextResponse.json({ jobs: finalJobs, total: finalJobs.length });
  } catch (err) {
    console.error("generateJobs error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch jobs" },
      { status: 500 },
    );
  }
}

// GET /api/saved-jobs?sessionId=xxx
async function getSavedJobs(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    if (!sessionId) return NextResponse.json({ savedJobs: [] });

    const db = await getDb();
    if (!db) return NextResponse.json({ savedJobs: getMemorySavedJobs(sessionId) });

    const savedJobs = await db
      .collection("saved_jobs")
      .find({ sessionId })
      .sort({ savedAt: -1 })
      .toArray();

    return NextResponse.json({
      savedJobs: savedJobs.map((j) => {
        const { _id, ...rest } = j;
        return rest;
      }),
    });
  } catch (err) {
    console.warn("MongoDB unavailable for saved jobs, using memory store:", err.message);
    const { searchParams } = new URL(request.url);
    return NextResponse.json({
      savedJobs: getMemorySavedJobs(searchParams.get("sessionId")),
    });
  }
}

// POST /api/save-job
async function saveJob(request) {
  let payload = {};
  try {
    payload = await request.json();
    const { sessionId, job } = payload;
    if (!sessionId || !job)
      return NextResponse.json({ error: "Missing data" }, { status: 400 });

    const db = await getDb();
    const jobId = job.id || uuidv4();
    if (!db) {
      saveMemoryJob(sessionId, { ...job, id: jobId });
      return NextResponse.json({ success: true, message: "Job saved" });
    }
    await db.collection("saved_jobs").updateOne(
      { sessionId, jobId },
      { $set: { sessionId, jobId, ...job, savedAt: new Date() } },
      { upsert: true },
    );
    return NextResponse.json({ success: true, message: "Job saved" });
  } catch (err) {
    const { sessionId, job } = payload;
    if (sessionId && job) {
      saveMemoryJob(sessionId, job);
      return NextResponse.json({ success: true, message: "Job saved" });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/save-job
async function removeSavedJob(request) {
  let payload = {};
  try {
    payload = await request.json();
  } catch {
    // No/invalid JSON body — fall back to query params below.
    payload = {};
  }
  const url = new URL(request.url);
  const sessionId =
    payload.sessionId ||
    url.searchParams.get("sessionId") ||
    url.searchParams.get("userId");
  const jobId = payload.jobId || url.searchParams.get("jobId");
  if (!sessionId || !jobId)
    return NextResponse.json({ error: "Missing data" }, { status: 400 });

  try {
    const db = await getDb();
    if (!db) {
      removeMemoryJob(sessionId, jobId);
      return NextResponse.json({ success: true, message: "Job removed" });
    }
    await db.collection("saved_jobs").deleteOne({ sessionId, jobId });
    return NextResponse.json({ success: true, message: "Job removed" });
  } catch (err) {
    removeMemoryJob(sessionId, jobId);
    return NextResponse.json({ success: true, message: "Job removed" });
  }
}

// POST /api/dream-job-gap
async function dreamJobGap(request) {
  let payload = {};
  try {
    payload = await request.json();
    const { dreamJob, profile } = payload;
    if (!dreamJob || !profile)
      return NextResponse.json({ error: "Missing data" }, { status: 400 });

    const systemPrompt = `You are an expert career advisor AI. Given the applicant's current profile and their dream job, provide a detailed, actionable skill gap analysis.

Return ONLY a valid JSON object, no markdown, no preamble:
{
  "dreamJobTitle": "string",
  "currentMatch": 45,
  "skillGaps": [
    {
      "skill": "Python",
      "priority": "Essential",
      "timeToLearn": "4-6 weeks",
      "resources": [
        { "name": "Python for Everybody - Coursera", "type": "Course", "url": "https://www.coursera.org/specializations/python", "free": false },
        { "name": "Python Official Tutorial", "type": "Tutorial", "url": "https://docs.python.org/3/tutorial/", "free": true }
      ]
    }
  ],
  "strengths": ["skill1","skill2","skill3"],
  "timeline": "4-6 months",
  "nextSteps": ["step1","step2","step3"],
  "salaryRange": { "min": 70000, "max": 130000 },
  "demandLevel": "High"
}

priority options: "Essential" | "Important" | "Nice-to-have"
resource type options: "Course" | "Tutorial" | "Book" | "Practice"
Include 3-6 skill gaps, 3-5 strengths, 3-4 next steps.
Use real URLs for well-known learning platforms (Coursera, edX, freeCodeCamp, MDN, YouTube, etc.)`;

    const raw = await callGemini(
      systemPrompt,
      `Profile:\n${JSON.stringify(profile, null, 2)}\n\nDream Job: ${dreamJob}`,
    );
    const analysis = extractJson(raw);

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error("dreamJobGap error:", err);
    const { dreamJob, profile } = payload;
    if (dreamJob && profile) {
      return NextResponse.json({ analysis: localDreamJobGap(profile, dreamJob) });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/ats-optimize
async function atsOptimize(request) {
  let payload = {};
  try {
    payload = await request.json();
    const { profile, job } = payload;
    if (!profile || !job)
      return NextResponse.json({ error: "Missing data" }, { status: 400 });

    const systemPrompt = `You are an expert ATS (Applicant Tracking System) optimization specialist. Rewrite the candidate's professional summary and create tailored bullet points to maximize keyword matching for the specific job.

Return ONLY a valid JSON object, no markdown, no preamble:
{
  "optimizedSummary": "Rewritten professional summary with job-relevant keywords (2-3 sentences)",
  "keyBullets": [
    "• Achievement-oriented bullet point with metrics and keywords",
    "• Another strong bullet with action verb and relevant technology",
    "• Third bullet demonstrating impact"
  ],
  "keywordsAdded": ["keyword1","keyword2","keyword3"],
  "atsScore": 88,
  "tips": ["Tip 1","Tip 2","Tip 3"]
}`;

    const raw = await callGemini(
      systemPrompt,
      `Profile:\n${JSON.stringify(profile, null, 2)}\n\nTarget Job:\n${JSON.stringify(job, null, 2)}`,
    );
    const result = extractJson(raw);

    return NextResponse.json({ result });
  } catch (err) {
    console.error("atsOptimize error:", err);
    const { profile, job } = payload;
    if (profile && job) {
      return NextResponse.json({ result: localAtsOptimize(profile, job) });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/skill-roadmap
async function skillRoadmap(request) {
  let payload = {};
  try {
    payload = await request.json();
    const { job, profile } = payload;
    if (!job || !profile)
      return NextResponse.json({ error: "Missing data" }, { status: 400 });

    const systemPrompt = `You are a senior technical mentor. Given the candidate's profile and a specific job listing, create a focused learning roadmap for the missing skills.

Return ONLY a valid JSON object, no markdown:
{
  "roadmap": [
    {
      "skill": "Docker",
      "priority": 1,
      "currentLevel": "None",
      "targetLevel": "Intermediate",
      "weeklyHours": 5,
      "durationWeeks": 3,
      "resources": [
        { "name": "Docker Getting Started", "url": "https://docs.docker.com/get-started/", "type": "Tutorial", "free": true }
      ],
      "milestone": "Build and run a containerized Node.js app"
    }
  ],
  "totalWeeks": 8,
  "priorityOrder": ["skill1","skill2"],
  "dailyPlan": "30-45 min morning, 1hr evening on weekdays"
}`;

    const raw = await callGemini(
      systemPrompt,
      `Profile:\n${JSON.stringify(profile, null, 2)}\n\nTarget Job:\n${JSON.stringify(job, null, 2)}`,
    );
    const parsed = extractJson(raw);
    // Gemini returns { roadmap: [...], totalWeeks: N, ... } — spread it at top level
    const roadmapResult = parsed?.roadmap ? parsed : { roadmap: parsed };

    return NextResponse.json(roadmapResult);
  } catch (err) {
    const { job, profile } = payload;
    if (job && profile) {
      // localSkillRoadmap returns { roadmap: [...], totalWeeks: N } — spread directly
      return NextResponse.json(localSkillRoadmap(profile, job));
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── Career Change Mapper: domain-aware pivots ───────────────────────────────
// Each entry: { match: regex on current role/skills, paths: [{ target, gain, learn }] }
const CAREER_CHANGE_MAP = [
  {
    name: "Teacher / Educator",
    match: /\b(teacher|educator|faculty|lecturer|tutor|instructor|esl|tesol)\b/i,
    paths: [
      { target: "Instructional Designer", gain: ["Curriculum Design", "Lesson Planning", "Learner Engagement", "Communication"], learn: ["Articulate Storyline", "LMS (Moodle/Canvas)", "ADDIE model"] },
      { target: "EdTech Product Manager", gain: ["Curriculum Design", "User Empathy", "Stakeholder Communication"], learn: ["Product roadmaps", "Agile/Scrum", "User research"] },
      { target: "Corporate Trainer", gain: ["Lesson Planning", "Public Speaking", "Coaching"], learn: ["LMS authoring tools", "Training needs analysis"] },
    ],
  },
  {
    name: "Nurse / Clinical",
    match: /\b(nurse|rn|lpn|clinical|patient care|nursing|caregiver|healthcare)\b/i,
    paths: [
      { target: "Healthcare Administrator", gain: ["Patient Care", "Team Coordination", "Clinical Workflow Knowledge"], learn: ["Healthcare operations", "HIPAA compliance", "EHR systems"] },
      { target: "Medical Writer", gain: ["Clinical Knowledge", "Documentation", "Attention to Detail"], learn: ["Medical editing standards", "AMA style", "Regulatory writing"] },
      { target: "Clinical Research Coordinator", gain: ["Patient Care", "Documentation", "Compliance"], learn: ["GCP/ICH guidelines", "Protocol design", "Data management"] },
    ],
  },
  {
    name: "Retail Manager",
    match: /\b(retail manager|store manager|retail|shift manager|store lead)\b/i,
    paths: [
      { target: "Operations Coordinator", gain: ["Team Leadership", "Inventory Management", "Customer Service"], learn: ["Operations metrics", "Process improvement", "Excel/Google Sheets"] },
      { target: "Supply Chain Associate", gain: ["Inventory Management", "Vendor Coordination", "Forecasting"], learn: ["ERP systems", "Logistics basics", "Demand planning"] },
      { target: "Customer Success Manager", gain: ["Customer Service", "Team Leadership", "Conflict Resolution"], learn: ["CRM tools", "SaaS basics", "Customer health metrics"] },
    ],
  },
  {
    name: "Sales / Business Development",
    match: /\b(sales|business development|account executive|inside sales|bdr|sdr|territory)\b/i,
    paths: [
      { target: "Account Manager", gain: ["Client Relationship Management", "Negotiation", "CRM"], learn: ["Account planning", "Upsell/cross-sell motions"] },
      { target: "Customer Success Manager", gain: ["Client Relationship Management", "Communication", "Negotiation"], learn: ["Customer health scoring", "Renewal motions", "Onboarding playbooks"] },
      { target: "Revenue Operations Analyst", gain: ["Sales Reporting", "CRM", "Pipeline Management"], learn: ["Salesforce admin", "SQL basics", "Forecasting models"] },
    ],
  },
  {
    name: "HR Assistant / Coordinator",
    match: /\b(hr|human resources|recruitment|talent acquisition|payroll assistant|hr assistant|hr coordinator)\b/i,
    paths: [
      { target: "People Operations Specialist", gain: ["Recruitment", "HR Operations", "Employee Onboarding"], learn: ["HRIS (Workday/BambooHR)", "Engagement surveys", "Compensation basics"] },
      { target: "Talent Acquisition Specialist", gain: ["Recruitment", "Candidate Sourcing", "Communication"], learn: ["ATS systems", "Boolean sourcing", "DEI hiring"] },
      { target: "HR Business Partner (junior)", gain: ["HR Operations", "Conflict Resolution", "Documentation"], learn: ["Employee relations", "Org design basics", "Performance management"] },
    ],
  },
  {
    name: "Admin / Office Coordinator",
    match: /\b(administrative|admin assistant|office coordinator|executive assistant|office manager|secretary)\b/i,
    paths: [
      { target: "Project Coordinator", gain: ["Scheduling", "Stakeholder Communication", "Documentation"], learn: ["Jira/Asana", "PM fundamentals", "Risk tracking"] },
      { target: "Operations Associate", gain: ["Documentation", "Coordination", "MS Excel"], learn: ["SOP design", "Process mapping", "Data dashboards"] },
      { target: "Executive Assistant to C-suite", gain: ["Calendar Management", "Discretion", "Communication"], learn: ["Travel logistics tooling", "Board prep", "Confidential reporting"] },
    ],
  },
];

function generateLocalCareerPaths(profile) {
  const skills = profile?.topSkills || [];
  const titles = profile?.jobTitles || [];
  const preferred = profile?.preferredRoles || [];
  const combined = [...titles, ...preferred, profile?.summary || "", ...skills].join(" ");

  // Find first matching career pivot template
  const template = CAREER_CHANGE_MAP.find(t => t.match.test(combined));
  if (template) {
    const candSkillKeys = new Set(skills.map(s => String(s).toLowerCase()));
    return template.paths.map((p, idx) => {
      // Transferable skills = those the candidate already has that overlap with what the target role values
      const transferable = (p.gain || []).filter(g =>
        candSkillKeys.has(String(g).toLowerCase()) ||
        skills.some(s => String(s).toLowerCase().includes(String(g).toLowerCase()))
      );
      // If we found nothing in candidate's actual skills, fall back to the top of their skill list
      const finalTransferable = transferable.length >= 2 ? transferable : (skills.slice(0, 3));
      // Match score: 90/78/65 declining
      const matchPercent = [88, 76, 64][idx] || 60;
      return {
        targetRole: p.target,
        matchPercent,
        transferableSkills: finalTransferable.slice(0, 4),
        skillGaps: (p.learn || []).slice(0, 3),
      };
    });
  }

  // Generic fallback (less specific) — domain-agnostic
  const primaryTitle = titles[0] || preferred[0] || "Professional";
  return [
    { targetRole: `Senior ${primaryTitle}`, matchPercent: 80, transferableSkills: skills.slice(0, 3), skillGaps: ["Leadership", "Strategy", "Stakeholder management"] },
    { targetRole: "Team Lead / People Manager", matchPercent: 64, transferableSkills: skills.slice(1, 4), skillGaps: ["Coaching", "Performance management", "Hiring"] },
    { targetRole: "Project Coordinator", matchPercent: 56, transferableSkills: skills.slice(0, 3), skillGaps: ["PM fundamentals", "Risk tracking", "Jira/Asana"] },
  ];
}

// POST /api/career-paths
async function getCareerPaths(request) {
  try {
    const { profile } = await request.json();
    if (!profile) return NextResponse.json({ error: "Missing profile" }, { status: 400 });

    const systemPrompt = `You are a professional career advisor and career path architect. Given the candidate's profile, recommend 3 target roles they can transition to. For each role, determine a matching percentage (0-100) and list 3-4 transferable skills they already possess that are highly relevant to the target role.
    
Return ONLY a valid JSON array of objects, no markdown, no preamble:
[
  {
    "targetRole": "Senior Software Engineer",
    "matchPercent": 85,
    "transferableSkills": ["React", "Node.js", "System Design"]
  }
]`;

    let paths = [];
    try {
      const raw = await callGemini(
        systemPrompt,
        `Profile:\n${JSON.stringify(profile, null, 2)}`,
      );
      paths = extractJson(raw);
    } catch (e) {
      console.warn("AI career paths failed, using fallback:", e.message);
    }
    
    if (!Array.isArray(paths) || paths.length === 0) {
      paths = generateLocalCareerPaths(profile);
    }

    return NextResponse.json({ careerPaths: paths });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/check-link
async function checkLink(request) {
  try {
    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

    try {
      const resp = await fetch(url, { method: "HEAD", redirect: "follow" });
      const status = resp.status;
      const ok = resp.ok || (status >= 200 && status < 400);
      return NextResponse.json({ url, ok, status });
    } catch (e) {
      // Fallback to GET if HEAD method is blocked
      try {
        const resp = await fetch(url, { method: "GET", redirect: "follow" });
        const status = resp.status;
        const ok = resp.ok || (status >= 200 && status < 400);
        return NextResponse.json({ url, ok, status });
      } catch (err) {
        return NextResponse.json({ url, ok: false, error: err.message });
      }
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────
function getRoute(params) {
  const p = params?.path;
  return Array.isArray(p) ? p.join("/") : p || "";
}

export async function GET(request, { params }) {
  const route = getRoute(params);
  if (route === "" || route === "health") return healthCheck();
  if (route === "saved-jobs") return getSavedJobs(request);
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST(request, { params }) {
  const route = getRoute(params);
  if (route === "parse-resume") return parseResume(request);
  if (route === "generate-jobs") return generateJobs(request);
  if (route === "save-job") return saveJob(request);
  if (route === "dream-job-gap") return dreamJobGap(request);
  if (route === "ats-optimize") return atsOptimize(request);
  if (route === "skill-roadmap") return skillRoadmap(request);
  if (route === "career-paths") return getCareerPaths(request);
  if (route === "check-link") return checkLink(request);
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(request, { params }) {
  const route = getRoute(params);
  if (route === "save-job") return removeSavedJob(request);
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
