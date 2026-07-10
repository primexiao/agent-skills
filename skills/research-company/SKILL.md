---
name: research-company
description: Research and assess any company and the business behind a company name, product, app, brand, project, website, domain, or article URL. Resolve the input to the correct operating and legal entities, establish a universal company baseline, classify its industry and business model, then apply relevant vertical-specific metrics and evidence. Use when users in any language ask to research, investigate, compare, track, perform due diligence on, or evaluate a company, product, app, website, startup, public company, brand, or commercial project.
---

# Company, Product, and Business Research

Research any type of company from a combined technology, product, and business perspective. First identify the input and the entities behind it, then establish a universal company baseline. Only after that, select vertical questions based on the company's industry, value-chain position, and business model. Lead with judgment, support it with evidence, and keep verified facts, company claims, third-party estimates, analytical inferences, and unknowns distinct.

## Language behavior

- Accept company names, product names, app names, URLs, and research requests in any language.
- Respond in the user's current language unless the user requests another language.
- Preserve official names, legal entity names, product names, and material technical or regulatory terms in their original form when translation could create ambiguity.
- Search in the languages most likely to surface authoritative evidence for the entity and jurisdiction. Do not restrict sources to the response language.
- Translate source findings faithfully and cite the original source. Mark any translation ambiguity that could affect the conclusion.

## Core principles

- Treat the company, product, app, brand, website, or article subject supplied by the user as the **focus entity**. Do not silently replace it with the parent company as the sole subject.
- Identify the relationships among the focus entity, brand, operator, legal entity, parent company, and material subsidiaries.
- Complete the universal company baseline before choosing industry-specific questions. Do not begin with an AI, SaaS, or other preset template.
- Use industry classification to select questions and metrics, not as an end in itself. Choose one primary industry lens and no more than two secondary lenses.
- Prioritize facts that could change the user's decision. Do not fill every field mechanically or substitute information volume for judgment.

## Workflow

### 1. Parse the input and decision context

Determine whether the user is evaluating adoption, procurement, partnership, employment, investment, competition, product inspiration, or simply seeking an overview. If the user does not state a purpose, perform a balanced general assessment instead of blocking on clarification.

Handle each input type as follows:

- **Company name:** Resolve namesakes, brand names, legal entities, headquarters, and the official website.
- **Product or app name:** Verify the website, app-store developer or publisher, terms of service, privacy policy, and operating entity. Keep the product itself as an analysis focus.
- **Website or domain:** Determine whether it is a corporate site, product page, app-store page, project page, or media article. Use the footer, legal terms, domain evidence, and official accounts to identify the entity. Treat WHOIS as a weak signal, not proof.
- **Article or content URL:** Identify the actual subject of the article, then separate its narrative from externally verifiable facts.

Ask one concise clarification question only when multiple plausible entities would materially change the conclusion and reliable disambiguation is impossible. Otherwise continue and state the assumption.

Produce an entity map: `user input -> focus entity -> operator/legal entity -> parent company/material related parties`. State the research cutoff date.

### 2. Establish the company baseline

Before selecting vertical metrics, establish at least the following:

1. Entity identity, founding date, headquarters and main markets, operating status, and listing status.
2. Founders, management, controlling parties, and ownership structure.
3. Core product portfolio, the focus entity's role within it, target customers, and value proposition.
4. Value-chain position, main revenue model, and sales or distribution model.
5. Funding, acquisitions, and material shareholders; for public companies, include key financial and segment information.
6. Verifiable scale and operating signals, such as employees, customers, users, stores, capacity, transactions, or other relevant measures.
7. Milestones, regulatory status, litigation, shutdowns, pivots, and material risks that affect the current assessment.

The baseline does not require every item to be public. Mark missing information as “not disclosed” or “no reliable public data found.”

### 3. Classify the company and customize the research

Use the baseline to classify and explain:

- Primary industry and sub-vertical.
- Value-chain position and upstream or downstream dependencies.
- Business model and billing unit.
- B2B, B2C, B2G, or multi-sided platform structure.
- Startup, growth, or mature stage; private, public, state-owned, nonprofit, or other ownership form.
- Main operating regions and regulatory environments.

Choose one primary industry lens. Add no more than two secondary lenses only when the underlying business genuinely spans industries. Read the relevant sections in [research-framework.md](references/research-framework.md), then build a task-specific question set, metric set, and source plan. When no lens fits exactly, combine lenses with similar value-chain mechanics and unit economics, and explain why.

### 4. Gather and cross-check evidence iteratively

Use the loop `decompose questions -> gather evidence -> identify conflicts or gaps -> revise questions -> gather again` until the material conclusions are supported or the public evidence limit is explicit.

Prioritize sources as follows:

1. **Grade A — primary and independently verifiable:** regulatory and corporate registries, securities filings, audited financials, exchange disclosures, court and patent records, government databases, sector regulators, official product documentation, pricing and legal terms, app-store records, official repositories, papers, and status pages.
2. **Grade B — first-party claims:** company or investor announcements, management interviews, official blogs, and customer case studies. These establish what the party claims, not independent truth.
3. **Grade C — credible secondary sources:** edited journalism, research organizations, trade associations, and reputable databases. Trace claims to the original source where possible.
4. **Grade D — weak signals:** job postings, traffic or download estimates, social media, community feedback, rankings, reviews, and unaudited operating estimates. Use only as supporting signals.

Apply these evidence rules:

- Seek two independent sources for material figures such as funding, valuation, revenue, users, or shipments. Two reports citing the same original announcement are not independent corroboration.
- Attach a date or reporting period to every volatile figure. Do not combine or compare incompatible geographic, accounting, or measurement scopes.
- Link directly to the page supporting the claim, not merely to search results, homepages, or aggregators.
- When sources conflict, show each figure, date, scope, and source; explain which one is used and why.
- For material claims about licensing, regulation, clinical status, capacity, or market share, prioritize the responsible regulator, exchange, government body, or other primary industry source.

### 5. Analyze both the focus entity and the company

At minimum, answer:

1. What is the company fundamentally, whose problem does it solve, and where does it sit in the value chain?
2. Do its team, assets, channels, licenses, and capabilities match the industry's critical success factors?
3. What role does the focus product, app, or website play in acquisition, revenue, retention, strategy, or brand?
4. Do the billing unit, value unit, major costs, and unit economics align?
5. Which operating metrics best reveal its real scale, quality, and trajectory?
6. Who are the true same-layer competitors, traditional substitutes, build-or-operate-in-house alternatives, and upstream or downstream threats?
7. Does its advantage come from technology, product, data, supply chain, distribution, brand, cost, network effects, regulation, or capital? How durable is it?
8. What evidence could falsify the current narrative, and what material information remains missing?

When a product, app, or website is the focus entity, also assess:

- Target user, buyer, core job, critical workflow, and usage frequency.
- Publisher or operator, geographic availability, release cadence, pricing, permissions, data practices, and user feedback.
- Whether it is a standalone business, acquisition channel, supporting feature, distribution channel, experiment, or discontinued asset.
- Whether product-level evidence is consistent with company-level data. Never treat product attention as proof of company revenue or health.

### 6. Label evidence type and prevent metric substitution

Use these labels or equivalent language for material conclusions:

- **Verified fact:** supported by primary evidence or consistent independent sources.
- **Company claim:** disclosed by the company, management, founder, or investor without independent verification.
- **Third-party estimate:** identify the estimator, date, method, and limitation.
- **Analytical inference:** state the evidence, reasoning chain, and uncertainty.
- **Unknown:** public evidence cannot currently answer the question.

Do not substitute one metric for another:

- Funding is not revenue; valuation is not realized value; GMV, transaction value, and bookings are not revenue.
- Registrations are not active users; downloads are not retention; customer logos and partnership announcements are not proof of payment or sustained use.
- Shipments are not end-customer sales; capacity is not production; orders and expressions of interest are not recognized revenue.
- Store count is not same-store growth; market share is not profitability; licensing or approval is not commercial success.
- Demos, pilots, papers, patents, GitHub stars, and social attention establish only their corresponding limited facts.

## Output specification

Use the user's language, lead with conclusions, stay concise, and avoid promotional language. Default to this order:

1. **One-sentence assessment:** the company's essence, industry position, stage, and most important positive and negative judgment.
2. **Decision summary:** three to six facts, inferences, and risks that most affect the decision.
3. **Entity map and scope:** focus entity, operator and legal entity, parent company, cutoff date, and material assumptions.
4. **Company baseline:** identity, team and ownership, portfolio, markets, capital, and known operating scale.
5. **Industry classification and research lenses:** state which vertical dimensions were selected and why.
6. **Vertical analysis:** use the industry's decision-relevant metrics, regulation, and unit economics.
7. **Focus product, app, or website analysis:** include when the input is not a company or the user emphasizes a specific product.
8. **Business model, operating quality, and capital:** separate disclosed data, estimates, and inference.
9. **Competitive position and moat:** compare three to five relevant entities on identical dimensions; do not pad the list when fewer are relevant.
10. **Advantages, risks, counterevidence, and unknowns.**
11. **Final judgment and watch signals:** provide a bounded conclusion and three to five indicators that would change it.

Place citations next to the claims they support. For a quick overview, compress sections. For a specialist request, retain entity resolution, the company baseline, and evidence rules while shifting depth toward the requested vertical.

## Completion checklist

- Did you identify the focus entity, operator, legal entity, and parent company instead of guessing from a name?
- Did you establish the company baseline before selecting the primary industry and vertical metrics?
- Did you state the cutoff date and verify volatile management, product, pricing, capital, and operating data?
- Did you explain the selected industry lenses and use decision-relevant metrics and primary sources for that industry?
- Did you distinguish verified facts, company claims, third-party estimates, analytical inferences, and unknowns?
- Did you avoid treating product, app, or website attention as proof of company revenue, customers, or competitiveness?
- Did you separate same-layer competitors, traditional substitutes, and upstream or downstream threats?
- Did you provide counterevidence, risks, evidence gaps, and measurable watch signals?
