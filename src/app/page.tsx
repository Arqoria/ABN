import { redirect } from "next/navigation";

// '/' redirige vers la connexion — c'est le vrai point d'entrée de l'app tant
// que la page d'accueil publique (Étape 10) n'existe pas. La charte graphique
// reste consultable à demeure sur /styleguide (lien discret en bas de la page
// de connexion) pour la validation par le référent association.
export default function Home() {
  redirect("/login");
}
