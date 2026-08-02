# DogFinder - Find New Your Best Friend

A responsive, Tinder-inspired Vue application for discovering dog breeds. Swipe through breed
cards, learn about each breed, and keep track of your votes with
[The Dog API](https://thedogapi.com/).



Demo URL here: [https://dogfinder.lethanhtuan.qzz.io/](https://dogfinder.lethanhtuan.qzz.io/)

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Available Scripts](#-available-scripts)
- [Project Structure](#-project-structure)
- [Technical Decisions](#-technical-decisions)
- [Testing](#-testing)
- [Code Quality](#-code-quality)
- [API Documentation](#-api-documentation)

## ✨ Features

### Breed discovery

- Browse a responsive stack of dog breed cards.
- Swipe left to dislike, right to like, or up to super like.
- Use the action buttons as an accessible alternative to swiping.
- Open a card overlay to see breed information without leaving the discovery flow.
- Automatically prefetch more images while approaching the end of the current stack.

### Breed details

- Open `/breeds/:id` to view a breed profile.
- See the breed group, original purpose, temperament, weight, height, and life span.
- Handle invalid IDs, missing breeds, loading states, and API errors gracefully.

### Vote history

- View votes associated with the current locally generated user.
- Clearly distinguish dislikes, likes, and super likes.
- Inspect breed information from a history card.
- Delete a vote after confirmation.

### Persistent and responsive experience

- Persist the generated user identity and current breed position in `localStorage`.
- Restore discovery progress after a page reload.
- Support pointer and touch gestures across mobile, tablet, and desktop layouts.
- Provide skeletons, empty states, retry actions, keyboard focus styles, and reduced-motion
support.

> Vote history is stored by The Dog API. Local storage only retains the generated user profile and
> the current breed position.

## 🛠️ Tech Stack

### Core

- **[Vue 3](https://vuejs.org/)** with the Composition API and TypeScript.
- **[Vite 8](https://vite.dev/)** for development and production builds.
- **[Vue Router 5](https://router.vuejs.org/)** for home, history, and breed-detail routes.
- **[Pinia 4](https://pinia.vuejs.org/)** for application state.

### UI and utilities

- **[PrimeVue 4](https://primevue.org/)** with the Aura theme for accessible UI components.
- **[Tailwind CSS 4](https://tailwindcss.com/)** for responsive utility styling.
- **[VueUse](https://vueuse.org/)** for browser and persistence utilities.
- **[Lucide](https://lucide.dev/)** icons through `unplugin-icons`.
- **[Faker](https://fakerjs.dev/)** for generating an anonymous local user profile.

### Development

- **[Vitest](https://vitest.dev/)** and **[Vue Test Utils](https://test-utils.vuejs.org/)**.
- **ESLint** and **Oxlint** for static analysis.
- **Oxfmt** for formatting.
- **Husky** and **lint-staged** for pre-commit checks.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) `^22.18.0` or `>=24.12.0`
- [Yarn Classic](https://classic.yarnpkg.com/) 1.x
- A free API key from [The Dog API](https://thedogapi.com/)

### Installation

1. Clone the repository and enter the project directory:
  ```bash
   git clone <repository-url>
   cd tuan-le-vuejs-assignment
  ```
2. Install dependencies:
  ```bash
   yarn install
  ```
3. Create a local environment file:
  ```bash
   cp .env .env.local
  ```
4. Add your The Dog API key to `.env.local`:
  ```dotenv
   VITE_DOG_API_URL=https://api.thedogapi.com/v1
   VITE_DOG_API_KEY=your_api_key_here
  ```
   `VITE_DOG_API_KEY` is required. `VITE_DOG_API_URL` is optional and defaults to
   `https://api.thedogapi.com/v1`.
5. Start the development server:
  ```bash
   yarn dev
  ```
   The application is available at [http://localhost:3000](http://localhost:3000).

> Never commit a real API key. Use a local environment file for secrets.

## 📜 Available Scripts

- `yarn dev` — start the Vite development server.
- `yarn build` — run type checking and create a production build in `dist/`.
- `yarn build-only` — create a production build without running type checking.
- `yarn preview` — preview the production build locally.
- `yarn type-check` — validate the Vue and TypeScript project.
- `yarn test:unit` — run Vitest in watch mode.
- `yarn test:unit --run` — run the test suite once.
- `yarn lint` — run Oxlint and ESLint with automatic fixes.
- `yarn format` — format files in `src/`.
- `yarn fmt` — format the whole repository.
- `yarn fmt:check` — check formatting without changing files.

## 📁 Project Structure

```text
tuan-le-vuejs-assignment/
├── public/
├── src/
│   ├── __tests__/                 # Unit and integration-style component tests
│   ├── assets/
│   │   └── main.css               # Global styles and design tokens
│   ├── components/
│   │   └── breeds/                # Discovery card, skeleton, and state components
│   ├── composables/
│   │   └── useSwipe.ts            # Pointer and touch swipe behavior
│   ├── config/                     # Shared constants and vote values
│   ├── models/                     # Dog, vote, and user TypeScript models
│   ├── router/
│   │   └── index.ts               # Application routes
│   ├── services/
│   │   └── dogApi.ts              # The Dog API client
│   ├── stores/
│   │   ├── dogs.ts                # Discovery, vote, and breed state
│   │   └── user.ts                # Anonymous user persistence
│   ├── views/
│   │   ├── HomeView.vue           # Swipe-based discovery
│   │   ├── BreedDetailsView.vue   # Breed profile
│   │   └── HistoryView.vue        # Vote history
│   ├── App.vue                    # Application shell and navigation
│   └── main.ts                    # Vue application entry point
├── package.json
├── vite.config.ts
└── vitest.config.ts
```

## 🔧 Technical Decisions

### Why Vue 3 and the Composition API?

Vue's Composition API keeps gesture handling, API state, and UI behavior modular while preserving
strong TypeScript inference. Single-file components also keep each feature's template, behavior,
and scoped styling together.

### Why Pinia and VueUse?

Pinia centralizes the discovery queue, breed details, voting state, and user identity. VueUse's
`useLocalStorage` persists only the data needed to resume a session without introducing a backend
authentication system.

### Why a separate API service?

`src/services/dogApi.ts` owns request configuration, authentication headers, timeouts, response
parsing, and API error mapping. Views and stores can therefore focus on application behavior, and
tests can replace the service with predictable mocks.

### Why a dedicated swipe composable?

`useSwipe.ts` keeps pointer tracking, thresholds, direction detection, card transforms, and
reduced-motion behavior independent from the breed card UI. The same logic remains testable
without relying on network requests.

### Why PrimeVue and Tailwind CSS?

PrimeVue provides accessible building blocks such as confirmation popups and feedback messages.
Tailwind handles responsive layout and component-level utility styles, while the global stylesheet
defines shared design tokens and accessibility behavior.

### Why Vitest?

Vitest uses the same Vite transformation pipeline as the application, supports Vue and TypeScript
without a separate build setup, and provides a fast Jest-compatible testing API.

## 🧪 Testing

The project currently includes **60 tests across 9 test files**. The suite covers:

- Application shell and navigation behavior.
- Home, breed details, and vote history views.
- Pinia stores and local persistence.
- Router configuration and fallback redirects.
- The Dog API service and error handling.
- Swipe directions, thresholds, disabled states, and card transforms.

Run all tests once:

```bash
yarn test:unit --run
```

Start Vitest in watch mode:

```bash
yarn test:unit
```

## ✅ Code Quality

Run all configured linters:

```bash
yarn lint
```

Check formatting:

```bash
yarn fmt:check
```

Husky and lint-staged run ESLint and Oxfmt against supported staged files before each commit.
TypeScript project references and `vue-tsc` provide type checking for both application and tooling
code.

## 📚 API Documentation

DogFinder uses [The Dog API](https://thedogapi.com/) with an `x-api-key` request header.

Base URL:

```text
https://api.thedogapi.com/v1
```

Endpoints used by the application:

- `GET /images/search` — load breed images and restore the current breed.
- `GET /images/:id` — resolve breed information for vote history.
- `GET /breeds/:id` — load a breed profile.
- `POST /votes` — submit a dislike, like, or super like.
- `GET /votes?sub_id=:subId` — load the current user's vote history.
- `DELETE /vote/:voteId` — delete a vote.

Vote values:

- `-1` — dislike
- `1` — like
- `2` — super like

## 🙏 Acknowledgments

- [The Dog API](https://thedogapi.com/) for breed data and voting endpoints.
- The Vue, PrimeVue, Tailwind CSS, and Vite communities for the application tooling.

