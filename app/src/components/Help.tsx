export function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="btn btn-ghost btn-small" onClick={onClick}>
      Comment ça marche ?
    </button>
  );
}

export function Help({ onClose }: { onClose: () => void }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet" role="dialog" aria-modal="true" aria-label="Comment ça marche" onClick={(e) => e.stopPropagation()}>
        <h2>Comment ça marche ?</h2>
        <ol className="help-list">
          <li>Créez une partie et faites scanner le QR code (ou partagez le lien, ou donnez le code à 4 lettres).</li>
          <li>Une question s'affiche. Chacun répond en secret sur son téléphone.</li>
          <li>Dès que tout le monde a répondu (ou au bout de 30 secondes), le résultat tombe pour tous.</li>
          <li>8 secondes plus tard, question suivante. Et ainsi de suite !</li>
        </ol>
        <h3>Et l'anonymat ?</h3>
        <ul className="help-list">
          <li>Personne ne voit ta réponse, pas même l'hôte. Seuls les totaux sont affichés.</li>
          <li>Les questions proposées par les joueurs s'affichent sans le nom de leur auteur.</li>
          <li>Il faut au moins 3 réponses pour qu'un résultat s'affiche.</li>
          <li>
            Attention : si tout le monde répond pareil (« 7 sur 7 » ou « 0 sur 7 »), alors forcément, on sait ce que
            chacun a répondu !
          </li>
          <li>Rien n'est conservé : la partie disparaît quand tout le monde est parti.</li>
        </ul>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Compris !
        </button>
      </section>
    </div>
  );
}
