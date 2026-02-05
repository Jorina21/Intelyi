Below is a clean, copy-paste–ready project description you can drop into your CAPSTONE / Intelyi folder (README, notes file, or internal ChatGPT project description). It’s written so that any new context window immediately understands what you’re building, why, and what “done” means.

Intelyi — Capstone Project Description
Project Overview

Intelyi is a full-stack, AI-driven e-commerce merchandising platform whose core purpose is to demonstrate how intelligent decision-making systems—not templates or static rules—can operate and optimize an online store.

Unlike traditional e-commerce websites that rely on fixed layouts, manual promotions, and generic recommendations, Intelyi treats the website as an interface and positions AI as the system that actively runs the store. The platform continuously learns from user behavior and uses that data to personalize, rank, bundle, and promote products in order to improve measurable business outcomes.

Primary Goal

The goal of Intelyi is to design and implement a learning-based merchandising engine that automatically makes decisions typically handled by human merchandisers, including:

What products to show to each user

In what order products should be ranked

Which items should be bundled together

Which products or bundles should be promoted

How the store should adapt over time based on performance

The project is intentionally focused on decision-making AI, not superficial AI features such as static chatbots or templated recommendations.

What Makes Intelyi Different from Typical E-Commerce Stores

Traditional e-commerce platforms:

Show the same storefront to all users

Use static “featured” products

Rely on popularity or simple category matching

Require manual merchandising decisions

Do not improve automatically over time

Intelyi:

Personalizes the storefront per user

Learns from clicks, carts, and purchases

Uses AI models to rank and recommend products

Automatically generates product bundles (e.g., outfits or starter kits)

Employs a learning-based promotion system that improves with usage

Optimizes measurable outcomes such as conversion rate and average order value

AI Components (Core of the Project)
1. Personalized Ranking Engine

Products are ranked dynamically for each user based on:

Interaction history (views, carts, purchases)

Category and price preferences

Similarity between user preferences and product embeddings

Each user effectively sees a different version of the store.

2. Automated Bundle Generation

The system automatically creates product bundles using behavioral patterns such as co-views and co-cart activity. These bundles are optimized for relevance, compatibility, and budget, and are presented as complete solutions rather than individual items.

3. Learning-Based Promotion System

A contextual multi-armed bandit algorithm determines which products or bundles are promoted in high-visibility areas of the store. The system balances exploration and exploitation, learning which promotions perform best and adapting over time.

4. Explainable AI Decisions

While AI makes the decisions, the system is designed to explain why certain products or bundles were recommended, reinforcing transparency and trust.

Data and Learning Loop

Intelyi includes a full data pipeline that collects:

Product views

Searches

Cart additions/removals

Purchases

Bundle interactions

This data is used to:

Train or update models offline (Python)

Deploy updated logic to the application

Measure performance improvements

Continuously refine decision-making

The system improves as more data is collected.

Technical Stack

Frontend: Next.js (App Router) + TypeScript

Backend: Next.js API routes

Database: PostgreSQL (Neon) + Prisma

Authentication: NextAuth

Payments: Stripe Checkout

Media Storage: Cloudinary (free tier)

AI/ML: Python (offline embedding generation and model training)

Deployment: Vercel

The architecture is intentionally cost-efficient while remaining realistic and industry-aligned.

Evaluation and Success Criteria

The success of Intelyi is evaluated using measurable metrics, including:

Click-through rate (CTR)

Add-to-cart rate

Conversion rate

Average order value (AOV)

Performance uplift compared to non-personalized baselines

Capstone Intent

Intelyi is not intended to be “just an e-commerce website.”
It is a demonstration of applied AI systems engineering, combining full-stack development, data pipelines, machine learning, and decision optimization into a single cohesive product.

If you want next, I can:

compress this into a shorter “context header” version

convert it into a README.md format

or help you define a “definition of done” checklist for Intelyi

Just tell me how you want to use it.