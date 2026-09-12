// '/' sert temporairement le styleguide en attendant la vraie page d'accueil
// (Étape 10 du backlog). La page en elle-même vit désormais à demeure sur
// /styleguide (voir docs/Tasks.md) : quand la vraie page d'accueil sera
// construite, il suffira de remplacer ce re-export par son propre contenu —
// /styleguide continuera d'exister pour la validation charte graphique par
// le client, indépendamment de ce qui se passe sur '/'.
export { default } from "./styleguide/page";
