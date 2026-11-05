# AngularApiTemplate.Portal

Angular 22 portal for the Angular API Template.

## Documentation & Conventions

- Architecture, NgRx state/effects, HTTP contract, accessibility, and resource lifecycle rules: [docs/architecture.md](../docs/architecture.md)
- Full-stack startup and local SQL/API setup: [README.md](../README.md)

## Commands

```sh
npm ci
npm start
npm run typecheck
npm run format:check
npm test -- --watch=false
npm run build
```

`npm start` proxies `/api/**` to `http://localhost:5111` via [proxy.conf.json](proxy.conf.json).
