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

\- Mono-app Next.js, route groups `(public)` et `(app)` protégé par middleware — PAS deux apps séparées

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

\- BDD : Supabase, compte personnel d'Aymen pour l'instant (projet portfolio) — à transférer vers un

&#x20; compte contrôlé par l'association avant toute mise en prod réelle

\- Free tier Supabase : pas de backup automatique → prévoir un `pg\_dump` planifié (GitHub Action) comme

&#x20; filet de sécurité, indépendant du risque de pause pour inactivité

\- ATTENTION Vercel Hobby : les déploiements sont bloqués ("Blocked") si l'auteur du commit git n'est pas

&#x20; reconnu comme le propriétaire du projet Vercel. Vercel matche l'auteur via l'email git vérifié sur

&#x20; GitHub, pas via le nom affiché. Le compte Vercel du projet est connecté au compte GitHub `Arqoria`

&#x20; (email `arqoria.pro@gmail.com`) — toujours committer avec `git config user.email "arqoria.pro@gmail.com"`

&#x20; sur cette machine, sinon les push passent mais ne déploient jamais en prod



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

