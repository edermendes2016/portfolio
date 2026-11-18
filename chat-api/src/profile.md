<!--
  Knowledge base for the "Ask about Eder" chat.
  The AI answers ONLY from this file and from the public GitHub repositories
  (loaded automatically by the worker). Anything not written here, it will say it doesn't know.

  Lines inside HTML comments like this one are ignored by the worker, so use them for notes.
  After editing, redeploy: `npm run deploy` (inside chat-api/).
-->

# Eder Mendes Amaral

## Summary
- Full-Stack Developer with nearly ten years of experience (since 2016) building and modernising business systems.
- Main stack: .NET 8 / C#, ASP.NET Core, Angular, TypeScript, SQL Server, Entity Framework Core.
- Worked mostly for the public sector and the regulated electricity sector in Brazil.
- Moving into an IT Innovation role. Current focus: Retrieval-Augmented Generation (RAG) with local, on-premise LLMs (AI that runs where the data has to stay).
- Cares about the engineering around the model: CI/CD on Azure DevOps, observability with Application Insights, resilient distributed architecture, reliable tests.
- Likes to read AI answers critically and builds tools that show their sources.

## Practical information
- Location: Brazil. Open to remote work.
- English: advanced. Portuguese: native.
<!-- TODO (Eder): city, availability / notice period, CLT or PJ, remote/hybrid/on-site, salary expectation (or "to be discussed"). -->

## Experience
### G&P Projetos e Sistemas: Full-Stack Developer (Mid-level), 2022 to 2026
- Built and maintained systems for the regulated electricity sector with .NET 8, Angular and SQL Server.
- Modernised legacy applications to ASP.NET Core and set up CI/CD pipelines on Azure DevOps.
- Applied distributed patterns (CQRS, Outbox, Saga) and resilience policies (Retry, Circuit Breaker).
- Added monitoring with Application Insights.

### PSG: Systems Analyst (Junior), 2019 to 2022
- Developed web systems for public-sector clients, following the GOV.BR Design System.
- Wrote unit tests with xUnit and worked on data models with Entity Framework Core.

### Easy Net Tecnologia: Systems Analyst, 2016 to 2019
- Built and supported business applications, from requirements to deployment.

## Skills
<!--
  TODO (Eder): add a level to each item, for example "C#: advanced (daily use since 2016)".
  Suggested levels: advanced / intermediate / basic / studying.
  Items without a level are answered only as "listed on the profile".
-->
- Back end: .NET 8, C#, ASP.NET Core, Entity Framework Core, SQL Server, xUnit.
- Front end: Angular, TypeScript, HTML and CSS, GOV.BR Design System.
- Architecture: microservices, CQRS, Event Sourcing, Outbox, Saga, Retry and Circuit Breaker.
- AI and cloud: RAG, LangChain, Ollama, ChromaDB, Docker, Python, Azure DevOps, Application Insights, AWS.

### Not on the profile
<!-- TODO (Eder): list technologies you do NOT know, so the AI can say so clearly. Example: "Java: no professional experience." -->

## Projects
### Local RAG Agent for large codebases
- Repository: https://github.com/edermendes2016/langchain-local-agent
- Indexes a large open-source repository and answers architecture questions in plain English, pointing to the exact files it used.
- Runs entirely locally: no data leaves the machine. Stack: LangChain, Ollama, ChromaDB, Docker, Python.
- Pipeline: load source files, split into chunks that respect class and function boundaries, embed and store in ChromaDB, retrieve the most relevant chunks, answer with a local model served by Ollama, listing sources.
- Includes a "bug dojo": deliberately wrong answers used to practise spotting hallucinations.
- Lesson he wrote about: in RAG, retrieval quality decides answer quality; tuning chunk size and overlap mattered more than switching models.

## Certifications
- AWS re/Start: Cloud Foundations (300 hours), AWS, 2026.
- AWS Cloud Quest: Generative AI Practitioner, AWS.
- Microsoft Azure Fundamentals, Microsoft.
- LFS158: Introduction to Kubernetes, The Linux Foundation.
- LFS162: Introduction to DevOps and SRE, The Linux Foundation.
- Foundational C# with Microsoft, freeCodeCamp.

## Education
- B.Eng. in Computer Engineering, Uniderp, 2012 to 2018.

## Writing
- Blog post "Building a local RAG agent to explore a huge codebase" (Nov 2026).
- Blog post "Reading AI answers with a critical eye" (Nov 2026): checklist of checking sources, versions, running the code, and what was left out.

## Contact
- LinkedIn: https://www.linkedin.com/in/eder-mendes-amaral/
- GitHub: https://github.com/edermendes2016
- Portfolio: https://edermendes2016.github.io/portfolio/
