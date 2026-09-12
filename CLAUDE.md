@AGENTS.md

@AGENTS.md



\# CLAUDE.md — Contexte projet ABN



\## Projet

"Les Anges de la Baie de Nice" (ABN) — association de solidarité (maraudes sans-abris, Nice).

Deux volets : site vitrine public (SEO, dons, recrutement) + WebApp/PWA métier sécurisée (gestion logistique).



\## Stack

\- Next.js 16 (App Router), React, TypeScript

\- Tailwind CSS, Shadcn UI, Lucide Icons, next-themes

\- Supabase (PostgreSQL, Auth, RLS, Storage)

\- Firebase Cloud Messaging (notifications push)

\- Server Components par défaut, Mobile-First absolu



\## Architecture validée

\- Mono-app Next.js, route groups `(public)` et `(app)` protégé par `src/proxy.ts` — PAS deux apps séparées.

&#x20; ATTENTION : `middleware.ts` est déprécié depuis Next.js 16, renommé `proxy.ts` (export `proxy`,

&#x20; pas `middleware`) — mêmes API/matcher, juste le nom qui change

\- RLS : jamais de sous-requête sur `profiles` dans une policy de `profiles` (risque de récursion infinie).

&#x20; Utiliser les fonctions `security definer` : `current\_user\_role()` / `current\_user\_status()`

\- Anonymat strict des personnes aidées : uniquement des compteurs agrégés en lecture pour Maraudeur/Cuisinier

\- "Météo du bénévole" (vert/jaune/rouge) : visible uniquement Admin + Manager de la maraude concernée, jamais les pairs

\- PWA offline-first : file d'attente locale (IndexedDB / Dexie.js) + Service Worker Background Sync

&#x20; pour la saisie terrain sans réseau (repas distribués, etc.), synchro auto au retour réseau,

&#x20; résolution de conflit simple (dernière écriture gagne)



\## Mobile natif — état actuel et plan

\- Android : PWA installable + empaquetage TWA (Bubblewrap/PWABuilder) → `.apk`, gratuit

\- iOS : PWA standard pour l'instant. ATTENTION — depuis iOS 17.4, Apple a désactivé le mode standalone

&#x20; et les notifications push pour les PWA dans l'UE (conformité DMA) : en France, la PWA s'ouvre dans

&#x20; un onglet Safari, sans push. Un vrai app iOS nécessiterait Capacitor + compte Apple Developer (99$/an)

&#x20; — DÉCISION : reporté, on reste sur du gratuit pour l'instant, à revoir plus tard

\- Notifications : Firebase Cloud Messaging (gratuit), fonctionne pour Android/web dès maintenant



\## Infrastructure (phase gratuite)

\- Hébergement : Vercel (plan gratuit)

\- BDD : Supabase, projet `kjwjkzoepjaepxjkquwr` créé le 10/09 — propriétaire du compte à CONFIRMER

&#x20; (Tasks.md visait le compte Arqoria, jamais vérifié depuis) — dans tous les cas, à transférer vers

&#x20; un compte contrôlé par l'association avant toute mise en prod réelle si ce n'est pas déjà le cas

\- Free tier Supabase : pas de backup automatique → prévoir un `pg\_dump` planifié (GitHub Action) comme

&#x20; filet de sécurité, indépendant du risque de pause pour inactivité

\- ATTENTION Vercel Hobby : les déploiements sont bloqués ("Blocked") si l'auteur du commit git n'est pas

&#x20; reconnu comme le propriétaire du projet Vercel. Vercel matche l'auteur via l'email git vérifié sur

&#x20; GitHub, pas via le nom affiché. Le compte Vercel du projet est connecté au compte GitHub `Arqoria`

&#x20; (email `arqoria.pro@gmail.com`) — toujours committer avec `git config user.email "arqoria.pro@gmail.com"`

&#x20; sur cette machine, sinon les push passent mais ne déploient jamais en prod



\## Accès & sécurité

\- Repo GitHub `Arqoria/ABN` : **public** depuis le 09/09 (décision assumée, aucun secret dans

&#x20; l'historique — vérifié sur tout l'historique git avant le passage en public)

\- Vercel Hobby : voir note dans Infrastructure ci-dessous (email d'auteur git = `arqoria.pro@gmail.com`)

\- Supabase : compte propriétaire du projet à confirmer/documenter ici (voir Infrastructure) — ne pas

&#x20; supposer, vérifier avant toute décision d'accès

\- RLS `profiles` : en plus des fonctions `security definer`, un trigger

&#x20; `protect_profile_role_status` (migration `20260910043205_init_profiles.sql`) bloque toute

&#x20; modification de `role`/`status` par l'utilisateur lui-même — seul un Admin (ou `service_role`

&#x20; côté serveur) peut les changer. Reproduire ce principe pour toute future colonne "sensible"

&#x20; en self-service (ex. droits, statuts de validation)

\- MCP Supabase : connexion possible via `claude mcp add supabase --env SUPABASE_ACCESS_TOKEN=<token> --

&#x20; npx -y @supabase/mcp-server-supabase@latest --read-only --project-ref=<ref>`. Le token est un

&#x20; Personal Access Token Supabase — à générer soi-même sur supabase.com/dashboard/account/tokens,

&#x20; jamais à coller dans le chat. Nécessite une nouvelle session Claude Code pour être actif

\- Clés Supabase : seule la clé **Publishable** (ex-`anon`) va dans `NEXT_PUBLIC_*`. La clé **Secret**

&#x20; (ex-`service_role`) ne doit JAMAIS avoir de préfixe `NEXT_PUBLIC_`, ni être partagée en clair —

&#x20; uniquement en variable d'environnement serveur (Vercel), jamais commitée ni collée dans un chat



\## Identité visuelle

\- Bleu nuit (header) #0B3D91 · Bleu principal #1E88E5 · Orange corail (CTA) #FF683D

\- Anthracite (texte) #1F2937 · Bleu pastel (fond secondaire) #E6F4FC

\- Boutons h-12 minimum sur actions clés, contrastes élevés, dark mode complet — usage terrain nocturne, parfois avec gants



\## Rôles utilisateurs

Admin (Trésorier/Présidence) · Manager (Chef de maraude) · Maraudeur · Cuisinier



\## Règles métier

Voir `docs/specs.md` pour le détail complet — ne pas dupliquer ici.



\## Méthode de travail

\- Découper en petites itérations logiques (BDD → logique serveur → UI), jamais de gros blocs de code d'un coup

\- Toujours donner le chemin complet de chaque fichier généré

\- Signaler toute faille d'architecture ou UX repérée plutôt que d'exécuter aveuglément

\- Voir `docs/tasks.md` pour le backlog en cours et son statut

